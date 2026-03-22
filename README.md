# 招聘采集控制台

这是一个面向私有部署的 Boss 直聘岗位采集项目，当前主线由两部分组成：

1. `crawler/extension/`：Chrome 扩展，负责在 Boss 直聘页面执行采集。
2. `controller/`：本地控制面，负责任务排队、批量编排、运行状态和投递配置。

项目目标很简单：你指定城市和岗位关键词，控制面把任务排给扩展执行，结果再按配置落到目标存储。当前默认保留飞书投递能力，但仓库默认配置是安全态，不附带任何真实凭证。

## 安装

仓库根目录只推荐这一条安装命令：

```bash
bash scripts/install.sh
```

安装完成后，请继续阅读：

- `docs/INSTALL.md`
- `docs/CONFIG.md`
- `docs/USAGE.md`

## 目录说明

```text
zhaopin/
  README.md
  docs/
  scripts/
  controller/
  crawler/extension/
  tests/
```

目录职责：

- `docs/`：中文安装、配置、使用、架构和排障文档
- `scripts/`：安装、检查、清理脚本
- `controller/`：本地控制面、批量运行脚本、配置模板
- `crawler/extension/`：Chrome 扩展代码
- `tests/`：验收和辅助测试脚本

## 快速开始

1. 执行 `bash scripts/install.sh`
2. 按 `docs/CONFIG.md` 填写 `controller/feishu_targets.json`
3. 在 Chrome 中加载 `crawler/extension/`
4. 启动控制面：`bash controller/start.sh`
5. 运行示例批次：`node controller/run_batch.js controller/batches/sample_batch.json`

## 仓库约定

- 默认不提交真实凭证、cookies、数据库和运行结果
- 示例配置在 `controller/*.example.json`
- 所有命令和路径均以仓库根目录相对执行
- 该仓库仅准备推送到 GitHub 私有仓库

