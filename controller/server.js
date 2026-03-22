/**
 * HTTP 控制面 - 本地任务队列管理
 * 提供 API 供 OpenClaw 或其他客户端下发任务、查询状态
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const {
  initDatabase,
  DEFAULT_DB_PATH,
  SCHEMA_VERSION,
  insertDeliveryRecord,
  closeDatabase
} = require('./db');
const {
  fetchDeliveryStats,
  fetchDeliveryRecords
} = require('./delivery-stats');
const {
  initFeishuClient,
  getTargetsFilePath,
  targetExists,
  resolveDeliveryTarget,
  listTargets,
  testTarget
} = require('./feishu-client');
const deliveryWorker = require('./delivery-worker');

const PORT = parseInt(process.env.CONTROLLER_PORT || '7893', 10);
const QUEUE_FILE = path.join(__dirname, 'task_queue.json');
const STATUS_FILE = path.join(__dirname, 'status.json');
const RESULTS_FILE = path.join(__dirname, 'results.json');
const ID_COUNTER_FILE = path.join(__dirname, 'task_id_counter.json');
const RUNTIME_CONFIG_FILE = path.join(__dirname, 'runtime_config.json');
const DEFAULT_RUNTIME_CONFIG = {
  JOB_FILTER_MODE: 'general_pm',
  EXPERIENCE: '103',
  MAX_LIST_PAGES_PER_RUN: 3,
  MAX_LIST_PAGE_SIZE: 30,
  MAX_DETAIL_REQUESTS_PER_RUN: 3,
  EXP_HARD_EXCLUDE_SOURCE: '10年以上',
  deliveryEnabled: false
};
const DELIVERY_ALERT_WINDOW_MS = 30 * 60 * 1000;

// 城市代码映射（字符串城市名 -> {code, name}）
const CITY_CODE_MAP = {
  '北京': { code: '101010100', name: '北京' },
  '上海': { code: '101020100', name: '上海' },
  '杭州': { code: '101210100', name: '杭州' },
  '深圳': { code: '101280600', name: '深圳' },
  '广州': { code: '101280100', name: '广州' },
  '成都': { code: '101270100', name: '成都' },
  '武汉': { code: '101200100', name: '武汉' },
  '西安': { code: '101110100', name: '西安' },
  '南京': { code: '101190100', name: '南京' },
  '苏州': { code: '101190400', name: '苏州' }
};

// 将字符串城市名转换为 {code, name} 对象
function normalizeCity(city) {
  if (typeof city === 'string') {
    const mapped = CITY_CODE_MAP[city];
    if (mapped) {
      return mapped;
    }
    // 未知城市，返回默认值
    console.warn(`[CrawlController] Unknown city: ${city}, using as-is`);
    return { code: city, name: city };
  }
  // 已经是对象格式
  return city;
}

function normalizeTaskMetadata(task = {}, defaults = {}) {
  const priority = typeof task.priority === 'string' && task.priority.trim()
    ? task.priority.trim()
    : (defaults.priority || 'normal');
  const source = typeof task.source === 'string' && task.source.trim()
    ? task.source.trim()
    : (defaults.source || 'manual');
  const batchId = typeof task.batchId === 'string' && task.batchId.trim()
    ? task.batchId.trim()
    : (defaults.batchId || null);
  const codeVersion = typeof task.codeVersion === 'string' && task.codeVersion.trim()
    ? task.codeVersion.trim()
    : (defaults.codeVersion || null);
  const pipelineVersion = typeof task.pipelineVersion === 'string' && task.pipelineVersion.trim()
    ? task.pipelineVersion.trim()
    : (defaults.pipelineVersion || null);

  return { priority, source, batchId, codeVersion, pipelineVersion };
}

function normalizeDeliveryTarget(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function buildQueueTask(task, overrides = {}, defaults = {}) {
  const normalizedCity = normalizeCity(task.city);
  const metadata = normalizeTaskMetadata(task, defaults);
  const deliveryTarget = overrides.deliveryTarget || normalizeDeliveryTarget(task.deliveryTarget) || defaults.deliveryTarget || null;

  return {
    id: overrides.id || task.id || getNextTaskId(),
    city: normalizedCity,
    cityName: typeof task.city === 'string' ? task.city : (task.cityName || task.city?.name || task.city?.code),
    keyword: task.keyword,
    priority: metadata.priority,
    source: metadata.source,
    batchId: metadata.batchId,
    ...(deliveryTarget ? { deliveryTarget } : {}),
    codeVersion: overrides.codeVersion || task.codeVersion || metadata.codeVersion || null,
    pipelineVersion: overrides.pipelineVersion || task.pipelineVersion || metadata.pipelineVersion || null,
    status: overrides.status || task.status || 'pending',
    createdAt: overrides.createdAt || task.createdAt || Date.now(),
    ...(task.result && { result: task.result }),
    ...(task.failedAt && { failedAt: task.failedAt }),
    ...(task.failReason && { failReason: task.failReason }),
    ...(task.blockedAt && { blockedAt: task.blockedAt }),
    ...(task.claimedAt && { claimedAt: task.claimedAt }),
    ...(task.claimedBy && { claimedBy: task.claimedBy }),
    ...(task.completedAt && { completedAt: task.completedAt }),
    ...(task.urgentAt && { urgentAt: task.urgentAt })
  };
}

// 确保文件存在
function ensureFile(file, defaultData = []) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
}

ensureFile(QUEUE_FILE, []);
ensureFile(STATUS_FILE, { paused: false, lastRun: null });
ensureFile(RESULTS_FILE, []);
ensureFile(ID_COUNTER_FILE, { lastId: 0 });
ensureFile(RUNTIME_CONFIG_FILE, DEFAULT_RUNTIME_CONFIG);
initDatabase();
initFeishuClient();

// R3: 生成唯一任务 ID
function getNextTaskId() {
  let counter = readJSON(ID_COUNTER_FILE, { lastId: 0 });
  counter.lastId += 1;
  writeJSON(ID_COUNTER_FILE, counter);
  return 'T' + String(counter.lastId).padStart(6, '0');
}

// 读写 JSON 工具
function readJSON(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sanitizeRuntimeConfig(config = {}) {
  const next = { ...DEFAULT_RUNTIME_CONFIG };

  if (typeof config.JOB_FILTER_MODE === 'string' && ['ai_focused', 'general_pm'].includes(config.JOB_FILTER_MODE)) {
    next.JOB_FILTER_MODE = config.JOB_FILTER_MODE;
  }

  if (typeof config.EXPERIENCE === 'string' && config.EXPERIENCE.trim()) {
    next.EXPERIENCE = config.EXPERIENCE.trim();
  }

  const maxPages = Number(config.MAX_LIST_PAGES_PER_RUN);
  if (Number.isInteger(maxPages) && maxPages >= 1 && maxPages <= 10) {
    next.MAX_LIST_PAGES_PER_RUN = maxPages;
  }

  const maxPageSize = Number(config.MAX_LIST_PAGE_SIZE);
  if (Number.isInteger(maxPageSize) && maxPageSize >= 1 && maxPageSize <= 30) {
    next.MAX_LIST_PAGE_SIZE = maxPageSize;
  }

  const maxDetails = Number(config.MAX_DETAIL_REQUESTS_PER_RUN);
  if (Number.isInteger(maxDetails) && maxDetails >= 1 && maxDetails <= 20) {
    next.MAX_DETAIL_REQUESTS_PER_RUN = maxDetails;
  }

  if (typeof config.EXP_HARD_EXCLUDE_SOURCE === 'string' && config.EXP_HARD_EXCLUDE_SOURCE.trim()) {
    next.EXP_HARD_EXCLUDE_SOURCE = config.EXP_HARD_EXCLUDE_SOURCE.trim();
  }

  if (typeof config.deliveryEnabled === 'boolean') {
    next.deliveryEnabled = config.deliveryEnabled;
  }

  return next;
}

function appendResultEntry(entry) {
  const results = readJSON(RESULTS_FILE, []);
  results.push(entry);
  if (results.length > 200) {
    results.splice(0, results.length - 200);
  }
  writeJSON(RESULTS_FILE, results);
}

function readRuntimeConfig() {
  const runtimeConfig = sanitizeRuntimeConfig(readJSON(RUNTIME_CONFIG_FILE, DEFAULT_RUNTIME_CONFIG));
  writeJSON(RUNTIME_CONFIG_FILE, runtimeConfig);
  return runtimeConfig;
}

function syncDeliveryWorker(runtimeConfig) {
  if (runtimeConfig.deliveryEnabled) {
    deliveryWorker.start();
  } else {
    deliveryWorker.stop();
  }
}

function buildDeliveryAlertSignature(alert) {
  return `${alert.type}:${alert.severity}`;
}

function sendAlertIfNotDuplicate(alert) {
  const results = readJSON(RESULTS_FILE, []);
  const signature = buildDeliveryAlertSignature(alert);
  const now = Date.now();

  const lastAlert = [...results].reverse().find((item) =>
    item &&
    item.kind === 'delivery_alert' &&
    item.signature === signature
  );

  if (lastAlert && (now - (lastAlert.timestamp || 0)) < DELIVERY_ALERT_WINDOW_MS) {
    return false;
  }

  appendResultEntry({
    kind: 'delivery_alert',
    signature,
    type: alert.type,
    severity: alert.severity,
    details: alert.details,
    timestamp: now,
    createdAt: new Date(now).toISOString()
  });

  console.warn(`[CrawlController] Delivery alert [${alert.severity}] ${alert.type}: ${alert.details}`);
  return true;
}

function checkDeliveryAlerts() {
  const stats = fetchDeliveryStats();
  const alerts = [];

  if (stats.pending > 10) {
    alerts.push({
      type: '投递积压',
      severity: 'warning',
      details: `待投递: ${stats.pending}, 最老等待: ${Math.round(stats.oldestPendingAge / 60000)}分钟`
    });
  }

  if (stats.oldestPendingAge > 30 * 60 * 1000) {
    alerts.push({
      type: '投递超时',
      severity: 'critical',
      details: `最老待投递记录已等待 ${Math.round(stats.oldestPendingAge / 60000)} 分钟`
    });
  }

  if (stats.failed > 0 && stats.sent === 0 && stats.total > 3) {
    alerts.push({
      type: '投递全部失败',
      severity: 'critical',
      details: `已投递: ${stats.sent}, 已失败: ${stats.failed}, 总计: ${stats.total}`
    });
  }

  if ((stats.sent + stats.failed) > 5 && (stats.failed / (stats.sent + stats.failed)) > 0.5) {
    alerts.push({
      type: '投递失败率升高',
      severity: 'warning',
      details: `已投递: ${stats.sent}, 已失败: ${stats.failed}, 总计: ${stats.total}`
    });
  }

  for (const alert of alerts) {
    sendAlertIfNotDuplicate(alert);
  }

  return alerts;
}

// CORS 头
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCORS(res);
  res.setHeader('Content-Type', 'application/json');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const feishuTargetMatch = url.pathname.match(/^\/feishu\/targets\/([^/]+)$/);
  const feishuTargetTestMatch = url.pathname.match(/^\/feishu\/targets\/([^/]+)\/test$/);

  if (req.method === 'GET' && url.pathname === '/feishu/targets') {
    const targets = listTargets();
    const defaultTarget = targets.find((item) => item.isDefault)?.name || null;
    res.end(JSON.stringify({
      success: true,
      defaultTarget,
      targets
    }));
    return;
  }

  if (req.method === 'GET' && feishuTargetMatch) {
    const targetName = decodeURIComponent(feishuTargetMatch[1]);
    const target = listTargets().find((item) => item.name === targetName);
    if (!target) {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: `Unknown delivery target: ${targetName}` }));
      return;
    }

    res.end(JSON.stringify({
      success: true,
      target
    }));
    return;
  }

  if (req.method === 'POST' && feishuTargetTestMatch) {
    const targetName = decodeURIComponent(feishuTargetTestMatch[1]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        if (body) {
          JSON.parse(body);
        }

        const result = await testTarget(targetName);
        res.end(JSON.stringify(result));
      } catch (error) {
        const statusCode = error.message && error.message.startsWith('Unknown delivery target') ? 404 : 500;
        res.writeHead(statusCode);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // POST /enqueue - 添加任务到队列
  if (req.method === 'POST' && url.pathname === '/enqueue') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const task = JSON.parse(body);
        if (!task.city || !task.keyword) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing city or keyword' }));
          return;
        }

        const requestedTaskTarget = normalizeDeliveryTarget(task.deliveryTarget);
        if (requestedTaskTarget && !targetExists(requestedTaskTarget)) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: `Unknown delivery target: ${requestedTaskTarget}`
          }));
          return;
        }

        const resolvedTarget = resolveDeliveryTarget(requestedTaskTarget, null);
        const queue = readJSON(QUEUE_FILE);
        const queuedTask = buildQueueTask(task, { deliveryTarget: resolvedTarget });
        const taskId = queuedTask.id;
        queue.push(queuedTask);
        writeJSON(QUEUE_FILE, queue);
        console.log(`[CrawlController] Task enqueued: ${task.keyword} in ${queuedTask.city.name} (id: ${taskId}, source: ${queuedTask.source}, batchId: ${queuedTask.batchId || 'N/A'}, deliveryTarget: ${resolvedTarget})`);
        res.end(JSON.stringify({
          success: true,
          taskId,
          queueLength: queue.length,
          task: queuedTask
        }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /queue - 获取当前队列
  if (req.method === 'GET' && url.pathname === '/queue') {
    const queue = readJSON(QUEUE_FILE);
    res.end(JSON.stringify(queue));
    return;
  }

  // POST /reset - 清空所有数据（P2测试接口）
  if (req.method === 'POST' && url.pathname === '/reset') {
    writeJSON(QUEUE_FILE, []);
    writeJSON(RESULTS_FILE, []);
    writeJSON(STATUS_FILE, { paused: false, lastRun: null });
    writeJSON(ID_COUNTER_FILE, { lastId: 0 });  // R3: 重置 ID 计数器
    console.log('[CrawlController] Reset complete (test endpoint)');
    res.end(JSON.stringify({ success: true, message: 'Reset complete', test_endpoint: true }));
    return;
  }

  // POST /seed - 注入测试数据（P2测试接口）
  if (req.method === 'POST' && url.pathname === '/seed') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const seed = JSON.parse(body);

        if (seed.tasks && Array.isArray(seed.tasks)) {
          const queue = seed.tasks.map(t => buildQueueTask(t, {}, seed.defaults || {}));
          writeJSON(QUEUE_FILE, queue);
        }

        if (seed.results && Array.isArray(seed.results)) {
          writeJSON(RESULTS_FILE, seed.results);
        }

        if (seed.paused !== undefined) {
          const status = readJSON(STATUS_FILE, { paused: false });
          status.paused = seed.paused;
          writeJSON(STATUS_FILE, status);
        }

        console.log(`[CrawlController] Seed complete (test endpoint)`);
        res.end(JSON.stringify({
          success: true,
          message: 'Seed complete',
          test_endpoint: true,
          tasksSeeded: seed.tasks ? seed.tasks.length : 0,
          resultsSeeded: seed.results ? seed.results.length : 0
        }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
      }
    });
    return;
  }

  // GET /export - 导出完整快照（P2测试接口）
  if (req.method === 'GET' && url.pathname === '/export') {
    const queue = readJSON(QUEUE_FILE);
    const status = readJSON(STATUS_FILE, { paused: false });
    const results = readJSON(RESULTS_FILE);
    const runtimeConfig = readJSON(RUNTIME_CONFIG_FILE, DEFAULT_RUNTIME_CONFIG);
    const deliveryStats = fetchDeliveryStats();
    res.end(JSON.stringify({
      exportedAt: new Date().toISOString(),
      queue,
      status,
      results,
      runtimeConfig,
      deliveryStats,
      summary: {
        totalTasks: queue.length,
        byStatus: {
          pending: queue.filter(t => t.status === 'pending').length,
          urgent: queue.filter(t => t.status === 'urgent').length,
          running: queue.filter(t => t.status === 'running').length,
          completed: queue.filter(t => t.status === 'completed').length,
          blocked_retry: queue.filter(t => t.status === 'blocked_retry').length,
          failed: queue.filter(t => t.status === 'failed').length
        },
        totalResults: results.length
      }
    }, null, 2));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/runtime-config') {
    const runtimeConfig = readRuntimeConfig();
    syncDeliveryWorker(runtimeConfig);
    res.end(JSON.stringify({
      success: true,
      runtimeConfig,
      deliveryEnabled: runtimeConfig.deliveryEnabled,
      workerEnabled: deliveryWorker.isStarted(),
      configFile: RUNTIME_CONFIG_FILE
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/runtime-config') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const runtimeConfig = sanitizeRuntimeConfig(payload);
        writeJSON(RUNTIME_CONFIG_FILE, runtimeConfig);
        syncDeliveryWorker(runtimeConfig);
        console.log(`[CrawlController] Runtime config updated: ${JSON.stringify(runtimeConfig)}`);
        res.end(JSON.stringify({
          success: true,
          runtimeConfig,
          deliveryEnabled: runtimeConfig.deliveryEnabled,
          workerEnabled: deliveryWorker.isStarted(),
          configFile: RUNTIME_CONFIG_FILE
        }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // POST /start - 标记尽快执行（实际效果是将第一个pending任务标记为urgent）
  if (req.method === 'POST' && url.pathname === '/start') {
    const queue = readJSON(QUEUE_FILE);
    const pendingIdx = queue.findIndex(t => t.status === 'pending');
    if (pendingIdx >= 0) {
      queue[pendingIdx].status = 'urgent';
      queue[pendingIdx].urgentAt = Date.now();
      writeJSON(QUEUE_FILE, queue);
      console.log('[CrawlController] Marked next task as urgent');
      res.end(JSON.stringify({ success: true, urgentTask: queue[pendingIdx] }));
    } else {
      res.end(JSON.stringify({ success: false, message: 'No pending tasks' }));
    }
    return;
  }

  // POST /claim - 扩展领取任务（P0新增）
  if (req.method === 'POST' && url.pathname === '/claim') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const claim = JSON.parse(body);
        const queue = readJSON(QUEUE_FILE);

        // 多租户下 taskId 是唯一安全领取方式；仅在唯一候选时允许兼容回退。
        let idx = -1;

        if (claim.taskId) {
          idx = queue.findIndex(t =>
            t.id === claim.taskId &&
            (t.status === 'pending' || t.status === 'urgent' || t.status === 'failed' || t.status === 'blocked_retry')
          );
        }

        // 多租户任务一律要求 taskId。city+keyword 兼容回退只允许命中旧任务（无 deliveryTarget）。
        if (idx < 0) {
          const fallbackMatches = queue.filter(t => {
            const cityMatch = (typeof t.city === 'string')
              ? t.city === claim.city
              : t.city.name === claim.city || t.city.code === claim.city;
            return cityMatch &&
              t.keyword === claim.keyword &&
              (t.status === 'pending' || t.status === 'urgent' || t.status === 'failed' || t.status === 'blocked_retry');
          });

          if (fallbackMatches.some((task) => task.deliveryTarget)) {
            res.writeHead(400);
            res.end(JSON.stringify({
              success: false,
              error: 'taskId_required_for_delivery_target',
              message: 'Tasks with deliveryTarget must be claimed by taskId.'
            }));
            return;
          }

          if (fallbackMatches.length > 1) {
            res.writeHead(409);
            res.end(JSON.stringify({
              success: false,
              error: 'ambiguous_claim_requires_taskId',
              message: 'Multiple claimable tasks match city+keyword. taskId is required.'
            }));
            return;
          }

          if (fallbackMatches.length === 1) {
            idx = queue.findIndex((task) => task.id === fallbackMatches[0].id);
          }
        }

        if (idx >= 0) {
          queue[idx].status = 'running';
          queue[idx].claimedAt = Date.now();
          queue[idx].claimedBy = claim.claimedBy || 'unknown';
          writeJSON(QUEUE_FILE, queue);
          console.log(`[CrawlController] Task claimed: ${queue[idx].keyword} in ${queue[idx].city.name || queue[idx].city} (id: ${queue[idx].id})`);
          res.end(JSON.stringify({ success: true, taskId: queue[idx].id, task: queue[idx] }));  // R3: 返回 taskId
        } else {
          res.end(JSON.stringify({ success: false, message: 'No matching task to claim' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // POST /pause - 暂停调度
  if (req.method === 'POST' && url.pathname === '/pause') {
    const status = readJSON(STATUS_FILE, { paused: false });
    status.paused = true;
    status.pausedAt = Date.now();
    writeJSON(STATUS_FILE, status);
    console.log('[CrawlController] Paused');
    res.end(JSON.stringify({ success: true, paused: true }));
    return;
  }

  // POST /resume - 恢复调度
  if (req.method === 'POST' && url.pathname === '/resume') {
    const status = readJSON(STATUS_FILE, { paused: false });
    status.paused = false;
    status.resumedAt = Date.now();
    writeJSON(STATUS_FILE, status);
    console.log('[CrawlController] Resumed');
    res.end(JSON.stringify({ success: true, paused: false }));
    return;
  }

  // GET /status - 获取状态
  if (req.method === 'GET' && url.pathname === '/status') {
    const status = readJSON(STATUS_FILE, { paused: false });
    const queue = readJSON(QUEUE_FILE);
    const results = readJSON(RESULTS_FILE);
    // pendingCount 包含 pending + urgent + failed + blocked_retry（可重试任务）
    const pendingCount = queue.filter(t =>
      t.status === 'pending' || t.status === 'urgent' || 
      t.status === 'failed' || t.status === 'blocked_retry'
    ).length;
    // P0新增：空完成计数（success但total为0）
    const completedEmptyCount = queue.filter(t =>
      t.status === 'completed' && (!t.result || t.result.total === 0)
    ).length;
    res.end(JSON.stringify({
      ...status,
      queueLength: queue.length,
      pendingCount: pendingCount,
      pendingDetails: {
        urgent: queue.filter(t => t.status === 'urgent').length,
        pending: queue.filter(t => t.status === 'pending').length,
        failed: queue.filter(t => t.status === 'failed').length,
        blocked_retry: queue.filter(t => t.status === 'blocked_retry').length
      },
      deliveryEnabled: readRuntimeConfig().deliveryEnabled,
      workerEnabled: deliveryWorker.isStarted(),
      completedCount: queue.filter(t => t.status === 'completed').length,
      completedEmptyCount: completedEmptyCount,  // P0新增
      runningCount: queue.filter(t => t.status === 'running').length,  // P0新增
      resultsCount: results.length
    }));
    return;
  }

  // GET /results - 获取最近结果
  if (req.method === 'GET' && url.pathname === '/results') {
    const results = readJSON(RESULTS_FILE);
    // 返回最近 20 条
    res.end(JSON.stringify(results.slice(-20)));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/delivery/stats') {
    res.end(JSON.stringify({
      success: true,
      stats: fetchDeliveryStats()
    }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/delivery/records') {
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const records = fetchDeliveryRecords({ status, limit, offset });

    res.end(JSON.stringify({
      success: true,
      ...records
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/report-detail') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        const queue = readJSON(QUEUE_FILE, []);
        const sourceTask = queue.find((task) => task.id === payload.taskId);

        if (!sourceTask) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: 'task not found' }));
          return;
        }

        if (!sourceTask.deliveryTarget) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'missing_delivery_target' }));
          return;
        }

        let inserted = 0;
        let duplicates = 0;
        const errors = [];

        for (const job of jobs) {
          if (!job || !job.encryptJobId || !job.payload) {
            errors.push({
              encryptJobId: job?.encryptJobId || null,
              error: 'Missing encryptJobId or payload'
            });
            continue;
          }

          const result = insertDeliveryRecord({
            dedupeKey: job.encryptJobId,
            sourceTaskId: sourceTask.id,
            sourceBatchId: payload.batchId || sourceTask.batchId || null,
            payload: job.payload,
            deliveryTarget: sourceTask.deliveryTarget
          });

          if (result.success) {
            inserted += 1;
          } else if (result.code === 'DUPLICATE') {
            duplicates += 1;
          } else {
            errors.push({
              encryptJobId: job.encryptJobId,
              error: result.error
            });
          }
        }

        checkDeliveryAlerts();

        res.end(JSON.stringify({
          success: true,
          inserted,
          duplicates,
          errors
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: `Invalid JSON: ${error.message}` }));
      }
    });
    return;
  }

  // POST /report - Extension 采集完成后回调
  if (req.method === 'POST' && url.pathname === '/report') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const report = JSON.parse(body);
        const reportTaskId = report.task?.taskId || null;

        // 如果任务有标识，更新队列状态
        if (report.task) {
          if (!reportTaskId) {
            res.writeHead(400);
            res.end(JSON.stringify({
              error: 'Missing task.taskId in /report payload',
              deprecated: 'city+keyword fallback removed in Round 3'
            }));
            return;
          }

          const queue = readJSON(QUEUE_FILE);
          const idx = queue.findIndex(t =>
            t.id === reportTaskId &&
            t.status !== 'completed'
          );

          if (idx < 0) {
            res.writeHead(404);
            res.end(JSON.stringify({
              error: `Task not found or already completed for taskId ${reportTaskId}`,
              taskId: reportTaskId
            }));
            return;
          }

          // P0修复：完整状态机映射 success / anti_crawl / failed / 未知兜底
          if (report.status === 'success') {
            queue[idx].status = 'completed';
            queue[idx].completedAt = Date.now();
          } else if (report.status === 'anti_crawl') {
            // 反爬阻断：标记为 blocked_retry，下次可重新领取
            queue[idx].status = 'blocked_retry';
            queue[idx].blockedAt = Date.now();
            queue[idx].failReason = report.errorCode || 'anti_crawl';
            console.log(`[CrawlController] Task blocked (anti_crawl), will retry: ${queue[idx].keyword} in ${queue[idx].city.name || queue[idx].city}`);
          } else if (report.status === 'failed') {
            // 执行失败
            queue[idx].status = 'failed';
            queue[idx].failedAt = Date.now();
            queue[idx].failReason = report.errorMessage || 'unknown';
            console.log(`[CrawlController] Task failed: ${queue[idx].keyword} in ${queue[idx].city.name || queue[idx].city}, reason: ${queue[idx].failReason}`);
          } else {
            // 未知状态兜底 → failed（不再 silent completed）
            queue[idx].status = 'failed';
            queue[idx].failedAt = Date.now();
            queue[idx].failReason = `unknown_report_status: ${report.status}`;
            console.warn(`[CrawlController] Unknown report status: ${report.status}, marking as failed`);
          }
          // 保留完整结果
          queue[idx].result = {
            taskId: reportTaskId,
            status: report.status,
            codeVersion: report.codeVersion || queue[idx].codeVersion || null,
            pipelineVersion: report.pipelineVersion || queue[idx].pipelineVersion || null,
            total: report.total || 0,
            withDescription: report.withDescription || 0,
            pushed: report.pushed || 0,
            filtered: report.filtered || 0,
            errorCode: report.errorCode || null,
            errorMessage: report.errorMessage || null,
            crawlState: report.crawlState || null,
            listCount: report.listCount || 0,
            pagesFetched: report.pagesFetched || 0,
            missingEncryptJobIdCount: report.missingEncryptJobIdCount || 0,
            detailSkippedSeenCount: report.detailSkippedSeenCount || 0,
            detailRequestedCount: report.detailRequestedCount || 0,
            detailSuccessCount: report.detailSuccessCount || 0,
            detailDescriptionNonEmptyCount: report.detailDescriptionNonEmptyCount || 0,
            filterReasonStats: report.filterReasonStats || null
          };
          queue[idx].codeVersion = report.codeVersion || queue[idx].codeVersion || null;
          queue[idx].pipelineVersion = report.pipelineVersion || queue[idx].pipelineVersion || null;
          writeJSON(QUEUE_FILE, queue);
        }

        appendResultEntry({
          ...report,
          taskId: reportTaskId,
          timestamp: Date.now()
        });

        checkDeliveryAlerts();

        console.log(`[CrawlController] Report received: ${report.status || 'unknown'}`);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
});

// P4: 端口占用检查
const checkServer = net.createServer();

checkServer.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[CrawlController] ERROR: Port ${PORT} is already in use!`);
    console.error(`[CrawlController] Set CONTROLLER_PORT to use a different port.`);
    console.error(`[CrawlController] Example: CONTROLLER_PORT=7894 node server.js`);
    process.exit(1);
  }
});

checkServer.once('listening', () => {
  checkServer.close();
  // 端口可用，启动真正的服务器
  startServer();
});

checkServer.listen(PORT, '127.0.0.1');

function startServer() {
  server.listen(PORT, '127.0.0.1', () => {
    const runtimeConfig = readRuntimeConfig();
    console.log(`[CrawlController] Listening on http://127.0.0.1:${PORT}`);
    console.log(`[CrawlController] SQLite ready: ${DEFAULT_DB_PATH} (schema v${SCHEMA_VERSION})`);
    console.log(`[CrawlController] Feishu targets ready: ${getTargetsFilePath()}`);
    console.log(`[CrawlController] deliveryEnabled=${runtimeConfig.deliveryEnabled}`);
    console.log('[CrawlController] Available endpoints:');
    console.log('  POST /enqueue  - Add task: {"city":"北京","keyword":"AI产品经理","priority":"normal","source":"openclaw","batchId":"BATCH-20260321-01","deliveryTarget":"personal"}');
    console.log('  GET  /queue    - View queue');
    console.log('  GET  /feishu/targets - List configured Feishu targets');
    console.log('  GET  /feishu/targets/:name - Get Feishu target metadata');
    console.log('  POST /feishu/targets/:name/test - Test Feishu target connectivity');
    console.log('  POST /claim    - Claim task (for extension)');
    console.log('  POST /start    - Mark next task urgent');
    console.log('  POST /pause    - Pause scheduling');
    console.log('  POST /resume   - Resume scheduling');
    console.log('  GET  /status   - Get controller status');
    console.log('  GET  /results  - Get recent results');
    console.log('  GET  /delivery/stats - Get delivery queue stats');
    console.log('  GET  /delivery/records - Get delivery queue records');
    console.log('  POST /reset    - Reset all data (test)');
    console.log('  POST /seed     - Seed test data (test)');
    console.log('  GET  /export   - Export snapshot (test)');
    console.log('  POST /report-detail - Mirror detail payloads into SQLite');
    console.log('  POST /report   - Extension callback endpoint');
    syncDeliveryWorker(runtimeConfig);
  });
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[CrawlController] Shutting down...');
  deliveryWorker.stop();
  closeDatabase();
  server.close(() => {
    process.exit(0);
  });
});
