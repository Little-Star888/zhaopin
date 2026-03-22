# HTTP 控制面

Boss直聘采集器的本地 HTTP 控制接口，用于 OpenClaw 或其他客户端下发任务、查询状态。

## 快速开始

```bash
bash controller/start.sh
```

服务默认将在 `http://127.0.0.1:7893` 启动，仅监听本地回环地址。

如需切换端口：

```bash
CONTROLLER_PORT=7894 bash controller/start.sh
```

## API 接口

### 添加任务
```bash
curl -X POST http://localhost:7893/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"city":"北京","keyword":"AI产品经理","priority":"normal","source":"openclaw","batchId":"BATCH-20260321-01","deliveryTarget":"personal"}'
```

### 查看队列
```bash
curl http://localhost:7893/queue
```

### 标记尽快执行
```bash
curl -X POST http://localhost:7893/start
```

### 暂停/恢复
```bash
curl -X POST http://localhost:7893/pause
curl -X POST http://localhost:7893/resume
```

### 查看状态
```bash
curl http://localhost:7893/status
```

### 查看结果
```bash
curl http://localhost:7893/results
```

## 文件说明

| 文件 | 用途 |
|------|------|
| `server.js` | HTTP 服务主程序 |
| `feishu-client.js` | 飞书多租户配置与 API 客户端 |
| `delivery-worker.js` | SQLite 投递 worker |
| `start.sh` | 启动脚本 |
| `task_queue.json` | 任务队列持久化 |
| `status.json` | 运行状态 |
| `results.json` | 采集结果记录 |
| `feishu_targets.json` | 飞书目标配置（本地凭证，不入库不导出） |
| `feishu_targets.example.json` | 飞书目标配置模板 |
| `runtime_config.example.json` | 运行配置模板 |
| `OPENCLAW_PROTOCOL.md` | 编排层调用协议 |
| `run_batch.js` | 最小批量编排脚本 |

## 与 Extension 的交互

1. Extension 每次执行前会尝试连接 `http://127.0.0.1:7893/status`
2. 如果控制面可达且非暂停状态，Extension 会优先从控制面获取任务
3. 任务完成后，Extension 会向 `/report` 端点报告结果
4. 本轮收口后，验收环境将以 `controller_only` 为准，不再默认依赖内置队列回退
5. Extension 已支持 `fixed / interval` 两种 alarm 模式；联调阶段建议使用 `interval`

## Round 3 补充

- `/enqueue` 支持任务元数据：`priority`、`source`、`batchId`
- `/report` 仅接受 `task.taskId`，不再支持 `city+keyword` 回退
- 最小批处理脚本示例：

```bash
node controller/run_batch.js controller/batches/sample_batch.json
```

- 脚本会同时生成：
  - `controller/batches/output/<batchId>.summary.json`
  - `controller/batches/output/<batchId>.export.json`

- `run_batch.js` 现在支持最小字段透传：
  - 任务级 `task.deliveryTarget`
  - batch 根级 `deliveryTarget`（仅在任务未显式指定时使用）
