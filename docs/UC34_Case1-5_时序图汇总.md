# UC34 进口单证自动化平台 · Case1~5 时序图汇总

> 版本 v1.0 · 2026-10-16
> 用途：K44/K45 PRD 第六章「业务流程图与时序图」素材底稿，供周一交付前修订使用。
> 素材来源：`docs\Case1_PRD\Case1_危险品托运清单_PRD_修订版.md`（v2.0.0）、`docs\Case2_PRD\UC34-Case2-GLC_PRD_修订版.md`（v1.2.4）、`docs\Case2_PRD\UC34-Case2-MBUSI_PRD_修订版.md`（v1.2.0）、`docs\Case2_PRD\PRD数据字段展示方式优化建议.md`（Case3/Case4 附录图）、`docs\Case5_PRD\UC34-Case5_PRD_修订版.md`（v2.0.0）、`c:\MBPTS\case全权限版本demo\`（开发侧全权限原型）。

---

## 0. 本版修改口径（相对各 PRD 现版图）

**A. 依据 2026-10-16 会议（K44/K45 分工）决议调整：**

1. **Case2 拆分为 4 个 case**：GLC、MBUSI 各新增 1 个"反向核对"平行 case。原因：正向 case 以"收邮件"为起点，识别不到"大表/BL 早已存在、对向邮件未收"的漏收场景。两个平行 case 之间**无触发关系、无数据依赖**，是两套独立逻辑（本文档分画两张图；如需合画一张，上下两段串联即可）。
2. **Case3 新增人工修正环节**：发票导入模板出现 package number（PID）对 delivery number 一对多时，IES 不允许导入 → 业务下载平台生成的模板 → 手工修正为一对一 → 上传修正模板 → 从「导入发票」节点续跑。
3. **"暂存库"表述更正**：会议明确"根本就不是暂存库"，本文档统一改为"**附件台账（平台内部存储）**"；各 PRD 业务流程图同步待改（新月跟进）。
4. Case4 尚未与开发讨论，本期仅按 demo 校对触发口径，业务逻辑不动；Case5 批量重跑/批量下载/任务内重跑不涉及时序变化，图保持原样。

**B. 依据 `case全权限版本demo` 核对调整：**

5. 触发方式一览按 demo 口径校准（§1），其中 **Case4 由"定时扫描命中邮件"改为"邮件触发建票 + 12:00/20:00 批次执行"**（demo 规则 `R-C4-FEDEX`，BRD 半天时效）。
6. Case3 修正续跑交互按 demo「**上传修正模板 · 续跑确认**」实现口径绘制（`case3.js`：N1~N4 沿用前序结果、模板替换为上传文件、从「导入发票」续跑、修正模板存入票归档文件夹、旧 Run 只读）。
7. 通用能力以 demo 为准：任务中心**批量重跑**（逐票生成新执行实例，执行中自动跳过）与**批量下载**（原始文件+节点产出打包 zip）；任务详情**整单重跑 / 自节点续跑**；上传为**任务级弹窗**（无独立上传中心页面）；异常走站内提醒（提醒中心）+ 详情页 banner。

---

## 1. 总览：触发方式 × 起点 × 节点 × 对外动作

| Case | 支线 | 触发方式（demo 口径） | 任务起点 | 节点链 | 对外动作 |
|---|---|---|---|---|---|
| Case1 危险品托运清单 | 空运 / 海运 | 定时调度（空运每日 00:00 / 海运每周一，支持手动触发） | IES 预报导出登记即建票 | N1~N7 | ①清单上传 IES ②状态邮件外发 |
| Case2-GLC 正向 | 欧线 OOCL | 定时调度（周一 09:00，上周一~周日窗口） | 扫描公邮三类邮件（AVIS/Shipper/BL），AVIS 建票、轮询 BL | N1~N7 | IES 导入/上传 + 大表回写 |
| Case2-GLC-R 反向核对（新增） | 欧线 | 定时调度（每日，可配置） | BL 邮件（关键字 bill of lading）反查 AVIS | 轻量核对链（无 IES 交互） | 差异清单（大表异常反馈） |
| Case2-MBUSI 正向 | 美线 CMA CGM | 定时调度（周一 09:00）/ BL 邮件收单 | 收 BL 邮件 → 匹美国大表（起点口径待确认，见 §8-1） | N1~N10 | IES 导入/上传 + 大表回写 |
| Case2-MBUSI-R 反向核对（新增） | 美线 | 定时调度（每日，可配置） | 下载 gvShipLog 美国大表 → 反查邮件 BL 号 | 轻量核对链（无 IES 交互） | 差异清单（大表异常反馈） |
| Case3 MBPLAP 发票与预报 | — | 邮件触发（R-C3-PREALERT：@tvsscs.com + MBPLAP Pre-alert） | 预报邮件收单即建票（票=HAWB） | N1~N7 | IES 发票/预报创建 + 回复邮件 |
| Case4 X-entry 发票与预报 | — | 邮件触发建票（R-C4-FEDEX：@fedex.com + 提单自报催办通知），12:00/20:00 批次执行 | Fedex 预报邮件（票=HAWB） | N1~N12 | IES 导入/预报（无通知邮件） |
| Case5 ASN | MBPLAP | 定时调度（12:00/17:00，17:00 剔除 12:00 已成功票） | IES 预报导出登记即建票 | N1~N6 | 无对外写入（产出 DSS 模板） |
| Case5 ASN | X-entry | 邮件触发（送货邮件） | 收单即建票（票=AWB） | N1~N7 | 无对外写入（产出 DSS 模板） |

> 触发归组（demo 任务中心口径）：定时/邮件 = 自动触发；手动新建/人工上传/重跑 = 人工触发。

---

## 2. Case1 · 危险品托运清单（空运/海运双窗口，7 节点）

> 依据 Case1 PRD 修订版 v2.0.0 §6.2，与 demo 核对无变化（定时调度口径一致）。

```mermaid
sequenceDiagram
    autonumber
    participant SCH as 定时调度器
    participant BE as Portal 后端
    participant RPA as RPA 执行引擎
    participant IES as IES+ 系统
    participant CFG as 配置中心(Data base 附表)
    participant SP as SharePoint/T盘
    participant SMTP as 邮件服务
    participant U as 业务用户(Portal)

    SCH->>BE: 触发(空运每日00:00 / 海运每周一00:00)
    BE->>BE: 按预报窗口生成 Task(每 HAWB/BL 一票)
    BE->>RPA: 派发 Run#35;1
    RPA->>IES: 登录→进口预报筛选(空运DGR+当天/海运Sea+四库+上周区间)
    IES-->>RPA: 预报清单(批量导出)
    RPA->>IES: 发票界面按 HAWB/BL 批量查询
    IES-->>RPA: Part List
    RPA->>CFG: 读取附表4 Transport name
    CFG-->>RPA: UN→是否制作(Y/N/NA/待定类型)
    Note over RPA: UN 初筛：剔除 N/#35;N/A；空=NA；SET 走套装路径
    RPA->>IES: 按 BL/HAWB 下载 Shippers_Decl(PDF)
    alt 下载成功
        IES-->>RPA: Shippers_Decl
    else 下载失败
        RPA->>BE: 记录 Remark=Not found shippers_Decl
    end
    RPA->>CFG: 读取附表1表头Mapping/附表3 Package Type
    Note over RPA,IES: 明细 Type1-4 分支：直填/查SDS第14章/查Hazmat indicator/查包装净重≤4kg<br/>SET 套装：逐 UN No. 独立识别 Type
    alt 需查 SDS 或 Hazmat
        RPA->>IES: License→Hazmat 模块查 indicator / 批量下载 MSDS
        IES-->>RPA: indicator / SDS 文件
    end
    alt 票级判定=需制作
        RPA->>RPA: 生成托运清单(一票一份,表头+明细)
        RPA->>IES: 命名上传至预报界面文档资料
        IES-->>RPA: 上传回执
    else 无需制作
        RPA->>BE: Consignment list upload=N_ Not required
    end
    RPA->>SP: 存档(MSDS/Shippers_Decl/part list/完成清单, 日期+BL两级目录)
    RPA->>BE: 写附表5运行结果(9列)+证据留痕
    BE->>SMTP: 按模板 TPL-C1-STATUS 生成状态表邮件
    SMTP-->>U: 发送 IO 同事(收件人可配置)
    BE-->>U: 任务状态(成功/失败/执行中)+站内提醒
    opt 人工重跑/重提(异常票处置,判定链与机制详见 §7)
        BE-->>U: 站内提醒/任务中心待人工可见
        U->>IES: 修正源数据(四类出错场景)
        U->>BE: 批量重提(随下次调度) 或 单票立即重跑(经统一判定链)
        BE->>RPA: 生成 R#35;N+1(配置快照+修正值,同票互斥幂等)
        RPA->>IES: 重走节点链(整单=N1 / 节点=CPx)
        RPA->>BE: 覆盖写运行结果(同票以最新 Run 为准)
    end
```

---

## 3. Case2 · AVIS / MBUSI 与 BL（2026-10-16 起 = 4 个 case）

### 3.0 结构说明

- 正向 case（§3.1 / §3.3）：以"**收邮件**"为起点完成业务主流程（填模板 → IES 导入 → 归档回写）。固有盲区：对向数据（大表记录 / BL 邮件）早已存在、但本向邮件未收到的票**拉不出来**。
- 反向核对 case（§3.2 / §3.4，**本期新增**）：以对向数据为起点反向比对，把正向 case 拿不到的漏收信息拉成差异清单，供业务跟进。
- 正/反两个 case **互不触发、互不依赖**，各自独立调度、独立建票；合在一个 PRD 内描述（业务目的相同），时序图分画。

### 3.1 Case2-GLC 正向（欧线 OOCL，7 节点）

> 依据 GLC PRD 修订版 v1.2.4 §6.2；按会议决议将"暂存库"更正为"附件台账（平台内部存储）"。

```mermaid
sequenceDiagram
    participant SCH as 调度器(周一09:00可配置)
    participant U as 业务用户(OPERATOR/MANAGER)
    participant MB as Portal公邮
    participant PF as MBPTS平台
    participant ATT as 附件台账(平台内部存储)
    participant IES as IES+
    participant SP as 归档(SharePoint/T盘)
    participant RPT as AVIS BL status report

    SCH->>PF: 触发(上周一至周日窗口)
    PF->>MB: 按R-GLC三条规则扫描(AVIS/Shippers_Decl/BL)
    MB-->>PF: AVIS/Shippers_Decl/BL邮件+附件
    PF->>ATT: 附件按BL号归并,台账pending
    Note over PF: 票级视角:收到 AVIS 即建任务,凭 AVIS 号绑定 Shipper(仅 DG 货),<br/>识别 BL 号后轮询邮件标题找 BL,三件套齐了才往下走
    PF->>PF: OCR识别+AVIS⇄BL交叉核对+齐套判断(DG定版)
    alt 缺件/无PDC配置
        PF->>RPT: 异常反馈列记录(P列)
        Note over PF: 缺件→建Task挂起(待上传)<br/>任务详情人工确认后续跑<br/>无PDC→建Other不阻断
    else 齐套
        PF->>ATT: 取件组装文件包(DG含Shipper)
        PF->>PF: 填AVIS/BL模板
        PF->>IES: 批量导入AVIS(绿灯校验)
        opt DG票
            PF->>IES: invoice级导出→算FOB差异→核对PDF→FOB填Others
        end
        PF->>IES: 生成预报→集装箱导入BL模板
        alt 差异弹窗
            IES-->>PF: 差异明细
            PF->>RPT: 回写L列 BL different(流程继续)
        end
        PF->>IES: 上传附件(AVIS类别=Other)
        PF->>SP: 按PDC/GLC/运行周归档
        PF->>RPT: 双写G/H/K/M/N列,J列BL Creation
    end
    opt 人工重跑(异常票处置,判定链与机制详见 §7)
        PF-->>U: 站内提醒/任务中心待人工可见
        U->>PF: 重跑(整单/节点/批量,经统一判定链)
        PF->>PF: 生成 R#35;N+1(配置快照+修正值,同票互斥幂等)
        PF->>IES: 重走节点链(整单=N1 / 节点=CPx)
        PF->>RPT: 回写覆盖(同列以最新 Run 为准)
    end
```

### 3.2 Case2-GLC-R 反向核对（新增平行 case，每日）

> 2026-10-16 会议新增。覆盖正向盲区：**BL 邮件早已收到、AVIS 未收到**的票。与 §3.1 无任何触发/数据关联。

```mermaid
sequenceDiagram
    autonumber
    participant SCH as 调度器(每日,可配置)
    participant PF as MBPTS平台
    participant MB as Portal公邮
    participant RPT as AVIS BL status report(欧线sheet)
    participant U as 业务用户

    SCH->>PF: 每日触发(独立任务,非正向case的环节)
    PF->>MB: 按关键字「bill of lading」检索时间窗口内全部BL邮件
    MB-->>PF: BL邮件清单(从邮件标题提取BL号集合)
    loop 逐BL号反查
        PF->>MB: 查该BL号对应的AVIS邮件是否已收
        MB-->>PF: AVIS收件情况(已收/未收)
    end
    PF->>PF: 卡时间维度比对:已收BL集合 vs 已收AVIS集合
    PF->>RPT: 输出差异清单:已收BL但未收AVIS的票(BL多出部分)
    PF-->>U: 差异结果任务中心/报表可见,供业务跟进漏收AVIS
```

### 3.3 Case2-MBUSI 正向（美线 CMA CGM，10 节点）

> **起点口径已按 2026-10-16 会议调整**：以收到 BL 邮件为出发点，凭 BL 号匹配美国大表后继续往下走。与 v1.2.0"大表先行、登记即建"口径存在差异，见 §8-1 待确认。

```mermaid
sequenceDiagram
    participant MB as 平台公邮(CMA转发)
    participant PF as MBPTS平台
    participant CW as Central Warehouse网站
    participant ATT as 附件台账(平台内部存储)
    participant IES as IES+
    participant SP as SharePoint归档
    participant RPT as AVIS BL status report(美线sheet)
    participant U as 业务用户(OPERATOR/MANAGER)

    MB->>PF: 收到CMA CGM提单邮件(标题含BL号)+BL PDF附件
    PF->>PF: 收单即建Task+R#35;1(票=BL号)
    PF->>ATT: BL PDF按BL号入台账(pending)
    PF->>CW: 导出gvShipLog美国大表(或file_pickup读取指定位置)
    CW-->>PF: gvShipLog Excel(16列)
    PF->>PF: 按BL号(=booking number)精确匹配大表行集
    alt 大表未登记(美表漏数)
        PF->>PF: 建漏数挂起Task(WAIT_INPUT待上传)
        PF->>RPT: 异常反馈记录
        Note over PF: 大表补登created更新后下轮捕获续跑<br/>(或详情页确认续跑)
    else 匹配成功
        PF->>PF: OCR识别BL(箱级展开)→填BL模板+Shipping Log(VOL/Load取自BL)
        PF->>IES: 批量导入Shipping Log(绿灯)→生成预报→集装箱导入BL模板
        alt 差异弹窗(不阻断)
            IES-->>PF: 差异明细(IES不生成台账)
            PF->>RPT: 回写BL different，终态标记「有差异」
        else 无差异
            IES-->>PF: IES台账生成成功，回写台账状态列
        end
        PF->>IES: 上传BL PDF并保存
        PF->>SP: 归档四件套(BL模板/Shipping Log/单票Excel/BL PDF)
        PF->>RPT: 回写完成列(同BL同列以最新Run为准)
    end
    opt 人工重跑(异常票处置,判定链与机制详见 §7)
        PF-->>U: 站内提醒/任务中心待人工可见
        U->>PF: 重跑(整单/节点/批量,经统一判定链)
        PF->>PF: 生成 R#35;N+1(配置快照+修正值,同票互斥幂等)
        PF->>IES: 重走节点链(票级起点=N3 / 节点=CPx,批量级N1/N2不重跑)
        PF->>RPT: 回写覆盖(同BL同列以最新 Run 为准)
    end
```

### 3.4 Case2-MBUSI-R 反向核对（新增平行 case，每日）

> 2026-10-16 会议新增。覆盖正向盲区：**美国大表早已登记、BL PDF 邮件未收到**的票。以"下载美国大表"为任务起点，与 §3.3 无任何触发/数据关联。

```mermaid
sequenceDiagram
    autonumber
    participant SCH as 调度器(每日,可配置)
    participant PF as MBPTS平台
    participant CW as Central Warehouse网站
    participant MB as 平台公邮(CMA转发)
    participant RPT as AVIS BL status report(美线sheet)
    participant U as 业务用户

    SCH->>PF: 定时触发(以「下载美国大表」为任务起点)
    PF->>CW: 导出gvShipLog美国大表
    CW-->>PF: gvShipLog(booking number=BL号集合)
    PF->>MB: 按本批BL号检索邮件标题(BL PDF是否收到)
    MB-->>PF: BL邮件收件情况
    PF->>PF: 卡时间维度比对:大表BL号集合 vs 已收BL邮件集合
    PF->>RPT: 输出差异清单:大表已登记但BL PDF未收到的票
    PF-->>U: 差异结果任务中心/报表可见,供业务跟进漏收邮件
```

---

## 4. Case3 · MBPLAP 发票和预报创建（预报邮件触发，7 节点）

> 依据 Case3 节点链（`PRD数据字段展示方式优化建议.md` 附录）按**系统交互视角**改写（参与者=系统/角色，去除数据流转标注）：
> ① N4 校验不通过分支按 2026-10-16 会议 + demo「上传修正模板 · 续跑确认」补充**下载模板→手工一对一修正→上传→续跑**闭环；
> ② "MBZ/DN:PID 多对一"更正为会议口径"**PID 对 DN 一对多**（IES 不允许，须改一对一）"。
> 消歧：Case3 与 Case5-MBPLAP 支线同名不同场景（Case3=发票+预报创建且写 IES；Case5=ASN DSS 模板产出、零 IES 写入）。

```mermaid
sequenceDiagram
    autonumber
    participant FW as Forwarder(@tvsscs.com)
    participant MB as NPM 邮箱(RPA 监听)
    participant PF as MBPTS 平台/RPA(N1~N7)
    participant CFG as 配置中心(INV&DN 模板+PDC/Email Mapping List)
    participant IES as IES+
    participant SP as SharePoint 归档
    participant U as 业务人员

    FW->>MB: 预报邮件(标题含「MBPLAP Pre-alert」)<br/>附件:发票箱单 PDF/运单/MSDS+Shipper(仅 DG)
    Note over PF: N1 捕捉邮件(规则命中即建票)
    PF->>MB: 按规则扫描(发件人后缀+标题关键词,均可配置)
    MB-->>PF: 命中邮件+附件
    PF->>PF: 读正文 4 字段(Arrival port/Terminal WH/HAWB/DG)<br/>按 HAWB 查重→建 Task+R#35;1(票=HAWB)
    opt 同 HAWB 已导入 IES+ 后收到重复/更正邮件
        PF-->>U: 不自动处理,新邮件挂原任务,转「有差异」待人工(R1.5)
    end
    Note over PF: N2 附件下载重命名并归档
    PF->>SP: 附件按种类重命名归档 〈操作日期〉/HAWB_〈分单号〉/
    opt 缺发票/HAWB(缺件闸口，DG 缺 MSDS/Shipper 不阻断,运行记录记 N)
        PF-->>U: 转「待上传」+站内提醒
        U->>PF: 任务详情补传附件→续跑(Case3 上传中心不使用)
    end
    Note over PF: N3 OCR 识别(发票箱单+运单)
    Note over PF: N4 填写发票导入模板(INV&DN 4 sheet)+校验
    PF->>CFG: Customer NO. 查 PDC Mapping
    CFG-->>PF: PDC(无命中→置空报错)
    PF->>PF: 生成 INV&DN 导入模板存票文件夹
    opt 校验不通过(R3.4/R3.5:Invoice type 非 AB/H5，Qty 推算不唯一，PID 对 DN 一对多)
        PF-->>U: 停 N4 不导入 IES+,转「有差异」+站内提醒
        Note over U,PF: 【2026-10-16 新增人工环节】PID:DN 一对多 IES 不允许导入
        U->>PF: 任务详情下载平台生成的导入模板
        U->>U: 线下手工修正:一对多拆为一对一
        U->>PF: 「上传修正模板 · 续跑确认」
        PF->>PF: 生成 R#35;N+1:N1~N4 沿用前序结果,模板替换为上传文件，<br/>修正模板存入票归档文件夹,旧 Run 只读
    end
    Note over PF: N5 导入发票(IES)
    PF->>IES: INV&DN 模板(或上传的修正模板)批量导入
    IES-->>PF: Warning 原文/无 Warning=Done(发票未创建→转「失败」)
    PF->>IES: 按发票号批量上传发票 PDF(以执行 Log 为准)
    Note over PF: N6 创建预报(IES)
    PF->>IES: 全选本分单所有发票→生成预报→录 16 字段
    PF->>IES: 上传文档资料:分单(HAWB)/MSDS(Others)/Shipper(Shipper decl)
    IES-->>PF: Difference(Y/N,IES 自动校验预报/发票/提单)
    opt Difference = Y(差异闸口)
        PF-->>U: 文档传完暂停不发回信,转「有差异」
        U->>PF: IES+ 核对后点「确认并发送回信」→续 N7(US-03)
    end
    Note over PF: N7 发送邮件通知+运行记录
    PF->>CFG: 按 PDC 查 Email Mapping List 取收件人
    CFG-->>PF: 收件人列表
    PF->>MB: 回复原预报邮件(固定正文+本票 11 列运行记录表)
    PF->>SP: 年度运行记录 〈年份〉.xlsx 追加(一张发票一行)
```

---

## 5. Case4 · X-entry 发票与预报创建（Fedex 诊断仪，12 节点）

> 依据 Case4 节点链（`PRD数据字段展示方式优化建议.md` 附录）按**系统交互视角**改写（去除数据流转标注），并修改：**触发口径按 demo 改为"邮件触发建票 + 12:00/20:00 批次执行"**（规则 R-C4-FEDEX；BRD 半天时效；原图为"调度器扫描命中邮件"）。其余业务逻辑未动（Case4 尚未与开发讨论，2026-10-16 会议明确本期不改）。
> 消歧：Case4 与 Case5-X-entry 支线同名不同场景（Case4=发票+预报创建且写 IES；Case5=ASN DSS 模板产出）。

```mermaid
sequenceDiagram
    autonumber
    participant FX as Fedex(@fedex.com)
    participant MB as Portal 公邮
    participant SCH as 调度器(12:00/20:00 批次,可配置)
    participant PF as MBPTS 平台/RPA(N1~N12)
    participant CFG as 配置中心(模板+业务大表+映射表)
    participant IES as IES+
    participant TD as T 盘出口文件夹
    participant SP as SharePoint 归档
    participant U as 业务人员

    FX->>MB: 预报邮件(标题含「提单自报催办通知」)<br/>附件:预报 PDF(运单主页+运单附页+发票)
    Note over PF: N1 捕捉邮件
    PF->>MB: 按规则 R-C4-FEDEX 监听(发件人后缀+标题关键词,可配置)
    MB-->>PF: 命中邮件+预报 PDF
    PF->>PF: 收单即建 Task(票=运单主页 Hawb),按 HAWB 查重
    opt 同 HAWB 已导入 IES+ 后收到重复/更正邮件
        PF-->>U: 不自动处理,新邮件挂原任务,转「有差异」待人工(R1.4)
    end
    SCH->>PF: 批次执行(处理已建票+已补传任务,BRD 半天时效)
    Note over PF: N2 附件归档
    PF->>SP: 预报 PDF 存 〈运行日期 YYYYMMDD〉/
    Note over PF: N3 发票齐备校验(闸口:页类型须含运单主页+附页+发票页)
    opt 不含发票
        PF-->>U: 停 N3 转「有差异」+站内提醒
        U->>PF: 补传原始 PDF+发票 PDF→下一批次从 N3 继续(或点「重跑」立即执行)
    end
    Note over PF: N4 OCR 识别+HAWB 比对(闸口:主页 Hawb=附页 Master=发票页 Hawb 之一)
    opt 比对不一致
        PF-->>U: 停 N4 转「有差异」，识别错误→修正字段从此节点重跑<br/>单据非同一套→补传
    end
    Note over PF: N5 新旧货判定(新货/GLC 补货的旧货/纯旧货,一份 PDF 仅一种)
    PF->>CFG: 新货/GLC 补货:取发票 Your reference 当 Order No. 查诊断仪大表
    CFG-->>PF: Loaner pool 列=Y 即备用机(PN 改取 Loaner Pool 专用行)
    Note over PF: N6 填写发票信息表(4 sheet,Remark 按类别取值)
    PF->>CFG: 查 PN:新货/GLC 补货=Article no→PN list，纯旧货=SN→诊断仪大表/追踪大表
    CFG-->>PF: PN 及模板取值
    PF->>PF: 生成发票信息表存票文件夹
    Note over PF: N7 导入发票信息表(IES)
    PF->>IES: 发票信息表上传 IES+ 导入(一张发票一次)
    IES-->>PF: 导入结果(发票未创建→转「失败」)
    Note over PF: N8 生成预报(IES)
    PF->>IES: 选中发票生成预报+录 16 字段(运单+发票+预报固定值表)
    Note over PF: N9 预报 Remark(IES)
    PF->>IES: 批量修改 Remark(按类别:新货/新货 loaner pool/新货旧的坏了德国补发/旧货)
    Note over PF: N10 存档 PDF(IES)
    PF->>IES: 预报文档资料上传预报 PDF(文档类别=HAWB)
    opt 纯旧货(N11,其余类别跳过)
        Note over PF: N11 纯旧货文件准备
        PF->>CFG: Warranty 大表查最后一次出口运单(排除 SF 开头顺丰段)
        CFG-->>PF: 出口运单号
        PF->>TD: 按 SN+运单号取原出口报关单+盖章文件×4
        TD-->>PF: 出口单证文件
        PF->>PF: 填旧机电产品进口声明(docx 模板)+Serial number 比对(发票 vs 原出口报关单)
        opt SN 不一致/无法比对(Warranty 无记录/T 盘无文件)
            PF-->>U: 停 N11 转「有差异」，识别错误→修正后从此节点重跑,其余线下核实
        end
    end
    Note over PF: N12 命名存档
    PF->>SP: 票文件夹=SN 〈SN〉_〈品名〉_〈新旧〉_〈HAWB〉<br/>(预报 PDF+发票信息表+旧货文件(仅纯旧货,不上传 IES+))
```

---

## 6. Case5 · ASN 自动创建（双支线，零 IES 写入）

> 依据 Case5 PRD 修订版 v2.0.0 §6.2。2026-10-16 会议确认 Case5（批量重跑/批量下载/任务内重跑）不涉及时序变化，图保持原样；与 demo 核对触发口径一致（MBPLAP 定时 / X-entry 邮件）。

### 6.1 MBPLAP 定时支线（6 节点）

```mermaid
sequenceDiagram
    participant SCH as 调度器(12:00/17:00可配置)
    participant U as IO(业务用户)
    participant PF as MBPTS平台
    participant IES as IES+ 系统
    participant SP as SharePoint

    SCH->>PF: 触发(执行当日窗口)
    PF->>IES: 进口预报批量导出(Supplier=MBPLAP ∧ Pre-alert creation=当日)
    IES-->>PF: 预报清单(HAWB No. 列表)
    Note over PF: 17:00 运行时剔除 12:00 已成功运行分单号<br/>手动批量重提交并入本次队列(Q3=A)
    PF->>PF: 逐分单号建 Task+R#35;1(去重)
    PF->>IES: 按 HAWB 批量查询发票信息(PN 级模板全部导出)
    IES-->>PF: 发票导出清单(A/M/H/AE/Z 列)
    PF->>PF: 按合并键加总 Qty,映射 9 字段生成模板(R5.1)
    PF->>SP: 归档 MBPLAP\<时间戳>\「提单号_发票号.xlsx」
    PF-->>U: 任务完成站内提醒,Portal 可下载
    opt 人工重跑(异常票处置,判定链与机制详见 §7)
        PF-->>U: 站内提醒/任务中心待人工可见
        U->>PF: 重跑(整单/节点/批量,经统一判定链)
        PF->>PF: 生成 R#35;N+1(配置+大表快照,携带修正值,同票互斥幂等)
        PF->>IES: 重走节点链(整单=N1 / 节点=CPx)
        PF->>SP: 新时间戳目录归档(不覆盖历史)
    end
```

### 6.2 X-entry 邮件支线（7 节点）

```mermaid
sequenceDiagram
    participant M as Portal公邮 asn@mb.cn
    participant U as IO/BU
    participant PF as MBPTS平台
    participant DIM as 诊断仪大表(维度表)
    participant INV as 系统库(进口发票)
    participant SP as SharePoint

    M->>PF: 送货邮件(@bjfcl.com ∧ 快件签收单)
    PF->>PF: 收单即建 Task+R#35;1(票=AWB)
    PF->>DIM: 按 AWB 查 PN(D)/QTY(F 加总)/ID No.(J)
    PF->>DIM: 按 ID No. 查 M 列 MBPTS PO
    alt PO 为空(硬阻断,R4.1)
        PF-->>U: 报错转人工·本票阻断(站内提醒)
        U->>PF: 补录 ID No.(4~8位校验,留痕)
        Note over PF: 随下次运行续跑(R4.2)
    end
    PF->>M: 按 PO 号搜 IMS PO 邮件(标题/正文)
    opt PO 邮件未到
        PF->>PF: 挂 WAIT_INPUT,等齐续跑(R1.3)
    end
    PF->>INV: 按 AWB 查进口发票(ASN/Shipment Date)
    alt 发票缺失
        PF-->>U: 引导补传发票后整单重跑(R4.3)
    end
    PF->>PF: 多 Item 顺次收货拆行(R6),映射 9 字段生成模板(R5.2)
    PF->>SP: 归档 X-entry\<时间戳>\「PN_日期.xlsx」+ 原件
    PF->>PF: 收货记录登记(source=rpa)
    PF-->>U: 完成提醒,收货记录(自动+手工)可查询
    opt 人工重跑(判定链详见 §7)
        U->>PF: 重跑(整单/节点,携带补录/修正值)
        PF->>PF: 生成 R#35;N+1(大表快照重取+互斥幂等)
    end
```

---

## 7. 通用：重跑判定链与交互时序（全 Case 共用）

> 三个重跑入口（任务详情「整单重跑」/「检查点续跑」、任务中心「批量重跑」）**统一走同一条判定链**；前端按判定链控制按钮显隐，后端提交时复核。判定链以 GLC 版本为基准，各 Case 差异见 §7.3。

### 7.1 判定流程

```mermaid
flowchart TD
    A[触发:整单重跑/检查点续跑/批量重跑] --> B{最新 Run 执行中?}
    B -- 是 --> Z1[跳过:toast 执行中不可重跑]
    B -- 否 --> C{重跑类型}
    C -- 节点续跑 --> D{OPERATOR/MANAGER?}
    D -- 否 --> Z2[阻断 E5001+审计]
    D -- 是 --> F[确认弹窗:选择检查点 CPx]
    C -- 整单 --> E{已发生对外动作?}
    E -- 否 --> G{OPERATOR/MANAGER?}
    G -- 否 --> Z2
    G -- 是 --> H[确认弹窗:安全重跑]
    E -- 是 --> I{MANAGER?}
    I -- 否 --> Z3[按钮置灰/提交阻断:需主管操作]
    I -- 是 --> J[确认弹窗:逐项列对外后果+勾选知悉]
    F --> K[生成 R#N+1]
    H --> K
    J --> K
    K --> L[固化配置快照:模板/对应表/阈值最新版]
    K --> M[携带当前生效修正值]
    K --> N[同票互斥锁:Task 置执行中]
    L --> O[起跑:整单=N1 / 节点=指定 CPx,前置节点输出沿用]
    M --> O
    N --> O
```

### 7.2 时序图

```mermaid
sequenceDiagram
    participant U as 用户(OPERATOR/MANAGER)
    participant FE as 前端页面
    participant API as 平台后端
    participant RE as Run 引擎
    participant IES as IES+
    participant RPT as 大表回写

    U->>FE: 点击重跑(整单/节点/批量)
    FE->>FE: 按判定链控制按钮显隐(第一次判定)
    U->>FE: 确认弹窗确认
    FE->>API: POST /api/tasks/{id}/rerun{type:full|node, from:CPx}
    API->>API: 复核判定链(状态/角色/对外动作)
    alt 判定不过
        API-->>FE: E5001 / 跳过原因(执行中/需主管)
        FE-->>U: toast 原因
    else 判定通过(幂等:重复提交返回首个 RunId)
        API->>RE: 创建 R#35;N+1(配置快照+当前生效修正值+同票互斥锁)
        RE->>RE: 整单从 N1 / 节点从 CPx 起跑,CPx 前节点输出沿用旧 Run 落盘产物
        loop 节点链(起跑点 → 末节点)
            RE->>IES: IES 交互(绿灯/预报/弹窗/上传)
            RE->>RPT: 按回写时机矩阵覆盖写(同票同列以最新 Run 为准)
        end
        RE-->>API: Run 终态(SUCCEEDED/DIFF_PENDING/FAILED)
        API-->>FE: 状态推送(列表 30s 轮询)
        FE-->>U: toast + 详情自动切到 R#35;N+1(旧 Run 只读)
    end
```

### 7.3 各 Case 差异

| Case | 第三入口 | 对外动作门槛 | 起跑点 | 特殊机制 |
|---|---|---|---|---|
| Case1 | **批量重提**（不立即执行，登记后随下次同运输方式调度，与窗口票按分单号去重 OPEN-C8） | 有（清单上传 IES/状态邮件 → 需 MANAGER） | 整单=N1 | 失败票须先在 IES 修正源数据 |
| Case2-GLC | 批量重跑（逐票立即执行） | 有（IES 导入/上传） | 整单=N1 | L 列覆盖清空待确认 OPEN-G28 |
| Case2-MBUSI | 批量重跑 | 有 | **整单=N3**（批量级 N1/N2 产物全批次共享，不重跑） | OPEN-M21 同 GLC |
| Case2-GLC-R / MBUSI-R | 不适用（核对链无 IES 交互，失败随下次每日调度自愈） | 无 | — | 本期新增，细则待定 §8-4 |
| Case3 | 批量重跑 + **「上传修正模板续跑」特有入口** | 有（IES 发票/预报+回信） | 整单=N1；修正续跑=**从 N5 起跑**，N1~N4 沿用 | 重复邮件挂原任务不自动处理（R1.5） |
| Case4 | 补传后随下一批次（12:00/20:00）继续，或立即重跑 | 有（IES 导入/预报；无通知邮件） | 整单=N1 | 纯旧货支线 N11 可独立节点重跑 |
| Case5 | 批量重跑 | **无**（零 IES 写入，判定链无"对外后果"分支 OPEN-A13） | 整单=N1 | 归档写新时间戳目录不覆盖历史（OPEN-A15） |

---

## 8. 与 demo 核对的差异 / 待确认清单

| # | 事项 | 三方口径 | 状态 |
|---|---|---|---|
| 8-1 | **Case2-MBUSI 正向起点** | 2026-10-16 会议=收 BL 邮件为起点（收单即建）；v1.2.0 PRD=大表先行（登记即建）；demo=定时调度、大表下载为流程内节点 | **待确认**，确认后回写 MBUSI PRD 并同步本图 |
| 8-2 | 「暂存库」表述 | 会议明确"根本不是暂存库"；本文档已统一改为"附件台账（平台内部存储）" | 本文档已改；各 PRD 业务流程图待新月同步 |
| 8-3 | 上传中心形态 | demo 无独立上传中心页面，上传=任务级弹窗（场景：C12 CCC 信息提取/C13 关务报表/C06 ASN 结果回传）；Case4/Case5 PRD 按"上传中心"页面描述 | 待确认（页面 or 弹窗），影响 J 系列跳转表 |
| 8-4 | 反向核对 case 细则 | 会议只定了起点与比对逻辑；差异清单的落点（大表新增列/独立报表/任务中心可见性）、调度具体时点、是否建 Task 均未细化 | 待与开发确认 |
| 8-5 | Case4 触发 | demo=邮件触发建票+12:00/20:00 批次执行；原时序图=调度器扫描命中邮件 | 本文档已按 demo 改；Case4 整体待与开发讨论后再定稿 |

---

## 附：来源文件对照

| 图 | 来源 | 本版改动 |
|---|---|---|
| §2 Case1 | `Case1_危险品托运清单_PRD_修订版.md` v2.0.0 §6.2 | 无 |
| §3.1 GLC 正向 | `UC34-Case2-GLC_PRD_修订版.md` v1.2.4 §6.2 | 暂存库→附件台账；补票级视角注释 |
| §3.2 GLC-R | 2026-10-16 会议口述 | **新增** |
| §3.3 MBUSI 正向 | `UC34-Case2-MBUSI_PRD_修订版.md` v1.2.0 §6.2 | **起点改为邮件先行**（待确认 §8-1）；暂存库→附件台账 |
| §3.4 MBUSI-R | 2026-10-16 会议口述 | **新增** |
| §4 Case3 | `PRD数据字段展示方式优化建议.md` 附录 | **新增人工修正环节**（会议+demo）；多对一→一对多更正；改写为系统交互视角 |
| §5 Case4 | `PRD数据字段展示方式优化建议.md` 附录 | 触发口径按 demo 改为邮件触发建票+批次执行；改写为系统交互视角 |
| §6 Case5 | `UC34-Case5_PRD_修订版.md` v2.0.0 §6.2 | 无 |
| §7 通用重跑 | GLC v1.2.4 §6.2.1 为基准 | 泛化为通用版+各 Case 差异表 |
