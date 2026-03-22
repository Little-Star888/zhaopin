# 安装说明

## 环境要求

- Node.js 20 或更高版本
- Chrome 或 Chromium
- Bash 环境

## 一键安装

在仓库根目录执行：

```bash
bash scripts/install.sh
```

脚本会完成以下动作：

1. 检查 Node.js 是否可用
2. 安装 `controller/` 依赖
3. 在缺失时复制模板配置
4. 提示下一步操作

## 安装完成后要做什么

### 1. 配置本地文件

编辑以下文件：

- `controller/feishu_targets.json`
- `controller/runtime_config.json`

填写方式见 `docs/CONFIG.md`。

### 2. 加载 Chrome 扩展

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择目录 `crawler/extension/`

### 3. 启动控制面

```bash
bash controller/start.sh
```

默认地址：

```text
http://127.0.0.1:7893
```

### 4. 运行示例批次

```bash
node controller/run_batch.js controller/batches/sample_batch.json
```

## 常见问题

如果安装脚本执行失败，先运行：

```bash
bash scripts/doctor.sh
```

更详细的故障定位见 `docs/TROUBLESHOOTING.md`。

