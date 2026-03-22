const fs = require('fs');
const path = require('path');

const DEFAULT_TARGETS_FILE = path.join(__dirname, 'feishu_targets.json');
const DEFAULT_TARGETS_EXAMPLE_FILE = path.join(__dirname, 'feishu_targets.example.json');
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let feishuTargets = null;
let loadedConfigPath = null;
const tokenCache = new Map();

function initFeishuClient(configPath) {
  const configuredPath = path.resolve(configPath || process.env.FEISHU_TARGETS_FILE || DEFAULT_TARGETS_FILE);
  const resolvedPath = fs.existsSync(configuredPath)
    ? configuredPath
    : DEFAULT_TARGETS_EXAMPLE_FILE;
  if (feishuTargets && loadedConfigPath === resolvedPath) {
    return feishuTargets;
  }

  const config = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  validateTargetsConfig(config, resolvedPath);

  feishuTargets = config;
  loadedConfigPath = resolvedPath;
  tokenCache.clear();

  console.log(`[CrawlController] Feishu targets loaded from ${resolvedPath}`);
  return feishuTargets;
}

function getLoadedConfig() {
  return feishuTargets || initFeishuClient();
}

function getTargetsFilePath() {
  getLoadedConfig();
  return loadedConfigPath;
}

function targetExists(targetName) {
  if (!targetName) {
    return false;
  }
  const normalized = normalizeTargetName(targetName);
  if (!normalized) {
    return false;
  }
  const config = getLoadedConfig();
  return Boolean(config.targets[normalized]);
}

function getTargetConfig(targetName) {
  const normalized = normalizeTargetName(targetName);
  if (!normalized) {
    return null;
  }
  const config = getLoadedConfig();
  return config.targets[normalized] || null;
}

function resolveDeliveryTarget(taskTarget, batchTarget) {
  const taskName = normalizeTargetName(taskTarget);
  if (taskName && targetExists(taskName)) {
    return taskName;
  }

  const batchName = normalizeTargetName(batchTarget);
  if (batchName && targetExists(batchName)) {
    return batchName;
  }

  return getLoadedConfig().defaultTarget;
}

function listTargets() {
  const config = getLoadedConfig();
  return Object.entries(config.targets).map(([name, target]) => ({
    name,
    description: target.description || '',
    isDefault: name === config.defaultTarget
  }));
}

async function getTenantAccessToken(targetName) {
  const normalized = normalizeTargetName(targetName);
  const targetConfig = getTargetConfig(normalized);
  if (!targetConfig) {
    throw new Error(`Unknown delivery target: ${targetName}`);
  }

  const cached = tokenCache.get(normalized);
  if (cached && cached.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return cached.token;
  }

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: targetConfig.appId,
      app_secret: targetConfig.appSecret
    })
  });
  const data = await response.json();

  if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(data.msg || data.message || `Failed to get tenant access token for ${normalized}`);
  }

  const expireSeconds = Number(data.expire || 7200);
  tokenCache.set(normalized, {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (expireSeconds * 1000)
  });

  return data.tenant_access_token;
}

async function fetchTableFields(targetName) {
  const normalized = normalizeTargetName(targetName);
  const targetConfig = getTargetConfig(normalized);
  if (!targetConfig) {
    throw new Error(`Unknown delivery target: ${targetName}`);
  }

  const token = await getTenantAccessToken(normalized);
  const response = await fetch(
    `${FEISHU_API_BASE}/bitable/v1/apps/${targetConfig.appToken}/tables/${targetConfig.tableId}/fields`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    throw new Error(data.msg || data.message || `Failed to fetch fields for ${normalized}`);
  }

  return (data.data?.items || []).map((field) => field.field_name).filter(Boolean);
}

async function testTarget(targetName) {
  const normalized = normalizeTargetName(targetName);
  if (!targetExists(normalized)) {
    throw new Error(`Unknown delivery target: ${targetName}`);
  }

  const fields = await fetchTableFields(normalized);
  return {
    success: true,
    target: normalized,
    tokenAcquired: true,
    tableAccessible: true,
    fields
  };
}

async function batchCreateRecords(targetName, records) {
  const normalized = normalizeTargetName(targetName);
  const targetConfig = getTargetConfig(normalized);
  if (!targetConfig) {
    return { success: false, count: 0, error: `Unknown delivery target: ${targetName}` };
  }
  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, count: 0 };
  }

  const token = await getTenantAccessToken(normalized);
  let count = 0;

  for (let index = 0; index < records.length; index += 50) {
    const batch = records.slice(index, index + 50);
    const response = await fetch(
      `${FEISHU_API_BASE}/bitable/v1/apps/${targetConfig.appToken}/tables/${targetConfig.tableId}/records/batch_create`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: batch })
      }
    );
    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return {
        success: false,
        count,
        error: data.msg || data.message || `Failed to batch create records for ${normalized}`
      };
    }

    count += Array.isArray(data.data?.records) ? data.data.records.length : batch.length;
  }

  return { success: true, count };
}

function validateTargetsConfig(config, filePath) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`Invalid feishu targets config: ${filePath}`);
  }
  if (!config.defaultTarget || typeof config.defaultTarget !== 'string') {
    throw new Error(`feishu_targets.json missing defaultTarget: ${filePath}`);
  }
  if (!config.targets || typeof config.targets !== 'object' || Array.isArray(config.targets)) {
    throw new Error(`feishu_targets.json missing targets map: ${filePath}`);
  }
  if (!config.targets[config.defaultTarget]) {
    throw new Error(`defaultTarget ${config.defaultTarget} not found in targets: ${filePath}`);
  }

  for (const [name, target] of Object.entries(config.targets)) {
    if (!target || typeof target !== 'object') {
      throw new Error(`Invalid target definition for ${name}: ${filePath}`);
    }
    for (const requiredField of ['appId', 'appSecret', 'appToken', 'tableId']) {
      if (typeof target[requiredField] !== 'string' || !target[requiredField].trim()) {
        throw new Error(`Target ${name} missing ${requiredField}: ${filePath}`);
      }
    }
  }
}

function normalizeTargetName(targetName) {
  if (typeof targetName !== 'string') {
    return null;
  }
  const normalized = targetName.trim();
  return normalized || null;
}

module.exports = {
  initFeishuClient,
  getTargetsFilePath,
  targetExists,
  getTargetConfig,
  getTenantAccessToken,
  fetchTableFields,
  batchCreateRecords,
  resolveDeliveryTarget,
  listTargets,
  testTarget
};
