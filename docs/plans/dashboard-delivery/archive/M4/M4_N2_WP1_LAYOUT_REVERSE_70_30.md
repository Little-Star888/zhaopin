> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M4-N2-WP1：工作台布局反转（70/30）

> 目标：将工作台布局从 50/50（简历左/待投递右）反转为 70/30（待投递左/简历右）
> 角色：前端
> 预估改动量：修改 ~30 行

## 1. 前置条件

- M4-N1 全部通过（新色值和阴影已生效）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` 第 582-593 行 | 当前 grid 布局 |
| `crawler/extension/dashboard.js` 第 243-267 行 | `loadResumeView()` 中 HTML 模板 |

## 3. 改动规格

### 3.1 CSS 布局修改

**旧代码**（第 582-587 行）：
```css
#view-resume {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
}
```

**新代码**：
```css
#view-resume {
    display: grid;
    grid-template-columns: 7fr 3fr;
    gap: 24px;
    align-items: start;
}
```

### 3.2 HTML 顺序调换

**旧代码**（dashboard.js 第 248-259 行）：
```javascript
container.innerHTML = `
  <section class="resume-panel">
    <h3 class="resume-panel__title">简历管理</h3>
    <div id="resume-content"></div>
  </section>
  <section class="delivery-panel">
    <h3 class="delivery-panel__title">
      待投递列表
      <span id="delivery-count" class="delivery-panel__count"></span>
    </h3>
    <div id="delivery-content"></div>
  </section>
`;
```

**新代码**（调换顺序：delivery 在前，resume 在后）：
```javascript
container.innerHTML = `
  <section class="delivery-panel">
    <h3 class="delivery-panel__title">
      待投递列表
      <span id="delivery-count" class="delivery-panel__count"></span>
    </h3>
    <div id="delivery-content"></div>
  </section>
  <section class="resume-panel">
    <h3 class="resume-panel__title">简历管理</h3>
    <div id="resume-content"></div>
  </section>
`;
```

### 3.3 响应式布局保持

第 589-592 行的移动端适配不需要修改（仍然是 `1fr` 单列）：
```css
@media (max-width: 900px) {
    #view-resume {
        grid-template-columns: 1fr;
    }
}
```

## 4. 验收标准

1. 工作台页面：待投递面板在左侧，占约 70% 宽度
2. 简历管理面板在右侧，占约 30% 宽度
3. 移动端（<900px）仍然单列显示
4. 面板内容正常渲染（上传区域、待投递列表）
5. `initUploadZone()` 仍能正确绑定事件

## 5. 影响范围

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 首页（#view-home） | 无影响 | 只改 #view-resume 布局 |
| 简历上传 | 无功能影响 | 仅位置变化，功能不变 |
| 待投递列表 | 无功能影响 | 仅位置变化，功能不变 |
| Modal | 无影响 | Modal 在首页，不受影响 |

## 6. 回退方案

- `git checkout -- crawler/extension/dashboard.css crawler/extension/dashboard.js`
