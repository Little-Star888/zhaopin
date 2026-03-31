# 工作包 M8-N3-WP1：简历优化 API

> 目标：新增 POST /api/ai/optimize 端点，调用 LLM 优化简历
> 角色：后端
> 预估改动量：新增 ~60 行

## 1. 前置条件

- M8-N1 通过（配置基础设施就绪）
- M8-N2 通过（LLM Factory 就绪）
- M7-N2 通过（简历 content_md 字段就绪）

## 2. 改动规格

### 3.1 在 `controller/ai-handler.js` 中新增

```
POST /api/ai/optimize
Content-Type: application/json

Body: {
    "job_id": 123,  // 可选，指定目标岗位
    "instructions": "突出数据分析经验"  // 可选，用户自定义优化方向
}

Response: {
    "success": true,
    "optimized_content_md": "# 优化后的简历...",
    "changes_summary": "主要优化了以下方面：..."
}
```

### 3.2 Prompt 构建

```
System: 你是一个专业的简历优化顾问。请根据目标岗位要求优化以下简历内容。
        只返回优化后的 Markdown 格式简历，不要添加额外解释。

User: 目标岗位：{job_title} at {company}
      岗位要求：{job_description}
      优化方向：{instructions}

      简历内容：
      {resume_content_md}
```

### 3.3 错误处理

- 未配置 AI → 返回 400 "请先配置 AI 提供商"
- 无简历内容 → 返回 400 "请先上传简历"
- AI 调用失败 → 返回 500 + 错误信息

## 4. 验证

- [ ] 有简历 + 有 AI 配置 → 返回优化后的 Markdown
- [ ] 有简历 + 无 AI 配置 → 返回 400
- [ ] 无简历 → 返回 400
- [ ] 指定 job_id 时，Prompt 包含岗位信息
