> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M6-N1-WP2：Popup 功能冒烟检测

> 目标：确认 CSS 提取和换色后，Popup 所有功能正常
> 角色：测试/检验
> 预估改动量：0 行（纯检测）

## 1. 前置条件

- M6-N1-WP1 通过

## 2. 检测清单

### 2.1 外观检测

| 检查项 | 状态 |
|--------|------|
| Popup 打开无 CSP 报错 | [ ] |
| 背景为 Citron 色调 | [ ] |
| Header 为 Orange Rust → Pink Dogwood 渐变 | [ ] |
| 主按钮为 Orange Rust | [ ] |
| 次要按钮为 Citron 变体 | [ ] |
| Toggle active 为 Orange Rust | [ ] |
| 文字清晰可读 | [ ] |

### 2.2 功能检测

| 检查项 | 状态 |
|--------|------|
| "打开工作台"按钮 → Dashboard 在新标签打开 | [ ] |
| "立即采集"按钮可见 | [ ] |
| "配置设置"按钮可见 | [ ] |
| "刷新Cookie"按钮可见 | [ ] |
| 自动定时采集 Toggle 可切换 | [ ] |
| AI简历匹配 Toggle 可切换 | [ ] |
| 推送飞书通知 Toggle 可切换 | [ ] |
| 状态信息正常显示 | [ ] |

## 3. 检测步骤

```bash
# 基础：确认工作目录
cd /home/xixil/kimi-code/zhaopin

# 步骤 1：确认 popup.css 文件存在
ls -la crawler/extension/popup.css

# 步骤 2：确认 popup.html 中无内联 style 块（应返回 0）
grep -c '<style>' crawler/extension/popup.html

# 步骤 3：确认 popup.html 引用了 popup.css
grep -c 'popup.css' crawler/extension/popup.html

# 步骤 4：确认无旧绿色 #00b578 残留（应返回 0）
grep -c '#00b578\|#00a066' crawler/extension/popup.css
```

## 4. 通过标准

- 上述全部检测项通过
- 检测命令全部返回预期结果
- Console 无错误

## 4. 边界

- 不修改任何代码
- 不检测 Dashboard（M4 范围）
