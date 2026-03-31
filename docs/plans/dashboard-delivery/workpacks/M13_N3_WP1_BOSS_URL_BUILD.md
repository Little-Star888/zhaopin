# 工作包 M13-N3-WP1：Boss URL 构造

> 目标：在 content.js 中构造 Boss 岗位原链接
> 角色：后端
> 预估改动量：~5行JS

## 1. 前置条件
- M13-N1 通过（采集控制链路稳定）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/content.js` L54-67 | `jobList.map()` 提取逻辑（当前未构造 url 字段） |

## 3. 改动规格

- **最终方案**：系统认定的 Boss 可访问原链接 = 基于 `encryptJobId` + `securityId` 构造出的详情页 URL
- 在 `jobList.map()` 中增加 url 字段构造：
  ```js
  url: `https://www.zhipin.com/job_detail/${job.encryptJobId}.html?securityId=${job.securityId}`
  ```
- `encryptJobId` 和 `securityId` 已在现有提取逻辑中获取，无需额外 DOM 操作
- 如果字段缺失（极端情况），url 设为 `null`，前端显示"暂无原链接"

## 4. 验证
- [ ] Boss 岗位入库后 url 字段非 null
- [ ] 构造的 URL 在浏览器中可正常访问
- [ ] 无 url 字段的岗位显示"暂无原链接"
