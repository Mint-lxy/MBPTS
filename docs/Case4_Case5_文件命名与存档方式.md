# UC34 各 Case 文件命名与 SharePoint 存档方式（BRD 业务口径）

> 整理日期：2026-10-22。Case1~Case4 为 BRD/业务方原文口径（批注标记已清理）；Case5 按同一格式补齐（口径来源：Case5 PRD 业务确认口径 + 2026-10-21 邮件获取方式改版）。
> **消歧**：Case4 与 Case5 均含 "X-entry" 字样但同名不同场景——Case4 = Fedex 诊断仪进口的**发票与预报创建**（IES+ 写入）；Case5 = **ASN 自动创建**（产出 DSS 模板为止，零 IES 写入）。

---

## Case1：危险品托运清单

1. 将每天处理时下载以及输出的文件，存在 SharePoint（**按照操作日期创建一级文件夹，二级文件夹按照 BL/HAWB 命名**），含以下内容：
   （*注：系统运行涉及到的文件都会进行留存，具体路径待后续技术开发确认）
   1) MSDS
   2) Shippers_Decl
   3) 发票界面导出的 part list
   4) 制作完成的道路运输托运清单
2. 每天的操作记录，按照如下 Excel 表格格式进行累积存档：

   | Pre-alert creation date | Warehouse name | DG Terminal WH | Invoice Type | BL/HAWB | Shippers_Decl related (Y/N) | Consignment list upload (Y/N) | Remark | RPA process date |
   |---|---|---|---|---|---|---|---|---|
   | | | | | | | | Not found shippers_Decl | |
   | | | | | | | | Consignment list not required | |

3. 以 Process date 为 12 月 31 日作为截止日期，**每年存为一个表格，并按照年份命名**。

---

## Case2：AVIS（GLC 线）

- **按照 PDC 创建文件夹**（库房名称可能会换，需要可配置）。
- 在文件夹内命名：**GLC 和 MBUSI**，后续存档根据线路存到对应文件夹中。
- 在 GLC 或 MBUSI 文件夹下再新建文件夹来存储 AVIS / BL / Shipper 等文件。
- 票文件夹命名格式：**`Shippers Ref + 空格 + OOLU + AWB/B/L No. + 空格 + ETA + ETA日期`**
  - 示例：`527452 OOLU2036726960 ETA 2026.08.17`

## Case2：MBUSI（美线）

- 同上（PDC → MBUSI 线路文件夹 → 票文件夹）。
- 子文件夹需要新建，命名示例：`NAM8646083 ETA 2026.10.05`

---

## Case3：马来西亚发票与预报创建

1. 将每天处理时下载以及输出的文件，存在 SharePoint（**按照操作日期创建一级文件夹，二级文件夹按照 HAWB_分单号 命名**），含以下内容：
   1) 主/分单
   2) 发票
   3) 导入模板
   4) MSDS（如有）
   5) Shippers_Decl（如有）
2. 每天的运行记录，按照如下 Excel 表格格式进行累积存档：

   | Pre-alert creation date | Warehouse name | DG Terminal WH | Invoice Type | BL/HAWB | Shippers_Decl related (Y/N) | Consignment list upload (Y/N) | Remark | RPA process date |
   |---|---|---|---|---|---|---|---|---|
   | | | | | | | | Not found shippers_Decl | |
   | | | | | | | | Consignment list not required | |

3. 以 Process date 为 12 月 31 日作为截止日期，**每年存为一个表格，并按照年份命名**。

---

## Case4：X-entry 发票与预报创建（Fedex 诊断仪）

（前两条为 BRD/业务原文口径；第 1 条的路径与留存内容按 Case4 PRD v0.1 补全，第 2、3 条 BRD 未定义、按 Case1/3 同构格式标注）

1. 将每天处理时下载以及输出的文件，存在 SharePoint（**按照操作日期（运行日期 YYYYMMDD）创建一级文件夹**（N2 收单即归档），**二级文件夹按票命名**（N12 命名存档）），含以下内容：
   1) Fedex 预报 PDF（原件，图片版含运单主页+运单附页+发票页）
   2) 发票信息表（导入模板 xlsx，4 sheet，同 INV&DN 结构）
   3) 旧货文件（**仅纯旧货票**）：旧机电产品进口声明（docx）+ 原出口报关单及盖章文件×4（按 SN+运单号取自 T 盘出口文件夹，排除 SF 开头顺丰段）
   4) 上传中心补传的原始 PDF + 发票 PDF（缺发票票补传后入同票文件夹）
- **文件夹命名**：每个 PDF 及其对应的发票信息表存储在一个文件夹中，文件夹命名规则示例：
  - `SN 532418_pad 2_Old_448886329033`
  - `SN 555435-555436_kit5_new_448886353380`
  - `SN 545459_pad 2 power supply_old (new)_447033454333`
  - `SN 804652-804653_kit 5_loaner pool_524241835996`
  - 结构：**`SN <SN号（多 SN 用 - 连接）>_<品名>_<新旧类别>_<HAWB>`**
- **PDF 命名**：以 **HAWB** 命名。
- 补充（IES+ 侧，非 SharePoint）：预报 PDF 另上传至 IES+ 预报文档资料（文档类别=HAWB）；**旧货文件只归档 SharePoint，不上传 IES+**；本 Case 不发送通知邮件。

2. 每天的操作记录累积存档表：**BRD 未定义**（Case4 无 Case1/3 的运行记录 Excel 年表口径；是否需对齐 Case1/3 的 9 列年表格式，待业务确认）。
3. 年度存档：**BRD 未定义**（同上，待业务确认）。

---

## Case5：ASN 自动创建（按同格式补齐）

1. 产出文件存 SharePoint，**按支线创建一级文件夹（MBPLAP / X-entry），二级文件夹按批次时间戳 `<YYYYMMDD_HHmm>` 命名**；归档根目录另存**诊断仪大表**（唯一一份，业务定期上传维护，与 Case4 合并）。批次文件夹内含：
   - MBPLAP：DSS 导入模板 xlsx（逐票），命名 **「提单号_发票号」**（如 `OOLU2038558620_1100021838.xlsx`）
   - X-entry：DSS 导入模板 xlsx（逐票），命名 **「AWB No._日期」**（日期取送货邮件标题+前置当年年份；2026-10-21 改版定版，原口径「PN_日期」作废）；进口发票原件、报关代理附件原件**保持原名**同目录归档
   - （*注：**仅归档已完成票产出**；按时间戳目录追加写入、不覆盖历史，重跑生成新时间戳目录，业务以最新目录为准）
2. 归档结构：

   ```
   <归档根(SharePoint)>
   ├─ 诊断仪大表（唯一一份，与 Case4 合并）
   ├─ MBPLAP
   │  └─ <YYYYMMDD_HHmm>
   │     └─ 提单号_发票号.xlsx
   └─ X-entry
      └─ <YYYYMMDD_HHmm>
         ├─ AWB No._日期.xlsx
         ├─ 进口发票原件（保持原名）
         └─ 报关代理附件原件（保持原名）
   ```

3. 起点文件夹（2026-10-21 改版）：送货邮件/进口发票由业务审阅后**手工拖入 SharePoint 指定文件夹**作为流程起点（两线同一文件夹），发票按 AWB 匹配取 PDF；起点文件夹路径结构/监听方式/时延起算待技术开发确认。

---

## 附：BRD 口径与 PRD 演绎口径差异提示

| 项 | BRD 口径（本文） | PRD/实现演绎口径 | 状态 |
|---|---|---|---|
| Case2 归档层级 | PDC → 线路（GLC/MBUSI）→ 票文件夹（3 级） | PRD 为 `<PDC>\<线路>\<运行周>\票文件夹`（4 级，多"运行周"层） | 待业务确认是否保留运行周层 |
| Case2 票文件夹命名 | `Shippers Ref OOLU<BL> ETA <日期>`（GLC）/ `NAM<号> ETA <日期>`（MBUSI） | PRD 示例 `<BL No.> ETA <YYYY.MM.DD>`（MBUSI） | GLC 带 Shippers Ref 前缀，MBUSI 不带，以 BRD 为准 |
| Case5 X-entry 模板命名 | —（BRD 未定） | 原「PN_日期」→ 2026-10-21 改版「AWB No._日期」 | 已定版，PRD 待同步 |
| Case5 收单起点 | —（BRD 未定） | 公邮监听 → 2026-10-21 改版为 SharePoint 拖入 | 已定版，SP 路径结构待确认 |
| Case4 存档结构 | 仅定义票文件夹命名（`SN_品名_新旧_HAWB`）+PDF 以 HAWB 命名 | PRD 补全一级文件夹=操作日期（YYYYMMDD）、留存清单（预报 PDF/发票信息表/旧货文件） | PRD 补全部分待业务确认 |
| Case4 操作记录/年表 | 无（BRD 未定义） | Case1/3 均有 9 列运行记录年表 | 是否对齐待业务确认 |
