# 工作包 M7-N3-WP3：手风琴展开交互

> 目标：用独立的手风琴展开替代旧 Modal 弹窗系统
> 角色：前端
> 预估改动量：新增 ~80 行 CSS + ~100 行 JS，删除 ~60 行旧代码

## 1. 前置条件

- M7-N3-WP2 通过（Grid 布局就绪）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` initModal() / openModal() / closeModal() | 旧 Modal 逻辑 |
| `crawler/extension/constructivism-mockup.html` | 手风琴展开的设计稿 |
| `crawler/extension/dashboard.html` #job-modal | 旧 Modal DOM 结构 |

## 3. 改动规格

### 3.1 删除旧 Modal 系统

删除以下代码：
- `initModal()` 函数及其事件绑定
- `openModal()` 函数
- `closeModal()` 函数
- `handleModalAction()` 函数
- `currentModalJobId` 变量
- `dashboard.html` 中的 `#job-modal` DOM

### 3.2 新增手风琴 CSS

```css
.job-card.is-expanded {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 45vw;
    height: 45vh;
    z-index: 100;
    animation: cardExpand 0.3s ease-out;
}

@keyframes cardExpand {
    from { transform: translate(-50%, -50%) scale(0.92); opacity: 0; }
    to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.accordion-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
}
```

### 3.3 新增 JS 函数

```js
let currentExpId = null;

function handleCardExpansion(cardEl) {
    const jobId = cardEl.dataset.id;
    if (currentExpId === jobId) {
        closeExpanded(); // 点击同一张卡片关闭
        return;
    }
    if (currentExpId) closeExpanded(); // 关闭之前展开的
    currentExpId = jobId;
    // 展开逻辑：添加 .is-expanded 类，创建遮罩，加载详情
}

function closeExpanded() {
    // 移除 .is-expanded 类，移除遮罩
    currentExpId = null;
}
```

### 3.4 排他性规则

- 同时只能展开一张卡片
- 点击已展开的卡片 → 收起
- 点击其他卡片 → 收起当前，展开新卡片
- 点击遮罩 → 收起
- ESC 键 → 收起

## 4. 验证

- [ ] 点击卡片，卡片 fixed 居中放大，有 scale 动画
- [ ] 点击已展开的卡片，卡片回到原位
- [ ] 展开卡片A后再点击卡片B，A 收起 B 展开
- [ ] 点击遮罩区域，卡片收起
- [ ] 按 ESC 键，卡片收起
- [ ] 旧 Modal 相关代码已完全删除
