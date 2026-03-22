# 使用说明

## 基本运行流程

1. 启动控制面
2. 加载并启用 Chrome 扩展
3. 准备批次文件
4. 执行批量采集
5. 查看控制面状态与结果

## 启动控制面

```bash
bash controller/start.sh
```

## 查看控制面状态

```bash
curl http://127.0.0.1:7893/status
curl http://127.0.0.1:7893/queue
curl http://127.0.0.1:7893/results
```

## 运行单批次

```bash
node controller/run_batch.js controller/batches/sample_batch.json
```

输出会写到：

```text
controller/batches/output/
```

## 运行多轮批次

```bash
node controller/run_multi_batch.js controller/batches/sample_batch.json --rounds 3 --delay-ms 15000 --prefix BATCH-DEMO
```

## 结构验收

先启动控制面，再执行：

```bash
bash tests/acceptance/run_all.sh --structural
```

## 示例批次格式

```json
{
  "batchId": "BATCH-DEMO-01",
  "tasks": [
    {
      "city": "北京",
      "keyword": "AI产品经理"
    }
  ]
}
```

