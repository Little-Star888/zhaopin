# 工作包 M16-N2-WP1：前端新增"全部"选项

> 目标：采集平台下拉框新增"全部"选项
> 角色：前端
> 预估改动量：~1行HTML

## 1. 前置条件
- M16-N1 通过（AI 配置页面清理完成）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` L24-29 | `<select id="crawl-platform">` 当前选项列表 |

## 3. 改动规格
- 在 `<select id="crawl-platform">` 中新增第一个选项：
  ```html
  <option value="all">全部</option>
  ```
- 不修改 JS 逻辑（`platform` 值会自动取到 `'all'`，传给后端）
- 不设为默认选中（保持 boss 为默认值，避免误触全平台采集）

## 4. 验证
- [ ] 下拉框第一个选项为"全部"
- [ ] 默认选中仍为"Boss直聘"
- [ ] 选择"全部"后，点击开始采集，`START_CRAWL` 消息的 `platform` 值为 `'all'`
