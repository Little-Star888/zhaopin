/**
 * Service Worker - 后台调度中心
 */

// ============ 配置 ============
const FEISHU_CONFIG = {
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
  appToken: 'your_app_token',
  tableId: 'your_table_id'
};

const ALERTS_CONFIG = {
  // 默认不再把系统告警写回岗位主表，避免污染采集结果视图。
  writeAlertsToMainTable: false
};

// 选项字典缓存配置
const OPTION_CACHE_KEY = 'feishu_option_dict';
const OPTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时
const SEEN_JOB_IDS_KEY = 'seen_job_ids';
const RUNTIME_CONFIG_KEY = 'runtime_config';
const PIPELINE_VERSION = 'pm-full-coverage-v1';
const CODE_VERSION = `crawler-extension-v${chrome.runtime.getManifest().version}-20260321-p6-qfix`;

const CONFIG = {
  // 【最小验证模式】1城市 × 1关键词 × 1条
  // 验证通过后恢复：CITIES=北京/上海/杭州/深圳，KEYWORDS=4个
  CITIES: [
    { code: '101010100', name: '北京' },
    { code: '101020100', name: '上海' },
    { code: '101210100', name: '杭州' },
    { code: '101280600', name: '深圳' }
  ],
  KEYWORDS: [
    'AI产品经理',
    '人工智能产品经理',
    '机器人产品经理',
    '大模型产品经理'
  ],
  MAX_JOBS_PER_CITY: 3,  // 每个城市最多采集3条（降低频率防反爬）
  
  // 经验要求代码：101=应届生, 102=1-3年, 103=3-5年, 104=5-10年, 105=10年以上
  EXPERIENCE: '102',  // 默认1-3年
  JOB_FILTER_MODE: 'general_pm',
  MAX_LIST_PAGES_PER_RUN: 3,
  
  // 反爬自适应策略配置
  ANTI_CRAWL: {
    MAX_CONSECUTIVE_FAILURES: 2,  // 连续失败2次触发冷却
    COOLDOWN_TIME: 30000,         // 冷却时间30秒
    BASE_DELAY: 8000,             // 基础延迟8秒（增加以降低搜索频率）
    MAX_DELAY: 20000,             // 最大延迟20秒
    DELAY_INCREMENT: 5000,        // 每次增加5秒
    ANTI_CRAWL_CODES: [35, 37]    // 反爬错误码
  },

  // 任务来源模式（P1新增）
  // hybrid: 优先控制面，不可达时回退内置队列（旧默认行为）
  // controller_only: 仅从控制面获取任务，不可达时不执行
  // internal_only: 仅使用内置队列，忽略控制面
  TASK_SOURCE_MODE: 'controller_only',  // 验收/生产环境默认

  // 规则过滤配置
  FILTER: {
    // 硬排除：明确的校招/实习性质词汇
    TITLE_HARD_EXCLUDE: /校招|管培|校园招聘|毕业生|秋招|春招/i,
    // 经验排除：只硬排除明显过高年限；5-10年保留给 general_pm 覆盖
    // 注：在校/应届也改为软排除，让其他条件好的岗位有机会通过
    EXP_HARD_EXCLUDE: /10年以上/i,
    // 方向加分词（标题包含任一则加分）
    AI_DIRECTION_KEYWORDS: [
      'AI', '人工智能', 'AIGC', '大模型', 'LLM', '机器人', '具身智能',
      '自动化', '智能体', '自动驾驶', 'NLP', '计算机视觉',
      '机器学习', '深度学习', '多模态', '知识图谱'
    ],
    GENERAL_PM_INCLUDE: /产品经理|product manager|\bpm\b/i,
    // 最低通过分数（低于此分数的岗位被过滤）
    // 设为-2让条件较好的在校/应届岗有机会通过（如AI产品经理：+2+2-5=-1）
    MIN_SCORE: -2
  },

  // 批次调度配置
  BATCH: {
    MAX_DETAIL_REQUESTS_PER_RUN: 3  // 单次任务最多获取3条详情
  },

  // P4: 控制面地址配置（可通过环境变量或手动修改）
  CONTROLLER_BASE_URL: 'http://127.0.0.1:7893',

  // Alarm 调度配置
  // fixed: 每天固定时间触发
  // interval: 固定分钟间隔轮询，适合联调和无人值守验证
  ALARM_MODE: 'interval',
  ALARM_INTERVAL_MINUTES: 1,
  ALARM_BOOTSTRAP_DELAY_MINUTES: 1
};

const RUNTIME_CONFIG_DEFAULTS = {
  EXPERIENCE: CONFIG.EXPERIENCE,
  JOB_FILTER_MODE: CONFIG.JOB_FILTER_MODE,
  MAX_LIST_PAGES_PER_RUN: CONFIG.MAX_LIST_PAGES_PER_RUN,
  MAX_LIST_PAGE_SIZE: 30,
  MAX_DETAIL_REQUESTS_PER_RUN: CONFIG.BATCH.MAX_DETAIL_REQUESTS_PER_RUN,
  EXP_HARD_EXCLUDE_SOURCE: CONFIG.FILTER.EXP_HARD_EXCLUDE.source,
  deliveryEnabled: false
};

// ============ 主服务 ============
class JobHunterService {
  constructor() {
    this.isRunning = false;
    // 反爬状态追踪
    this.consecutiveFailures = 0;  // 连续失败次数
    this.currentDelay = CONFIG.ANTI_CRAWL.BASE_DELAY;  // 当前动态延迟
    this.isCooldown = false;       // 是否处于冷却期
    // 本次采集统计
    this.runStats = this.createEmptyRunStats();
    // 反爬状态机（持久化）
    this.crawlState = {
      status: 'normal',           // normal | cooldown_1h | cooldown_4h | blocked_today
      blockedUntil: null,         // 统一字段：冷却/封禁截止时间戳
      consecutiveBatchFailures: 0, // 连续批次失败次数
      lastAntiCrawlTime: null     // 上次触发反爬的时间
    };
    // 队列长度历史（用于检测堆积）- 从 storage 加载或初始化为空
    this.queueLengthHistory = [];
    this.runtimeConfig = { ...RUNTIME_CONFIG_DEFAULTS };
    // 初始化完成标志（防止竞态）
    this.initPromise = null;
    this.init();
    // 从storage加载（串行执行，避免竞态）
    this.initPromise = this.runInitializers();
  }

  // 串行执行所有初始化，确保加载完成后再接受任务
  async runInitializers() {
    await this.loadStats();
    await this.loadCrawlState();
    await this.loadRuntimeConfig();
    await this.loadQueueLengthHistory();  // 加载队列长度历史（带时效清理）
    await this.initPendingQueue();
    console.log('[JobHunter] All initializers completed');
  }

  createEmptyRunStats() {
    return {
      totalJobs: 0,
      successWithDesc: 0,
      cardApiUsed: 0,
      detailApiUsed: 0,
      failCount: 0,
      filteredCount: 0,
      listCount: 0,
      missingEncryptJobIdCount: 0,
      detailSkippedSeenCount: 0,
      detailRequestedCount: 0,
      detailSuccessCount: 0,
      detailDescriptionNonEmptyCount: 0,
      pagedListCount: 0,
      pagesFetched: 0
    };
  }

  getVersionInfo() {
    return {
      codeVersion: CODE_VERSION,
      pipelineVersion: PIPELINE_VERSION,
      jobFilterMode: this.getJobFilterMode(),
      maxListPagesPerRun: this.getMaxListPagesPerRun(),
      maxListPageSize: this.getMaxListPageSize()
    };
  }

  sanitizeRuntimeConfig(config = {}) {
    const next = { ...RUNTIME_CONFIG_DEFAULTS };

    if (['ai_focused', 'general_pm'].includes(config.JOB_FILTER_MODE)) {
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

  async loadRuntimeConfig() {
    try {
      const saved = await chrome.storage.local.get(RUNTIME_CONFIG_KEY);
      this.runtimeConfig = this.sanitizeRuntimeConfig(saved[RUNTIME_CONFIG_KEY] || {});
      await this.syncRuntimeConfigFromController();
      await chrome.storage.local.set({ [RUNTIME_CONFIG_KEY]: this.runtimeConfig });
    } catch (error) {
      console.warn('[JobHunter] Failed to load runtime config, using defaults:', error.message);
      this.runtimeConfig = { ...RUNTIME_CONFIG_DEFAULTS };
    }
  }

  async updateRuntimeConfig(nextConfig = {}) {
    this.runtimeConfig = this.sanitizeRuntimeConfig(nextConfig);
    await chrome.storage.local.set({ [RUNTIME_CONFIG_KEY]: this.runtimeConfig });
    await this.pushRuntimeConfigToController();
    console.log('[JobHunter] Runtime config updated:', JSON.stringify(this.runtimeConfig));
    return this.runtimeConfig;
  }

  getRuntimeConfig() {
    return { ...this.runtimeConfig };
  }

  getJobFilterMode() {
    return this.runtimeConfig.JOB_FILTER_MODE || RUNTIME_CONFIG_DEFAULTS.JOB_FILTER_MODE;
  }

  getMaxListPagesPerRun() {
    return this.runtimeConfig.MAX_LIST_PAGES_PER_RUN || RUNTIME_CONFIG_DEFAULTS.MAX_LIST_PAGES_PER_RUN;
  }

  getMaxListPageSize() {
    return this.runtimeConfig.MAX_LIST_PAGE_SIZE || RUNTIME_CONFIG_DEFAULTS.MAX_LIST_PAGE_SIZE;
  }

  getMaxDetailRequestsPerRun() {
    return this.runtimeConfig.MAX_DETAIL_REQUESTS_PER_RUN || RUNTIME_CONFIG_DEFAULTS.MAX_DETAIL_REQUESTS_PER_RUN;
  }

  getExperienceCode() {
    return this.runtimeConfig.EXPERIENCE || RUNTIME_CONFIG_DEFAULTS.EXPERIENCE;
  }

  isControllerDeliveryEnabled() {
    return Boolean(this.runtimeConfig.deliveryEnabled);
  }

  getExpHardExcludeRegex() {
    return new RegExp(
      this.runtimeConfig.EXP_HARD_EXCLUDE_SOURCE || RUNTIME_CONFIG_DEFAULTS.EXP_HARD_EXCLUDE_SOURCE,
      'i'
    );
  }

  async syncRuntimeConfigFromController() {
    try {
      const response = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/runtime-config`);
      if (!response.ok) return false;
      const payload = await response.json();
      if (!payload.success || !payload.runtimeConfig) return false;
      this.runtimeConfig = this.sanitizeRuntimeConfig(payload.runtimeConfig);
      console.log('[JobHunter] Runtime config synced from controller:', JSON.stringify(this.runtimeConfig));
      return true;
    } catch (error) {
      console.warn('[JobHunter] Runtime config sync skipped:', error.message);
      return false;
    }
  }

  async pushRuntimeConfigToController() {
    try {
      const response = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/runtime-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.runtimeConfig)
      });
      if (!response.ok) {
        console.warn(`[JobHunter] Failed to persist runtime config to controller: ${response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('[JobHunter] Runtime config persist skipped:', error.message);
      return false;
    }
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.onMessage(request, sender, sendResponse);
      return true;
    });

    chrome.runtime.onInstalled.addListener(() => {
      this.restoreAlarms();
    });

    chrome.runtime.onStartup.addListener(() => {
      this.restoreAlarms();
    });
    
    // 初始化 alarms
    this.restoreAlarms();
    
    // 监听 alarm 触发
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.onAlarm(alarm);
    });
    
    console.log(
      `[JobHunter] Service initialized | CODE_VERSION=${CODE_VERSION} | PIPELINE_VERSION=${PIPELINE_VERSION} | JOB_FILTER_MODE=${this.getJobFilterMode()} | MAX_LIST_PAGES_PER_RUN=${this.getMaxListPagesPerRun()} | MAX_LIST_PAGE_SIZE=${this.getMaxListPageSize()}`
    );
  }

  // Alarm 触发处理
  async onAlarm(alarm) {
    if (!alarm.name.startsWith('crawl_')) return;

    console.log(`[JobHunter] Alarm triggered: ${alarm.name}`);

    // 检查 crawl_state
    const blockCheck = await this.checkBlocked();
    if (blockCheck.blocked) {
      console.log(`[JobHunter] Alarm ${alarm.name} skipped, status: ${this.crawlState.status}`);
      if (CONFIG.ALARM_MODE !== 'interval' && alarm.name !== 'crawl_bootstrap') {
        await this.reregisterAlarm(alarm.name);
      }
      return;
    }

    // 执行采集任务
    try {
      await this.executeCrawlTask();
    } catch (error) {
      console.error(`[JobHunter] Alarm task error:`, error);
    }

    // interval 模式的周期 alarm 会自动重复；bootstrap 只执行一次
    if (CONFIG.ALARM_MODE !== 'interval' && alarm.name !== 'crawl_bootstrap') {
      await this.reregisterAlarm(alarm.name);
    }
  }

  // 恢复/注册 alarms
  async restoreAlarms() {
    await chrome.alarms.clearAll();

    const alarmNames = ['crawl_morning', 'crawl_afternoon', 'crawl_evening', 'crawl_retry'];
    for (const name of alarmNames) {
      await this.reregisterAlarm(name);
    }

    if (CONFIG.ALARM_MODE === 'interval') {
      chrome.alarms.create('crawl_bootstrap', {
        delayInMinutes: Math.max(1, CONFIG.ALARM_BOOTSTRAP_DELAY_MINUTES)
      });
      console.log(`[JobHunter] Alarm crawl_bootstrap scheduled in ${Math.max(1, CONFIG.ALARM_BOOTSTRAP_DELAY_MINUTES)}min`);
    }

    const alarms = await chrome.alarms.getAll();
    console.log('[JobHunter] Alarms restored:', alarms.map(alarm => ({
      name: alarm.name,
      scheduledTime: alarm.scheduledTime ? new Date(alarm.scheduledTime).toISOString() : null,
      periodInMinutes: alarm.periodInMinutes || null
    })));
  }

  // 注册/重新注册 alarm
  async reregisterAlarm(alarmName) {
    await chrome.alarms.clear(alarmName);

    if (CONFIG.ALARM_MODE === 'interval') {
      const intervalMinutes = Math.max(1, CONFIG.ALARM_INTERVAL_MINUTES);
      chrome.alarms.create(alarmName, {
        delayInMinutes: intervalMinutes,
        periodInMinutes: intervalMinutes
      });
      console.log(`[JobHunter] Alarm ${alarmName} interval mode, every ${intervalMinutes}min`);
      return;
    }

    const schedule = {
      crawl_morning: { hour: 9 },
      crawl_afternoon: { hour: 13 },
      crawl_evening: { hour: 17 },
      crawl_retry: { hour: 21 }
    };

    const config = schedule[alarmName];
    if (!config) {
      console.warn(`[JobHunter] Unknown alarm ignored: ${alarmName}`);
      return;
    }

    const now = new Date();
    const target = new Date(now);
    target.setHours(config.hour, 0, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    chrome.alarms.create(alarmName, { when: target.getTime() });
    console.log(`[JobHunter] Alarm ${alarmName} scheduled at ${target.toISOString()}`);
  }

  async onMessage(request, sender, sendResponse) {
    console.log('[JobHunter] Received:', request.type);
    
    try {
      switch (request.type) {
        case 'START_CRAWL':
          if (this.isRunning) {
            sendResponse({ success: false, error: 'Already running' });
            return;
          }
          const results = await this.executeCrawlTask();
          sendResponse({ success: true, data: results });
          break;

        case 'GET_STATUS':
          sendResponse({
            success: true,
            data: {
              isRunning: this.isRunning,
              stats: this.runStats,
              alarmMode: CONFIG.ALARM_MODE,
              alarmIntervalMinutes: CONFIG.ALARM_INTERVAL_MINUTES,
              runtimeConfig: this.getRuntimeConfig(),
              ...this.getVersionInfo()
            }
          });
          break;

        case 'GET_RUNTIME_CONFIG':
          sendResponse({
            success: true,
            data: this.getRuntimeConfig()
          });
          break;

        case 'UPDATE_RUNTIME_CONFIG':
          sendResponse({
            success: true,
            data: await this.updateRuntimeConfig(request.config || {})
          });
          break;

        case 'UPDATE_CONFIG':
          await chrome.storage.local.set({ config: request.config || {} });
          sendResponse({ success: true });
          break;

        case 'GET_ALARMS':
          sendResponse({
            success: true,
            data: await chrome.alarms.getAll()
          });
          break;

        case 'RESTORE_ALARMS':
          await this.restoreAlarms();
          sendResponse({
            success: true,
            data: await chrome.alarms.getAll()
          });
          break;

        case 'GET_STATS':
          const savedStats = await chrome.storage.local.get('crawl_stats');
          sendResponse({
            success: true,
            data: { current: this.runStats, history: savedStats.crawl_stats || {} }
          });
          break;

        case 'CLEAR_STATS':
          await chrome.storage.local.remove('crawl_stats');
          sendResponse({ success: true });
          break;

        case 'CHECK_FEISHU':
          const feishuOk = await this.checkFeishuConnection();
          sendResponse({ success: feishuOk });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown type' });
      }
    } catch (error) {
      console.error('[JobHunter] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ============ 核心采集流程（批次调度版） ============
  async executeCrawlTask() {
    // 等待初始化完成（防止竞态：确保 queueLengthHistory 已加载）
    if (this.initPromise) {
      await this.initPromise;
    }

    await this.syncRuntimeConfigFromController();
    await chrome.storage.local.set({ [RUNTIME_CONFIG_KEY]: this.runtimeConfig });

    if (this.isRunning) {
      return { success: false, error: 'Already running' };
    }

    // 1. 检查反爬状态
    const blockCheck = await this.checkBlocked();
    if (blockCheck.blocked) {
      console.log(`[JobHunter] Queue-stuck check suppressed during blocked window: ${this.crawlState.status}`);
      return { 
        success: false, 
        error: `Blocked: ${this.crawlState.status}, remaining ${blockCheck.remaining}min`,
        status: this.crawlState.status
      };
    }

    this.isRunning = true;
    // 重置本次采集统计（含filteredCount）
    this.runStats = this.createEmptyRunStats();
    
    // 检查是否需要重置延迟（6小时无反爬才重置）
    const lastAntiCrawlTime = await chrome.storage.local.get('last_anti_crawl_time');
    const hoursSinceAntiCrawl = lastAntiCrawlTime.last_anti_crawl_time
      ? (Date.now() - lastAntiCrawlTime.last_anti_crawl_time) / 3600000
      : 999;
    if (hoursSinceAntiCrawl > 6) {
      this.currentDelay = CONFIG.ANTI_CRAWL.BASE_DELAY;
      console.log(`[JobHunter] Delay reset after ${hoursSinceAntiCrawl.toFixed(1)}h without anti-crawl`);
    } else {
      console.log(`[JobHunter] Keep delay: ${this.currentDelay}ms (${hoursSinceAntiCrawl.toFixed(1)}h since last anti-crawl)`);
    }

    // 2. 获取下一个任务（根据TASK_SOURCE_MODE决定来源）
    let task, remaining, fromController = false;
    const controllerTask = await this.fetchQueueFromController();
    if (controllerTask) {
      // 控制面有任务
      task = controllerTask;
      remaining = '?';  // 控制面队列长度不直接可知
      fromController = true;
      console.log('[JobHunter] task source: controller');
    } else if (CONFIG.TASK_SOURCE_MODE === 'controller_only') {
      // P1：仅控制面模式 - 不可达或无任务时直接返回
      this.isRunning = false;
      // 判断是控制面不可达还是真的没任务
      try {
        const res = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/status`);
        if (res.ok) {
          console.log('[JobHunter] controller_only: no task available, skip');
        } else {
          console.warn('[JobHunter] controller_only: controller responded with error, skip');
        }
      } catch {
        console.warn('[JobHunter] controller_only: controller unreachable, skip');
      }
      return { success: true, total: 0, reason: 'controller_no_task' };
    } else if (CONFIG.TASK_SOURCE_MODE === 'internal_only') {
      // P1：仅内置队列模式
      const nextTask = await this.getNextTask();
      task = nextTask.task;
      remaining = nextTask.remaining;
      fromController = false;
      console.log('[JobHunter] task source: internal');
      if (!task) {
        this.isRunning = false;
        console.log('[JobHunter] No pending tasks, queue empty');
        return { success: true, total: 0, reason: 'queue_empty' };
      }
    } else {
      // P1：hybrid模式 - 优先控制面，回退内置队列（旧行为）
      console.log('[JobHunter] controller unavailable, fallback to internal queue (hybrid mode)');
      const nextTask = await this.getNextTask();
      task = nextTask.task;
      remaining = nextTask.remaining;
      fromController = false;
      console.log('[JobHunter] task source: internal (fallback)');
      if (!task) {
        this.isRunning = false;
        console.log('[JobHunter] No pending tasks, queue empty');
        return { success: true, total: 0, reason: 'queue_empty' };
      }
    }

    const { city, keyword, taskId } = task;  // R3: 解构出 taskId
    console.log(`[JobHunter] ========================================`);
    console.log(
      `[JobHunter] Starting task: ${keyword} in ${city.name || city} (queue remaining: ${remaining}, taskId: ${taskId || 'N/A'}, CODE_VERSION=${CODE_VERSION}, PIPELINE_VERSION=${PIPELINE_VERSION})`
    );

    let antiCrawlTriggered = false;
    let lastError = null;  // 跟踪最后发生的错误（P0新增）
    const allJobs = [];
    const filteredJobs = [];
    let tab = null;

    try {
      // 3. 创建Boss标签页
      console.log('[JobHunter] Creating tab...');
      tab = await chrome.tabs.create({
        url: 'https://www.zhipin.com/web/geek/job',
        active: false
      });

      // 4. 等待页面加载
      console.log('[JobHunter] Waiting for page load...');
      await this.waitForTabLoad(tab.id);
      
      // 5. 等待 Content Script 注入完成
      console.log('[JobHunter] Waiting for Content Script...');
      await this.waitForContentScript(tab.id);

      // 6. 执行搜索
      console.log(`[JobHunter] Searching: ${keyword} in ${city.name}`);
      
      const searchResult = await this.scrapeJobListPages(tab.id, {
        keyword,
        cityCode: city.code,
        pageSize: this.getMaxListPageSize(),
        experience: this.getExperienceCode()
      });

      // 反爬检测
      if (!searchResult.success) {
        this.consecutiveFailures++;
        const isAntiCrawl = this.isAntiCrawlError(searchResult.error);
        
        console.log(`[JobHunter] ⚠️ Search failed (${this.consecutiveFailures} consecutive)`);
        console.log(`[JobHunter] Error: ${searchResult.error}`);
        console.log(`[JobHunter] Anti-crawl detected: ${isAntiCrawl}`);

        if (isAntiCrawl || this.consecutiveFailures >= CONFIG.ANTI_CRAWL.MAX_CONSECUTIVE_FAILURES) {
          // 触发状态机升级
          await this.transitionCrawlState('anti_crawl');
          antiCrawlTriggered = true;
          // 只有内置队列任务才放回 pending_queue，控制面任务由控制面管理重试
          if (!fromController) {
            await this.putBackTask(task);
          } else {
            console.log(`[JobHunter] Controller task anti-crawl, not putting back to internal queue`);
          }
        }
        
        throw new Error(`Search failed: ${searchResult.error}`);
      }

      // 搜索成功
      if (this.consecutiveFailures > 0) {
        console.log(`[JobHunter] ✅ Search success, resetting failure count`);
        this.consecutiveFailures = 0;
      }
      await this.transitionCrawlState('success');
      this.runStats.listCount = searchResult.data.length;
      this.runStats.pagedListCount = searchResult.data.length;
      this.runStats.pagesFetched = searchResult.pagesFetched || 0;

      if (!searchResult.data || searchResult.data.length === 0) {
        console.log(`[JobHunter] No jobs found for ${keyword} in ${city.name}`);
        this.isRunning = false;
        await this.saveStats();
        // 向控制面报告结果（P0修复：提前返回也要上报）
        const result = this.buildTaskResult({
          city,
          keyword,
          taskId,
          status: 'success',
          total: 0,
          pushed: 0,
          filtered: 0,
          errorCode: null,
          errorMessage: null
        });
        await this.reportToController(result);
        return { success: true, total: 0, reason: 'no_jobs' };
      }

      // 规则过滤
      console.log(`[JobHunter] Search returned ${searchResult.data.length} jobs:`,
        searchResult.data.map(j => `${j.jobName}[${j.jobExperience || '经验未知'}]`));
      
      const { kept, filtered, filterReasonStats } = this.filterJobs(searchResult.data);
      if (filtered.length > 0) {
        console.log(`[JobHunter] Filtered ${filtered.length}/${searchResult.data.length} jobs:`,
          filtered.map(j => `${j.jobName}(${j._filterReason})`));
        console.log(`[JobHunter] Filter reason breakdown:`);
        for (const [reason, jobNames] of Object.entries(filterReasonStats)) {
          console.log(`  [${jobNames.length}] ${reason}: ${jobNames.join(', ')}`);
        }
        this.runStats.filterReasonStats = filterReasonStats;
        this.runStats.filteredCount += filtered.length;
        filteredJobs.push(...filtered.map(j => ({
          ...j, city: city.name, keyword, collectedAt: new Date().toISOString()
        })));
      }

      if (kept.length === 0) {
        console.log(`[JobHunter] All ${searchResult.data.length} jobs filtered`);
        this.isRunning = false;
        await this.saveStats();
        // 向控制面报告结果（P0修复：提前返回也要上报）
        const result = this.buildTaskResult({
          city,
          keyword,
          taskId,
          status: 'success',
          total: 0,
          pushed: 0,
          filtered: filteredJobs.length,
          errorCode: null,
          errorMessage: null
        });
        await this.reportToController(result);
        return { success: true, total: 0, filtered: filteredJobs.length, reason: 'all_filtered' };
      }

      console.log(`[JobHunter] Found ${kept.length} jobs (from ${searchResult.data.length}, filtered ${filtered.length})`);

      const seenJobIds = await this.getSeenJobIdsSet();
      const detailCandidates = this.selectDetailCandidates(kept, seenJobIds);

      if (detailCandidates.length === 0) {
        console.log(`[JobHunter] No new jobs eligible for detail harvesting (missingEncryptJobId=${this.runStats.missingEncryptJobIdCount}, seenSkipped=${this.runStats.detailSkippedSeenCount})`);
        this.isRunning = false;
        await this.saveStats();
        const result = this.buildTaskResult({
          city,
          keyword,
          taskId,
          status: 'success',
          total: 0,
          pushed: 0,
          filtered: filteredJobs.length,
          errorCode: null,
          errorMessage: null
        });
        await this.reportToController(result);
        return { success: true, total: 0, filtered: filteredJobs.length, reason: 'no_new_jobs' };
      }

      // 搜索后延迟
      const searchCooldown = this.currentDelay + Math.random() * 2000;
      console.log(`[JobHunter] ⏱️ Cooling down ${(searchCooldown/1000).toFixed(1)}s after search...`);
      await this.sleep(searchCooldown);

      // 7. 获取详情（先去重，再应用预算）
      const maxDetails = Math.min(detailCandidates.length, this.getMaxDetailRequestsPerRun());
      console.log(`[JobHunter] Fetching details for ${maxDetails}/${detailCandidates.length} new jobs (MAX_DETAIL_REQUESTS_PER_RUN=${this.getMaxDetailRequestsPerRun()})`);
      
      const jobsWithDetails = [];
      for (let i = 0; i < maxDetails; i++) {
        const job = detailCandidates[i];
        console.log(`[JobHunter] [${i+1}/${maxDetails}] Getting detail: ${job.jobName}`);
        
        try {
          this.runStats.detailRequestedCount++;
          const detailResult = await this.fetchJobDetailWithRetry(tab.id, job, 2);

          if (detailResult.success && detailResult.data) {
            this.runStats.detailSuccessCount++;
            if (detailResult.data._source === 'card') {
              this.runStats.cardApiUsed++;
            } else {
              this.runStats.detailApiUsed++;
            }
            if (detailResult.data.description?.length > 0) {
              this.runStats.successWithDesc++;
              this.runStats.detailDescriptionNonEmptyCount++;
            }
            jobsWithDetails.push({
              ...job,
              description: detailResult.data.description || '',
              hardRequirements: detailResult.data.hardRequirements || '',
              skills: detailResult.data.skills || job.skills || [],
              address: detailResult.data.address || '',
              welfareList: detailResult.data.welfareList || [],
              bossName: detailResult.data.bossName || job.bossName || '',
              bossTitle: detailResult.data.bossTitle || job.bossTitle || '',
              _source: detailResult.data._source || 'none'
            });
            await this.markJobIdSeen(job.encryptJobId, seenJobIds);
            console.log(`[JobHunter]   ✓ Description: ${detailResult.data.description?.length || 0} chars`);
          } else {
            this.runStats.failCount++;
            console.log(`[JobHunter]   ✗ Failed: ${detailResult.error || 'Unknown'}`);
            
            if (this.isAntiCrawlError(detailResult.error)) {
              console.log(`[JobHunter]   ⚠️ Anti-crawl in detail API`);
              await this.increaseDelay();
              // 触发状态机
              await this.transitionCrawlState('anti_crawl');
              antiCrawlTriggered = true;
            }
            
            jobsWithDetails.push({ ...job, description: '' });
          }

          if (i < maxDetails - 1) {
            const detailDelay = this.currentDelay + Math.random() * 3000;
            console.log(`[JobHunter]   ⏱️ Waiting ${(detailDelay/1000).toFixed(1)}s...`);
            await this.sleep(detailDelay);
          }
        } catch (detailError) {
          console.error(`[JobHunter] Detail error:`, detailError);
          jobsWithDetails.push({ ...job, description: '' });
        }
      }

      // 添加元数据
      const jobsWithMeta = jobsWithDetails.map(job => ({
        ...job,
        city: city.name,
        keyword: keyword,
        collectedAt: new Date().toISOString()
      }));
      
      allJobs.push(...jobsWithMeta);
      this.runStats.totalJobs += jobsWithMeta.length;

      console.log(`[JobHunter] ========================================`);
      console.log(`[JobHunter] Task completed: ${jobsWithMeta.length} jobs collected`);

    } catch (error) {
      console.error('[JobHunter] Task error:', error);
      lastError = error;  // 记录错误用于上报（P0新增）
      // 如果是因为反爬导致的错误，任务已经放回队列
      if (antiCrawlTriggered) {
        console.log(`[JobHunter] Task put back due to anti-crawl`);
      }
    } finally {
      await this.closeTabIfNeeded(tab?.id);
    }

    // 9. 推送到飞书
    const deliveryBatchId = allJobs.length > 0
      ? new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '') +
        '-' + Math.random().toString(36).slice(2, 6)
      : null;

    let pushedCount = 0;
    if (allJobs.length > 0) {
      if (this.isControllerDeliveryEnabled()) {
        const detailReport = await this.reportDetailsToController(allJobs, taskId, deliveryBatchId);
        pushedCount = (detailReport.inserted || 0) + (detailReport.duplicates || 0);
      } else {
        pushedCount = await this.pushToFeishu(allJobs, deliveryBatchId);
        await this.reportDetailsToController(allJobs, taskId, deliveryBatchId);
      }
    }

    // 推送被过滤的岗位（可选，由开关控制）
    const PUSH_FILTERED_TO_FEISHU = false;
    if (PUSH_FILTERED_TO_FEISHU && filteredJobs.length > 0) {
      const filteredPushed = await this.pushToFeishu(filteredJobs);
      console.log(`[JobHunter] Filtered jobs pushed: ${filteredPushed}`);
    }

    this.isRunning = false;
    await this.saveStats();

    // Phase 1: queueLengthHistory 相关旧告警逻辑已停用，保留函数体仅用于回退。
    // 11. 告警检查
    await this.checkAndSendAlerts(allJobs.length, pushedCount, antiCrawlTriggered);

    // 12. 构造结果并报告给控制面
    // P0修复：区分三种状态 success / anti_crawl / failed
    let status;
    if (antiCrawlTriggered) {
      status = 'anti_crawl';
    } else if (lastError) {
      status = 'failed';
    } else {
      status = 'success';
    }
    
    const result = this.buildTaskResult({
      city,
      keyword,
      taskId,
      status,
      total: allJobs.length,
      pushed: pushedCount,
      filtered: filteredJobs.length,
      errorCode: antiCrawlTriggered ? this.crawlState.status : null,
      errorMessage: lastError ? lastError.message : null
    });
    await this.reportToController(result);

    // 13. 返回结果
    if (antiCrawlTriggered) {
      return {
        success: true,
        total: allJobs.length,
        pushed: pushedCount,
        filtered: filteredJobs.length,
        antiCrawl: true,
        status: this.crawlState.status,
        blockedUntil: this.crawlState.blockedUntil
      };
    }

    return {
      success: true,
      total: allJobs.length,
      withDescription: allJobs.filter(j => j.description?.length > 0).length,
      pushed: pushedCount,
      filtered: filteredJobs.length,
      queueRemaining: remaining
    };
  }

  // 等待标签页加载
  waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const listener = (updatedTabId, info) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  // 等待 Content Script 准备就绪（带重试）
  async waitForContentScript(tabId, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.sendMessageToTab(tabId, { type: 'CHECK_STATUS' });
        if (result && result.success) {
          console.log(`[JobHunter] Content Script ready after ${i + 1} attempt(s)`);
          return true;
        }
      } catch (error) {
        console.log(`[JobHunter] Content Script not ready (attempt ${i + 1}/${maxRetries}): ${error.message}`);
      }
      // 等待 1 秒后重试
      await this.sleep(1000);
    }
    throw new Error('Content Script failed to initialize after ' + maxRetries + ' attempts');
  }

  // 向Content Script发送消息
  sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 30000);

      const attemptSend = (hasRecovered = false) => chrome.tabs.sendMessage(tabId, message, async (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || 'Unknown runtime error';
          if (!hasRecovered && this.shouldRecoverMessagePort(errorMessage)) {
            try {
              await this.recoverContentScript(tabId, errorMessage);
              attemptSend(true);
              return;
            } catch (recoveryError) {
              reject(recoveryError);
              return;
            }
          }
          reject(new Error(errorMessage));
        } else {
          resolve(response);
        }
      });

      attemptSend(false);
    });
  }

  shouldRecoverMessagePort(errorMessage) {
    return typeof errorMessage === 'string' &&
      errorMessage.includes('Receiving end does not exist');
  }

  async recoverContentScript(tabId, reason) {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || !tab.url.startsWith('https://www.zhipin.com/')) {
      throw new Error(`Cannot recover content script on tab ${tabId}: unsupported URL`);
    }

    console.warn(`[JobHunter] Content script missing on tab ${tabId}, reinjecting (${reason})`);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    await this.waitForContentScript(tabId, 3);
    console.log(`[JobHunter] Content script recovered on tab ${tabId}`);
  }

  // ============ 飞书字段适配层 ============

  // 从飞书API拉取选项字典并缓存
  async loadOptionDict() {
    // 先查缓存
    const cached = await chrome.storage.local.get(OPTION_CACHE_KEY);
    if (cached[OPTION_CACHE_KEY]) {
      const { dict, timestamp } = cached[OPTION_CACHE_KEY];
      if (Date.now() - timestamp < OPTION_CACHE_TTL) {
        console.log('[JobHunter] Using cached option dict');
        return dict;
      }
    }

    // 从飞书API拉取
    console.log('[JobHunter] Fetching option dict from Feishu API...');
    const dict = await this.fetchOptionDictFromAPI();

    // 缓存
    await chrome.storage.local.set({
      [OPTION_CACHE_KEY]: { dict, timestamp: Date.now() }
    });

    return dict;
  }

  async fetchOptionDictFromAPI() {
    try {
      const token = await this.getFeishuToken();
      const res = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/fields`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();

      if (data.code !== 0) {
        console.error('[JobHunter] Failed to fetch fields:', data);
        return {};
      }

      const dict = {};
      for (const field of data.data.items) {
        if (field.property?.options) {
          dict[field.field_name] = field.property.options.map(opt => opt.name);
        }
      }

      console.log('[JobHunter] Option dict loaded:', Object.keys(dict));
      return dict;
    } catch (error) {
      console.error('[JobHunter] Error fetching option dict:', error);
      return {};
    }
  }

  async getFeishuToken() {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.appId,
        app_secret: FEISHU_CONFIG.appSecret
      })
    });
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error('Failed to get token');
    }
    return data.tenant_access_token;
  }

  // SingleSelect: 值必须在选项列表中，不在则返回空
  matchSingleSelect(value, options) {
    if (!value || !options || options.length === 0) return '';
    const found = options.find(opt =>
      opt.toLowerCase() === value.toLowerCase() ||
      opt.includes(value) ||
      value.includes(opt)
    );
    return found || '';
  }

  // MultiSelect: 过滤出已存在的选项
  matchMultiSelect(values, options) {
    if (!values || !Array.isArray(values) || !options || options.length === 0) return [];
    return values.filter(v =>
      options.some(opt =>
        opt.toLowerCase() === v.toLowerCase() ||
        opt.includes(v) ||
        v.includes(opt)
      )
    );
  }

  // 截断工具
  truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) : str;
  }

  // 地点拼接
  buildLocation(job) {
    let loc = job.locationName || '';
    if (job.areaDistrict && !loc.includes(job.areaDistrict)) {
      loc = loc + '·' + job.areaDistrict;
    }
    return loc;
  }

  // 数据来源映射
  mapSource(source) {
    const map = {
      'card': 'card',
      'detail': 'detail',
      'card→detail降级': 'card→detail降级'
    };
    return map[source] || 'none';
  }

  // 采集状态映射
  mapStatus(job) {
    if (job._filtered) return '已过滤';
    if (job._source === 'card→detail降级') return '描述为空';
    if (job.description && job.description.length > 0) return '成功';
    return '描述为空';
  }

  /**
   * 将Boss原始数据标准化为飞书字段格式
   * 负责: 类型转换、选项白名单过滤、空值处理、截断
   */
  normalizeForFeishu(job, optionDict, batchId) {
    // 1. SingleSelect字段: 值必须在选项列表中
    const workExp = this.matchSingleSelect(job.jobExperience, optionDict['工作经验']);
    const degree = this.matchSingleSelect(job.jobDegree, optionDict['学历要求']);
    const companyType = this.matchSingleSelect(job.brandStageName, optionDict['公司类型']);
    const sourcePlatform = this.matchSingleSelect('Boss直聘', optionDict['来源平台']);

    // 2. MultiSelect字段: 只保留已存在的选项
    const rawSkills = job.skills || [];
    const keywords = this.matchMultiSelect(rawSkills, optionDict['岗位关键词']);

    // 3. Url字段: 已实测验证：飞书Url字段必须用 {text, link} 对象格式（纯字符串会报URLFieldConvFail）
    const jobUrl = {
      text: "查看职位",
      link: `https://www.zhipin.com/job_detail/${job.encryptJobId}.html`
    };

    // 4. DateTime字段: 毫秒时间戳（飞书自动格式化为yyyy/MM/dd HH:mm）
    const crawlTime = Date.now();

    return {
      "文本": `JOB-${job.encryptJobId?.slice(-8)}`,
      "职位名称": this.truncate(job.jobName, 100),
      "公司名称": this.truncate(job.brandName, 100),
      "薪资范围": this.truncate(job.salaryDesc, 50),
      "工作地点": this.buildLocation(job),
      "工作经验": workExp,
      "学历要求": degree,
      "行业领域": this.truncate(job.brandIndustry || '人工智能', 100),
      "岗位关键词": keywords,
      "职位描述": job._filterReason ? `[已过滤] ${job._filterReason}` : this.truncate(job.description || '', 5000),
      "硬性要求": this.truncate(job.hardRequirements || '', 2000),
      "公司规模": this.truncate(job.brandScaleName || '', 50),
      "公司类型": companyType,
      "来源平台": sourcePlatform,
      "HR姓名": this.truncate(job.bossName || '', 50),
      "发布时间": '',  // 暂留空，需额外API
      "公司简介": '',  // 暂留空，需额外API
      "爬取时间": crawlTime,
      "职位链接": jobUrl,
      "数据来源": this.mapSource(job._source),
      "采集状态": this.mapStatus(job),
      "采集批次": batchId || ''
    };
  }

  // 发送告警记录到飞书
  async sendAlertToFeishu(alertType, details) {
    if (!ALERTS_CONFIG.writeAlertsToMainTable) {
      console.warn(`[JobHunter] Alert suppressed from main table: ${alertType}`);
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '');
    const alertId = `ALERT-${timestamp}-${Math.random().toString(36).slice(2, 6)}`;
    
    const alertRecord = {
      fields: {
        "文本": alertId,
        "职位名称": `⚠️ 采集异常告警: ${alertType}`,
        "公司名称": "（系统告警）",
        "职位描述": details,
        "采集状态": "接口失败",
        "来源平台": "Boss直聘",
        "采集批次": alertId.split('-').slice(0, 3).join('-')
      }
    };

    try {
      const token = await this.getFeishuToken();
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: alertRecord.fields })
      });
      
      const data = await res.json();
      if (data.code === 0) {
        console.log(`[JobHunter] Alert sent: ${alertId}`);
      } else {
        console.error(`[JobHunter] Failed to send alert:`, data);
      }
    } catch (error) {
      console.error(`[JobHunter] Alert send error:`, error);
    }
  }

  // 检查并发送告警
  async checkAndSendAlerts(totalJobs, pushedCount, antiCrawlTriggered) {
    const alerts = [];

    // 条件1: 反爬触发
    if (antiCrawlTriggered) {
      alerts.push({
        type: '反爬触发',
        details: `状态: ${this.crawlState.status}\n连续失败: ${this.crawlState.consecutiveBatchFailures}\n延迟: ${this.currentDelay}ms\n时间: ${new Date().toISOString()}`
      });
    }

    // 条件2: 有数据但写入失败
    if (totalJobs > 0 && pushedCount === 0) {
      alerts.push({
        type: '飞书写入失败',
        details: `采集: ${totalJobs}条\n写入: ${pushedCount}条\n状态: 全部写入失败\n时间: ${new Date().toISOString()}`
      });
    }

    // 条件3: 详情获取成功率低于30%
    const successRate = this.runStats.totalJobs > 0 
      ? (this.runStats.successWithDesc / this.runStats.totalJobs) 
      : 1;
    if (successRate < 0.3 && this.runStats.totalJobs > 0) {
      alerts.push({
        type: '详情获取率低',
        details: `详情成功率: ${(successRate * 100).toFixed(1)}%\n成功: ${this.runStats.successWithDesc}\n总计: ${this.runStats.totalJobs}\n时间: ${new Date().toISOString()}`
      });
    }

    // 条件4: 当天被封
    if (this.crawlState.status === 'blocked_today') {
      alerts.push({
        type: '当日封禁',
        details: `状态: blocked_today\n解封时间: ${new Date(this.crawlState.blockedUntil).toISOString()}\n时间: ${new Date().toISOString()}`
      });
    }

    // Phase 1: 旧的 queueLengthHistory / 队列堆积告警已停止调用，改由 controller 基于 delivery_queue 负责。

    // 发送所有告警
    for (const alert of alerts) {
      await this.sendAlertToFeishu(alert.type, alert.details);
    }
  }

  // 检查队列是否堆积（连续3次未减少）
  checkQueueStuck() {
    if (this.crawlState.status !== 'normal') {
      return null;
    }

    // 需要至少3条记录
    if (this.queueLengthHistory.length < 3) {
      return null;
    }
    // 取最近3次
    const recent = this.queueLengthHistory.slice(-3);

    // 只基于真实的剩余待处理量判断，不再把“连续3次控制面任务”误判为堆积。
    const validRecords = recent.filter(q => Number.isInteger(q.length) && q.length >= 0);
    if (validRecords.length < 3) {
      return null;
    }

    const lengths = validRecords.map(q => q.length);
    const allPositive = lengths.every(length => length > 0);
    const nonDecreasing = lengths.every((length, index) => index === 0 || length >= lengths[index - 1]);

    if (allPositive && nonDecreasing) {
      const source = validRecords.every(q => q.fromController) ? '控制面' : '内置队列';
      return {
        type: '队列堆积',
        details: `${source}连续3次待处理量未下降，当前长度: ${lengths[lengths.length - 1]}\n历史: ${lengths.join(' -> ')}\n时间: ${new Date().toISOString()}`
      };
    }

    return null;
  }

  // 检查并发送队列堆积告警（专用函数，用于提前返回路径）
  // 只做两件事：1) 调 checkQueueStuck() 2) 如命中则调 sendAlertToFeishu()
  async checkAndSendQueueStuckAlert() {
    const queueAlert = this.checkQueueStuck();
    if (!queueAlert) {
      return;
    }

    // 去重检查：相同签名30分钟内不重复发
    const shouldSend = await this.shouldSendQueueStuckAlert(queueAlert);
    if (!shouldSend) {
      console.log('[JobHunter] Queue stuck alert deduplicated:', queueAlert.type);
      return;
    }

    await this.sendAlertToFeishu(queueAlert.type, queueAlert.details);
    
    // 记录本次告警签名
    await this.recordQueueStuckAlert(queueAlert);
  }

  // 生成队列堆积告警签名（用于去重）
  getQueueStuckAlertSignature(alert) {
    // 取最近3条历史记录的摘要
    const recentHistory = this.queueLengthHistory.slice(-3);
    const historyDigest = recentHistory.map(q => 
      `${q.length}:${q.fromController ? 'c' : 'i'}`
    ).join(',');
    
    return {
      type: alert.type,
      historyDigest: historyDigest,
      windowStart: Math.floor(Date.now() / (30 * 60 * 1000)) // 30分钟时间窗口
    };
  }

  // 检查是否应该发送队列堆积告警（去重逻辑）
  async shouldSendQueueStuckAlert(alert) {
    try {
      const result = await chrome.storage.local.get('last_queue_stuck_alert');
      const lastAlert = result.last_queue_stuck_alert;
      
      if (!lastAlert) {
        return true;
      }

      const currentSignature = this.getQueueStuckAlertSignature(alert);
      
      // 检查签名是否相同（type + historyDigest + 时间窗口）
      const sameType = lastAlert.type === currentSignature.type;
      const sameDigest = lastAlert.historyDigest === currentSignature.historyDigest;
      const sameWindow = lastAlert.windowStart === currentSignature.windowStart;
      
      // 相同签名在30分钟窗口内不重复发
      if (sameType && sameDigest && sameWindow) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[JobHunter] Error checking alert dedup:', error);
      return true; // 出错时允许发送，避免漏告警
    }
  }

  // 记录队列堆积告警到 storage
  async recordQueueStuckAlert(alert) {
    try {
      const signature = this.getQueueStuckAlertSignature(alert);
      await chrome.storage.local.set({
        'last_queue_stuck_alert': signature
      });
    } catch (error) {
      console.error('[JobHunter] Error recording queue stuck alert:', error);
    }
  }

  // 记录队列长度
  // remaining: 内置队列剩余长度；fromController: 是否来自控制面
  async recordQueueLength(remaining, fromController = false) {
    const numericRemaining = Number(remaining);
    if (!Number.isInteger(numericRemaining) || numericRemaining < 0) {
      return;
    }

    this.queueLengthHistory.push({
      length: numericRemaining,
      fromController,
      timestamp: Date.now()
    });

    // 只保留最近10条
    if (this.queueLengthHistory.length > 10) {
      this.queueLengthHistory.shift();
    }

    // 持久化到 storage（MV3 Service Worker 会被回收）
    await this.saveQueueLengthHistory();
  }

  // 推送到飞书
  async pushToFeishu(jobs, batchId = null) {
    console.log(`[JobHunter] Pushing ${jobs.length} jobs to Feishu...`);

    try {
      // 1. 加载选项字典
      const optionDict = await this.loadOptionDict();

      // 2. 生成采集批次ID
      const resolvedBatchId = batchId || (
        new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '') +
        '-' + Math.random().toString(36).slice(2, 6)
      );
      console.log(`[JobHunter] Batch ID: ${resolvedBatchId}`);

      // 3. 标准化每条数据
      const records = [];
      for (const job of jobs) {
        const fields = this.normalizeForFeishu(job, optionDict, resolvedBatchId);
        records.push({ fields });
      }

      // 4. 批量写入（分批，每批最多50条）
      const results = await this.batchCreateRecords(records);
      const totalPushed = results.reduce((sum, r) => sum + (r.count || 0), 0);
      console.log(`[JobHunter] Total pushed: ${totalPushed} jobs`);
      return totalPushed;

    } catch (error) {
      console.error('[JobHunter] Push error:', error);
      return 0;
    }
  }

  async reportDetailsToController(jobs, taskId, batchId) {
    if (!jobs || jobs.length === 0) {
      return { inserted: 0, duplicates: 0, errors: [], attempted: 0 };
    }

    try {
      const optionDict = await this.loadOptionDict();
      const payloadJobs = jobs
        .filter(job => job && job.encryptJobId)
        .map(job => ({
          encryptJobId: job.encryptJobId,
          payload: this.normalizeForFeishu(job, optionDict, batchId)
        }));

      if (payloadJobs.length === 0) {
        console.warn('[JobHunter] Detail report skipped: no jobs with encryptJobId');
        return { inserted: 0, duplicates: 0, errors: [], attempted: 0 };
      }

      const response = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/report-detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId || null,
          batchId: batchId || null,
          jobs: payloadJobs
        })
      });

      if (!response.ok) {
        console.warn(`[JobHunter] Detail report failed: ${response.status}`);
        return {
          inserted: 0,
          duplicates: 0,
          errors: [{ error: `HTTP_${response.status}` }],
          attempted: payloadJobs.length
        };
      }

      const result = await response.json();
      console.log(`[JobHunter] Detail report: inserted=${result.inserted || 0}, dupes=${result.duplicates || 0}, errors=${Array.isArray(result.errors) ? result.errors.length : 0}`);
      return {
        inserted: result.inserted || 0,
        duplicates: result.duplicates || 0,
        errors: Array.isArray(result.errors) ? result.errors : [],
        attempted: payloadJobs.length
      };
    } catch (error) {
      // 镜像上报是尽力而为，不阻断主流程
      console.warn(`[JobHunter] Detail report error: ${error.message}`);
      return {
        inserted: 0,
        duplicates: 0,
        errors: [{ error: error.message }],
        attempted: Array.isArray(jobs) ? jobs.length : 0
      };
    }
  }

  // 分批创建记录
  async batchCreateRecords(records) {
    const results = [];
    const batchSize = 50;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`[JobHunter] Pushing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (${batch.length} records)...`);

      try {
        const token = await this.getFeishuToken();
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records/batch_create`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ records: batch })
        });

        const result = await response.json();

        if (result.code === 0) {
          const count = result.data?.records?.length || 0;
          console.log(`[JobHunter] Batch pushed: ${count} jobs`);
          results.push({ success: true, count });
        } else {
          console.error('[JobHunter] Batch push failed:', result);
          results.push({ success: false, count: 0, error: result });
        }
      } catch (error) {
        console.error('[JobHunter] Batch push error:', error);
        results.push({ success: false, count: 0, error: error.message });
      }
    }

    return results;
  }

  // 检查飞书连接是否正常
  async checkFeishuConnection() {
    try {
      await this.getFeishuToken();
      return true;
    } catch {
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async closeTabIfNeeded(tabId) {
    if (!tabId) {
      return;
    }
    try {
      await chrome.tabs.remove(tabId);
      console.log(`[JobHunter] Closed task tab: ${tabId}`);
    } catch {
      console.log('[JobHunter] Tab already closed');
    }
  }

  async getSeenJobIdsSet() {
    const stored = await chrome.storage.local.get(SEEN_JOB_IDS_KEY);
    return new Set(Array.isArray(stored[SEEN_JOB_IDS_KEY]) ? stored[SEEN_JOB_IDS_KEY] : []);
  }

  async markJobIdSeen(encryptJobId, seenJobIds = null) {
    if (!encryptJobId) {
      return;
    }
    const localSeenJobIds = seenJobIds || await this.getSeenJobIdsSet();
    localSeenJobIds.add(encryptJobId);
    await chrome.storage.local.set({
      [SEEN_JOB_IDS_KEY]: Array.from(localSeenJobIds)
    });
  }

  selectDetailCandidates(jobs, seenJobIds) {
    const candidates = [];

    for (const job of jobs) {
      if (!job.encryptJobId) {
        this.runStats.missingEncryptJobIdCount++;
        console.log(`[JobHunter] Skipping job without encryptJobId: ${job.jobName}`);
        continue;
      }

      if (seenJobIds.has(job.encryptJobId)) {
        this.runStats.detailSkippedSeenCount++;
        console.log(`[JobHunter] Skipping seen job detail: ${job.jobName} (${job.encryptJobId})`);
        continue;
      }

      candidates.push(job);
    }

    console.log(`[JobHunter] Detail candidates: ${candidates.length}/${jobs.length}, missingEncryptJobId=${this.runStats.missingEncryptJobIdCount}, seenSkipped=${this.runStats.detailSkippedSeenCount}`);
    return candidates;
  }

  async scrapeJobListPages(tabId, { keyword, cityCode, pageSize, experience }) {
    const mergedJobs = [];
    const seenListJobKeys = new Set();
    let lastError = null;
    let pagesFetched = 0;

    const maxPagesPerRun = this.getMaxListPagesPerRun();

    for (let page = 1; page <= maxPagesPerRun; page++) {
      console.log(`[JobHunter] Fetching list page ${page}/${maxPagesPerRun} for ${keyword}`);

      const pageResult = await this.sendMessageToTab(tabId, {
        type: 'SCRAPE_JOBS',
        keyword,
        cityCode,
        pageSize,
        experience,
        page
      });

      if (!pageResult.success) {
        lastError = pageResult.error;
        if (this.isAntiCrawlError(pageResult.error)) {
          console.warn(`[JobHunter] List page ${page} hit anti-crawl, stop pagination`);
        } else {
          console.warn(`[JobHunter] List page ${page} failed, stop pagination: ${pageResult.error}`);
        }

        if (page === 1 && mergedJobs.length === 0) {
          return {
            success: false,
            error: pageResult.error,
            code: pageResult.code,
            pagesFetched
          };
        }

        break;
      }

      const pageJobs = Array.isArray(pageResult.data) ? pageResult.data : [];
      pagesFetched += 1;
      console.log(`[JobHunter] List page ${page} returned ${pageJobs.length} jobs`);

      for (const job of pageJobs) {
        const dedupeKey = job.encryptJobId || job.securityId || `${job.jobName}::${job.brandName}::${job.salaryDesc}`;
        if (seenListJobKeys.has(dedupeKey)) continue;
        seenListJobKeys.add(dedupeKey);
        mergedJobs.push(job);
      }

      console.log(`[JobHunter] Paged list aggregate after page ${page}: ${mergedJobs.length} jobs`);

      if (pageJobs.length === 0 || pageJobs.length < pageSize) {
        console.log(`[JobHunter] List page ${page} indicates end of results, stop pagination`);
        break;
      }

      if (page < maxPagesPerRun) {
        const pageDelay = this.currentDelay + Math.random() * 2000;
        console.log(`[JobHunter]   ⏱️ Waiting ${(pageDelay / 1000).toFixed(1)}s before next list page...`);
        await this.sleep(pageDelay);
      }
    }

    if (lastError) {
      console.log(`[JobHunter] Pagination finished with partial data after error: ${lastError}`);
    }

    return {
      success: true,
      data: mergedJobs,
      total: mergedJobs.length,
      pagesFetched,
      partial: Boolean(lastError),
      partialReason: lastError
    };
  }

  buildTaskResult({ city, keyword, taskId, status, total, pushed, filtered, errorCode, errorMessage }) {
    return {
      task: {
        city: city.name || city,
        keyword,
        taskId: taskId || null
      },
      ...this.getVersionInfo(),
      status,
      total,
      withDescription: this.runStats.detailDescriptionNonEmptyCount,
      pushed,
      filtered,
      errorCode,
      errorMessage,
      crawlState: this.crawlState.status,
      listCount: this.runStats.listCount,
      missingEncryptJobIdCount: this.runStats.missingEncryptJobIdCount,
      detailSkippedSeenCount: this.runStats.detailSkippedSeenCount,
      detailRequestedCount: this.runStats.detailRequestedCount,
      detailSuccessCount: this.runStats.detailSuccessCount,
      detailDescriptionNonEmptyCount: this.runStats.detailDescriptionNonEmptyCount,
      pagesFetched: this.runStats.pagesFetched,
      filterReasonStats: this.runStats.filterReasonStats || null,
      timestamp: Date.now()
    };
  }

  // 带重试机制的详情获取
  async fetchJobDetailWithRetry(tabId, job, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const detailResult = await this.sendMessageToTab(tabId, {
          type: 'GET_JOB_DETAIL',
          securityId: job.securityId,
          lid: job.lid
        });

        if (detailResult.success && detailResult.data?.description?.length > 0) {
          return detailResult;
        }

        // 如果是最后一次尝试，返回失败结果
        if (attempt === maxRetries) {
          return detailResult;
        }

        // 失败时增加延迟再重试
        const retryDelay = 8000 + Math.random() * 5000;
        console.log(`[JobHunter]   🔄 Retry ${attempt + 1} for ${job.jobName} after ${(retryDelay/1000).toFixed(1)}s...`);
        await this.sleep(retryDelay);

      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`[JobHunter]   🔄 Retry ${attempt + 1} after error: ${error.message}`);
        await this.sleep(8000);
      }
    }
  }

  // ============ 规则过滤 ============

  /**
   * 轻量规则评分：对岗位打分，低于阈值则过滤
   * 返回 { score, reason }，reason为空表示通过
   */
  scoreJob(job) {
    let score = 0;
    const title = job.jobName || '';
    const exp = job.jobExperience || '';
    const titleLower = title.toLowerCase();
    const filterMode = this.getJobFilterMode();
    const expHardExclude = this.getExpHardExcludeRegex();

    // 硬排除：标题命中明确的校招性质词
    if (CONFIG.FILTER.TITLE_HARD_EXCLUDE.test(title)) {
      const match = title.match(CONFIG.FILTER.TITLE_HARD_EXCLUDE);
      return { score: -10, reason: `标题包含"${match[0]}"` };
    }
    
    // 软排除：实习/应届（但"接受实习/应届"不触发，因为是接受多种经验）
    if (!/接受.*实习|接受.*应届/.test(title)) {
      // 不是"接受实习"的情况，检查是否是纯实习/应届岗位
      if (/实习生|应届生|^实习[^接受]|^应届[^接受]/.test(title)) {
        return { score: -5, reason: '标题含实习/应届（非接受多种经验）' };
      }
    }

    // 硬排除：经验年限过长
    if (expHardExclude.test(exp)) {
      const match = exp.match(expHardExclude);
      return { score: -10, reason: `经验"${match[0]}"` };
    }
    
    // 软排除：在校/应届（减分但不直接排除）
    if (/在校|应届/.test(exp)) {
      score -= 5;
    }

    if (filterMode === 'general_pm' && !CONFIG.FILTER.GENERAL_PM_INCLUDE.test(title)) {
      return { score: -10, reason: '标题不属于产品经理岗位' };
    }

    if (filterMode === 'ai_focused') {
      // 方向加分：标题包含AI方向关键词
      for (const kw of CONFIG.FILTER.AI_DIRECTION_KEYWORDS) {
        if (titleLower.includes(kw.toLowerCase())) {
          score += 2;
          break;
        }
      }
    }

    // 产品经理加分
    if (titleLower.includes('产品') || titleLower.includes('product')) score += 2;

    // 经验加分：1-3年
    if (/1-3年|1~3年/.test(exp)) score += 2;
    
    // 经验不限减分（但不硬排除）
    if (/经验不限/.test(exp)) score -= 1;

    // 资深减分
    if (/总监|负责人|专家|leader|head|vp/i.test(title)) score -= 3;

    // 低于阈值则过滤
    if (score < CONFIG.FILTER.MIN_SCORE) {
      return { score, reason: `评分${score}，低于阈值${CONFIG.FILTER.MIN_SCORE}` };
    }

    return { score, reason: '' };
  }

  /**
   * 过滤岗位列表
   * 返回 { kept, filtered, filterReasonStats }
   *   filterReasonStats: { "原因摘要": [count, "岗位列表"] }
   */
  filterJobs(jobs) {
    const kept = [];
    const filtered = [];
    const filterReasonStats = {};

    for (const job of jobs) {
      const { score, reason } = this.scoreJob(job);
      if (reason) {
        filtered.push({ ...job, _filtered: true, _filterReason: reason, _score: score });
        if (!filterReasonStats[reason]) filterReasonStats[reason] = [];
        filterReasonStats[reason].push(`${job.jobName}[${job.jobExperience || '经验未知'}]`);
      } else {
        kept.push(job);
      }
    }

    return { kept, filtered, filterReasonStats };
  }

  // ============ 采集统计 ============

  // 加载历史统计
  async loadStats() {
    try {
      const saved = await chrome.storage.local.get('crawl_stats');
      this.runStats = saved.crawl_stats?.latest || this.runStats;
    } catch (e) {
      // storage可能还没准备好
    }
  }

  // 保存统计（累计历史记录）
  async saveStats() {
    try {
      const saved = await chrome.storage.local.get('crawl_stats');
      const history = saved.crawl_stats || {};
      // 记录本次运行
      const runRecord = {
        ...this.runStats,
        timestamp: new Date().toISOString(),
        successRate: this.runStats.totalJobs > 0
          ? ((this.runStats.successWithDesc / this.runStats.totalJobs) * 100).toFixed(1) + '%'
          : 'N/A'
      };
      // 保留最近30次记录
      const runs = history.runs || [];
      runs.push(runRecord);
      if (runs.length > 30) runs.shift();

      await chrome.storage.local.set({
        crawl_stats: { latest: this.runStats, runs }
      });
      console.log('[JobHunter] Stats saved:', JSON.stringify(runRecord));
    } catch (e) {
      console.warn('[JobHunter] Failed to save stats:', e);
    }
  }

  // ============ 反爬状态机 + 批次调度 ============

  // 加载队列长度历史（用于堆积检测）
  // 带时效清理：只保留最近1小时的记录，避免跨会话/跨天误报
  async loadQueueLengthHistory() {
    try {
      const saved = await chrome.storage.local.get('queue_length_history');
      if (saved.queue_length_history) {
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        // 过滤掉超过1小时的旧记录
        const validRecords = saved.queue_length_history.filter(r =>
          r.timestamp &&
          (now - r.timestamp) < ONE_HOUR &&
          Number.isInteger(r.length) &&
          r.length >= 0
        );
        this.queueLengthHistory = validRecords;
        if (validRecords.length < saved.queue_length_history.length) {
          console.log(`[JobHunter] Queue length history loaded: ${validRecords.length}/${saved.queue_length_history.length} (filtered ${saved.queue_length_history.length - validRecords.length} expired records)`);
        } else {
          console.log('[JobHunter] Queue length history loaded:', validRecords.length);
        }
      }
    } catch (e) {
      console.warn('[JobHunter] Failed to load queue length history:', e);
    }
  }

  // 保存队列长度历史
  async saveQueueLengthHistory() {
    try {
      await chrome.storage.local.set({
        queue_length_history: this.queueLengthHistory
      });
    } catch (e) {
      console.warn('[JobHunter] Failed to save queue length history:', e);
    }
  }

  // 加载反爬状态
  async loadCrawlState() {
    try {
      const saved = await chrome.storage.local.get('crawl_state');
      if (saved.crawl_state) {
        this.crawlState = { ...this.crawlState, ...saved.crawl_state };
        console.log('[JobHunter] Crawl state loaded:', this.crawlState.status);
      }
    } catch (e) {
      console.warn('[JobHunter] Failed to load crawl state:', e);
    }
  }

  // 保存反爬状态
  async saveCrawlState() {
    try {
      await chrome.storage.local.set({ crawl_state: this.crawlState });
    } catch (e) {
      console.warn('[JobHunter] Failed to save crawl state:', e);
    }
  }

  // 状态机转换
  async transitionCrawlState(trigger) {
    const oldStatus = this.crawlState.status;
    let newStatus = oldStatus;
    let blockedUntil = null;

    if (trigger === 'anti_crawl') {
      // 连续触发反爬，逐级升级
      if (oldStatus === 'normal') {
        newStatus = 'cooldown_1h';
        blockedUntil = Date.now() + 60 * 60 * 1000;  // 1小时
      } else if (oldStatus === 'cooldown_1h') {
        newStatus = 'cooldown_4h';
        blockedUntil = Date.now() + 4 * 60 * 60 * 1000;  // 4小时
      } else if (oldStatus === 'cooldown_4h') {
        newStatus = 'blocked_today';
        // 次日0点
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        blockedUntil = tomorrow.getTime();
      }
      this.crawlState.consecutiveBatchFailures++;
      this.crawlState.lastAntiCrawlTime = Date.now();
      this.queueLengthHistory = [];
      await this.saveQueueLengthHistory();
      await chrome.storage.local.remove('last_queue_stuck_alert');
    } else if (trigger === 'success') {
      // 成功则重置连续失败计数（但不自动降级状态，等待时间到期）
      this.crawlState.consecutiveBatchFailures = 0;
    }

    this.crawlState.status = newStatus;
    this.crawlState.blockedUntil = blockedUntil;
    await this.saveCrawlState();

    if (oldStatus !== newStatus) {
      console.log(`[JobHunter] State transition: ${oldStatus} → ${newStatus}, blockedUntil: ${blockedUntil ? new Date(blockedUntil).toISOString() : 'null'}`);
    }
  }

  // 检查是否被阻塞
  async checkBlocked() {
    if (this.crawlState.blockedUntil && Date.now() < this.crawlState.blockedUntil) {
      const remaining = Math.ceil((this.crawlState.blockedUntil - Date.now()) / 60000);
      console.log(`[JobHunter] ⛔ Blocked: status=${this.crawlState.status}, remaining=${remaining}min`);
      return { blocked: true, remaining };
    }
    // 到期自动恢复
    if (this.crawlState.status !== 'normal') {
      console.log(`[JobHunter] ✅ Auto-resumed from ${this.crawlState.status} to normal`);
      this.crawlState.status = 'normal';
      this.crawlState.blockedUntil = null;
      await this.saveCrawlState();
    }
    return { blocked: false };
  }

  // 获取队列长度信息（用于早返回分支的堆积检测）
  async getQueueLengthInfo() {
    try {
      // 先检查控制面
      const res = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/status`);
      if (res.ok) {
        const status = await res.json();
        // 控制面返回 pendingCount（包含 pending + urgent + failed）
        return {
          remaining: status.pendingCount || 0,
          fromController: true
        };
      }
    } catch {
      // 控制面不可达，回退到内置队列
    }
    // 内置队列
    const stored = await chrome.storage.local.get('pending_queue');
    const queueLength = stored.pending_queue ? stored.pending_queue.length : 0;
    return {
      remaining: queueLength,
      fromController: false
    };
  }

  // 初始化待处理队列
  async initPendingQueue() {
    try {
      const stored = await chrome.storage.local.get('pending_queue');
      if (!stored.pending_queue || stored.pending_queue.length === 0) {
        // 生成完整的城市×关键词队列（16个组合）
        const queue = [];
        for (const city of CONFIG.CITIES) {
          for (const keyword of CONFIG.KEYWORDS) {
            queue.push({ city, keyword });
          }
        }
        await chrome.storage.local.set({ pending_queue: queue });
        console.log('[JobHunter] Pending queue initialized:', queue.length);
        return queue;
      }
      return stored.pending_queue;
    } catch (e) {
      console.warn('[JobHunter] Failed to init pending queue:', e);
      return [];
    }
  }

  // 获取下一个任务
  async getNextTask() {
    const queue = await this.initPendingQueue();
    if (queue.length === 0) return { task: null, remaining: 0 };
    const task = queue.shift();
    await chrome.storage.local.set({ pending_queue: queue });
    return { task, remaining: queue.length };
  }

  // 任务放回队列头部（反爬中断时）
 async putBackTask(task) {
    const stored = await chrome.storage.local.get('pending_queue');
    const queue = stored.pending_queue || [];
    queue.unshift(task);
    await chrome.storage.local.set({ pending_queue: queue });
    console.log(`[JobHunter] Task put back to queue: ${task.keyword} in ${task.city.name}`);
  }

  // ============ HTTP 控制面交互 ============

  // 从控制面拉取队列
  async fetchQueueFromController() {
    try {
      const res = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/status`);
      if (!res.ok) return null;
      const status = await res.json();

      if (status.paused) {
        console.log('[JobHunter] Controller is paused, skipping');
        return null;
      }

      const queueRes = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/queue`);
      const queue = await queueRes.json();

      // 按优先级获取任务：urgent > pending > failed/blocked_retry（重试）
      // urgent: 用户标记的紧急任务
      // pending: 正常等待的任务
      // failed/blocked_retry: 之前失败或反爬阻断，需要重试的任务
      const urgentTasks = queue.filter(t => t.status === 'urgent');
      const pendingTasks = queue.filter(t => t.status === 'pending');
      const retryTasks = queue.filter(t => t.status === 'failed' || t.status === 'blocked_retry');

      let task = null;
      let taskType = '';

      if (urgentTasks.length > 0) {
        task = urgentTasks[0];
        taskType = 'urgent';
      } else if (pendingTasks.length > 0) {
        task = pendingTasks[0];
        taskType = 'pending';
      } else if (retryTasks.length > 0) {
        task = retryTasks[0];
        taskType = 'retry';
      }

      if (task) {
        // P0新增：向控制面声明领取任务
        // R3: 使用 taskId 精确匹配
        try {
          await fetch(`${CONFIG.CONTROLLER_BASE_URL}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: task.id,        // R3: 用 taskId 领取
              city: task.city.name || task.city,
              keyword: task.keyword,
              claimedBy: 'extension'
            })
          });
        } catch (e) {
          console.warn('[JobHunter] Failed to claim task:', e.message);
        }
        console.log(`[JobHunter] Controller task [${taskType}]: ${task.keyword} in ${task.city.name || task.city} (id: ${task.id})`);
        return {
          city: task.city,
          keyword: task.keyword,
          taskId: task.id,        // R3: 存储 taskId
          fromController: true
        };
      }
      return null;
    } catch (error) {
      // 控制面未启动或不可达，返回 null 以回退到内置队列
      return null;
    }
  }

  // 向控制面报告结果
  async reportToController(result) {
    try {
      const response = await fetch(`${CONFIG.CONTROLLER_BASE_URL}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[JobHunter] Controller report rejected: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.warn('[JobHunter] Failed to report to controller:', error.message);
    }
  }

  // ============ 反爬自适应策略 ============
  
  // 检测是否是反爬错误
  isAntiCrawlError(errorMessage) {
    if (!errorMessage) return false;
    
    // 检查错误码
    for (const code of CONFIG.ANTI_CRAWL.ANTI_CRAWL_CODES) {
      if (errorMessage.includes(`code=${code}`) || errorMessage.includes(`code: ${code}`)) {
        return true;
      }
    }
    
    // 检查关键词
    const antiCrawlKeywords = ['环境异常', '环境存在异常', '操作频繁', '请稍后重试', '访问过快'];
    return antiCrawlKeywords.some(keyword => errorMessage.includes(keyword));
  }
  
  // 触发冷却期
  async triggerCooldown() {
    this.isCooldown = true;
    console.log(`[JobHunter] 🧊 TRIGGERING COOLDOWN for ${CONFIG.ANTI_CRAWL.COOLDOWN_TIME/1000}s...`);
    console.log(`[JobHunter] 🧊 Too many consecutive failures, cooling down...`);
    
    await this.sleep(CONFIG.ANTI_CRAWL.COOLDOWN_TIME);
    
    this.isCooldown = false;
    this.consecutiveFailures = 0;
    // 优化：保持增加后的延迟，不要重置为BASE_DELAY（Boss反爬有记忆效应）
    // this.currentDelay = CONFIG.ANTI_CRAWL.BASE_DELAY;
    console.log(`[JobHunter] ✅ Cooldown finished, resuming with delay: ${this.currentDelay}ms`);
  }
  
  // 动态增加延迟
  async increaseDelay() {
    const oldDelay = this.currentDelay;
    this.currentDelay = Math.min(
      this.currentDelay + CONFIG.ANTI_CRAWL.DELAY_INCREMENT,
      CONFIG.ANTI_CRAWL.MAX_DELAY
    );
    
    console.log(`[JobHunter] 📈 Delay increased: ${oldDelay}ms → ${this.currentDelay}ms`);
    
    // 记录反爬时间
    await chrome.storage.local.set({ last_anti_crawl_time: Date.now() });
    
    // 立即执行一次额外等待
    const extraWait = 5000 + Math.random() * 3000;
    console.log(`[JobHunter] ⏱️ Extra wait ${(extraWait/1000).toFixed(1)}s due to anti-crawl...`);
    await this.sleep(extraWait);
  }
}

// 启动服务
const service = new JobHunterService();
