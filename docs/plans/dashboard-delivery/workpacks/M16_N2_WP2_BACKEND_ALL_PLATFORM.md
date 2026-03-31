# 工作包 M16-N2-WP2：后端全平台串行执行

> 目标：background.js 收到 `platform: 'all'` 时串行执行 4 个平台采集
> 角色：后端
> 预估改动量：~20行JS

## 1. 前置条件
- M16-N2-WP1 通过（前端"全部"选项就绪）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` L463-466 | `START_CRAWL` 消息处理入口 |
| `crawler/extension/background.js` L955-1026 | 单平台采集执行逻辑 |

## 3. 改动规格
- `START_CRAWL` 消息处理中增加 `platform === 'all'` 分支：
  - 平台列表：`['boss', '51job', 'liepin', 'zhilian']`
  - 串行 `for...of` 循环，依次对每个平台执行采集
  - 每个平台采集完成后累加结果（岗位数、含描述数等）
  - 循环结束后合并为一次 `CRAWL_DONE` 消息发送给前端
  - 汇总格式：`{ totalJobs: N, byPlatform: { boss: n, '51job': n, ... } }`
- **不修改**单平台采集的核心逻辑
- **不引入**并发/队列机制（串行足够，最小改动）
- 停止按钮仍有效：循环中每轮开始前检查 `isRunning`

## 4. 验证
- [ ] `platform: 'all'` 时，4 个平台依次执行
- [ ] 前端只收到一次 `CRAWL_DONE` 消息（含汇总数据）
- [ ] 某个平台失败时，其余平台继续执行（try-catch 包裹单个平台）
- [ ] 点击停止后，当前平台完成后不再启动下一个平台
- [ ] 单个平台采集行为不受影响
