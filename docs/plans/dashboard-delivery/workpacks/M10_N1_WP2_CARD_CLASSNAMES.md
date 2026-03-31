# 工作包 M10-N1-WP2：卡片类名统一与渲染

> 目标：卡片DOM结构和类名对齐设计稿
> 角色：前端
> 预估改动量：~60行JS

## 1. 前置条件

- M10-N1-WP1 通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | renderJobCard() 函数 |
| `crawler/extension/constructivism-mockup.html` | 卡片HTML结构（L262-L277） |

## 3. 改动规格

### 3.1 类名映射

| 当前 | 改为 | 说明 |
|------|------|------|
| `.job-card` | `.card` | 卡片容器 |
| `.job-card__header` | `.card__head` | 标题行 |
| `.job-card__title` | `.card__title` | 职位标题 |
| `.job-card__platform` | `.card__plat` | 平台标签 |
| `.job-card__meta` | `.card__meta` | 元信息 |
| `.job-card__salary` | `.card__sal` | 薪资 |
| `.job-card__tags` | `.card__tags` | 标签容器 |
| `.job-card__tag` | `.card__tag` | 单个标签 |
| `.card__num` | 保留 | 编号 |
| `.card__fig` | 保留 | SVG图形 |

### 3.2 renderJobCard() 改造

按照设计稿的卡片HTML结构（L263-L276）修改 renderJobCard()：

```html
<div class="card anim" onclick="oex(${j.id})">
  <div class="card__num">${n}</div>
  <div class="card__head">
    <div class="card__title">${title}</div>
    <span class="card__plat">${platformName}</span>
  </div>
  <div class="card__meta">
    <div class="card__sal">${salary}</div>
    <div style="font-size:12px;line-height:1.4">${company} · ${location}</div>
    <div class="card__tags">${tagsHTML}</div>
  </div>
  <div class="card__fig">${svg}</div>
</div>
```

### 3.3 点击事件委托

将卡片的 click 事件委托给 Grid 容器，调用 `oex(id)` 打开弹窗。

## 4. 验证

- [ ] 卡片渲染结构与设计稿一致
- [ ] 类名全部统一为 `.card__*`
- [ ] 编号、标题、平台标签、薪资、公司·城市、标签正确显示
- [ ] SVG 图形正确显示
- [ ] 点击卡片触发弹窗（由WP3实现）
