# 里程碑 M5：多平台架构设计（Phase B）

> 状态：待开始
> 对应 PRD 阶段：Phase B（抽象设计文档）
> 前置里程碑：M4（UI 重构）
> 规划日期：2026-03-25

---

## 1. 里程碑目标

按照 PRD Phase B 的定义，产出多平台扩展所需的纯设计文档：
1. UnifiedJobModel 文档草案
2. Adapter/Executor 接口草案
3. Boss 专用逻辑边界标注
4. 第二平台候选排序与评估

**关键约束**：本里程碑只产出文档，不编写任何多平台抽象代码。

## 2. 范围边界

### 允许产出

| 产出 | 类型 |
|------|------|
| UnifiedJobModel 文档 | Markdown 文档 |
| Adapter/Executor 接口文档 | Markdown 文档 |
| Boss 逻辑边界文档 | Markdown 文档 |
| 第二平台候选评估文档 | Markdown 文档 |

### 禁止

| 范围 | 原因 |
|------|------|
| 多平台抽象代码 | PRD 原则："第二平台真实数据到手前不提前做抽象代码" |
| Controller 改动 | 后端逻辑属于后续阶段 |
| 扩展改动 | Chrome 扩展属于后续阶段 |

## 3. 节点列表

| 节点 | 标题 | 状态 |
|------|------|------|
| [M5-N1](../nodes/M5_N1_ARCHITECTURE_DESIGN.md) | 架构设计文档 | 待开始 |

## 4. PRD 依据

- PRD 第 2.3 节 Phase B："为多平台扩展做设计准备，只产出文档，不提前抽象代码"
- PRD 第 1.6 节 P1："输出 UnifiedJobModel 草案、Adapter/Executor 接口草案、标注 Boss 专用逻辑边界"
- PRD 第 3.3 节 FR-N01 ~ FR-N04
- PRD 第 6.3 节执行原则："文档先行，代码后置"

## 5. 通过标准

- 所有工作包 checkbox 通过
- 文档内容与现有代码（Boss 实现）一致
- 不包含任何代码实现
- M4 里程碑不受影响

## 6. 讨论文档

完整的三方讨论记录：[M4_M5_PLANNING_DISCUSSION.md](../M4_M5_PLANNING_DISCUSSION.md)
