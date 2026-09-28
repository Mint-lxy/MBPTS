# MBPTS UC34 · Case 5 ASN 自动创建（DSS 导入模板）— 产品需求文档

## 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | UC34 Case 5：ASN 自动创建（两支线） 场景 PRD |
| 版本 / 日期 | v1.0.0 / 2026-09-21 |
| 负责人 / 密级 | BA / 内部 |

**文档用途**：单场景自包含（Q1）。**关联**：[澄清文档](./UC34_场景层PRD_需求澄清文档.md)（Q5/Q41–Q44）、[业务流程设计](./业务流程设计.md)、[模块设计](./design/2.6_Case5_ASN_功能设计.md)、BRD 基线 `Final_Version_MD/【MBPTS-UC34】Case 5_ASN 自动创建_BRD_0920.md`。

## 版本历史

| 版本号 | 修订日期 | 修订内容 | 状态 |
|---|---|---|---|
| v1.0.0 | 2026-09-21 | 初版 | 评审中 |

---

# 第一部分：产品概述

## 1.1 产品定义与边界

- **名称**：ASN 自动创建（向 DSS）
- **定位**：按两条支线（MBPLAP 日定时 / X-entry 邮件驱动）自动组装 **DSS 导入模板**（9 字段）
- **边界（Q5=A / Q44=A）**：平台产出=导入模板文件；**不含** SPM/DSS 系统调用、EDI 下发、结果回传判定（均人工）；平台与 DSS/SPM 零集成

## 1.3 产品范围

**包含**：MBPLAP 支线（每日 12:00/17:00 两级 IES 导出→合并加总→模板）；X-entry 支线（报关代理送货邮件+IMS PO 邮件→诊断仪大表→PO 阻断转人工→顺次收货拆行→模板）；DSS 收货记录查询（自动/人工并列）；命名规则两式（`提单号_发票号` / `PN_日期`）。

**不包含**：DSS/SPM 侧任何动作；结果回传；上传失败在 DSS 侧的重传。

---

# 第二部分：业务背景与目标

## 2.1 业务问题

1. MBPLAP：人工每日从 IES 两级导出、按合并键手工加总填 9 字段模板
2. X-entry：送货邮件与 PO 邮件人工互查诊断仪大表，多 Item 拆分收货极易算错

## 2.2 目标与指标

| 目标 | 描述 | 优先级 |
|---|---|---|
| 定时自动生成 MBPLAP 模板 | 12:00/17:00 两个窗口 | P0 |
| X-entry 硬阻断可见 | PO 缺失即任务级人工补录（三字段） | P0 |
| 收货记录可查 | 自动与人工补录并列 | P0 |

指标 Open Item 同项目层。

---

# 第三部分：用户角色与权限

| 功能 | IO | 配置维护者 | 德勤 |
|---|---|---|---|
| 运行监控/手动触发（分单号/Pre-alert 日期批量） | ✔ | 只读 | ✔ |
| PO 人工补录（Q43=A 三字段） | ✔ | — | — |
| 诊断仪大表/固定值 vendor/触发规则维护 | — | ✔ | 协助 |

# 第四部分：术语定义

| 术语 | 说明 |
|---|---|
| DSS 导入模板 | 9 字段 Excel（ASN/Vendor BP/Delivery date/SPM PN/Quantity/Unit/PO/PO Item/ETA） |
| 诊断仪大表 | Star D orders 系；含 ID No.(order to GSP)、DPTS PO、Loaner pool、PN(D 列)、Qty(F 列) |
| 顺次收货 | 同 Material 多 Item 时按 Item 剩余量自第一行顺次消耗（示例 100→Item100×20 + Item200×80） |

---

# 第五部分：用户故事

### US-C5-001：MBPLAP 定时支线

**作为** 系统 **在** 每日 12:00/17:00 **于** IES+ **我想要** 导出预报+发票两级清单并产出模板 **以便于** 业务直接导入 DSS。

- AC1: 预报查询 Supplier=MBPLAP ∧ Pre-alert creation=当日→批量导出（附件 1）
- AC2: 发票 PN 级导出（附件 2；关键列 A/M/H/AE/Z）
- AC3: ASN=Invoice No.(A)；Vendor=191110510；Delivery=Invoice date(M)；SPM PN=Part Number(H)；Quantity=同 Invoice+Order+PN 加总(AE)；Unit=PC；PO=Order No.(Z)；PO Item=空（DSS supplier EDI 方案）；ETA=预报创建日+1
- AC4: 命名 `提单号_发票号`；手动触发支持按分单号/日期的批量查询重提交，随下次定时运行
- E1: 当日无数据→台账记"当日无数据"成功终态；E2: Order No. 缺失（Case 3 导入未补）→异常 Remark

### US-C5-002：X-entry 邮件支线

**作为** 系统 **在** 收报关代理送货邮件时 **于** 收件箱 **我想要** 由 AWB 找 PN/QTY/ID No.、再由 ID No. 找 MBPTS PO，生成模板 **以便于** 不再人工查大表。

- AC1: 触发=@bjfcl.com ∧ 标题含"快件签收单"（可配置、发件人变更保持灵活）；半天时延可接受
- AC2: AWB→大表 PN(D)/QTY(F, 多行合计)/ID No.(J);ID No.→灰色顶部区 MBPTS PO(M 列最上部)
- AC3: PO 空→硬阻断转人工：Portal 录入 PO 号/Part No./线下已收货数量（Q43=A 三字段）后随下次运行继续
- AC4: ETA=Fullcome 邮件日+1;ASN=进口发票 Our delivery note number(AWB 系统库查）;Vendor=191110260
- AC5: 仅新货收货；旧货/GLC 补货不 GR（判定同 Case 4）
- E1: 邮件与 PO 邮件时序倒置：Q41=A 送货邮件主触发，PO 未到货任务挂 WAIT_INPUT 到齐续跑
- E2: 邮件 QTY < 大表合计（BRD 注明不会发生）→Remark 记疑+转人工

### US-C5-003：顺次收货拆行 + 记录查询

- AC1: 同 Material 多 Item 从第一行 Item No. 顺次消耗（100→Item100 剩 20 收 + Item200 收 80）生成多行模板
- AC2: 模板 `PN_日期` 命名
- AC3: 收货记录 Portal 可查：自动与人工补录并列、模板可下载（[DSS 收货记录](./prototypes/uc34-receive-log.html)、[任务中心二级页签](./prototypes/uc34-tasks.html)）
- E1: 人工补录与自动记录同日冲突→人工行 source=MANUAL，不覆盖自动行

---

# 第六部分：业务流程

## 6.1 主流程（概览）

![主流程](./prototypes/images/diagrams/case5-01-main.png)

## 6.2 整体详细流程（端到端，含分支与异常）

![整体详细流程](./prototypes/images/diagrams/case5-02-detail.png)

> 说明：两支线并行：A=MBPLAP 定时两级导出→合并加总→模板「提单号_发票号」；B=X-entry 送货邮件触发+IMS PO 等齐到货(WAIT_INPUT)→诊断仪大表→PO 阻断人工补录→顺次拆行收货→模板「PN_日期」；收货记录两支汇合。

## 6.3 前端 UIUX 逻辑（页面跳转与状态）

![前端 UIUX](./prototypes/images/diagrams/case5-03-uiux.png)

## 6.4 后端开发详细逻辑（DAG 节点与数据流）

![后端开发详细逻辑](./prototypes/images/diagrams/case5-04-backend.png)

## 6.5 业务视角泳道图（参考，共性骨架）

![业务流程图](./prototypes/images/业务流程图.png)

> **源文件**：[UC34_业务流程图.drawio](./UC34_业务流程图.drawio)（draw.io 可编辑）
> mermaid 源：[`diagrams/case5/`](./diagrams/case5/)（01-main / 02-detail / 03-uiux / 04-backend 四个 .mmd）

> 本场景两支线节点链路见 [design/2.6](./design/2.6_Case5_ASN_功能设计.md)。


# 第七部分：功能设计

| 编号 | 功能 | 优先级 | 原型 |
|---|---|---|---|
| C5-F01 | MBPLAP 两场定时+手动批量 | P0 | [任务中心](./prototypes/uc34-tasks.html) |
| C5-F02 | IES 两级导出 | P0 | — |
| C5-F03 | MBPLAP 映射与合并 | P0 | — |
| C5-F04 | X-entry 触发与邮件解析 | P0 | — |
| C5-F05 | 诊断仪大表查询与 PO 阻断 | P0 | [任务详情](./prototypes/uc34-task-detail.html) |
| C5-F06 | 顺次收货拆行 | P0 | — |
| C5-F07 | DSS 模板生成与命名 | P0 | [证据中心](./prototypes/uc34-evidence.html) |
| C5-F08 | 收货记录查询页 | P0 | [DSS 收货记录](./prototypes/uc34-receive-log.html) |
| C5-F09 | PO 人工补录表单 | P1 | 任务详情内嵌（同 Q48） |

核心规则 R5.1–R5.6 在 design/2.6 §3。

## 7.3 原型

![DSS 收货记录](./prototypes/images/uc34-receive-log.png)

- DSS 收货记录列：生成日期/支线/ASN/SPM PN/PO/Item/QTY/ETA/来源（自动/人工补录）/模板文件
- 一键导出 Excel；页面注明"平台产出 DSS 导入模板为止"边界（Q44）

# 第八部分：数据需求

- `uc34_dss_receipt_record`（查询页数据源；字段见 design/3~5 §A3）
- `uc34_ledger_record` scene=C5_MBPLAP / C5_XENTRY
- `uc34_config_item`：触发双重邮件、vendor 固定值、诊断仪大表（与 Case 4 合并，Q42=A）、命名模板
- API：B5 收货记录查询/导出、B1/B2、B6 人工节点（PO_FILL）
- 错误码：424340x（诊断仪大表/SharePoint 未就绪）、400340x（补录参数不全）

# 第九部分：NFR

定时窗口准点性与当日完成（目标值，Q54）；多 Item 拆行 O(n)；证据留存与版本。

# 第十部分：约束与假设

- Case 5 供应商固定值当前=191110510 / 191110260（配置可改）
- 诊断仪大表由业务定期上传维度表（Q42 与 Case 4 合并）
- IMS PO 邮件未来标题会带 PO 号（BRD 原注）

# 第十一部分：风险与待确认

| 编号 | 问题 | 状态 |
|---|---|---|
| OI-C5-1 | 报关代理/IMS 邮件格式稳定性 | OPEN（UAT 观察） |
| OI-C5-2 | DSS 模板的最新列航标（若 DSS 改版） | OPEN |
| OI-C5-3 | PO 阻断的人工 SLA | OPEN（业务内部） |

# 附录

原型清单（同 Case 1）+ BRD 基线 + `design/2.6_Case5_ASN_功能设计.md`。

**文档版本**：v1.0.0 | **编写日期**：2026-09-21 | **审核人**：待评审
