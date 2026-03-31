# 里程碑 M4：UI/UX 视觉重构

> 状态：待开始
> 对应 PRD 阶段：Phase A 补充
> 前置里程碑：M3（扩展入口与收口）
> 规划日期：2026-03-25

---

## 1. 里程碑目标

在 M1-M3 已冻结的基线上，通过向前追加（Roll-forward）的方式对 Dashboard UI 进行视觉重构：
1. 将 8 色变量替换为 6 个 PANTONE 色体系
2. 引入基于 Citron 基底色的暖色调 Neumorphism
3. 工作台布局从 50/50 反转为 70/30（待投递左 70%，简历右 30%）

## 2. 范围边界

### 允许修改

| 文件 | 说明 |
|------|------|
| `crawler/extension/dashboard.css` | 色值变量、阴影参数、布局比例 |
| `crawler/extension/dashboard.html` | 面板 HTML 顺序 |
| `crawler/extension/dashboard.js` | `loadResumeView()` 中 innerHTML 模板 |

### 禁止修改

| 范围 | 原因 |
|------|------|
| `controller/` 目录 | 后端逻辑不属于 M4 范围 |
| M1/M2/M3 里程碑/节点/WP 文档 | 已冻结，不回退 |
| 多平台抽象代码 | 属于 M5 范围 |
| `manifest.json` / `popup.*` | M3 已完成，不重开 |

## 3. 节点列表

| 节点 | 标题 | 状态 |
|------|------|------|
| [M4-N1](../nodes/M4_N1_COLOR_AND_NEUMORPHISM.md) | PANTONE 色值体系 + Neumorphism 暖色阴影 | 待开始 |
| [M4-N2](../nodes/M4_N2_LAYOUT_AND_VALIDATION.md) | 布局反转 + 视觉回归检测 | 待开始 |

## 4. 设计决策记录

### 4.1 色值体系

- 基底色：Citron (#E6E6A1)
- 6 个 PANTONE 色为唯一色相来源
- 唯一额外色：深色文字色 #333333 / #666666（用户批准，WCAG AA 达标）
- 旧 8 色变量全部删除

### 4.2 Neumorphism 阴影

- 使用 PANTONE 暖色调阴影（非经典 rgba 黑白阴影）
- 高光：Primrose Yellow (#FDE798) 低透明度
- 暗影：Orange Rust (#C75B4A) 低透明度
- 参考：https://neumorphism.io/ 的交互模式

### 4.3 布局

- 工作台从 50/50 改为 70/30
- 待投递面板移到左侧（70%）
- 简历管理面板移到右侧（30%）
- HTML 顺序需同步调换

## 5. 通过标准

- 所有 M4 工作包 checkbox 通过
- 视觉回归检测无回退
- 不触碰禁止修改的文件
- M1-M3 里程碑文档状态不变

## 6. 讨论文档

完整的三方讨论记录：[M4_M5_PLANNING_DISCUSSION.md](../M4_M5_PLANNING_DISCUSSION.md)
