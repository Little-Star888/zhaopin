const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'zhaopin.db');
const QUEUE_FILE = path.join(__dirname, 'task_queue.json');
const SCHEMA_VERSION = 2;

let dbInstance = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initDatabase(dbPath = DEFAULT_DB_PATH) {
  if (dbInstance) {
    return dbInstance;
  }

  ensureDataDir();

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS delivery_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dedupe_key TEXT NOT NULL UNIQUE,
      source_task_id TEXT,
      source_batch_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      last_attempt_at TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT,
      CONSTRAINT uq_dedupe UNIQUE (dedupe_key)
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_status
      ON delivery_queue (status);
    CREATE INDEX IF NOT EXISTS idx_delivery_next_retry
      ON delivery_queue (next_retry_at)
      WHERE status IN ('pending', 'retrying');
    CREATE INDEX IF NOT EXISTS idx_delivery_created
      ON delivery_queue (created_at);

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      description TEXT
    );
  `);

  const existingVersion = dbInstance
    .prepare('SELECT MAX(version) AS version FROM schema_version')
    .get();

  let currentVersion = existingVersion?.version || 0;
  if (!existingVersion || !existingVersion.version) {
    dbInstance
      .prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)')
      .run(1, 'Phase 1 delivery_queue baseline');
    currentVersion = 1;
  }

  if (currentVersion < 2) {
    migrateToV2(dbInstance);
  }

  return dbInstance;
}

function getDatabase() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

function insertDeliveryRecord({ dedupeKey, sourceTaskId = null, sourceBatchId = null, payload, deliveryTarget = null }) {
  const db = getDatabase();
  const payloadText = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const result = db.prepare(`
      INSERT OR IGNORE INTO delivery_queue (
        dedupe_key,
        source_task_id,
        source_batch_id,
        payload,
        delivery_target
      ) VALUES (?, ?, ?, ?, ?)
    `).run(dedupeKey, sourceTaskId, sourceBatchId, payloadText, deliveryTarget);

    if (result.changes === 0) {
      return { success: false, error: 'Duplicate dedupe_key', code: 'DUPLICATE' };
    }

    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message, code: 'DB_ERROR' };
  }
}

function getDeliveryStats() {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM delivery_queue
    GROUP BY status
  `).all();

  const stats = {
    pending: 0,
    retrying: 0,
    sent: 0,
    failed: 0,
    abandoned: 0,
    total: 0,
    oldestPendingAge: 0,
    oldestPendingCreatedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null
  };

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = row.count;
    }
    stats.total += row.count;
  }

  const oldestPending = db.prepare(`
    SELECT created_at
    FROM delivery_queue
    WHERE status IN ('pending', 'retrying')
    ORDER BY datetime(created_at) ASC
    LIMIT 1
  `).get();

  if (oldestPending?.created_at) {
    const createdAt = normalizeSqliteDate(oldestPending.created_at);
    stats.oldestPendingCreatedAt = createdAt;
    stats.oldestPendingAge = Math.max(0, Date.now() - new Date(createdAt).getTime());
  }

  const lastSuccess = db.prepare(`
    SELECT COALESCE(sent_at, updated_at) AS timestamp
    FROM delivery_queue
    WHERE status = 'sent'
    ORDER BY datetime(COALESCE(sent_at, updated_at)) DESC
    LIMIT 1
  `).get();
  if (lastSuccess?.timestamp) {
    stats.lastSuccessAt = normalizeSqliteDate(lastSuccess.timestamp);
  }

  const lastFailure = db.prepare(`
    SELECT updated_at AS timestamp
    FROM delivery_queue
    WHERE status IN ('failed', 'abandoned')
    ORDER BY datetime(updated_at) DESC
    LIMIT 1
  `).get();
  if (lastFailure?.timestamp) {
    stats.lastFailureAt = normalizeSqliteDate(lastFailure.timestamp);
  }

  return stats;
}

function getDeliveryRecords({ status, limit = 20, offset = 0 }) {
  const db = getDatabase();
  const normalizedLimit = normalizePositiveInteger(limit, 20, 1, 100);
  const normalizedOffset = normalizePositiveInteger(offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const statuses = normalizeStatuses(status);

  const placeholders = statuses.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT
      id,
      dedupe_key AS dedupeKey,
      source_task_id AS sourceTaskId,
      source_batch_id AS sourceBatchId,
      payload,
      delivery_target AS deliveryTarget,
      status,
      attempt_count AS attemptCount,
      max_attempts AS maxAttempts,
      last_error AS lastError,
      last_attempt_at AS lastAttemptAt,
      next_retry_at AS nextRetryAt,
      created_at AS createdAt,
      updated_at AS updatedAt,
      sent_at AS sentAt
    FROM delivery_queue
    WHERE status IN (${placeholders})
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...statuses, normalizedLimit, normalizedOffset);

  const totalRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM delivery_queue
    WHERE status IN (${placeholders})
  `).get(...statuses);

  return {
    total: totalRow?.count || 0,
    limit: normalizedLimit,
    offset: normalizedOffset,
    statuses,
    records: rows.map((row) => ({
      ...row,
      payload: safeJsonParse(row.payload),
      lastAttemptAt: row.lastAttemptAt ? normalizeSqliteDate(row.lastAttemptAt) : null,
      nextRetryAt: row.nextRetryAt ? normalizeSqliteDate(row.nextRetryAt) : null,
      createdAt: row.createdAt ? normalizeSqliteDate(row.createdAt) : null,
      updatedAt: row.updatedAt ? normalizeSqliteDate(row.updatedAt) : null,
      sentAt: row.sentAt ? normalizeSqliteDate(row.sentAt) : null
    }))
  };
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function getPendingDeliveryRecords(limit = 5) {
  const db = getDatabase();
  const normalizedLimit = normalizePositiveInteger(limit, 5, 1, 100);

  const rows = db.prepare(`
    SELECT
      id,
      dedupe_key AS dedupeKey,
      source_task_id AS sourceTaskId,
      source_batch_id AS sourceBatchId,
      payload,
      delivery_target AS deliveryTarget,
      status,
      attempt_count AS attemptCount,
      max_attempts AS maxAttempts,
      last_error AS lastError,
      last_attempt_at AS lastAttemptAt,
      next_retry_at AS nextRetryAt,
      created_at AS createdAt,
      updated_at AS updatedAt,
      sent_at AS sentAt
    FROM delivery_queue
    WHERE status IN ('pending', 'retrying')
      AND (next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now'))
    ORDER BY datetime(created_at) ASC, id ASC
    LIMIT ?
  `).all(normalizedLimit);

  return rows.map((row) => ({
    ...row,
    payload: safeJsonParse(row.payload),
    lastAttemptAt: row.lastAttemptAt ? normalizeSqliteDate(row.lastAttemptAt) : null,
    nextRetryAt: row.nextRetryAt ? normalizeSqliteDate(row.nextRetryAt) : null,
    createdAt: row.createdAt ? normalizeSqliteDate(row.createdAt) : null,
    updatedAt: row.updatedAt ? normalizeSqliteDate(row.updatedAt) : null,
    sentAt: row.sentAt ? normalizeSqliteDate(row.sentAt) : null
  }));
}

function markDeliveryRecordSending(id) {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE delivery_queue
    SET
      status = 'sending',
      attempt_count = attempt_count + 1,
      last_error = NULL,
      last_attempt_at = datetime('now'),
      next_retry_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
      AND status IN ('pending', 'retrying')
  `).run(id);

  return result.changes > 0;
}

function markDeliveryRecordSent(id) {
  const db = getDatabase();
  db.prepare(`
    UPDATE delivery_queue
    SET
      status = 'sent',
      last_error = NULL,
      next_retry_at = NULL,
      sent_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
}

function markDeliveryRecordRetry(id, lastError, nextRetryAt) {
  const db = getDatabase();
  db.prepare(`
    UPDATE delivery_queue
    SET
      status = 'retrying',
      last_error = ?,
      next_retry_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(lastError, nextRetryAt, id);
}

function markDeliveryRecordFailed(id, lastError) {
  const db = getDatabase();
  db.prepare(`
    UPDATE delivery_queue
    SET
      status = 'failed',
      last_error = ?,
      next_retry_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(lastError, id);
}

function markDeliveryRecordAbandoned(id, lastError) {
  const db = getDatabase();
  db.prepare(`
    UPDATE delivery_queue
    SET
      status = 'abandoned',
      last_error = ?,
      next_retry_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(lastError, id);
}

function migrateToV2(db) {
  if (!hasColumn(db, 'delivery_queue', 'delivery_target')) {
    db.exec('ALTER TABLE delivery_queue ADD COLUMN delivery_target TEXT');
  }

  const unbackfilled = db.prepare(`
    SELECT id, source_task_id AS sourceTaskId
    FROM delivery_queue
    WHERE delivery_target IS NULL
      AND source_task_id IS NOT NULL
  `).all();

  const queue = readJSON(QUEUE_FILE, []);
  const queueMap = new Map(queue.filter((task) => task?.id).map((task) => [task.id, task]));
  const updateStmt = db.prepare('UPDATE delivery_queue SET delivery_target = ? WHERE id = ?');

  let backfilled = 0;
  for (const record of unbackfilled) {
    const task = queueMap.get(record.sourceTaskId);
    if (task?.deliveryTarget) {
      updateStmt.run(task.deliveryTarget, record.id);
      backfilled += 1;
    }
  }

  console.log(`[DB] Schema v2: backfilled delivery_target for ${backfilled}/${unbackfilled.length} records`);
  db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(2, 'Add delivery_target column');
}

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function readJSON(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeStatuses(status) {
  if (!status) {
    return ['pending', 'retrying'];
  }

  const parts = String(status)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return ['pending', 'retrying'];
  }

  return [...new Set(parts)];
}

function normalizePositiveInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function normalizeSqliteDate(value) {
  if (!value) {
    return null;
  }
  if (value.endsWith('Z')) {
    return value;
  }
  return `${String(value).replace(' ', 'T')}Z`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

module.exports = {
  DEFAULT_DB_PATH,
  SCHEMA_VERSION,
  initDatabase,
  getDatabase,
  insertDeliveryRecord,
  getPendingDeliveryRecords,
  markDeliveryRecordSending,
  markDeliveryRecordSent,
  markDeliveryRecordRetry,
  markDeliveryRecordFailed,
  markDeliveryRecordAbandoned,
  getDeliveryStats,
  getDeliveryRecords,
  closeDatabase
};
