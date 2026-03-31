# 工作包 M7-N1-WP3：Popup JS 类名迁移

> 目标：将 popup.js 中引用的旧视觉类名迁移为 SMACSS 状态类名
> 角色：前端
> 预估改动量：修改 ~10 行

## 1. 前置条件

- M7-N1-WP2 通过（CSS 已重写）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.js` 全文 | 所有 classList 操作 |

## 3. 改动规格

### 3.1 搜索所有 classList 操作

在 `popup.js` 中搜索以下模式：
- `classList.add`
- `classList.remove`
- `classList.toggle`
- `className`
- `classList.contains`

### 3.2 类名映射表

| 旧类名（如在代码中出现） | 新类名 | 说明 |
|--------------------------|--------|------|
| `.active` (toggle) | `.is-active` | SMACSS 状态前缀 |
| `.show` (message) | `.is-visible` | 更语义化的状态名 |
| 其他 `.neu-*` / `.glass-*` | 删除 | 无替代，CSS 已处理 |

### 3.3 注意事项

- 只修改 JS 中动态添加/移除的类名
- 不修改 HTML 中静态写死的类名（那属于 popup.html 的范围）
- 如果 popup.js 中没有 `.neu-*` / `.glass-*` 引用，只需确认并记录"无残留"

## 4. 验证

- [ ] 全局搜索 `.neu-`、`.glass-`，确认 popup.js 中无残留
- [ ] 点击功能开关（toggle），确认样式正确切换
- [ ] 触发消息提示（message），确认正确显示和隐藏
