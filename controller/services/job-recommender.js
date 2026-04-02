/**
 * job-recommender.js - AI 智能岗位推荐引擎
 *
 * 核心流程：
 * 1. LLM 解析用户自然语言要求 → 结构化条件
 * 2. LLM 从简历提取候选人画像
 * 3. 从 DB 获取所有岗位
 * 4. 硬过滤（纯代码）
 * 5. LLM 批量打分排序
 * 6. 返回 topN 推荐结果
 */

const OUTSOURCING_KEYWORDS = [
  '外包', '派遣', '驻场', '外派', '人力资源', '外协', '劳务',
  '人力外包', '项目外派', '服务外包', '技术外包', '乙方',
  '猎头', '人才服务', '人事代理', '劳务派遣', '人力服务',
  '信息技术服务', '软件外包', '项目外包', '资源外包'
];

/**
 * 安全解析 LLM 返回的 JSON（容错处理 ```json ``` 包裹）
 */
function safeParseLLMJson(text) {
  let cleaned = String(text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * 薪资解析
 * "15-25K" → {min:15000, max:25000}
 * "20-35K·13薪" → {min:20000, max:35000, months:13}
 * "面议" → null
 */
function parseSalary(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return null;
  const s = salaryStr.trim();
  if (s === '面议' || s === '薪资面议') return null;

  // 匹配 "15-25K" 或 "15-25k" 或 "15K-25K"
  const rangeMatch = s.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至到]\s*(\d+(?:\.\d+)?)\s*[kK]/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]) * 1000;
    const max = parseFloat(rangeMatch[2]) * 1000;
    const monthMatch = s.match(/(\d+)\s*薪/);
    const result = { min, max };
    if (monthMatch) result.months = parseInt(monthMatch[1], 10);
    return result;
  }

  // 匹配单一数字 "20K"
  const singleMatch = s.match(/(\d+(?:\.\d+)?)\s*[kK]/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]) * 1000;
    return { min: val, max: val };
  }

  return null;
}

/**
 * 从 raw_payload 提取岗位描述
 */
function extractDescription(job) {
  try {
    const payload = typeof job.raw_payload === 'string'
      ? JSON.parse(job.raw_payload)
      : (job.raw_payload || {});
    return payload.jobDesc || payload.description || payload['岗位描述'] || '';
  } catch {
    return '';
  }
}

/**
 * 检测是否外包公司/岗位
 */
function isOutsourcing(job) {
  const matchedKeywords = [];
  const targets = [
    job.company || '',
    job.title || '',
    extractDescription(job),
  ];
  const combined = targets.join(' ');
  for (const kw of OUTSOURCING_KEYWORDS) {
    if (combined.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  return {
    isOutsourcing: matchedKeywords.length > 0,
    matchedKeywords,
  };
}

/**
 * 硬过滤（纯代码，不依赖 LLM）
 * @param {Array} jobs - 岗位列表
 * @param {Object} filters - 过滤条件
 * @returns {{passed: Array, excluded: Array<{job: Object, reason: string}>}}
 */
function hardFilter(jobs, filters) {
  const {
    min_salary = null,
    max_salary = null,
    exclude_outsourcing = false,
    locations = [],
    exclude_keywords = [],
    include_keywords = [],
  } = filters || {};

  const passed = [];
  const excluded = [];

  for (const job of jobs) {
    let excluded_reason = null;

    // 1. 外包检测
    if (exclude_outsourcing) {
      const outsourcing = isOutsourcing(job);
      if (outsourcing.isOutsourcing) {
        excluded_reason = `外包岗位 (匹配: ${outsourcing.matchedKeywords.join(', ')})`;
      }
    }

    // 2. 薪资范围检查
    if (!excluded_reason && (min_salary || max_salary)) {
      const salary = parseSalary(job.salary);
      if (salary) {
        if (min_salary && salary.max < min_salary) {
          excluded_reason = `薪资上限 ${salary.max} 低于最低要求 ${min_salary}`;
        }
        if (!excluded_reason && max_salary && salary.min > max_salary) {
          excluded_reason = `薪资下限 ${salary.min} 高于最高要求 ${max_salary}`;
        }
      }
      // 薪资面议的不在此过滤，保留给 LLM 评判
    }

    // 3. 地点匹配
    if (!excluded_reason && locations.length > 0) {
      const jobLocation = (job.location || '').toLowerCase();
      const matched = locations.some(loc =>
        jobLocation.includes(loc.toLowerCase())
      );
      if (!matched) {
        excluded_reason = `地点不匹配 (要求: ${locations.join('/')}, 岗位: ${job.location || '未知'})`;
      }
    }

    // 4. 排除关键词
    if (!excluded_reason && exclude_keywords.length > 0) {
      const combined = `${job.title || ''} ${job.company || ''} ${job.keywords || ''}`.toLowerCase();
      for (const kw of exclude_keywords) {
        if (combined.includes(kw.toLowerCase())) {
          excluded_reason = `包含排除关键词: ${kw}`;
          break;
        }
      }
    }

    // 5. 包含关键词（如有要求，至少匹配一个）
    if (!excluded_reason && include_keywords.length > 0) {
      const combined = `${job.title || ''} ${job.company || ''} ${job.keywords || ''} ${extractDescription(job)}`.toLowerCase();
      const matched = include_keywords.some(kw =>
        combined.includes(kw.toLowerCase())
      );
      if (!matched) {
        excluded_reason = `未包含任何要求关键词: ${include_keywords.join(', ')}`;
      }
    }

    if (excluded_reason) {
      excluded.push({ job, reason: excluded_reason });
    } else {
      passed.push(job);
    }
  }

  return { passed, excluded };
}

/**
 * 用 LLM 解析用户自然语言要求为结构化条件
 */
async function parseRequirements(llmClient, userPrompt) {
  const systemPrompt = '你是一个需求解析器。将用户的求职筛选要求转为JSON。';
  const prompt = `用户说: "${userPrompt}"
返回格式(只返回JSON,不要其他文字):
{
  "min_salary": 数字或null,
  "max_salary": 数字或null,
  "exclude_outsourcing": true或false,
  "locations": ["城市名"] 或 [],
  "exclude_keywords": ["关键词"],
  "include_keywords": ["关键词"],
  "role_types": ["岗位方向"],
  "experience_range": "经验要求" 或 null,
  "other_preferences": ["其他偏好描述"]
}
注意: min_salary和max_salary的单位是元(月薪)。例如用户说"20k以上",则min_salary=20000。`;

  const response = await llmClient.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]);
  return safeParseLLMJson(response.content);
}

/**
 * 用 LLM 从简历提取候选人画像
 */
async function extractResumeProfile(llmClient, resumeMd) {
  const systemPrompt = '你是一个简历分析专家。';
  const prompt = `分析以下简历,提取候选人画像。只返回JSON:
${resumeMd}
返回:
{
  "name": "姓名",
  "target_roles": ["目标方向"],
  "skills": ["技能列表"],
  "experience_years": 数字,
  "industries": ["行业经验"],
  "strengths": ["核心优势,最多3个"],
  "education": "最高学历"
}`;

  const response = await llmClient.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]);
  return safeParseLLMJson(response.content);
}

/**
 * LLM 批量打分（每批 5-8 个岗位）
 */
async function batchScore(llmClient, profile, preferences, jobsBatch) {
  const jobList = jobsBatch.map((j, i) => {
    const desc = extractDescription(j);
    return `${i + 1}. [ID:${j.id}] ${j.title} - ${j.company} - ${j.salary || '面议'} - ${j.location || '未知'}\n   描述: ${(desc || '无描述').slice(0, 200)}`;
  }).join('\n');

  const systemPrompt = '你是岗位匹配专家。根据候选人画像为岗位打分(0-100)。只返回JSON。';
  const prompt = `候选人画像:
${JSON.stringify(profile)}

用户偏好:
${JSON.stringify(preferences)}

岗位列表:
${jobList}

只返回JSON数组(不要其他文字):
[{"id": 数字, "score": 0-100, "reasons": ["匹配原因1","原因2"]}]

评分标准:
- 技能匹配(35%): 候选人技能是否与岗位要求吻合
- 方向匹配(25%): 岗位方向是否与候选人目标一致
- 经验匹配(20%): 经验年限是否满足
- 综合适配(20%): 行业经验、公司质量、发展前景`;

  const response = await llmClient.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]);
  return safeParseLLMJson(response.content);
}

/**
 * 延时函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主推荐函数
 * @param {Object} params
 * @param {string} params.userPrompt - 用户自然语言要求
 * @param {string} params.resumeMd - 简历 Markdown
 * @param {Object} params.db - better-sqlite3 数据库实例
 * @param {Object} params.llmClient - LLM 客户端
 * @param {number} [params.topN=20] - 返回前N个
 * @returns {Promise<Object>} 推荐结果
 */
async function recommendJobs({ userPrompt, resumeMd, db, llmClient, topN = 20 }) {
  // 步骤1: 解析用户要求为结构化条件
  let requirements;
  try {
    requirements = await parseRequirements(llmClient, userPrompt);
  } catch (err) {
    throw new Error(`解析用户要求失败: ${err.message}`);
  }

  // 步骤2: 从简历提取候选人画像
  let profile;
  try {
    profile = await extractResumeProfile(llmClient, resumeMd);
  } catch (err) {
    throw new Error(`提取简历画像失败: ${err.message}`);
  }

  // 步骤3: 从 DB 获取所有岗位
  const allJobs = db.prepare(`
    SELECT id, title, company, location, salary, experience, education, keywords, raw_payload, platform
    FROM scraped_jobs
    ORDER BY id DESC
  `).all();

  if (allJobs.length === 0) {
    return {
      success: true,
      summary: {
        total_scanned: 0,
        after_hard_filter: 0,
        recommended: 0,
        filters_applied: requirements,
        resume_profile: profile,
      },
      jobs: [],
    };
  }

  // 步骤4: 硬过滤
  const filterResult = hardFilter(allJobs, {
    min_salary: requirements.min_salary || null,
    max_salary: requirements.max_salary || null,
    exclude_outsourcing: requirements.exclude_outsourcing || false,
    locations: requirements.locations || [],
    exclude_keywords: requirements.exclude_keywords || [],
    include_keywords: requirements.include_keywords || [],
  });

  const candidates = filterResult.passed;

  if (candidates.length === 0) {
    return {
      success: true,
      summary: {
        total_scanned: allJobs.length,
        after_hard_filter: 0,
        recommended: 0,
        filters_applied: {
          min_salary: requirements.min_salary,
          max_salary: requirements.max_salary,
          exclude_outsourcing: requirements.exclude_outsourcing,
          locations: requirements.locations,
        },
        resume_profile: {
          name: profile.name,
          target_roles: profile.target_roles,
          skills: profile.skills,
        },
      },
      jobs: [],
    };
  }

  // 步骤5: LLM 批量打分（每批 5-8 个）
  const BATCH_SIZE = 6;
  const scoredJobs = [];
  const preferences = {
    role_types: requirements.role_types || [],
    experience_range: requirements.experience_range,
    other_preferences: requirements.other_preferences || [],
  };

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    try {
      const scores = await batchScore(llmClient, profile, preferences, batch);
      if (Array.isArray(scores)) {
        for (const scoreItem of scores) {
          const matchedJob = batch.find(j => j.id === scoreItem.id);
          if (matchedJob) {
            scoredJobs.push({
              ...matchedJob,
              score: Math.max(0, Math.min(100, scoreItem.score || 0)),
              reasons: scoreItem.reasons || [],
            });
          }
        }
      }
    } catch (err) {
      // 单批打分失败不阻塞整体，跳过该批次
      console.error(`[job-recommender] 批量打分失败 (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, err.message);
    }

    // 批次间间隔 200ms 避免 rate limit
    if (i + BATCH_SIZE < candidates.length) {
      await sleep(200);
    }
  }

  // 步骤6: 排序并返回 topN
  scoredJobs.sort((a, b) => b.score - a.score);
  const topJobs = scoredJobs.slice(0, topN);

  return {
    success: true,
    summary: {
      total_scanned: allJobs.length,
      after_hard_filter: candidates.length,
      recommended: topJobs.length,
      filters_applied: {
        min_salary: requirements.min_salary,
        max_salary: requirements.max_salary,
        exclude_outsourcing: requirements.exclude_outsourcing,
        locations: requirements.locations,
      },
      resume_profile: {
        name: profile.name,
        target_roles: profile.target_roles,
        skills: profile.skills,
      },
    },
    jobs: topJobs.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      salary: j.salary || '面议',
      location: j.location || '',
      score: j.score,
      reasons: j.reasons,
      keywords: j.keywords || '',
    })),
  };
}

module.exports = {
  OUTSOURCING_KEYWORDS,
  parseSalary,
  isOutsourcing,
  hardFilter,
  extractDescription,
  safeParseLLMJson,
  recommendJobs,
};
