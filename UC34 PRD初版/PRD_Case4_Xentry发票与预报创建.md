# MBPTS UC34 · Case 4 X-entry 发票与预报创建 — 产品需求文档

## 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | UC34 Case 4：X-entry 发票与预报创建 场景 PRD |
| 版本 / 日期 | v1.0.0 / 2026-09-21 |
| 负责人 / 密级 | BA / 内部 |

**文档用途**：单场景自包含（Q1）。**关联**：[澄清文档](./UC34_场景层PRD_需求澄清文档.md)（Q36–Q40）、[业务流程设计](./业务流程设计.md)、[模块设计](./design/2.5_Case4_Xentry_功能设计.md)、BRD 基线 `Final_Version_MD/【MBPTS-UC34】Case 4：X-entry 发票与预报创建_BRD_0920.md`（字段规则表 2.1–2.20 为字段级权威）。

## 版本历史

| 版本号 | 修订日期 | 修订内容 | 状态 |
|---|---|---|---|
| v1.0.0 | 2026-09-21 | 初版 | 评审中 |

---

# 第一部分：产品概述

## 1.1 产品定义

- **名称**：X-entry 发票与预报创建
- **定位**：Fedex 预报邮件带动图片版 PDF 的 20 项字段提取与新旧货判定，自动生成 IES 发票信息表、预报、备注（Remark），旧货自动备齐原出口报关单+旧机电声明
- **使用端**：平台公邮 + Portal（工作台/任务中心/上传中心/证据中心）+ IES+

## 1.3 产品范围

**包含**：触发（@fedex.com ∧ 标题关键字; 日内 12:00/20:00 两窗，Q17=A）→ 建档 → 缺 Invoice 特殊场景（Portal 补上传并做 HAWB 一致性校验，Q39=A）→ 20 项字段规则组 → 新/旧货四分支出库 → PN 查找 → INV/DN 表生成（合并规则）→ IES 上传+Remark1/2→预报+remark→PDF 归档上传→（仅旧货）报关单/盖章文件/旧机电声明→命名存档。

**不包含**：出口侧单证（Case 8 不在本批）、图片 PDF 无法识别情况的全自动兜底（转人工）、Fedex 系统改造。

---

# 第二部分：业务背景与目标

## 2.1 业务问题

1. 图片版 PDF 无结构化文本体，人工逐字段抄，20+ 字段 + 新旧货四分支人脑切换极易错
2. 旧货 进口材料（原出口报关单+4 份盖章文件+旧机电声明）跨目录检索费时
3. SN 一致性、原产地特例（Retail Data storage/台湾→TW、PAD 行）是反复处理错误热点

## 2.2 目标与指标

| 目标 | 描述 | 优先级 |
|---|---|---|
| 图片 PDF 结构化提取 | 20 项规则全自动 | P0 |
| 判定一致性 | 新旧货/loaner/GLC 补货四分支出库准确 | P0 |
| 旧货单证自动备齐 | 单次运行内完成 | P0 |

指标 Open Item（≥90%/85%）；Case 4 是项目识别率 PoC 场景。

---

# 第三部分：用户角色与权限

同 Case 1；人工节点含"缺 Invoice 补传"与"SN 不一致核实"（Q36=A 通过/不通过两条路）；诊断仪大表/PN list 由配置维护者版本化上传（Q38=A）。

# 第四部分：术语定义

| 术语 | 说明 |
|---|---|
| X-entry | 旧件/新件进口渠道（Fedex 承运） |
| 诊断仪大表 | Star D orders 系；含 Loaner pool、ID No.（order to GSP）、DPTS PO 列 |
| 四分支 | New order 新货 / Service Customer Repaired 纯旧货 / service kulanz=GLC 补货旧货 / loaner pool |
| PN list | 年度配件号映射表（Article no↔PN） |

---

# 第五部分：用户故事

### US-C4-001：触发与特殊场景

**作为** 系统 **在** 收 Fedex 邮件时 **于** 平台公邮 **我想要** 下载图片版 PDF 至存储根 **以便于** 启流程。

- AC1: 后缀+标题五类关键字可配置；运行窗口 12:00/20:00（Q17）
- AC2: 例外标题仍命中同流程（规则扩展，配置可加）
- AC3: 不含 Invoice→任务挂起人工节点：上传中心入口①补传（原始 pdf + invoice；服务端校 HAWB 一致，Q39=A）→通过后从"识别提取"节点续跑
- E1: 同一天重复抄送→防重；E2: 缺件超限待人工（WAIT_INPUT 时效提醒）

### US-C4-002：字段提取（BRD 2.1–2.20）

- AC1: HAWB 三处一致性（运单主页 Hawb/附页 Master 去空格/发票页 Hawb 任一）——只有 2.1/2.2 分别与 2.3 比（互比已删，BRD 原文删掉线标）
- AC2: DN/Invoice No/日期标准化、金额去千分位、G.W 多行总和、N.W 同行、Dimensions（空格/逗号=小数点、CM→MM、GW<1 保留两位如 0.435→0.44；尺寸乘积=VOL）
- AC3: Order No.=Your reference（非 Order number）；旧货整号，新货=下划线前段
- E1: 比不一致→停等人工核实（该票不录）
- E2: 图片模糊/倾斜→识别失败明确报错（不静默给空值）

### US-C4-003：新旧货与 PN 判定

- AC1: Order type=New order→新货；Service Customer Repaired→纯旧货；service kulanz→GLC 补货旧货
- AC2: loaner pool：取发票右上角 PO→诊断仪大表 ID No.(order to GSP) 查 Loaner pool=Y→取 PN list 中 loaner PN（只适用新货/GLC 补货旧货；loaner Remark1=「新货loaner pool」，按 BRD 原文，Q40=A）
- AC3: 纯旧货 PN→Star D orders（<2025-08-08）或 SharePoint 表（≥）以 SN 查上次进口 PN（Q38=A：两表均由业务上传维度表）
- E1: loaner 查不到 →按新货处理并记 Remark；E2: Star D 两库都查不到→转人工

### US-C4-004：发票信息表 + IES 上传 + Remark

- AC1: INV/DN 头体全字段按 BRD 映射；合并：同 MBZ/DN+Part→Item 号取首行、Qty/Item net weight/Total price 加总
- AC2: 品名：新货按显示；旧货 PAD 两行取 PAD 行（Qty=1）；原产地特例：旧货品名=Retail Data storage→CN、新货=取发票（Taiwan→TW）
- AC3: Remark1=新货/旧货/（GLC 补货旧货→新货）；Remark2=SN（多个顿号分隔；GLC 补货旧货附加"德国补的新货，旧的坏了"）
- E1: IES 上传 Warning→Remark 捕获→失败终态

### US-C4-005：预报 + 归档 + 旧货单证

- AC1: 预报字段：固定值 MAWB=000、Airline/Flight、Terminal WH（Q37=A 配置化不写死，默认 Fedex/联邦库）、DG=N、Direct flight=N、Arrival=首都国际机场、Departure=德国；提取值 HAWB/C.W/Pieces/G.W/VOL；留空 Avis/Freight charge/currency
- AC2: 预报 remark 规则同发票 remark
- AC3: 旧货：按 SN+exp./CDS 关键字抓**最后一次**出口报关单 + 四份盖章文件（盖章 return label/维修 letter/给海关情况说明/原进口报关单）入进口文件夹；旧机电声明：发票号/提运单号/SN/货值/落款日=生成当日
- AC4: SN 发票 vs 原出口报关单不一致→人工核实节点（Q36=A：通过续跑；不通过记 Remark 不走旧货单证）
- E1: 同 SN 多个出口单（多次维修）→取时间最新；E2: 盖章文件找不到某份→Remark 记缺项并告警

---

# 第六部分：业务流程

## 6.1 主流程（概览）

![主流程](./prototypes/images/diagrams/case4-01-main.png)

## 6.2 整体详细流程（端到端，含分支与异常）

![整体详细流程](./prototypes/images/diagrams/case4-02-detail.png)

> 说明：六段：到件(缺 Invoice 人工补传+HAWB 校验)→20 项提取(HAWB 三处一致)→判定(新旧货四分支出 PN)→发票表合并与 IES 上传(Remark 律)→预报+PDF 归档→（旧货）最后出口报关单+四盖章件+旧机电声明。

## 6.3 前端 UIUX 逻辑（页面跳转与状态）

![前端 UIUX](./prototypes/images/diagrams/case4-03-uiux.png)

## 6.4 后端开发详细逻辑（DAG 节点与数据流）

![后端开发详细逻辑](./prototypes/images/diagrams/case4-04-backend.png)

## 6.5 业务视角泳道图（参考，共性骨架）

![业务流程图](./prototypes/images/业务流程图.png)

> **源文件**：[UC34_业务流程图.drawio](./UC34_业务流程图.drawio)（draw.io 可编辑）
> mermaid 源：[`diagrams/case4/`](./diagrams/case4/)（01-main / 02-detail / 03-uiux / 04-backend 四个 .mmd）

> 本场景节点链路（T1–T15）与 20 项提取细则见 [design/2.5](./design/2.5_Case4_Xentry_功能设计.md)。


# 第七部分：功能设计

| 编号 | 功能 | 优先级 | 原型 |
|---|---|---|---|
| C4-F01 | 触发规则（后缀+五类标题+双窗口） | P0 | [任务中心](./prototypes/uc34-tasks.html) |
| C4-F02 | 图片 PDF 20 项提取 | P0 | — |
| C4-F03 | 新旧货四分支/PN 查找 | P0 | — |
| C4-F04 | 发票表生成+合并+IES 上传 | P0 | [任务详情](./prototypes/uc34-task-detail.html) |
| C4-F05 | Remark 规则（发票+预报） | P0 | — |
| C4-F06 | 生成预报（固定+提取+留空） | P0 | — |
| C4-F07 | 归档上传（HAWB 命名） | P0 | 证据中心 |
| C4-F08 | 旧货单证备齐 | P1 | — |
| C4-F09 | 缺 Invoice 人工节点+补传校验 | P0 | [上传中心](./prototypes/uc34-upload.html) ⓐ |
| C4-F10 | SN 不一致人工核实 | P0 | 任务详情内嵌 |

核心规则 R4.1–R4.8 在 design/2.5 §2，BRD 2.1–2.20 为字段权威。

## 7.3 原型

工作台待你处理（Case 4 补发票）、任务详情（补传表单内嵌）、上传中心入口①（HAWB 校验说明在页面内）、证据中心（原报关单/盖章文件/声明）。

![工作台](./prototypes/images/index.png)
![上传中心](./prototypes/images/uc34-upload.png)
![任务详情](./prototypes/images/uc34-task-detail.png)

# 第八部分：数据需求

- 发票信息表 20+ 字段：以 BRD 2.1–2.20 为权威（本 PRD 不复刻以免漂）
- `uc34_ledger_record` scene=C4（ext_json：新旧货口径等）
- `uc34_config_item`：trigger rules / Fedex-联邦库固定值 / PN list / 诊断仪大表 / 命名模板（SN 前缀四套示例）
- 人工节点类型：INVOICE_UP（补传）、SN_VERIFY（核实）
- API B7 补传 Invoice；错误码 400340x（HAWB 一致败）

# 第九部分：NFR

单票图片解读目标 P95 ≤5 min（目标值）；触发→完成 ≤半天（BRD）；证据全链 S3。

# 第十部分：约束与假设

- PN list 每年更换（配置中心提供新版上传）；
- Fedex/联邦库是默认配置可切换（Q37）；
- Star D orders 与 SharePoint 表均由业务上传维度表，平台不直读 SharePoint（Q38）。

# 第十一部分：风险与待确认

| 编号 | 问题 | 状态 |
|---|---|---|
| OI-C4-1 | 图片版 PDF 识别率（该项目 PoC 场景） | OPEN（UAT 验证） |
| OI-C4-2 | ADO.net/镜像文件格式抖动 | OPEN |
| OI-C4-3 | Star D orders 两库时效与同步频率 | OPEN（业务定周期） |

# 附录

原型清单（同 Case 1）；BRD 0920 基线；design/2.5。数据映射与命名规则详见 BRD 原表。

**文档版本**：v1.0.0 | **编写日期**：2026-09-21 | **审核人**：待评审
