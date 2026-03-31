/**
 * Resume Layout Constants - 版芯参数标准化
 * @module resume-layout-constants
 * 
 * 设计原则：
 * 1. 所有版芯尺寸、字体、间距统一从此文件导出
 * 2. 前端分页和导出 PDF 共用同一套参数
 * 3. 支持按模板 ID 覆盖参数
 */

// ==================== 基础物理尺寸 ====================

/** A4 纸张尺寸 (mm) */
export const A4_DIMENSIONS = {
  width: 210,
  height: 297
};

/** 标准页边距 (mm) - 上下左右 */
export const PAGE_MARGIN = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
};

/** 版芯尺寸 (mm) - 内容区域 */
export const CONTENT_BOX = {
  width: A4_DIMENSIONS.width - PAGE_MARGIN.left - PAGE_MARGIN.right,
  height: A4_DIMENSIONS.height - PAGE_MARGIN.top - PAGE_MARGIN.bottom
};

// ==================== 字体大小阶梯 (pt) ====================

/** 基础字体配置 */
export const FONT_SIZES = {
  name: 18,           // 姓名
  headline: 12,       // 求职意向
  meta: 10,           // 元信息
  sectionTitle: 12,   // 区块标题
  body: 10.5,         // 正文
  small: 9            // 辅助文字
};

/** 行高系数 */
export const LINE_HEIGHT = {
  tight: 1.4,    // 紧凑（header 区域）
  normal: 1.6,   // 标准（正文）
  relaxed: 1.8   // 宽松（列表项间）
};

/** 字间距 */
export const LETTER_SPACING = {
  normal: 0,
  wide: 0.02     // em
};

// ==================== 间距参数 (mm) ====================

/** 区块间距 */
export const SECTION_SPACING = {
  before: 4,      // 区块前间距
  after: 2,       // 区块后间距
  titleGap: 2     // 标题与内容间距
};

/** 列表项间距 */
export const ITEM_SPACING = {
  between: 1.5,   // 列表项之间
  indent: 0       // 缩进（timeline 用）
};

/** Header 区域间距 */
export const HEADER_SPACING = {
  nameToHeadline: 2,    // 姓名到求职意向
  headlineToMeta: 1.5,  // 求职意向到元信息
  metaToSummary: 3      // 元信息到个人概况
};

// ==================== 模板特定参数 ====================

/** Structured 模板参数 */
export const STRUCTURED_PARAMS = {
  fontSizes: { ...FONT_SIZES },
  lineHeight: { ...LINE_HEIGHT },
  sectionSpacing: { ...SECTION_SPACING },
  itemSpacing: { ...ITEM_SPACING },
  headerSpacing: { ...HEADER_SPACING }
};

/** Timeline 模板参数 */
export const TIMELINE_PARAMS = {
  fontSizes: {
    ...FONT_SIZES,
    body: 10  // timeline 正文稍小
  },
  lineHeight: {
    ...LINE_HEIGHT,
    normal: 1.5  // timeline 行高稍紧凑
  },
  sectionSpacing: { ...SECTION_SPACING },
  itemSpacing: {
    between: 2,   // timeline 项间距稍大
    indent: 4     // timeline 有左侧时间轴空间
  },
  headerSpacing: { ...HEADER_SPACING },
  timeline: {
    markerSize: 2,      // 时间点大小 (mm)
    markerGap: 1.5,     // 点到内容间距 (mm)
    lineWidth: 0.5,     // 时间轴线宽 (mm)
    periodExtraGap: 1   // 时间段额外间距 (mm)
  }
};

// ==================== 单位转换 ====================

const MM_TO_PT = 2.83465;  // 1mm = 2.83465pt
const PT_TO_PX = 1.33333;  // 1pt ≈ 1.333px (96 DPI)
const MM_TO_PX = MM_TO_PT * PT_TO_PX;

/**
 * 将 mm 转换为 pt
 * @param {number} mm 
 * @returns {number}
 */
export function mmToPt(mm) {
  return mm * MM_TO_PT;
}

/**
 * 将 mm 转换为 px
 * @param {number} mm 
 * @returns {number}
 */
export function mmToPx(mm) {
  return mm * MM_TO_PX;
}

/**
 * 将 pt 转换为 px
 * @param {number} pt 
 * @returns {number}
 */
export function ptToPx(pt) {
  return pt * PT_TO_PX;
}

// ==================== 模板参数获取 ====================

/**
 * 获取指定模板的完整参数
 * @param {'structured'|'timeline'} templateId 
 * @returns {object}
 */
export function getTemplateParams(templateId) {
  return templateId === 'timeline' ? TIMELINE_PARAMS : STRUCTURED_PARAMS;
}

/**
 * 获取指定模板的版芯高度 (px)
 * @param {'structured'|'timeline'} templateId 
 * @returns {number}
 */
export function getContentHeightPx(templateId) {
  return mmToPx(CONTENT_BOX.height);
}

/**
 * 获取指定模板的版芯宽度 (px)
 * @param {'structured'|'timeline'} templateId 
 * @returns {number}
 */
export function getContentWidthPx(templateId) {
  return mmToPx(CONTENT_BOX.width);
}

// ==================== 高度计算辅助 ====================

/**
 * 计算文本行高 (px)
 * @param {number} fontSizePt - 字体大小 (pt)
 * @param {number} lineHeightRatio - 行高系数
 * @returns {number} - 行高 (px)
 */
export function calculateLineHeightPx(fontSizePt, lineHeightRatio) {
  return ptToPx(fontSizePt * lineHeightRatio);
}

/**
 * 计算元素预估高度
 * @param {Object} params
 * @param {number} params.fontSizePt
 * @param {number} params.lineHeightRatio
 * @param {number} params.lineCount
 * @param {number} params.paddingTopMm
 * @param {number} params.paddingBottomMm
 * @returns {number} - 预估高度 (px)
 */
export function estimateElementHeightPx({
  fontSizePt,
  lineHeightRatio,
  lineCount,
  paddingTopMm = 0,
  paddingBottomMm = 0
}) {
  const lineHeight = calculateLineHeightPx(fontSizePt, lineHeightRatio);
  const contentHeight = lineHeight * lineCount;
  const padding = mmToPx(paddingTopMm + paddingBottomMm);
  return contentHeight + padding;
}

// ==================== CSS 变量生成 ====================

/**
 * 生成 CSS 变量字符串，用于注入到分页容器
 * @param {'structured'|'timeline'} templateId 
 * @returns {string}
 */
export function generateCssVariables(templateId) {
  const params = getTemplateParams(templateId);

  // 粗野主义专用变量（structured 模板使用）
  const brutalistVars = templateId !== 'timeline' ? `
    --rp-color-red: #E62B1E;
    --rp-color-black: #1A1A1A;
    --rp-color-paper: #F4F0EA;
    --rp-color-yellow: #FFC72C;
    --rp-border-width-page: 3px;
    --rp-shadow-page: 12px 12px 0 rgba(0,0,0,0.12);
    --rp-font-family: 'Courier New', monospace;
  ` : '';

  return `
    --rp-a4-width: ${mmToPx(A4_DIMENSIONS.width)}px;
    --rp-a4-height: ${mmToPx(A4_DIMENSIONS.height)}px;
    --rp-page-margin: ${mmToPx(PAGE_MARGIN.top)}px;
    --rp-content-width: ${mmToPx(CONTENT_BOX.width)}px;
    --rp-content-height: ${mmToPx(CONTENT_BOX.height)}px;
    --rp-font-name: ${ptToPx(params.fontSizes.name)}px;
    --rp-font-headline: ${ptToPx(params.fontSizes.headline)}px;
    --rp-font-meta: ${ptToPx(params.fontSizes.meta)}px;
    --rp-font-section: ${ptToPx(params.fontSizes.sectionTitle)}px;
    --rp-font-body: ${ptToPx(params.fontSizes.body)}px;
    --rp-line-height-tight: ${params.lineHeight.tight};
    --rp-line-height-normal: ${params.lineHeight.normal};
    --rp-line-height-relaxed: ${params.lineHeight.relaxed};
    --rp-section-gap: ${mmToPx(params.sectionSpacing.before)}px;
    --rp-item-gap: ${mmToPx(params.itemSpacing.between)}px;
    ${brutalistVars}
  `.trim();
}

// ==================== 默认导出 ====================

export default {
  A4_DIMENSIONS,
  PAGE_MARGIN,
  CONTENT_BOX,
  FONT_SIZES,
  LINE_HEIGHT,
  SECTION_SPACING,
  ITEM_SPACING,
  HEADER_SPACING,
  STRUCTURED_PARAMS,
  TIMELINE_PARAMS,
  mmToPt,
  mmToPx,
  ptToPx,
  getTemplateParams,
  getContentHeightPx,
  getContentWidthPx,
  calculateLineHeightPx,
  estimateElementHeightPx,
  generateCssVariables
};
