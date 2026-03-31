/**
 * Resume Model - Markdown 与结构化数据的双向转换
 * @module resume-model
 * 
 * 设计原则：
 * 1. ResumeModel 是分页前后的唯一中间态
 * 2. Markdown 是唯一持久化数据
 * 3. section.id 必须稳定，不依赖标题文本
 */

// ==================== 类型定义 (JSDoc) ====================

/**
 * @typedef {Object} ResumeHeader
 * @property {string} name - 姓名
 * @property {string} headline - 求职意向/标题
 * @property {string[]} metaItems - 元信息项（电话、邮箱等）
 * @property {string} summary - 个人概况/摘要
 */

/**
 * @typedef {Object} ResumeSection
 * @property {string} id - 稳定唯一标识（如 sec-0-xxxx）
 * @property {string} title - 区块标题
 * @property {string[]} items - 内容项数组
 * @property {'list'|'timeline'} blockType - 渲染类型提示
 */

/**
 * @typedef {Object} ResumeModel
 * @property {ResumeHeader} header - 头部信息
 * @property {ResumeSection[]} sections - 内容区块
 * @property {string} templateId - 模板ID
 */

// ==================== 常量定义 ====================

const KNOWN_SECTION_TITLES = new Set([
  '个人信息', '个人概况', '求职意向', '教育背景', '工作经历', '实习经历',
  '项目经历', '校园经历', '技能特长', '专业技能', '核心技能', '自我评价',
  '荣誉奖项', '获奖经历', '证书', '语言能力'
]);

const META_FIELD_MAPPINGS = [
  ['电话', ['联系电话', '电话', '手机']],
  ['邮箱', ['邮箱', '电子邮件']],
  ['微信', ['微信']],
  ['现居地', ['现居地', '所在地', '居住地']],
  ['学历', ['学历']],
  ['专业', ['专业']],
  ['学校', ['毕业院校', '学校', '在读院校']],
  ['出生年月', ['出生年月']],
  ['性别', ['性别']],
];

// ==================== 工具函数 ====================

/**
 * 生成稳定的 section ID
 * @param {number} index - 区块索引
 * @param {string} title - 区块标题
 * @returns {string} - 稳定的 ID（如 sec-0-abcd）
 */
function generateSectionId(index, title) {
  // 使用简单的 hash 确保相同标题在不同位置也有不同 ID
  const hash = title
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(16)
    .slice(-4);
  return `sec-${index}-${hash}`;
}

/**
 * 模糊匹配区块标题
 * 处理 PDF 提取的变体格式：多余空格、中文序号、括号包裹、尾部冒号等
 * @param {string} line - 待检测文本行
 * @returns {string|null} - 匹配到的标准标题，或 null
 */
function matchSectionTitle(line) {
  if (!line) return null;

  // 去除常见前缀/后缀噪音
  const cleaned = line
    .replace(/^[一二三四五六七八九十]+[、.．]\s*/, '')
    .replace(/^[①-⑳]\s*/, '')
    .replace(/^第[一二三四五六七八九十\d]+[章节]\s*/, '')
    .replace(/^[\[【〔〈<].+?[】\]〕〉>]\s*/, '')
    .replace(/[\[【〔〈<].+?[】\]〕〉>]$/, '')
    .replace(/[:：]\s*$/, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[#*_~`]/g, '');

  // 精确匹配
  if (KNOWN_SECTION_TITLES.has(cleaned)) return cleaned;

  // 前缀/后缀匹配：允许标题前后有少量附加文字
  for (const title of KNOWN_SECTION_TITLES) {
    if (cleaned.length <= title.length + 6 && cleaned.startsWith(title)) return title;
    if (cleaned.length <= title.length + 6 && cleaned.endsWith(title)) return title;
  }

  return null;
}

/**
 * 标准化简历源文本
 * @param {string} source - 原始 Markdown
 * @returns {string} - 标准化后的文本
 */
function normalizeResumeSource(source) {
  if (!source) return '';
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 从文本中提取标签值
 * @param {string} text - 源文本
 * @param {string[]} keys - 可能的键名
 * @returns {string|null} - 提取的值
 */
function extractLabelValue(text, keys) {
  for (const key of keys) {
    const pattern = new RegExp(`${key}[:：]\\s*(.+?)(?:\\n|$)`, 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * 拆分简历句子为项目
 * @param {string} text - 输入文本
 * @returns {string[]} - 拆分后的项目
 */
function splitResumeSentences(text) {
  if (!text) return [];
  
  // 处理列表项标记
  const cleaned = text
    .replace(/^-\s+/gm, '')
    .replace(/^\*\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '');
  
  // 按句号、分号、换行拆分，但保留时间范围
  const items = cleaned
    .split(/(?:[。;；]|\n)+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 500);
  
  return items;
}

// ==================== 核心函数：Markdown -> Model ====================

/**
 * 将 Markdown 解析为 ResumeModel
 * @param {string} markdown - Markdown 原始文本
 * @param {string} templateId - 模板ID ('structured' | 'timeline')
 * @returns {ResumeModel} - 结构化数据模型
 */
export function parseMarkdownToResumeModel(markdown, templateId = 'structured') {
  const normalized = normalizeResumeSource(markdown);
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);

  /** @type {ResumeModel} */
  const model = {
    header: {
      name: '',
      headline: '',
      metaItems: [],
      summary: ''
    },
    sections: [],
    templateId: templateId === 'timeline' ? 'timeline' : 'structured'
  };

  if (!lines.length) {
    return model;
  }

  const joined = lines.join('\n');

  // 提取姓名
  model.header.name = extractLabelValue(joined, ['姓名']) || '';
  if (!model.header.name) {
    const firstLine = lines[0].replace(/^#\s*/, '');
    if (firstLine && !KNOWN_SECTION_TITLES.has(firstLine) && firstLine.length <= 24) {
      model.header.name = firstLine;
    }
  }

  // 提取求职意向/标题
  const titleLine = extractLabelValue(joined, ['求职意向', '目标岗位', '应聘岗位']);
  if (titleLine) {
    model.header.headline = titleLine;
  } else {
    const secondLine = lines.find(line => /产品|运营|开发|设计|数据|经理|工程师|实习|分析/.test(line));
    model.header.headline = secondLine && secondLine !== model.header.name ? secondLine : '';
  }

  // 提取元信息
  model.header.metaItems = META_FIELD_MAPPINGS
    .map(([label, keys]) => {
      const value = extractLabelValue(joined, keys);
      return value ? `${label}：${value}` : '';
    })
    .filter(Boolean);

  // 解析区块
  let currentSection = null;
  const headerBuffer = [];
  let sectionIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^#{1,6}\s*/, '').trim();
    if (!line) continue;

    // 检测区块标题（精确匹配 + 模糊匹配）
    const matchedTitle = KNOWN_SECTION_TITLES.has(line) ? line : matchSectionTitle(line);
    if (matchedTitle) {
      currentSection = {
        id: generateSectionId(sectionIndex++, matchedTitle),
        title: matchedTitle,
        items: [],
        blockType: matchedTitle.includes('经历') || matchedTitle.includes('教育') ? 'timeline' : 'list'
      };
      model.sections.push(currentSection);
      continue;
    }

    // 未进入区块前的内容放入 headerBuffer
    if (!currentSection) {
      headerBuffer.push(line);
      continue;
    }

    // 区块内内容
    splitResumeSentences(line).forEach((item) => {
      if (currentSection) {
        currentSection.items.push(item);
      }
    });
  }

  // 提取个人概况（从未分类的 header 内容中）
  if (!model.header.summary) {
    const summaryCandidates = headerBuffer.filter(line => (
      line !== model.header.name &&
      line !== model.header.headline &&
      !/^姓名[:：]|^电话[:：]|^联系电话[:：]|^邮箱[:：]|^电子邮件[:：]|^微信[:：]|^现居地[:：]|^所在地[:：]|^学历[:：]|^专业[:：]|^学校[:：]|^毕业院校[:：]/.test(line)
    ));
    model.header.summary = summaryCandidates.slice(0, 3).join(' ');
  }

  // 兜底：如果没有识别到任何区块，将所有内容放入一个默认区块
  if (!model.sections.length) {
    const fallbackItems = splitResumeSentences(lines.join('\n'));
    model.sections.push({
      id: generateSectionId(0, '简历内容'),
      title: '简历内容',
      items: fallbackItems,
      blockType: 'list'
    });
  }

  // 清理空区块和空项
  model.sections = model.sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item && item.trim().length > 0)
    }))
    .filter(section => section.items.length > 0);

  return model;
}

// ==================== 核心函数：Model -> Markdown ====================

/**
 * 将 ResumeModel 序列化为 Markdown
 * @param {ResumeModel} model - 结构化数据模型
 * @returns {string} - Markdown 文本
 */
export function serializeResumeModelToMarkdown(model) {
  if (!model) return '';

  const lines = [];
  const { header, sections } = model;

  // 姓名（优先显示）
  if (header.name) {
    lines.push(header.name);
  }

  // 求职意向
  if (header.headline) {
    lines.push(header.headline);
  }

  // 元信息项
  if (header.metaItems && header.metaItems.length > 0) {
    lines.push(...header.metaItems);
  }

  // 个人概况
  if (header.summary) {
    lines.push('');
    lines.push('个人概况');
    lines.push(header.summary);
  }

  // 各区块
  for (const section of sections) {
    if (!section.items || section.items.length === 0) continue;
    
    lines.push('');
    if (section.title) {
      lines.push(section.title);
    }
    
    for (const item of section.items) {
      if (item && item.trim()) {
        lines.push(`- ${item.trim()}`);
      }
    }
  }

  return normalizeResumeSource(lines.join('\n'));
}

// ==================== 工具函数 ====================

/**
 * 深拷贝 ResumeModel
 * @param {ResumeModel} model - 源模型
 * @returns {ResumeModel} - 深拷贝后的模型
 */
export function cloneResumeModel(model) {
  if (!model) return null;
  return JSON.parse(JSON.stringify(model));
}

/**
 * 比较两个 ResumeModel 的差异
 * @param {ResumeModel} modelA 
 * @param {ResumeModel} modelB 
 * @returns {object} - 差异描述
 */
export function diffResumeModels(modelA, modelB) {
  const changes = [];
  
  if (!modelA || !modelB) {
    return { hasChanges: true, changes: ['模型不存在'] };
  }

  // 比较 header
  if (JSON.stringify(modelA.header) !== JSON.stringify(modelB.header)) {
    changes.push('header');
  }

  // 比较 sections 数量
  if (modelA.sections.length !== modelB.sections.length) {
    changes.push('sections.count');
  } else {
    // 比较每个 section
    for (let i = 0; i < modelA.sections.length; i++) {
      const secA = modelA.sections[i];
      const secB = modelB.sections[i];
      if (secA.id !== secB.id || 
          secA.title !== secB.title ||
          JSON.stringify(secA.items) !== JSON.stringify(secB.items)) {
        changes.push(`sections[${i}](${secA.id})`);
      }
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
}

/**
 * 根据 section ID 查找区块
 * @param {ResumeModel} model 
 * @param {string} sectionId 
 * @returns {ResumeSection|null}
 */
export function findSectionById(model, sectionId) {
  if (!model || !model.sections) return null;
  return model.sections.find(s => s.id === sectionId) || null;
}

/**
 * 合并跨页的同 ID 区块内容（用于分页后回收）
 * @param {ResumeSection[]} sections - 可能包含重复 ID 的区块数组
 * @returns {ResumeSection[]} - 合并后的区块数组
 */
export function mergeContinuationSections(sections) {
  if (!sections || sections.length === 0) return [];
  
  const merged = new Map();
  
  for (const section of sections) {
    if (!merged.has(section.id)) {
      merged.set(section.id, {
        ...section,
        items: [...section.items]
      });
    } else {
      // 合并 items
      const existing = merged.get(section.id);
      existing.items.push(...section.items);
    }
  }
  
  return Array.from(merged.values());
}

// ==================== 验证函数 ====================

/**
 * 验证 ResumeModel 的完整性
 * @param {ResumeModel} model 
 * @returns {object} - 验证结果
 */
export function validateResumeModel(model) {
  const errors = [];
  
  if (!model) {
    return { valid: false, errors: ['模型为空'] };
  }

  if (!model.header) {
    errors.push('缺少 header');
  } else {
    if (typeof model.header.name !== 'string') {
      errors.push('header.name 必须是字符串');
    }
  }

  if (!Array.isArray(model.sections)) {
    errors.push('sections 必须是数组');
  } else {
    for (const [i, section] of model.sections.entries()) {
      if (!section.id) {
        errors.push(`sections[${i}] 缺少 id`);
      }
      if (!Array.isArray(section.items)) {
        errors.push(`sections[${i}] items 必须是数组`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ==================== 默认导出 ====================

export default {
  parseMarkdownToResumeModel,
  serializeResumeModelToMarkdown,
  cloneResumeModel,
  diffResumeModels,
  findSectionById,
  mergeContinuationSections,
  validateResumeModel
};
