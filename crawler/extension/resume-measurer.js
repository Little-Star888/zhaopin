/**
 * Resume Measurer - 测量层实现
 * @module resume-measurer
 * 
 * 设计原则：
 * 1. 在隐藏容器中测量元素真实渲染尺寸
 * 2. 测量结果用于分页算法决策
 * 3. 支持 ResizeObserver 监听容器变化
 */

import {
  getTemplateParams,
  getContentWidthPx,
  mmToPx,
  generateCssVariables
} from './resume-layout-constants.js';

/**
 * @typedef {Object} MeasureResult
 * @property {number} width - 元素宽度 (px)
 * @property {number} height - 元素高度 (px)
 * @property {number} contentHeight - 内容高度 (px，不含 padding)
 */

/**
 * 简历测量器类
 */
export class ResumeMeasurer {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - 测量容器挂载点（默认 body）
   * @param {'structured'|'timeline'} options.templateId - 模板ID
   */
  constructor(options = {}) {
    this.templateId = options.templateId || 'structured';
    this.mountContainer = options.container || document.body;
    
    // 隐藏测量层
    this.measureLayer = null;
    
    // 缓存
    this.cache = new Map();
    this.cacheKeySeed = 0;
    
    // 初始化
    this._initMeasureLayer();
  }

  /**
   * 初始化隐藏测量层
   * @private
   */
  _initMeasureLayer() {
    // 检查是否已存在
    const existing = document.getElementById('resume-measure-layer');
    if (existing) {
      this.measureLayer = existing;
      return;
    }

    // 创建测量容器
    this.measureLayer = document.createElement('div');
    this.measureLayer.id = 'resume-measure-layer';
    
    // 隐藏样式：脱离视口但仍在 DOM 中
    Object.assign(this.measureLayer.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      visibility: 'hidden',
      width: `${getContentWidthPx(this.templateId)}px`,
      pointerEvents: 'none',
      zIndex: '-1'
    });

    // 添加 CSS 变量
    this.measureLayer.style.cssText += generateCssVariables(this.templateId);

    this.mountContainer.appendChild(this.measureLayer);
  }

  /**
   * 更新模板参数
   * @param {'structured'|'timeline'} templateId 
   */
  setTemplate(templateId) {
    if (this.templateId === templateId) return;
    
    this.templateId = templateId;
    this.cache.clear();
    
    // 更新测量层宽度
    if (this.measureLayer) {
      this.measureLayer.style.width = `${getContentWidthPx(templateId)}px`;
      // 重新注入 CSS 变量
      this.measureLayer.style.cssText = this.measureLayer.style.cssText.replace(
        /--rp-[^;]+;/g,
        ''
      ) + generateCssVariables(templateId);
    }
  }

  /**
   * 测量 section 高度
   * @param {Object} section - ResumeSection
   * @returns {MeasureResult}
   */
  measureSection(section) {
    const cacheKey = `sec:${section.id}:${section.items.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 创建 section 测量元素
    const el = this._createSectionElement(section);
    this.measureLayer.appendChild(el);

    const result = this._getElementMetrics(el);

    // 清理
    this.measureLayer.removeChild(el);

    // 缓存
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 测量单个 item 高度
   * @param {string} item - 文本内容
   * @param {'list'|'timeline'} blockType 
   * @returns {MeasureResult}
   */
  measureItem(item, blockType = 'list') {
    const cacheKey = `item:${blockType}:${this._hashString(item)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const el = this._createItemElement(item, blockType);
    this.measureLayer.appendChild(el);

    const result = this._getElementMetrics(el);

    this.measureLayer.removeChild(el);
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 批量测量多个 items
   * @param {string[]} items 
   * @param {'list'|'timeline'} blockType
   * @returns {MeasureResult[]}
   */
  measureItems(items, blockType = 'list') {
    return items.map(item => this.measureItem(item, blockType));
  }

  /**
   * 测量 header 区域高度
   * @param {Object} header - ResumeHeader
   * @returns {MeasureResult}
   */
  measureHeader(header) {
    const cacheKey = `header:${header.name}:${header.headline}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const el = this._createHeaderElement(header);
    this.measureLayer.appendChild(el);

    const result = this._getElementMetrics(el);

    this.measureLayer.removeChild(el);
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 销毁测量层
   */
  destroy() {
    if (this.measureLayer && this.measureLayer.parentNode) {
      this.measureLayer.parentNode.removeChild(this.measureLayer);
    }
    this.cache.clear();
    this.measureLayer = null;
  }

  // ==================== 私有方法 ====================

  /**
   * 创建 section 测量元素
   * @private
   */
  _createSectionElement(section) {
    const params = getTemplateParams(this.templateId);
    const el = document.createElement('section');
    
    el.className = `resume-section resume-section--${section.blockType}`;
    el.style.cssText = `
      width: 100%;
      padding: ${mmToPx(0)}px 0;
      margin: 0;
      box-sizing: border-box;
    `;

    // 标题
    if (section.title) {
      const title = document.createElement('div');
      title.className = 'resume-section__title';
      title.textContent = section.title;
      title.style.cssText = `
        font-size: var(--rp-font-section);
        font-weight: bold;
        margin-bottom: ${mmToPx(params.sectionSpacing.titleGap)}px;
      `;
      el.appendChild(title);
    }

    // 内容项
    const body = document.createElement('div');
    body.className = 'resume-section__body';
    
    for (const item of section.items) {
      const itemEl = this._createItemElement(item, section.blockType);
      // 移除 itemEl 的容器样式，只保留内容
      itemEl.style.position = 'static';
      itemEl.style.left = 'auto';
      itemEl.style.visibility = 'visible';
      body.appendChild(itemEl);
    }
    
    el.appendChild(body);
    return el;
  }

  /**
   * 创建 item 测量元素
   * @private
   */
  _createItemElement(item, blockType) {
    const params = getTemplateParams(this.templateId);
    const el = document.createElement('div');
    
    if (blockType === 'timeline') {
      el.className = 'resume-block resume-block--timeline';
      // Timeline 有额外的左侧空间
      el.style.cssText = `
        position: relative;
        padding-left: ${mmToPx(params.itemSpacing.indent || 0)}px;
        margin-bottom: ${mmToPx(params.itemSpacing.between)}px;
        font-size: var(--rp-font-body);
        line-height: var(--rp-line-height-normal);
      `;
    } else {
      el.className = 'resume-list-item';
      el.style.cssText = `
        margin-bottom: ${mmToPx(params.itemSpacing.between)}px;
        font-size: var(--rp-font-body);
        line-height: var(--rp-line-height-normal);
      `;
    }
    
    el.textContent = item;
    return el;
  }

  /**
   * 创建 header 测量元素
   * @private
   */
  _createHeaderElement(header) {
    const params = getTemplateParams(this.templateId);
    const el = document.createElement('header');
    
    el.className = 'resume-sheet__header';
    el.style.cssText = `
      width: 100%;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    `;

    // 姓名
    if (header.name) {
      const nameEl = document.createElement('h1');
      nameEl.className = 'resume-sheet__name';
      nameEl.textContent = header.name;
      nameEl.style.cssText = `
        font-size: var(--rp-font-name);
        font-weight: bold;
        margin: 0 0 ${mmToPx(params.headerSpacing.nameToHeadline)}px 0;
        line-height: var(--rp-line-height-tight);
      `;
      el.appendChild(nameEl);
    }

    // 求职意向
    if (header.headline) {
      const headlineEl = document.createElement('div');
      headlineEl.className = 'resume-sheet__headline';
      headlineEl.textContent = header.headline;
      headlineEl.style.cssText = `
        font-size: var(--rp-font-headline);
        margin-bottom: ${mmToPx(params.headerSpacing.headlineToMeta)}px;
        line-height: var(--rp-line-height-tight);
      `;
      el.appendChild(headlineEl);
    }

    // 元信息
    if (header.metaItems && header.metaItems.length > 0) {
      const metaEl = document.createElement('div');
      metaEl.className = 'resume-meta';
      metaEl.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: ${mmToPx(2)}px;
        font-size: var(--rp-font-meta);
        margin-bottom: ${mmToPx(params.headerSpacing.metaToSummary)}px;
      `;
      
      for (const metaItem of header.metaItems) {
        const item = document.createElement('span');
        item.className = 'resume-meta__item';
        item.textContent = metaItem;
        metaEl.appendChild(item);
      }
      
      el.appendChild(metaEl);
    }

    // 个人概况
    if (header.summary) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'resume-summary';
      summaryEl.textContent = header.summary;
      summaryEl.style.cssText = `
        font-size: var(--rp-font-body);
        line-height: var(--rp-line-height-normal);
      `;
      el.appendChild(summaryEl);
    }

    return el;
  }

  /**
   * 获取元素尺寸指标
   * @private
   */
  _getElementMetrics(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    
    return {
      width: rect.width,
      height: rect.height,
      contentHeight: rect.height - paddingTop - paddingBottom
    };
  }

  /**
   * 简单字符串 hash
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为 32bit
    }
    return hash.toString(16);
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速测量 section 高度（无需创建实例）
 * @param {Object} section 
 * @param {'structured'|'timeline'} templateId 
 * @returns {number} - 高度 (px)
 */
export function quickMeasureSection(section, templateId = 'structured') {
  const measurer = new ResumeMeasurer({ templateId });
  const result = measurer.measureSection(section);
  measurer.destroy();
  return result.height;
}

/**
 * 快速测量 header 高度
 * @param {Object} header 
 * @param {'structured'|'timeline'} templateId 
 * @returns {number} - 高度 (px)
 */
export function quickMeasureHeader(header, templateId = 'structured') {
  const measurer = new ResumeMeasurer({ templateId });
  const result = measurer.measureHeader(header);
  measurer.destroy();
  return result.height;
}

// ==================== 默认导出 ====================

export default ResumeMeasurer;
