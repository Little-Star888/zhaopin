# 工作包 M15-N1-WP3：delivery_queue 性能冒烟检测

> 目标：端到端验证 delivery_queue 性能优化
> 角色：测试
> 预估改动量：无代码改动

## 1. 前置条件
- M15-N1-WP1 ~ WP2 全部通过

## 2. 测试场景
1. **分页正确性**：`delivery_queue` 中插入 100 条测试数据，调用 `updateDeliveryPayloadCompanyFieldsByNormalizedName`，确认全部处理完成
2. **内存监控**：插入 5000 条数据，调用该函数，监控 Node 进程内存（RSS）不飙升
3. **索引命中**：执行 `EXPLAIN QUERY PLAN` 确认 `getDeliveryStats` 等查询使用索引
4. **排序一致**：对比修改前后的查询结果顺序
5. **回归验证**：delivery_queue 的正常业务流程（插入、查询、更新）不受影响

## 3. 验证清单
- [ ] 所有场景通过
- [ ] 5000 条数据时内存占用 < 100MB
