/**
 * Popup Script - 扩展弹出界面交互
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM 元素
  const startBtn = document.getElementById('startBtn');
  const configBtn = document.getElementById('configBtn');
  const cookieBtn = document.getElementById('cookieBtn');
  const statusText = document.getElementById('statusText');
  const crawlStatus = document.getElementById('crawlStatus');
  const todayCount = document.getElementById('todayCount');
  const cookieStatus = document.getElementById('cookieStatus');
  const feishuStatus = document.getElementById('feishuStatus');
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const messageBox = document.getElementById('messageBox');
  
  // 开关
  const autoToggle = document.getElementById('autoToggle');
  const aiToggle = document.getElementById('aiToggle');
  const pushToggle = document.getElementById('pushToggle');

  let isRunning = false;

  // 初始化
  await loadStatus();

  // 绑定事件
  document.getElementById('btn-open-dashboard').addEventListener('click', openDashboard);
  startBtn.addEventListener('click', startCrawl);
  configBtn.addEventListener('click', openConfig);
  cookieBtn.addEventListener('click', refreshCookie);
  
  autoToggle.addEventListener('click', () => toggleSwitch('auto', autoToggle));
  aiToggle.addEventListener('click', () => toggleSwitch('ai', aiToggle));
  pushToggle.addEventListener('click', () => toggleSwitch('push', pushToggle));

  // 打开工作台（单例模式：已有标签则聚焦，否则新建）
  function openDashboard() {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.query({url: dashboardUrl}, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, {active: true});
        chrome.windows.update(tabs[0].windowId, {focused: true});
      } else {
        chrome.tabs.create({url: dashboardUrl});
      }
      window.close();
    });
  }

  // 加载状态
  async function loadStatus() {
    try {
      const response = await sendMessage({ type: 'GET_STATUS' });
      if (response.success) {
        isRunning = response.data.isRunning;
        const runtimeConfig = response.data.runtimeConfig || {};
        todayCount.textContent = `${response.data.stats?.totalJobs || 0} 条`;
        const pageLabel = Number.isInteger(runtimeConfig.MAX_LIST_PAGES_PER_RUN)
          ? (runtimeConfig.MAX_LIST_PAGES_PER_RUN === 0 ? 'unlimited' : String(runtimeConfig.MAX_LIST_PAGES_PER_RUN))
          : String(response.data.maxListPagesPerRun);
        statusText.textContent = `模式:${runtimeConfig.JOB_FILTER_MODE || response.data.jobFilterMode} | 页数:${pageLabel}`;
        updateUI();
      }
    } catch (error) {
      console.error('Failed to load status:', error);
      const wakeResult = await tryWakeController();
      if (wakeResult.success) {
        try {
          const retry = await sendMessage({ type: 'GET_STATUS' });
          if (retry && retry.success) {
            isRunning = retry.data.isRunning;
            const runtimeConfig = retry.data.runtimeConfig || {};
            todayCount.textContent = `${retry.data.stats?.totalJobs || 0} 条`;
            const pageLabel = Number.isInteger(runtimeConfig.MAX_LIST_PAGES_PER_RUN)
              ? (runtimeConfig.MAX_LIST_PAGES_PER_RUN === 0 ? 'unlimited' : String(runtimeConfig.MAX_LIST_PAGES_PER_RUN))
              : String(retry.data.maxListPagesPerRun);
            statusText.textContent = `模式:${runtimeConfig.JOB_FILTER_MODE || retry.data.jobFilterMode} | 页数:${pageLabel}`;
            updateUI();
            showMessage('已自动唤醒 Controller', 'success');
            return;
          }
        } catch (retryError) {
          console.error('Retry after wake-up failed:', retryError);
        }
      }

      statusText.textContent = '后端未连接';
      statusText.style.color = '#ff4d4f';
      crawlStatus.textContent = '离线';
      crawlStatus.className = 'info-value warning';
      startBtn.disabled = true;
      if (wakeResult.errorType === 'NATIVE_HOST_NOT_INSTALLED') {
        startBtn.textContent = 'Host 未安装';
        const extId = wakeResult.extensionId ? ` ${wakeResult.extensionId}` : ' <extension-id>';
        showMessage(`自动唤醒组件未安装，请运行: bash controller/install_host.sh${extId}`, 'error');
      } else if (wakeResult.errorType === 'CONTROLLER_STARTING') {
        startBtn.textContent = '启动中...';
        startBtn.disabled = true;
        showMessage('Controller 正在启动，请稍后刷新', 'info');
      } else {
        startBtn.textContent = '后端未启动';
        showMessage('后端未启动，且自动唤醒失败', 'error');
      }
    }

    // 检查飞书连接状态
    checkFeishuStatus();
  }

  // 检查飞书连接（实际调API验证token是否有效）
  async function checkFeishuStatus() {
    try {
      const response = await sendMessage({ type: 'CHECK_FEISHU' });
      if (response.success) {
        feishuStatus.textContent = '已连接';
        feishuStatus.className = 'info-value success';
      } else {
        feishuStatus.textContent = '连接失败';
        feishuStatus.className = 'info-value warning';
      }
    } catch (error) {
      feishuStatus.textContent = '连接失败';
      feishuStatus.className = 'info-value warning';
    }
  }

  // 更新UI
  function updateUI() {
    if (isRunning) {
      startBtn.disabled = true;
      startBtn.textContent = '⏳ 采集中...';
      crawlStatus.textContent = '运行中';
      crawlStatus.className = 'info-value warning';
      progressSection.classList.add('is-active');
      statusText.textContent = '正在采集职位...';
    } else {
      startBtn.disabled = false;
      startBtn.textContent = '🚀 立即采集';
      crawlStatus.textContent = '待命';
      crawlStatus.className = 'info-value';
      progressSection.classList.remove('is-active');
      statusText.textContent = '准备就绪';
    }
  }

  // 开始采集
  async function startCrawl() {
    if (isRunning) return;

    try {
      isRunning = true;
      updateUI();
      showMessage('开始采集...', 'success');

      const response = await sendMessage({ type: 'START_CRAWL' });
      
      if (response.success) {
        const data = response.data;
        let msg = `采集完成！共 ${data.total} 条，有描述 ${data.withDescription || 0} 条，写入飞书 ${data.pushed || 0} 条`;
        if (data.filtered > 0) {
          msg += `，过滤 ${data.filtered} 条`;
        }
        if (data.reason === 'all_filtered') {
          msg += '（全部职位被过滤）';
        }
        if (data.antiCrawl) {
          msg += ` [反爬: ${data.status}]`;
        }
        showMessage(msg, 'success');
        todayCount.textContent = `${data.total} 条`;
      } else {
        showMessage(`采集失败: ${response.error}`, 'error');
      }
    } catch (error) {
      showMessage(`错误: ${error.message}`, 'error');
    } finally {
      isRunning = false;
      updateUI();
    }
  }

  // 打开配置页面
  async function openConfig() {
    try {
      const response = await sendMessage({ type: 'GET_RUNTIME_CONFIG' });
      if (!response.success) {
        showMessage('读取运行时配置失败', 'error');
        return;
      }

      const current = response.data || {};
      const jobFilterMode = window.prompt(
        'JOB_FILTER_MODE: ai_focused 或 general_pm',
        current.JOB_FILTER_MODE || 'general_pm'
      );
      if (jobFilterMode === null) return;

      const experience = window.prompt(
        'EXPERIENCE: 例如 102(1-3年), 103(3-5年), 104(5-10年)，留空=不限经验',
        typeof current.EXPERIENCE === 'string' ? current.EXPERIENCE : ''
      );
      if (experience === null) return;

      const maxPages = window.prompt(
        'MAX_LIST_PAGES_PER_RUN: 每轮抓几页列表，0=unlimited',
        String(Number.isInteger(current.MAX_LIST_PAGES_PER_RUN) ? current.MAX_LIST_PAGES_PER_RUN : 0)
      );
      if (maxPages === null) return;

      const maxDetails = window.prompt(
        'MAX_DETAIL_REQUESTS_PER_RUN: 每轮抓几个详情，0=unlimited',
        String(Number.isInteger(current.MAX_DETAIL_REQUESTS_PER_RUN) ? current.MAX_DETAIL_REQUESTS_PER_RUN : 0)
      );
      if (maxDetails === null) return;

      const expHardExclude = window.prompt(
        'EXP_HARD_EXCLUDE_SOURCE: 经验硬排除正则，不含斜杠，留空=关闭',
        typeof current.EXP_HARD_EXCLUDE_SOURCE === 'string' ? current.EXP_HARD_EXCLUDE_SOURCE : ''
      );
      if (expHardExclude === null) return;

      const nextConfig = {
        JOB_FILTER_MODE: jobFilterMode.trim(),
        EXPERIENCE: experience.trim(),
        MAX_LIST_PAGES_PER_RUN: Number(maxPages),
        MAX_DETAIL_REQUESTS_PER_RUN: Number(maxDetails),
        EXP_HARD_EXCLUDE_SOURCE: expHardExclude.trim()
      };

      const updateResponse = await sendMessage({
        type: 'UPDATE_RUNTIME_CONFIG',
        config: nextConfig
      });

      if (!updateResponse.success) {
        showMessage(`保存失败: ${updateResponse.error || 'unknown'}`, 'error');
        return;
      }

      showMessage('运行时配置已更新，后续任务直接按新条件执行', 'success');
      await loadStatus();
    } catch (error) {
      showMessage(`配置更新失败: ${error.message}`, 'error');
    }
  }

  // 刷新Cookie
  async function refreshCookie() {
    try {
      showMessage('正在刷新Cookie...', 'success');
      
      // 打开Boss直聘登录页
      await chrome.tabs.create({
        url: 'https://www.zhipin.com/web/user/?ka=header-login',
        active: true
      });
      
      showMessage('请在打开的页面完成登录', 'success');
    } catch (error) {
      showMessage(`刷新失败: ${error.message}`, 'error');
    }
  }

  // 切换开关
  async function toggleSwitch(type, element) {
    element.classList.toggle('is-active');
    const enabled = element.classList.contains('is-active');
    
    // 保存配置
    const config = await chrome.storage.local.get('config');
    const newConfig = config.config || {};
    
    switch (type) {
      case 'auto':
        newConfig.enabled = enabled;
        break;
      case 'ai':
        newConfig.useAI = enabled;
        break;
      case 'push':
        newConfig.pushEnabled = enabled;
        break;
    }
    
    await chrome.storage.local.set({ config: newConfig });
    
    // 如果修改了自动采集，重新设置alarms
    if (type === 'auto') {
      await sendMessage({
        type: 'UPDATE_CONFIG',
        config: newConfig
      });
    }
  }

  // 显示消息
  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = `message is-visible ${type}`;
    
    setTimeout(() => {
      messageBox.classList.remove('is-visible');
    }, 5000);
  }

  // 发送消息到Background
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  async function tryWakeController() {
    try {
      const response = await sendMessage({
        type: 'WAKE_UP_CONTROLLER',
        reason: 'popup_status_bootstrap'
      });
      if (response && response.success) {
        return { success: true };
      }
      return {
        success: false,
        errorType: response?.errorType || 'CONTROLLER_UNREACHABLE',
        error: response?.error || '',
        extensionId: response?.extensionId || null
      };
    } catch (error) {
      console.error('Wake-up request failed:', error);
      return { success: false, errorType: 'CONTROLLER_UNREACHABLE', error: error.message, extensionId: null };
    }
  }

  // 监听进度更新
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'PROGRESS_UPDATE') {
      const data = request.data;
      if (data.collected) {
        progressText.textContent = `已采集 ${data.collected} 条职位`;
        progressFill.style.width = '50%';
      }
      if (data.analyzed) {
        progressText.textContent = `AI分析中... ${data.analyzed}/${data.total}`;
        progressFill.style.width = '80%';
      }
    }
  });
});
