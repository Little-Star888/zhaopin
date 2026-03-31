# 工作包 M12-N1-WP4：数据入库与验证

> 目标：采集数据正确写入scraped_jobs表
> 角色：后端
> 预估改动量：~40行JS

## 1. 前置条件
- M12-N1-WP3 通过（数据适配完成，字段已归一化）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | scraped_jobs表结构 |

## 3. 改动规格
- 确保POST /api/jobs支持多平台数据
- platform字段正确存储
- 去重逻辑基于(platform, platformJobId)联合唯一
- 接收的数据已由 WP3 归一化，直接入库即可

## 4. 验证
- [ ] 数据正确写入scraped_jobs
- [ ] platform字段值正确
- [ ] 去重正常工作
