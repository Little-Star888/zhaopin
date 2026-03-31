# 工作包 M14-N1-WP2：JS 防御性逻辑与决策留痕

> 目标：在 `toggleResumeMode()` 中添加防御性状态清理，并记录决策边界注释
> 角色：前端
> 预估改动量：~5行JS

## 1. 前置条件
- M14-N1-WP1 CSS 修复完成

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` 搜索 `function toggleResumeMode` | `toggleResumeMode()` 函数，添加防御性清理 |
| `crawler/extension/dashboard.js` 搜索 `function bindResumeDualModeEvents` | 默认工具栏事件绑定 |
| `crawler/extension/dashboard.js` 搜索 `function bindSplitEvents` | 分屏工具栏事件绑定 |

> **注意**：行号可能因代码变动而偏移，请以函数签名搜索定位为准。

## 3. 改动规格

### 改动 1：`toggleResumeMode()` 添加防御注释

在函数头部添加一行注释，声明职责边界：

```js
/**
 * 切换简历查看/编辑模式
 * ⚠️ 只管理 view/edit 互斥激活态，其他按钮不参与。
 * 后续若引入按钮开关态（如 AI 配置面板展开指示），
 * 须使用独立状态类（如 res-btn--toggled），不得复用 res-btn--active。
 */
function toggleResumeMode(mode, viewMode = 'default') {
```

### 改动 2（可选）：防御性清理

在 `toggleResumeMode()` 的 view/edit 切换逻辑之前，添加非 mode 按钮的 `--active` 清理：

```js
// 防御：清理非 mode 按钮上误加的 --active
const bar = document.getElementById(`${idPrefix}-res-bar`);
if (bar) {
    bar.querySelectorAll('.res-btn--active').forEach(btn => {
        if (!btn.id.endsWith('-btn-view') && !btn.id.endsWith('-btn-edit')) {
            btn.classList.remove('res-btn--active');
        }
    });
}
```

> **注意**：此改动为可选。如果团队认为当前风险可控，可以只做改动 1（注释），不做改动 2（运行时清理）。

## 4. 决策记录

本轮不改 JS 的完整逻辑，仅因采用最小修复策略。以下决策记录在代码注释中：

1. `res-btn--active` 仅用于 view/edit 互斥 Tab 态
2. 保存、AI优化、下载为瞬态动作，不应持有持久激活态
3. AI配置为开关态，若未来需要"已展开"指示，须引入 `res-btn--toggled`
4. 不得在任何动作按钮或开关按钮上复用 `res-btn--active`

## 5. 验证
- [ ] `toggleResumeMode()` 含职责边界注释
- [ ] 点击"查看"→"编辑"切换正常，红色互斥
- [ ] 点击"保存"/"AI配置"/"下载"不会持久变红
- [ ] 分屏工具栏（`sp-` 前缀）切换同样正常
