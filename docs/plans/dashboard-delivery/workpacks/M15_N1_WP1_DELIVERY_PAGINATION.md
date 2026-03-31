# 工作包 M15-N1-WP1：delivery_queue 全表查询分页改造

> 目标：消除 `updateDeliveryPayloadCompanyFieldsByNormalizedName` 的全表内存加载
> 角色：后端
> 预估改动量：~30行JS

## 1. 前置条件
- M13 全部通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | `updateDeliveryPayloadCompanyFieldsByNormalizedName` 函数实现 |
| `controller/db.js` | `delivery_queue` 表结构 |

## 3. 改动规格
- 将全表 `.all()` 查询改为**基于 ID 的游标分页 (Keyset Pagination)**：
  - 不使用 `OFFSET`（并发插入会导致漏数据）
  - 使用 `WHERE (? IS NULL OR id < ?) ORDER BY id DESC LIMIT 500`
  - `while (true)` 循环，每批记录最后一条 `id` 作为下一批游标
  - 返回行数为 0 时退出循环
- 保持原有 JSON 解析和字段更新逻辑不变
- 顺带移除该查询中的 `ORDER BY datetime(created_at)`（主键索引性能更优）
- 批次间不需要 `sleep`（SQLite 单进程无锁竞争）

## 4. 验证
- [ ] `delivery_queue` 数据量 5000 条时，函数执行无内存飙升
- [ ] 分页处理结果与全量处理结果一致（数据完整性）
- [ ] 游标分页方式下，处理过程中新插入的数据不会导致漏处理
- [ ] 处理完成后所有记录的字段均已更新
