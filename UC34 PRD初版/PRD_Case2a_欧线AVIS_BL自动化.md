# MBPTS UC34 · Case 2（欧线）AVIS 及提单自动化 — 产品需求文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | UC34 Case 2 欧线：AVIS 及提单（OOCL）自动化 场景 PRD |
| 版本 | v1.0.0 |
| 创建日期 | 2026-09-21 |
| 负责人 | BA（场景层，德勤实施输入） |
| 密级 | 内部 |

**文档用途**：Case 2 欧线单场景自包含 PRD（Q1 裁定，共性内容内嵌）。

**关联文档**：
- [需求澄清文档](./UC34_场景层PRD_需求澄清文档.md)
- [业务流程设计](./业务流程设计.md) / [本场景模块设计](./design/2.2_Case2欧线AVIS_功能设计.md)
- 上游基线：`Final_Version_MD/【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920.md`（V3 Refined；BR/FR/AC 与 §13 截图流程同为基线）

## 版本历史

| 版本号 | 修订日期 | 修订内容 | 状态 |
|---|---|---|---|
| v1.0.0 | 2026-09-21 | 初版 | 评审中 |

---

# 第一部分：产品概述

## 1.1 产品定义

- **产品名称**：AVIS 及提单自动化（欧线 OOCL）
- **所属系统**：MBPTS AI Quick-Win 统一平台
- **功能定位**：每周自动完成 AVIS/Shipper/BL 三类邮件单证的收集→登记→建档→DG 判定→模板填写→IES+ 导入→差异回写全流程
- **使用端**：Portal Web 端 + 平台公邮（业务自有公邮自动 Forward/抄送，Q23）+ IES+

## 1.3 产品范围

**包含**：AVIS 登记/PDC 建档（含 Other 兜底）、Shipper 判定 DG、OOCL BL 匹配与异常停止、AVIS/BL 模板、IES+ 批量导入 AVIS、DG FOB 差异填 Others、预报、集装箱导入、附件上传、大表状态回写、按周归档。

**不包含**：BL 的来源系统改造、未匹配 BL 的业务处置决策（平台只登记+续跑/标记手工）、Shipping Log 创建（欧线不做）、美线业务（另见 Case 2 美线 PRD）。

---

# 第二部分：业务背景与目标

## 2.1 业务问题

1. 欧线每周多口岸公邮三类邮件人工筛/建文件夹/抄表，单票约 10 分钟且错漏重演。
2. AVIS 与 BL 有 2–3 周时间差，人工对账靠记忆；DG FOB 差异手工比对易漏。

## 2.2 目标与指标

| 目标 | 描述 | 优先级 |
|---|---|---|
| 周一一键跑完上周数据 | 登记/建档/匹配/导入全自动 | P0 |
| 异常可预期 | 未匹配/缺字段/差异全部落入台账与人节 | P0 |
| 留痕 | 大表列位回写（E/G/HKN/J/L/M/P）完整 | P0 |

指标同项目层：≥90% / 85% 均为 Open Item（Q4）。

---

# 第三部分：用户角色与权限

| 功能 | IO 操作员 | 配置维护者 | 德勤 |
|---|---|---|---|
| 任务监控/手动周一触发 | ✔ | 只读 | ✔ |
| 未匹配 BL：确认续跑/标记手工处理（Q26=B） | ✔ | — | — |
| DG FOB 差异复核（Q25=A 自动填+记录） | 监控即可 | — | — |
| 公邮 Forward 清单、PDC↔Customer code、发件人/标题规则维护 | — | ✔（审核发布） | 协助 |

# 第四部分：术语定义

| 术语 | 说明 |
|---|---|
| AVIS | OOCL 船公司到港通知（含 AVIS 号、Arrival、ETA） |
| Shipper Decl | 危险品托运声明；命中即标记 DG（文件夹名加“ DG”） |
| 大表 | AVIS BL status report（Sheet3；欧线 sheet） |
| BL different | IES 集装箱导入差异弹窗明细 |

---

# 第五部分：用户故事

### US-C2A-001：每周收集与登记

**作为** IO **在** 每周一 **于** Portal **我想要** 平台公邮搜上周 AVIS 邮件，登记大表并按 PDC 建文件夹 **以便于** 不手动制表。

- AC1: 新 AVIS 登记 E（AVIS 号）/D（Arrival）/F（ETA）；重复不入
- AC2: Customer code↔PDC 未映射→Other 目录＋异常反馈，流程不断
- AC3: 文件夹命名 `Shippers Ref + OOLU + BL号 + ETA 2026.XX.XX`；船 GLC/MBUSI 子目录
- E1: 跨周重放相同邮件→防重；E2: 公邮访问异常→任务失败告警

### US-C2A-002：DG 判定（Shipper 搜索）

- AC1: 平台公邮按 AVIS 号搜发件人 mbox-006-gsp-lsa-vds2@（可配置）+ 标题 Shippers_Decl_*；命中→保存附件并改文件夹名加" DG"、写大表 M 列
- AC2: 未命中→按非 DG 继续
- E1: Shipper 到件晚于本周期→下次运行再判定（周批语义）

### US-C2A-003：BL 匹配与异常停

- AC1: 平台公邮标题含"Bill of lading"（发件人可配）→BL PDF 提取 AVIS 号→与大表已登记匹配且该行 BL No 空
- AC2: 未匹配→登记异常行（P 列"未找到对应 AVIS，请确认是否漏发"）＋该票停；Portal 人工确认续跑或标记手工处理（Q26=B）
- E1: 对已回写 BL 的同 AVIS 再跑→跳过防重（F-TR-002/FR-02）

### US-C2A-004：IES+ 导入与 DG FOB

- AC1: AVIS.xlsx 来自 AVIS PDF；IES+ MBZ/DN 查询→批量导入 AVIS（等绿灯）→回写 G 列
- AC2: DG 票发票级导出+比对 FOB 差异≠0→下 PDF 核对→改 Others→保存；PDF 缺失按差异值填并记异常；PDF 与导出值不一致以 IES 导出值为准并记录（Q25=A）
- E1: 三者 FOB 差异合计 0→跳过 Others 步骤

### US-C2A-005：预报/集装箱/附件/回写

- AC1: 预报字段全取自 BL PDF（船名航次直引）
- AC2: BL.xlsx Container Type 加单位"'"（BRD 注）
- AC3: 集装箱导入成功→"生成台账成功"；弹差异→捕获→写 L 列 BL different
- AC4: 附件全部上传成功→HKN 写 Y；全部完成→J 列 BL Creation
- E1: 附件某类上传失败→台账+重跑只补未成功部分

---

# 第六部分：业务流程

## 6.1 主流程（概览）

![主流程](./prototypes/images/diagrams/case2a-01-main.png)

## 6.2 整体详细流程（端到端，含分支与异常）

![整体详细流程](./prototypes/images/diagrams/case2a-02-detail.png)

> 说明：周批五段：到件→登记建档（Other 兜底）→DG 判定→BL 匹配（晚 2–3 周，周批对碰、未匹配停票走人工）→模板/IES（FOB 三种情形）→附件与大表回写。

## 6.3 前端 UIUX 逻辑（页面跳转与状态）

![前端 UIUX](./prototypes/images/diagrams/case2a-03-uiux.png)

## 6.4 后端开发详细逻辑（DAG 节点与数据流）

![后端开发详细逻辑](./prototypes/images/diagrams/case2a-04-backend.png)

## 6.5 业务视角泳道图（参考，共性骨架）

![业务流程图](./prototypes/images/业务流程图.png)

> **源文件**：[UC34_业务流程图.drawio](./UC34_业务流程图.drawio)（draw.io 可编辑）
> mermaid 源：[`diagrams/case2a/`](./diagrams/case2a/)（01-main / 02-detail / 03-uiux / 04-backend 四个 .mmd）

> 本场景节点链路（T1–T14）与规则 R2a.1~10 见 [design/2.2](./design/2.2_Case2欧线AVIS_功能设计.md)。


# 第七部分：功能设计

## 7.1 功能清单

| 编号 | 功能 | 优先级 | 原型 |
|---|---|---|---|
| C2A-F01 | 平台公邮 AVIS 收集登记（Q23 单点） | P0 | [任务中心](./prototypes/uc34-tasks.html) |
| C2A-F02 | Customer code→PDC 建档（含 Other 兜底） | P0 | [证据中心](./prototypes/uc34-evidence.html) |
| C2A-F03 | Shipper/DG 判定 | P0 | — |
| C2A-F04 | BL 匹配+防重+未匹异常 | P0 | [任务详情](./prototypes/uc34-task-detail.html) |
| C2A-F05 | IES 导入 AVIS / 预报 / 集装箱 | P0 | — |
| C2A-F06 | DG FOB 差异 | P1 | [证据中心](./prototypes/uc34-evidence.html) |
| C2A-F07 | 附件上传与大表回写（E/G/HKN/J/L/M/P） | P0 | — |

## 7.2 核心业务规则（R2a.1–10 见 design/2.2 §2；要点）

- 搜索周末=上周一~周日；BL 发件/标题配置化防换船司；命名规则统一；晚到 BL 周批对碰（Q24=A）
- FOB 三种情形的选值规则；差异弹窗必须完整捕获原文；完成口径=E/G/HKN/J 全部回写才算

## 7.3 原型及交互规则说明

- 工作台待你处理（未匹配 BL 条目）→ [工作台](./prototypes/index.html) → 任务详情流程节点（人工处置两选择）
- 任务中心手动触发参数（周/公邮规则/船司关键字）
- 证据中心（OOCL 提单 PDF、Shippers PDF、大表导出副本）

![工作台](./prototypes/images/index.png)
![任务中心](./prototypes/images/uc34-tasks.png)
![任务详情](./prototypes/images/uc34-task-detail.png)

---

# 第八部分：数据需求

- `uc34_ledger_record` scene=C2_EU（sub_key=AVIS 号或 OOLU BL；diff_detail=L 列文本；outcome 含 UPDATED 差异态）
- `uc34_config_item`：口岸公邮 Forward 清单、Shipper/BL 规则、PDC 映射、搜索窗口
- `uc34_human_node`：BL_UNMATCH（决策 continue / manual-close，Q26=B）
- API：B1 手动触发、B2 批量重跑、B3 台账、B6 人工节点决议
- 错误码：400340x（BL 未匹配停票提示）、409340x（重复）、502340x（IES 差异)、424340x（公邮不可达）

# 第九部分：NFR

周批时长目标窗内完成（技术验证）；命名/映射/规则的版本化与 audit；S3 留存+周目录镜像（Q12）。

# 第十部分：约束与假设

- 公邮收敛（Q23）：业务侧自己配置 Forward/抄送，平台不巡检业务邮箱
- PDC↔Customer code 表的实时性由业务发布节奏决定
- 假设：IES 测试环境与样本文件由业务/客户确认（BRD §11 继承）

# 第十一部分：风险与待确认

| 编号 | 问题 | 影响 | 状态 |
|---|---|---|---|
| OI-C2A-1 | 最终公邮清单/发件人配置未冻结 | 规则命中 | OPEN（BRD §11 继承） |
| OI-C2A-2 | 测试账号/IES 测试环境 | 联调 | OPEN |
| OI-C2A-3 | 页面 UI 选择器验证（支持各版式截图） | 流程稳定 | OPEN |

# 附录

- 附录A 原型清单（同 Case 1）
- 附录B：`Final_Version_MD/【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920.md`（V3 BR/FR/AC/L 实测与大表列位）＋ `design/2.2_Case2欧线AVIS_功能设计.md`

**文档版本**：v1.0.0 | **编写日期**：2026-09-21 | **审核人**：待评审
