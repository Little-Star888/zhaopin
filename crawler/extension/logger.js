/**
 * 增强日志系统 - 自动保存到本地文件
 * 使用: 在content.js或background.js中引入
 */

class FileLogger {
  constructor(moduleName, options = {}) {
    this.moduleName = moduleName;
    this.options = {
      maxLogs: 1000,           // 最大日志条数
      saveInterval: 5000,      // 自动保存间隔(ms)
      logToConsole: true,      // 是否同时输出到控制台
      logToStorage: true,      // 是否保存到storage
      ...options
    };
    
    this.logs = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    // 启动自动保存
    if (this.options.logToStorage) {
      this.startAutoSave();
    }
    
    this.info('Logger initialized', { sessionId: this.sessionId });
  }
  
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 记录日志
   */
  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.moduleName,
      message,
      data,
      sessionId: this.sessionId,
      elapsed: Date.now() - this.startTime
    };
    
    this.logs.push(entry);
    
    // 限制日志数量
    if (this.logs.length > this.options.maxLogs) {
      this.logs = this.logs.slice(-this.options.maxLogs);
    }
    
    // 输出到控制台
    if (this.options.logToConsole) {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${this.moduleName}] ${message}`, data);
    }
    
    return entry;
  }
  
  info(message, data) {
    return this.log('info', message, data);
  }
  
  warn(message, data) {
    return this.log('warn', message, data);
  }
  
  error(message, data) {
    return this.log('error', message, data);
  }
  
  debug(message, data) {
    return this.log('debug', message, data);
  }
  
  /**
   * 记录API调用
   */
  logApiCall(apiName, params, response, duration) {
    return this.info(`API Call: ${apiName}`, {
      type: 'api_call',
      api: apiName,
      params,
      response: {
        success: response.success,
        code: response.code,
        error: response.error,
        dataSize: response.data ? JSON.stringify(response.data).length : 0
      },
      duration,
      timestamp: Date.now()
    });
  }
  
  /**
   * 记录反爬事件
   */
  logAntiCrawl(event, data = {}) {
    return this.warn(`Anti-crawl: ${event}`, {
      type: 'anti_crawl',
      event,
      ...data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 记录性能指标
   */
  logPerformance(metric, value, details = {}) {
    return this.info(`Performance: ${metric}`, {
      type: 'performance',
      metric,
      value,
      ...details,
      timestamp: Date.now()
    });
  }
  
  /**
   * 启动自动保存
   */
  startAutoSave() {
    setInterval(() => {
      this.saveToStorage();
    }, this.options.saveInterval);
  }
  
  /**
   * 保存到Chrome Storage
   */
  async saveToStorage() {
    try {
      const key = `logs_${this.moduleName}_${this.sessionId}`;
      await chrome.storage.local.set({
        [key]: {
          logs: this.logs,
          meta: {
            module: this.moduleName,
            sessionId: this.sessionId,
            startTime: this.startTime,
            lastSave: Date.now(),
            logCount: this.logs.length
          }
        }
      });
    } catch (error) {
      console.error('[FileLogger] Save failed:', error);
    }
  }
  
  /**
   * 导出日志为文件
   */
  exportToFile() {
    const logText = this.logs.map(entry => {
      return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message} ${JSON.stringify(entry.data)}`;
    }).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const filename = `logs_${this.moduleName}_${this.sessionId}.txt`;
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    this.info('Logs exported', { filename, count: this.logs.length });
    return filename;
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      apiCalls: 0,
      antiCrawlEvents: 0,
      errors: 0
    };
    
    this.logs.forEach(log => {
      // 按级别统计
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // 特殊类型统计
      if (log.data?.type === 'api_call') stats.apiCalls++;
      if (log.data?.type === 'anti_crawl') stats.antiCrawlEvents++;
      if (log.level === 'error') stats.errors++;
    });
    
    return stats;
  }
  
  /**
   * 获取最近日志
   */
  getRecent(count = 50) {
    return this.logs.slice(-count);
  }
  
  /**
   * 清除日志
   */
  clear() {
    this.logs = [];
    this.info('Logs cleared');
  }
}

// 创建全局日志实例
const contentLogger = new FileLogger('ContentScript', {
  maxLogs: 500,
  saveInterval: 3000,
  logToConsole: true,
  logToStorage: true
});

// 导出供其他模块使用
if (typeof module !== 'undefined') {
  module.exports = { FileLogger, contentLogger };
}
