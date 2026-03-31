# 工作包 M2-N2-WP2：Glassmorphism 卡片/导航/浮窗与 Toast

> 目标：实现首页卡片、导航栏、详情浮窗的 Glassmorphism 质感，以及操作反馈 Toast。
> 角色：UI
> 预估改动量：修改 ~150 行（CSS + JS）

## 1. 前置条件

- M2-N2-WP1（Bento Grid）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` | 现有样式，确定浮窗和 Toast 样式插入位置 |
| `crawler/extension/dashboard.js` | 现有 `openModal`/`closeModal`/`showToast` 占位函数 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q3 | Glass 规范基线 |
| `PROJECT_PRD.md` 2.5 | 当前 Dashboard 处于 UI 视觉确认阶段 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | 新增样式区 | 导航栏、卡片、浮窗、Toast 样式 |
| `crawler/extension/dashboard.js` | `openModal`/`closeModal`/`showToast` | 从占位改为完整实现 |

## 4. 技术约束与改动规格

### 4.1 Glassmorphism 应用范围

- `#main-nav` 必须是**浅色悬浮式毛玻璃**导航（`background: rgba(240,239,235,0.7)` + `backdrop-filter: blur(12px)`），不再是纯黑条
- `.job-card` 必须使用半透明玻璃卡片（`background: rgba(255,255,255,0.4)` + `backdrop-filter: blur(12px)`），不再是纯白实心卡片
- `.modal-content` 继续使用 Glassmorphism（深色调），与首页卡片形成对比层次

### 4.1.1 导航栏浅色毛玻璃（用户+专家+顾问三方共识）

```css
#main-nav {
    background: rgba(240, 239, 235, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}
```

> **设计决策**：专家明确反对深色导航栏（"会造成上下割裂"），顾问完全同意。导航栏使用浅色半透明与内容区同色系，通过 `backdrop-filter` 在 Z 轴上产生层次区分。

### 4.1.2 卡片玻璃拟态

```css
.job-card {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    border-radius: 16px;
}
```

> **依赖关系**：卡片玻璃效果依赖 M2-N2-WP4 的环境背景光斑作为折射介质。

### 4.2 Glassmorphism 浮窗

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    backdrop-filter: blur(20px) saturate(150%);
    background: rgba(43, 44, 48, 0.7);
    border-radius: 16px;
    padding: 32px;
    max-width: 560px;
    width: 90%;
    color: var(--c-bg-light);
    position: relative;
}

/* 噪点纹理 */
.modal-content::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,..."); /* SVG 噪点 */
    pointer-events: none;
}
```

### 4.3 Toast 组件

```css
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.toast {
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    animation: slideIn 300ms ease-out;
}

.toast--success { background: var(--c-teal); }
.toast--error { background: var(--c-accent-red); }
.toast--info { background: var(--c-gray); }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
```

### 4.4 交互逻辑

- **浮窗打开**：点击卡片 → 优先使用当前页已有数据或 Mock 数据做视觉展示；真实 `fetchJobDetail(id)` 联调归 M3 端到端验证
- **浮窗关闭**：3 种方式 — ESC 键 / 遮罩点击 / 关闭按钮
- **加入待投递**：按钮点击 → `selectJob(id, true)` → `showToast('已加入待投递', 'success')`
- **Toast 自动消失**：3 秒后 `setTimeout` 移除 DOM

### 4.5 浮窗内容结构

```html
<div class="modal-overlay">
  <div class="modal-content">
    <button class="modal-close">&times;</button>
    <h2 class="modal-title">{title}</h2>
    <div class="modal-meta">{company} · {location} · {salary}</div>
    <div class="modal-desc">{description}</div>
    <a class="modal-link" href="{url}" target="_blank">查看原链接</a>
    <button class="modal-action">加入待投递</button>
  </div>
</div>
```

## 5. 测试上下文

- Chrome 打开 dashboard.html
- 需要有测试数据
- 优先使用 Mock 数据完成视觉验收

## 6. 验收标准

```bash
# 浏览器验收：
# 1. #main-nav 为浅色悬浮式毛玻璃（rgba(240,239,235,0.7) + blur），不再是纯黑导航条
# 2. .job-card 呈现半透明玻璃质感，可透出环境背景光斑
# 3. 点击任意卡片 → 浮窗打开，背景模糊可见（Glassmorphism 效果）
# 2. 浮窗显示：标题、公司、薪资、城市、描述、跳转链接、"加入待投递"按钮
# 4. 噪点纹理背景可见（微弱的颗粒感）
# 5. ESC 键关闭浮窗
# 6. 点击遮罩（浮窗外部）关闭浮窗
# 7. 点击关闭按钮（×）关闭浮窗
# 8. "加入待投递"按钮 → Toast "已加入待投递" → 3秒后消失
# 9. 不支持的浏览器（无 backdrop-filter）→ 降级为半透明背景
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| Bento Grid 布局 | 无修改 | WP1 已锁定 |
| API 调用 | 新增 | `fetchJobDetail` 被浮窗调用 |

## 8. 契约变更

无 API/DB 契约变更。

## 9. 回退方案

- `git checkout` 恢复 CSS 和 JS 文件

## 10. 边界（不做什么）

- 不做 Micro-interactions（WP3 处理）
- 不改 Grid 布局（WP1 已锁定）
- 不做浮窗内的编辑功能
- 不做复杂动画（打开/关闭用简单 opacity）
- 不把真实 API 联调作为 M2 视觉验收阻塞条件
