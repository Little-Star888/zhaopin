# 工作包 M8-N1-WP4：配置基础设施冒烟检测

> 目标：验证 AI 配置基础设施的基本功能
> 角色：测试/检验
> 预估改动量：0 行（纯测试）

## 1. 前置条件

- M8-N1-WP1、WP2、WP3 全部通过

## 2. 测试检查项

### 2.1 Schema

- [ ] 数据库 schema_version 为 8
- [ ] ai_configs 表存在且结构正确

### 2.2 加密服务

- [ ] 加密 → 解密 往返一致性
- [ ] maskKey() 脱敏正确

### 2.3 API

- [ ] GET /api/ai/config 返回空数组（初始状态）
- [ ] POST /api/ai/config 保存配置成功
- [ ] GET 再次获取，返回脱敏后的配置
- [ ] 重复 POST 同一 provider，更新而非重复

### 2.4 安全

- [ ] 数据库中无明文 API Key
- [ ] GET 响应中无加密密文或明文 Key
