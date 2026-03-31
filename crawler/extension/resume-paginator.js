/**
 * Resume Paginator - 分页引擎
 * @module resume-paginator
 * 
 * 设计原则：
 * 1. 输入 ResumeModel，输出分页后的多页 DOM
 * 2. 三策略分页：整段放、整段换页、按 item 拆分
 * 3. 支持双向同步：DOM → Model
 */

import { ResumeMeasurer } from './resume-measurer.js';
import {
  A4_DIMENSIONS,
  getContentHeightPx,
  getTemplateParams,
  mmToPx,
  generateCssVariables
} from './resume-layout-constants.js';
import {
  parseMarkdownToResumeModel,
  serializeResumeModelToMarkdown,
  mergeContinuationSections
} from './resume-model.js';

/**
 * @typedef {Object} PaginatorOptions
 * @property {boolean} editable - 是否可编辑
 * @property {'structured'|'timeline'} templateId - 模板ID
 * @property {Function} onModelChange - Model 变化回调
 * @property {Function} onLayoutChange - 布局变化回调
 * @property {number} debounceMs - 重排防抖时间
 * @property {'default'|'split'|'expanded'} viewMode - 当前视图模式
 */

/**
 * @typedef {Object} PaginatedPage
 * @property {number} index - 页码（从1开始）
 * @property {HTMLElement} element - 页面 DOM 元素
 * @property {Object[]} sections - 该页包含的 section 数据
 */

/**
 * 简历分页器类
 */
export class ResumePaginator {
  /**
   * @param {HTMLElement} container - 分页容器
   * @param {PaginatorOptions} options 
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      editable: false,
      templateId: 'structured',
      onModelChange: null,
      onLayoutChange: null,
      debounceMs: 300,
      viewMode: 'default',
      ...options
    };

    // 状态
    this.model = null;
    this.pages = [];
    this.measurer = null;
    this.resizeObserver = null;
    this.debounceTimer = null;

    // 测量层
    this._initMeasurer();
    
    // 初始化容器
    this._initContainer();
  }

  /**
   * 初始化测量器
   * @private
   */
  _initMeasurer() {
    this.measurer = new ResumeMeasurer({
      templateId: this.options.templateId
    });
  }

  /**
   * 初始化容器
   * @private
   */
  _initContainer() {
    // 添加分页容器类名
    this.container.classList.add('resume-preview-shell--paginated');
    this.container.classList.toggle('is-split-view', this.options.viewMode === 'split');
    
    // 注入 CSS 变量
    const cssVars = generateCssVariables(this.options.templateId);
    this.container.style.cssText += cssVars;
  }

  /**
   * 根据容器宽度动态缩放 A4 页卡，避免分屏窄列中被裁切
   * 只影响显示缩放，不改变分页计算逻辑
   * @private
   */
  _updateViewportScale() {
    if (!this.container) return;

    const styles = window.getComputedStyle(this.container);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const availableWidth = Math.max(0, this.container.clientWidth - paddingLeft - paddingRight - 8);
    const pageWidth = mmToPx(A4_DIMENSIONS.width);

    if (!availableWidth || !pageWidth) {
      this.container.style.setProperty('--rp-scale', '1');
      return;
    }

    const minScale = this.options.viewMode === 'split' ? 0.72 : 0.42;
    const scale = Math.min(1, Math.max(minScale, availableWidth / pageWidth));
    this.container.style.setProperty('--rp-scale', scale.toFixed(3));
  }

  /**
   * 渲染分页
   * @param {Object} model - ResumeModel
   * @returns {PaginatedPage[]}
   */
  render(model) {
    if (!model) {
      console.warn('[ResumePaginator] model is null');
      return [];
    }

    this.model = model;
    
    // 清空容器
    this._clearContainer();
    
    // 执行分页算法
    this.pages = this._doPagination();
    
    // 渲染到 DOM
    this._renderPages();

    // 按容器宽度自适应缩放显示
    this._updateViewportScale();
    
    // 绑定编辑事件
    if (this.options.editable) {
      this._bindEditEvents();
    }
    
    // 启动 ResizeObserver
    this._startResizeObserver();
    
    // 回调
    if (this.options.onLayoutChange) {
      this.options.onLayoutChange(this.pages.length);
    }
    
    return this.pages;
  }

  /**
   * 从可编辑 DOM 同步回 Model
   * @returns {Object|null} - 更新后的 ResumeModel
   */
  syncFromEditable() {
    if (!this.options.editable || !this.model) {
      return this.model;
    }

    // ========== 回收 Header 数据 ==========
    const headerEl = this.container.querySelector('.resume-sheet__header');
    const updatedHeader = { ...this.model.header };
    
    if (headerEl) {
      // 姓名
      const nameEl = headerEl.querySelector('.resume-sheet__name');
      if (nameEl) {
        updatedHeader.name = nameEl.textContent.trim();
      }
      
      // 头衔
      const headlineEl = headerEl.querySelector('.resume-sheet__headline');
      if (headlineEl) {
        updatedHeader.headline = headlineEl.textContent.trim();
      }
      
      // Meta 项目
      const metaItemEls = headerEl.querySelectorAll('.resume-meta__item');
      if (metaItemEls.length > 0) {
        updatedHeader.metaItems = Array.from(metaItemEls)
          .map(el => el.textContent.trim())
          .filter(Boolean);
      }
      
      // 个人概况
      const summaryEl = headerEl.querySelector('.resume-summary');
      if (summaryEl) {
        updatedHeader.summary = summaryEl.textContent.trim();
      }
    }

    // ========== 回收 Sections 数据 ==========
    const sections = [];
    
    // 收集所有 section 元素
    const sectionEls = this.container.querySelectorAll('.resume-section[data-section-id]');
    
    for (const el of sectionEls) {
      const sectionId = el.dataset.sectionId;
      const isContinuation = el.dataset.continuation === 'true';
      const titleEl = el.querySelector('.resume-section__title');
      const itemEls = el.querySelectorAll('.resume-list-item, .resume-block__content');
      
      const section = {
        id: sectionId,
        title: titleEl ? titleEl.textContent.trim() : '',
        items: Array.from(itemEls).map(item => item.textContent.trim()).filter(Boolean),
        blockType: el.classList.contains('resume-section--timeline') ? 'timeline' : 'list',
        _continuation: isContinuation
      };
      
      sections.push(section);
    }

    // 合并跨页的同 ID section
    const mergedSections = mergeContinuationSections(sections);
    
    // 更新 model
    this.model = {
      ...this.model,
      header: updatedHeader,
      sections: mergedSections
    };
    
    return this.model;
  }

  /**
   * 刷新布局（重新分页但不销毁 DOM）
   */
  refreshLayout() {
    if (!this.model) return;
    
    // 先同步当前内容
    this.syncFromEditable();
    
    // 重新分页渲染
    this.render(this.model);
  }

  /**
   * 销毁分页器
   */
  destroy() {
    this._stopResizeObserver();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.measurer) {
      this.measurer.destroy();
      this.measurer = null;
    }
    
    this._clearContainer();
    this.container.classList.remove('resume-preview-shell--paginated');
    
    this.model = null;
    this.pages = [];
  }

  // ==================== 私有方法：分页算法 ====================

  /**
   * 执行三策略分页
   * @private
   * @returns {PaginatedPage[]}
   */
  _doPagination() {
    const { header, sections } = this.model;
    const pageHeight = getContentHeightPx(this.options.templateId);
    
    const pages = [];
    let currentPage = this._createPageData(1);
    let currentHeight = 0;

    // 首先放置 header
    if (header) {
      const headerMetrics = this.measurer.measureHeader(header);
      
      if (headerMetrics.height > pageHeight) {
        // Header 超过一页的情况极少见，直接放第一页
        currentPage.sections.push({
          type: 'header',
          data: header,
          height: headerMetrics.height
        });
        currentHeight += headerMetrics.height;
      } else if (currentHeight + headerMetrics.height <= pageHeight) {
        // 能放下
        currentPage.sections.push({
          type: 'header',
          data: header,
          height: headerMetrics.height
        });
        currentHeight += headerMetrics.height;
      } else {
        // 当前页放不下，新开一页
        pages.push(currentPage);
        currentPage = this._createPageData(pages.length + 1);
        currentPage.sections.push({
          type: 'header',
          data: header,
          height: headerMetrics.height
        });
        currentHeight = headerMetrics.height;
      }
    }

    // 处理各个 section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionMetrics = this.measurer.measureSection(section);
      
      // 策略1：整段能放下
      if (currentHeight + sectionMetrics.height <= pageHeight) {
        currentPage.sections.push({
          type: 'section',
          data: section,
          height: sectionMetrics.height,
          continuation: false
        });
        currentHeight += sectionMetrics.height;
        continue;
      }

      // 策略2：当前页放不下，但整段能在新页完整放下
      if (sectionMetrics.height <= pageHeight) {
        // 结束当前页
        if (currentPage.sections.length > 0) {
          pages.push(currentPage);
        }
        
        // 新开一页放整段
        currentPage = this._createPageData(pages.length + 1);
        currentPage.sections.push({
          type: 'section',
          data: section,
          height: sectionMetrics.height,
          continuation: false
        });
        currentHeight = sectionMetrics.height;
        continue;
      }

      // 策略3：单 section 超过一页，需要按 item 拆分
      const remainingHeight = pageHeight - currentHeight;
      
      // 如果当前页还有空间，先结束当前页
      if (currentPage.sections.length > 0 && remainingHeight > mmToPx(10)) {
        pages.push(currentPage);
        currentPage = this._createPageData(pages.length + 1);
        currentHeight = 0;
      }

      // 拆分 section
      const splitResult = this._splitSectionByItems(section, pageHeight);
      
      for (let j = 0; j < splitResult.parts.length; j++) {
        const part = splitResult.parts[j];
        
        if (j > 0) {
          // 新页
          pages.push(currentPage);
          currentPage = this._createPageData(pages.length + 1);
        }
        
        currentPage.sections.push({
          type: 'section',
          data: part,
          height: part._measuredHeight,
          continuation: j > 0  // 第一个 part 不是 continuation
        });
        currentHeight = part._measuredHeight;
      }
    }

    // 添加最后一页
    if (currentPage.sections.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * 按 item 拆分 section
   * @private
   */
  _splitSectionByItems(section, pageHeight) {
    const params = getTemplateParams(this.options.templateId);
    const parts = [];
    let currentPart = {
      ...section,
      items: [],
      _measuredHeight: 0
    };
    let currentHeight = mmToPx(params.sectionSpacing.before);
    
    // 如果有标题，加上标题高度
    if (section.title) {
      currentHeight += mmToPx(params.sectionSpacing.titleGap) + 
                       mmToPx(params.fontSizes.sectionTitle * params.lineHeight.normal * 0.35);
    }

    for (const item of section.items) {
      const itemMetrics = this.measurer.measureItem(item, section.blockType);
      
      if (currentHeight + itemMetrics.height <= pageHeight) {
        // 能放下
        currentPart.items.push(item);
        currentHeight += itemMetrics.height + mmToPx(params.itemSpacing.between);
      } else {
        // 放不下，结束当前 part
        if (currentPart.items.length > 0) {
          currentPart._measuredHeight = currentHeight;
          parts.push(currentPart);
        }
        
        // 新开一个 part
        currentPart = {
          ...section,
          items: [item],
          _measuredHeight: itemMetrics.height
        };
        currentHeight = itemMetrics.height + mmToPx(params.itemSpacing.between);
      }
    }

    // 添加最后一个 part
    if (currentPart.items.length > 0) {
      currentPart._measuredHeight = currentHeight;
      parts.push(currentPart);
    }

    return { parts };
  }

  /**
   * 创建页面数据结构
   * @private
   */
  _createPageData(index) {
    return {
      index,
      sections: []
    };
  }

  // ==================== 私有方法：DOM 渲染 ====================

  /**
   * 渲染页面到 DOM
   * @private
   */
  _renderPages() {
    const container = document.createElement('div');
    container.className = 'pages-container';

    for (const page of this.pages) {
      const pageEl = this._createPageElement(page);
      container.appendChild(pageEl);
    }

    this.container.appendChild(container);
  }

  /**
   * 创建单个页面元素
   * @private
   */
  _createPageElement(page) {
    const pageEl = document.createElement('div');
    pageEl.className = 'resume-page';
    pageEl.dataset.pageIndex = page.index;

    // 添加页码
    const pageNum = document.createElement('div');
    pageNum.className = 'resume-page__num';
    pageNum.textContent = `${page.index} / ${this.pages.length}`;
    pageEl.appendChild(pageNum);

    // 创建内容区
    const contentEl = document.createElement('div');
    contentEl.className = 'resume-page__content';

    // 渲染各个 section
    for (const sectionInfo of page.sections) {
      if (sectionInfo.type === 'header') {
        const headerEl = this._createHeaderElement(sectionInfo.data);
        contentEl.appendChild(headerEl);
      } else {
        const sectionEl = this._createSectionElement(
          sectionInfo.data,
          sectionInfo.continuation
        );
        contentEl.appendChild(sectionEl);
      }
    }

    pageEl.appendChild(contentEl);
    return pageEl;
  }

  /**
   * 创建 header 元素
   * @private
   */
  _createHeaderElement(header) {
    const params = getTemplateParams(this.options.templateId);
    const el = document.createElement('header');
    el.className = 'resume-sheet__header';

    if (header.name) {
      const name = document.createElement('h1');
      name.className = 'resume-sheet__name';
      name.textContent = header.name;
      if (this.options.editable) {
        name.contentEditable = 'true';
        name.setAttribute('data-editable-field', 'name');
      }
      el.appendChild(name);
    }

    if (header.headline) {
      const headline = document.createElement('div');
      headline.className = 'resume-sheet__headline';
      headline.textContent = header.headline;
      if (this.options.editable) {
        headline.contentEditable = 'true';
        headline.setAttribute('data-editable-field', 'headline');
      }
      el.appendChild(headline);
    }

    if (header.metaItems && header.metaItems.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'resume-meta';
      for (let i = 0; i < header.metaItems.length; i++) {
        const item = header.metaItems[i];
        const span = document.createElement('span');
        span.className = 'resume-meta__item';
        span.textContent = item;
        if (this.options.editable) {
          span.contentEditable = 'true';
          span.setAttribute('data-editable-field', `meta-${i}`);
        }
        meta.appendChild(span);
      }
      el.appendChild(meta);
    }

    if (header.summary) {
      const summary = document.createElement('div');
      summary.className = 'resume-summary';
      summary.textContent = header.summary;
      if (this.options.editable) {
        summary.contentEditable = 'true';
        summary.setAttribute('data-editable-field', 'summary');
      }
      el.appendChild(summary);
    }

    return el;
  }

  /**
   * 创建 section 元素
   * @private
   */
  _createSectionElement(section, isContinuation = false) {
    const el = document.createElement('section');
    el.className = `resume-section resume-section--${section.blockType}`;
    el.dataset.sectionId = section.id;
    el.dataset.continuation = isContinuation ? 'true' : 'false';

    if (section.title && !isContinuation) {
      const title = document.createElement('div');
      title.className = 'resume-section__title';
      title.textContent = section.title;
      if (this.options.editable) {
        title.contentEditable = 'true';
      }
      el.appendChild(title);
    }

    const body = document.createElement('div');
    body.className = 'resume-section__body';

    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const itemEl = document.createElement('div');
      
      if (section.blockType === 'timeline') {
        itemEl.className = 'resume-block resume-block--timeline';
        const marker = document.createElement('div');
        marker.className = 'resume-block__marker';
        const content = document.createElement('div');
        content.className = 'resume-block__content';
        content.textContent = item;
        if (this.options.editable) {
          content.contentEditable = 'true';
        }
        itemEl.appendChild(marker);
        itemEl.appendChild(content);
      } else {
        itemEl.className = 'resume-list-item';
        itemEl.textContent = item;
        if (this.options.editable) {
          itemEl.contentEditable = 'true';
        }
      }
      
      body.appendChild(itemEl);
    }

    el.appendChild(body);
    return el;
  }

  /**
   * 清空容器
   * @private
   */
  _clearContainer() {
    // 只移除我们添加的内容，保留容器本身
    const pagesContainer = this.container.querySelector('.pages-container');
    if (pagesContainer) {
      pagesContainer.remove();
    }
  }

  // ==================== 私有方法：事件绑定 ====================

  /**
   * 绑定编辑事件
   * @private
   */
  _bindEditEvents() {
    const pagesContainer = this.container.querySelector('.pages-container');
    if (!pagesContainer) return;

    // 使用事件委托
    pagesContainer.addEventListener('blur', (e) => {
      const editableEl = e.target.closest('[contenteditable="true"]');
      if (editableEl) {
        this._handleEditBlur();
      }
    }, true);

    // Input 事件用于实时验证（不触发重排）
    pagesContainer.addEventListener('input', (e) => {
      const target = e.target;
      // Section 内编辑
      const section = target.closest('.resume-section');
      if (section) {
        section.dataset.dirty = 'true';
        return;
      }
      // Header 内编辑（给 header 或其所在 page 打 dirty）
      const header = target.closest('.resume-sheet__header');
      if (header) {
        // 标记第一个 page 为 dirty（header 总在第一页）
        const firstPage = this.container.querySelector('.resume-page');
        if (firstPage) {
          firstPage.dataset.dirty = 'true';
        }
      }
    });
  }

  /**
   * 处理编辑失焦
   * @private
   */
  _handleEditBlur() {
    // 同步 model
    this.syncFromEditable();
    
    // 触发回调
    if (this.options.onModelChange) {
      this.options.onModelChange(this.model);
    }

    // 检查是否需要重排（dirty check）
    const dirtySections = this.container.querySelectorAll('.resume-section[data-dirty="true"]');
    const dirtyPages = this.container.querySelectorAll('.resume-page[data-dirty="true"]');
    
    if (dirtySections.length > 0 || dirtyPages.length > 0) {
      // 清除 dirty 标记
      dirtySections.forEach(el => el.removeAttribute('data-dirty'));
      dirtyPages.forEach(el => el.removeAttribute('data-dirty'));
      
      // 防抖重排
      this._debouncedRefresh();
    }
  }

  /**
   * 防抖刷新
   * @private
   */
  _debouncedRefresh() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.refreshLayout();
    }, this.options.debounceMs);
  }

  /**
   * 启动 ResizeObserver
   * @private
   */
  _startResizeObserver() {
    if (this.resizeObserver) return;
    
    this.resizeObserver = new ResizeObserver(() => {
      // 分屏切换主要是容器尺寸变化，这里只更新显示缩放，避免频繁重排
      this._updateViewportScale();
    });
    
    this.resizeObserver.observe(this.container);
  }

  /**
   * 停止 ResizeObserver
   * @private
   */
  _stopResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速分页渲染（无需管理实例）
 * @param {HTMLElement} container 
 * @param {Object} model 
 * @param {PaginatorOptions} options 
 * @returns {ResumePaginator}
 */
export function createPaginator(container, model, options = {}) {
  const paginator = new ResumePaginator(container, options);
  paginator.render(model);
  return paginator;
}

// ==================== 默认导出 ====================

export default ResumePaginator;
