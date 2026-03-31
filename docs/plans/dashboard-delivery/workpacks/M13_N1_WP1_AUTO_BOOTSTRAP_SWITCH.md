# 工作包 M13-N1-WP1：ENABLE_AUTO_BOOTSTRAP 配置开关

> 目标：新增配置开关，控制扩展刷新后是否自动拉起采集
> 角色：后端
> 预估改动量：~10行JS

## 1. 前置条件
- M12 全部通过（Dashboard 手动采集链路可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` L382-397 | `restoreAlarms()` 中注册 `crawl_bootstrap` alarm 的逻辑 |
| `crawler/extension/background.js` L62 | `TASK_SOURCE_MODE` 常量定义位置 |

## 3. 改动规格
- 在 `background.js` 顶部常量区新增 `ENABLE_AUTO_BOOTSTRAP` 配置（默认 `false`）
- `restoreAlarms()` 中检查该开关：
  - `false`：跳过 `crawl_bootstrap` alarm 注册
  - `true`：保持原有自动注册行为不变
- 不修改 `TASK_SOURCE_MODE` 及其他已有逻辑

## 4. 验证
- [ ] `ENABLE_AUTO_BOOTSTRAP: false` 时，扩展刷新后不自动拉起采集
- [ ] `ENABLE_AUTO_BOOTSTRAP: true` 时，自动调度行为不受影响
- [ ] 手动触发 `START_CRAWL` 仍可正常执行（不受该开关影响）
