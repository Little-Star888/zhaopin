/**
 * resume-db.js - resumes 表 CRUD 函数
 *
 * 简历元数据管理（存路径，不存文件内容）。
 * 依赖 db.js 中的 getDatabase() 获取数据库实例。
 */

const { getDatabase } = require('./db');

/**
 * 插入单条简历记录
 *
 * @param {Object} params
 * @param {string} params.fileName - 文件名
 * @param {string} params.filePath - 文件绝对路径
 * @param {number} [params.fileSize] - 文件大小（字节）
 * @returns {{ success: boolean, id?: number, error?: string }}
 */
function insertResume({ fileName, filePath, fileSize }) {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      INSERT INTO resumes (file_name, file_path, file_size)
      VALUES (?, ?, ?)
    `).run(fileName, filePath, fileSize || null);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取最新上传的简历（单份简历场景）
 *
 * @returns {Object|undefined}
 */
function getLatestResume() {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM resumes ORDER BY datetime(upload_time) DESC, id DESC LIMIT 1'
  ).get();
}

/**
 * 获取所有简历历史记录
 *
 * @returns {Array<Object>}
 */
function getAllResumes() {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM resumes ORDER BY datetime(upload_time) DESC, id DESC'
  ).all();
}

/**
 * 按 id 删除简历记录（不删物理文件，API 层负责）
 *
 * @param {number} id
 * @returns {boolean} 是否删除成功
 */
function deleteResume(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM resumes WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 统计简历数量
 *
 * @returns {number}
 */
function getResumeCount() {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) AS count FROM resumes').get();
  return row?.count || 0;
}

/**
 * 通用更新简历字段（基于最新记录）
 *
 * @param {Object} fields - 需要更新的字段键值对
 * @returns {{ success: boolean, resume?: Object, error?: string }}
 */
function updateResume(fields) {
  const db = getDatabase();
  const latest = getLatestResume();
  if (!latest) {
    return { success: false, error: 'No resume record found', statusCode: 404 };
  }

  const setClauses = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (setClauses.length === 0) {
    return { success: false, error: 'No fields to update' };
  }

  try {
    values.push(latest.id);
    db.prepare(
      `UPDATE resumes SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...values);

    const updated = getLatestResume();
    return { success: true, resume: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 创建 AI 编辑版本记录
 *
 * @param {Object} params
 * @param {number} params.resumeId - 简历 ID
 * @param {string} params.oldContentMd - 修改前 Markdown
 * @param {string} params.newContentMd - 修改后 Markdown
 * @param {Array} [params.ops] - 结构化操作 JSON
 * @param {Object} [params.changeSummary] - 变更摘要
 * @returns {{ success: boolean, versionId?: number }}
 */
function createResumeVersion({ resumeId, oldContentMd, newContentMd, ops, changeSummary }) {
  const db = getDatabase();
  try {
    // 确保 resume_edit_versions 表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS resume_edit_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER NOT NULL,
        old_content_md TEXT,
        new_content_md TEXT,
        ops_json TEXT,
        change_summary TEXT,
        source TEXT DEFAULT 'ai_assistant',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const result = db.prepare(`
      INSERT INTO resume_edit_versions (resume_id, old_content_md, new_content_md, ops_json, change_summary, source)
      VALUES (?, ?, ?, ?, ?, 'ai_assistant')
    `).run(
      resumeId,
      oldContentMd || '',
      newContentMd || '',
      ops ? JSON.stringify(ops) : null,
      changeSummary ? JSON.stringify(changeSummary) : null
    );
    return { success: true, versionId: result.lastInsertRowid };
  } catch (error) {
    console.error('[ResumeDB] createResumeVersion error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 获取简历编辑历史
 *
 * @param {number} resumeId
 * @param {number} [limit=10]
 * @returns {Array}
 */
function getResumeVersions(resumeId, limit = 10) {
  const db = getDatabase();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS resume_edit_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER NOT NULL,
        old_content_md TEXT,
        new_content_md TEXT,
        ops_json TEXT,
        change_summary TEXT,
        source TEXT DEFAULT 'ai_assistant',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return db.prepare(
      'SELECT id, resume_id, change_summary, source, created_at FROM resume_edit_versions WHERE resume_id = ? ORDER BY id DESC LIMIT ?'
    ).all(resumeId, limit);
  } catch (error) {
    return [];
  }
}

module.exports = {
  insertResume,
  getLatestResume,
  getAllResumes,
  deleteResume,
  getResumeCount,
  updateResume,
  createResumeVersion,
  getResumeVersions
};
