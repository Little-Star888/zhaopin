# 工作包 M7-N4-WP1：M4/M6 文档归档

> 目标：将已过时的 M4/M6 文档归档到 archive/ 目录
> 角色：文档
> 预估改动量：移动 6 个文件，修改 6 个文件

## 1. 前置条件

- M7-N1、N2、N3 全部通过

## 2. 改动规格

### 2.1 创建归档目录

```
docs/plans/dashboard-delivery/archive/
├── M4/
└── M6/
```

### 2.2 移动文件

| 原路径 | 目标路径 |
|--------|---------|
| `workpacks/M4_N1_WP1_PANTONE_COLOR_SYSTEM.md` | `archive/M4/M4_N1_WP1_PANTONE_COLOR_SYSTEM.md` |
| `workpacks/M4_N1_WP2_NEUMORPHISM_WARM_SHADOWS.md` | `archive/M4/M4_N1_WP2_NEUMORPHISM_WARM_SHADOWS.md` |
| `workpacks/M4_N2_WP1_LAYOUT_REVERSE_70_30.md` | `archive/M4/M4_N2_WP1_LAYOUT_REVERSE_70_30.md` |
| `workpacks/M4_N2_WP2_VISUAL_REGRESSION_CHECK.md` | `archive/M4/M4_N2_WP2_VISUAL_REGRESSION_CHECK.md` |
| `workpacks/M6_N1_WP2_POPUP_SMOKE_CHECK.md` | `archive/M6/M6_N1_WP2_POPUP_SMOKE_CHECK.md` |
| `workpacks/M6_N2_WP2_POPUP_REGRESSION_CHECK.md` | `archive/M6/M6_N2_WP2_POPUP_REGRESSION_CHECK.md` |

### 2.3 添加 DEPRECATED 标记

在每个被归档的文件顶部添加：
```markdown
> ⚠️ **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)
```

### 2.4 更新节点文档中的链接

更新 M4-N1、M4-N2、M6-N1、M6-N2 节点文件中指向已归档工作包的链接。

## 3. 验证

- [ ] archive/M4/ 和 archive/M6/ 目录各包含 3 个文件
- [ ] 原工作包目录不再包含这 6 个文件
- [ ] 归档文件顶部有 DEPRECATED 标记
- [ ] DEPRECATED 标记中的相对链接可正确跳转
