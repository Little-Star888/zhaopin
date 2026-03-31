> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M4-N2-WP2：视觉回归检测

> 目标：确认 M4 全部改动未造成功能回退或视觉异常
> 角色：测试/检验
> 预估改动量：0 行（纯检测）

## 1. 前置条件

- M4-N1-WP1（色值替换）通过
- M4-N1-WP2（暖色阴影）通过
- M4-N2-WP1（布局反转）通过

## 2. 检测清单

### 2.1 色值检测

| 检查项 | 状态 | 验证方法 |
|--------|------|---------|
| 页面背景为 Citron 色调 | [ ] | 视觉确认 + DevTools 检查 body background |
| 文字清晰可读（深色文字） | [ ] | 视觉确认 |
| 导航栏为浅色毛玻璃效果 | [ ] | 视觉确认 |
| Tab active 为凹陷态 | [ ] | 点击 Tab 确认 |
| 环境光斑颜色正确（橙锈+海蓝） | [ ] | 视觉确认 |

### 2.2 Neumorphism 检测

| 检查项 | 状态 | 验证方法 |
|--------|------|---------|
| 面板呈现暖色调新拟态效果 | [ ] | 视觉确认阴影为暖色调 |
| 按钮有外凸阴影 | [ ] | 视觉确认 |
| 上传区域 hover 有凹陷反馈 | [ ] | 鼠标悬停确认 |
| 投递项展开有凹陷效果 | [ ] | 点击展开确认 |

### 2.3 布局检测

| 检查项 | 状态 | 验证方法 |
|--------|------|---------|
| 工作台：待投递在左侧（~70%） | [ ] | 视觉确认 |
| 工作台：简历管理在右侧（~30%） | [ ] | 视觉确认 |
| 移动端仍为单列布局 | [ ] | 缩小浏览器窗口确认 |

### 2.4 功能回归检测

| 检查项 | 状态 | 验证方法 |
|--------|------|---------|
| 首页岗位列表正常加载 | [ ] | 刷新首页确认 |
| 点击卡片 → Modal 正常打开 | [ ] | 点击任意卡片 |
| "加入待投递" → Toast 显示 | [ ] | 点击按钮确认 |
| 简历上传（点击/拖拽）正常 | [ ] | 上传测试文件 |
| 待投递列表正常显示 | [ ] | 确认已选岗位在列表中 |
| "取消选择" → 岗位移除 | [ ] | 点击取消确认 |
| Hash 路由正常工作 | [ ] | 切换 Tab 后刷新 |
| ESC / 遮罩 / 关闭按钮均可关闭 Modal | [ ] | 分别测试 |

### 2.5 禁区检测

| 检查项 | 状态 | 验证方法 |
|--------|------|---------|
| `controller/` 目录无改动 | [ ] | `git diff controller/` |
| M1/M2/M3 文档无改动 | [ ] | `git status docs/plans/dashboard-delivery/milestones/` |
| M1/M2/M3 WP checkbox 未回退 | [ ] | 检查旧 WP 文档 |

## 3. 检测命令

```bash
# 基础：确认工作目录
cd /home/xixil/kimi-code/zhaopin

# 命令 1：检查 Controller 目录未被修改（应无输出）
git diff --name-only controller/

# 命令 2：检查 M1-M3 里程碑文档未被修改（应无输出）
git diff --name-only docs/plans/dashboard-delivery/milestones/

# 命令 3：确认旧 8 色变量不存在（应返回 0）
grep -c 'c-bg-dark\|c-bg-light\|c-accent-red\|c-accent-purple\|c-teal\|c-olive\|c-sand\|c-gray' \
  crawler/extension/dashboard.css

# 命令 4：确认新 PANTONE 色变量存在（应返回 > 0）
grep -c 'c-aquamarine\|c-radiant-yellow\|c-pink-dogwood\|c-primrose-yellow\|c-orange-rust\|c-citron\|c-text-primary' \
  crawler/extension/dashboard.css

# 命令 5：确认布局已改为 70/30
grep -c '7fr 3fr' crawler/extension/dashboard.css
```

## 4. 通过标准

- 上述全部检测项通过
- 检测命令全部返回预期结果
- 任何一项失败需记录并最小修复
- 不允许"带病通过"

## 4. 失败处理

- 功能回退 → 检查 JS 模板是否正确修改
- 视觉异常 → 检查 CSS 变量引用是否完整替换
- 禁区被触碰 → 立即回退，重新执行

## 5. 边界

- 不修改任何代码
- 不做性能测试
- 不做多平台测试
