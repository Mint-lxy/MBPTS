# UC34 Case 1 · 危险品托运清单自动生成 — 系统架构图（C4）

> 创建日期：2026-09-28 | 依据：`Case1_危险品托运清单_PRD.md` v1.1.0
> 说明：技术选型未有既定设计文档，图中标注 **TBD** 的选型为建议方案，需架构评审确认。

---

## 1. Context 图（系统上下文）

```mermaid
graph TB
    OP[业务操作员<br/>OPERATOR]
    MG[业务主管<br/>MANAGER]
    AD[平台管理员<br/>ADMIN]
    AU[审计员<br/>AUDITOR]
    IO[IO 同事<br/>邮件接收人]

    SYS[MBPTS 智能作业平台<br/>UC34 Case1 危险品托运清单]

    IES[IES+ 系统<br/>进口预报/发票/Hazmat]
    ALICE[Alice 身份系统<br/>SSO + RBAC 授权]
    SMTP[邮件服务 SMTP]
    SP[SharePoint / T盘<br/>存档存储]

    OP -->|任务监控/修正/重跑<br/>HTTPS| SYS
    MG -->|团队监控/审批确认<br/>HTTPS| SYS
    AD -->|配置表/模板维护<br/>HTTPS| SYS
    AU -->|只读审计<br/>HTTPS| SYS

    SYS -->|RPA UI 自动化<br/>筛选/下载/上传| IES
    SYS -->|认证 + 动作级授权| ALICE
    SYS -->|运行结果状态邮件| SMTP
    SMTP -->|投递| IO
    SYS -->|过程文件/年度记录存档| SP
```

**要点**：
- 四类业务角色 + IO 邮件接收人均来自 PRD 第三部分；平台对全部外部系统单向发起
- IES+ 集成方式为 **RPA UI 自动化**（非 API），批量/逐票策略 TBD（PRD TBD-1）
- 存档路径 TBD（PRD TBD-2），地址配置化

---

## 2. Container 图（系统容器）

```mermaid
graph TB
    subgraph 用户侧
        OP[业务用户<br/>浏览器]
    end

    subgraph MBPTS[MBPTS 智能作业平台]
        WEB[Portal Web 前端<br/>SPA · PC Web<br/>工作台/任务/邮件/配置/提醒/RBAC]
        API[Portal 后端 API<br/>REST /api/v1 · 17 个接口<br/>技术栈 TBD]
        SCH[调度器<br/>空运 cron 每日00:00<br/>海运 cron 每周一00:00<br/>Airflow 建议 · TBD]
        RPA[RPA 执行引擎 Worker<br/>IES+ UI 自动化 · 框架待 vendor 评估]
        RULE[规则引擎<br/>UN初筛/Type1-4/SET/票级判定]
        CFGSVC[配置服务<br/>附表1/3/4+清单模板+版本管理]
        MAIL[通知服务<br/>模板渲染/站内提醒]
        AUD[审计与证据服务<br/>WORM 留痕/操作日志]
        DB[(业务数据库<br/>Task/Run/RunResult/邮件记录 · 类型 TBD)]
        CFGDB[(配置库<br/>ConfigTable 版本化内容)]
        EV[(证据存储<br/>WORM · 文件+hash)]
    end

    IES[IES+ 系统]
    ALICE[Alice 身份系统]
    SMTP[邮件服务 SMTP]
    SP[SharePoint / T盘]

    OP -->|HTTPS| WEB
    WEB -->|JSON| API
    API -->|SSO/授权校验| ALICE
    API --> DB
    API --> CFGSVC
    SCH -->|定时/手动触发 生成Task+派发Run| API
    API -->|执行指令| RPA
    RPA -->|UI 自动化| IES
    RPA --> RULE
    RULE -->|读取生效版本| CFGSVC
    RPA -->|写运行结果/节点轨迹| DB
    RPA -->|证据登记| AUD
    AUD --> EV
    RPA -->|四类文件存档| SP
    API -->|触发状态邮件| MAIL
    MAIL -->|SMTP 外发| SMTP
    CFGSVC --> CFGDB
```

**容器职责**：

| 容器 | 职责 | 对应 PRD |
|------|------|---------|
| Portal Web 前端 | 7 个前台模块页面（工作台/任务中心/任务详情/邮件/配置/提醒/RBAC） | 7.3.1-7.3.7 |
| Portal 后端 API | 17 个 REST 接口、任务状态推导、权限校验 | 8.2 |
| 调度器 | 空运/海运 cron + 手动触发 + 批量重提队列（随下次调度） | R1、R9.3 |
| RPA Worker | IES+ 七步操作（A1-A7），七节点执行链 | 7.3.8、附录A |
| 规则引擎 | 附表4 匹配、Type1-4 分支、SET 逐 UN、票级判定 | R2/R5/R6 |
| 配置服务 | 5 项配置上传/校验/版本（生效=最新） | R10、附录C |
| 通知服务 | 模板 TPL-C1-STATUS 渲染、IO 邮件、站内提醒 | R7、F021 |
| 审计与证据 | EV-T/EV-P/EV-O 登记、WORM、审计日志 | R9.1、US-014 |

**待决策（架构评审）**：
1. 调度平台：建议 **Airflow**（原型治理台已体现 DAG 口径），或既有企业调度
2. RPA 框架与运行环境：待 vendor 评估（与批量/逐票策略一并）
3. 数据库类型：业务库建议关系型；证据存储建议对象存储+WORM 策略
4. RPA Worker 与 Portal 的部署关系：独立执行节点，任务经队列派发

---

## 3. Component 图（核心组件）

### 3.1 Portal 后端 API

```mermaid
graph TB
    subgraph API[Portal 后端 API]
        TC[TaskController<br/>任务/重跑/停止/批量重提]
        WC[WorkbenchController<br/>汇总看板]
        CC[ConfigController<br/>配置表/模板]
        MC[MailController<br/>模板/外发记录]
        NC[NotifyController<br/>提醒]
        AC[AuditController<br/>审计日志]
        TS[TaskService<br/>Task/Run 分层 · 状态推导]
        RS[RunService<br/>派发/重跑/字段修正携带]
        CS[ConfigService<br/>版本管理 · 生效版本解析]
        MS[MailService<br/>模板渲染 · 重试]
        AZ[AuthzClient<br/>Alice 动作级授权]
        REPO[(Repository<br/>Task/Run/RunResult/Mail)]
    end
    TC --> TS
    WC --> TS
    TC --> RS
    CC --> CS
    MC --> MS
    TS --> REPO
    RS --> REPO
    CS --> REPO
    TC --> AZ
    CC --> AZ
    MC --> AZ
```

### 3.2 RPA 执行引擎（七节点执行链）

```mermaid
graph TB
    subgraph RPA[RPA Worker]
        DRV[IES Driver<br/>登录/筛选/导出/下载/上传<br/>选择器集中管理]
        N1[N1 触发接收<br/>窗口计算 空运当天/海运上周]
        N2[N2 附件下载与登记<br/>预报清单/Part list/Shipper]
        N3[N3 UN 匹配初筛<br/>附表4 · AR列 · 剔除N·#N/A]
        N4[N4 OCR 识别 Shipper<br/>18字段+置信度+定位]
        N5[N5 清单写入<br/>表头Mapping/Type1-4/SET/票级]
        N6[N6 IES 导入<br/>命名+上传+回执]
        N7[N7 结果汇总与邮件触发<br/>附表5]
        RULE[规则引擎<br/>Type分支/阈值4kg·5L·5KG/豁免]
        ERR[异常处理<br/>E3001-E3004 · Remark 规则]
    end
    N1 --> N2 --> N3 --> N4 --> N5 --> N6 --> N7
    N2 --> DRV
    N6 --> DRV
    N3 --> RULE
    N5 --> RULE
    N2 --> ERR
    N5 --> ERR
    N6 --> ERR
```

### 3.3 配置服务

```mermaid
graph TB
    subgraph CFG[配置服务]
        UP[上传校验器<br/>文件名/格式/必需列]
        VER[版本管理器<br/>v+1 · 历史只读 · 生效=最新]
        PARSE[解析器<br/>附表1三键索引/附表3映射/附表4判定表]
        CACHE[生效版本缓存<br/>运行期按版本锁定]
    end
    UP --> VER --> PARSE --> CACHE
```

---

## 4. 关键数据流

1. **定时执行流**：调度器 → API 生成 Task（每 HAWB/BL 一票）→ 队列派发 RPA Worker → IES Driver 操作 IES+（A1-A7）→ 规则引擎判定 → 写 DB（Run/节点/附表5）→ 通知服务发 IO 邮件 → 存档 SP
2. **异常恢复流**：任务失败 → 站内提醒 → 用户 IES 修正 → 批量重提（入调度队列）或立即重跑（R#n+1，携带字段修正值）
3. **配置变更流**：管理员上传附表新版本 → 校验/解析/生效 → 后续 Run 按新版本执行，历史 Run 仍引用旧版本（可追溯）

---

## 5. 与非功能需求的映射

| NFR（PRD 第九部分） | 架构支撑 |
|--------------------|---------|
| 成功率 ≥95%、失败可重提 | 队列派发 + Run 分层 + 重跑/停止组件 |
| 证据 WORM、历史只读 | 独立证据存储 + 审计服务，历史 Run 不可变 |
| 配置全版本化 | 配置服务版本管理器 + 运行期版本锁定 |
| IES 页面变更可快速修复 | IES Driver 选择器集中管理 + E3002 告警 |
| Alice 授权 | AuthzClient 服务端逐动作校验，UI 显隐仅辅助 |

---

**待评审**：调度平台（Airflow 建议）、RPA 框架、数据库/对象存储类型、RPA Worker 部署拓扑。
