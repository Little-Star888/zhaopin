# 工作包 M1-N3-WP2：M1 后端验收

> 目标：作为 M1 里程碑的最终门禁，确认后端基建全部就绪。
> 角色：测试/检验
> 预估改动量：0 行（纯检测，不改代码）

## 1. 前置条件

- M1-N3-WP1（API 契约文档）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/plans/DASHBOARD_API_CONTRACT.md` | 验收基准文档 |

## 3. 验收清单

### 3.1 DB 层

- [ ] Controller 启动后自动迁移到 V6，无报错
- [ ] `scraped_jobs` 表结构正确（18 个字段 + UNIQUE + 2 索引）
- [ ] `resumes` 表结构正确（5 个字段）
- [ ] UNIQUE(platform, platformJobId) 约束生效
- [ ] `schema_version` 表 V1-V6 无断层

```bash
sqlite3 data/zhaopin.db ".schema scraped_jobs"
sqlite3 data/zhaopin.db ".schema resumes"
sqlite3 data/zhaopin.db "SELECT version FROM schema_version ORDER BY version;"
```

### 3.2 API 端点（7 个全部冒烟）

```bash
# Jobs (4)
curl -s http://127.0.0.1:7893/api/jobs
curl -s "http://127.0.0.1:7893/api/jobs/detail?id=1"
curl -s -X POST -H "Content-Type: application/json" -d '{"id":1,"selected":true}' http://127.0.0.1:7893/api/jobs/select
curl -s http://127.0.0.1:7893/api/delivery/selected

# Resume (3)
curl -s -F "file=@test.pdf" http://127.0.0.1:7893/api/resume/upload
curl -s http://127.0.0.1:7893/api/resume
curl -s -X DELETE "http://127.0.0.1:7893/api/resume?id=1"
```

### 3.3 CORS

```bash
curl -s -I -H "Origin: chrome-extension://abcdefghijklmnopqrstuvwxyz123456" http://127.0.0.1:7893/api/jobs
curl -s -I -H "Origin: http://evil.com" http://127.0.0.1:7893/api/jobs
```
- [ ] chrome-extension:// origin 通过
- [ ] localhost origin 通过
- [ ] 非白名单 origin 被拒绝

### 3.4 契约文档

- [ ] `DASHBOARD_API_CONTRACT.md` 存在
- [ ] 7 个端点全部列出，pathname/method/参数/响应与实际代码一致
- [ ] 文档不包含后端源码

### 3.5 回归

```bash
curl -s http://127.0.0.1:7893/api/status
```
- [ ] 现有 `/api/status`、`/api/tasks` 正常
- [ ] 采集链路不受影响

### 3.6 工作树

```bash
cd /home/xixil/kimi-code/zhaopin && git status
```
- [ ] 新增文件：`jobs-db.js`, `resume-db.js`, `jobs-handler.js`, `resume-handler.js`, `DASHBOARD_API_CONTRACT.md`
- [ ] 修改文件：`db.js`, `server.js`, `package.json`
- [ ] 无未跟踪的临时文件

## 4. 通过标准

- 上述全部通过
- 可以启动 M2 前端里程碑

## 5. 通过后动作

- 更新节点状态：M1-N3 → `[done]`
- 更新里程碑状态：M1 → `[done]`
- M2 前端只需读取 `DASHBOARD_API_CONTRACT.md`，不读后端源码

## 6. 边界（不做什么）

- 不修改任何代码
- 不新增文件
- 不启动前端
