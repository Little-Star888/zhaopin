# 排障说明

## 控制面启动失败

先检查环境：

```bash
bash scripts/doctor.sh
```

常见原因：

- Node.js 未安装
- `controller/node_modules/` 未安装
- 本地配置文件不存在或格式错误

## 扩展无法拿到任务

检查项：

1. 控制面是否运行在 `127.0.0.1:7893`
2. 扩展是否加载了 `crawler/extension/`
3. `curl http://127.0.0.1:7893/status` 是否可返回 JSON

## 飞书投递失败

检查项：

1. `controller/feishu_targets.json` 是否填写真实值
2. `deliveryEnabled` 是否已经开启
3. 飞书应用权限、表格 ID、表 ID 是否正确

## 批量运行后没有输出

确认以下目录可写：

```text
controller/batches/output/
```

如果不存在，可重新执行：

```bash
bash scripts/clean.sh
```

