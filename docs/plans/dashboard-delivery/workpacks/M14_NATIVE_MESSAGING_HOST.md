# M14 Native Messaging Host：Chrome 扩展自动拉起后端

> 创建时间：2026-03-27
> 优先级：P2（架构升级，独立里程碑）
> 前置条件：M13 截图 Bug 修复完成
> 目标：用户点击扩展打开 Dashboard 时，自动启动本地 Controller 进程

---

## 1. 问题陈述

当前架构中，Chrome 扩展（前端）和 Node.js Controller（后端）是两个独立进程：

- 扩展通过 `fetch('http://127.0.0.1:7893/api/jobs')` 连接后端
- 如果 Controller 没有提前手动启动，Dashboard 会显示"后端未启动"
- Chrome 扩展运行在浏览器沙盒中，无法直接 `spawn` 本地进程

用户期望：**点击扩展打开 Dashboard 时，后端自动启动。**

## 1.1 实施判断

如果目标是“这个 bug 尽快解决，并且今天就能稳定止血”，则本工作包不应把 Native Messaging 作为第一落地点。

原因很直接：

1. `systemd --user` 可以最快解决“后端没启动导致前端不可用”的主问题，部署后对现有前端零侵入。
2. `popup.js` 当前在 `loadStatus()` 失败时只 `console.error`，这是当前最明显、最低成本、最该立刻补上的体验缺口。
3. Native Messaging 虽然方向正确，但它属于额外安装链路：
   - 需要 Host 注册
   - 需要扩展 ID 绑定
   - 需要 Chrome 重启或重新加载
   - 需要处理宿主脚本、权限、路径、浏览器兼容性
   这些都不适合放进“紧急止血”路径。

因此本里程碑建议调整为两层目标：

- 第一目标：`systemd + popup 降级 UI`，优先恢复可用性
- 第二目标：Native Messaging，作为按需唤醒增强能力单列推进

## 1.2 推荐实施顺序

推荐顺序如下：

1. 先做 `systemd --user` 服务
2. 立即补 `popup.js` 的后端未连接降级 UI
3. 保留 Native Messaging 设计，但不作为当前 bug 的阻塞项

这三步里，前两步解决的是“用户现在就能用”，第三步解决的是“未来更自动化”。

---

## 2. 技术方案：Chrome Native Messaging

### 2.1 原理

Chrome 提供了 Native Messaging API，允许扩展与本地可执行文件通过 stdin/stdout 通信。核心流程：

```
用户点击扩展 → popup.js 发送消息 → background.js 调用 sendNativeMessage()
→ Chrome 启动 Native Host 脚本 → Host 通过 child_process.spawn 拉起 Controller
→ Controller 在 7893 端口就绪 → Dashboard 正常加载
```

### 2.2 需要创建的文件

| 文件 | 位置 | 作用 |
|------|------|------|
| `native_host.js` | `controller/` | Native Host 主脚本，接收扩展指令，拉起 Controller |
| `run_host.sh` | `controller/` | 包装脚本，让 Chrome 以可执行方式调用 `native_host.js` |
| `com.zhaopin.controller.json` | `controller/` | Host Manifest，声明 Host 名称、路径、允许的扩展 ID |
| `install_host.sh` | `controller/` | 安装脚本，将 Manifest 注册到 Chrome 的 NativeMessagingHosts 目录 |
| `uninstall_host.sh` | `controller/` | 卸载脚本，移除注册 |

### 2.3 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `crawler/extension/manifest.json` | 添加 `nativeMessaging` 权限 |
| `crawler/extension/background.js` | 添加 `WAKE_UP_CONTROLLER` 消息处理 |
| `crawler/extension/popup.js` | 添加"唤醒后端"按钮和降级逻辑 |
| `crawler/extension/dashboard.js` | BUG-3 引导页增加"尝试自动唤醒"按钮 |

---

## 3. 详细设计

### 3.1 Native Host 脚本 (`controller/native_host.js`)

```js
#!/usr/bin/env node
/**
 * Native Messaging Host
 * 接收 Chrome 扩展的指令，拉起本地 Controller 进程
 *
 * 通信协议：Chrome 使用 4 字节 little-endian 长度头 + JSON 消息体
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'server.js');

// 从 stdin 读取 Chrome 发来的消息（4 字节长度头 + JSON）
function readMessage() {
  return new Promise((resolve) => {
    const header = Buffer.alloc(4);
    let headerRead = 0;

    function readHeader() {
      process.stdin.read(4 - headerRead).on('data', (chunk) => {
        chunk.copy(header, headerRead);
        headerRead += chunk.length;
        if (headerRead < 4) {
          readHeader();
        } else {
          const msgLen = header.readUInt32LE(0);
          const body = Buffer.alloc(msgLen);
          let bodyRead = 0;

          function readBody() {
            process.stdin.read(msgLen - bodyRead).on('data', (chunk) => {
              chunk.copy(body, bodyRead);
              bodyRead += chunk.length;
              if (bodyRead < msgLen) {
                readBody();
              } else {
                resolve(JSON.parse(body.toString()));
              }
            });
          }
          readBody();
        }
      });
    }
    readHeader();
  });
}

// 向 stdout 写入消息（4 字节长度头 + JSON）
function sendMessage(msg) {
  const body = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(header);
  process.stdout.write(body);
}

// 主逻辑：读取指令 → 拉起 Controller → 返回结果
async function main() {
  try {
    const msg = await readMessage();

    if (msg.action === 'start_server') {
      const child = spawn('node', [SERVER_PATH], {
        detached: true,
        stdio: 'ignore',
        cwd: __dirname,
      });
      child.unref();

      // 等待一小段时间让服务器启动
      setTimeout(() => {
        sendMessage({ success: true, pid: child.pid });
      }, 500);
    } else if (msg.action === 'check_status') {
      // 可选：检测 Controller 是否已运行
      const http = require('http');
      const req = http.get('http://127.0.0.1:7893/status', (res) => {
        sendMessage({ success: true, running: true });
      });
      req.on('error', () => {
        sendMessage({ success: true, running: false });
      });
      req.setTimeout(2000);
    } else {
      sendMessage({ success: false, error: `Unknown action: ${msg.action}` });
    }
  } catch (err) {
    sendMessage({ success: false, error: err.message });
  }
}

main();
```

### 3.2 包装脚本 (`controller/run_host.sh`)

```bash
#!/bin/bash
# Native Host 包装脚本
# Chrome 需要通过可执行文件调用 Node.js 脚本
exec /usr/bin/node "$(dirname "$0")/native_host.js"
```

安装后需执行 `chmod +x run_host.sh`。

### 3.3 Host Manifest (`controller/com.zhaopin.controller.json`)

```json
{
  "name": "com.zhaopin.controller",
  "description": "Zhaopin Controller Native Host - 自动启动本地招聘管理后端",
  "path": "/home/xixil/kimi-code/zhaopin/controller/run_host.sh",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://__EXTENSION_ID__/"
  ]
}
```

> **注意**：`__EXTENSION_ID__` 需要替换为实际的扩展 ID。开发模式下可在 `chrome://extensions` 查看。

### 3.4 安装脚本 (`controller/install_host.sh`)

```bash
#!/bin/bash
# 注册 Native Messaging Host 到 Chrome
# Linux 下注册路径：~/.config/google-chrome/NativeMessagingHosts/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_NAME="com.zhaopin.controller"
MANIFEST_SRC="${SCRIPT_DIR}/${HOST_NAME}.json"
MANIFEST_DIR="${HOME}/.config/google-chrome/NativeMessagingHosts"
MANIFEST_DST="${MANIFEST_DIR}/${HOST_NAME}.json"

# 1. 确保包装脚本有执行权限
chmod +x "${SCRIPT_DIR}/run_host.sh"

# 2. 创建目标目录
mkdir -p "${MANIFEST_DIR}"

# 3. 如果没有传入扩展 ID，尝试自动检测
if [ -z "$1" ]; then
  echo "Usage: $0 <extension-id>"
  echo ""
  echo "请在 chrome://extensions 中查看扩展 ID"
  echo "示例: $0 abcdefghijklmnopqrstuvwxyzabcdef"
  exit 1
fi

EXTENSION_ID="$1"

# 4. 生成 Manifest（替换路径和扩展 ID）
cat > "${MANIFEST_DST}" << EOF
{
  "name": "${HOST_NAME}",
  "description": "Zhaopin Controller Native Host",
  "path": "${SCRIPT_DIR}/run_host.sh",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXTENSION_ID}/"
  ]
}
EOF

echo "✓ Native Host 已注册到: ${MANIFEST_DST}"
echo "✓ Host 名称: ${HOST_NAME}"
echo "✓ 包装脚本: ${SCRIPT_DIR}/run_host.sh"
echo "✓ 扩展 ID: ${EXTENSION_ID}"
echo ""
echo "请重启 Chrome 使配置生效。"
```

### 3.5 卸载脚本 (`controller/uninstall_host.sh`)

```bash
#!/bin/bash
set -e

HOST_NAME="com.zhaopin.controller"
MANIFEST_PATH="${HOME}/.config/google-chrome/NativeMessagingHosts/${HOST_NAME}.json"

if [ -f "${MANIFEST_PATH}" ]; then
  rm "${MANIFEST_PATH}"
  echo "✓ Native Host 已移除: ${MANIFEST_PATH}"
else
  echo "未找到注册文件: ${MANIFEST_PATH}"
fi
```

---

## 4. Chrome 扩展侧修改

### 4.1 manifest.json

```diff
  "permissions": [
    "storage",
    "alarms",
    "cookies",
    "activeTab",
-   "scripting"
+   "scripting",
+   "nativeMessaging"
  ],
```

### 4.2 background.js — 添加 WAKE_UP_CONTROLLER 处理

在 `onMessage` 的 switch 中增加：

```js
case 'WAKE_UP_CONTROLLER':
  chrome.runtime.sendNativeMessage('com.zhaopin.controller', {
    action: 'start_server'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[JobHunter] Native messaging error:', chrome.runtime.lastError.message);
      sendResponse({
        success: false,
        error: 'Native Host 未安装或不可用'
      });
    } else {
      console.log('[JobHunter] Controller started, pid:', response.pid);
      sendResponse({ success: true, ...response });
    }
  });
  return true; // 保持 sendResponse 异步
```

### 4.3 popup.js — 添加唤醒逻辑

在 `loadStatus()` 的 catch 分支中添加降级 UI：

```js
async function wakeUpController() {
  try {
    showMessage('正在尝试唤醒本地服务...', 'success');
    startBtn.disabled = true;
    startBtn.textContent = '启动中...';

    const response = await sendMessage({ type: 'WAKE_UP_CONTROLLER' });
    if (response.success) {
      showMessage('唤醒指令已发送，等待服务启动...', 'success');
      setTimeout(loadStatus, 3000); // 3 秒后重试
    } else {
      showMessage(`唤醒失败: ${response.error}`, 'error');
      // 降级：显示手动命令
      startBtn.textContent = '复制启动命令';
      startBtn.disabled = false;
      startBtn.onclick = () => {
        navigator.clipboard.writeText('cd /home/xixil/kimi-code/zhaopin/controller && node server.js');
        showMessage('命令已复制，请在终端执行', 'success');
      };
    }
  } catch (err) {
    showMessage(`通信错误: ${err.message}`, 'error');
  }
}
```

### 4.4 popup.js 当前必须先补的降级 UI

无论 Native Messaging 是否落地，`popup.js` 都应该先补一个低成本兜底，因为这是当前用户最直接接触到的入口。

#### 当前问题

`loadStatus()` 失败时目前只有：

```js
catch (error) {
  console.error('Failed to load status:', error);
}
```

这会导致：

- 用户看不到“后端未连接”的明确信号
- 采集按钮仍可能保持可点击状态
- 用户不知道应执行什么命令恢复服务

#### 建议修复

在 `popup.js` 中先实现一个纯前端降级态，不依赖 Native Messaging：

1. `statusText` 显示为“后端未连接”
2. `crawlStatus` 显示为“离线”或“未启动”
3. `startBtn` 禁用，避免触发无意义采集
4. `messageBox` 或等价位置提示启动命令：
   - `cd /home/xixil/kimi-code/zhaopin/controller && npm run start`
5. 保留“打开 Dashboard”按钮，但用户将看到 M13 中的失败态引导

#### 判断

这一项应视为 P0 级别的体验兜底，甚至优先级高于 Native Messaging 本身，因为：

- 改动极小
- 风险极低
- 立即见效
- 与 `systemd`、Native Messaging 都不冲突

### 4.5 dashboard.js — BUG-3 引导页增加唤醒按钮

修改 `renderBackendError()` helper：

```js
function renderBackendError(errMsg) {
  return `<div class="empty-state empty-state--backend">
    <h3>后端未启动或连接失败</h3>
    <p>请先在终端运行 <code>npm run start</code> 启动 Controller</p>
    <button class="res-btn res-btn--g" onclick="tryWakeUpController()">尝试自动唤醒</button>
    <button class="res-btn" onclick="location.reload()" style="margin-top:8px">刷新页面重试</button>
  </div>`;
}

async function tryWakeUpController() {
  try {
    const msg = { type: 'WAKE_UP_CONTROLLER' };
    // dashboard.js 需要通过 chrome.runtime.sendMessage 与 background 通信
    const response = await chrome.runtime.sendMessage(msg);
    if (response && response.success) {
      showToast('唤醒成功，3 秒后刷新...', 'success');
      setTimeout(() => location.reload(), 3000);
    } else {
      showToast('唤醒失败，请手动启动 Controller', 'error');
    }
  } catch (err) {
    showToast('唤醒失败: ' + err.message, 'error');
  }
}
```

---

## 5. 里程碑口径调整建议

为了避免 M14 范围失焦，建议把文档口径明确为：

### M14-A：立即止血路径

- `systemd --user` 托管 Controller
- `popup.js` 补后端未连接降级 UI
- 验收标准：用户在大多数情况下不再遇到“后端没起导致完全无提示不可用”

### M14-B：增强自动唤醒路径

- Native Messaging Host
- 扩展主动发送唤醒指令
- Dashboard / Popup 可尝试自动拉起本地服务
- 验收标准：用户无需常驻服务，也能通过扩展按需拉起后端

### 不建议的口径

不建议把“systemd、popup 降级 UI、Native Messaging”混成同一批必须同时交付的内容。这样会把“5 分钟能止血”的问题，重新拉回到“多文件、多安装步骤、需要人工配置”的慢路径。

---

## 6. 最终建议

综合判断如下：

1. 顾问建议的实施顺序是对的，应该采纳。
2. 对当前 bug 而言，真正的主修复不是 Native Messaging，而是：
   - `systemd` 保证服务常驻
   - `popup.js` 明确反馈后端离线
3. Native Messaging 继续保留在本文件中，但应标注为“增强项 / 非当前止血阻塞项”。

一句话总结：

> 先把“服务稳定存在”和“用户看得懂错误”解决，再做“扩展自动拉起后端”。

---

## 7. 安装与使用流程

### 7.1 一次性安装（开发者）

```bash
cd /home/xixil/kimi-code/zhaopin/controller
chmod +x install_host.sh run_host.sh
./install_host.sh <你的Chrome扩展ID>
# 重启 Chrome
```

### 7.2 日常使用

1. 用户点击扩展图标
2. popup.js 检测后端状态
3. 未运行 → 显示"尝试自动唤醒后端"按钮
4. 点击 → 通过 Native Messaging 拉起 Controller
5. 3 秒后自动刷新，Dashboard 正常加载

### 7.3 降级兜底

如果 Native Host 未安装：
- popup 显示"复制启动命令"按钮
- Dashboard 显示手动启动指引 + 刷新重试按钮

---

## 8. 风险与限制

| 风险 | 影响 | 缓解 |
|------|------|------|
| 扩展 ID 变化 | Native Messaging 失效 | 固定扩展 ID（固定 key 或打包 crx） |
| Node.js 路径变化 | Host 无法启动 | run_host.sh 使用 `which node` 或绝对路径 |
| Chrome 更新后 API 变化 | 通信协议变化 | Native Messaging API 自 Chrome 28 稳定，MV3 仍支持 |
| 安全审核 | 用户需手动运行 install_host.sh | 文档明确说明，提供卸载脚本 |
| 重复启动 | 多次点击可能拉起多个进程 | server.js 已有端口检测逻辑，会拒绝重复启动 |
| Chrome 商店发布 | 需声明 nativeMessaging 权限 | 当前为本地开发扩展，不影响 |

---

## 9. 替代方案对比

| 方案 | 体验 | 复杂度 | 部署成本 |
|------|------|--------|---------|
| **Native Messaging（本方案）** | 一键唤醒 | 中 | 需运行一次 install 脚本 |
| systemd user service | 开机自启，完全无感 | 低 | 需配置 systemd unit |
| PM2 守护进程 | 自动重启，后台常驻 | 低 | 需安装 PM2 |
| 手动启动（当前） | 每次需开终端 | 无 | 无 |

> **建议**：如果项目长期使用，优先考虑 **systemd user service** 方案（开机自启 + 崩溃自动重启），Native Messaging 作为按需唤醒的补充。

### 9.1 systemd 替代方案（更简单）

如果只需要"后端自动运行"，不需要扩展触发，systemd 方案更简单：

```ini
# ~/.config/systemd/user/zhaopin-controller.service
[Unit]
Description=Zhaopin Controller
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/xixil/kimi-code/zhaopin/controller
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
# 启用
systemctl --user enable --now zhaopin-controller
```

这样后端开机自动启动，完全不需要 Native Messaging。

---

## 10. 建议的实施顺序

1. **先做 systemd 方案**（5 分钟，立竿见影）
2. **再补 popup 降级 UI**（低风险、高反馈、立即止血）
3. **最后再做 Native Messaging 方案**（可选，用于按需唤醒）

---

## 11. 关键代码索引

| 文件 | 说明 |
|------|------|
| `controller/server.js:44` | Controller 端口配置（7893） |
| `controller/server.js:1059-1062` | 端口检测 + 启动监听 |
| `crawler/extension/manifest.json` | 扩展权限声明 |
| `crawler/extension/background.js:466` | 消息路由（需添加 WAKE_UP_CONTROLLER） |
| `crawler/extension/popup.js:41` | openDashboard（需添加唤醒逻辑） |
| `crawler/extension/dashboard-api.js:6` | API_BASE 地址 |
