const fs = require('fs');
const path = require('path');

const RUNTIME_CONFIG_FILE = path.join(__dirname, 'runtime_config.json');

const PUBLIC_COMPANY_PROFILE_SOURCES = [
  'known_official_site',
  'baidu_baike_direct',
  'wikipedia_direct',
  'gsxt_search',
  'aiqicha_search',
  'public_search',
  'boss_public_company'
];

const LOGGED_IN_COMPANY_PROFILE_SOURCES = [
  'aiqicha_browser',
  'qcc_browser'
];

const DEFAULT_RUNTIME_CONFIG = {
  JOB_FILTER_MODE: 'general_pm',
  EXPERIENCE: '',
  MAX_LIST_PAGES_PER_RUN: 0,
  MAX_LIST_PAGE_SIZE: 30,
  MAX_DETAIL_REQUESTS_PER_RUN: 0,
  EXP_HARD_EXCLUDE_SOURCE: '',
  deliveryEnabled: false,
  companyProfileSources: {
    publicSourceOrder: [
      'known_official_site',
      'baidu_baike_direct',
      'wikipedia_direct',
      'public_search',
      'gsxt_search',
      'aiqicha_search'
    ],
    enableLoggedInSources: false,
    loggedInSourceOrder: [
      'aiqicha_browser'
    ]
  },
  companyProfileBrowser: {
    chromePath: '/usr/bin/google-chrome',
    userDataDir: '',
    extraArgs: [],
    aiqichaSearchTimeoutMs: 15000
  }
};

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function sanitizeSourceList(list, allowed, fallback) {
  if (!Array.isArray(list)) {
    return [...fallback];
  }

  const next = [];
  for (const item of list) {
    if (typeof item !== 'string') {
      continue;
    }
    const normalized = item.trim();
    if (!normalized || !allowed.includes(normalized) || next.includes(normalized)) {
      continue;
    }
    next.push(normalized);
  }

  return next.length > 0 ? next : [...fallback];
}

function sanitizeRuntimeConfig(config = {}) {
  const next = { ...DEFAULT_RUNTIME_CONFIG };
  next.companyProfileSources = {
    ...DEFAULT_RUNTIME_CONFIG.companyProfileSources
  };
  next.companyProfileBrowser = {
    ...DEFAULT_RUNTIME_CONFIG.companyProfileBrowser
  };

  if (typeof config.JOB_FILTER_MODE === 'string' && ['ai_focused', 'general_pm'].includes(config.JOB_FILTER_MODE)) {
    next.JOB_FILTER_MODE = config.JOB_FILTER_MODE;
  }

  if (typeof config.EXPERIENCE === 'string') {
    next.EXPERIENCE = config.EXPERIENCE.trim();
  }

  const maxPages = Number(config.MAX_LIST_PAGES_PER_RUN);
  if (Number.isInteger(maxPages) && maxPages >= 0) {
    next.MAX_LIST_PAGES_PER_RUN = maxPages;
  }

  const maxPageSize = Number(config.MAX_LIST_PAGE_SIZE);
  if (Number.isInteger(maxPageSize) && maxPageSize >= 1 && maxPageSize <= 30) {
    next.MAX_LIST_PAGE_SIZE = maxPageSize;
  }

  const maxDetails = Number(config.MAX_DETAIL_REQUESTS_PER_RUN);
  if (Number.isInteger(maxDetails) && maxDetails >= 0) {
    next.MAX_DETAIL_REQUESTS_PER_RUN = maxDetails;
  }

  if (typeof config.EXP_HARD_EXCLUDE_SOURCE === 'string') {
    next.EXP_HARD_EXCLUDE_SOURCE = config.EXP_HARD_EXCLUDE_SOURCE.trim();
  }

  if (typeof config.deliveryEnabled === 'boolean') {
    next.deliveryEnabled = config.deliveryEnabled;
  }

  if (config.companyProfileSources && typeof config.companyProfileSources === 'object') {
    next.companyProfileSources = {
      publicSourceOrder: sanitizeSourceList(
        config.companyProfileSources.publicSourceOrder,
        PUBLIC_COMPANY_PROFILE_SOURCES,
        DEFAULT_RUNTIME_CONFIG.companyProfileSources.publicSourceOrder
      ),
      enableLoggedInSources: typeof config.companyProfileSources.enableLoggedInSources === 'boolean'
        ? config.companyProfileSources.enableLoggedInSources
        : DEFAULT_RUNTIME_CONFIG.companyProfileSources.enableLoggedInSources,
      loggedInSourceOrder: sanitizeSourceList(
        config.companyProfileSources.loggedInSourceOrder,
        LOGGED_IN_COMPANY_PROFILE_SOURCES,
        DEFAULT_RUNTIME_CONFIG.companyProfileSources.loggedInSourceOrder
      )
    };
  }

  if (config.companyProfileBrowser && typeof config.companyProfileBrowser === 'object') {
    if (typeof config.companyProfileBrowser.chromePath === 'string' && config.companyProfileBrowser.chromePath.trim()) {
      next.companyProfileBrowser.chromePath = config.companyProfileBrowser.chromePath.trim();
    }
    if (typeof config.companyProfileBrowser.userDataDir === 'string') {
      next.companyProfileBrowser.userDataDir = config.companyProfileBrowser.userDataDir.trim();
    }
    if (Array.isArray(config.companyProfileBrowser.extraArgs)) {
      next.companyProfileBrowser.extraArgs = config.companyProfileBrowser.extraArgs
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => item.trim());
    }
    const timeoutMs = Number(config.companyProfileBrowser.aiqichaSearchTimeoutMs);
    if (Number.isInteger(timeoutMs) && timeoutMs >= 3000 && timeoutMs <= 60000) {
      next.companyProfileBrowser.aiqichaSearchTimeoutMs = timeoutMs;
    }
  }

  return next;
}

function readRuntimeConfig() {
  const runtimeConfig = sanitizeRuntimeConfig(readJSON(RUNTIME_CONFIG_FILE, DEFAULT_RUNTIME_CONFIG));
  fs.writeFileSync(RUNTIME_CONFIG_FILE, JSON.stringify(runtimeConfig, null, 2));
  return runtimeConfig;
}

module.exports = {
  RUNTIME_CONFIG_FILE,
  DEFAULT_RUNTIME_CONFIG,
  PUBLIC_COMPANY_PROFILE_SOURCES,
  LOGGED_IN_COMPANY_PROFILE_SOURCES,
  sanitizeRuntimeConfig,
  readRuntimeConfig
};
