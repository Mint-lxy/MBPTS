# MBPTS UC34 · Case 2（美线）MBUSI Shipping Log 及提单自动化 — 产品需求文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | UC34 Case 2 美线：MBUSI Shipping Log 及提单（CMA CGM）自动化 场景 PRD |
| 版本 | v1.0.0 |
| 创建日期 | 2026-09-21 |
| 负责人 | BA（场景层，德勤实施输入） |
| 密级 | 内部 |

**文档用途**：Case 2 美线单场景自包含 PRD（Q1）。

**关联文档**：
- [需求澄清文档](./UC34_场景层PRD_需求澄清文档.md)（含 Q28 样本实测）
- [业务流程设计](./业务流程设计.md) / [本场景模块设计](./design/2.3_Case2美线MBUSI_功能设计.md)
- 上游基线：`Final_Version_MD/【MBPTS-UC34】case 2：MBUSI_Shipping_Log_BL_Automation_BRD_0920.md`

## 版本历史

| 版本号 | 修订日期 | 修订内容 | 状态 |
|---|---|---|---|
| v1.0.0 | 2026-09-21 | 初版（含 gvShipLog 实测列结构） | 评审中 |

---

# 第一部分：产品概述

## 1.1 产品定义

- **产品名称**：MBUSI Shipping Log 及提单自动化（美线 CMA CGM）
- **功能定位**：每周从 Mercedes-Benz North America Central Warehouse 网站导出新增发运，大表登记防重，匹配 CMA CGM BL 邮件，填 Shipping Log/BL 模板并入 IES+
- **使用端**：Portal + 平台公邮 + 美线航运网站（Q27=B 仅主路，权限在途）+ IES+

## 1.3 产品范围

**包含**：网站导出 gvShipLog→大表新增登记→按 BL 拆分独立文件→平台公邮搜 CMA CGM BL 对碰（精确）→Shipping Log/BL 两个模板（VOL/Load 取自 BL.xlsx）→IES 批量导入 Shipping Log→预报→集装箱导入→附件上传→大表美线 sheet 回写。

**不包含**：Shipping Log/提单的源数据改造；未匹配 BL、漏数差异的线下业务能力确认（平台只登记+入口）。

---

# 第二部分：业务背景与目标

## 2.1 业务问题

1. 美线每周在网站导台账再对公邮匹配，动作多且需要盯 created 字段；漏数时 IES 建错预报
2. Shipping Log 与 BL 两套模板，体积重量要跨表拉。

## 2.2 目标与指标

| 目标 | 描述 | 优先级 |
|---|---|---|
| 周一自动跑 | 导出→登记→匹配→IES 全部 | P0 |
| 漏数可恢复 | 人工三步后 Portal 补传子表并触发重跑（Q29=A） | P0 |
| 差异可见 | 集装箱差异写 BL different | P0 |

指标：同项目层 Open Item。

---

# 第三部分：用户角色与权限

同 Case 2 欧线结构；另：美线网站账号权限由业务申请美国站点访问（Q27 外部依赖）；配置维护者维护 BL 标题关键字/PDC 映射/大表美线列映射。

# 第四部分：术语定义

| 术语 | 说明 |
|---|---|
| gvShipLog | 美线网站"Export to Excel"默认导出名（本 PRD 样本 16 列，见 §8） |
| Shipping log information_&lt;BL&gt; | 每 BL 行集拆分文件 |
| 大表美线 sheet | AVIS BL status report·美线 sheet |
| 漏数 | 网站 created 不回溯导致的错过；走人工三步 |

---

# 第五部分：用户故事

### US-C2B-001：网站导出与登记

**作为** 系统 **在** 每周一 08:00 **于** 航运网站 **我想要** Export to Excel 并登记新增 **以便于** 大表不漏不重。

- AC1: O 列 created∈{上周一~周日} 且大表未登记 → 登记（D 列 booking number=BL 号）
- AC2: 网站权限未开（Q27）→告警外部依赖，不入备路自动跑
- E1: 导出失败→不更新大表+失败告警

### US-C2B-002：拆分与建档

- AC1: 每 BL 行集单独存 `Shipping log information_<BL>.xlsx`
- AC2: 目录 `T盘/PDC/MBUSI/年周/<BL号> ETA YYYY.MM.DD`
- E1: PDC/ETA 缺失→不建夹+人工补（BRD §8）

### US-C2B-003：BL 邮件匹配

- AC1: 平台公邮标题="CMA CGM - 海运提单(Seaway Bill)可供使用"→BL PDF→ 与大表 booking number 精确对碰
- AC2: 未匹配→登记异常"收到提单但大表未登记"+该票停
- E1: BL 与 Booking 不一致但为同票（业界偶发）→异常登记转人工，不硬匹配

### US-C2B-004：模板填写与 IES+

- AC1: BL.xlsx 来自 BL PDF（对应关系 BRD image13）
- AC2: Shipping Log = 网站数据 + Container VOL(m³)/Load(KG) 取自 BL.xlsx
- AC3: IES 按 BOL 查询→批量导入 shipping log（绿灯）→全选预报并按 BL 填→集装箱信息导入 BL.xlsx（成功=台账生成；差异弹窗→BL different）
- E1: 缺 BL PDF 字段→不上传不完整模板

### US-C2B-005：漏数/差异人工三步

- AC1: 人工删 IES 原预报→确认 shipping 已更入大表子表→Portal 上传该提单+时间维度子表（自动存 PDC 目录）→手动触发重跑（Q29=A，[上传中心](./prototypes/uc34-upload.html) 入口②）
- E1: 补传文件格式错→服务端拒绝并提示

---

# 第六部分：业务流程

## 6.1 主流程（概览）

![主流程](./prototypes/images/diagrams/case2b-01-main.png)

## 6.2 整体详细流程（端到端，含分支与异常）

![整体详细流程](./prototypes/images/diagrams/case2b-02-detail.png)

> 说明：周批五段：网站导出→登记防重→BL 拆建→CMA CGM 对碰→SL/BL 模板与 IES→漏数/差异的三步人工补偿（上传中心②）。权限未就绪为前置外部依赖（42434 口径）。

## 6.3 前端 UIUX 逻辑（页面跳转与状态）

![前端 UIUX](./prototypes/images/diagrams/case2b-03-uiux.png)

## 6.4 后端开发详细逻辑（DAG 节点与数据流）

![后端开发详细逻辑](./prototypes/images/diagrams/case2b-04-backend.png)

## 6.5 业务视角泳道图（参考，共性骨架）

![业务流程图](./prototypes/images/业务流程图.png)

> **源文件**：[UC34_业务流程图.drawio](./UC34_业务流程图.drawio)（draw.io 可编辑）
> mermaid 源：[`diagrams/case2b/`](./diagrams/case2b/)（01-main / 02-detail / 03-uiux / 04-backend 四个 .mmd）

> 本场景节点链路与漏数三步补偿见 [design/2.3](./design/2.3_Case2美线MBUSI_功能设计.md)。


# 第七部分：功能设计

## 7.1 功能清单

| 编号 | 功能 | 优先级 | 原型 |
|---|---|---|---|
| C2B-F01 | 网站导出（账号为外部依赖 Q27） | P0 | — |
| C2B-F02 | 新增识别与大表登记 | P0 | [任务中心](./prototypes/uc34-tasks.html) |
| C2B-F03 | 按 BL 拆分建档 | P0 | [证据中心](./prototypes/uc34-evidence.html) |
| C2B-F04 | BL 邮件精确对碰 | P0 | [任务详情](./prototypes/uc34-task-detail.html) |
| C2B-F05 | SL/BL 模板 + IES | P0 | — |
| C2B-F06 | 漏数转人工 + 补传子表重跑 | P1 | [上传中心](./prototypes/uc34-upload.html) |

## 7.2 核心业务规则

- R2b.1~10 见 design/2.3 §2；created 不回溯语义必须常守；同 Material 多 Item 顺次收货拆分；台账成功/差异均终态

## 7.3 原型交互

工作台/任务中心（周一批量）/上传中心（补传子表入口②）/证据中心（gvShipLog、BL PDF、模板）。

![上传中心](./prototypes/images/uc34-upload.png)
![任务中心](./prototypes/images/uc34-tasks.png)
![证据中心](./prototypes/images/uc34-evidence.png)

# 第八部分：数据需求

- gvShipLog 16 列（Q28 样本实测）：A Ship Log File ID / D Booking Number(=BL；大表 E 列写 Shipping Log No) / E Departure Port / F Arrival Port（大表 D 列 Port）/ G PDC（大表 C 列）/ H ETA（大表 G 列）/ I ETD / J Container / K Container Type（加 "'"） / L Seal / M BOL / N Package Qty / O Created（窗口判定）/ P Last Update
- `uc34_ledger_record` scene=C2_US；`uc34_config_item`（网站入口/凭据=平台维护）；人工节点类型补传子表用 `INVOICE_UP` 类的专用 payload（BL+时间维度）
- API：B8 美线补传子表；错误码 424340x（美国站点权限未开通）

# 第九部分：NFR

周一 08:00 完成窗口目标（Q30）；重跑防重；凭据集中托管。

# 第十部分：约束与假设

| 约束 | 说明 |
|---|---|
| 美国站点权限（外部依赖） | 业务在申请中，未开通前本场景不上线（Q27） |
| 大表美线全列 | 以业务最终模板为准（Open Item） |
| gvShipLog 格式 | 以样本 16 列为准；网站改版即维度化调整 |

# 第十一部分：风险与待确认

| 编号 | 问题 | 影响 | 状态 |
|---|---|---|---|
| OI-C2B-1 | 美线大表完整列模板 | 字段回写列位 | OPEN（业务提供） |
| OI-C2B-2 | 美国站点账号 | 场景上线门槛 | OPEN（在途） |
| OI-C2B-3 | 测试文件与 IES 测试环境 | 联调 | OPEN |

# 附录

- 附录A 原型清单（同 Case 1）
- 附录B：`Final_Version_MD/【MBPTS-UC34】case 2：MBUSI_Shipping_Log_BL_Automation_BRD_0920.md` 与 Q28 样本（OneDrive 路径见澄清文档）

**文档版本**：v1.0.0 | **编写日期**：2026-09-21 | **审核人**：待评审
