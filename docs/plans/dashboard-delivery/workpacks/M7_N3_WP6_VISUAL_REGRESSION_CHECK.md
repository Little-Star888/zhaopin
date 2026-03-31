# 工作包 M7-N3-WP6：Dashboard 视觉回归检测

> 目标：验证 Dashboard Constructivism 改造的完整性和正确性
> 角色：测试/检验
> 预估改动量：0 行（纯测试）

## 1. 前置条件

- M7-N3-WP1 ~ WP5 全部通过

## 2. 测试检查项

### 2.1 全局视觉

- [ ] Dashboard 背景为米白色 `#F4F0EA`
- [ ] 无圆角（所有元素 border-radius: 0）
- [ ] 无阴影（所有元素 box-shadow: none）
- [ ] 无毛玻璃效果（无 backdrop-filter）
- [ ] 无渐变（无 linear-gradient）

### 2.2 首页 Grid 布局

- [ ] 4 列网格，黑色间隙分隔
- [ ] 相邻卡片颜色不同
- [ ] SVG 图形可见且不重复（12个）
- [ ] 卡片大小有差异（span 2）

### 2.3 手风琴展开

- [ ] 点击卡片 fixed 居中放大
- [ ] scale 动画流畅
- [ ] 排他性：同时只展开一个
- [ ] ESC / 遮罩关闭正常

### 2.4 工作台

- [ ] 7fr/3fr 默认布局
- [ ] 50/50 分屏布局
- [ ] 简历 HTML 渲染正常
- [ ] 简历 Markdown 编辑正常
- [ ] 保存编辑功能正常

### 2.5 代码清洁度

- [ ] `dashboard.css` 无 `box-shadow`、`backdrop-filter`、`border-radius`、`linear-gradient`
- [ ] `dashboard.js` 无 `.neu-*`、`.glass-*` 类名
- [ ] 无 `openModal`、`closeModal`、`currentModalJobId` 残留
