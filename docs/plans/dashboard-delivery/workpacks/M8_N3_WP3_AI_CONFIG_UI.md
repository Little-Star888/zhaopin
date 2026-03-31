# 工作包 M8-N3-WP3：AI 配置面板 UI

> 目标：在 Dashboard 中实现 AI 配置表单 UI
> 角色：前端
> 预估改动量：新增 ~80 行 HTML/JS + ~60 行 CSS

## 1. 前置条件

- M8-N1-WP3 通过（GET/POST /api/ai/config 就绪）
- M7-N3 通过（Dashboard Constructivism 风格就绪）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` | 添加 AI 面板 DOM |
| `crawler/extension/dashboard.js` | 添加 AI 面板交互 |
| `crawler/extension/constructivism-mockup.html` | AI 面板设计稿 |

## 3. 改动规格

### 3.1 新增 dashboard-api.js 方法

```js
export async function getAIConfig() {
    const res = await fetch(`${BASE}/api/ai/config`);
    return res.json();
}

export async function saveAIConfig(config) {
    const res = await fetch(`${BASE}/api/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    return res.json();
}
```

### 3.2 AI 配置面板 DOM

在 `dashboard.html` 中添加 Constructivism 风格的配置面板：
- Provider 下拉选择（智谱AI / Kimi / OpenAI / 自定义）
- API Key 输入框（password 类型）
- Base URL 输入框（预填厂商默认值）
- Model 名称输入框
- 保存按钮

### 3.3 交互逻辑

- 切换 Provider 时自动填充默认 Base URL
- 保存成功后回显脱敏后的 Key（如 `abc123...xyz`）
- 未配置时显示"请先配置 AI"提示

## 4. 验证

- [ ] AI 配置面板在 Constructivism 风格下正确显示
- [ ] 切换 Provider 自动填充 Base URL
- [ ] 保存配置后 Key 脱敏回显
- [ ] 刷新页面后配置回显正确
