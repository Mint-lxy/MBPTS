# 设计阶段 Plan — MBPTS UC34 Case 2:GLC / MBUSI 进口提单(AVIS/BL)自动化

> **创建日期**: 2026-09-28 | **状态**: 待审批 | **阶段**: Stage 2

---

## 步骤

- [x] 1. 设计业务流程(双线泳道 drawio + PNG,Q11 已确认)
- [x] 2. 按模块设计功能(7 个模块,详见设计说明书第 2 章)
  - [x] 2.1 工作台(index)
  - [x] 2.2 任务中心(tasks)
  - [x] 2.3 任务详情(task-detail,GLC 7 节点 / MBUSI 10 节点)
  - [x] 2.4 邮件中心 + 规则编辑器(rules / rule-edit)
  - [x] 2.5 配置中心(config)
  - [x] 2.6 SharePoint 归档浏览(sharepoint)
  - [x] 2.7 平台能力引用(提醒/治理/RBAC/上传中心)
- [x] 3. 设计数据模型(逻辑模型,13 实体 + 关系 + 状态机,Q13)
- [x] 4. 设计 API 接口(平台接口 20 个 + IES+ 能力要求 I1~I7,Q14)
- [x] 5. 定义错误码(E1001~E5002,11 个)
- [x] 6. 设计非功能性需求指标
- [x] 7. 原型:复用 case2页面demo 为基线(Q12),11 页截图 + 任务详情 2 张
- [x] 8. 核心业务规则汇总(R1~R8,设计说明书第 3 章)
- [ ] 9. 产出设计文档,请求审批 ← 当前

---

## 原型确认检查清单

| 检查项 | 状态 |
|--------|------|
| 所有功能模块都有对应原型(demo 页面) | ☑ |
| 所有原型页面已截图为 PNG(13 张) | ☑ |
| 原型基线已经用户确认(Q12:复用 demo) | ☑ |
| 流程图 drawio + PNG 已生成(Q11 确认) | ☑ |

## 设计摘要

### 业务流程
- **整体流程**:GLC 线(T01→R01~R13→O01~O03,含 D01~D05 判断、E01~E04 异常、H01 人工)与 MBUSI 线(T11→M01~M11→O11~O13,含 DM1/DM2 判断、ME1/ME2 异常)双线泳道图;drawio 源文件 + 2 张 PNG。
- **As-Is/To-Be**:收单/归档/模板/IES 操作/异常/回写 6 维度对比(设计说明书 1.4)。

### 功能模块清单
| 模块 | 页面数 | 核心交互 | 原型/截图 |
|------|-------|---------|----------|
| 工作台 | 1 | 双线统计卡跳转 | index.png |
| 任务中心 | 1 | 状态筛选/批量重跑/CSV 导出 | tasks.png |
| 任务详情 | 1 | Run 切换/字段修正留痕/PDF 定位/证据预览/重跑 | task-detail.png, task-detail-mbusi.png |
| 邮件中心+规则编辑器 | 2 | 规则 CRUD/dry-run/三段式编辑 | rules.png, rule-edit.png |
| 配置中心 | 1 | 模板版本/对应表/调度配置 | config.png |
| SharePoint 归档 | 1 | 目录树/文件抽屉 | sharepoint.png |
| 平台能力引用 | 4 | 提醒/治理/RBAC/上传中心(空态) | notify/govern/rbac/dim-tables.png |

### 数据模型
- 逻辑模型 13 实体:MailRule、AttachmentLedger、StagingFile、Task、Run、NodeExecution、FieldResult、Evidence、ConfigTemplate、RefTable、WritebackRecord、Notification、AuditLog
- 状态机:Task(5 态)、Run(6 态)、AttachmentLedger(pending→processed)

### 接口与错误码
- 平台接口 20 个(任务/重跑/修正/证据/规则/配置/暂存/回写/归档/提醒/审计/导出)
- IES+ 能力要求 I1~I7(实现不限定,差异弹窗必须可捕获)
- 错误码 11 个(E1xxx 规则/E2xxx 配置/E3xxx IES/E4xxx 数据/E5xxx 权限)

### 非功能性需求
| 类别 | 关键指标 |
|------|---------|
| 性能 | 周批量 <2h;页面 <2s |
| 可靠性 | 检查点续跑;重跑去重 100% |
| 安全 | 凭证不入日志;四角色;全审计;证据 WORM |
| 可配置 | 调度/邮箱/路径/模板/对应表全配置化 |

---

**审批状态**: 待审批
**审批人**:
**审批意见**:
