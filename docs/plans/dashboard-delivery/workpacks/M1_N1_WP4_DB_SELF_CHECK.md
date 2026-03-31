# 工作包 M1-N1-WP4：DB 自检

> 目标：在进入 API 节点前，把 DB 层（WP2 + WP3）单独验掉。
> 角色：测试/检验
> 预估改动量：0 行（纯检测，不改代码）

## 1. 前置条件

- M1-N1-WP2（scraped_jobs 表）已完成
- M1-N1-WP3（resumes 表）已完成

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | 确认 V5、V6 migration 已写入 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q10 | 清空策略、崩溃恢复的验收依据 |

## 3. 检测动作（按顺序执行）

### 3.1 Migration 自动执行

```bash
cd /home/xixil/kimi-code/zhaopin/controller
node -e "const db = require('./db'); db.initDatabase(); console.log('OK');"
```
- 预期：无报错，输出 OK
- 失败：检查 db.js 语法或 SQL 错误

### 3.2 表结构验证

```bash
sqlite3 data/zhaopin.db ".schema scraped_jobs"
sqlite3 data/zhaopin.db ".schema resumes"
```
- `scraped_jobs`：18 个字段 + UNIQUE(platform, platformJobId) + 2 个索引
- `resumes`：5 个字段（id, file_name, file_path, file_size, upload_time）

### 3.3 索引验证

```bash
sqlite3 data/zhaopin.db ".indices scraped_jobs"
```
- 预期：`idx_scraped_jobs_status`、`idx_scraped_jobs_platform_job`

### 3.4 Schema Version 验证

```bash
sqlite3 data/zhaopin.db "SELECT version, description FROM schema_version ORDER BY version;"
```
- 预期：V1-V6 全部存在，无断层

### 3.5 UNIQUE 约束验证（插入重复数据）

```bash
node -e "
const jobsDb = require('./jobs-db');
const r1 = jobsDb.insertJob({platform:'boss',platformJobId:'J001',title:'测试',company:'测试公司'});
console.log('第一次插入:', r1);
const r2 = jobsDb.insertJob({platform:'boss',platformJobId:'J001',title:'重复',company:'重复公司'});
console.log('重复插入:', r2);
"
```
- 预期：第一次成功，第二次因 UNIQUE 约束失败

### 3.6 条件清理验证

```bash
node -e "
const jobsDb = require('./jobs-db');
// 插入 3 条，选中 1 条
jobsDb.insertJob({platform:'boss',platformJobId:'C1',title:'A',company:'C1'});
jobsDb.insertJob({platform:'boss',platformJobId:'C2',title:'B',company:'C2'});
jobsDb.insertJob({platform:'boss',platformJobId:'C3',title:'C',company:'C3'});
jobsDb.updateSelected(2, true);  // 假设 id=2 是 B
const before = jobsDb.getJobCount({});
jobsDb.clearUnselectedJobs();
const after = jobsDb.getJobCount({});
console.log('清理前:', before.count, '清理后:', after.count);
// 预期：清理前3，清理后1（只有 selected=true 的 B 保留）
"
```

### 3.7 幂等验证（重复执行 migration）

```bash
node -e "const db = require('./db'); db.initDatabase(); db.initDatabase(); console.log('幂等OK');"
```
- 预期：无报错，schema_version 不重复插入

### 3.8 回归验证（现有表不受影响）

```bash
sqlite3 data/zhaopin.db "SELECT COUNT(*) FROM delivery_queue;"
```
- 预期：返回数字（不报错），确认 delivery_queue 表完好

## 4. 通过标准

- 上述 8 项检测全部通过
- 无新增的 `console.error` 或异常堆栈
- `delivery_queue` 表结构未被修改

## 5. 失败处理

- 若 UNIQUE 约束验证失败 → 回到 M1-N1-WP2 检查建表 SQL
- 若条件清理验证失败 → 回到 M1-N1-WP2 检查 `clearUnselectedJobs` 实现
- 若幂等验证失败 → 回到对应 WP 检查 migration 逻辑
- 若回归验证失败 → 检查是否误改了现有表结构

## 6. 边界（不做什么）

- 不修改任何代码文件
- 不新增 API 端点
- 不启动完整 Controller 服务
