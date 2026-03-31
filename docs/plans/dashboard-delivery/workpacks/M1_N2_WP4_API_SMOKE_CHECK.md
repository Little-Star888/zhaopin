# 工作包 M1-N2-WP4：API 冒烟检测

> 目标：在进入契约文档节点前，把 7 个 API 端点全部验掉。
> 角色：测试/检验
> 预估改动量：0 行（纯检测，不改代码）

## 1. 前置条件

- M1-N2-WP2（Jobs 端点）已完成
- M1-N2-WP3（简历端点）已完成

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/jobs-handler.js` | 确认端点 pathname 和参数 |
| `controller/resume-handler.js` | 确认端点 pathname 和参数 |

## 3. 检测动作（按顺序执行）

### 3.1 Controller 启动

```bash
cd /home/xixil/kimi-code/zhaopin/controller
# 启动 Controller（如已启动则跳过）
node server.js &
sleep 2
```
- 预期：启动无报错，自动迁移到 V6

### 3.2 Jobs 端点（4 个）

```bash
# 空态
curl -s http://127.0.0.1:7893/api/jobs | python3 -m json.tool
# 预期：{"jobs":[],"total":0}

# 插入测试数据
node -e "
const j = require('./jobs-db');
j.batchInsertJobs([
  {platform:'boss',platformJobId:'S1',title:'前端',company:'A',location:'北京'},
  {platform:'boss',platformJobId:'S2',title:'后端',company:'B',location:'上海'},
  {platform:'liepin',platformJobId:'L1',title:'全栈',company:'C',location:'深圳'}
]);
"

# 列表查询
curl -s http://127.0.0.1:7893/api/jobs | python3 -m json.tool
# 预期：3 条记录

# 平台过滤
curl -s "http://127.0.0.1:7893/api/jobs?platform=boss" | python3 -m json.tool
# 预期：2 条（boss 平台）

# 详情
curl -s "http://127.0.0.1:7893/api/jobs/detail?id=1" | python3 -m json.tool
# 预期：{"job":{...}}

# 404
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:7893/api/jobs/detail?id=999"
# 预期：404

# 选中
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"id":1,"selected":true}' http://127.0.0.1:7893/api/jobs/select | python3 -m json.tool
# 预期：{"success":true,"id":1}

# 已选中列表
curl -s http://127.0.0.1:7893/api/delivery/selected | python3 -m json.tool
# 预期：只含 id=1
```

### 3.3 简历端点（3 个）

```bash
# 空态
curl -s http://127.0.0.1:7893/api/resume | python3 -m json.tool
# 预期：{"resume":null}

# 上传（需要准备测试文件）
echo "test resume content" > /tmp/test-resume.pdf
curl -s -F "file=@/tmp/test-resume.pdf" http://127.0.0.1:7893/api/resume/upload | python3 -m json.tool
# 预期：{"id":1,"filePath":"...","originalName":"test-resume.pdf",...}

# 获取
curl -s http://127.0.0.1:7893/api/resume | python3 -m json.tool
# 预期：返回简历信息

# 删除
curl -s -X DELETE "http://127.0.0.1:7893/api/resume?id=1" | python3 -m json.tool
# 预期：{"success":true}
```

### 3.4 CORS 验证

```bash
# chrome-extension 通过
curl -s -I -H "Origin: chrome-extension://abcdefghijklmnopqrstuvwxyz123456" \
  http://127.0.0.1:7893/api/jobs | grep -i "access-control"
# 预期：Access-Control-Allow-Origin 存在

# localhost 通过
curl -s -I -H "Origin: http://localhost:3000" \
  http://127.0.0.1:7893/api/jobs | grep -i "access-control"
# 预期：Access-Control-Allow-Origin 存在

# 恶意来源拒绝
curl -s -I -H "Origin: http://evil.com" \
  http://127.0.0.1:7893/api/jobs | grep -i "access-control"
# 预期：无输出（CORS 头不存在）
```

### 3.5 回归检测

```bash
curl -s http://127.0.0.1:7893/api/status | python3 -m json.tool
# 预期：正常返回
```

## 4. 通过标准

- 上述 14 项检测全部通过
- 无 500 错误
- 现有端点不受影响

## 5. 失败处理

- Jobs 端点失败 → 回到 M1-N2-WP2
- 简历端点失败 → 回到 M1-N2-WP3
- CORS 失败 → 回到 M1-N2-WP1
- 回归失败 → 检查是否误改现有路由

## 6. 边界（不做什么）

- 不修改任何代码
- 不新增测试文件
- 不启动前端
