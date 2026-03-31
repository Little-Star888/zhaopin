# 工作包 M8-N3-WP2：岗位匹配 API

> 目标：新增 POST /api/ai/match 端点，AI 对简历和岗位列表进行匹配打分
> 角色：后端
> 预估改动量：新增 ~60 行

## 1. 前置条件

- M8-N1 通过（配置基础设施就绪）
- M8-N2 通过（LLM Factory 就绪）
- M7-N2 通过（简历 content_md 和 jobs 表就绪）

## 2. 改动规格

### 3.1 在 `controller/ai-handler.js` 中新增

```
POST /api/ai/match
Content-Type: application/json

Body: {
    "job_ids": [1, 2, 3, 4, 5]  // 可选，不传则匹配所有待投递岗位
}

Response: {
    "success": true,
    "matches": [
        {
            "job_id": 1,
            "title": "前端工程师",
            "company": "某公司",
            "score": 85,
            "reason": "技术栈高度匹配，3年经验符合要求..."
        },
        ...
    ]
}
```

### 3.2 Prompt 构建

```
System: 你是一个专业的招聘匹配顾问。请根据简历内容对以下岗位列表进行匹配度评分。
        对每个岗位给出 0-100 的分数和简短推荐理由。
        返回 JSON 格式结果。

User: 简历内容：
      {resume_content_md}

      岗位列表：
      1. {job_1_title} - {job_1_company} | {job_1_description}
      2. {job_2_title} - {job_2_company} | {job_2_description}
      ...
```

### 3.3 响应解析

AI 返回 JSON，后端解析为结构化数组。解析失败时返回原始文本。

## 4. 验证

- [ ] 有简历 + 有岗位 → 返回匹配分数和理由
- [ ] 指定 job_ids → 只返回指定岗位的匹配结果
- [ ] 无简历 → 返回 400
- [ ] 无岗位 → 返回 400
- [ ] AI 返回非 JSON → 降级返回原始文本
