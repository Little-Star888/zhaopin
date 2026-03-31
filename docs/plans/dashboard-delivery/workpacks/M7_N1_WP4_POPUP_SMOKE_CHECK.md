# 工作包 M7-N1-WP4：Popup 冒烟检测

> 目标：验证 Popup Constructivism PoC 的基本功能和视觉正确性
> 角色：测试/检验
> 预估改动量：0 行（纯测试）

## 1. 前置条件

- M7-N1-WP1、WP2、WP3 全部通过

## 2. 测试检查项

### 2.1 视觉检查

- [ ] Popup 背景为米白色 `#F4F0EA`
- [ ] 头部区域为红色 `#E62B1E`
- [ ] 所有卡片/按钮有 3px 黑色边框
- [ ] 无圆角（所有元素 border-radius: 0）
- [ ] 无阴影（所有元素 box-shadow: none）
- [ ] 标题为等宽字体 + 全大写

### 2.2 功能检查

- [ ] "打开工作台" 按钮可点击跳转
- [ ] "立即采集" 按钮可触发采集
- [ ] "配置设置" 按钮可打开配置
- [ ] "刷新Cookie" 按钮可执行刷新
- [ ] 功能开关（toggle）可正常切换
- [ ] 进度条正常显示（如触发采集）
- [ ] 消息提示正常显示和消失

### 2.3 代码检查

- [ ] `popup.css` 中无 `box-shadow`、`backdrop-filter`、`border-radius`、`linear-gradient`
- [ ] `popup.js` 中无 `.neu-*`、`.glass-*` 类名引用
- [ ] 无新增 npm 依赖
