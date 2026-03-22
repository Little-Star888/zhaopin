# 配置说明

## 配置文件

### `controller/runtime_config.json`

运行时默认参数。安装脚本会从模板复制一份本地文件。

当前模板字段：

- `JOB_FILTER_MODE`
- `EXPERIENCE`
- `MAX_LIST_PAGES_PER_RUN`
- `MAX_LIST_PAGE_SIZE`
- `MAX_DETAIL_REQUESTS_PER_RUN`
- `EXP_HARD_EXCLUDE_SOURCE`
- `deliveryEnabled`

建议：

- 初次安装保持 `deliveryEnabled: false`
- 先确认扩展和控制面联通，再开启投递

### `controller/feishu_targets.json`

飞书目标配置。本文件包含敏感凭证，默认不入库。

模板结构：

```json
{
  "defaultTarget": "demo",
  "targets": {
    "demo": {
      "appId": "your_app_id",
      "appSecret": "your_app_secret",
      "appToken": "your_app_token",
      "tableId": "your_table_id",
      "description": "示例飞书表"
    }
  }
}
```

## 安全约定

- 真实凭证只写入本地 `controller/feishu_targets.json`
- 不要提交 cookies、credential、数据库或批次输出
- 默认模板不会指向真实飞书表

## 覆盖方式

### 控制面端口

```bash
CONTROLLER_PORT=7894 bash controller/start.sh
```

### 飞书配置文件

```bash
FEISHU_TARGETS_FILE=controller/feishu_targets.json node controller/server.js
```

