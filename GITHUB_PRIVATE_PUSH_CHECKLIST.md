# GitHub 私有仓库推送清单

本项目只允许推送到 GitHub 私有仓库。

## 推送前检查

确认以下文件不会被提交：

- `controller/feishu_targets.json`
- `controller/runtime_config.json`
- `controller/results.json`
- `controller/status.json`
- `controller/task_queue.json`
- `controller/task_id_counter.json`
- `controller/data/`
- `controller/batches/output/`
- `cookies/`
- `output/`

## 建议命令

如果是首次创建仓库：

```bash
git init
git add .
git commit -m "chore: prepare private github repository"
gh repo create <owner>/<repo> --private --source=. --remote=origin --push
```

如果远端已经存在：

```bash
git add .
git commit -m "chore: prepare private github repository"
git push -u origin master
```

## 推送范围

- 只推送当前仓库的安全文件
- 不推送任何真实凭证或本地运行产物
- 不推送公开仓库

