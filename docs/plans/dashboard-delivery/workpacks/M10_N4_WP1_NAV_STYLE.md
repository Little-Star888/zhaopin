# 工作包 M10-N4-WP1：导航栏视觉对齐

> 目标：导航栏视觉对齐.vnav，保留Hash路由
> 角色：前端
> 预估改动量：~30行CSS

## 1. 前置条件
- M10-N1+N2+N3 全部通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` | 当前nav结构 |
| `crawler/extension/constructivism-mockup.html` | .vnav样式（L12-L14） |
| `crawler/extension/dashboard.js` | 现有 initRouter() 和 hashchange 逻辑 |

## 3. 改动规格

### CSS 样式对齐
将当前 `.nav-tab` 样式对齐设计稿 `.vnav`：
- 黑色背景 `#1A1A1A`
- 红色底边 `border-bottom:4px solid #E62B1E`
- 大写字母 `text-transform:uppercase`
- 字母间距 `letter-spacing:1px`
- hover/active 状态 `background:#E62B1E`
保留3个标签页不变。

### Active 状态驱动机制（明确约束）

**只使用 hashchange 事件驱动 .vnav active 状态，不引入任何滚动监听。**

- 首屏加载：`initRouter()` 在 `DOMContentLoaded` 时读取 `window.location.hash`，匹配对应标签页设置 `.active` 类
- 无 hash 时默认激活 `#home`
- 标签页切换：`window.addEventListener('hashchange', ...)` 监听变化，更新 `.active` 类
- 直接通过带 hash 的 URL 访问：`initRouter()` 正确识别并激活对应标签页
- **禁止**：不使用 `IntersectionObserver`、不使用 `scroll` 事件、不检测滚动位置

### 现有代码保持
- `initRouter()` 函数逻辑保持不变，仅修改 CSS 类名
- `hashchange` 事件监听器保持不变

## 4. 验证
- [ ] 导航栏视觉与设计稿一致
- [ ] 3个标签页Hash路由正常
- [ ] hover/active状态正确
- [ ] 首屏加载时正确标签页高亮
- [ ] 通过带hash的URL直接访问时active状态正确
- [ ] 代码中无 scroll/IntersectionObserver 相关逻辑
