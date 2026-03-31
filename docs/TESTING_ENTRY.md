# 测试与验收文档入口

> 版本：1.0 | 日期：2026-03-24
> 作用：为结构验收、真实抽检、专项测试提供总入口，具体细节通过路径渐进披露。

## 1. 当前测试分层

1. 结构验收
2. 真实抽检
3. 专项脚本 / 回归检查

## 2. 主要入口

1. `PROJECT_ACCEPTANCE_CRITERIA.md`
2. `tests/acceptance/run_all.sh`
3. `tests/acceptance/`
4. `tests/test_feishu_write.py`
5. `docs/USAGE.md`

## 3. Phase A 当前重点

Phase A 的测试重点不是新增更多测试类型，而是把 Boss 单平台生产基线验收做完整。

重点看：

1. 任务下发
2. 自动 claim
3. 反爬恢复
4. enrichment -> delivery
5. backlog
6. 去重

## 4. 多平台阶段测试要求

第二平台 PoC 时重点新增：

1. 平台 executor 健康检查
2. adapter 字段映射正确性
3. UnifiedJobModel 落库正确性

## 5. 详细路径

1. 总体产品定义：`PROJECT_PRD.md`
2. 总体架构：`docs/ARCHITECTURE.md`
3. 接口边界草案：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
