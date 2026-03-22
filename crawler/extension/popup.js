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
  startBtn.addEventListener('click', startCrawl);
  configBtn.addEventListener('click', openConfig);
  cookieBtn.addEventListener('click', refreshCookie);
  
  autoToggle.addEventListener('click', () => toggleSwitch('auto', autoToggle));
  aiToggle.addEventListener('click', () => toggleSwitch('ai', aiToggle));
  pushToggle.addEventListener('click', () => toggleSwitch('push', pushToggle));

  // 加载状态
  async function loadStatus() {
    try {
      const response = await sendMessage({ type: 'GET_STATUS' });
      if (response.success) {
        isRunning = response.data.isRunning;
        const runtimeConfig = response.data.runtimeConfig || {};
        todayCount.textContent = `${response.data.stats?.totalJobs || 0} 条`;
        statusText.textContent = `模式:${runtimeConfig.JOB_FILTER_MODE || response.data.jobFilterMode} | 页数:${runtimeConfig.MAX_LIST_PAGES_PER_RUN || response.data.maxListPagesPerRun}`;
        updateUI();
      }
    } catch (error) {
      console.error('Failed to load status:', error);
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
      progressSection.classList.add('active');
      statusText.textContent = '正在采集职位...';
    } else {
      startBtn.disabled = false;
      startBtn.textContent = '🚀 立即采集';
      crawlStatus.textContent = '待命';
      crawlStatus.className = 'info-value';
      progressSection.classList.remove('active');
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
        'EXPERIENCE: 例如 102(1-3年), 103(3-5年), 104(5-10年)',
        current.EXPERIENCE || '102'
      );
      if (experience === null) return;

      const maxPages = window.prompt(
        'MAX_LIST_PAGES_PER_RUN: 每轮抓几页列表',
        String(current.MAX_LIST_PAGES_PER_RUN || 3)
      );
      if (maxPages === null) return;

      const maxDetails = window.prompt(
        'MAX_DETAIL_REQUESTS_PER_RUN: 每轮抓几个详情',
        String(current.MAX_DETAIL_REQUESTS_PER_RUN || 3)
      );
      if (maxDetails === null) return;

      const expHardExclude = window.prompt(
        'EXP_HARD_EXCLUDE_SOURCE: 经验硬排除正则，不含斜杠',
        current.EXP_HARD_EXCLUDE_SOURCE || '10年以上'
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
    element.classList.toggle('active');
    const enabled = element.classList.contains('active');
    
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
    messageBox.className = `message show ${type}`;
    
    setTimeout(() => {
      messageBox.classList.remove('show');
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
