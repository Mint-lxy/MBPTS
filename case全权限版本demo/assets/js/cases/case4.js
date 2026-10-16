/* ===== cases/case4.js · 全权限版 Case4 数据模块 =====
 * 内容取自 case4页面demo/assets/js/data.js，包在独立作用域里避免与其他 Case 重名；
 * 状态（State）与持久化由 data.js 统一提供，种子合并与任务生成由 boot.js 调用 registerCase 注册的方法。 */
(function(){
/* ===== data.js · Case 4 初始演示数据 + localStorage 持久化 ===== */
const SEED = {};
/* Case4 演示任务：X-entry 发票与预报创建，以一票 HAWB（一封 Fedex 预报邮件）为单位。
 * 单号与关联关系取自 Case4 BRD 及附件：
 *   524241899574 —— 图1 预报邮件 / 图3 Master / 图5 DN 51309500 · SN 535510 / 图7 发票 2510083660 / 图8 货值 / 图17 Pad 2 Serial 42231W004178 / 图34 C.W 17.40 · 2 件；
 *                   Warranty 表（VCI replacement.xlsx）SN 535510 最后一次出口运单 1259319935，回程 FedEx 524241899574
 *   448886353108 —— 图9 发票页 Hawb 448886353108 / 448886353119 及分箱重量尺寸 / 图14 Kit 4 · SN 555463、555464 / 图18 单价 / 图23 发票 2510076068；
 *                   诊断仪大表 Order 27667 → Part No. QALCNSD89992081
 *   447033454333 —— BRD 6.2 命名样例「SN 545459_pad 2 power supply_old (new)」/ 附件 PDF3 att1-260304003110.pdf；Warranty 表 545459 回程 447033454333
 *   524241835996 —— BRD 6.2 命名样例「SN 804652-804653_kit 5_loaner pool」；诊断仪大表 ID No. 36336 · Loaner pool Y · QALCNSD26KIT5P1
 *   524241868233 —— Warranty 表 SN 535550（Serial 42231W004852，出口运单 9763175450，即 BRD 图26 出口报关单）回程运单
 *   448886353380 —— BRD 6.2 命名样例「SN 555435-555436_kit5_new」；本演示设为附件 PDF 不含 Invoice（待补传）
 *   448886329033 —— BRD 6.2 命名样例「SN 532418_pad 2_Old」；Warranty 表 Serial 42231W004690 / 出口运单 4521461486；
 *                   发票 Serial 取 BRD 图21 的 42231W004099，演示 SN 比对不一致
 *   524241836010 —— 诊断仪大表 loaner pool SN 804654、804655；演示发票页 Hawb 误为同批 524241836032（HAWB 三方比对不一致）
 * BRD 截图未覆盖的取值（邮件时间、附件名、部分发票号 / DN / 运费 / 重量尺寸等）按 BRD 样例格式模拟。 */
const HOME_MAILS = [];

/* ==================== Case 4 任务数据 ==================== */
SEED.tasks = [];

/* ===== 节点级证据截图 ===== */
(function applyNodeEvidence(){
  /* SEED.tasks 为空，证据由 ensureCase4Tasks 动态生成 */
})();

/* ==================== 其他种子数据（邮件中心 / 配置中心） ==================== */
/* Case4 邮件监听（BRD §1 邮件接收与下载）：
 *   ① 发件人邮箱后缀 @fedex.com —— BRD 要求可配置（未来 Forwarder 可能变化），在规则编辑的「发件人白名单」维护；
 *   ② 邮件标题含「AWB电子版 (电子运单), Genesis AWB (原始运单), CI (发票), Packing List, 提单自报催办通知」（其后为「 – HAWB」）；
 *   接收邮箱：Portal 奔驰公邮，Forwarder 发件时抄送；BRD 未给出地址（预计 11 月申请），演示用保留域名占位。
 *   附件：一份预报 PDF（运单主页 + 运单附页 + 发票），BRD 样例 att1-260819004804.pdf。
 * BRD 未要求流程对外发送通知邮件，因此 IO 收件人与邮件模板均为空列表。 */
const C4_MAIL_TITLE = 'AWB电子版 (电子运单), Genesis AWB (原始运单), CI (发票), Packing List, 提单自报催办通知';
const C4_PORTAL_MAIL = 'portal-demo@example.invalid';
SEED.rules = [
  {id:'R-C4-FEDEX', name:'Fedex 预报邮件监控', line:'case4-xentry',
   mail:C4_PORTAL_MAIL, prio:1, flow:'case-4-xentry', on:true, hits:8,
   crit:{from:'*@fedex.com', to:C4_PORTAL_MAIL, subj:C4_MAIL_TITLE, body:'', attMin:1, attMax:9},
   atts:[{role:'prealert_pdf', type:'PDF', req:true, multi:false, re:'^att\\d+-\\d+\\.pdf$'}]},
];
SEED.ioRecipients = [];
SEED.mailTemplates = [];
SEED.evidence = { trigger:[], process:[], operation:[] };
/* 站内提醒：三票 Case4 待人工处理（与任务样例一致），点击进入任务详情 */
SEED.notify = [
  {t:'待人工处理 · 补传发票', x:'T-448886353380 · HAWB 448886353380 · 附件 PDF 中不包含 Invoice，需在「发票齐备校验」节点上传原始 PDF 与发票 PDF',
   tm:'10-09 20:00', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-448886353380'},
  {t:'待人工确认 · HAWB 比对不一致', x:'T-524241836010 · 发票页 Hawb 524241836032 与运单主页 / 附页 524241836010 不一致，流程已停止等确认',
   tm:'06-29 12:00', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-524241836010'},
  {t:'待人工核实 · Serial number 不一致', x:'T-448886329033 · 旧货 SN 532418 · 发票 Serial 42231W004099 ≠ 出口报关单 42231W004690',
   tm:'09-19 20:00', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-448886329033'},
];
SEED.audit = [];
SEED.thresholds = {};
SEED.dimTables = [];
/* 配置中心（与 Case2 同一结构）
 *   配置中心 · 模板配置（kind='template'，按线路分组，查看 / 上传 / 删除）：
 *     发票信息表导入模板：BRD 7.6 四个 sheet，按抓取结果填写后导入 IES+
 *     旧机电产品进口声明模板：BRD 5.2 / 7.7，纯旧货填写发票号、提/运单号、SN、货值、日期
 *   配置中心 · 映射表配置（kind='mapping'，平台内编辑，第一列为关键字）：
 *     PN list：BRD 2.12 / 7.1，Item No = 发票 Article no；同一 Item No 有普通 PN 与 Loaner Pool PN，故以 Part number 为关键字
 *     原产地二字码转义表：BRD 2.15 / 批注 C31，仅 Taiwan 转 TW，其余取等号前 2 字码
 *     预报固定值：BRD 4.1“建议此处不要写死”的 Airline/Carrier、Flight No./Vessels NO.、Terminal WH
 *     诊断仪大表、追踪大表、Warranty 大表：BRD 2.12 / 5.1 / 7.2 / 7.8，批注 C25“指定手工表进行手工运维”；业务上传最新版 */
const C4_INV_SHEETS = [
  {sheet:'INV 表头', cols:['SH Tracking No.','Invoice No.','Invoice type','Invoice date','PDC','Supplier name','Customer account No.','Freight type','Incoterm','Goods value','Currency','Packing fee','Charge to airport','Insurance','Freight charge','DGR fee','Others','Total Amount','Urgent Invoice','BOL','Gross Weight','Volume','Remark 1','Remark 2']},
  {sheet:'INV 表体', cols:['Item','MBZ/DN No.','Invoice No','Part Number','Description EN','Qty','Item Net Weight (kg)','Unit Price','Total Price','Country of Origin','Discount group','Dealer Code','Order No.','Order Line']},
  {sheet:'DN 表头', cols:['Container No.','MBZ/DN No.','PID','Package Type','Length(MM)','Width(MM)','Height(MM)','N.W（KG)','G.W（KG)']},
  {sheet:'DN 表体', cols:['MBZ/DN No.','PID','Part Number','Description EN','Qty']},
];
const C4_STAR_D_COLS = ['Customer','Region','Dealer Code','Dealer Name','Part No.','Qty','POCC/ Normal','Plug Type','Customer PO','WIPNo (Sales)','ID No. (order to GSP)','Order to GSP','Order Type','AWB No.','MBU No','Invoice date','System No.','Revd by BJ WHS.dd','DPTS PO','Freight (EURO)','Value (EURO)','DUTY (RMB)','1st GR No.','GRN No.','DAG INV.No (2nd GR No.)','Payment to DAG','ICT WIP (shipper)','ICT WIP (receiver)','Picking No.','Picking Date','Expiration Month ( Rental End Date)','Xentry Retruned Status','RDS Retruned Status','Scrapped or not','Scrap date','Scrap batch'];
const C4_STAR_D_NEW_COLS = ['Facing PDC','Dealer Code','Dealer Name','Part NO.','Commodity name','Qty','Check','ICT PO','WIP No (Sales)','ID No. (order to GSP)','Loaner pool','Order to GSP','DPTS PO','AWB No.','System No.','Revd by BJ WHS.dd','PDC on shelf','GRN No.'];
const C4_WARRANTY_COLS = ['System No','DPU No','Receive UHD notice Date','Dealer Name','PDC','Dealer Code','Component Name','Dealer Rental End Date','Device Contract End Date','Type','arrive at BJ PDC date','Serial No','Loaner Pool Request','Lend Confirmation','System No','DHL/SF No. (Out)','DHL/ Local repair pick up date','FedEx/SF No. (Back)','ATA to BJ PDC','Manual DN','Delivery to dealer','Repair cost confirmation (Y/N)','案例状态','描述'];
const C4_STAR_D_NEW_FILE = '! Star D orders_new_Since Aug. 8 handled by IE.xlsx';
/* PN list 初始数据：BRD 附件 7.1 PN.xlsx（20260227 new request），列顺序 Part number / Product / Item No / Price */
const C4_PN_ROWS = [
  ['QALCNSD26KIT501','XENTRY Diagnosis Kit 5','6511976076','8022'],
  ['QALCNSD26KIT5S1','XENTRY Diagnosis Kit 5 Scope','6511976576','12474'],
  ['QALCNSD26XSCP01','XENTRY Scope','6511919599','4494'],
  ['QALCNSD26RDS201','Retail Data Storage 2','6511754099','2019'],
  ['QALCNSD26KIT5P1','XENTRY Diagnosis Kit 5 Loaner Pool','6511976076','8022'],
  ['QALCNSD26RDS2P1','Retail Data Storage 2 Loaner Pool','6511754099','2019'],
  ['QALCNSD26ACC001','XD PAD 5 PEN','6511978399','15'],
  ['QALCNSD26ACC002','XD PAD 2 PEN','6511972699','18'],
  ['QALCNSD26ACC003','USB cable 4.5 m','6511193499','19'],
  ['QALCNSD26ACC004','XD Pad 5 charging cable 12V/24V','6511978299','30'],
  ['QALCNSD26ACC005','XD Pad 5 power supply unit','6511978199','30'],
  ['QALCNSD26ACC006','High-frequency testing and meas. range probe','6511198399','56'],
  ['QALCNSD26ACC007','XENTRY Diagnosis cable (16-p/OBD)','6511251799','39'],
  ['QALCNSD26ACC008','USB TO LAN ADAPTER','6511754299','41'],
  ['QALCNSD26ACC009','USB cable (5 m)','6511250799','42.5'],
  ['QALCNSD26ACC010','Red ground line','6511193799','45'],
  ['QALCNSD26ACC011','Green ground line','6511193899','45'],
  ['QALCNSD26ACC012','Secondary ignition pickup','6511197599','46'],
  ['QALCNSD26ACC013','Blue ground line','6511193699','45'],
  ['QALCNSD26ACC014','Yellow ground line','6511193999','45'],
  ['QALCNSD26ACC015','Small parts set (clamping devices & adapters)','6511194199','48'],
  ['QALCNSD26ACC016','Temperature sensor','6511197299','52'],
  ['QALCNSD26ACC017','Ground line for resistance measurement','6511197199','59'],
  ['QALCNSD26ACC018','XENTRY Diagnosis adapter cable (14-pin)','6511251499','57'],
  ['QALCNSD26ACC019','XD PAD 2 USB HUB','6511972399','60'],
  ['QALCNSD26ACC020','XENTRY Diagnosis Pad power supply unit','6511921199','69'],
  ['QALCNSD26ACC021','XENTRY Diagnosis adapter cable (8-pin)','6511250899','85'],
  ['QALCNSD26ACC022','XENTRY Diagnosis adapter cable (38-pin)','6511253999','94.5'],
  ['QALCNSD26ACC023','XD Pad 2 power supply','6511972199','105'],
  ['QALCNSD26ACC024','XD Pad 2 charging cable 12V/24V','6511972499','115'],
  ['QALCNSD26ACC025','XD Pad 5 Dockingstation (USB-C)','6511978099','120'],
  ['QALCNSD26ACC026','Coil and signal sensor','6511198699','127'],
  ['QALCNSD26ACC027','XENTRY DIAGNOSIS PAD VEH.CHARG.,12/24 V.','6511922199','142.5'],
  ['QALCNSD26ACC028','Secondary adapter set','6511173799','209'],
  ['QALCNSD26ACC029','Current clamp 2000 A','6511197099','221'],
  ['QALCNSD26ACC030','Pressure sensor','6511197499','315'],
  ['QALCNSD26ACC031','XENTRY Diagnosis Pad docking station','6511921599','327.5'],
  ['QALCNSD26ACC032','Current clamp 100 A','6511193199','343'],
  ['QALCNSD26ACC033','Optical balancing set','6511194399','355'],
  ['QALCNSD26ACC034','XD Pad 2 docking station','6511972099','350'],
  ['QALCNSD26ACC035','NVH kit (noise and vibration measurement)','6511194299','890'],
];
SEED.cfgItems = [
  {id:'cfg-c4-invoice', kind:'template', line:'case4-xentry', name:'发票信息表导入模板', file:'导入模板-INV 表头.xlsx', accept:'.xlsx',
   desc:'4 个 sheet · INV 表头 24 列 / INV 表体 14 列 / DN 表头 9 列 / DN 表体 5 列 · 按抓取结果填写后导入 IES+（导入INV&DN）',
   sheets:C4_INV_SHEETS, cols:C4_INV_SHEETS.flatMap(s=>s.cols), ver:1, time:'2026-09-22'},
  {id:'cfg-c4-decl', kind:'template', line:'case4-xentry', name:'旧机电产品进口声明模板', file:'旧机电产品进口声明.docx', accept:'.docx',
   desc:'Word · 纯旧货填写发票号、提/运单号、SN（Serial number）、货值、落款日期，其余栏位保持模板原样',
   sheets:[{sheet:'填写栏位', cols:['发票号','提/运单号','SN（Serial number）','货值','落款日期']}],
   cols:['发票号','提/运单号','SN（Serial number）','货值','落款日期'], ver:1, time:'2026-09-22'},

  {id:'cfg-c4-diag', kind:'template', line:'case4-xentry', name:'诊断仪大表', file:C4_STAR_D_NEW_FILE, accept:'.xlsx',
   desc:'新货 / GLC 补货的旧货：发票 Order No. 对 ID No. (order to GSP) 列，取 Loaner pool 列；纯旧货（2025-08-08 后进口）按 System No. 取 Part NO.',
   sheets:[{sheet:'General(stock+sales)', cols:C4_STAR_D_NEW_COLS}], cols:C4_STAR_D_NEW_COLS, ver:1, time:'2026-09-22'},
  {id:'cfg-c4-track', kind:'template', line:'case4-xentry', name:'追踪大表（2025-08-08 前进口）', file:'Star D orders.xlsx', accept:'.xlsx',
   desc:'纯旧货按 System No. 取当时进口的 Part No.（E 列）',
   sheets:[{sheet:'General(stock+sales)', cols:C4_STAR_D_COLS}], cols:C4_STAR_D_COLS, ver:1, time:'2026-09-22'},
  {id:'cfg-c4-warranty', kind:'template', line:'case4-xentry', name:'Warranty 大表', file:'VCI replacement.xlsx', accept:'.xlsx',
   desc:'纯旧货：A 列 System No → P 列 DHL/SF No. (Out) 与 Q 列 pick up date，取最后一次出口运单（SF 开头不考虑），再到 T 盘找原出口报关单',
   sheets:[{sheet:'Export & Re-import', cols:C4_WARRANTY_COLS}], cols:C4_WARRANTY_COLS, ver:1, time:'2026-09-22'},

  {id:'map-c4-pn', kind:'mapping', scope:'X-entry', name:'PN list',
   desc:'新货 / GLC 补货的旧货按发票 Article no（= Item No）取 Part number；Loaner pool = Y 时取带 Loaner Pool 字样的行；每年更新',
   cols:['Part number','Product','Item No','Price'], rows:C4_PN_ROWS, ver:1, time:'2026-02-27 10:00'},
  {id:'map-c4-coo', kind:'mapping', scope:'X-entry', name:'原产地二字码转义表',
   desc:'IES+ 只接收二字码；表中有的按表转换，表中没有的取等号前 2 字码（如 DE = Germany → DE）',
   cols:['发票原产地','IES 二字码','备注'], rows:[['Chinese Taiwan','TW','BRD 2.15']], ver:1, time:'2026-09-22 10:00'},
  {id:'map-c4-alert', kind:'mapping', scope:'X-entry', name:'预报固定值',
   desc:'生成预报时填写的固定值；更换 Forwarder 时在此修改',
   cols:['预报字段','取值','备注'],
   rows:[['Airline/Carrier','Fedex','BRD 4.1'],['Flight No./Vessels NO.','Fedex','BRD 4.1'],['Terminal WH','联邦库','BRD 4.1']],
   ver:1, time:'2026-09-22 10:00'},
];
/* 共享盘监听（触发方式之一）：Case5 由定时调度（MBPLAP）与邮件监听（X-entry）触发，不从共享盘抓取文件，
   因此此处不配置，字段留空并置灰；平台能力保留，其他 Case 需要时再填。 */
SEED.sharepoint = {dir:'', table:'', poll:''};
SEED.pool = [];
SEED.mails = [   /* 试运行样本：两封命中（BRD 图1 样例 + 任务样例票），一封发件人非 Fedex，一封 BRD 所述「偶尔不显示该标题」，一封未抄送 Portal 公邮 */
  {id:'M-C4-001', from:'forwarder-demo@fedex.com', to:[C4_PORTAL_MAIL], subj:C4_MAIL_TITLE+' – 524241899574', att:1},
  {id:'M-C4-002', from:'forwarder-demo@fedex.com', to:[C4_PORTAL_MAIL], subj:C4_MAIL_TITLE+' – 448886353108', att:1},
  {id:'M-C4-003', from:'outside@example.invalid', to:[C4_PORTAL_MAIL], subj:C4_MAIL_TITLE+' – 524241835996', att:1},
  {id:'M-C4-004', from:'forwarder-demo@fedex.com', to:[C4_PORTAL_MAIL], subj:'Shipment documents 524241868233', att:1},
  {id:'M-C4-005', from:'forwarder-demo@fedex.com', to:['ie-import-demo@example.invalid'], subj:C4_MAIL_TITLE+' – 447033454333', att:1},
];
SEED.templates = [];
SEED.dbviews = [];

/* ===== 状态持久化 ===== */
/* Case4 使用独立缓存 key，不加载 Case5 等其他原型的历史演示数据 */
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }


/* ===== 领域辅助 ===== */
function latestRun(t){ return t.runs.length ? t.runs[t.runs.length-1] : null; }
function runByNo(t, no){ return t.runs.find(r=>r.no===no) || null; }
function taskStatus(t){
  if(t.waitState) return 'WAIT_INPUT';
  const r = latestRun(t);
  return r ? r.st : 'CREATED';
}

const C4_CASE = 'X-entry 发票与预报创建';
const CASE_META = {
  [C4_CASE]: {rule:'R-C4-FEDEX', trigger:'邮件触发', perDay:2, total:0, avgDur:'—'},
};
function getCaseHistory(t){
  const meta = CASE_META[t.case]||{rule:t.rule||'—',trigger:t.src,perDay:1,total:10,avgDur:'3m'};
  const entries = [];
  State.tasks.filter(x=>x.case===t.case).forEach(x=>{
    const lr=latestRun(x); if(!lr) return;
    entries.push({id:x.id,date:lr.start,st:lr.st,dur:lr.dur,self:x.id===t.id,real:true});
  });
  const ts=s=>{const m=/(?:(\d{4})-)?(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s||'');return m?new Date(+(m[1]||new Date().getFullYear()),+m[2]-1,+m[3],+m[4],+m[5]).getTime():0;};
  entries.sort((a,b)=>ts(b.date)-ts(a.date));
  const ok=entries.filter(e=>e.st==='SUCCEEDED').length;
  const rate=entries.length?Math.round(ok/entries.length*1000)/10:0;
  const secs=entries.map(e=>/(\d+)m\s*(\d+)s/.exec(e.dur||'')).filter(Boolean).map(m=>Number(m[1])*60+Number(m[2]));
  const avg=secs.length?Math.round(secs.reduce((a,b)=>a+b,0)/secs.length):0;
  const avgDur=secs.length?`${Math.floor(avg/60)}m ${String(avg%60).padStart(2,'0')}s`:meta.avgDur;
  return {meta,total:entries.length,rate,avgDur,entries};
}

/* ==================== Case 4 · X-entry 发票与预报创建 业务样例 ====================
 * 取值依据：【MBPTS-UC34】Case 4：X-entry 发票与预报创建_BRD_0922.md 及附件（PN.xlsx、诊断仪大表、VCI replacement.xlsx、导入模板）。
 * 节点：捕捉邮件 → 附件归档 → 发票齐备校验 → OCR识别 + HAWB 三方比对 → 新旧货判定 → 填写发票信息表（含 PN 查表）
 *       → 导入发票信息表 → Remark1/2 维护 → 生成预报 → 预报 Remark → 存档 PDF →（旧货分支）出口单据 + 旧机电声明 + SN 比对 → 命名存档
 * 附件 PDF 页序（演示口径）：第 1 页运单主页、第 2 页运单附页、第 3–5 页发票（抬头 / 明细 / 重量尺寸与合计）。 */
const C4_ARCHIVE = 'Portal Share Point';   /* 梳理版：下载附件并保存到 Portal Share Point，一级目录为运行日期 */
function c4ArchiveDir(c){ return C4_ARCHIVE+'\\'+c4RunStart(c.mail).slice(0,10).replace(/-/g,''); }
const C4_EXPORT_DIR = 'T:\\MBPTS\\IE\\1. Import\\17. X-entry\\05. Documentation for imp.&exp';
const C4_SUBJ = C4_MAIL_TITLE+' – ';
const C4_PN_LIST = 'PN.xlsx';
const C4_DIAG_OLD = 'Star D orders.xlsx';   /* 追踪大表：纯旧货按 SN 查 PN（样例 SN 均为 2025-08-08 前进口） */
const C4_DIAG_NEW = C4_STAR_D_NEW_FILE;    /* 诊断仪大表：新货 / GLC 补货查 Loaner pool */
const C4_WARRANTY = 'VCI replacement.xlsx';
const C4_STAMPED = ['MBPTS 默认模板_return label（盖章）.pdf','MBPTS 默认模板_维修 letter（盖章）.pdf','MBPTS 默认模板_给海关的情况说明（盖章）.pdf','MBPTS 默认模板_原进口报关单（盖章）.pdf'];
/* 货物类别（BRD 2.9 / 2.10 / 3.2 / 4.2 / 6.2） */
const C4_GOODS = {
  new:    {t:'新货', supplier:'GLC-Xentry-New', remark1:'新货', alert:'新货', folder:'new'},
  old:    {t:'旧货', supplier:'GLC-Xentry-Old', remark1:'旧货', alert:'旧货', folder:'Old'},
  glc:    {t:'GLC 补货的旧货', supplier:'GLC-Xentry-Old', remark1:'新货', alert:'新货，旧的坏了，德国补发', folder:'old (new)', remark2:'德国补的新货，旧的坏了'},
  loaner: {t:'新货 · loaner pool', supplier:'GLC-Xentry-New', remark1:'新货loaner pool', alert:'新货loaner pool', folder:'loaner pool'},
};
const C4_PAD_BOX = ['63,0 x 43,0 x 16,5'];
const C4_SAMPLES = [
  {hawb:'524241899574', goods:'old', status:'completed', dur:'7m 18s',
   mail:'2026-08-19 08:48', att:'att1-260819004804.pdf', attSize:'250 KB', pages:7,
   master:'5242 4189 9574', invHawbs:['524241899574'], dnSlip:'51309500',
   inv:{no:'2510083660', date:'17 08 2026', dn:'51309500', ref:'CASE-0001505981', incoterm:'Freight-free CPT', goods:'1.359,57', freight:'182,08', total:'1.541,65'},
   orderType:'Service Customer Repair', sn:['535510'], snPos:'发票右上角',
   item:{no:'161', article:'6511970299', desc:'XENTRY Diagnosis Pad 2', qty:1, price:'1.359,57', coo:'Chinese Taiwan',
     note:'PAD 与 Koffer XENTRY Diagnosis Kit 4（箱子）分两行，取 PAD 行，Qty 为 1'},
   pn:'QALCNSD89992006', colli:[['8 700','7 830',C4_PAD_BOX[0]],['8 700','7 830',C4_PAD_BOX[0]]], cw:'17.40', pieces:'2',
   export:{cands:'2329558630（2026-01-09）· SF0256757583418（顺丰，排除）· 1259319935（2026-07-31）', out:'1259319935', invSerial:'42231W004178', cdsSerial:'42231W004178'},
   folderItem:'pad 2'},
  {hawb:'448886353108', goods:'new', status:'completed', dur:'6m 42s',
   mail:'2025-10-09 09:12', att:'att1-251009003312.pdf', attSize:'236 KB', pages:6,
   master:'4488 8635 3108', invHawbs:['448886353108','448886353119'], dnSlip:'51288519',
   inv:{no:'2510076068', date:'02 10 2025', dn:'51288519', ref:'27667_001', incoterm:'Freight-free CPT', goods:'16.044,00', freight:'215,40', total:'16.259,40'},
   orderType:'New order', sn:['555463','555464'], snPos:'配件信息部分',
   item:{no:'3300', article:'6511970076', desc:'XENTRY Diagnosis Kit 4', qty:2, price:'8 022,00', coo:'DE = Germany',
     note:'Item 3300 / 3400 的 MBZ/DN 与 Part No. 相同，合并为一行，Item 取 3300，Qty / 净重 / 总价加总'},
   pn:'QALCNSD89992081', loaner:'27667 → 大表 Loaner pool 列为空 → 否',
   colli:[['8 621','7,752',C4_PAD_BOX[0]],['8 621','7,752',C4_PAD_BOX[0]]], cw:'17.50', pieces:'2', folderItem:'kit 4'},
  {hawb:'447033454333', goods:'glc', status:'completed', dur:'6m 05s',
   mail:'2026-03-04 11:02', att:'att1-260304003110.pdf', attSize:'198 KB', pages:6,
   master:'4470 3345 4333', invHawbs:['447033454333'], dnSlip:'51296042',
   inv:{no:'2510079316', date:'02 03 2026', dn:'51296042', ref:'CASE-0001452877', incoterm:'Freight-free CPT', goods:'105,00', freight:'38,50', total:'143,50'},
   orderType:'Service Kulanz', sn:['545459'], snPos:'品名下方',
   item:{no:'10', article:'6511972199', desc:'XD Pad 2 power supply', qty:1, price:'105,00', coo:'DE = Germany'},
   pn:'QALCNSD26ACC023', loaner:'CASE-0001452877 → 大表未命中 → 否',
   colli:[['0 435','0 380','30,0 x 20,0 x 10,0']], cw:'0.50', pieces:'1', folderItem:'pad 2 power supply'},
  {hawb:'524241835996', goods:'loaner', status:'completed', dur:'6m 51s',
   mail:'2026-06-29 09:30', att:'att1-260629002157.pdf', attSize:'241 KB', pages:6,
   master:'5242 4183 5996', invHawbs:['524241835996'], dnSlip:'51301276',
   inv:{no:'2510080457', date:'26 06 2026', dn:'51301276', ref:'36336_001', incoterm:'Freight-free CPT', goods:'16.044,00', freight:'226,30', total:'16.270,30'},
   orderType:'New order', sn:['804652','804653'], snPos:'配件信息部分',
   item:{no:'100', article:'6511976076', desc:'XENTRY Diagnosis Kit 5', qty:2, price:'8 022,00', coo:'DE = Germany'},
   pn:'QALCNSD26KIT5P1', loaner:'36336 → 大表 Loaner pool = Y → 取 PN list 中 Loaner Pool 行',
   colli:[['9 120','8 200',C4_PAD_BOX[0]],['9 120','8 200',C4_PAD_BOX[0]]], cw:'18.50', pieces:'2', folderItem:'kit 5'},
  {hawb:'524241868233', goods:'old', status:'running',
   mail:'2026-07-24 10:26', att:'att1-260724001835.pdf', attSize:'247 KB', pages:7,
   master:'5242 4186 8233', invHawbs:['524241868233'], dnSlip:'51304817',
   inv:{no:'2510082214', date:'22 07 2026', dn:'51304817', ref:'CASE-0001489630', incoterm:'Freight-free CPT', goods:'1.359,57', freight:'176,90', total:'1.536,47'},
   orderType:'Service Customer Repair', sn:['535550'], snPos:'发票右上角',
   item:{no:'161', article:'6511970299', desc:'XENTRY Diagnosis Pad 2', qty:1, price:'1.359,57', coo:'Chinese Taiwan'},
   pn:'QALCNSD89992006', colli:[['8 650','7 790',C4_PAD_BOX[0]],['8 650','7 790',C4_PAD_BOX[0]]], cw:'17.30', pieces:'2',
   export:{cands:'9763175450（2026-06-29）', out:'9763175450', invSerial:'42231W004852', cdsSerial:'42231W004852'},
   folderItem:'pad 2'},
  {hawb:'448886353380', goods:'new', status:'manual', block:'invoice',
   mail:'2025-10-09 14:20', att:'att1-251009004127.pdf', attSize:'96 KB', pages:2,
   sn:['555435','555436'], folderItem:'kit5'},   /* BRD 6.2 命名样例；补传发票并重跑成功后用于命名存档 */
  {hawb:'448886329033', goods:'old', status:'manual', block:'sn',
   mail:'2025-09-19 15:40', att:'att1-250919003526.pdf', attSize:'244 KB', pages:7,
   master:'4488 8632 9033', invHawbs:['448886329033'], dnSlip:'51279934',
   inv:{no:'2510071188', date:'17 09 2025', dn:'51279934', ref:'CASE-0001398265', incoterm:'Freight-free CPT', goods:'1.298,40', freight:'176,20', total:'1.474,60'},
   orderType:'Service Customer Repair', sn:['532418'], snPos:'发票右上角',
   item:{no:'161', article:'6511970299', desc:'XENTRY Diagnosis Pad 2', qty:1, price:'1.298,40', coo:'Chinese Taiwan'},
   pn:'QALCNSD89992006', colli:[['8 650','7 790',C4_PAD_BOX[0]],['8 650','7 790',C4_PAD_BOX[0]]], cw:'17.30', pieces:'2',
   export:{cands:'4521461486（2025-08-15）', out:'4521461486', invSerial:'42231W004099', cdsSerial:'42231W004690'},
   folderItem:'pad 2'},
  {hawb:'524241836010', goods:'loaner', status:'manual', block:'hawb',
   mail:'2026-06-29 09:35', att:'att1-260629002203.pdf', attSize:'239 KB', pages:6,
   master:'5242 4183 6010', invHawbs:['524241836032'], dnSlip:'51301281',
   inv:{no:'2510080462', date:'26 06 2026', dn:'51301281', ref:'36336_001', incoterm:'Freight-free CPT', goods:'16.044,00', freight:'226,30', total:'16.270,30'},
   orderType:'New order', sn:['804654','804655'], snPos:'配件信息部分',
   item:{no:'100', article:'6511976076', desc:'XENTRY Diagnosis Kit 5', qty:2, price:'8 022,00', coo:'DE = Germany'},
   pn:'QALCNSD26KIT5P1', loaner:'36336 → 大表 Loaner pool = Y → 取 PN list 中 Loaner Pool 行',
   colli:[['9 120','8 200',C4_PAD_BOX[0]],['9 120','8 200',C4_PAD_BOX[0]]], cw:'18.50', pieces:'2', folderItem:'kit 5'},
];
function c4Sample(hawb){ return C4_SAMPLES.find(c=>c.hawb===hawb) || C4_SAMPLES[0]; }

/* ---- 数值与格式规则（BRD 2.6 / 2.7 / 2.8 / 2.15 / 2.16） ---- */
/* 去除千分位；空格与逗号均代表小数点（如 8 621 → 8.621，63,0 → 63.0） */
function c4Num(s){
  const t = String(s).trim();
  if(/^\d{1,3}([. ]\d{3})+,\d+$/.test(t)) return t.replace(/[. ]/g,'').replace(',','.');
  return t.replace(/[ ,]/,'.');
}
function c4Date(s){ const [d,m,y] = s.split(' '); return `${y}-${m}-${d}`; }
function c4Gross(v){ const n = Number(c4Num(v)); return n<1 ? String(Math.round(n*100+1e-9)/100) : n.toFixed(3); }
function c4Sum(list){ return list.reduce((a,b)=>a+Number(b),0).toFixed(3); }
function c4Dims(raw){ return raw.split('x').map(x=>Number(c4Num(x))); }
function c4Coo(raw){ return /taiwan/i.test(raw) ? 'TW' : raw.split('=')[0].trim(); }
function c4OrderNo(c){ return ['new','loaner'].includes(c.goods) ? c.inv.ref.split('_')[0] : c.inv.ref; }
function c4Remark2(c){ const g = C4_GOODS[c.goods]; return c.sn.join('、') + (g.remark2 ? ' '+g.remark2 : ''); }
function c4Folder(c){
  const sn = c.sn.length>1 ? c.sn[0]+'-'+c.sn[c.sn.length-1] : c.sn[0];
  return `SN ${sn}_${c.folderItem}_${C4_GOODS[c.goods].folder}_${c.hawb}`;
}
function c4MailFile(c){ return '提单自报催办通知 - '+c.hawb+'.msg'; }
function c4InvFile(c){ return '发票信息表_'+c.hawb+'.xlsx'; }
function c4CdsFile(c){ return `Exp. CDS_${c.sn[0]}_${c.export.out}.pdf`; }
function c4DeclFile(c){ return '旧机电产品进口声明_'+c.hawb+'.docx'; }
function c4Diag(c){ return c.goods==='old' ? C4_DIAG_OLD : C4_DIAG_NEW; }
/* BRD：可接受半天时效，建议每天 12:00 / 20:00 两个批次 */
function c4RunStart(mail){
  const [day, hm] = mail.split(' ');
  if(hm < '12:00') return day+' 12:00';
  if(hm < '20:00') return day+' 20:00';
  const d = new Date(day+'T00:00:00'); d.setDate(d.getDate()+1);
  const p = x=>String(x).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} 12:00`;
}
function c4Img(ids){ return ids.map(i=>'assets/img/case4/fig-'+String(i).padStart(2,'0')+'.png'); }

/* 节点定义：key 用于字段按节点分组（stage），旧货才有「出口单据 + 旧机电声明 + SN 比对」分支 */
function c4NodeKeys(c){
  return ['mail','archive','check','ocr','goods','template','import','alert','alertRemark','pdf']
    .concat(c.goods==='old' ? ['oldDocs'] : [], ['naming']);
}
function c4Files(c){
  const f = [{name:c.att, pages:c.pages}, {name:c4MailFile(c), pages:1}];
  if(c.block==='invoice') return f;
  f.push({name:c4InvFile(c), pages:4}, {name:C4_PN_LIST, pages:1}, {name:c4Diag(c), pages:1});
  if(c.goods==='old') f.push({name:C4_WARRANTY, pages:1}, {name:c4CdsFile(c), pages:2}, {name:c4DeclFile(c), pages:1});
  return f;
}
/* 文件下标：0 附件 PDF · 1 邮件 · 2 发票信息表 · 3 PN list · 4 诊断仪大表（旧货为追踪大表）· 5 Warranty 表 · 6 出口报关单 · 7 旧机电声明 */
function c4Nodes(c){
  const g = C4_GOODS[c.goods], inv = c.inv, pdf = c.hawb+'.pdf';
  const all = {
    mail:{n:'捕捉邮件', d:'发件人后缀 @fedex.com · 标题含「提单自报催办通知」· HAWB '+c.hawb,
      okDesc:'Fedex 预报邮件已命中 · HAWB '+c.hawb, subs:[c4MailFile(c)], fieldFiles:[1], fieldTitle:'邮件捕捉数据',
      ops:['命中预报邮件「'+C4_SUBJ+c.hawb+'」（发件人后缀 @fedex.com）', '附件 '+c.att+'（'+c.attSize+'）']},
    archive:{n:'附件归档', d:'PDF 附件保存至 Portal Share Point（一级目录：运行日期）', okDesc:'附件已保存 · '+c4ArchiveDir(c), subs:[c.att],
      ev:[{type:'file', title:'附件下载与保存', lines:['附件 '+c.att+' · '+c.attSize, '保存目录 '+c4ArchiveDir(c), '原始邮件 .msg 同步留存']}],
      evFiles:[[c.att, c.attSize],[c4MailFile(c),'108 KB']],
      ops:['附件 '+c.att+' 已保存至 '+c4ArchiveDir(c)]},
    check:{n:'发票齐备校验', d:'识别 PDF 页类型：运单主页 / 运单附页 / 发票页', okDesc:'PDF 含 Invoice · 共 '+c.pages+' 页',
      subs:[c.att], fieldFiles:[0], fieldTitle:'页类型识别', ops:['PDF 含运单主页、运单附页与发票页，进入 OCR 识别']},
    ocr:{n:'OCR识别 + HAWB 比对', d:'Hawb（运单主页）与 Master（运单附页）均须等于发票页 Hawb 中的某一个',
      okDesc:'OCR 完成 · HAWB 比对一致', subs:[c.att], fieldFiles:[0], fieldTitle:'OCR 识别数据',
      evFiles:[[c.att, c.attSize]],
      ops:inv?['OCR 识别完成（发票 '+inv.no+' · DN '+inv.dn+'）', 'HAWB 比对一致：主页 '+c.hawb+' / 附页 '+c.master.replace(/\s/g,'')+' / 发票页 '+c.invHawbs.join('、')]:[]},
    goods:{n:'新旧货判定', d:'Order type · System number（SN）· Loaner pool 查询', okDesc:'判定为'+g.t+' · SN '+(c.sn||[]).join('、'),
      subs:[c4Diag(c)], fieldFiles:[0,4], fieldTitle:'新旧货判定', ops:c.sn?['Order type「'+c.orderType+'」→ '+g.t+' · Supplier name '+g.supplier]:[]},
    template:{n:'填写发票信息表', d:'INV 表头 / INV 表体 / DN 表头 / DN 表体 · Article no 查 PN · 写入 Remark1 / Remark2',
      okDesc:'发票信息表已生成 · '+c4InvFile(c), subs:[c4InvFile(c)], fieldFiles:[2,3,4], fieldTitle:'发票信息表字段',
      ops:c.pn?['PN 查表 · Article no '+c.item.article+' → '+c.pn, '写入 Remark1「'+g.remark1+'」 Remark2「'+c4Remark2(c)+'」', '生成 '+c4InvFile(c)+'（INV 表头 / INV 表体 / DN 表头 / DN 表体）']:[]},
    import:{n:'导入发票信息表', d:'IES+ 进口管理 → 发票信息 → 导入 → 导入INV&DN', okDesc:'发票 '+(inv?inv.no:'')+' 导入成功，无 Warning',
      subs:[c4InvFile(c)],
      ev:[{type:'screen', title:'IES+ 导入INV&DN', lines:['进口管理 → 发票信息 → 导入 → 导入INV&DN', '选择文件 '+c4InvFile(c)+' → 上传', '导入结果：成功 · 无 Warning · 发票 '+(inv?inv.no:'')]}],
      evFiles:[[c4InvFile(c),'18 KB']], ops:['IES+ 导入INV&DN 完成 · 发票 '+(inv?inv.no:'')]},
    alert:{n:'生成预报', d:'发票信息 → 生成预报 · 按 BRD 录入 16 项字段', okDesc:'预报已生成 · HAWB '+c.hawb,
      fieldFiles:[0,2], fieldTitle:'预报填写字段', referenceImages:c4Img([32,33]), ops:['生成预报 · MAWB 000 · HAWB '+c.hawb+' · Terminal WH 联邦库']},
    alertRemark:{n:'预报 Remark', d:'进口预报 → 批量修改 → Remark', okDesc:'预报 Remark「'+g.alert+'」', fieldFiles:[0], fieldTitle:'预报 Remark',
      ops:['预报 Remark「'+g.alert+'」']},
    pdf:{n:'存档 PDF', d:'进口预报详情 → 文档资料 → 上传 · 文档类别 HAWB', okDesc:'PDF 已上传至预报文档资料 · 类别 HAWB', subs:[c.att],
      ev:[{type:'screen', title:'IES+ 预报文档资料上传', lines:['进口管理 → 进口预报 → 修改 → 进口预报详情', '文档资料 → 上传 → 文档类别 HAWB', '选择文件 '+c.att+' → 保存']}],
      evFiles:[[c.att, c.attSize]], ops:['预报文档资料上传 '+c.att+'（文档类别 HAWB）']},
    oldDocs:{n:'纯旧货文件准备', d:'Warranty 表查最后一次出口 → T 盘抓出口报关单与盖章文件 → 旧机电声明 → SN 比对',
      okDesc:'出口单据已归集 · 旧机电声明已生成 · Serial number 比对一致', subs:c.export?[c4CdsFile(c), c4DeclFile(c)]:[],
      fieldFiles:[5,6,7,0], fieldTitle:'旧货单据与 SN 比对',
      ops:c.export?['Warranty 表 System No '+c.sn[0]+' → 最后一次出口运单 '+c.export.out, '抓取 '+c4CdsFile(c)+' 及 4 份盖章文件', '生成 '+c4DeclFile(c), 'Serial number 比对一致：'+c.export.invSerial]:[]},
    naming:{n:'命名存档', d:'PDF 以 HAWB 命名 · 文件夹按 SN_品名_新旧_HAWB 命名', okDesc:c.sn?'已归档至 '+c4Folder(c):'已按 BRD 规则命名存档',
      subs:c.sn?[pdf, c4InvFile(c)]:[], fieldFiles:[0,2], fieldTitle:'命名与存档', ops:c.sn?['PDF 重命名为 '+pdf, '存入文件夹 '+c4Folder(c)]:[]},
  };
  return c4NodeKeys(c).map(k=>({key:k, st:'ok', ...all[k]}));
}

/* 字段：stage = 节点下标；images = BRD 截图（字段定位示例） */
function c4Fields(c, K){
  const out = [];
  const Q = {OCR:['高',96], 邮件:['系统取值',100], 系统:['系统取值',100], 查表:['系统取值',100], 规则:['规则确定',100], 固定值:['规则确定',100], 计算:['规则确定',100]};
  const F = (key, k, v, src, doc, page, figs, extra)=>{
    const q = Q[src] || ['演示',100], hasImg = !!(figs && figs.length);
    out.push({stage:K[key], k, v:v==null||v===''?'（留空）':String(v), src, conf:q[1], quality:q[0],
      docIndex:doc==null?-1:doc, page:page||1, locator:doc!=null||hasImg,
      locatorReason:doc!=null||hasImg?'':src==='固定值'?'固定值，无原文坐标':'规则 / 计算得出，无原文坐标',
      images:hasImg?c4Img(figs):undefined, ...(extra||{})});
  };
  const low = {conf:0, quality:'低', low:true};
  const invMissing = c.block==='invoice';
  /* 捕捉邮件 */
  F('mail','邮件主题', C4_SUBJ+c.hawb, '邮件', 1, 1, [1]);
  F('mail','发件人（后缀校验）', 'FedEx-Beijing · @fedex.com（命中）', '邮件', 1, 1, [1]);
  F('mail','收件时间', c.mail, '邮件', 1, 1);
  F('mail','附件', c.att+' · '+c.attSize, '邮件', 1, 1, [1]);
  F('mail','标题 HAWB', c.hawb, '邮件', 1, 1, [1]);
  /* 发票齐备校验 */
  F('check','运单主页', 'PDF 第 1 页', 'OCR', 0, 1);
  F('check','运单附页', 'PDF 第 2 页', 'OCR', 0, 2);
  F('check','发票页', invMissing?'（未识别到 Invoice）':'PDF 第 3–5 页', 'OCR', 0, invMissing?2:3, null, invMissing?low:null);
  F('check','校验结论', invMissing?'不含 Invoice · 报错转人工，待上传原始 PDF 与发票 PDF':'含 Invoice · 进入 OCR 识别', '规则', null, 1, null, invMissing?low:null);
  if(invMissing) return out;
  const inv = c.inv, g = C4_GOODS[c.goods], master = c.master.replace(/\s/g,'');
  const hawbOk = c.invHawbs.includes(c.hawb) && master===c.hawb;
  const gross = c.colli.map(x=>c4Gross(x[0])), net = c.colli.map(x=>Number(c4Num(x[1])).toFixed(3));
  const dims = c.colli.map(x=>c4Dims(x[2]));
  const grossSum = c.colli.length>1 ? c4Sum(gross) : gross[0], netSum = c.colli.length>1 ? c4Sum(net) : net[0];
  const vol = dims.reduce((a,d)=>a + d[0]/100*d[1]/100*d[2]/100, 0);
  const volExpr = dims.length>1 && dims.every(d=>d.join()===dims[0].join())
    ? dims[0].map(x=>x/100).join('×')+'×'+dims.length : dims.map(d=>d.map(x=>x/100).join('×')).join(' + ');
  const price = c4Num(c.item.price), total = (Number(price)*c.item.qty).toFixed(2);
  /* OCR + HAWB 比对（梳理版已删除 2.4 / 2.5 DN 比对，DN 只取发票页用于填表） */
  F('ocr','2.1 Hawb（运单主页）', c.hawb, 'OCR', 0, 1, [2]);
  F('ocr','2.2 Master（运单附页 · 去除空格）', c.master+' → '+master, 'OCR', 0, 2, [3]);
  F('ocr','2.3 Hawb（发票页）', c.invHawbs.join(' / '), 'OCR', 0, 5, [4], hawbOk?null:low);
  F('ocr','HAWB 比对结果', hawbOk?'一致（2.1 = 2.3 · 2.2 = 2.3）':'不一致：发票页 '+c.invHawbs.join('、')+' ≠ '+c.hawb+' · 停止等确认', '规则', null, 1, null, hawbOk?null:low);
  F('ocr','2.5 DN（发票页 · Our delivery note number）', inv.dn, 'OCR', 0, 3, [6]);
  F('ocr','2.6 Invoice number', inv.no, 'OCR', 0, 3, [7]);
  F('ocr','2.6 Document date（YYYY-MM-DD）', inv.date+' → '+c4Date(inv.date), 'OCR', 0, 3, [7]);
  F('ocr','2.7 Value of goods', inv.goods+' EUR → '+c4Num(inv.goods), 'OCR', 0, 5, [8]);
  F('ocr','2.7 Transport costs', inv.freight+' EUR → '+c4Num(inv.freight), 'OCR', 0, 5, [8]);
  F('ocr','2.7 Overall value', inv.total+' EUR → '+c4Num(inv.total), 'OCR', 0, 5, [8]);
  F('ocr','2.7 币制', 'EUR', 'OCR', 0, 5, [8]);
  F('ocr','2.8 Gross weight（分箱 / 总和 · KG）', gross.join(' / ')+(c.colli.length>1?' · 合计 '+grossSum:''), 'OCR', 0, 5, [9]);
  F('ocr','2.8 Net weight（分箱 / 总和 · KG）', net.join(' / ')+(c.colli.length>1?' · 合计 '+netSum:''), 'OCR', 0, 5, [9]);
  F('ocr','2.8 Dimensions（cm）', c.colli.map(x=>x[2]).join(' ; ')+' → '+dims.map(d=>d.map(x=>x.toFixed(1)).join(' x ')).join(' ; '), 'OCR', 0, 5, [9]);
  F('ocr','2.16 Your reference', inv.ref, 'OCR', 0, 3, c.goods==='new'||c.goods==='loaner'?[23]:[22]);
  F('ocr','2.17 Incoterms', inv.incoterm+' → CPT', 'OCR', 0, 3, [24]);
  F('ocr','运单主页 Total Weight（C.W）', c.cw, 'OCR', 0, 1, [34]);
  F('ocr','运单主页 Total Pieces', c.pieces, 'OCR', 0, 1, [35]);
  /* 新旧货判定 */
  F('goods','2.9 Order type', c.orderType, 'OCR', 0, 4, [10]);
  F('goods','2.10 System number（SN · '+c.snPos+'）', c.sn.join('、'), 'OCR', 0, c.goods==='old'?3:4, c.goods==='old'?[11]:c.goods==='glc'?[13]:[12]);
  F('goods','2.16 Order No.', c4OrderNo(c)+(c.goods==='new'||c.goods==='loaner'?'（取「_」前数字）':'（取完整号码）'), 'OCR', 0, 3, c.goods==='new'||c.goods==='loaner'?[23]:[22]);
  F('goods','Loaner pool 查询（Order No. → 诊断仪大表 ID No.）', c.goods==='old'?'不适用 · 纯旧货按 SN 查 PN':c.loaner, '查表', c.goods==='old'?null:4, 1, c.goods==='old'?null:[45]);
  F('goods','判定结果', g.t, '规则', null);
  F('goods','Supplier name', g.supplier, '规则', null, 1, [10]);
  /* 填写发票信息表（含 PN 查表） */
  F('template','2.12 Article no', c.item.article, 'OCR', 0, 4, [15]);
  F('template','PN 查表', c.goods==='old' ? '追踪大表 · System No. '+c.sn[0]+' → '+c.pn : 'PN list · Item No '+c.item.article+(c.goods==='loaner'?'（Loaner Pool）':'')+' → '+c.pn,
    '查表', c.goods==='old'?4:3, 1, c.goods==='old'?[43]:[42]);
  F('template','2.13 Description EN', c.item.desc+(c.item.note&&c.goods==='old'?'（取 PAD 行）':''), 'OCR', 0, 4, c.goods==='old'?[17]:[16]);
  F('template','2.15 Country of Origin', c.item.coo+' → '+c4Coo(c.item.coo), 'OCR', 0, 4, c.goods==='old'?[21]:[19]);
  const T = (sheet, page, k, v, src, figs)=>F('template', sheet+' · '+k, v, src, 2, page, figs);
  T('INV表头',1,'Invoice No.', inv.no, 'OCR');
  T('INV表头',1,'Invoice type', 'EME', '固定值');
  T('INV表头',1,'Invoice date', c4Date(inv.date), 'OCR');
  T('INV表头',1,'PDC', 'BJ PDC', '固定值');
  T('INV表头',1,'Supplier name', g.supplier, '规则');
  T('INV表头',1,'Freight type', 'Air', '固定值');
  T('INV表头',1,'Incoterm', 'CPT', 'OCR');
  T('INV表头',1,'Goods value', c4Num(inv.goods), 'OCR');
  T('INV表头',1,'Currency', 'EUR', 'OCR');
  T('INV表头',1,'Freight charge', c4Num(inv.freight), 'OCR');
  T('INV表头',1,'Total Amount', c4Num(inv.total), 'OCR');
  T('INV表头',1,'Gross Weight（总和）', grossSum, '计算');
  T('INV表头',1,'Remark 1', g.remark1, '规则', [29]);
  T('INV表头',1,'Remark 2', c4Remark2(c), '规则', c.goods==='glc'?[31]:[30]);
  T('INV表体',2,'Item', c.item.no+(c.item.note&&c.goods!=='old'?'（合并行取第一行）':''), 'OCR', [14]);
  T('INV表体',2,'MBZ/DN No.', inv.dn, 'OCR');
  T('INV表体',2,'Invoice No', inv.no, 'OCR');
  T('INV表体',2,'Part Number', c.pn, '查表');
  T('INV表体',2,'Description EN', c.item.desc, 'OCR');
  T('INV表体',2,'Qty', c.item.qty, 'OCR', [18]);
  T('INV表体',2,'Item Net Weight (kg)', netSum, 'OCR');
  T('INV表体',2,'Unit Price', price, 'OCR', [18]);
  T('INV表体',2,'Total Price', total, '计算');
  T('INV表体',2,'Country of Origin', c4Coo(c.item.coo), '规则');
  T('INV表体',2,'Order No.', c4OrderNo(c), 'OCR');
  T('DN表头',3,'MBZ/DN No.', inv.dn, 'OCR');
  T('DN表头',3,'PID（SN）', c.sn.join('、'), 'OCR');
  T('DN表头',3,'Package Type', '纸箱', '固定值');
  T('DN表头',3,'Length / Width / Height（MM）', dims.map(d=>d.map(x=>Math.round(x*10)).join(' / ')).join(' ; '), '计算');
  T('DN表头',3,'N.W（KG)（分箱）', net.join(' / '), 'OCR');
  T('DN表头',3,'G.W（KG)（分箱）', gross.join(' / '), 'OCR');
  T('DN表体',4,'MBZ/DN No.', inv.dn, 'OCR');
  T('DN表体',4,'PID', c.sn.join('、'), 'OCR');
  T('DN表体',4,'Part Number', c.pn, '查表');
  T('DN表体',4,'Description EN', c.item.desc, 'OCR');
  T('DN表体',4,'Qty', c.item.qty, 'OCR');
  /* Remark1/2 */
  /* 生成预报（BRD 表 2） */
  F('alert','MAWB', '000', '固定值', null);
  F('alert','HAWB（2.1 运单主页）', c.hawb, 'OCR', 0, 1, [2]);
  F('alert','Airline/Carrier', 'Fedex', '固定值', null);
  F('alert','Flight No./Vessels NO.', 'Fedex', '固定值', null);
  F('alert','DG', 'N', '固定值', null);
  F('alert','C.W（Total Weight）', c.cw, 'OCR', 0, 1, [34]);
  F('alert','Terminal WH', '联邦库', '固定值', null);
  F('alert','Avis/Shipping Log NO.', '', '规则', null);
  F('alert','Package QTY（Total Pieces）', c.pieces, 'OCR', 0, 1, [35]);
  F('alert','G.W（Gross weight 总和）', grossSum, '计算', 2, 1);
  F('alert','VOL（Dimensions 乘积 · m³）', volExpr+' = '+vol.toFixed(4), '计算', null, 1, [36]);
  F('alert','Freight Charge', '', '规则', null);
  F('alert','Freight Currency', '', '规则', null);
  F('alert','Direct flight', 'N', '固定值', null);
  F('alert','Arrival Port', '首都国际机场', '固定值', null);
  F('alert','Departure Port', '德国', '固定值', null);
  /* 预报 Remark */
  F('alertRemark','Remark', g.alert, '规则', null, 1, [37]);
  /* 旧货分支 */
  if(c.goods==='old'){
    const snOk = c.export.invSerial===c.export.cdsSerial;
    F('oldDocs','Warranty 表 · System No', c.sn[0], '查表', 5, 1, [52]);
    F('oldDocs','P 列 DHL/SF No.（Out）', c.export.cands, '查表', 5, 1, [52]);
    F('oldDocs','最后一次出口运单', c.export.out, '规则', 5, 1);
    F('oldDocs','原出口报关单', c4CdsFile(c)+'（'+C4_EXPORT_DIR+'）', '查表', 6, 1, [39]);
    F('oldDocs','出口盖章文件', '4 份：return label / 维修 letter / 给海关的情况说明 / 原进口报关单', '查表', null, 1, [40,41]);
    F('oldDocs','旧机电声明 · 发票号', inv.no, '系统', 7, 1, [51]);
    F('oldDocs','旧机电声明 · 提/运单号', c.hawb, '系统', 7, 1, [51]);
    F('oldDocs','旧机电声明 · SN（Serial number）', c.export.invSerial, '系统', 7, 1, [51]);
    F('oldDocs','旧机电声明 · 货值', c4Num(inv.goods)+' EUR', '系统', 7, 1, [51]);
    F('oldDocs','旧机电声明 · 日期', c4RunStart(c.mail).slice(0,10), '规则', 7, 1);
    F('oldDocs','2.19 Serial number（发票）', c.export.invSerial, 'OCR', 0, 4, [25], snOk?null:low);
    F('oldDocs','2.19 Serial number（原出口报关单）', c.export.cdsSerial, 'OCR', 6, 1, [26], snOk?null:low);
    F('oldDocs','SN 比对结果', snOk?'一致':'不一致 · 转人工核实', '规则', null, 1, null, snOk?null:low);
  }
  /* 命名存档 */
  F('naming','PDF 命名（2.1 HAWB）', c.hawb+'.pdf', '规则', 0, 1);
  F('naming','文件夹命名', c4Folder(c), '规则', null);
  F('naming','存档内容', 'PDF + 发票信息表'+(c.goods==='old'?' + 出口报关单 + 4 份盖章文件 + 旧机电声明':''), '规则', 2, 1);
  return out;
}

/* 未完成形态：停在某个节点（执行中 / 待人工处理），其后节点剪枝 */
function c4StopKey(c){
  if(c.status==='running') return 'ocr';
  return {invoice:'check', hawb:'ocr', sn:'oldDocs'}[c.block] || null;
}
const C4_REVIEW = {
  invoice:{d:'PDF 中未识别到 Invoice 页，待人工补传',
    err:'附件 PDF 中不包含 Invoice：报错转人工。请在本节点上传原始 PDF 与发票 PDF，流程在下次 Portal 运行时继续。'},
  hawb:{d:'HAWB 比对不一致，停止等确认',
    err:'发票页 Hawb 与运单主页 Hawb、运单附页 Master 不一致，流程已停止。识别错误：修正字段后从此节点重跑；单据不是同一套：在本节点上传正确的原始 PDF 与发票 PDF，下一运行批次继续。'},
  sn:{d:'Serial number 比对不一致，转人工核实',
    err:'旧货发票上的 Serial number 与原出口报关单不一致：需人工核实后修正字段，再从此节点重跑。'},
};
function c4Build(c){
  const nodes = c4Nodes(c), K = {};
  nodes.forEach((n,i)=>{ K[n.key] = i; });
  const fields = c4Fields(c, K), files = c4Files(c);
  const stopKey = c4StopKey(c), stop = stopKey ? K[stopKey] : -1;
  if(stop>=0){
    nodes.forEach((node,i)=>{
      if(i<stop) return;
      if(i===stop){
        if(c.status==='running'){ node.st='run'; node.d='OCR 识别与 HAWB 比对执行中…'; }
        else { node.st='review'; node.d=C4_REVIEW[c.block].d; node.err=C4_REVIEW[c.block].err; }
        delete node.ops;
        return;
      }
      node.st='queued'; node.d='等待前序节点完成'; delete node.ev; delete node.evFiles; delete node.ops;
    });
  }
  const keep = f=>stop<0 || f.stage<stop || (f.stage===stop && c.status==='manual');
  return {nodes, fields:fields.filter(keep), allFields:fields, files, stop};
}

/* 任务操作日志：按节点逐条写入 BRD 各步动作 */
function c4NodeOps(t, run, i){
  const n = run && run.nodes && run.nodes[i];
  if(!n) return [];
  const p = 'R#'+run.no+' · '+n.n+' · ';
  if(n.st==='review') return [p+'待人工处理：'+n.d];
  if(n.st==='run') return [p+'执行中'];
  if(n.st!=='ok') return [];
  return (n.ops && n.ops.length ? n.ops : [n.okDesc||n.d]).map(x=>p+x);
}
/* 演示任务初始日志：自执行开始按分钟递增，最新在前 */
function c4SeedOps(t, run){
  const [d,hm] = run.start.split(' '), base = new Date(d+'T'+hm+':00');
  const tm = k=>{const x=new Date(base.getTime()+k*60000),q=v=>String(v).padStart(2,'0');return x.getFullYear()+'-'+q(x.getMonth()+1)+'-'+q(x.getDate())+' '+q(x.getHours())+':'+q(x.getMinutes());};
  const txts = ['创建任务 · 邮件触发（规则 R-C4-FEDEX · 发件人后缀 @fedex.com · 标题含「提单自报催办通知」）', '生成执行 R#1：'+run.cause,
    ...run.nodes.flatMap((_,i)=>c4NodeOps(t, run, i))];
  return txts.map((txt,k)=>({tm:tm(k), txt})).reverse();
}
function ensureCase4Tasks(){
  let changed = false;
  C4_SAMPLES.forEach(c=>{
    const id = 'T-'+c.hawb;
    if(State.task(id)) return;
    const b = c4Build(c);
    const st = {completed:'SUCCEEDED', running:'RUNNING', manual:'DIFF_PENDING'}[c.status];
    const start = c4RunStart(c.mail);
    const g = C4_GOODS[c.goods];
    const summary = c.status==='completed' ? '发票已导入 IES+ · 预报已生成 · PDF 已存档（'+g.t+'）'
      : c.status==='running' ? 'OCR 识别与 HAWB 比对执行中' : C4_REVIEW[c.block].d;
    const t = {
      id, uc:'UC34', caseId:'case-4', case:C4_CASE, mode:'xentry', waybill:c.hawb, date:c.mail.slice(0,10), demoWorkbench:true,
      src:'邮件触发', rule:'R-C4-FEDEX', need:['invoice','hawb'].includes(c.block)?'invoice':undefined, ops:[],
      runs:[{
        no:1, cause:'初次执行 · Fedex 预报邮件触发（'+start.slice(11)+' 批次）', st, start,
        dur:st==='SUCCEEDED'?c.dur:st==='RUNNING'?'进行中':'待人工处理',
        nodes:b.nodes, fields:b.fields, files:b.files, summary:c.hawb+' · '+summary,
      }],
      fillFields:b.allFields, fillFiles:b.files, fillSummary:'该票发票导入、预报生成与 PDF 存档已完成（模拟）。',
    };
    State.tasks.push(t);
    t.ops = c4SeedOps(t, t.runs[0]);
    changed = true;
  });
  if(changed) State.save();
}

/* ==================== Share Point 目录树 ====================
 * 一级目录：操作日期（YYYYMMDD，取该票最新一次执行的日期）；
 * 二级目录：BRD §6.2，每个 PDF（以 HAWB 命名）及其发票信息表存于一个文件夹，命名 SN_品名_新旧_HAWB，
 *   如 SN 532418_pad 2_Old_448886329033 / SN 555435-555436_kit5_new_448886353380 /
 *      SN 545459_pad 2 power supply_old (new)_447033454333 / SN 804652-804653_kit 5_loaner pool_524241835996；
 *   旧货文件夹另存原出口报关单 + 盖章文件 ×4 + 旧机电声明（BRD §5）。
 * 按任务实时状态生成：未走到「命名存档」的票，附件 PDF 以原名暂存在当天目录，重跑成功后即生成二级文件夹。 */
/* 存档公盘页（sharepoint.html）站点信息 */
const SP_SITE = {name:'MBPTS 流程存档', sub:'UC34 · Case 4 X-entry 发票与预报创建 · 专用组', logo:'MB'};
const SP_TYPE = {xlsx:'Microsoft Excel 工作表', pdf:'Adobe Acrobat 文档', docx:'Microsoft Word 文档'};
function spFile(name, time, size){
  const ext = /\.xlsx?$/i.test(name) ? 'xlsx' : /\.docx?$/i.test(name) ? 'docx' : 'pdf';
  return {kind:'file', name, time, type:SP_TYPE[ext], size};
}
function spFolder(name, children){ return {kind:'folder', name, children:children||[]}; }
/* 在 parent 下按名称找到或新建一层子目录 */
function spDir(parent, name){
  let d = parent.children.find(x=>x.kind==='folder' && x.name===name);
  if(!d){ d = spFolder(name); parent.children.push(d); }
  return d;
}
/* 操作时间：取该票最新一次执行的开始时间；重跑的 start 为「MM-DD HH:mm」，补当前年份 */
function c4OpTime(c){
  const t = State.task('T-'+c.hawb), run = t && latestRun(t), s = run ? run.start : '';
  if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s;
  if(/^\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return new Date().getFullYear()+'-'+s;
  return c4RunStart(c.mail);
}
function buildSharePointTree(){
  const root = spFolder('Share Point');
  C4_SAMPLES.forEach(c=>{
    const task = State.task('T-'+c.hawb), t = c4OpTime(c);
    const done = task ? taskStatus(task)==='SUCCEEDED' : c.status==='completed';
    const day = spDir(root, t.slice(0,10).replace(/-/g,''));
    if(!done || !c.sn){ day.children.push(spFile(c.att, t, c.attSize)); return; }
    const dir = spDir(day, c4Folder(c));
    dir.children.push(spFile(c.hawb+'.pdf', t, c.attSize), spFile(c4InvFile(c), t, '18 KB'));
    if(c.goods==='old') dir.children.push(spFile(c4CdsFile(c), t, '312 KB'), ...C4_STAMPED.map(n=>spFile(n, t, '180 KB')), spFile(c4DeclFile(c), t, '36 KB'));
  });
  spStampTimes(root);
  spSort(root);
  return root;
}
/* 文件夹的「修改日期」取其内容中最新的时间（与 Windows 资源管理器一致） */
function spStampTimes(node){
  if(node.kind==='file') return node.time || '';
  const t = (node.children||[]).map(spStampTimes).reduce((m,x)=>x>m?x:m, '');
  node.time = t;
  return t;
}
/* 排序：目录在前、文件在后；同类按修改日期倒序（最新的在最前），同日期再按名称 */
function spCmp(a, b){
  if(a.kind !== b.kind) return a.kind==='folder' ? -1 : 1;
  if((a.time||'') !== (b.time||'')) return (a.time||'') < (b.time||'') ? 1 : -1;
  return a.name.localeCompare(b.name, 'zh');
}
function spSort(node){
  if(node.kind!=='folder') return;
  (node.children||[]).sort(spCmp);
  (node.children||[]).forEach(spSort);
}
function homeTaskRecords(){
  return C4_SAMPLES.map(c=>{
    const sample = {waybill:c.hawb, mode:'xentry', date:c.mail.slice(0,10), status:c.status};
    const t = State.task('T-'+c.hawb);
    if(!t) return sample;
    const st = taskStatus(t);
    return {...sample, status:st==='SUCCEEDED'?'completed':['RUNNING','DISPATCHED'].includes(st)?'running':'manual'};
  });
}

/* ===== 全权限版：注册 Case4 ===== */
function c4DemoTask(){
  const c = c4Sample('524241899574'), b = c4Build(c);
  return {case:C4_CASE, waybill:c.hawb, nodes:b.nodes, fields:b.fields, files:b.files, dur:'已完成', fillFields:b.allFields, fillFiles:b.files};
}
/* BRD：附件 PDF 不含 Invoice 时报错转人工，Portal 留存上传原始 PDF 与发票 PDF 的入口，下次 Portal 运行时继续；
 * HAWB 比对不一致（单据不是同一套）同样补传。发票信息表由 RPA 导入 IES+，未要求在 Portal 上传修正版。 */
const C4_PDF_UPLOAD = {file:t=>(C4_SAMPLES.find(c=>c.hawb===t.waybill)||{}).att||t.waybill+'.pdf', dl:'下载', upLabel:'上传', accept:'.pdf', count:2,
  countHint:'原始 PDF（运单主页 + 运单附页）与发票 PDF 各 1 份', reviewOnly:true, upload:true,
  after:'下一运行批次（12:00 / 20:00）继续，也可点「↻ 重跑」立即执行'};
registerCase('case-4', {
  label:'Case4 · X-entry 发票与预报',
  seed:{rules:SEED.rules, notify:SEED.notify, cfgItems:SEED.cfgItems},
  meta:CASE_META,
  ensure:ensureCase4Tasks,
  spTree:buildSharePointTree,
  waybillLabel:()=>'HAWB No.',
  rerun:'node',
  rerunText:()=>({lead:'Case 4 X-entry 预报邮件与 PDF 附件已保存至 Portal Share Point；整单重跑将从原始 PDF 重新识别并校验。',
    tip:'原始邮件与 PDF 附件已保存至 Portal Share Point'}),
  nodeFiles:{'*':{
    '发票齐备校验':{...C4_PDF_UPLOAD, requireUpload:true},
    'OCR识别 + HAWB 比对':C4_PDF_UPLOAD,
    '填写发票信息表':{file:t=>c4InvFile({hawb:t.waybill})},
    /* 纯旧货：按旧机电产品进口声明模板填写，可下载填好的声明 */
    '纯旧货文件准备':{file:t=>c4DeclFile({hawb:t.waybill})},
  }},
  hooks:{nodeOps:c4NodeOps},
  demoTask:c4DemoTask,
  /* 任务中心查询：单号暂按 HAWB No.（业务未沟通）；BRD 无库房 */
  numLabel:()=>'HAWB No.', numKeys:t=>[t.waybill],
});
})();
