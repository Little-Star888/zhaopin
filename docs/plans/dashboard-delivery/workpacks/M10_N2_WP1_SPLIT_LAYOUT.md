# 工作包 M10-N2-WP1：分屏布局重构

> 目标：工作台从堆叠布局改为7:3 CSS Grid分屏
> 角色：前端
> 预估改动量：~50行HTML+CSS

## 1. 前置条件
- M10-N1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` | 当前工作台结构 |
| `crawler/extension/dashboard.js` | loadResumeView() |
| `crawler/extension/constructivism-mockup.html` | .ws分屏结构（L95-L97） |

## 3. 改动规格

### 3.1 dashboard.html 结构改造

将 `#view-resume` 内的两个独立section改为 `.ws` Grid容器：

```html
<div id="view-resume" style="display:none">
  <div class="ws">
    <div class="ws-del">
      <h3>待投递列表 <span id="delivery-count"></span></h3>
      <div id="delivery-content"></div>
    </div>
    <div class="ws-res" id="wsResPanel">
      <h3>简历预览</h3>
      <div id="resume-content"></div>
    </div>
  </div>
</div>
```

### 3.2 CSS（参考设计稿L95-L110）

```css
.ws{display:grid;grid-template-columns:7fr 3fr;gap:0;background:#1A1A1A;min-height:600px}
@media(max-width:900px){.ws{grid-template-columns:1fr}}
.ws-del{background:#F4F0EA;padding:28px;border-right:4px solid #1A1A1A}
.ws-res{background:#1A1A1A;color:#F4F0EA;padding:28px;overflow-y:auto;max-height:calc(100vh - 56px)}
```

## 4. 验证
- [ ] 7:3分屏渲染正确
- [ ] 窄屏回退为单列
- [ ] 投递列表在左侧，简历在右侧
