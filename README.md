# 招聘采集控制台

这是一个**面向私有部署的招聘采集与交付控制台**。  
当前以 Boss 直聘为首个落地平台，主线由两部分组成：

1. `crawler/extension/`：Chrome 扩展，负责在 Boss 直聘页面执行采集。
2. `controller/`：本地控制面，负责任务排队、批量编排、运行状态和投递配置。

当前产品目标是：你指定城市和岗位关键词，控制面把任务排给扩展执行，结果按配置落到目标存储。  
当前默认保留飞书投递能力，但仓库默认配置是安全态，不附带任何真实凭证。

请注意：

1. 当前系统是 **Boss-first**，不是已经完成的“全网招聘平台”
2. 当前阶段重点是 **把 Boss 单平台收口为稳定可验收的生产基线**
3. 多平台、统一职位模型和更高层工作流是后续阶段方向，不是当前主线

## 安装

仓库根目录只推荐这一条安装命令：

```bash
bash scripts/install.sh
```

安装完成后，请继续阅读：

- `docs/READING_BY_STAGE.md`
- `PROJECT_MASTER_HANDOFF.md`
- `CURRENT_PRIORITY.md`
- `PROJECT_PRD.md`
- `PROJECT_PRODUCT_STATUS.md`
- `PROJECT_DECISIONS.md`
- `PROJECT_ACCEPTANCE_CRITERIA.md`
- `HANDOFF_WRITING_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND_ENTRY.md`
- `docs/BACKEND_ENTRY.md`
- `docs/TESTING_ENTRY.md`
- `docs/INSTALL.md`
- `docs/CONFIG.md`
- `docs/USAGE.md`
- `controller/README.md`

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
- `docs/plans/`：当前主线执行方案
- `docs/archive/`：历史执行方案与旧报告归档
- `scripts/`：安装、检查、清理脚本
- `controller/`：本地控制面、批量运行脚本、配置模板
- `crawler/extension/`：Chrome 扩展代码
- `tests/`：验收和辅助测试脚本

## 快速开始

1. 执行 `bash scripts/install.sh`
2. 先看 `docs/READING_BY_STAGE.md`
3. 再按当前阶段进入对应文档
4. 按 `docs/CONFIG.md` 填写 `controller/feishu_targets.json`
5. 在 Chrome 中加载 `crawler/extension/`
6. 启动控制面：`bash controller/start.sh`
7. 运行示例批次：`node controller/run_batch.js controller/batches/sample_batch.json`

## 仓库约定

- 默认不提交真实凭证、cookies、数据库和运行结果
- 示例配置在 `controller/*.example.json`
- 所有命令和路径均以仓库根目录相对执行
- 该仓库仅准备推送到 GitHub 私有仓库
