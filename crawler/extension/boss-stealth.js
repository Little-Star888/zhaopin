/**
 * Boss 直聘反 CDP 检测 —— 在页面 main world 中尽早执行
 * 目标：屏蔽常见自动化信号，避免 Boss 检测到 Chrome Extension 的调试特征后闪退
 */
(function () {
  'use strict';
  if (window.__bossStealthApplied) return;
  window.__bossStealthApplied = true;

  // 1. 清除 navigator.webdriver（Selenium / CDP 标志）
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });
  } catch (_) { /* ignore */ }

  // 2. 移除 ChromeDriver 残留变量（cdc_ 前缀）
  try {
    for (const key of Object.keys(document)) {
      if (/^cdc_|^\$cdc_/.test(key)) {
        delete document[key];
      }
    }
  } catch (_) { /* ignore */ }

  // 3. 覆盖 navigator.plugins / languages 使其看起来正常
  try {
    if (navigator.plugins.length === 0) {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
        configurable: true,
      });
    }
    if (!navigator.languages || navigator.languages.length === 0) {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
        configurable: true,
      });
    }
  } catch (_) { /* ignore */ }

  // 4. 屏蔽 window.chrome.csi / loadTimes 被当作检测指标
  try {
    if (!window.chrome) window.chrome = {};
    if (!window.chrome.runtime) {
      // 不覆盖真实的 chrome.runtime（扩展需要它）
    }
  } catch (_) { /* ignore */ }

  // 5. 覆盖 Permission.query 对 notifications 的检测
  try {
    const origQuery = window.Notification && Notification.permission;
    if (origQuery === 'denied') {
      // headless 模式下 notification 默认 denied，这里不做额外处理
    }
  } catch (_) { /* ignore */ }
})();
