# 工作包 M12-N1-WP3：基础数据适配（平台字段归一化）

> 目标：入库前将各平台字段格式归一化为统一格式
> 角色：后端
> 预估改动量：~30行JS
> 关键词：**入库前归一化**，不建统一模型引擎

## 1. 前置条件
- M12-N1-WP2 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | scraped_jobs 表 Schema（L856-L876） |
| `crawler/content.js` | Boss 爬虫输出格式（基准） |

## 3. 改动规格

### 归一化基准（以 Boss 格式为基准）

| 字段 | 基准格式 | 示例 |
|------|---------|------|
| salary | 大写K，范围分隔符 `-` | `"10K-15K"` |
| experience | 数字+年 | `"1-3年"` |
| education | 学历名称 | `"本科"` |
| keywords | 逗号分隔字符串 | `"Java,Spring,MySQL"` |

### 实现方式
- 归一化函数放在各平台的 content script **内部**
- 每个平台自行负责将自己的原始格式转为基准格式
- 不引入中间层、不引入适配器类
- 示例（新平台 content script 内）：
  ```javascript
  function normalizeSalary(raw) {
    // 平台特定转换逻辑，例如 "1万-1.5万" → "10K-15K"
    return normalized;
  }
  ```

### 缺失字段降级策略

| 场景 | 处理方式 |
|------|---------|
| 必填字段（title, company）缺失 | 跳过该条数据，不入库 |
| 选填字段（salary, experience, education）缺失 | 写入 `null` |
| keywords 为空 | 写入空字符串 `""` |
| 格式转换失败 | 保留原始值，不强制转换 |

### raw_payload 保障
- `raw_payload` 字段保留原始 JSON，归一化失败时可回溯
- 归一化函数为纯函数，不修改原始数据对象

## 4. 验证
- [ ] Boss 数据归一化后格式不变（回归验证）
- [ ] 新平台数据归一化后与 Boss 基准格式一致
- [ ] 缺失 salary/experience/education 时写入 null，不报错
- [ ] raw_payload 保留原始数据
- [ ] 必填字段缺失时跳过，不入库
