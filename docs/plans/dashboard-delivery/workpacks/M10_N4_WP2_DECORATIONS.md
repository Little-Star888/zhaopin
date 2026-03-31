# 工作包 M10-N4-WP2：装饰元素实现

> 目标：实现.vlabel、.anim动画、.mock-nav、Toast样式
> 角色：前端
> 预估改动量：~40行CSS+JS

## 1. 前置条件
- M10-N4-WP1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/constructivism-mockup.html` | 装饰元素（L16-L22, L178-L182） |

## 3. 改动规格

### 3.1 .vlabel 大字背景
参考设计稿L16：`position:absolute; font-size:120px; font-weight:900; color:rgba(26,26,26,.04)`

### 3.2 .anim 入场动画
参考设计稿L21-L22 + L419-L421：IntersectionObserver + translateY + opacity过渡

### 3.3 .mock-nav 子导航
参考设计稿L17-L19：每个section内的导航条

### 3.4 Toast样式对齐
参考设计稿L178-L182：红色成功 `.t--ok`、黑底黄字错误 `.t--er`

## 4. 验证
- [ ] 大字背景正确显示（不影响交互）
- [ ] 卡片入场动画正常触发
- [ ] 子导航正确显示
- [ ] Toast样式与设计稿一致
