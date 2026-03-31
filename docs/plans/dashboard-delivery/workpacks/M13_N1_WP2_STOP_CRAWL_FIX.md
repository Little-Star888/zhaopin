# 工作包 M13-N1-WP2：停止采集真实中断

> 目标：点击停止后，采集主流程可在下一个检查点中断
> 角色：后端
> 预估改动量：~15行JS

## 1. 前置条件
- M13-N1-WP1 通过（`ENABLE_AUTO_BOOTSTRAP` 开关就绪）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` L538-543 | `STOP_CRAWL` 消息处理逻辑 |
| `crawler/extension/background.js` L955-1026 | 详情抓取循环（`hydrateJobDetails`） |
| `crawler/extension/background.js` L1801-1803 | `sleep()` 实现 |
| `crawler/extension/background.js` L1036 | `allJobs.push(...)` 合并位置 |

## 3. 改动规格
- `STOP_CRAWL` 处理保持现状：设置 `isRunning = false`，`crawlState.status = 'stopped_by_user'`
- 在采集主流程中增加标志位检查点：
  - 列表分页循环每次迭代前检查 `isRunning`
  - 详情抓取循环（`for` 循环）每次迭代前检查 `isRunning`
  - 每次 `sleep()` 前检查 `isRunning`
- 检查失败时：`break` 跳出当前循环，立即执行 `allJobs.push(...)` 合并已有数据，返回部分结果
- **不引入 `AbortController`**（当前手动模式规模 = 1 页 + 3 详情，标志位足够）

## 4. 验证
- [ ] 采集进行中点击"停止"，详情循环在下一条开始前中断
- [ ] 停止后已采集的数据正常入库
- [ ] 停止后 UI 状态更新为"已停止"
- [ ] 无 `AbortController` 引入，改动仅 `if (!isRunning) break`
- [ ] 备注：停止动作可能需要等待当前一段 sleep 结束后才完全中断（通常 <5 秒），属于正常现象
