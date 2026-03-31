# 工作包 M3-N1-WP2：Popup 单例入口

> 目标：在 popup 中新增"打开工作台"按钮，实现单例模式（Q14 决策）。
> 角色：前端
> 预估改动量：修改 ~30 行（popup.html + popup.js）

## 1. 前置条件

- M3-N1-WP1（manifest 更新）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.html` | 现有 popup 结构 |
| `crawler/extension/popup.js` | 现有 popup 逻辑 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q14 | 单例模式：保留 default_popup + chrome.tabs.create |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/popup.html` | 新增按钮 | "打开工作台"按钮，样式与现有 popup 一致 |
| `crawler/extension/popup.js` | 新增函数 | `openDashboard()` 单例实现 + 按钮事件绑定 |

## 4. 技术约束与改动规格

### 4.1 单例模式（Q14 决策）

```javascript
function openDashboard() {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.query({url: dashboardUrl}, (tabs) => {
        if (tabs.length > 0) {
            // 已有标签 → 聚焦
            chrome.tabs.update(tabs[0].id, {active: true});
            chrome.windows.update(tabs[0].windowId, {focused: true});
        } else {
            // 无标签 → 新建
            chrome.tabs.create({url: dashboardUrl});
        }
        window.close(); // popup 自动关闭
    });
}

document.getElementById('btn-open-dashboard').addEventListener('click', openDashboard);
```

### 4.2 HTML 按钮

```html
<button id="btn-open-dashboard" class="popup-btn">打开工作台</button>
```

## 5. 测试上下文

- Chrome 加载扩展
- 不需要 Controller 运行（只测试标签打开/聚焦）

## 6. 验收标准

```bash
# 1. 点击扩展图标 → popup 显示"打开工作台"按钮
# 2. 点击按钮 → 新标签打开 dashboard.html
# 3. 再次点击扩展图标 → 点击按钮 → 聚焦已打开的标签（不创建新标签）
# 4. 打开后 popup 自动关闭
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 现有 popup 功能 | 无影响 | 只新增按钮，不改现有逻辑 |
| dashboard 文件 | 无修改 | M2 已锁定 |
| background.js | 无修改 | M1 已锁定 |

## 8. 契约变更

无。

## 9. 回退方案

- 从 popup.html 移除按钮
- 从 popup.js 移除 `openDashboard` 函数

## 10. 顾问补充的鲁棒性要求

- **扩展路由寻址**：必须使用 `chrome.runtime.getURL('dashboard.html')` 获取绝对路径再传给 `chrome.tabs.create`，避免相对路径引发的加载 404

## 11. 边界（不做什么）

- 不改 dashboard 文件（M2 已锁定）
- 不改后端代码（M1 已锁定）
- 不注册 options_page（Q14 决策：保留 default_popup）
