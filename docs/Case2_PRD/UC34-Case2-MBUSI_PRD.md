# MBPTS UC34 Case 2 · MBUSI 线:美线(CMA CGM)Shipping Log / BL 自动化 — 产品需求文档

## 文档信息

| 项目 | 内容 |
|------|------|
| **文档名称** | UC34 Case 2 · MBUSI 线(美线 CMA CGM)Shipping Log/BL 自动化 PRD |
| **版本** | v1.0.0 |
| **创建日期** | 2026-09-29 |
| **最后更新** | 2026-09-29 |
| **负责人** | BA(SCM-IE / Import Operations 对接) |
| **审核人** | 待审核 |
| **密级** | 内部 |

**文档用途**:定义 MBPTS 平台 UC34 Case 2 中 **MBUSI 美线(船公司 CMA CGM)** 进口提单(Shipping Log/BL)处理自动化的产品需求,作为开发与验收依据。GLC 欧线需求见独立文档《UC34-Case2-GLC_PRD》。本 PRD 继承 MBUSI 正式 BRD(BRD-MBUSI-BL-002 V3)的 BR/FR/AC 基线。

**关联文档**:
- [需求澄清文档](./UC34-Case2_需求澄清文档.md)(Q1~Q14 全部已澄清)
- [设计说明书](./设计说明书.md)
- [GLC 线 PRD](./UC34-Case2-GLC_PRD.md)
- 原型基线:`C:\MBPTS\case2页面demo\`
- 业务依据:`【MBPTS-UC34】case 2:MBUSI_Shipping_Log_BL_Automation_BRD_0920.docx`(BRD-MBUSI-BL-002 V3)、`【MBPTS-UC34】Case 2:GLC&MBUSI梳理.docx`、`【UC34-Case2】GLC_MBUSI_业务流程图_20260927.html`

---

## 版本历史

| 版本号 | 修订日期 | 修订人 | 修订内容 | 状态 |
|--------|---------|--------|---------|------|
| v1.0.0 | 2026-09-29 | BA | 初版(由双线版拆分为单线文档) | 草稿 |

---

# 第一部分:产品概述

## 1.1 产品定义

**产品名称**:MBPTS UC34 Case 2 · MBUSI 线 — 美线(CMA CGM)Shipping Log / BL 自动化

**所属系统**:MBPTS AI Quick Win 平台(UC34)

**功能定位**:将 MBUSI 美线进口提单处理——美国 Central Warehouse 网站大表导出、新增提单登记、CMA CGM 提单邮件匹配、Shipping Log/BL 模板填写、SharePoint 归档、IES+ 导入与差异处理——从全人工转为"平台自动化 + 异常人工协同"。

**使用端**:PC Web

**交付版本**:v1.0.0

## 1.2 产品愿景

每周新增提单自动登记、自动匹配提单邮件、自动完成 IES 台账;漏数票挂起不丢,补登后自动续跑;业务只处理差异与漏数。

## 1.3 核心价值

| 价值维度 | 价值描述 | 受益人群 |
|---------|--------|---------|
| 效率 | 每周批量自动处理美线提单,单票端到端自动化率 ≥80% | 进口运营 |
| 防漏 | 邮件提单与大表双向对碰,美表漏数 100% 识别并挂起可续跑 | 进口运营 |
| 合规 | 归档四件套齐备、证据 WORM、修正留痕、审计可查 | 审计/管理层 |
| 可维护 | Shipping Log/BL 模板、IES Port 对应表、邮件规则、调度均配置化 | 业务老师/平台管理员 |

## 1.4 产品范围

### 包含范围(对齐 BRD-MBUSI-BL-002 §2 In Scope)

| 模块 | 功能描述 |
|------|--------|
| 大表导出与新增登记 | Central Warehouse 网站导出 gvShipLog;按 created 筛上周新增;登记 AVIS BL status report 美线 sheet;每票行拆分为 `Shipping log information_<BL>.xlsx` |
| 邮件取单与匹配 | 监听标题含「CMA CGM - 海运提单(Seaway Bill)可供使用」的邮件;附件按 BL 号入暂存库 + 台账 pending;与大表 Booking Number 精确匹配 |
| 漏数挂起与续跑 | 未匹配票不删不处理,台账保持 pending;美表补登(created 更新不回溯)后下轮捕获,从台账取回附件续跑 |
| 模板填写 | Shipping Log 模板(基础字段取自网站导出,VOL/Load 取自 BL);BL 模板(字段取自 BL PDF) |
| 归档 | 四类文件归档 SharePoint(根路径可配置):BL 导入模板 / Shipping Log / 单票 Excel / 邮件 BL PDF |
| IES 导入与差异 | 批量导入 Shipping Log → 全选生成预报(港口经 IES Port 表转换)→ 集装箱导入 BL 模板 → 差异弹窗记 BL different(有差异不生成台账)→ 上传 BL PDF |
| 任务管理 | 工作台 MBUSI 统计、任务中心、任务详情(Run 切换、字段修正留痕、PDF 原文定位、证据、重跑) |
| 规则与配置 | R-MBUSI-BL 监听规则;Shipping Log/BL 模板与 IES Port 对应表版本管理;调度配置 |

### 不包含范围(对齐 BRD §2 Out of Scope)

- GLC 欧线(见《UC34-Case2-GLC_PRD》)
- 源系统改造(Central Warehouse 网站、IES+、公邮系统)
- 未匹配 BL 的业务线下处理(平台只记录异常并转人工;删除 IES 旧预报为人工动作)
- 治理运营台、权限中心、提醒中心、上传中心的平台级完整需求(仅简述引用)
- IES+ 交互的技术实现选型(UI 自动化或接口通道,留待概要设计)

---

# 第二部分:业务背景与目标

## 2.1 业务问题

1. **双线数据源、人工对碰**:每周需登录美国 Central Warehouse 网站导出 gvShipLog、按 created 筛新增、登记大表;再到公邮按标题搜 CMA CGM 提单邮件,逐票与大表 Booking Number 对碰。
2. **美表漏数难追踪**:收到提单 PDF 但大表未登记(漏数)时,人工易遗漏;补登后 created 更新不回溯,需要机制保证下轮能捕获续跑。
3. **模板字段两处来源**:Shipping Log 基础字段来自网站导出,Container VOL(m³)/Load(KG) 必须取自提单,人工对照 PDF 抄录易错。
4. **差异处理靠手抄**:IES 差异弹窗靠人工抄录回写 BL different;有差异时 IES 不生成台账,需人工跟进。

## 2.2 业务目标与成功指标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 提效 | 美线提单处理自动化,业务只处理异常票 | P0 |
| 防漏 | 漏数票 100% 识别挂起,补登后可自动续跑 | P0 |
| 可审计 | 全链路证据与操作留痕,每票可查可重跑 | P1 |

| 指标 | 目标值 | 测量方法 |
|------|-------|---------|
| 单票端到端自动化率 | ≥80%(建议值,待业务确认) | 无需人工介入完成票数 / 总票数 |
| 漏数票识别率 | 100% 不漏 | 抽查运行周台账与暂存库 |
| 异常票单票人工耗时 | ≤5 分钟(建议值) | 任务详情操作日志计时 |
| 每周批量运行完成时间 | <2 小时(建议值) | 调度起止时间 |

---

# 第三部分:用户角色与权限

四角色,身份与授权由 Alice 管理(权限中心只读查询)。

| 功能 | OPERATOR 业务操作员 | MANAGER 业务主管 | ADMIN 平台管理员 | AUDITOR 审计员 |
|------|:---:|:---:|:---:|:---:|
| 工作台/任务中心查看 | ✓ | ✓ | ✓ | ✓(只读) |
| 字段修正(留痕) | ✓ | — | — | — |
| 安全重跑(整单/节点/批量) | ✓ | ✓ | — | — |
| 漏数票确认续跑 / 手动触发 | ✓ | ✓ | — | — |
| 不可逆重跑 / 对外动作确认 | — | ✓ | — | — |
| 列表导出 | — | ✓ | — | — |
| MBUSI 规则编辑/发布 | — | — | ✓ | — |
| MBUSI 模板/对应表/调度配置 | — | — | ✓ | — |
| 审计日志/证据查询 | — | — | ✓ | ✓ |

**职责分离**:主管无字段修正权,操作员无对外确认权;UC34 全场景修正仅留痕、无人工审批节点。

---

# 第四部分:术语定义

| 术语 | 说明 |
|------|------|
| gvShipLog | 美国 Central Warehouse 网站(Customer Information > Shipments > MB China)导出的 Shipping Log 大表 Excel,默认文件名 gvShipLog |
| Booking Number | gvShipLog D 列,即 BL 号,匹配键 |
| created | gvShipLog O 列创建日期;新增口径 = created 在上周一至周日;**补登会更新 created 且不回溯** |
| CMA CGM Seaway Bill | 美线提单邮件,标题含「CMA CGM - 海运提单(Seaway Bill)可供使用」,原发件人 website-noreply@cma-cgm.com,由业务配置自动 Forward 至平台公邮 |
| Shipping Log 模板 | IES 批量导入用 7 列表;基础字段取自网站导出,Container VOL(m³)/Load(KG) 取自 BL |
| BL 模板 | 集装箱信息导入用 9 列表,字段取自 BL PDF |
| 大表 / AVIS BL status report | 业务状态跟踪表 Sheet3 美线 sheet;平台双写回写 |
| IES+ | 进口管理系统:发票信息、批量导入 shipping log、预报、集装箱信息、台账、文档上传 |
| 漏数 | 收到提单邮件但大表未登记该 BL(美表漏数) |
| 暂存库 / 附件台账 | 命中邮件附件按 BL 号归并的暂存区及登记台账(pending/processed,同 BL 留最新版) |
| Task / Run | 任务(票粒度=BL 号)/ 执行实例(不可变,重跑生成 R#N+1) |
| 归档四件套 | BL 导入模板 / Shipping Log / 单票 Excel / 邮件 BL PDF |
| WORM | Write Once Read Many,证据防篡改存储 |

---

# 第五部分:用户故事

### US-M01:每周定时批量自动处理(MBUSI)

**作为** 业务操作员
**在** 每周一 09:00(调度可配置)定时任务运行后
**于** 工作台 / 任务中心
**我想要** 查看 MBUSI 线上一周(周一至周日)的自动处理结果总览
**以便于** 只把注意力投向"待人工处理"的票

**验收标准**:
- AC1: 系统按可配置调度时间(默认每周一 09:00)自动触发 MBUSI 流程,数据窗口为上周一至周日。
- AC2: 工作台 MBUSI 组展示总任务数/已完成/执行中/待人工处理 4 张统计卡,以 BL No. 为票粒度;点击带参跳任务中心。
- AC3: 每票生成 Task 与 R#1,节点轨迹完整(10 节点,见 7.3.3)。

**异常/边缘场景**:
- E1: 调度时间恰逢系统维护 → 支持手动触发补跑,数据窗口不变(去重防重)。
- E2: 当周无新增提单且无提单邮件 → 正常结束,统计卡显示 0 票。

---

### US-M02:大表导出、新增登记与拆分子表

**作为** 平台(自动执行)
**在** 每周批量运行时
**于** Central Warehouse 网站 / 大表
**我想要** 自动导出 gvShipLog、筛出上周新增提单并登记到大表美线 sheet、把每票行单独存为 Excel
**以便于** 后续邮件匹配与模板填写有权威数据源

**验收标准**:
- AC1: 自动打开 Customer Information > Shipments > MB China 并 Export to Excel(默认名 gvShipLog);如权限受限,支持从业务指定的 T 盘/SharePoint 位置读取。
- AC2: 按 O 列 created 筛上周一至周日新增,登记到 AVIS BL status report (Sheet3) 美线 sheet;D 列 booking number 即 BL 号;**防重**:已登记 BL 不重复登记。
- AC3: 每个提单对应的行单独保存为 `Shipping log information_<BL>.xlsx`,按 PDC 存入对应目录(GLC/MBUSI 子目录区分线路)。

**异常/边缘场景**:
- E1: 网站导出失败 → 不更新大表、记录错误,重试后升级告警(BRD §8 Export failure)。
- E2: 重复 BL → 不创建重复行/文件夹/上传(BRD §8 Duplicate BL)。

---

### US-M03:提单邮件匹配与漏数挂起续跑

**作为** 平台(自动执行)+ 业务操作员(漏数跟进)
**在** 收到 CMA CGM 提单邮件时
**于** 邮件监听 / 暂存库
**我想要** 系统自动把附件按 BL 号入暂存库、与大表已登记 BL 精确匹配;未匹配票挂起 pending,美表补登后下轮自动续跑
**以便于** 漏数票不丢、不重、无需人工盯办

**验收标准**:
- AC1: 按邮件标题含「CMA CGM - 海运提单(Seaway Bill)可供使用」监听(仅按标题搜索);附件一律先按 BL 号入暂存库、台账记 pending;同 BL 重复邮件保留最新版。
- AC2: 匹配成功(大表已登记该 BL)→ 继续创建 BL:下载提单重命名 `BL_<BL号>` 存入对应文件夹。
- AC3: 未匹配(漏数)→ 不删除不处理,台账保持 pending,进异常反馈;补登更新 created(不回溯)后,下轮筛选捕获,从台账取回附件续跑。
- AC4: 补登后若 IES 已有旧预报:按 BRD 异常流程,人工删除预报并确认 Shipping Log 已更新后,经平台上传指定提单+时间维度的子表,手动触发重跑。

**异常/边缘场景**:
- E1: 多轮未补登 → 保持 pending,每轮异常反馈可见,不自动删除。
- E2: PDC/ETA 缺失 → 不创建不明确文件夹,转人工(BRD §8)。

---

### US-M04:模板填写与归档四件套

**作为** 平台(自动执行)
**在** 匹配成功后
**于** 暂存库 / 归档区
**我想要** 自动填写 Shipping Log 与 BL 模板,并把四类文件归档 SharePoint
**以便于** IES 导入与业务取证都有齐套文件

**验收标准**:
- AC1: BL 模板据 BL PDF 提取字段填写并保存(得到 BL 上传用 Excel)。
- AC2: Shipping Log 基础字段取自网站导出(gvShipLog 行数据),Container VOL(m³)/Load(KG) 从 BL(BL Excel 或 BL PDF)回填。
- AC3: 归档四类文件至 Portal 的 SharePoint(根路径可配置):①BL 导入模板 ②Shipping Log ③单票 Excel ④邮件附件 BL PDF;目录层级 `<归档根>\<PDC>\MBUSI\<运行周>\<<BL> ETA <YYYY.MM.DD>>`。
- AC4: 必填字段缺失时不上传不完整模板,转人工(BRD §8)。

**异常/边缘场景**:
- E1: BL PDF 字段提取失败(版式变更)→ 低置信标注,转人工修正后重跑。
- E2: 归档根不可写 → 记错误告警,文件保留暂存库,支持重试。

---

### US-M05:IES 导入、差异捕获与上传

**作为** 平台(自动执行)
**在** 模板齐备后
**于** IES+
**我想要** 自动完成批量导入 Shipping Log、生成预报、集装箱导入 BL 模板,并完整捕获差异弹窗
**以便于** 台账自动生成,差异票有完整记录转人工

**验收标准**:
- AC1: 进口管理-发票信息按 BOL 查询 → 批量导入 Shipping Log(**绿灯后上传**)。
- AC2: 全选发票生成预报;预报信息来源于提单,港口经 **IES Port 对应表**转换。
- AC3: 进口预报按提单号查询 → 修改 → 集装箱信息导入 BL Excel → 绿灯后上传。
- AC4: 无差异:提示"生成台账成功";有差异:**IES 不生成台账**,差异弹窗内容完整捕获,回写「BL different」(与 GLC 一致),记录后继续:上传 BL PDF(选择文件类别)并保存。

**异常/边缘场景**:
- E1: 差异弹窗无法解析 → 截图存证据 + 记异常转人工。
- E2: 集中箱信息差异需线下确认 → 转人工处理流程(删除旧预报 → 确认子表更新 → 手动触发重跑,见 US-M03 AC4)。

---

### US-M06:差异票字段修正与重跑

**作为** 业务操作员
**在** 某票 Run 状态为"有差异(DIFF_PENDING)"时
**于** 任务详情页
**我想要** 对照 BL PDF 原文逐字段核对识别结果,行内修正错误字段(留痕)后重跑
**以便于** 不改源文件即可让系统携带修正值完成后续节点

**验收标准**:
- AC1: 差异票在任务中心和详情页头部均有标识,横幅可一键定位差异字段(金色高亮)。
- AC2: "当前识别数据"展示字段名/值/来源(OCR/规则)/置信度/质量等级;点击"定位"跳到原文预览对应页。
- AC3: 行内修正记录修正人/时间/原值/新值,仅留痕不审批;重跑生成 R#N+1 并携带修正值,历史 Run 只读。

**异常/边缘场景**:
- E1: 修正值为空或格式非法 → 阻断保存并提示。
- E2: 非 OPERATOR 角色尝试修正 → 无入口(E5001),符合职责分离。

---

### US-M07:MBUSI 规则与模板维护

**作为** 平台管理员
**在** 业务调整邮件口径或 IES 模板格式时
**于** 邮件中心 / 配置中心
**我想要** 修改 R-MBUSI-BL 监听规则(dry-run 验证)、上传新版 Shipping Log/BL 模板、维护 IES Port 对应表
**以便于** 业务变更无需改代码发版

**验收标准**:
- AC1: 规则支持监听邮箱、发件人白名单(`*@域名`)、主题关键词(默认「CMA CGM - 海运提单(Seaway Bill)可供使用」)、附件数量区间、附件角色(bl/shipping_log + 正则 + 必需/多份)、流程绑定(case-2-mbusi)、去重键(BL 号)、优先级、启停。
- AC2: dry-run 对样本邮件真实匹配并展示命中/未命中原因,不产生任务。
- AC3: Shipping Log 模板(7 列)/ BL 模板(9 列)上传校验扩展名 + ≤20MB,版本+1,历史可查。
- AC4: IES Port 对应表在线维护即时生效;调度时间可配置(默认周一 09:00)。

**异常/边缘场景**:
- E1: 规则校验失败 → 阻断保存(E1001)。
- E2: 模板版本与流程不兼容 → 阻断并提示回退(E2002)。

---

# 第六部分:业务流程

## 6.1 整体流程(To-Be)— 跨职能泳道流程图

泳道:触发 / MBPTS 平台 / IES+ 系统 / 外部系统·邮件·归档·大表。节点编号与 2026-09-27 版业务流程图一致。

![业务流程图 MBUSI](./images/业务流程图_MBUSI.png)

> **源文件**:[UC34-Case2_业务流程图.drawio](./UC34-Case2_业务流程图.drawio)(draw.io 打开,MBUSI 页)

### 分阶段说明

| 阶段 | 节点 | 说明 |
|------|------|------|
| 触发 | T11 | 每周一 09:00(可配置),处理上周一至周日 |
| 大表导出登记 | M01→M02→M03 | 导出 gvShipLog → 按 created 筛上周新增 → 登记大表美线 sheet(D 列 booking number 即 BL 号)→ 每票行单独存 `Shipping log information_<BL>.xlsx` |
| 邮件取单 | M04→DM1 | 监控标题含「CMA CGM - 海运提单(Seaway Bill)可供使用」;附件按 BL 号入暂存库、台账 pending;与大表 Booking Number 精确匹配 |
| 漏数挂起 | ME1 | 收到 PDF 但大表无登记:不删不处理、台账 pending、进异常反馈;补登 created 更新(不回溯)后下轮捕获,从台账取回续跑 |
| 模板填写 | M05→M06 | Shipping Log 基础字段取自网站导出,VOL/Load 取自 BL;BL 模板据 BL PDF 填写保存 |
| 归档 | M07 | 四类文件归档 SharePoint:BL 导入模板 / Shipping Log / 单票 Excel / 邮件 BL PDF |
| IES 导入 | M08→M09→M10 | 批量导入 Shipping Log → 全选发票生成预报(港口经 IES Port 表)→ 集装箱信息导入 BL 模板 |
| 差异与上传 | DM2→ME2→M11 | 有差异 IES 不生成台账,差异记 BL different;上传 BL PDF 并保存 |
| 输出 | O11/O12/O13 | 生成台账成功;归档四件套齐备可查;大表新增登记可查询 |

### 归档结构(MBUSI)

```
<归档根(默认 SharePoint,可配置 T 盘)>
└─ <PDC>
   └─ MBUSI
      └─ <运行周(按系统运行时间)>
         └─ <BL No.> ETA <YYYY.MM.DD>(示例:NAM8646083 ETA 2026.10.05)
            ├─ BL 导入模板(已填写)
            ├─ Shipping Log(已填写)
            ├─ Shipping log information_<BL>.xlsx(单票 Excel)
            └─ BL_<BL号>.pdf(邮件附件提单)
```

## 6.2 系统交互时序

```mermaid
sequenceDiagram
    participant SCH as 调度器(周一09:00可配置)
    participant CW as Central Warehouse网站
    participant MB as 平台公邮(CMA转发)
    participant PF as MBPTS平台
    participant STG as 暂存库+附件台账
    participant IES as IES+
    participant SP as SharePoint归档
    participant RPT as AVIS BL status report(美线sheet)

    SCH->>PF: 触发(上周一至周日窗口)
    PF->>CW: 导出gvShipLog(或读取指定位置)
    CW-->>PF: gvShipLog Excel
    PF->>RPT: 按created筛新增并登记(booking number=BL号)
    PF->>PF: 每票行拆分为单票Excel
    PF->>MB: 按标题监听CMA CGM提单邮件
    MB-->>PF: 提单邮件+BL PDF附件
    PF->>STG: 附件按BL号入暂存库,台账pending
    PF->>PF: 与大表Booking Number精确匹配
    alt 未匹配(美表漏数)
        PF->>RPT: 异常反馈记录
        PF-->>SCH: 保持pending;补登created更新后下轮捕获,台账取回续跑
    else 匹配成功
        PF->>PF: 填BL模板+Shipping Log(VOL/Load取自BL)
        PF->>SP: 归档四件套
        PF->>IES: 批量导入Shipping Log(绿灯)→生成预报→集装箱导入BL模板
        alt 差异弹窗
            IES-->>PF: 差异明细(不生成台账)
            PF->>RPT: 回写BL different
        else 无差异
            IES-->>PF: 生成台账成功
        end
        PF->>IES: 上传BL PDF并保存
    end
```

---

# 第七部分:功能设计

## 7.1 功能清单

| 编号 | 功能 | 优先级 | 原型/截图 |
|------|------|--------|----------|
| F-M01 | 工作台 MBUSI 总览 | P0 | [index.png](./images/index.png) |
| F-M02 | 任务中心(MBUSI 筛选/批量重跑/导出/新建) | P0 | [tasks.png](./images/tasks.png) |
| F-M03 | 任务详情(Run 切换/节点轨迹,MBUSI 10 节点) | P0 | [task-detail-mbusi.png](./images/task-detail-mbusi.png) |
| F-M04 | 字段修正留痕 + PDF 原文定位 | P0 | [task-detail-mbusi.png](./images/task-detail-mbusi.png) |
| F-M05 | 漏数票 pending 挂起与续跑 | P0 | [tasks.png](./images/tasks.png) |
| F-M06 | MBUSI 邮件监听规则 | P0 | [rules.png](./images/rules.png) |
| F-M07 | 规则编辑器(三段式 + dry-run) | P0 | [rule-edit.png](./images/rule-edit.png) |
| F-M08 | 配置中心(Shipping Log/BL 模板、IES Port 表、调度) | P0 | [config.png](./images/config.png) |
| F-M09 | 归档浏览(MBUSI 目录,四件套) | P1 | [sharepoint.png](./images/sharepoint.png) |
| F-M10 | 站内提醒(平台引用) | P1 | [notify.png](./images/notify.png) |

## 7.2 核心业务规则(MBUSI)

> 对齐 BRD-MBUSI-BL-002 §5 Business Rules(BR-01~10)与 §8 异常控制。

### R1 大表与登记规则
- R1.1 打开 Customer Information > Shipments > MB China 并 Export to Excel(BR-01);导出失败不更新大表并记录,重试后升级。
- R1.2 按 **O 列 created** 识别上周新增并与大表防重(BR-02);D 列 booking number 即 BL 号。
- R1.3 每个 BL 行集单独保存为 `Shipping log information_<BL>.xlsx`(BR-03);按 PDC 建文件夹,命名 `<BL> ETA <YYYY.MM.DD>`(BR-04);文件按 PDC 存入对应目录,GLC/MBUSI 子目录区分线路。

### R2 邮件匹配规则
- R2.1 仅按邮件标题含「CMA CGM - 海运提单(Seaway Bill)可供使用」搜索(发件过滤已取消,业务配置自动 Forward 至平台公邮)(BR-05)。
- R2.2 **与大表精确匹配 BL 号后方可继续**;未匹配记录异常并停止该票(BR-06)。
- R2.3 附件一律先按 BL 号入暂存库、台账 pending;**同 BL 重复邮件保留最新版**。

### R3 漏数与续跑规则
- R3.1 漏数票:**不删除不处理**,台账保持 pending,进异常反馈。
- R3.2 补登会更新 created 且**不回溯**,下轮按 created 筛选可捕获;捕获后从台账取回附件续跑。
- R3.3 漏数/集装箱差异的线下处理(BRD §异常流程):人工删除 IES 已生成预报 → 确认 Shipping Log 已更新至子表 → 平台上传指定提单+时间维度子表(自动存储至对应 PDC 目录)→ 数据齐备后手动触发重跑。

### R4 模板规则
- R4.1 BL 重命名 `BL_<BL号>.pdf` 保存,并复制 Shipping Log 与 BL 模板入票文件夹(BR-07)。
- R4.2 Shipping Log 基础字段取自网站导出;**Container VOL(m³)/Load(KG) 取自 BL**(BL Excel 或 BL PDF)(BR-08)。
- R4.3 BL 模板字段取自 BL PDF;预报信息取自提单,港口经 **IES Port 对应表**转换(BR-10)。
- R4.4 模板版本化,新版上传即生效,历史可查。

### R5 IES 执行规则
- R5.1 **绿灯后方可上传**(BR-09,AC-06);必填校验不过不上传不完整模板。
- R5.2 差异弹窗**完整捕获**回写「BL different」(与 GLC 一致);**有差异 IES 不生成台账**。
- R5.3 附件上传选择文件类别,全部传完再保存。

### R6 回写规则(平台台账为主,双写大表)
- R6.1 新增提单登记入大表美线 sheet(可查询,O13)。
- R6.2 差异内容回写「BL different」;台账生成状态、异常反馈列按 GLC 同口径双写(列定义见大表模板)。

### R7 重跑规则
- R7.1 重跑**不得产生重复**行/文件夹/上传(FR-02)。
- R7.2 Run 不可变;整单/节点/批量重跑生成 R#N+1,**携带人工修正值**;执行中任务跳过。
- R7.3 失败票支持从明确检查点受控续跑(FR-05)。

### R8 权限与审计规则
- R8.1 四角色职责分离:主管无字段修正权,操作员无对外确认权。
- R8.2 修正仅留痕不审批,写入当前生效版本。
- R8.3 全操作审计;证据(trigger/process/operation)带 hash,**WORM 防篡改**;每票保留源文件/输出/时间戳/状态/错误详情(FR-04)。
- R8.4 邮箱/路径/重试/等待时间**不得硬编码**(FR-01);凭证安全存储且不入日志(FR-06);上传前必填校验(FR-03)。

---

## 7.3 原型及交互规则说明

### 7.3.1 工作台 MBUSI 总览(F-M01)

**页面名称**:工作台 | **用户角色**:全部角色

![工作台](./images/index.png)

| # | 功能点 | 功能描述&操作说明 |
|---|--------|----------------|
| 1 | MBUSI 统计卡 ×4 | 总任务数/已完成/执行中/待人工处理(BL No. 票粒度);点击带参跳任务中心(`mode=mbusi&status=`) |
| 2 | 侧栏导航 | 工作台→任务中心→上传中心→邮件中心→配置中心→Share Point |

---

### 7.3.2 任务中心(F-M02 / F-M05)

**页面名称**:任务中心 | **用户角色**:全部角色(操作按角色控制)

![任务中心](./images/tasks.png)

| # | 功能点 | 功能描述&操作说明 |
|---|--------|----------------|
| 1 | 状态筛选 chip | 全部/执行中/待人工处理/待上传/有差异/失败/已完成;漏数 pending 票归入"待人工处理" |
| 2 | 来源筛选 | 定时调度/手动创建/手动触发 |
| 3 | 导出列表 | CSV(仅 MANAGER) |
| 4 | 新建任务 | 选择 MBUSI 线路手动建票(补登后手动触发入口) |
| 5 | 批量重跑 | 勾选生成 R#N+1;执行中自动跳过 |

**字段**:任务编号(T-BL号)、case(MBUSI Shipping Log 与 BL)、触发来源、状态(当前执行)、执行次数、最近执行开始、当前环节。

---

### 7.3.3 任务详情(F-M03/M04)

**页面名称**:任务详情 | **用户角色**:全部角色(修正/重跑按角色控制)

![任务详情 MBUSI](./images/task-detail-mbusi.png)

**MBUSI 节点编排(10 节点)**:
1. 下载美国 gvShipLog(Central Warehouse 导出)
2. 拆分 Booking No. 子表
3. 填 Shipping Log 模板(VOL/Load 待 BL 回填)
4. 下载邮件附件(CMA CGM 提单)
5. OCR 识别(BL PDF,集装箱明细)
6. 填 BL 模板并回填 Shipping Log
7. 导入 Shipping Log(IES+ 批量导入)
8. 生成预报(港口经 IES Port 对应表)
9. 导入 BL 模板(集装箱台账)
10. 导入 BL PDF 保存(状态报告回写)

| # | 功能点 | 功能描述&操作说明 |
|---|--------|----------------|
| 1 | 头部操作 | 失败时「整单重跑」;有差异时「上传文件/整单重跑」 |
| 2 | 三层横幅 | 待上传缺件/有差异(可定位差异字段)/失败;漏数票显示 pending 说明 |
| 3 | Run 切换 | R#1、R#2…历史只读;当前生效版本可操作 |
| 4 | 当前识别数据 | 字段名/值/来源/置信度/质量等级;低置信金色高亮;行内修正留痕 |
| 5 | PDF 原文定位 | 「定位」→ 原文预览跳对应页;翻页/缩放 |
| 6 | 步骤证据 | email/ocr/screen/table/file 五类,内联预览,WORM 标注 |
| 7 | 触发历史/操作日志 | 同 Case 兄弟任务、15 天热力图;任务级全操作留痕 |

**字段表(当前识别数据区,MBUSI 示例)**:Booking No.(BL 号)、PDC、ETA、Container No.、Container Type、Seal No.、Package Qty、Container VOL(m³)、Container Load(KG)、港口(英文→IES 映射值)等;每字段含来源(OCR/规则/gvShipLog)、置信度、质量等级、定位、修正入口。

---

### 7.3.4 MBUSI 邮件规则与编辑器(F-M06/M07)

**页面名称**:邮件中心 / 规则编辑器 | **用户角色**:ADMIN

![邮件中心](./images/rules.png)

![规则编辑器](./images/rule-edit.png)

**MBUSI 预置规则**:

| 规则 | 监听要素 | 绑定流程 | 说明 |
|------|---------|---------|------|
| R-MBUSI-BL | 主题含「CMA CGM - 海运提单(Seaway Bill)可供使用」(样本发件人 website-noreply@cma-cgm.com) | case-2-mbusi | 仅按标题搜索;业务配置自动 Forward 至平台公邮 |

| # | 功能点 | 功能描述&操作说明 |
|---|--------|----------------|
| 1 | 规则列表 | 规则、监听邮箱、优先级、绑定流程、累计命中、启用开关 |
| 2 | 筛选条件段 | 规则名、监听邮箱、发件人白名单(`*@域名`)、To/Cc、主题/正文关键词、附件数量区间 |
| 3 | 附件要求段 | 角色 bl / shipping_log + 文件名正则 + 类型 + 必需/多份 |
| 4 | 流程绑定段 | case-2-mbusi、汇聚策略、OCR Schema、去重键(BL 号)、优先级、启停 |
| 5 | dry-run | 对样本邮件真实匹配,不产生任务 |

---

### 7.3.5 配置中心 MBUSI 部分(F-M08)

**页面名称**:配置中心 | **用户角色**:ADMIN

![配置中心](./images/config.png)

| 配置项 | 说明 |
|--------|------|
| Shipping Log 导入模板 | 7 列:AVIS/Shipping Log No.、MBZ/BOL、Container No.、Container Type、Seal Number、Container VOL(m³)、Container Load(KG);基础字段取自 gvShipLog,VOL/Load 回填自 BL |
| BL 导入模板 | 9 列:No.、Shipping log No./AVIS No.、HAWB/BL No.、Container No.、Container Type、Seal No.、Package Qty、Container Load(KG)、Container VOL(m³);字段取自 CMA CGM 提单 |
| IES Port 对应表 | 英文港口名 ↔ IES 港口名称(参照 AVIS detail list Sheet2 港口信息 sheet);生成预报时转换,业务维护 |
| 调度配置 | 每周一 09:00,可配置 |

操作:查看/上传(扩展名 + ≤20MB,版本+1);对应表在线维护即时生效。

---

### 7.3.6 归档浏览 MBUSI 目录(F-M09)

**页面名称**:Share Point | **用户角色**:全部角色

![SharePoint 归档](./images/sharepoint.png)

- 目录树:`<归档根>\<PDC>\MBUSI\<运行周>\<<BL> ETA <YYYY.MM.DD>>`;面包屑 + 目录内搜索。
- 文件列表:名称/修改日期/类型/大小;文件抽屉(元信息 + 下载/复制路径)。
- 票文件夹内容:归档四件套(见 6.1 归档结构)。

---

### 7.3.7 平台能力引用(F-M10)

| 页面 | 截图 | 本线使用方式 |
|------|------|------------|
| 提醒中心 | [notify.png](./images/notify.png) | MBUSI 任务成功/异常(含漏数 pending)自动生成站内提醒,点击跳任务详情;不外发邮件 |
| 治理运营台 | [govern.png](./images/govern.png) | DAG 监控、审计日志、证据总量(WORM) |
| 权限中心 | [rbac.png](./images/rbac.png) | 四角色只读查询;身份与授权由 Alice 管理 |
| 上传中心 | [dim-tables.png](./images/dim-tables.png) | 空态(暂不涉及);漏数补登子表上传能力按 BRD 异常流程预留 |

---

# 第八部分:数据需求

## 8.1 数据模型(逻辑模型,MBUSI 相关实体)

| 实体 | 说明 | 关键字段 |
|------|------|---------|
| MailRule 邮件规则 | R-MBUSI-BL | id、监听邮箱、发件人白名单、主题关键词、附件区间、附件角色[]、绑定流程、去重键、优先级、启停 |
| AttachmentLedger 附件台账 | 暂存登记(key=BL号) | BL 号(归一)、角色(bl/shipping_log)、文件名、来源邮件、接收时间、状态(pending/processed)、版本(同 BL 留最新) |
| StagingFile 暂存文件 | 暂存库引用 | BL 号、类型、路径、hash |
| GvShipLogRecord 大表记录 | gvShipLog 行 | Booking Number(BL 号)、created、PDC、ETA、行数据原文、登记状态 |
| Task 任务 | 业务单据(票粒度) | 任务号(T-BL号)、caseId(case-2-mbusi)、BL/HAWB、触发来源、当前状态、当前 Run 号 |
| Run 执行实例 | 一次执行(不可变) | Run 号、起因、状态、起止、耗时、携带修正版本 |
| NodeExecution 节点执行 | MBUSI 10 节点轨迹 | Run id、节点序号/名称、状态、起止、输出摘要 |
| FieldResult 字段结果 | 识别+修正 | 字段名、原值、来源(OCR/规则/gvShipLog)、置信度、质量等级、修正值/人/时间、原文定位 |
| Evidence 证据 | WORM 留痕 | 类型/子类型、路径、hash、Run/节点关联 |
| ConfigTemplate 模板配置 | Shipping Log/BL 模板 | 配置项、当前文件、版本、状态、列定义 |
| RefTable 对应表 | IES Port | 英文港口名、IES 港口名称、备注、版本 |
| WritebackRecord 回写记录 | 大表双写 | BL 号、列、值、时间、结果 |
| Notification / AuditLog | 提醒 / 审计 | 见平台定义 |

**状态机**:
- Task:执行中 → 已完成 / 有差异(待人工)/ 待上传(缺件)/ 失败 →(人工处理+重跑)→ 执行中
- Run:PENDING → RUNNING → SUCCEEDED / DIFF_PENDING / WAIT_INPUT / FAILED
- AttachmentLedger:pending → processed(漏数票可多轮保持 pending,被下轮调度捕获)

## 8.2 API 接口(平台前后端,MBUSI 相关)

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/workbench/summary?line=mbusi | GET | MBUSI 统计卡 |
| /api/tasks | GET/POST | 任务列表(line=mbusi)/ 新建 MBUSI 任务 |
| /api/tasks/{id} | GET | 任务详情(Runs/节点/字段/证据) |
| /api/tasks/{id}/rerun | POST | 重跑(full/node/batch) |
| /api/runs/{runId}/fields/{fieldId}/correct | POST | 字段修正留痕 |
| /api/tasks/{id}/attachments | POST | 缺件/补登子表上传 |
| /api/rules、/api/rules/{id}、/toggle、/dry-run | GET/POST/PUT | MBUSI 规则管理 |
| /api/configs、/api/configs/{id}/versions | GET/POST | Shipping Log/BL 模板版本 |
| /api/ref-tables/ies-port | GET/PUT | IES Port 对应表 |
| /api/staging/{blNo}、/resume | GET/POST | 暂存查询 / 漏数票确认续跑 |
| /api/writeback?blNo= | GET | 回写状态 |
| /api/archive/tree、/files | GET | MBUSI 归档浏览 |
| /api/export/tasks.csv | GET | 导出(MANAGER) |

**IES+ 侧能力要求**(实现不限定):I1 发票查询(BOL);I2 批量导入 Shipping Log(绿灯校验);I5 生成预报;I6 集装箱导入 BL 模板(**差异弹窗可完整捕获**,有差异不生成台账);I7 文档上传(BL PDF,类别选择)。

**外部系统能力要求**:Central Warehouse 网站 MB China 导出 Excel(或业务放指定 T 盘/SharePoint 位置由平台读取)。

## 8.3 错误码

| 错误码 | 含义 |
|--------|------|
| E1001 | 规则校验失败(正则/附件角色缺失),阻断保存 |
| E1002 | dry-run 样本邮件不可用 |
| E2001 | 模板上传校验失败(扩展名/>20MB) |
| E2002 | 模板版本与流程不兼容 |
| E3001 | IES 导入差异(弹窗),捕获 → BL different → 转人工(不生成台账) |
| E3002 | IES 上传失败/超时,支持检查点重试 |
| E4001 | 暂存缺件(缺 BL PDF),任务挂起 WAIT_INPUT |
| E4002 | 重复 BL(去重命中),跳过并记录 |
| E4003 | PDC/ETA 缺失,不建不明确文件夹,转人工 |
| E4004 | 美表漏数(邮件有 PDF 但大表无登记),挂起 pending 待补登 |
| E4005 | gvShipLog 导出失败,不更新大表,重试后升级告警 |
| E5001 | 权限不足,拒绝 + 审计 |
| E5002 | 大表回写失败,入队重试 + 告警 |

---

# 第九部分:非功能性需求

| 类别 | 指标 | 要求 |
|------|------|------|
| 性能 | 周批量时长 | MBUSI 线批量 <2 小时(建议值,含双线合计口径) |
| 性能 | 页面响应 | 首屏 <2s;任务列表万级分页流畅 |
| 可靠性 | 续跑 | 失败票检查点续跑;漏数票 pending 多轮保留;重跑去重 100%;调度失败告警 |
| 安全 | 凭证 | 安全存储,不出现于日志(FR-06) |
| 安全 | 权限/审计 | RBAC 四角色;全操作审计;证据 WORM |
| 兼容性 | 浏览器 | Chrome / Edge 主流版本(PC Web) |
| 可配置 | 配置化 | 调度时间、邮箱、路径、重试、等待时间、模板、对应表均不硬编码(FR-01) |
| 可审计 | 留痕 | 每票保留源文件、输出、时间戳、状态、错误详情(FR-04) |

---

# 第十部分:约束与假设

| 约束 | 说明 |
|------|------|
| 触发口径 | 每周一 09:00(可配置),数据窗口固定为上周一至周日 |
| 匹配前置 | 船公司 BL 必须匹配大表已登记 BL 号后方可处理(BR-06) |
| 漏数处理边界 | 未匹配 BL 的业务解决(补登、删旧预报)为线下人工动作,平台提供 pending 挂起 + 续跑通道 |
| 大表双写 | 平台台账为主,必须同步回写 AVIS BL status report 美线 sheet |
| IES+ 实现 | 交互方式不限定,绿灯校验与差异弹窗捕获为硬性能力要求 |
| BRD 基线 | BRD 需求与原始逐步截图流程共同构成实施基线,任何部分均不得删除(BRD §文档原则) |

| 假设 | 说明 |
|------|------|
| 网站权限 | Central Warehouse 网站导出权限可用;若涉及权限问题,业务下载报告放到指定 T 盘/SharePoint 位置(BRD §13) |
| 邮件转发 | 业务配置 CMA CGM 提单邮件自动 Forward 至平台公邮,平台仅按标题搜索 |
| 大表可写 | AVIS BL status report 具备平台回写通道 |
| 身份体系 | Alice 提供四角色授权与数据范围 |

---

# 第十一部分:风险与待确认

## 风险

| 编号 | 风险 | 等级 | 应对 |
|------|------|------|------|
| RSK-M1 | 美表漏数补登不回溯,漏数票滞留 | 中 | 台账 pending + 下轮 created 捕获续跑(R3)+ 每轮异常可见 |
| RSK-M2 | gvShipLog 网站导出权限/版式变更 | 中 | 支持指定位置读取兜底;导出失败告警(E4005) |
| RSK-M3 | CMA CGM 提单 PDF 版式变更导致字段提取失败 | 高 | 置信度分级 + 低置信强制人工修正 + 模板化 OCR Schema |
| RSK-M4 | IES+ 页面/模板变更导致导入失败 | 中 | 模板版本化 + 检查点续跑 + 失败告警 |
| RSK-M5 | 归档根迁移(T 盘→SharePoint)中断 | 低 | 配置切换 + 历史目录保持可读 |

## 待确认

| 编号 | 问题 | 影响 | 状态 |
|------|------|------|------|
| OPEN-M1 | 成功指标建议值(≥80% 自动化率等)需业务确认 | 验收口径 | 待业务确认 |
| OPEN-M2 | 最终邮箱清单、路径、模板版本和字段映射 | 配置初始化 | 供应商待确认项(BRD §11) |
| OPEN-M3 | 经批准的重试、重跑、覆盖及通知规则 | 运维规则 | 供应商待确认项(BRD §11) |
| OPEN-M4 | 测试账号、权限、样本文件及 IES+ 测试环境 | 测试就绪 | 供应商待确认项(BRD §11) |
| OPEN-M5 | 所有支持界面的截图和 UI 元素定位验证 | 实现选型后 | 供应商待确认项(BRD §11) |

---

# 附录

## 附录A:原型与截图清单(MBUSI)

原型基线目录:`C:\MBPTS\case2页面demo\`

| 页面 | 原型文件 | 截图 |
|------|---------|------|
| 工作台 | index.html | [index.png](./images/index.png) |
| 任务中心 | tasks.html | [tasks.png](./images/tasks.png) |
| 任务详情(MBUSI 漏数/差异票) | task-detail.html | [task-detail-mbusi.png](./images/task-detail-mbusi.png) |
| 邮件中心 | rules.html | [rules.png](./images/rules.png) |
| 规则编辑器 | rule-edit.html | [rule-edit.png](./images/rule-edit.png) |
| 配置中心 | config.html | [config.png](./images/config.png) |
| Share Point | sharepoint.html | [sharepoint.png](./images/sharepoint.png) |
| 业务流程图 | — | [业务流程图_MBUSI.png](./images/业务流程图_MBUSI.png)、[drawio 源文件](./UC34-Case2_业务流程图.drawio)(MBUSI 页) |

## 附录B:BRD 追溯对照

| BRD 条目 | 本 PRD 落点 |
|----------|------------|
| BR-01 导出 Excel | US-M02 AC1 / R1.1 |
| BR-02 created 识别+防重 | US-M02 AC2 / R1.2 |
| BR-03 按 BL 拆分保存 | US-M02 AC3 / R1.3 |
| BR-04 PDC+ETA 建夹 | R1.3 / 6.1 归档结构 |
| BR-05 搜索指定发件人 BL 邮件 | US-M03 AC1 / R2.1(已调整为仅标题搜索+自动 Forward) |
| BR-06 精确匹配后方可继续 | US-M03 AC2 / R2.2 |
| BR-07 保存 BL+复制模板 | US-M04 / R4.1 |
| BR-08 VOL/Load 取自 BL | US-M04 AC2 / R4.2 |
| BR-09 批量导入 Shipping Log | US-M05 AC1 / R5.1 |
| BR-10 预报+集装箱导入 | US-M05 AC2/AC3 / R4.3 |
| FR-01~06 | R7/R8、第九部分 |
| AC-01~08 | 各 US 验收标准(US-M02~M05) |
| §8 异常与控制 | US-M02/M03/M05 异常场景、E 错误码 |
| §13 逐步截图流程 | 第六部分流程、7.3.3 节点编排 |

## 附录C:相关文档

| 文档 | 说明 |
|------|------|
| `【MBPTS-UC34】case 2:MBUSI_Shipping_Log_BL_Automation_BRD_0920.docx` | MBUSI 正式 BRD(BRD-MBUSI-BL-002 V3) |
| `【MBPTS-UC34】Case 2:GLC&MBUSI梳理.docx` | 双线操作梳理(MBUSI 部分) |
| `【UC34-Case2】GLC_MBUSI_业务流程图_20260927.html` | 业务侧流程图(含 2026-09-27 设计确认点) |
| [需求澄清文档](./UC34-Case2_需求澄清文档.md) | Q1~Q14 澄清记录 |
| [设计说明书](./设计说明书.md) | Stage 2 设计全文 |
| [GLC 线 PRD](./UC34-Case2-GLC_PRD.md) | 欧线独立文档 |

---

**文档版本**:V1.0.0 | **编写日期**:2026-09-29 | **审核人**:待审核
