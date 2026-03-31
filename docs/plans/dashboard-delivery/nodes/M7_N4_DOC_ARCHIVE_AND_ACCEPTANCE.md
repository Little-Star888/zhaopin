# 节点 M7-N4：文档归档与验收

> 状态：待开始
> 归属里程碑：M7
> 目标：归档 M4/M6 旧文档，新建 M7 规范文档，执行端到端验收

---

## 业务角色导航

### 文档
- [ ] [M7-N4-WP1 M4/M6 文档归档](../workpacks/M7_N4_WP1_DOC_ARCHIVE.md)
- [ ] [M7-N4-WP2 M7 规范文档新建](../workpacks/M7_N4_WP2_M7_DOCS_CREATE.md)

### 测试/检验
- [ ] [M7-N4-WP3 端到端验收](../workpacks/M7_N4_WP3_E2E_ACCEPTANCE.md)

## 前置条件

- M7-N1、M7-N2、M7-N3 全部通过

## 边界

- 只操作文档文件
- 不修改任何代码
- 旧文档移动到 `archive/` 目录，不删除

## 验收标准

- [ ] 6 个 M4/M6 旧文档已移至 `archive/M4/` 和 `archive/M6/`
- [ ] 旧文档顶部有 DEPRECATED 标记和指向新文档的链接
- [ ] M7 规范文档已创建且内容准确
- [ ] 端到端验收通过：Popup + Dashboard 全功能正常
