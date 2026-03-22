/**
 * Content Script - 在Boss直聘页面中运行
 */

// 日志开关（调试时设为true，生产环境设为false）
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[BossScraper]', ...args);
}

console.log('[BossScraper] Content script loaded');

// 监听来自Background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received:', request.type);

  (async () => {
    try {
      switch (request.type) {
        case 'CHECK_STATUS':
          sendResponse({ success: true, ready: true });
          break;

        case 'SCRAPE_JOBS':
          const result = await scrapeJobs(
            request.keyword,
            request.cityCode,
            request.pageSize,
            request.experience,
            request.page
          );
          sendResponse(result);
          break;
          
        case 'GET_JOB_DETAIL':
          const detail = await getJobDetail(request.securityId, request.lid);
          sendResponse(detail);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown type' });
      }
    } catch (error) {
      console.error('[BossScraper] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});

// 搜索职位
async function scrapeJobs(keyword, cityCode, pageSize = 30, experience = '102', page = 1) {
  const timestamp = Date.now();
  
  const params = new URLSearchParams({
    scene: '1',
    query: keyword,
    city: cityCode,
    page: String(page),
    pageSize: pageSize.toString(),
    experience: experience,  // 从参数传入，默认1-3年
    _: timestamp.toString()
  });

  const url = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json?${params.toString()}`;
  log('Fetching:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.zhipin.com/web/geek/job'
      },
      credentials: 'include'
    });

    const data = await response.json();
    log('Response code:', data.code);

    if (data.code !== 0) {
      // 详细错误信息，包含错误码便于反爬检测
      const errorMsg = data.message || 'Unknown';
      console.error(`[BossScraper] API error: code=${data.code}, message=${errorMsg}`);
      
      return {
        success: false,
        error: `API error: ${errorMsg} (code: ${data.code})`,
        code: data.code
      };
    }

    const jobList = data.zpData?.jobList || [];
    log(`Found ${jobList.length} jobs`);

    const jobs = jobList.map(job => ({
      encryptJobId: job.encryptJobId,
      jobName: job.jobName,
      salaryDesc: job.salaryDesc,
      locationName: job.locationName || job.cityName || '',
      areaDistrict: job.areaDistrict || '',
      jobExperience: job.jobExperience,
      jobDegree: job.jobDegree,
      brandName: job.brandName,
      bossName: job.bossName,
      bossTitle: job.bossTitle || '',
      skills: job.skills || [],
      brandIndustry: job.brandIndustry || '',
      brandStageName: job.brandStageName || '',
      brandScaleName: job.brandScaleName || '',
      securityId: job.securityId || '',  // 用于获取详情
      lid: job.lid || ''  // 用于获取详情
    }));

    return {
      success: true,
      data: jobs,
      total: jobs.length,
      page
    };

  } catch (error) {
    console.error('[BossScraper] Fetch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取职位详情（双端点降级方案 - GitHub最佳实践）
// 优先使用 job/card.json（反爬容忍度高），失败时降级到 job/detail.json
async function getJobDetail(securityId, lid) {
  if (!securityId) {
    return { success: false, error: 'No securityId' };
  }
  
  // 端点配置（按优先级排序）
  const endpoints = [
    {
      name: 'card',
      url: `https://www.zhipin.com/wapi/zpgeek/job/card.json?${new URLSearchParams({ 
        securityId, 
        lid: lid || '' 
      })}`,
      extractPath: (data) => data.zpData?.jobCard,
      description: '推荐端点，反爬容忍度高'
    },
    {
      name: 'detail',
      url: `https://www.zhipin.com/wapi/zpgeek/job/detail.json?${new URLSearchParams({ 
        securityId, 
        lid: lid || '' 
      })}`,
      extractPath: (data) => data.zpData?.jobInfo,
      description: '备用端点，card失败时降级'
    }
  ];
  
  // 依次尝试每个端点
  let lastError = null;
  for (const endpoint of endpoints) {
    log(`Trying ${endpoint.name}: ${endpoint.description}`);

    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.zhipin.com/web/geek/job'
        },
        credentials: 'include'
      });

      const data = await response.json();
      log(`${endpoint.name} response code:`, data.code);

      if (data.code !== 0) {
        const errorMsg = data.message || 'Unknown';
        lastError = { source: endpoint.name, code: data.code, message: errorMsg };
        console.warn(`[BossScraper] ${endpoint.name} API error: code=${data.code}, message=${errorMsg}`);
        continue;
      }

      const rawData = endpoint.extractPath(data);
      if (!rawData) {
        lastError = { source: endpoint.name, code: -2, message: 'No data in expected path' };
        console.warn(`[BossScraper] ${endpoint.name}: No data in expected path`);
        continue;
      }
      
      // 调试日志（验证字段结构）
      log(`${endpoint.name} keys:`, Object.keys(rawData));
      
      // 标准化字段提取（兼容card和detail的差异）
      const description = rawData.postDescription || rawData.jobDescription || '';

      // 关键修复：card成功但描述为空时，不能直接返回成功，要继续尝试detail
      if (!description) {
        lastError = { source: endpoint.name, code: -3, message: 'API成功但描述为空' };
        console.warn(`[BossScraper] ${endpoint.name}: API成功但描述为空，尝试下一个端点`);
        continue;
      }

      const skills = rawData.skills || rawData.showSkills || rawData.skillList || [];
      const welfareList = rawData.welfareList || rawData.welfare || [];
      const address = rawData.address || rawData.location || '';
      const experience = rawData.experienceName || rawData.jobExperience || '';
      const degree = rawData.degreeName || rawData.jobDegree || '';

      // HR信息（只有detail.json有，card.json没有）
      const bossInfo = data.zpData?.bossInfo || {};
      const bossName = bossInfo.name || '';
      const bossTitle = bossInfo.title || '';

      console.log(`[BossScraper] ${endpoint.name} success, desc: ${description.length} chars`);
      log(`Description preview: ${description.substring(0, 100)}...`);

      return {
        success: true,
        data: {
          description: description,
          hardRequirements: (rawData.jobLabels || []).join(' | '),
          skills: skills,
          address: address,
          welfareList: welfareList,
          bossName: bossName,
          bossTitle: bossTitle,
          experience: experience,
          degree: degree,
          _source: endpoint.name  // 记录数据来源，用于监控
        }
      };

    } catch (error) {
      console.warn(`[BossScraper] ${endpoint.name} fetch error:`, error.message);
      // 继续尝试下一个端点
    }
  }
  
  // 所有端点都失败，返回最后一次的具体错误供background反爬判断
  console.error('[BossScraper] All endpoints failed, lastError:', JSON.stringify(lastError));
  return {
    success: false,
    error: lastError
      ? `${lastError.source} failed (code: ${lastError.code}, ${lastError.message})`
      : 'All API endpoints failed (card and detail)',
    code: lastError?.code ?? -1
  };
}

console.log('[BossScraper] Ready');
