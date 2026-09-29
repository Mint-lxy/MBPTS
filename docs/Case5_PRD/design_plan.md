# 设计阶段 Plan — MBPTS UC34 Case 5：ASN 自动创建（MBPLAP / X-entry）

> **创建日期**: 2026-09-29 | **状态**: 待审批 | **阶段**: Stage 2
>
> 设计基线：业务流程图（0928 双支线泳道图）+ 新版页面原型（`case5页面demo` 9 页）+ BRD 0922/0927 + Stage 1 澄清结论（Q1–Q4 均选 A）

---

## 步骤

- [x] 1. 设计业务流程（沿用 0928 泳道图，截图归档 `images/flow-01/02`）
- [x] 2. 按模块设计功能原型（9 页 demo 为原型基线，截图归档 `images/proto-01~09`）
- [x] 3. 设计数据模型（表结构 + 索引）
- [x] 4. 设计 API 接口（接口定义 + 请求/响应）
- [x] 5. 定义错误码
- [x] 6. 设计非功能性需求指标
- [x] 7. HTML 交互原型（用户提供 `case5页面demo`，不重复生成；截图取证完成）
- [x] 8. 产出设计文档，请求审批（2026-09-29 用户批准）

---

## 设计摘要

### 业务流程（To-Be）

**MBPLAP 支线（定时批量，票=分单号 HAWB/BL No.）**

```
定时 12:00/17:00（17:00 剔除 12:00 已运行分单号；手动批量重提交随下次定时运行）
  → R01 IES+ 进口预报批量导出（Supplier=MBPLAP ∧ Pre-alert creation=当日）
  → R02 取分单号 HAWB No.
  → R03 IES+ 发票信息按 PN 级模板导出（HAWB 批量粘贴查询）
  → R04 按映射填 DSS 模板（Qty 按 同发票号+同 Order No.+同 Part No. 合并加总）
  → R05 重命名「提单号_发票号」
  → O01 模板发布：Portal 可下载 + SharePoint 归档 MBPLAP\<YYYYMMDD_HHmm>\
```

**X-entry 支线（邮件触发，票=运单号 AWB No.）**

```
T11 公邮 asn@mb.cn 监控：报关代理送货邮件（@bjfcl.com ∧ 主题含「快件签收单」）＋ IMS PO 邮件（标题/正文含 PO 号）
  → R11 按 AWB 查诊断仪大表：PN(D列)、QTY(F列多行加总)、ID No.(J列)
  → D11 大表灰色区 M 列 MBPTS PO 已回填？
     ├─ 空 → E11 报错转人工、本票阻断 → H01 Portal 补录 ID No. → 下次运行续跑
     └─ 已有 PO → R12 按 PO 号搜 PO 邮件（标题/正文）
  → D12 同 Material 多 Item？（IMS 邮件 SPM 截屏）
     ├─ 是 → R13 顺次收货多行拆行（Item100 剩20收20 + Item200 收80）
     └─ 否 → R14 单 Item 单行
  → R15 按映射填 DSS 模板（ASN=进口发票 Our delivery note No.；ETA=Fullcome 邮件日+1；Vendor=191110260）
  → O11 模板「PN_日期」发布（Portal 下载 + SharePoint 归档 X-entry\<时间戳>\）
  → G01 收货记录表（自动+手工）→ O12 Portal 可查询（每 PO 已收/订购/剩余）
```

- 流程图源文件：`【UC34-Case5】ASN自动创建_业务流程图_20260927.html`（0928，已纳入交付目录引用）
- 截图：`images/flow-01-MBPLAP.png`、`images/flow-02-Xentry.png`

### 功能模块清单（原型=demo 9 页，F 编号供 PRD 引用）

| 编号 | 模块 | 页面 | 核心交互 | 优先级 |
|------|------|------|---------|--------|
| F01 | 工作台 | index.html | 双支线统计卡（总任务/已完成/执行中/待人工），点击下钻任务中心 | P1 |
| F02 | 任务中心 | tasks.html | 任务列表（状态/来源/关键字筛选）、新建任务（手动创建）、批量重跑、导出 CSV、工作台下钻横幅 | P0 |
| F03 | 任务详情 | task-detail.html | Task/Run 分层、节点执行轨迹、字段面板（定位/修正留痕）、原文预览、整单/节点重跑、触发历史 | P0 |
| F04 | 上传中心 | dim-tables.html | 进口发票补传、手工收货录入、ID No. 补录、收货记录抽屉（自动+手工）、提交记录 | P0 |
| F05 | 邮件中心 | rules.html | 监听规则（启停/优先级/试运行 dry-run）、邮件模板（Case5 空态） | P1 |
| F06 | 规则编辑 | rule-edit.html | 筛选条件、附件角色（正则/类型/必需/多份）、流程绑定+汇聚策略+OCR Schema | P1 |
| F07 | 配置中心 | config.html | DSS 导入模板版本管理（9 列查看/上传替换）；共享盘监听置灰（Case5 不用） | P1 |
| F08 | SharePoint 归档 | sharepoint.html | 目录树只读浏览：诊断仪大表 / MBPLAP\<时间戳> / X-entry\<时间戳> | P1 |
| F09 | 提醒中心 | notify.html | 待人工处理/成功提醒，点击跳转任务详情 | P1 |

### 核心业务规则（PRD 第七部分展开）

| 编号 | 规则 | 要点 |
|------|------|------|
| R1 | 触发规则 | MBPLAP 12:00/17:00 定时；17:00 剔除 12:00 已运行分单号；手动按分单号/Pre-alert 日期批量重提交随下次定时运行（Q3=A）。X-entry 双邮件监控，送货邮件主触发，PO 邮件未到挂 WAIT_INPUT 等齐续跑 |
| R2 | MBPLAP 映射规则 | ASN=Invoice No.(A)；Vendor=191110510；Delivery=Invoice date(M)；PN=Part Number(H)；Qty=AE 列按 发票+Order+PN 合并加总；Unit=PC；PO=Order No.(Z)；PO Item 置空；ETA=Pre-alert creation+1 自然日 |
| R3 | X-entry 映射规则 | ASN=进口发票 Our delivery note No.（按 AWB 查系统库）；Vendor=191110260；Shipment Date=Document date；PN/Qty=大表 D/F 列（F 多行加总）；PO=PO 邮件或大表 M 列；PO Item=IMS 邮件 SPM 截屏 Item Number（一 ITEM 一 SN 一行）；ETA=Fullcome 邮件日+1 |
| R4 | 阻断与人工补录 | 大表 M 列 PO 空→本票硬阻断转人工，Portal 补录 ID No. 后随下次运行续跑；系统库查不到进口发票→上传中心补传（PDF ≤20MB，建议 AWB 命名）后整单重跑 |
| R5 | 顺次收货 | 同 Material 多 Item 从第一行 Item No. 顺次消耗，拆多行模板；示例 QTY100=Item100×20+Item200×80 |
| R6 | 命名与归档 | MBPLAP=「提单号_发票号」、X-entry=「PN_日期」（Q1=A）；SharePoint 归档仅已完成票产出，诊断仪大表根目录唯一 |
| R7 | 收货记录 | 自动（RPA）与手工（PO+PN+线下数量）并列展示，手工行不覆盖自动行；手工数量按顺次收货摊销到 Item；前台默认不展示每 PO 明细但 BU 可搜索 |
| R8 | 留痕与审计 | UC34 全场景无人工审批；字段修正仅留痕（old→new，自下次执行生效，跨 Run 继承）；证据三件套（触发/过程/操作）WORM 防篡改 |

### 数据模型

| 表 | 用途 | 关键字段 |
|---|------|---------|
| `uc34_task` | 任务（票） | id, case_id, line(mbplap/xentry), waybill(HAWB/AWB), src, need(invoice/idno), status |
| `uc34_run` | 执行实例 | task_id, run_no, cause, status, started_at, duration, nodes(JSON) |
| `uc34_field_extract` | 字段抽取与修正留痕 | run_id, field_key, value, source(系统/规则/OCR), confidence, locator(doc,page), delta(old→new), carried |
| `uc34_mail_rule` | 邮件监听规则 | id, line, mailbox, priority, flow, enabled, criteria(from/to/subj/body/att range), attachments(role,regex,type,required,multi), ocr_schema, dedup_key |
| `uc34_receipt_record` | 收货记录（自动+手工） | po, item, part_no, qty, source(rpa/manual), awb, asn, task_id, created_at |
| `uc34_manual_upload` | 人工补录记录 | kind(invoice/receipt/idno), content, task_id, operator, result |
| `uc34_config_item` | 配置项 | line, type(dss_template/dim_table/vendor_fix), file, version, status |
| `uc34_evidence` | 证据留痕 | task_id, type(trigger/process/operation), hash, files |
| `uc34_notify` / `uc34_audit_log` | 提醒 / 操作审计 | link, read / actor, action, detail |

### API 接口（平台前后端）

| 编号 | 接口 | 说明 |
|------|------|------|
| B1 | `GET /api/uc34/tasks` | 任务列表（状态/来源/关键字/线路筛选） |
| B2 | `GET /api/uc34/tasks/{id}` | 任务详情（当前 Run + 节点 + 字段 + 证据） |
| B3 | `POST /api/uc34/tasks` | 手动创建/批量重提交（分单号或 Pre-alert 日期批量） |
| B4 | `POST /api/uc34/tasks/{id}/rerun` | 整单重跑 / 节点重跑（携带修正值） |
| B5 | `GET/POST /api/uc34/uploads` | 上传中心三入口提交（invoice/receipt/idno）+ 提交记录 |
| B6 | `GET /api/uc34/receipts` | 收货记录查询（PO/PN 搜索，自动+手工，导出 Excel） |
| B7 | `GET/PUT /api/uc34/mail-rules` + `POST /dry-run` | 规则管理 + 试运行 |
| B8 | `GET/POST /api/uc34/config-items` | DSS 模板查看/上传替换（版本+1） |
| B9 | `GET /api/uc34/sharepoint/tree` | 归档目录浏览/下载 |
| B10 | `GET/PUT /api/uc34/notifications` | 提醒列表/已读 |

### 错误码

| 码段 | 含义 |
|------|------|
| 424340x | 外部依赖未就绪（诊断仪大表/系统库发票/SharePoint 不可达） |
| 400340x | 人工补录参数不全或校验失败（PO 10 位 / ID No. 4~8 位数字 / 发票非 PDF 或 >20MB） |
| 409340x | 状态冲突（执行中重复重跑、补录值与当前值相同） |

### 非功能性需求

| 类别 | 指标 |
|------|------|
| 性能 | 定时窗口准点触发、当日完成；X-entry 触发到出模板 ≤ 半天（BRD 口径）；多 Item 拆行 O(n) |
| 可用性 | 单票失败不阻塞同批次其他票；断点续跑（节点重跑） |
| 安全/合规 | 证据 WORM 留痕；操作审计；角色权限（IO/配置维护者/BU/德勤只读） |
| 兼容 | PC Chrome/Edge；上传文件 ≤20MB（PDF/Excel） |

---

## 与 Skill 标准流程的偏差说明

1. **HTML 原型未重新生成**：用户已提供完整新版原型 `case5页面demo`（9 页），本阶段以其为原型基线并完成 9 页截图取证（`images/proto-01~09`），避免重复建设与口径分叉。
2. **澄清合并执行**：设计所需业务判断均已在 Stage 1（Q1–Q4）与历史初版决议中闭环；剩余设计点全部可由 BRD+流程图+demo 三方交叉印证，故合并为本次一次性设计审批。
3. **流程图未重绘 drawio**：0928 泳道图为已确认事实源（双 tab HTML，可编辑、可打印 A3），直接引用并截图归档。

---

**审批状态**: 已通过（2026-09-29 用户批准进入 Stage 3）
**审批人**:
**审批意见**:
