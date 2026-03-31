# 工作包 M10-N1-WP3：居中弹窗展开交互

> 目标：用居中弹窗(.exov+.expanel)替换手风琴展开
> 角色：前端
> 预估改动量：~80行JS+CSS

## 1. 前置条件

- M10-N1-WP2 通过（卡片类名已统一）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | handleCardExpansion()/closeExpanded() |
| `crawler/extension/constructivism-mockup.html` | 弹窗HTML+CSS（L70-L88, L279-L296） |

## 3. 改动规格

### 3.1 删除手风琴代码

删除 `handleCardExpansion()`、`closeExpanded()`、`loadExpandedDetail()` 函数。
删除 `.is-expanded`、`.accordion-overlay`、`.expanded-detail` 相关CSS。

### 3.2 新增弹窗HTML

在 dashboard.html 中添加弹窗容器（参考设计稿L198）：

```html
<div class="exov" id="exOverlay">
  <div class="expanel">
    <button class="exclose" id="exClose">&times;</button>
    <div class="exbody" id="exBody"></div>
  </div>
</div>
```

### 3.3 新增弹窗CSS

从设计稿复制 `.exov`、`.expanel`、`.exclose`、`.exbody`、`.extitle`、`.exsal`、`.exinfo`、`.extag`、`.exdesc`、`.exacts` 样式（L70-L88）。

### 3.4 新增 oex()/cex() 函数

参考设计稿的 `oex(id)` 和 `cex()` 函数（L279-L296）：

```javascript
let curExId = null;

function oex(id) {
  if (curExId === id) { cex(); return; }
  curExId = id;
  // 异步加载详情并填充 exBody
  loadExDetail(id);
  const ov = document.getElementById('exOverlay');
  ov.style.display = 'flex';
  requestAnimationFrame(() => ov.classList.add('on'));
  document.body.style.overflow = 'hidden';
}

function cex() {
  curExId = null;
  const ov = document.getElementById('exOverlay');
  ov.classList.remove('on');
  setTimeout(() => { ov.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
}
```

### 3.5 事件绑定

- 遮罩点击关闭
- ESC 键关闭
- 关闭按钮点击关闭
- "加入待投递"按钮绑定 selectJob()

## 4. 验证

- [ ] 点击卡片弹出居中弹窗，scale动画
- [ ] 弹窗显示职位详情（标题、薪资、标签、描述）
- [ ] ESC键关闭弹窗
- [ ] 点击遮罩关闭弹窗
- [ ] 点击关闭按钮关闭弹窗
- [ ] 再次点击同一卡片关闭弹窗
- [ ] "加入待投递"按钮功能正常
- [ ] document.body.overflow 正确管理
