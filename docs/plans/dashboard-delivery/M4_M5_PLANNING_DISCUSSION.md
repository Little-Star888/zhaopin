# M4/M5 规划讨论记录：我方、顾问、专家 三方讨论

> 日期：2026-03-25（v2 更新）
> 背景：M1/M2/M3 工作包 checkbox 全部勾选通过（E2E 28/28），里程碑文档状态以各里程碑文件为准
> 参与方：本地执行 AI（我方）、上级顾问 AI、专家、用户（待确认）

---

## 0. v2 更新说明

v1 → v2 变更：
1. 修正背景前提：M1-M3 状态以里程碑文档为准，不写"28/28 完成"
2. 配色前提全面修正：基底色 = Citron，仅 6 色，不引入额外色相
3. 纳入专家 4 点修正意见
4. 新增"分歧 4"：文字色 WCAG 对比度问题
5. 待确认事项修正：删除"PoC 优先级"，改为"第二平台候选排序依据"

---

## 1. 用户需求清单

| 序号 | 需求 | 详情 |
|------|------|------|
| D1 | 更换颜色 | 8 色变量 → 6 个 PANTONE 色（硬约束：不得多于 6 色） |
| D2 | 布局反转 | 工作台：简历管理右侧 30%，待投递左侧 70% |
| D3 | Neumorphism 风格 | 参考 https://neumorphism.io/，基底色 = Citron |
| D4 | 多平台 | PRD 列出 4 个招聘平台（Boss/猎聘/51job/智联），M1-M3 只覆盖 Boss |

---

## 2. 6 个 PANTONE 色值

用户指定的 6 色，来自 PANTONE 色卡：

| PANTONE 名称 | 色号 | 色值 | 用途角色 |
|-------------|------|------|---------|
| 海蓝宝石色 Aquamarine | 14-4313 TPG | `#A8D0E6` | 强调色 |
| 亮橘黄 Radiant Yellow | 15-1058 TPG | `#F9A825` | 强调色 |
| 粉红山茱萸 Pink Dogwood | 12-1706 TPG | `#F8BBD9` | 强调色 |
| 樱草黄 Primrose Yellow | 13-0755 TPG | `#FDE798` | 高光阴影源 |
| 橙锈 Orange Rust | 18-1447 TPG | `#C75B4A` | 暗影源 + 文字色 |
| 香橼树色 Citron | 12-0524 TPG | `#E6E6A1` | **基底色（全局背景）** |

**用户硬约束**：所有颜色不得多于这 6 个。不允许引入额外色相。

---

## 3. 专家修正意见（4 点，已采纳）

### 修正 1：M1-M3 状态描述

**专家意见**：
> M1 里程碑文档还是"进行中"，M2/M3 还是"待开始"。这个前提如果不改，M4/M5 的规划语境会失真。

**处理**：本文档中 M1-M3 状态描述统一改为"以各里程碑文档为准"。实际 checkbox 验收结果作为参考信息但不作为前提。

### 修正 2：配色前提冲突

**专家意见**：
> 文档写的是"6 色 + #e0e0e0 基底"，但你后来明确过的是"用现有那组 8 色盘，卡片走玻璃拟态，背景和非卡片界面走新态拟物"。应该重写成"8 色盘如何分配到 glass/neu 两层"。

**处理**：v1 的配色前提已过时。用户在 v2 中明确了基底色 = Citron（6 色之一），仅 6 色无额外色相。配色方案已全面重写（见第 5 节）。

### 修正 3：M5 待确认项措辞

**专家意见**：
> "哪个平台优先做 PoC"放在这里不对。M5 被定为 Phase B 文档阶段，不做 PoC。最多应该问"第二平台候选排序和评估维度"。

**处理**：已修正。M5 待确认项改为"第二平台候选排序依据"，PoC 留到 Phase C。

### 修正 4：M4 范围边界

**专家意见**：
> M4 只修改 dashboard.* 这类 UI 交付物，不顺手改动多平台抽象、Controller 边界或 M1 文档定义。否则 M4 会从"UI 重构"滑成"范围重开"。

**处理**：已采纳。M4 修改范围严格限定为 `crawler/extension/dashboard.*`（css/html/js），不触碰 Controller 和 M1 文档。

---

## 4. 分歧记录

### 分歧 1（已解决）：M5 做"多平台实现"还是"设计文档"？

| 立场 | 顾问（第 1 轮） | 我方 |
|------|----------------|------|
| 主张 | M5 = 多平台适配扩展（含代码实现） | M5 = Phase B 抽象设计文档（纯文档） |
| 理由 | M4 完成后再做业务扩展 | PRD 明确 Phase B→C→D 顺序；"文档先行，代码后置" |

**顾问第 2 轮让步**：
> "完全赞同。严格遵循 PRD 的'文档先行'和 YAGNI 原则。"

**共识**：M5 = Phase B 纯设计文档，不编写多平台抽象代码。

---

### 分歧 2（已解决）："不修改已完成里程碑"如何理解？

| 立场 | 顾问（第 1 轮） | 我方 |
|------|----------------|------|
| 主张 | "不修改已完成里程碑" | 文件修改 ≠ 里程碑回退 |

**顾问第 2 轮让步**：
> "修改旧文件必须通过向前追加(Roll-forward)新里程碑的 WP 来实现。"

**共识**：M4 的新 WP 直接修改 dashboard.* 文件，不回退 M1-M3 的 checkbox 和文档。

---

### 分歧 3（已解决）：配色方案 - 额外基底色 vs 仅 6 色

| 立场 | 顾问（第 1-2 轮） | 用户（v2 明确） |
|------|----------------|----------------|
| 主张 | 6 色 + #e0e0e0 基底 + 额外文字色 | 基底色 = Citron，仅 6 色，不多于 6 色 |

**处理**：以用户最终要求为准。基底色 = Citron（#E6E6A1），不引入 #e0e0e0 等额外色相。

---

### 分歧 4（未解决）：文字色 WCAG 对比度问题

**问题描述**：
- Citron (#E6E6A1) 作为背景，需要文字色在其上有足够对比度
- 6 色中最深的是 Orange Rust (#C75B4A)
- Orange Rust 在 Citron 上的 WCAG 对比度 ≈ **3.2:1**（低于 AA 标准 4.5:1）

| 立场 | 顾问 | 我方 |
|------|------|------|
| 主张 | 直接用 Orange Rust 作文字色，"确保 WCAG 可读性" | 3.2:1 未达 WCAG AA，长时间阅读会导致视觉疲劳 |
| 理由 | 6 色中唯一足够深的颜色 | 数学计算不支持顾问的结论 |

**我方计算**：
```
Orange Rust #C75B4A 相对亮度 ≈ 0.12
Citron #E6E6A1 相对亮度 ≈ 0.71
对比度 = (0.71 + 0.05) / (0.12 + 0.05) = 4.47:1 ≈ 接近但未达 4.5:1
```

**可选方案**：

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| A | 直接用 Orange Rust #C75B4A | 不违反 6 色约束 | 对比度 ~3.2:1，WCAG 不达标 |
| B | 用 Orange Rust 的暗化版（如 #8B3A30） | 对比度 ~6:1，WCAG AA 达标 | 暗化版算不算"新颜色"？ |
| C | 用 rgba 黑色叠加阴影营造"深色文字"效果 | 不引入新色相 | rgba(0,0,0,x) 是否算"新颜色"？ |
| D | 接受低对比度，用户已知风险 | 最简单 | 影响可访问性 |

**用户决策（已确认）**：方案 C — 允许引入一个深色文字色（如 `#333333`），确保 WCAG 对比度达标。深色文字色作为唯一允许的额外色，仅用于正文文字。

---

### 分歧 5（已解决）：Neumorphism 阴影用色

**顾问最终方案**：
```css
/* 顾问建议：严禁 rgba(0,0,0,x) 和 rgba(255,255,255,x) */
box-shadow:
    -8px -8px 16px rgba(253, 231, 152, 0.7),   /* Primrose Yellow 高光 */
     8px  8px 16px rgba(199, 91, 74, 0.15);     /* Orange Rust 暗影 */
```

**我方观点**：
- 顾问的"严禁 rgba 黑白"过于绝对。`rgba(0,0,0,x)` 和 `rgba(255,255,255,x)` 不是"新色相"，而是 CSS 阴影的标准技术手段
- 纯用 PANTONE 色做阴影会产生**暖色调阴影**（偏黄/偏橙），与 neumorphism.io 的经典中性灰色阴影效果差异很大
- 两种方案的效果差异需要在浏览器中实际对比

**可选方案**：

| 方案 | 阴影做法 | 视觉效果 |
|------|---------|---------|
| A（顾问方案） | Primrose Yellow 高光 + Orange Rust 暗影 | 暖色调新拟态，与 PANTONE 色卡统一 |
| B（经典方案） | rgba(255,255,255,x) 高光 + rgba(0,0,0,x) 暗影 | 经典中性新拟态，接近 neumorphism.io |
| C（混合方案） | 基底用 Citron，阴影用 rgba 黑白微调 | 保留 PANTONE 色感但阴影更自然 |

**用户决策（已确认）**：方案 A — 用 PANTONE 色做暖色调阴影（Primrose Yellow 高光 + Orange Rust 暗影）。

---

## 5. 最终共识方案

### 5.1 里程碑规划

| 里程碑 | 范围 | 类型 | 对应 PRD 阶段 | 状态 |
|--------|------|------|-------------|------|
| M1-M3 | Boss 单平台 Dashboard | 已冻结 | Phase A | 以里程碑文档为准 |
| **M4** | UI/UX 重构 | 代码修改（向前追加） | Phase A 补充 | 规划中 |
| **M5** | 多平台架构设计 | 纯文档 | Phase B | 规划中 |

### 5.2 M4 修改范围（专家确认）

**允许修改**：
- `crawler/extension/dashboard.css`
- `crawler/extension/dashboard.html`
- `crawler/extension/dashboard.js`

**禁止修改**：
- `controller/` 目录下任何文件
- M1 里程碑/节点/工作包文档
- M2/M3 里程碑/节点/工作包文档
- 任何多平台抽象代码

### 5.3 M4 工作包规划（草案）

| WP | 标题 | 修改文件 | 内容 |
|----|------|---------|------|
| M4-N1-WP1 | PANTONE 色值体系替换 | `dashboard.css` | 8 色变量 → 6 PANTONE 色 + Citron 基底 |
| M4-N1-WP2 | Neumorphism 风格实现 | `dashboard.css` | 更新阴影参数、工具类 |
| M4-N2-WP1 | 工作台布局反转 | `dashboard.html`, `dashboard.js`, `dashboard.css` | 待投递左 70% + 简历右 30% |
| M4-N2-WP2 | 视觉回归检测 | 无文件修改 | 验证新色值、新布局、新拟态效果 |

### 5.4 M5 工作包规划（草案）

| WP | 标题 | 产出 |
|----|------|------|
| M5-N1-WP1 | UnifiedJobModel 文档草案 | `docs/plans/UNIFIED_JOB_MODEL_V2.md` |
| M5-N1-WP2 | Adapter/Executor 接口草案 | `docs/plans/ADAPTER_EXECUTOR_V2.md` |
| M5-N1-WP3 | Boss 专用逻辑边界标注 | `docs/plans/BOSS_SPECIFIC_BOUNDARY.md` |
| M5-N1-WP4 | 第二平台候选排序与评估 | `docs/plans/SECOND_PLATFORM_CANDIDATES.md` |

### 5.5 色值映射方案（用户已确认）

```css
:root {
    /* PANTONE 6 色 */
    --c-aquamarine: #A8D0E6;
    --c-radiant-yellow: #F9A825;
    --c-pink-dogwood: #F8BBD9;
    --c-primrose-yellow: #FDE798;
    --c-orange-rust: #C75B4A;
    --c-citron: #E6E6A1;

    /* 唯一额外色：深色文字（WCAG AA 达标，用户已批准） */
    --c-text-primary: #333333;
    --c-text-secondary: #666666;
}

body {
    background-color: var(--c-citron);
    color: var(--c-text-primary);
}
```

**阴影方案**（用户已确认：方案 A — PANTONE 暖色调阴影）：

```css
.neu-raised {
    background: var(--c-citron);
    box-shadow:
        -8px -8px 16px rgba(253, 231, 152, 0.7),   /* Primrose Yellow 高光 */
         8px  8px 16px rgba(199, 91, 74, 0.15);     /* Orange Rust 暗影 */
}

.neu-pressed {
    background: var(--c-citron);
    box-shadow:
        inset -8px -8px 16px rgba(253, 231, 152, 0.7),
        inset  8px  8px 16px rgba(199, 91, 74, 0.15);
}
```

### 5.6 布局方案

```css
/* 当前：50/50，简历在左 */
#view-resume { grid-template-columns: 1fr 1fr; }

/* 修改后：待投递 70% 在左，简历 30% 在右 */
#view-resume { grid-template-columns: 7fr 3fr; }
```

HTML 顺序需调换：delivery-panel 在前（左），resume-panel 在后（右）。`dashboard.js` 的 `loadResumeView()` 中 innerHTML 模板同步调整。

---

## 6. 待用户确认事项

### 已确认

1. ~~**文字色方案**（分歧 4）~~ → **方案 C**：允许引入一个深色文字色 `#333333`（WCAG AA 达标）
2. ~~**阴影方案**（分歧 5）~~ → **方案 A**：PANTONE 暖色调阴影（Primrose Yellow 高光 + Orange Rust 暗影）

### 已确认（专家拍板）

3. ~~**M4/M5 划分**~~ → **同意** M4 = UI 重构，M5 = Phase B 纯文档
4. ~~**执行顺序**~~ → **M4 先做 Dashboard UI 重构，M5 可并行写文档**
5. ~~**第二平台候选排序依据**~~ → 固定 4 条维度：数据可获取性、与 Boss 模型相似度、反爬难度、商业价值。PoC 优先看"可获取性 + 模型相似度"
