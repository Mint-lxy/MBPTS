# MBPTS UC34 · Case 1 危险品托运清单自动生成 — 产品需求文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | UC34 Case 1：道路运输危险货物托运清单自动生成 场景 PRD |
| 版本 | v1.0.0 |
| 创建日期 | 2026-09-21 |
| 负责人 | BA（场景层，德勤实施输入，Q3=A） |
| 密级 | 内部 |

**文档用途**：Case 1 单场景自包含 PRD（Q1 裁定：业务老师单读本份即可闭环——共性内容已内嵌，无需交叉查阅）。

**关联文档**：
- [需求澄清文档](./UC34_场景层PRD_需求澄清文档.md)（Q1–Q54 全部已澄清）
- [业务流程设计](./业务流程设计.md) / [本场景模块设计](./design/2.1_Case1_危险品托运清单_功能设计.md)
- [原型导航（工作台）](./prototypes/index.html)
- 上游基线：`Final_Version_MD/【MBPTS-UC34】Case1：危险品托运清单自动生成_BRD_0920.md`（实施基线，含逐步截图流程，本文以附录引用）

## 版本历史

| 版本号 | 修订日期 | 修订人 | 修订内容 | 状态 |
|---|---|---|---|---|
| v1.0.0 | 2026-09-21 | BA/Devin | 初版（基于 Final BRD 0920 + 54 问澄清） | 评审中 |

---

# 第一部分：产品概述

## 1.1 产品定义

- **产品名称**：危险品托运清单自动生成（UC34 Case 1）
- **所属系统**：MBPTS AI Quick-Win 统一平台（PTS Portal + Airflow + Agent/Browser）
- **功能定位**：自动在 IES+ 筛选含危险品的进口预报、按 UN 号四分支判断是否需要制单、生成 Word 托运清单、上传 IES+ 并存档、通知 IO
- **使用端**：Portal Web 端（工作台/任务中心/证据中心/配置中心）+ 平台公邮 + IES+

## 1.2 核心价值

| 价值维度 | 价值描述 | 受益人群 |
|---|---|---|
| 人力释放 | 空运每日 + 海运每周的全量筛选-查表-制单-上传-发信等十步由人工转自动 | IE 操作同事 |
| 合规时效 | 危险品单证强制件由系统日历硬触发、防遗漏 | 关务合规 |
| 可追溯 | 每票五段式证据（原件/截图/规则判定/台账） | 管理/审计 |

## 1.3 产品范围

**包含**：触发（定时+手动）→ IES+ 预报筛选导出 → part list → UN 判定（附表 4，四分支）→ Shippers_Decl 下载 → Word 托运清单生成与 IES+ 上传 → 运行台账（附表 5）→ 邮件通知 → 存档。

**不包含**：托运清单的线下盖章签批、SDS 内容实质审查（合规判断仍靠附表 4 I 列值+人工兜底）、IES+ 源系统改造、Case 5 范围外的其他 UC34 场景。

---

# 第二部分：业务背景与目标

## 2.1 业务问题

1. 当前每天（空运）/每周（海运）由人工在 IES+ 反复筛选导出、逐票查 UN 表、手工填 Word、逐票上传——重复、易漏、耗时。
2. UN 判定含 4 类分支，人工规则切换极易错（尤其中文 SDS 第 14 章运输名称的格式差异）。
3. 出错修正后重跑靠人工记忆窗口；运行结果台账靠手工维护。

## 2.2 业务目标与成功指标

| 目标 | 描述 | 优先级 |
|---|---|---|
| 替代人工制单 | 托运清单全流程自动跑通（含四分支判定） | P0 |
| 失败可恢复 | 业务修正后可批量重跑，与下次定时任务合并运行 | P0 |
| 台账完备 | 成功/失败/不需制单每行均落台账，邮件可送达 IO | P0 |

| 指标 | 目标值 | 测量方法 |
|---|---|---|
| 字段级识别准确率 | ≥90%（**Open Item**，待业务回签 v1.6 #11） | UAT 抽样 |
| 单票自动完成率 | 85%（**Open Item**：不含手写的整体口径，待澄清） | 阶段评估 |

---

# 第三部分：用户角色与权限

| 功能 | 业务操作员 (IO) | 配置维护者 | 德勤实施 |
|---|---|---|---|
| 任务监控/详情/证据 | ✔ | ✔（只读） | ✔ |
| 手动触发（按空运/海运/分单号/日期） | ✔ | — | ✔ |
| 失败批量重跑 | ✔ | — | ✔ |
| SDS 补齐后重跑（Q19） | ✔（先在 IES 传 SDS） | — | — |
| 长久执行中 停止+重触发 | 仅 Dev/INT（Q46） | — | ✔ |
| 附表 1–4 维度表维护、IO 收件人 loop、海运 PDC 清单 | — | ✔（经审核发布） | 协助 |

# 第四部分：术语定义

| 术语 | 说明 |
|---|---|
| 托运清单 | 道路运输危险货物托运清单（Word 模板，表头+危险货物明细单） |
| Shippers_Decl | Shipper's Declaration（危险品声明 PDF，IES+ 预报附件下载） |
| 附表 1–5 | 表头 Mapping / Decl 对应 / Package Type / Transport name(含 I 列判定值) / 运行结果台账 |
| 四分支 | 附表 4 I 列：Y / Y,查SDS第14章 / 待定,查IES+ Hazmat function / 待定,查包装规格净重 |

---

# 第五部分：用户故事

### US-C1-001：定时自动制单（空运/海运）

**作为** IO 业务操作员 **在** 空运每日 00:00 / 海运每周一 **于** Portal 任务中心
**我想要** 系统自动筛选并产出需制单清单 **以便于** 不逐票人工查判断。

- AC1: 空运按 Invoice Type=DGR + Pre-alert creation=当天；海运按 Invoice Type=Sea + PDC∈Hazmat 4 库房（可配置）+ Pre-alert creation=上周一~周日（Q14/Q16/Q20 已澄清）
- AC2: 导出清单→part list→UN 初判→剔除 AR∈{N,#N/A}→制单清单全链路自动
- AC3: 任务为中心三态可见（成功/失败/执行中），证据链完整（F-TC-010）
- E1: 导出为空（当日无单）→台账记"当日无数据"，任务以成功终态结束
- E2: IES 红灯/不可达→重试预算内重试，超限失败+告警（429/502 段）
- E3: 手动触发与定时同日重合→到件防重（F-TR-002），不产生重复任务

### US-C1-002：UN 四分支判定

**作为** 系统 **在** 制单清单形成后 **于** 规则判定节点
**我想要** 按附表 4 I 列值分流（Y / 查SDS第14章 / 查 Hazmat indicator / 查包装规格净重） **以便于** 决定是否制单及如何填明细。

- AC1: UN 为空→NA 不制单；UN=SET→按 Y 处理
- AC2: "查 SDS 第 14 章"→IES Hazmat 模块批量下载 SDS，提取第 14 章（"联合国运输名称"或"道路运输 JT/T 617"，"公路运输"分类优先）
- AC3: Hazmat indicator=N 且整票均此分支→整票不制单，台账写 N_Not required
- AC4: Unit N.W ≤4kg 分支同理整票判定；>4kg 但无 Shippers_Decl→Remark="含UN3082/UN3077，需进一步核查包装规格是否大于5L/5KG"，该票转人工
- E1: SD 缺失或 14 章取不到→Q19 终裁：挂人工节点（业务先在 IES 传 SDS 补齐证据 + Portal 节点内可手工改运输名称）→手动触发续跑；台账记"人工处理"
- E2: 一票 UN 兼有"待定×2"且均不需制单→整票 N_Not required（BRD §四-5）

### US-C1-003：生成并上传 Word 托运清单

**作为** 系统 **在** 判定完成后 **于** 填报/录入节点
**我想要** 按附表 1–4 填写 Word 模版本票并上传 IES+ **以便于** 完成合规制单。

- AC1: 表头三部分（PDC/Terminal WH/Invoice Type）取预报导出清单 ↔ 附表 1 Mapping
- AC2: 明细由附表 2/3/4 映射填写；Word 模板版本化（Q22=A）
- AC3: 上传前货件证据写入 S3(多截图)；命名=道路运输危险货物托运清单_BL/HAWB
- AC4: 台账登记：Shippers Decl uploaded Y/N、Consignment list upload Y/N/N_Not required、Remark
- E1: IES 返回差异→捕获原文+截图，写 Remark，任务失败可重跑
- E2: Word 模版版本与运行 Run 绑定（不漂移）

### US-C1-004：失败批量重跑

**作为** IO **在** 定时任务多票失败后 **于** 任务中心
**我想要** 按分单号或 Pre-alert creation 日期批量查询、重提交 **以便于** 和下一次定时任务一起运行。

- AC1: 筛选范围仅失败票；批量勾选提交
- AC2: 随以下定时任务一起运行（BRD 原语口径）
- AC3: 业务在 IES 修正数据后重跑仍防重（已上传的票不重复上传）
- E1: 重复提交同批→只产生一个有效队列（B2 幂等）

### US-C1-005：台账、邮件与存档

**作为** 系统 **在** 票终态后 **于** 输出节点
**我想要** 附表 5 台账追加 + 邮件通知 IO + 文件存档 **以便于** 业务留痕与追溯。

- AC1: 邮件收件人 loop 可配置（附表/规则配置）
- AC2: 存档结构=操作日期一级 + BL/HAWB 二级（MSDS、Shippers_Decl、part list、Word 清单一并存）
- AC3: 运行记录以 12/31 为按年分册
- E1: 邮件发送失败→重试后告警（F-NT-004），不阻塞台账

---

# 第六部分：业务流程

## 6.1 主流程（概览）

![主流程](./prototypes/images/diagrams/case1-01-main.png)

## 6.2 整体详细流程（端到端：触发 → IES 取数 → UN 判定 → 制单上传 → 台账/邮件/存档）

![整体详细流程](./prototypes/images/diagrams/case1-02-detail.png)

> 说明：按骨架阶段拆段：①触发与到件→②IES取出→③UN四分支判定（含 SDS 失败人工节点 SDS_FILL）→④制单与上传（IES 外部动作核对）→⑤台账/邮件/存档→⑥失败批量重跑回路。整票不需制单走 N_Not required 终态。

## 6.3 前端 UIUX 逻辑（页面跳转与状态）

![前端 UIUX](./prototypes/images/diagrams/case1-03-uiux.png)

## 6.4 后端开发详细逻辑（DAG 节点与数据流）

![后端开发详细逻辑](./prototypes/images/diagrams/case1-04-backend.png)

## 6.5 业务视角泳道图（参考，共性骨架）

![业务流程图](./prototypes/images/业务流程图.png)

> **源文件**：[UC34_业务流程图.drawio](./UC34_业务流程图.drawio)（draw.io 可编辑）
> mermaid 源：[`diagrams/case1/`](./diagrams/case1/)（01-main / 02-detail / 03-uiux / 04-backend 四个 .mmd）
> 字段级取数说明（每个节点读哪些字段、分别从哪里取）：[`diagrams/case1/README.md`](./diagrams/case1/README.md)

> 本场景节点链路细节（C1-T1~T11、异常路由、判定口径）见 [design/2.1](./design/2.1_Case1_危险品托运清单_功能设计.md)。


# 第七部分：功能设计

## 7.1 功能清单

| 编号 | 功能 | 优先级 | 原型 |
|---|---|---|---|
| C1-F01 | 定时+手动触发（日历可配置） | P0 | [工作台](./prototypes/index.html) / [任务中心](./prototypes/uc34-tasks.html) |
| C1-F02 | IES+ 预报筛选导出（空运 DGR/海运 Sea+PDC 集） | P0 | —（agent 流程） |
| C1-F03 | UN No. 判定（附表 4 维度表，四分支） | P0 | — |
| C1-F04 | Shippers_Decl 下载/重命名/证据 | P0 | [证据中心](./prototypes/uc34-evidence.html) |
| C1-F05 | Word 托运清单生成+IES+ 上传+截图 | P0 | [任务详情流程链](./prototypes/uc34-task-detail.html) |
| C1-F06 | 台账（附表 5）+IO 邮件通知+存档 | P0 | [任务中心 DSS/台账视图](./prototypes/uc34-tasks.html) |
| C1-F07 | 失败批量重跑 | P0 | [任务中心](./prototypes/uc34-tasks.html) |
| C1-F08 | SDS 补齐人工节点（Q19：IES 传 SDS + Portal 可改运输名称 + 手动触发续跑） | P0 | [任务详情嵌入节点](./prototypes/uc34-task-detail.html) |
| C1-F09 | 长久执行中 停止+重触发（仅 Dev/INT，Q46） | P1 | 任务详情按钮（生产隐藏） |

## 7.2 核心业务规则

- R1.1 Y→直接按附表 2/3/4 填明细。
- R1.2 Y,查 SDS 14 章→IES Hazmat 批量下载中文 SDS，取第 14 章运输名称（公路运输分类优先）；格式差异见 BRD 图例。
- R1.3 待定,查 Hazmat indicator：N→普通货不入明细；整票全为此→N_Not required。
- R1.4 待定,查包装规格/净重：Unit N.W ≤4kg→不入明细；>4kg 需 Shippers Decl，无则 Remark 人工核查。
- R1.5 UN=空→NA；UN=SET→Y。
- R1.6 PDC 海运四库房=维度表（不写死，Q16）。
- R1.7 失败修正重跑与定时合并。
- R1.8 触发日历全场景可配置（空运每日 00:00 默认、海运周一）。

## 7.3 原型及交互规则说明（场景相关页）

### 7.3.1 工作台（首页）

![工作台](./prototypes/images/index.png)

| # | 功能点 | 操作说明 |
|---|---|---|
| 1 | 六场景卡 | 本周量/执行中/失败；进入各场景（本 PRD=Case 1 卡） |
| 2 | 待你处理 | Case 1 人工节点（SDS 补齐/名称改）直接进入对应任务流程位置 |
| 3 | 快捷入口 | 跳转任务中心/上传中心 |

### 7.3.2 任务中心

![任务中心](./prototypes/images/uc34-tasks.png)

| # | 功能点 | 操作说明 |
|---|---|---|
| 1 | 状态 chips | 全部/执行中/待上传/有差异/失败/成功/已取消(Q48 补齐) |
| 2 | 手动触发 | Case 1 参数：空运/海运、分单号、日期窗口 |
| 3 | 失败批量重跑 | 按分单号或 Pre-alert creation 日期筛选勾选→并入下次定时任务 |

### 7.3.3 任务详情（业务流程链）

![任务详情](./prototypes/images/uc34-task-detail.png)

- 五段式节点链 + 证据 chip；人工节点内嵌（Case 1 的 SDS 节点在"校验判定"处）
- 停止+重触发按钮仅 Dev/INT 显示

### 7.3.4 证据中心

![证据中心](./prototypes/images/uc34-evidence.png)

- 按任务/BL 查询：原件（part list、Shippers_Decl、SDS）、快照、IES 截图、台账行

### 7.3.5 配置中心 / 审核中心

![配置中心](./prototypes/images/uc34-config.png)

Case 1 相关配置项：附表 1–4（维度表）、IO 收件人 loop、海运 PDC 清单、Word 模板（发布制品走审核）。

---

# 第八部分：数据需求

## 8.1 数据模型（本场景使用）

- `uc34_ledger_record`：附表 5 列（Pre-alert creation date 区间文本/PDC/BL-HAWB/Invoice Type/Terminal WH/Shippers uploaded/Consignment uploaded/Remark/Process date）+ 公共骨架（task_no/run_id/scene=C1 等）。
- `uc34_config_item`：附表 1–4=PDC 映射→form_ref 指向维度表版本；IO loop→F-RC 规则。
- `uc34_human_node`：SDS_FILL 节点（payload=运输名称+来源备注）。

## 8.2 API 接口

- `POST /api/uc34/tasks/manual-trigger`（scene=C1, window, keys）
- `POST /api/uc34/tasks/batch-rerun`（失败批量重跑）
- `GET /api/uc34/ledger?scene=C1` + export
- `POST /api/uc34/human-nodes/:id/resolve`（SDS_FILL resume）

## 8.3 错误码（本场景高频）

| 码段 | 含义 |
|---|---|
| 409340x | 重复登记/重复运行去重 |
| 500340x | SDS 识别失败/324 提取缺第 14 章（转人工 Q19） |
| 502340x | IES 红灯/上传返回差异（Remark 完整捕获） |
| 504340x | 长执行中（联动 P-04) |

---

# 第九部分：非功能性需求

| 类别 | 指标 | 要求 |
|---|---|---|
| 性能 | 日级批量完成在业务时间窗内 | 目标值，待 INT 验证（Q54） |
| 兼容 | IES+ 现行版页面 | 变化即失败关闭（AG-FR-027） |
| 安全 | 凭据托管，P-04 非生产限定 | NFR-C34-05/06 |
| 留存 | 清单+SDS+Decl+台账长存 S3 | 年度报告按年累积 |

# 第十部分：约束与假设

| 约束 | 说明 |
|---|---|
| IES+ 无 API | 全流程走 Browser 自动化+截图证据（Q15） |
| 公邮/平台邮箱预计 11 月就绪 | 本场景为 IES 触发不走邮箱，不受限 |
| 附表 1–5 由业务维护 | 平台维度表承载，版本固定入 Run |

| 假设 | 说明 |
|---|---|
| 附表数据可用 | 业务已提供 Data base 实表 |

# 第十一部分：风险与待确认

## 风险

| 编号 | 风险 | 等级 | 应对 |
|---|---|---|---|
| RSK-1 | 中文 SDS 14 章格式不一导致识别失败 | 中 | Q19 人工节点闭环；维度表规则持续增补 |
| RSK-2 | IES 批量导出行数上限/位变 | 中 | Agent 失败关闭+人工节点 |
| RSK-3 | 库房更换导致 PDC 清单过期 | 低 | 维度表+审核发布 |

## 待确认（Open Items）

| 编号 | 问题 | 影响 | 状态 |
|---|---|---|---|
| OI-C1-1 | 字段级准确率 ≥90%（v1.6 #11） | UAT 口径 | OPEN（业务回签） |
| OI-C1-2 | 85%（不含手写）验收口径 | 验收边界 | OPEN |
| OI-C1-3 | 测试账号/样本/IES 测试环境 | 联调 | OPEN（BRD 供应商待确认项继承） |

# 附录

## 附录A：原型文件清单

[工作台](./prototypes/index.html)、[任务中心](./prototypes/uc34-tasks.html)、[任务详情](./prototypes/uc34-task-detail.html)、[上传中心](./prototypes/uc34-upload.html)、[证据中心](./prototypes/uc34-evidence.html)、[配置中心](./prototypes/uc34-config.html)、[审核中心](./prototypes/uc34-review.html)。

## 附录B：相关文档

| 文档 | 说明 |
|---|---|
| `../Final_Version_MD/【MBPTS-UC34】Case1：危险品托运清单自动生成_BRD_0920.md` | BRD 基线（§ 一~九 + 附表 Data base），其逐步截图流程为实施行为基线（Q8=A，附录引用不复制） |
| `design/2.1_Case1_危险品托运清单_功能设计.md` | DAG/规则/异常/字段详情 |
| `UC34_场景层PRD_需求澄清文档.md` | Q1–Q54 全程记录 |

---

**文档版本**：v1.0.0 | **编写日期**：2026-09-21 | **审核人**：待评审
