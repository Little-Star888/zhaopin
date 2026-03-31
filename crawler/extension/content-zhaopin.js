/**
 * Content Script - 在智联招聘(zhaopin.com)页面中运行
 * 混合采集方案：方案 B（DOM 解析）为主，方案 A（MAIN world fetch 拦截）为备
 *
 * 搜索列表页: https://www.zhaopin.com/sou/jl635/kw9QJL9G8/p1
 * 职位详情页: https://www.zhaopin.com/jobdetail/CCL1329026020J40937797602.htm
 */

(function() {
  'use strict';

  console.log('[ZhaopinScraper] Content script loaded');

  // 城市编码映射（智联城市编码）
  const CITY_CODES = {
    '北京': '530',
    '上海': '538',
    '深圳': '765',
    '杭州': '653',
    '广州': '763',
    '成都': '801',
    '南京': '635',
    '武汉': '736',
    '西安': '854',
    '苏州': '636'
  };

  // ============ 方案 A：MAIN world 注入（fetch 拦截） ============

  // 缓存最近一次拦截到的 API 数据
  let _cachedApiData = null;
  // 标记 MAIN world 脚本是否已注入
  let _mainWorldInjected = false;

  /**
   * 注入 MAIN world 脚本，Hook fetch 拦截 fe-api.zhaopin.com 的 API 响应
   * 通过 window.postMessage 将数据传递到 ISOLATED world（本 content script）
   */
  function injectMainWorldScript() {
    if (_mainWorldInjected) return;
    _mainWorldInjected = true;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('zhaopin-main-world.js');
    script.async = false;
    script.onload = function() {
      console.log('[ZhaopinScraper] MAIN world 外部脚本已加载');
      script.remove();
    };
    script.onerror = function() {
      console.warn('[ZhaopinScraper] MAIN world 外部脚本注入失败');
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    console.log('[ZhaopinScraper] MAIN world 注入脚本已执行');
  }

  /**
   * 监听来自 MAIN world 的 postMessage
   */
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'ZHAOPIN_API_DATA') {
      _cachedApiData = event.data.data;
      console.log('[ZhaopinScraper] 收到 MAIN world 拦截的 API 数据',
        _cachedApiData ? 'code=' + (_cachedApiData.code || 'unknown') : 'null');
    }
  });

  /**
   * 将 MAIN world 拦截到的 API 数据转换为标准职位格式
   *
   * 智联搜索 API 响应结构:
   * {
   *   code: 200,
   *   data: {
   *     results: [
   *       {
   *         jobName: '职位名称',
   *         companyName: '公司名称',
   *         salary: '10-15K',
   *         cityName: '北京',
   *         jobExp: '3-5年',
   *         eduLevel: '本科',
   *         jobTags: ['标签1', '标签2'],
   *         jobId: 'CC123456789J',
   *         publishDate: '2024-01-01',
   *         ...
   *       }
   *     ]
   *   }
   * }
   */
  function parseApiData(apiData) {
    if (!apiData || !apiData.data) return [];

    // 兼容多种响应结构
    const results = apiData.data.results ||
                    apiData.data.list ||
                    apiData.data.jobList ||
                    [];

    if (!Array.isArray(results) || results.length === 0) return [];

    return results.map(function(item) {
      // 提取职位链接
      const jobId = item.jobId || item.encryptJobId || item.number || '';
      const url = item.positionURL || item.url || buildJobDetailUrl(jobId);

      return {
        platform: 'zhaopin',
        platformJobId: jobId,
        title: item.jobName || item.positionName || '',
        company: item.companyName || item.brandName || '',
        location: item.cityName || item.city || '',
        salary: item.salary || item.salaryDesc || '',
        experience: item.jobExp || item.experience || '',
        education: item.eduLevel || item.education || '',
        keywords: (item.jobTags || item.tags || item.skillTags || []).join(','),
        description: '',
        url: url,
        publishDate: item.publishDate || item.updateDate || '',
        raw_source: 'api'
      };
    });
  }

  /**
   * 解析页面内嵌的 __INITIAL_STATE__ 数据。
   * 智联 sou 页面会把 positionList 直接序列化到 HTML 中，比 DOM 类名更稳定。
   */
  function parseInlineStateData() {
    var marker = '__INITIAL_STATE__=';
    var state = null;

    for (var i = 0; i < document.scripts.length; i++) {
      var script = document.scripts[i];
      var text = script && script.textContent ? script.textContent : '';
      var index = text.indexOf(marker);
      if (index === -1) continue;

      var jsonText = text.slice(index + marker.length).trim();
      if (jsonText.endsWith(';')) {
        jsonText = jsonText.slice(0, -1);
      }

      try {
        state = JSON.parse(jsonText);
        break;
      } catch (error) {
        console.warn('[ZhaopinScraper] __INITIAL_STATE__ 解析失败:', error.message);
      }
    }

    if (!state || !Array.isArray(state.positionList) || state.positionList.length === 0) {
      return [];
    }

    return state.positionList.map(function(item) {
      var skillTags = Array.isArray(item.jobSkillTags)
        ? item.jobSkillTags.map(function(tag) { return tag && tag.name ? tag.name : ''; })
        : [];
      var fallbackTags = Array.isArray(item.skillLabel)
        ? item.skillLabel.map(function(tag) { return tag && tag.value ? tag.value : ''; })
        : [];
      var showSkillTags = Array.isArray(item.showSkillTags)
        ? item.showSkillTags.map(function(tag) { return tag && tag.tag ? tag.tag : ''; })
        : [];
      var keywordValues = item.jobKeyword && Array.isArray(item.jobKeyword.keywords)
        ? item.jobKeyword.keywords.map(function(tag) { return tag && tag.itemValue ? tag.itemValue : ''; })
        : [];

      var platformJobId = item.number || item.positionNumber || (item.jobId ? String(item.jobId) : '');
      var locationParts = [item.workCity, item.cityDistrict, item.streetName].filter(function(part) {
        return part && String(part).trim().length > 0;
      });
      var description =
        item.jobDetailData?.position?.desc?.description ||
        item.jobSummary ||
        '';

      return {
        platform: 'zhaopin',
        platformJobId: platformJobId,
        title: item.name || item.jobName || item.positionName || '',
        company: item.companyName || item.brandName || '',
        location: locationParts.join('·'),
        salary: item.salary60 || item.salary || item.salaryReal || '',
        experience:
          item.workingExp ||
          item.jobDetailData?.position?.base?.positionWorkingExp ||
          '',
        education:
          item.education ||
          item.jobDetailData?.position?.base?.education ||
          '',
        keywords: skillTags.concat(fallbackTags, showSkillTags, keywordValues).filter(function(tag) {
          return tag && String(tag).trim().length > 0;
        }).join(','),
        description: description,
        url: item.positionURL || item.positionUrl || buildJobDetailUrl(platformJobId),
        publishDate: item.publishTime || item.firstPublishTime || '',
        raw_source: 'inline_state'
      };
    });
  }

  /**
   * 解析当前搜索结果页的分页信息。
   * 优先从 URL 中提取当前页码，再从包含“上一页 / 下一页”的分页容器中提取最大页码。
   */
  function parsePaginationInfo() {
    var currentPage = 1;
    var totalPages = 1;
    var pageMatch = window.location.pathname.match(/\/p(\d+)(?:\/)?$/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10) || 1;
    }

    var candidates = document.querySelectorAll('div, nav, ul, section');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || !el.innerText) continue;
      var text = el.innerText.replace(/\s+/g, ' ').trim();
      if (!text || text.indexOf('上一页') === -1 || text.indexOf('下一页') === -1) continue;

      var numberMatches = text.match(/\b\d+\b/g) || [];
      var pageNumbers = numberMatches
        .map(function(value) { return parseInt(value, 10); })
        .filter(function(value) { return Number.isInteger(value) && value >= 1 && value <= 100; });

      if (pageNumbers.length > 0) {
        totalPages = Math.max.apply(null, pageNumbers);
        break;
      }
    }

    if (totalPages < currentPage) {
      totalPages = currentPage;
    }

    return {
      currentPage: currentPage,
      totalPages: totalPages,
      hasNext: currentPage < totalPages
    };
  }

  // ============ 方案 B：DOM 解析 ============

  /**
   * 从文本中安全获取内容，去除多余空白
   */
  function safeText(el) {
    if (!el) return '';
    return (el.textContent || '').trim().replace(/\s+/g, ' ');
  }

  /**
   * 从元素集合中提取标签文本，逗号拼接
   */
  function extractTags(container) {
    if (!container) return '';
    const tags = container.querySelectorAll('span, a, li');
    return Array.from(tags)
      .map(function(t) { return t.textContent.trim(); })
      .filter(function(t) { return t.length > 0 && t.length < 20; })
      .join(',');
  }

  /**
   * 从职位链接中提取 jobId
   * URL 格式:
   *   https://www.zhaopin.com/jobdetail/CC382130480J40917024702.htm
   *   https://www.zhaopin.com/jobdetail/CCL1329026020J40937797602.htm
   */
  function extractJobId(url) {
    if (!url) return '';
    const match = url.match(/\/jobdetail\/([A-Z]+\d+J\d+)(?:\.htm)?/i) ||
      url.match(/\/([A-Z]+\d+J\d+)(?:\.htm)?/i);
    return match ? match[1] : '';
  }

  function buildJobDetailUrl(jobId) {
    if (!jobId) return '';
    return `https://www.zhaopin.com/jobdetail/${jobId}.htm`;
  }

  /**
   * 解析 demand 字段（地点|经验|学历 组合文本）
   * 格式示例: "北京 | 3-5年 | 本科" 或 "上海3-5年本科"
   */
  function parseDemand(demandText) {
    const result = { location: '', experience: '', education: '' };
    if (!demandText) return result;

    const text = demandText.trim().replace(/\s+/g, ' ');

    // 尝试按分隔符拆分（竖线、空格）
    const parts = text.split(/\s*[|·\-\s]\s*/).filter(function(p) { return p.length > 0; });

    if (parts.length >= 3) {
      result.location = parts[0];
      result.experience = parts[1];
      result.education = parts[2];
    } else if (parts.length === 2) {
      // 两个部分：地点 + 经验/学历
      result.location = parts[0];
      // 判断第二个是经验还是学历
      if (/年/.test(parts[1])) {
        result.experience = parts[1];
      } else {
        result.education = parts[1];
      }
    } else if (parts.length === 1) {
      // 只有一个部分，尝试提取信息
      const single = parts[0];
      if (/年/.test(single)) {
        result.experience = single;
      } else if (/本科|硕士|博士|大专|中专|高中|不限/.test(single)) {
        result.education = single;
      } else {
        result.location = single;
      }
    }

    return result;
  }

  /**
   * 解析搜索列表页 DOM
   * 页面 URL: https://www.zhaopin.com/sou/jl635/kw9QJL9G8/p1
   */
  function parseJobList() {
    const jobs = [];

    // 获取职位卡片容器（多种选择器兼容）
    const jobCards = document.querySelectorAll(
      '.positionlist .joblist-box__item, ' +
      '.joblist-box .joblist-box__item, ' +
      '.sou-job-item, ' +
      '.jobcard, ' +
      '[class*="joblist"] [class*="item"]'
    );

    if (jobCards.length === 0) {
      console.warn('[ZhaopinScraper] 未找到职位卡片');
      return jobs;
    }

    jobCards.forEach(function(card) {
      const job = parseJobCard(card);
      if (job) jobs.push(job);
    });

    console.log('[ZhaopinScraper] DOM 解析到 ' + jobs.length + ' 个职位');
    return jobs;
  }

  /**
   * 检测当前页面是否处于登录、风控、空结果或未就绪状态。
   * 这里不尝试绕过校验，只做显式识别，便于切换到人工辅助流程。
   */
  function detectPageState() {
    var bodyText = safeText(document.body).slice(0, 2000);
    var title = document.title || '';

    // 登录态丢失
    if (/登录|登录后|扫码登录|手机号登录|账号登录/.test(bodyText) ||
        /登录/.test(title) ||
        document.querySelector('input[type="password"], .login, [class*="login"]')) {
      return {
        code: 'LOGIN_REQUIRED',
        error: '当前页面处于登录态页面，需先在可见页面完成登录后再采集'
      };
    }

    // 风控/验证页
    if (/验证码|安全验证|访问异常|操作频繁|请稍后再试|滑块|人机验证|校验/.test(bodyText) ||
        /验证|异常/.test(title) ||
        document.querySelector('iframe[src*="captcha"], [class*="captcha"], [id*="captcha"]')) {
      return {
        code: 'ANTI_BOT',
        error: '当前页面触发智联风控或验证码，需切到人工辅助模式在前台完成验证'
      };
    }

    // 显式空结果
    if (/暂无职位|暂无搜索结果|没有找到相关职位|换个关键词/.test(bodyText)) {
      return {
        code: 'NO_RESULTS',
        error: '当前搜索页已加载完成，但没有匹配职位'
      };
    }

    // 页面骨架还没出结果
    if (document.readyState !== 'complete') {
      return {
        code: 'NOT_READY',
        error: '页面尚未完成加载'
      };
    }

    return null;
  }

  /**
   * 解析单个职位卡片
   */
  function parseJobCard(card) {
    // 职位名称（多种选择器兼容）
    const titleEl = card.querySelector('.jobinfo__top .jobname') ||
                    card.querySelector('.iteminfo__line1__jobname') ||
                    card.querySelector('.jobname') ||
                    card.querySelector('[class*="jobname"]') ||
                    card.querySelector('[class*="job-name"]');
    const title = safeText(titleEl);

    // 职位链接
    const linkEl = card.querySelector('.jobinfo__top a') ||
                   card.querySelector('.iteminfo__line1__jobname a') ||
                   card.querySelector('.jobname a') ||
                   card.querySelector('a[href*="/jobdetail/"]');
    const url = linkEl ? (linkEl.href || '') : '';
    const platformJobId = extractJobId(url);

    if (!title) return null;

    // 公司名称
    const companyEl = card.querySelector('.company__name') ||
                      card.querySelector('.iteminfo__line1__compname') ||
                      card.querySelector('.company_name') ||
                      card.querySelector('[class*="company"] [class*="name"]');
    const company = safeText(companyEl);

    // 薪资
    const salaryEl = card.querySelector('.iteminfo__line2__jobdesc__salary') ||
                     card.querySelector('.jobcard-salary') ||
                     card.querySelector('[class*="salary"]');
    const salary = safeText(salaryEl);

    // demand 字段（地点|经验|学历组合）
    const demandEl = card.querySelector('.iteminfo__line2__jobdesc__demand') ||
                     card.querySelector('.jobcard-demand') ||
                     card.querySelector('[class*="demand"]');
    const demand = parseDemand(safeText(demandEl));

    // 福利标签
    const welfareEl = card.querySelector('.iteminfo__line2__jobdesc__welfare') ||
                      card.querySelector('.jobcard-welfare') ||
                      card.querySelector('[class*="welfare"]');
    const keywords = extractTags(welfareEl);

    // 发布时间
    const timeEl = card.querySelector('.joblist-box__item__time') ||
                   card.querySelector('[class*="time"]') ||
                   card.querySelector('[class*="date"]');

    return {
      platform: 'zhaopin',
      platformJobId: platformJobId,
      title: title,
      company: company,
      location: demand.location,
      salary: salary,
      experience: demand.experience,
      education: demand.education,
      keywords: keywords,
      description: '',  // 列表页无详情，需单独获取
      url: url,
      publishDate: safeText(timeEl),
      raw_source: 'dom'
    };
  }

  /**
   * 解析职位详情页 DOM
   * 页面 URL: https://www.zhaopin.com/jobdetail/CC382130480J40917024702.htm
   */
  function parseJobDetail() {
    const job = {};

    // 职位名称
    const titleEl = document.querySelector('.summary__top__name') ||
                    document.querySelector('.job-title') ||
                    document.querySelector('.position-name') ||
                    document.querySelector('[class*="summary"] [class*="name"]');
    job.title = safeText(titleEl);

    // 薪资
    const salaryEl = document.querySelector('.summary__top__salary') ||
                     document.querySelector('.job-salary') ||
                     document.querySelector('[class*="salary"]');
    job.salary = safeText(salaryEl);

    // 地点、经验、学历 - 通常在 .summary__info 中
    const infoEl = document.querySelector('.summary__info') ||
                   document.querySelector('.job-info') ||
                   document.querySelector('[class*="summary"] [class*="info"]');
    if (infoEl) {
      const infoText = safeText(infoEl);
      const infoParts = parseDemand(infoText);
      job.location = infoParts.location;
      job.experience = infoParts.experience;
      job.education = infoParts.education;
    }

    // 公司名称
    const companyEl = document.querySelector('.company__name') ||
                      document.querySelector('.job-company') ||
                      document.querySelector('[class*="company"] [class*="name"]');
    job.company = safeText(companyEl);

    // 职位描述
    const descEl = document.querySelector('.describtion__detail-content') ||
                   document.querySelector('.job-description') ||
                   document.querySelector('.describtion__detail') ||
                   document.querySelector('[class*="describtion"] [class*="content"]') ||
                   document.querySelector('[class*="description"]');
    job.description = safeText(descEl);

    // 从 URL 提取 jobId
    job.platformJobId = extractJobId(window.location.href);
    job.url = window.location.href;
    job.platform = 'zhaopin';

    console.log('[ZhaopinScraper] 解析详情: ' + job.title + ' @ ' + job.company);
    return job;
  }

  // ============ 归一化函数 ============

  /**
   * 薪资归一化 - 将智联薪资格式转为统一格式（大写K，范围分隔符 `-`）
   *
   * 转换规则：
   *   "10-15K"       → "10K-15K"（已是标准格式）
   *   "10K-15K/月"   → "10K-15K"
   *   "10000-15000"   → "10K-15K"
   *   "10K-15K/天"    → "10K-15K/天"（保留非月单位）
   *   "1万-1.5万"     → "10K-15K"
   *   "面议"           → "面议"
   *
   * @param {string} raw - 原始薪资文本
   * @returns {string|null} 归一化后的薪资
   */
  function normalizeSalary(raw) {
    if (!raw) return null;
    const text = raw.trim().replace(/\s+/g, '');

    // 面议直接返回
    if (text === '面议' || text === '薪酬面议') return '面议';

    try {
      // 已是标准 K 格式: "10K-15K", "10-15K"
      const kRangeMatch = text.match(/^([\d.]+)\s*[-~至到]\s*([\d.]+)\s*K/);
      if (kRangeMatch) {
        const low = Math.round(parseFloat(kRangeMatch[1]));
        const high = Math.round(parseFloat(kRangeMatch[2]));
        return low + 'K-' + high + 'K';
      }

      // 单个 K 值: "10K/月"
      const singleKMatch = text.match(/^([\d.]+)\s*K/);
      if (singleKMatch) {
        const val = Math.round(parseFloat(singleKMatch[1]));
        return val + 'K';
      }

      // 万范围: "1万-1.5万"
      const wanMatch = text.match(/^([\d.]+)\s*[-~至到]\s*([\d.]+)\s*万/);
      if (wanMatch) {
        const low = Math.round(parseFloat(wanMatch[1]) * 10);
        const high = Math.round(parseFloat(wanMatch[2]) * 10);
        return low + 'K-' + high + 'K';
      }

      // 单个万值: "1万/月"
      const singleWanMatch = text.match(/^([\d.]+)\s*万/);
      if (singleWanMatch) {
        const val = Math.round(parseFloat(singleWanMatch[1]) * 10);
        return val + 'K';
      }

      // 纯数字范围: "10000-15000" → "10K-15K"
      const numRangeMatch = text.match(/^([\d.]+)\s*[-~至到]\s*([\d.]+)$/);
      if (numRangeMatch) {
        const low = parseFloat(numRangeMatch[1]);
        const high = parseFloat(numRangeMatch[2]);
        // 大于 1000 视为元单位，转为 K
        if (low >= 1000) {
          return Math.round(low / 1000) + 'K-' + Math.round(high / 1000) + 'K';
        }
        return Math.round(low) + 'K-' + Math.round(high) + 'K';
      }

      // 单个纯数字: "10000" → "10K"
      const singleNumMatch = text.match(/^([\d.]+)$/);
      if (singleNumMatch) {
        const val = parseFloat(singleNumMatch[1]);
        if (val >= 1000) {
          return Math.round(val / 1000) + 'K';
        }
      }

    } catch (e) {
      console.warn('[ZhaopinScraper] 薪资归一化异常，保留原始值:', raw, e);
    }

    // 格式转换失败，保留原始值
    return text;
  }

  /**
   * 经验归一化 - 将中文经验描述转为统一格式
   *
   * 转换规则：
   *   "3-5年"         → "3-5年"
   *   "1-3年"         → "1-3年"
   *   "经验不限"       → "不限"
   *   "应届生"         → "应届生"
   *   "10年以上"       → "10年以上"
   *   "一年以上"       → "1年以上"
   *
   * @param {string} raw - 原始经验文本
   * @returns {string|null} 归一化后的经验描述
   */
  function normalizeExperience(raw) {
    if (!raw) return null;
    const text = raw.trim().replace(/\s+/g, '');

    // 已是标准数字格式
    if (/^\d+[-~至到]\d+年$/.test(text)) return text;
    if (/^\d+年以上$/.test(text)) return text;
    if (/^\d+年以下$/.test(text)) return text;
    if (/^\d+年$/.test(text)) return text;

    // 中文数字映射
    var cnNumMap = {
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
      '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
      '两': '2'
    };

    // "一年以上" → "1年以上"
    var cnAbove = text.match(/^([一二三四五六七八九十两]+)年以上$/);
    if (cnAbove) {
      var num = cnNumMap[cnAbove[1]];
      if (num) return num + '年以上';
    }

    // "一年以下" → "1年以下"
    var cnBelow = text.match(/^([一二三四五六七八九十两]+)年以下$/);
    if (cnBelow) {
      var num2 = cnNumMap[cnBelow[1]];
      if (num2) return num2 + '年以下';
    }

    // "一年" → "1年"
    var cnExact = text.match(/^([一二三四五六七八九十两]+)年$/);
    if (cnExact) {
      var num3 = cnNumMap[cnExact[1]];
      if (num3) return num3 + '年';
    }

    // 无经验 / 不限
    if (/^无经验要求$/.test(text) || /^经验不限$/.test(text) || /^不限$/.test(text) || /^无需经验$/.test(text)) {
      return '不限';
    }

    // 应届
    if (/^应届毕业生?$/.test(text) || /^在校生$/.test(text)) {
      return '应届生';
    }

    return text;
  }

  /**
   * 学历归一化 - 基本保持原值，处理空值
   *
   * @param {string} raw - 原始学历文本
   * @returns {string|null} 归一化后的学历描述
   */
  function normalizeEducation(raw) {
    if (!raw) return null;
    var text = raw.trim().replace(/\s+/g, '');

    // 空值或无意义值
    if (!text || text === '--' || text === '-') return null;

    // 别名映射
    var eduMap = {
      '不限': '不限',
      '学历不限': '不限',
      '大专及以上': '大专',
      '本科及以上': '本科',
      '硕士及以上': '硕士',
      '博士及以上': '博士'
    };

    if (eduMap[text]) return eduMap[text];

    return text;
  }

  /**
   * 关键词归一化 - 确保输出为逗号分隔的字符串
   *
   * @param {string|Array} raw - 原始关键词
   * @returns {string} 逗号分隔的关键词字符串
   */
  function normalizeKeywords(raw) {
    if (!raw) return '';
    if (Array.isArray(raw)) {
      return raw.map(function(k) { return String(k).trim(); })
        .filter(function(k) { return k.length > 0; })
        .join(',');
    }

    var text = String(raw).trim();
    if (!text) return '';

    // 已是逗号分隔
    if (text.indexOf(',') !== -1) {
      return text.split(',').map(function(k) { return k.trim(); })
        .filter(function(k) { return k.length > 0; })
        .join(',');
    }

    // 空格/斜杠/顿号分隔 → 转为逗号
    if (/[\s/、|]+/.test(text)) {
      return text.split(/[\s/、|]+/).map(function(k) { return k.trim(); })
        .filter(function(k) { return k.length > 0; })
        .join(',');
    }

    return text;
  }

  /**
   * 对单条职位数据进行归一化处理
   * 纯函数，不修改原始数据对象
   *
   * @param {Object} rawJob - 原始职位数据
   * @returns {Object|null} 归一化后的职位数据；必填字段缺失时返回 null
   */
  function normalizeJob(rawJob) {
    // 必填字段校验：title 或 company 缺失则跳过
    if (!rawJob.title || !rawJob.company) {
      console.warn('[ZhaopinScraper] 必填字段缺失，跳过:', {
        title: rawJob.title,
        company: rawJob.company
      });
      return null;
    }

    // 保留原始数据快照
    var rawPayload = JSON.parse(JSON.stringify(rawJob));

    return {
      platform: rawJob.platform || 'zhaopin',
      platformJobId: rawJob.platformJobId || '',
      title: rawJob.title,
      company: rawJob.company,
      location: rawJob.location || '',
      salary: normalizeSalary(rawJob.salary),
      experience: normalizeExperience(rawJob.experience),
      education: normalizeEducation(rawJob.education),
      keywords: normalizeKeywords(rawJob.keywords),
      description: rawJob.description || '',
      url: rawJob.url || '',
      raw_payload: rawPayload
    };
  }

  // ============ 消息通信 ============

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('[ZhaopinScraper] 收到消息:', request.type);

    switch (request.type) {
      case 'SCRAPE_JOBS':
        handleScrapeJobs(request, sendResponse);
        break;

      case 'GET_JOB_DETAIL':
        handleGetJobDetail(request, sendResponse);
        break;

      case 'CHECK_STATUS':
        handleCheckStatus(sendResponse);
        break;

      default:
        sendResponse({ success: false, error: '未知消息类型' });
    }

    return true; // 保持异步通道
  });

  /**
   * 处理职位列表采集请求
   * 优先使用方案 A（API 拦截数据），降级到方案 B（DOM 解析）
   */
  function handleScrapeJobs(request, sendResponse) {
    try {
      var pagination = parsePaginationInfo();

      // 方案 A：检查是否有拦截到的 API 数据
      if (_cachedApiData && _cachedApiData.data) {
        var apiJobs = parseApiData(_cachedApiData);

        if (apiJobs.length > 0) {
          // 归一化处理
          var normalizedApiJobs = apiJobs
            .map(function(job) { return normalizeJob(job); })
            .filter(function(job) { return job !== null; });

          if (normalizedApiJobs.length > 0) {
            console.log('[ZhaopinScraper] 方案 A 成功: API 拦截 ' + normalizedApiJobs.length + ' 条');
            // 清空缓存，避免重复使用旧数据
            _cachedApiData = null;
            sendResponse({
              success: true,
              data: normalizedApiJobs,
              totalCount: normalizedApiJobs.length,
              hasMore: pagination.hasNext,
              pagination: pagination,
              source: 'api'
            });
            return;
          }
        }
      }

      // 方案 B：DOM 解析降级
      console.log('[ZhaopinScraper] 方案 A 无数据，尝试解析页面内嵌状态');

      var inlineStateJobs = parseInlineStateData();
      if (inlineStateJobs.length > 0) {
        var normalizedInlineJobs = inlineStateJobs
          .map(function(job) { return normalizeJob(job); })
          .filter(function(job) { return job !== null; });

        if (normalizedInlineJobs.length > 0) {
          console.log('[ZhaopinScraper] 方案 B 成功: __INITIAL_STATE__ 解析 ' + normalizedInlineJobs.length + ' 条');
          sendResponse({
            success: true,
            data: normalizedInlineJobs,
            totalCount: normalizedInlineJobs.length,
            hasMore: pagination.hasNext,
            pagination: pagination,
            source: 'inline_state'
          });
          return;
        }
      }

      console.log('[ZhaopinScraper] 页面内嵌状态无数据，降级到方案 C（DOM 解析）');
      var domJobs = parseJobList();

      if (domJobs.length === 0) {
        var pageState = detectPageState();
        sendResponse({
          success: false,
          error: pageState ? pageState.error : '页面中未找到职位数据，可能页面尚未加载完成或页面结构已变更',
          code: pageState ? pageState.code : 'NO_DATA'
        });
        return;
      }

      // 归一化处理，过滤掉必填字段缺失的数据
      var normalizedJobs = domJobs
        .map(function(job) { return normalizeJob(job); })
        .filter(function(job) { return job !== null; });

      if (normalizedJobs.length === 0) {
        sendResponse({
          success: false,
          error: '所有职位数据缺少必填字段（title/company），已全部过滤',
          code: 'NO_VALID_DATA'
        });
        return;
      }

      console.log('[ZhaopinScraper] 方案 C 成功: DOM 解析 ' + normalizedJobs.length + ' 条');

      sendResponse({
        success: true,
        data: normalizedJobs,
        totalCount: normalizedJobs.length,
        hasMore: pagination.hasNext,
        pagination: pagination,
        source: 'dom'
      });

    } catch (error) {
      console.error('[ZhaopinScraper] 列表采集异常:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 处理职位详情采集请求
   * 解析当前详情页 DOM，返回 detail_status 信息供服务端写入状态机
   */
  function handleGetJobDetail(request, sendResponse) {
    try {
      // 先检测页面状态（风控、登录等）
      var pageState = detectPageState();
      if (pageState && pageState.code === 'ANTI_BOT') {
        sendResponse({
          success: false,
          error: pageState.error,
          code: 'ANTI_BOT',
          detailStatus: 'anti_bot',
          detailErrorCode: 'anti_bot_detected'
        });
        return;
      }
      if (pageState && pageState.code === 'LOGIN_REQUIRED') {
        sendResponse({
          success: false,
          error: pageState.error,
          code: 'LOGIN_REQUIRED',
          detailStatus: 'anti_bot',
          detailErrorCode: 'login_required'
        });
        return;
      }

      var rawJob = parseJobDetail();

      if (!rawJob.title) {
        sendResponse({
          success: false,
          error: '页面中未找到职位详情，可能页面尚未加载完成',
          code: 'NO_DATA',
          detailStatus: 'empty',
          detailErrorCode: 'no_title_found'
        });
        return;
      }

      // 归一化处理
      var job = normalizeJob(rawJob);

      if (!job) {
        sendResponse({
          success: false,
          error: '职位详情缺少必填字段（title/company）',
          code: 'NO_VALID_DATA',
          detailStatus: 'empty',
          detailErrorCode: 'missing_required_fields'
        });
        return;
      }

      // 正文为空时标记 detailStatus = 'empty'
      if (!job.description || job.description.trim().length === 0) {
        sendResponse({
          success: true,
          data: job,
          detailStatus: 'empty',
          detailErrorCode: 'empty_description'
        });
        return;
      }

      sendResponse({
        success: true,
        data: job,
        detailStatus: 'success'
      });

    } catch (error) {
      console.error('[ZhaopinScraper] 详情采集异常:', error);
      sendResponse({
        success: false,
        error: error.message,
        code: 'PARSE_ERROR',
        detailStatus: 'error',
        detailErrorCode: 'exception'
      });
    }
  }

  /**
   * 检查 content script 状态
   */
  function handleCheckStatus(sendResponse) {
    sendResponse({
      success: true,
      platform: 'zhaopin',
      ready: true,
      url: window.location.href,
      mainWorldInjected: _mainWorldInjected,
      hasApiData: !!_cachedApiData,
      isSearchPage: window.location.pathname.indexOf('/sou') !== -1,
      isDetailPage: window.location.pathname.indexOf('/jobdetail/') !== -1
    });
  }

  // ============ 初始化 ============

  // 页面加载后立即注入 MAIN world 脚本（尽早 Hook fetch）
  injectMainWorldScript();

  console.log('[ZhaopinScraper] 初始化完成，MAIN world 脚本已注入');

})();
