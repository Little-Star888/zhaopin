# 工作包 M8-N3-WP4：AI 功能交互集成

> 目标：在 Dashboard 中集成"AI 优化简历"和"AI 智能匹配"按钮
> 角色：前端
> 预估改动量：新增 ~60 行 JS + ~30 行 CSS

## 1. 前置条件

- M8-N3-WP1、WP2 通过（AI API 就绪）
- M8-N3-WP3 通过（配置面板就绪）
- M7-N3-WP4 通过（简历编辑就绪）

## 2. 改动规格

### 3.1 新增 dashboard-api.js 方法

```js
export async function optimizeResume(jobId, instructions) {
    const res = await fetch(`${BASE}/api/ai/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, instructions })
    });
    return res.json();
}

export async function matchJobs(jobIds) {
    const res = await fetch(`${BASE}/api/ai/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds })
    });
    return res.json();
}
```

### 3.2 UI 按钮

在简历编辑区域添加：
- "AI 优化简历" 按钮（点击后调用 /api/ai/optimize，结果替换编辑器内容）
- 在待投递列表添加：
- "AI 智能匹配" 按钮（点击后调用 /api/ai/match，结果插入匹配分数）

### 3.3 Loading 和错误处理

- AI 调用期间按钮显示 loading，禁止重复点击
- 未配置 AI 时按钮 disabled，hover 提示"请先配置 AI"
- 调用失败显示 toast 错误提示
- 调用成功显示 toast 成功提示

## 4. 验证

- [ ] "AI 优化简历" 调用成功，编辑器内容更新
- [ ] "AI 智能匹配" 调用成功，匹配分数显示
- [ ] 未配置 AI 时按钮禁用
- [ ] 调用期间有 loading 状态
- [ ] 调用失败有错误提示
