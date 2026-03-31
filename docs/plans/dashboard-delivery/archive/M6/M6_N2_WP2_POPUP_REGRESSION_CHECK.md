> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M6-N2-WP2：Popup 功能回归检测

> 目标：确认 M6 全部改动后，Popup 功能无回退
> 角色：测试/检验
> 预估改动量：0 行（纯检测）

## 1. 前置条件

- M6-N2-WP1 通过（轻量 Neumorphism 已实现）

## 2. 检测清单

### 2.1 视觉检测

| 检查项 | 状态 |
|--------|------|
| 卡片区域有轻微凸起感 | [ ] |
| 主按钮有外凸效果 | [ ] |
| 按钮按下有凹陷反馈 | [ ] |
| Toggle 切换流畅 | [ ] |
| 整体效果不拥挤 | [ ] |
| 背景为 Citron | [ ] |

### 2.2 功能回归

| 检查项 | 状态 |
|--------|------|
| "打开工作台" → Dashboard 新标签 | [ ] |
| "立即采集" → 正常触发 | [ ] |
| 所有 Toggle 可切换 | [ ] |
| 状态信息正常刷新 | [ ] |
| 进度条正常显示 | [ ] |
| 消息提示正常 | [ ] |

### 2.3 禁区检测

| 检查项 | 状态 |
|--------|------|
| `background.js` 无改动 | [ ] |
| `content.js` 无改动 | [ ] |
| `dashboard.*` 无改动 | [ ] |
| `controller/` 无改动 | [ ] |
| M1-M5 文档无改动 | [ ] |

## 3. 检测命令

```bash
# 基础：确认工作目录
cd /home/xixil/kimi-code/zhaopin

# 命令 1：确认禁区文件未被修改（应无输出）
git diff --name-only crawler/extension/background.js \
  crawler/extension/content.js \
  crawler/extension/dashboard.css \
  crawler/extension/dashboard.html \
  crawler/extension/dashboard.js \
  controller/

# 命令 2：确认 M1-M5 文档未被修改（应无输出）
git diff --name-only docs/plans/dashboard-delivery/milestones/ \
  docs/plans/dashboard-delivery/nodes/ \
  docs/plans/dashboard-delivery/workpacks/M4_*.md \
  docs/plans/dashboard-delivery/workpacks/M5_*.md

# 命令 3：确认 Neumorphism 阴影参数存在（暖色调）
grep -c 'rgba(199, 91, 74' crawler/extension/popup.css
```

## 4. 通过标准

- 上述全部检测项通过
- 检测命令全部返回预期结果
- 不允许"带病通过"

## 4. 边界

- 不修改任何代码
- 不做多平台测试
