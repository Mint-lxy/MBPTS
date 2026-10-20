/* ===== cases/case3.js · 全权限版 Case3 数据模块 =====
 * 内容取自 case3页面demo/assets/js/data.js，包在独立作用域里避免与其他 Case 重名；
 * 状态（State）与持久化由 data.js 统一提供，种子合并与任务生成由 boot.js 调用 registerCase 注册的方法。 */
(function(){
/* ===== data.js · Case3 任务演示 / 其他页面旧样例 + localStorage 持久化 ===== */
const SEED = {};
/* Case5 演示任务：MBPLAP 以一个分单号（HAWB/BL No.）为单位，X-entry 以一个运单号（AWB No.）为单位。
 * 单号均取自 BRD 附件：PKLA01579315（Case5 附件1/2）、PKLA01458373（Case3 BRD 预报邮件）、
 * 524241793610（进口发票 PDF + 诊断仪大表）、447033509090 / 447033508863 / 447033505062（报关代理邮件 AF POD）。
 * X-entry 待人工处理两类：447033508863 MBPTS PO 为空（录入 ID No.）；447033505062 系统库查不到进口发票（补传发票）。
 * MBPLAP 不设待人工处理样例：BRD 未定义 MBPLAP 的异常场景。 */
const HOME_TASKS = [
  {waybill:'PKLA01579315',mode:'mbplap',date:'2026-08-20',status:'completed'},
  {waybill:'PKLA01458373',mode:'mbplap',date:'2026-08-27',status:'running'},
  {waybill:'524241793610',mode:'xentry',date:'2026-06-02',status:'completed'},
  {waybill:'447033509090',mode:'xentry',date:'2026-04-07',status:'running'},
  {waybill:'447033508863',mode:'xentry',date:'2026-04-07',status:'manual'},
  {waybill:'447033505062',mode:'xentry',date:'2026-04-07',status:'manual'},
];
/* 运行周：文件夹层级与节点证据共用同一口径，避免两处对不上 */
function isoWeek(day){
  const d = new Date(day+'T00:00:00'), t = new Date(d.valueOf());
  t.setDate(t.getDate() + 3 - ((d.getDay()+6)%7));          // 移到本周四
  const w1 = new Date(t.getFullYear(), 0, 4);
  const n = 1 + Math.round(((t - w1)/86400000 - 3 + ((w1.getDay()+6)%7))/7);
  return t.getFullYear()+'-W'+String(n).padStart(2,'0');
}
function spDay(wb){ const t = HOME_TASKS.find(x=>x.waybill===wb); return t ? t.date : '2026-09-14'; }
function runWeek(wb){ return isoWeek(spDay(wb)); }
const HOME_MAILS = [];

/* ==================== Case 5 任务数据 ==================== */
SEED.tasks = [];

/* ===== 节点级证据截图 ===== */
(function applyNodeEvidence(){
  /* SEED.tasks 为空，证据由 ensureWorkbenchTasks 动态生成 */
})();

/* ==================== Case 3 邮件监听与通知模板演示数据 ==================== */
/* BRD 触发条件：发件人后缀 @tvsscs.com 且主题包含 MBPLAP Pre-alert；NPM 邮箱未指定，使用保留域名演示。 */
SEED.rules = [
  {id:'R-C3-PREALERT', name:'MBPLAP 预报邮件监控', line:'case3-mbplap',
   mail:'npm-demo@example.invalid', prio:1, flow:'case-3-mbplap', on:true, hits:2,
   crit:{from:'*@tvsscs.com', to:'npm-demo@example.invalid', subj:'MBPLAP Pre-alert', body:'', attMin:2, attMax:20},
   atts:[
     {role:'invoice', type:'PDF', req:true, multi:true, re:'^.*1100[0-9]+.*[.]pdf$'},
     {role:'hawb', type:'PDF/图片', req:true, multi:false, re:'^.*HAWB.*[.](pdf|png|jpg|jpeg)$'},
     {role:'msds', type:'PDF', req:false, multi:false, re:'^.*SDS.*[.]pdf$'},
     {role:'shipper_decl', type:'PDF', req:false, multi:false, re:'^.*shipper.*[.]pdf$'},
   ]},
];
SEED.ioRecipients = [];
/* BRD 附件3_运行结果：运行记录表头（邮件通知表格与年度运行记录共用） */
const CASE3_RUN_RECORD_COLS = ['Pre-alert receive date','PDC','HAWB NO.','Invoice NO.',
  'Invoice data creation result(Done/warning text content)',
  'Pre-alert data creation result difference (Y/N)','Invoice hardcopy upload(Y/N)',
  'HAWB hardcopy upload(Y/N)','MSDS upload(Y/N/不涉及)',
  'Shippers_Decl upload(Y/N/不涉及)','Process date'];
SEED.mailTemplates = [{
  id:'TPL-C3-STATUS', caseId:'case-3', name:'MBPLAP 预报创建状态通知', scene:'Case 3 · MBPLAP 发票与预报创建',
  subject:'Re: {原预报邮件主题}',
  body:'Dears，\nKindly pls refer to the MBPLAP pre-alert creation status. Thanks~',
  variables:[...CASE3_RUN_RECORD_COLS],
  params:mailTplParams([['mail_subject','原预报邮件主题（回复时用）'], tagParam('HAWB No.')]),
  recipients:[],
}];
SEED.evidence = { trigger:[], process:[], operation:[] };
/* 站内提醒：两票 Case3 演示任务的规则待核对事项，点击进入任务详情 */
SEED.notify = [
  {t:'待人工处理 · Customer NO. 找不到对应 PDC', x:'T-PKLA01469051 · 已停在填写发票导入模板，请下载模板调整后上传',
   tm:'08-30 10:00', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-PKLA01469051'},
  {t:'待人工处理 · MBZ/DN No. 与 PID 多对一', x:'T-PKLA01472638 · 已提取完数据并停止，请下载 INV&DN 模板调整后上传',
   tm:'08-31 10:00', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-PKLA01472638'},
];
SEED.audit = [];
SEED.thresholds = {};
SEED.dimTables = [];
/* 配置中心 · Case3 发票导入模板（列结构取自 BRD 附件2「导入INV＆DN.xlsx」四个 sheet） */
const CASE3_IMPORT_SHEETS = [
  {sheet:'INV 表头', cols:['SH Tracking No.','Invoice No.','Invoice type','Invoice date','PDC','Supplier name','Customer account No.','Freight type','Incoterm','Goods value','Currency','Packing fee','Charge to airport','Insurance','Freight charge','DGR fee','Others','Total Amount','Urgent Invoice','BOL','Gross Weight','Volume','Remark 1','Remark 2']},
  {sheet:'INV 表体', cols:['Item','MBZ/DN No.','Invoice No','Part Number','Description EN','Qty','Item Net Weight (kg)','Unit Price','Total Price','Country of Origin','Discount group','Dealer Code','Order No.','Order Line']},
  {sheet:'DN 表头', cols:['Container No.','MBZ/DN No.','PID','Package Type','Length(MM)','Width(MM)','Height(MM)','N.W（KG)','G.W（KG)']},
  {sheet:'DN 表体', cols:['MBZ/DN No.','PID','Part Number','Description EN','Qty']},
];
SEED.cfgItems = [
  {id:'cfg-case3-inv-dn', line:'case3-mbplap', name:'发票导入模板', file:'导入INV＆DN.xlsx', accept:'.xlsx',
   desc:'4 个 sheet · INV 表头 24 列 / INV 表体 14 列 / DN 表头 9 列 / DN 表体 5 列 · 填写后导入 IES+ 创建发票',
   sheets:CASE3_IMPORT_SHEETS, cols:CASE3_IMPORT_SHEETS.flatMap(s=>s.cols), ver:1, time:'2026-09-27'},
];
/* 共享盘监听：Case3 由邮件监听触发，不从共享盘抓取文件，字段留空并置灰；平台能力保留。 */
SEED.sharepoint = {dir:'', table:'', poll:''};
SEED.pool = [];
SEED.mails = [   /* 演示：两封命中预报邮件，一封发件人不符，一封主题不符 */
  {id:'M-C3-001', from:'forwarder-demo@tvsscs.com', to:['npm-demo@example.invalid'], subj:'20260827 MBPLAP Pre-alert 61847739952 PKLA01458373 DG', att:4},
  {id:'M-C3-002', from:'forwarder-demo@tvsscs.com', to:['npm-demo@example.invalid'], subj:'MBPLAP Pre-alert PKLA01461207', att:2},
  {id:'M-C3-003', from:'outside@example.invalid', to:['npm-demo@example.invalid'], subj:'MBPLAP Pre-alert TEST', att:2},
  {id:'M-C3-004', from:'forwarder-demo@tvsscs.com', to:['npm-demo@example.invalid'], subj:'普通运输通知', att:2},
];
SEED.templates = [];
SEED.dbviews = [];
/* X-entry · IMS PO 邮件 SPM 截屏行（收货记录功能的数据基础，展示位置待确认） */
SEED.poLines = [
  {po:'5600321645', item:'100', pn:'QALCNSD26KIT501', qty:99, mail:'Xentry Replenishment Notice 260407'},
  {po:'5600321645', item:'200', pn:'QALCNSD26KIT501', qty:99, mail:'Xentry Replenishment Notice 260407'},
  {po:'5600321645', item:'300', pn:'QALCNSD26KIT501', qty:99, mail:'Xentry Replenishment Notice 260407'},
  {po:'5600321645', item:'400', pn:'QALCNSD26KIT501', qty:88, mail:'Xentry Replenishment Notice 260407'},
  {po:'5600321645', item:'500', pn:'QALCNSD26KIT5S1', qty:30, mail:'Xentry Replenishment Notice 260407'},
  {po:'5600338128', item:'100', pn:'QALCNSD26KIT5P1', qty:14, mail:'Dummy PO Creation Notice 260803'},
  {po:'5600338128', item:'200', pn:'QALCNSD26RDS2P1', qty:6,  mail:'Dummy PO Creation Notice 260803'},
  {po:'5600338128', item:'300', pn:'QALCNSD26KIT5S1', qty:20, mail:'Dummy PO Creation Notice 260803'},
];
/* X-entry 收货记录：RPA（来自已完成任务的 DSS 行）+ 手工（PO 号、Part No、线下已收货数量；98 为演示值） */
SEED.receipts = [
  {id:'GR-M-0001', src:'manual', by:'erxiao', po:'5600321645', item:'', pn:'QALCNSD26KIT501', qty:98, time:'2026-05-29 15:20'},
  {id:'GR-R-0001', src:'rpa', task:'T-524241793610', awb:'524241793610', asn:'51303888', po:'5600321645', item:'100', pn:'QALCNSD26KIT501', qty:1, time:'2026-06-02 14:00'},
  {id:'GR-R-0002', src:'rpa', task:'T-524241793610', awb:'524241793610', asn:'51303888', po:'5600321645', item:'200', pn:'QALCNSD26KIT501', qty:1, time:'2026-06-02 14:00'},
];

/* ===== 状态持久化 ===== */
/* Case3 使用独立缓存 key，不加载 Case5 任务中心的历史演示数据 */
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }


/* ===== 领域辅助 ===== */
function latestRun(t){ return t.runs.length ? t.runs[t.runs.length-1] : null; }
function runByNo(t, no){ return t.runs.find(r=>r.no===no) || null; }
function taskStatus(t){
  if(t.waitState) return 'WAIT_INPUT';
  const r = latestRun(t);
  return r ? r.st : 'CREATED';
}

const CASE_META = {
  'MBPLAP 发票和预报创建': {rule:'—', trigger:'邮件触发', perDay:0, total:0, avgDur:'—'},
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

/* ==================== Case 5 · MBPLAP_DSS上传模板 业务样例 ====================
 * 取值依据：Case5 BRD【MBPTS-UC34】Case 5_ASN自动创建_0927.md §二 及附件：
 *   附件1 进口预报.xlsx、附件2 parts.xlsx（A Invoice No. / H Part No. / M Invoice date / Z Order No / AE QTY）、
 *   DSS 导入模板（9 列）、fig-02 IES+ 进口预报查询、fig-04 IES+ 发票信息导出。
 * 3 节点：从IES导出预报清单 → 从IES导出发票信息 → 填入DSS导入模板。
 * 节点附件只列取数所用文件（文件名、类型取自 BRD），右侧预览区沿用平台原有容器。
 */
const MBPLAP_VENDOR = '191110510';
const XENTRY_VENDOR = '191110260';
const IES_PREALERT = '进口预报.xlsx';
const IES_PARTS = 'parts.xlsx';
function plusDay(day, n){
  const d = new Date(day+'T00:00:00'); d.setDate(d.getDate()+(n||1));
  const p = x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
/* 每票业务标识。inv 为空表示样例停在「从IES导出发票信息」（BRD 附件未提供该票发票行） */
const MBPLAP_CASES = {
  'PKLA01579315':{run:'12:00', created:'2026-08-20', mawb:'61855989684', pdc:'BJ PDC',
    inv:{no:'1100035825', pn:'A2600107201', date:'2026-08-20', order:'', qty:1}},
  'PKLA01458373':{run:'17:00', created:'2026-08-27', mawb:'61847739952', pdc:'', inv:null},
};
function mbplapCase(wb){ return MBPLAP_CASES[wb] || MBPLAP_CASES['PKLA01579315']; }
/* 命名：提单号_发票号（0920 / 0922）；0927 写作「PN_日期」，待 BU 确认 */
function mbplapDssName(c, wb){ return wb+'_'+c.inv.no+'.xlsx'; }
function mbplapNodes(c, wb){
  const inv = c.inv;
  return [
    {n:'从IES导出预报清单', st:'ok',
     d:'定时 '+c.run+' · IES+ 进口预报 · Supplier MBPLAP · Pre-alert creation '+c.created,
     okDesc:'预报清单已批量导出 · 分单号 '+wb,
     subs:[IES_PREALERT],
     evFiles:[[IES_PREALERT,'16 KB']]},

    {n:'从IES导出发票信息', st:'ok',
     d:'IES+ 发票信息 · HAWB/BL NO. '+wb+' · 按照PN级别模板全部导出',
     okDesc:'发票信息已导出'+(inv?' · 发票 '+inv.no:''),
     subs:[IES_PARTS],
     evFiles:inv?[[IES_PARTS,'16 KB']]:[]},

    {n:'填入DSS导入模板', st:'ok',
     d:'DSS 导入模板 · 9 个必填字段 · 在 Portal 上可供下载',
     okDesc:'DSS 导入模板已生成 · 可在 Portal 下载',
     subs:inv?[mbplapDssName(c, wb)]:[],
     evFiles:inv?[[IES_PARTS,'16 KB'],[mbplapDssName(c, wb),'9 KB']]:[]},
  ];
}
/* 未完成形态：停在「从IES导出发票信息」执行中，其后节点剪枝 */
function mbplapPrunedNodes(c, wb, st){
  return mbplapNodes(c, wb).map((node,i)=>{
    if(i===0) return node;
    if(i===1){ node.st='run'; node.d='按 HAWB/BL NO. 查询并导出发票信息执行中…'; delete node.evFiles; return node; }
    node.st='queued'; node.d='等待前序节点完成';
    delete node.evFiles;
    return node;
  });
}
/* 解析节点（从IES导出发票信息）字段：docIndex 0 = parts.xlsx（发票导出清单），1 = 进口预报.xlsx */
function mbplapFields(c, wb){
  const inv = c.inv;
  return [
    {k:'ASN Number（A 列 Invoice No.）',v:inv.no,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Vendor BP Number',v:MBPLAP_VENDOR,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'默认值 191110510，无原文坐标'},
    {k:'Delivery date（M 列 Invoice date）',v:inv.date,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM Part Number（H 列 Part No.）',v:inv.pn,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Quantity（AE 列 QTY · 同发票号 / Order No. / Part No. 合并加总）',v:String(inv.qty),src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Unit',v:'PC',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'默认值 PC，无原文坐标'},
    {k:'SPM PO Number（Z 列 Order No）',v:inv.order||'（空）',src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM PO Item Number',v:'（置空）',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'发票导出信息中无 SPM PO item number，按 BRD 置空'},
    {k:'ETA date（Pre-alert creation + 1）',v:plusDay(c.created,1),src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'Pre-alert creation date '+c.created+' + 1 calendar day'},
    {k:'HAWB/BL NO.（C 列）',v:wb,src:'系统',conf:100,quality:'系统取值',docIndex:1,page:1,locator:true},
  ];
}
function mbplapFiles(){ return [{name:IES_PARTS,pages:1},{name:IES_PREALERT,pages:1}]; }

/* ==================== Case 5 · X-entry_DSS上传模板 业务样例 ====================
 * 取值依据：0927 §三 及附件：报关代理邮件「快件签收单4.7专车运输」+ 附件 AF POD；
 *   诊断仪大表「! Star D orders_new_Since Aug. 8 handled by IE.xlsx」（D Part NO. / F Qty / J ID No. / M MBPTS PO / N AWB No.）；
 *   IMS 邮件「Xentry Replenishment Notice 260407」SPM 截图（PO 5600321645）；进口发票 524241793610.pdf。
 * 524241793610 的报关代理邮件未随 BRD 提供：按 BRD 样例格式模拟，日期取诊断仪大表该 AWB 到库日期 2026-06-02。
 * 3 节点：捕捉报关代理邮件 → 捕捉PO邮件 → 填入DSS导入模板。
 */
const DIAG_TABLE = '! Star D orders_new_Since Aug. 8 handled by IE.xlsx';
const FULLCOME_MAILS = {
  '2026-04-07':{subj:'快件签收单4.7专车运输', att:'快件签收单2026年4月7日_dan.xlsx', time:'13:54'},
  '2026-06-02':{subj:'快件签收单6.2专车运输', att:'快件签收单2026年6月2日_dan.xlsx', time:'14:00'},
};
const XENTRY_CASES = {
  '524241793610':{mailDay:'2026-06-02', pn:'QALCNSD26KIT501', rows:[1,1], id:'32883', po:'5600321645',
    ims:'Xentry Replenishment Notice 260407',
    invoice:{file:'524241793610.pdf', pages:5, dn:'51303888', shipDate:'2026-05-26'},
    alloc:[{item:'100', qty:1},{item:'200', qty:1}]},
  '447033509090':{mailDay:'2026-04-07', pn:'QALCNSD26KIT501', rows:[1,1], id:'32883', po:'5600321645'},
  '447033508863':{mailDay:'2026-04-07', pn:'QALCNSD26KIT501', rows:[1,1], id:'32882', po:'', block:'idno'},
  /* 大表 N 列 447033505062 → J 列 ID No. 32880 → 顶部 M 列 PO 5600321645；BRD 附件未提供该票进口发票 */
  '447033505062':{mailDay:'2026-04-07', pn:'QALCNSD26KIT501', rows:[1,1], id:'32880', po:'5600321645',
    ims:'Xentry Replenishment Notice 260407', block:'invoice'},
};
function xentryCase(wb){ return XENTRY_CASES[wb] || XENTRY_CASES['524241793610']; }
function fullcomeMail(c){ return FULLCOME_MAILS[c.mailDay]; }
/* 命名：X-entry 0927 版未给出，沿用 0920 / 0922「PN_日期」，待 BU 确认 */
function xentryDssName(c){ return c.pn+'_'+c.mailDay.replace(/-/g,'')+'.xlsx'; }
/* 收货记录（BRD §3.2.3）：每个 PO 已收 / 剩余 + 自动收货（RPA）与手工收货（录入人）合并记录，
 * 取自 SEED.poLines / SEED.receipts；「本票前」口径，用于说明本票顺次收货的 Item 分配。 */
function receiptEv(c, wb){
  const recs = SEED.receipts.filter(r=>r.po===c.po && r.task!=='T-'+wb);
  const lines = SEED.poLines.filter(l=>l.po===c.po).map(l=>({...l, got:0}));
  recs.filter(r=>r.src==='rpa').forEach(r=>{ const l=lines.find(x=>x.item===r.item); if(l) l.got+=r.qty; });
  recs.filter(r=>r.src==='manual').forEach(r=>{ let left=r.qty; lines.filter(l=>l.pn===r.pn).forEach(l=>{ const take=Math.max(0,Math.min(left,l.qty-l.got)); l.got+=take; left-=take; }); });
  return {type:'table', title:'收货记录 · PO '+c.po, lines:
    lines.map(l=>'Item '+l.item+' · '+l.pn+' · 订购 '+l.qty+' · 已收 '+l.got+' · 剩余 '+(l.qty-l.got))
    .concat(recs.map(r=>r.time+' · '+(r.src==='rpa'?'RPA':'手工 · '+r.by)+' · '+r.pn+(r.item?' · Item '+r.item:'')+' · '+r.qty))
    .concat(['本票顺次收货：'+c.alloc.map(a=>'Item '+a.item+' ×'+a.qty).join(' · ')])};
}
function xentryNodes(c, wb){
  const m = fullcomeMail(c), inv = c.invoice;
  return [
    {n:'捕捉报关代理邮件', st:'ok',
     d:'邮件触发 · Portal 公邮 · '+m.subj,
     okDesc:'AWB '+wb+' 命中诊断仪大表 · PN / QTY / ID No. 已获取',
     subs:[m.subj+'.msg', m.att],
     evFiles:[[m.subj+'.msg','101 KB'],[m.att,'19 KB'],[DIAG_TABLE,'7.2 MB']]},

    {n:'捕捉PO邮件', st:'ok',
     d:'ID No. '+c.id+' → MBPTS PO · 按 PO 号检索 IMS PO 邮件',
     okDesc:c.po?'MBPTS PO '+c.po+' · IMS PO 邮件已命中':'MBPTS PO 已获取 · IMS PO 邮件已命中',
     subs:c.ims?[c.ims+'.msg']:[],
     evFiles:c.ims?[[DIAG_TABLE,'7.2 MB'],[c.ims+'.msg','1.1 MB']].concat(inv?[[inv.file,'156 KB']]:[]):[]},

    {n:'填入DSS导入模板', st:'ok',
     d:'DSS 导入模板 · 9 个必填字段 · 在 Portal 上可供下载',
     okDesc:'DSS 导入模板已生成 · 可在 Portal 下载',
     subs:inv?[inv.file, xentryDssName(c)]:[],
     ev:c.alloc?[receiptEv(c, wb)]:[],
     evFiles:inv?[[inv.file,'156 KB'],[c.ims+'.msg','1.1 MB'],[m.subj+'.msg','101 KB'],[xentryDssName(c),'9 KB']]:[]},
  ];
}
/* 未完成形态：
 *   RUNNING      —— 停在「捕捉PO邮件」执行中；
 *   DIFF_PENDING —— 「捕捉PO邮件」待人工处理：顶部灰色区找不到 ID No. 对应的 MBPTS PO（BRD：报错转人工，并阻断流程） */
function xentryPrunedNodes(c, wb, st){
  const m = fullcomeMail(c);
  return xentryNodes(c, wb).map((node,i)=>{
    if(i===0) return node;
    if(st==='RUNNING'){
      if(i===1){ node.st='run'; node.d='按 ID No. 查找 MBPTS PO 并检索 IMS PO 邮件执行中…'; delete node.evFiles; return node; }
      node.st='queued'; node.d='等待前序节点完成'; delete node.evFiles; return node;
    }
    if(c.block==='invoice'){
      if(i===1) return node;
      node.st='review';
      node.d='按 AWB No. '+wb+' 查询系统库未找到对应进口发票，待人工处理';
      node.err='系统库查不到进口发票：ASN Number（Our delivery note number）与 Shipment Date（Document date）无法取值，待人工处理。';
      node.evFiles=[[c.ims+'.msg','1.1 MB'],[m.subj+'.msg','101 KB']];
      return node;
    }
    if(i===1){
      node.st='review';
      node.d='诊断仪大表顶部灰色区未找到 ID No. '+c.id+' 对应的 MBPTS PO，待人工处理';
      node.err='MBPTS PO 为空：报错转人工，并阻断流程。如果后续有 PO，在本节点录入 ID No.，等待下一次运行继续流程。';
      node.evFiles=[[DIAG_TABLE,'7.2 MB']];
      return node;
    }
    node.st='queued'; node.d='等待前序节点完成';
    delete node.evFiles;
    return node;
  });
}
/* 解析节点（捕捉PO邮件）字段：docIndex 0 = 诊断仪大表，1 = IMS PO 邮件，2 = 进口发票 PDF，3 = 报关代理邮件
 * 本步提取的 ID No. / MBPTS PO / SPM Item 排在前面，其余为 DSS 模板其他字段 */
function xentryFields(c, wb){
  const inv = c.invoice, qty = c.rows.reduce((a,b)=>a+b,0);
  return [
    {k:'ID No.（J 列）',v:c.id,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM PO Number（M 列 MBPTS PO）',v:c.po,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM PO Item Number（SPM 截屏 Item · 顺次收货）',v:c.alloc.map(a=>a.item).join(' / '),src:'OCR',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'SPM Part Number（D 列 Part NO.）',v:c.pn,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Quantity（F 列 Qty 合计）',v:qty+'（'+c.alloc.map(a=>'Item '+a.item+' ×'+a.qty).join(' · ')+'）',src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'ASN Number（Our delivery note number）',v:inv.dn,src:'系统',conf:100,quality:'系统取值',docIndex:2,page:3,locator:true},
    {k:'Shipment Date（Document date）',v:inv.shipDate,src:'系统',conf:100,quality:'系统取值',docIndex:2,page:3,locator:true},
    {k:'Vendor BP Number',v:XENTRY_VENDOR,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 191110260，无原文坐标'},
    {k:'Unit',v:'PC',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 PC，无原文坐标'},
    {k:'ETA date（Fullcome 邮件日期 + 1）',v:plusDay(c.mailDay,1),src:'规则',conf:100,quality:'规则确定',docIndex:3,page:1,locator:true},
  ];
}
/* 待人工处理票：只列已取得的字段，缺失项标为低质量（金色高亮） */
function xentryPendingFields(c, wb){
  const qty = c.rows.reduce((a,b)=>a+b,0), eta = plusDay(c.mailDay,1);
  if(c.block==='invoice') return [   /* docIndex 0 = 诊断仪大表，1 = IMS PO 邮件，2 = 报关代理邮件 */
    {k:'ID No.（J 列）',v:c.id,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM PO Number（M 列 MBPTS PO）',v:c.po,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM Part Number（D 列 Part NO.）',v:c.pn,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Quantity（F 列 Qty 合计）',v:String(qty),src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'ASN Number（Our delivery note number · 待补传进口发票）',v:'（未找到进口发票）',src:'系统',conf:0,quality:'低',low:true,locator:false,locatorReason:'系统库按 AWB No. 未查到进口发票'},
    {k:'Shipment Date（Document date · 待补传进口发票）',v:'（未找到进口发票）',src:'系统',conf:0,quality:'低',low:true,locator:false,locatorReason:'系统库按 AWB No. 未查到进口发票'},
    {k:'Vendor BP Number',v:XENTRY_VENDOR,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 191110260，无原文坐标'},
    {k:'Unit',v:'PC',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 PC，无原文坐标'},
    {k:'ETA date（Fullcome 邮件日期 + 1）',v:eta,src:'规则',conf:100,quality:'规则确定',docIndex:2,page:1,locator:true},
  ];
  return [   /* docIndex 0 = 诊断仪大表，1 = 报关代理邮件 */
    {k:'ID No.（J 列 · 顶部灰色区无对应 MBPTS PO）',v:c.id,src:'系统',conf:0,quality:'低',low:true,docIndex:0,page:1,locator:true},
    {k:'SPM Part Number（D 列 Part NO.）',v:c.pn,src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'Quantity（F 列 Qty 合计）',v:String(qty),src:'系统',conf:100,quality:'系统取值',docIndex:0,page:1,locator:true},
    {k:'SPM PO Number（M 列 MBPTS PO）',v:'（空）',src:'系统',conf:0,quality:'低',low:true,docIndex:0,page:1,locator:true},
    {k:'Vendor BP Number',v:XENTRY_VENDOR,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 191110260，无原文坐标'},
    {k:'Unit',v:'PC',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'固定值 PC，无原文坐标'},
    {k:'ETA date（Fullcome 邮件日期 + 1）',v:eta,src:'规则',conf:100,quality:'规则确定',docIndex:1,page:1,locator:true},
  ];
}
function xentryFiles(c){
  return [{name:DIAG_TABLE,pages:1},{name:c.ims+'.msg',pages:1},{name:c.invoice.file,pages:c.invoice.pages},{name:fullcomeMail(c).subj+'.msg',pages:1}];
}
function xentryPendingFiles(c){
  const mail={name:fullcomeMail(c).subj+'.msg',pages:1};
  return c.block==='invoice'?[{name:DIAG_TABLE,pages:1},{name:c.ims+'.msg',pages:1},mail]:[{name:DIAG_TABLE,pages:1},mail];
}

/* ===== Case5 节点轨迹 =====
 * MBPLAP 走 mbplapNodes；X-entry 走 xentryNodes。 */
function case5TemplateNodes(mode, waybill){
  if(mode==='xentry'){
    const wb = waybill || '524241793610';
    return xentryNodes(xentryCase(wb), wb);
  }
  const wb = waybill || 'PKLA01579315';
  return mbplapNodes(mbplapCase(wb), wb);
}
function case5TriggerDesc(mode, wb){
  if(mode==='xentry') return '邮件触发 · '+fullcomeMail(xentryCase(wb)).subj;
  return '定时调度 · 每天 12:00 / 17:00 · Pre-alert creation '+mbplapCase(wb).created;
}
function ensureWorkbenchTasks(){
  let changed=false;
  HOME_TASKS.forEach(sample=>{
    const id='T-'+sample.waybill;
    if(State.task(id))return;
    const mode=sample.mode;
    const isXentry=mode==='xentry';
    const st={completed:'SUCCEEDED',running:'RUNNING',manual:'DIFF_PENDING'}[sample.status];
    let nodes, fields, files, statusText, start, need;
    if(isXentry){
      /* X-entry：3 节点，附件、字段与原文均按 BRD 样例生成 */
      const c=xentryCase(sample.waybill);
      nodes=sample.status==='completed'?xentryNodes(c, sample.waybill):xentryPrunedNodes(c, sample.waybill, st);
      fields=sample.status==='completed'?xentryFields(c, sample.waybill):sample.status==='manual'?xentryPendingFields(c, sample.waybill):[];
      files=sample.status==='completed'?xentryFiles(c):sample.status==='manual'?xentryPendingFiles(c):[];
      start=c.mailDay+' '+fullcomeMail(c).time;
      statusText={completed:'DSS 导入模板已生成 · 可在 Portal 下载',
        running:'捕捉PO邮件执行中',
        manual:c.block==='invoice'?'系统库查不到进口发票，待补传':'ID No. '+c.id+' 无对应 MBPTS PO，待人工处理'}[sample.status];
      if(sample.status==='manual') need=c.block;
    } else {
      /* MBPLAP：3 节点，附件、字段与原文均按 BRD 样例生成 */
      const c=mbplapCase(sample.waybill);
      nodes=sample.status==='completed'?mbplapNodes(c, sample.waybill):mbplapPrunedNodes(c, sample.waybill, st);
      fields=sample.status==='completed'?mbplapFields(c, sample.waybill):[];
      files=sample.status==='completed'?mbplapFiles():[];
      start=c.created+' '+c.run;
      statusText={completed:'DSS 导入模板已生成 · 可在 Portal 下载',
        running:'从IES导出发票信息执行中'}[sample.status];
    }
    const t={
      id, uc:'UC34', caseId:'case-5', waybill:sample.waybill, mode, date:sample.date, demoWorkbench:true,
      case:isXentry?'X-entry_DSS上传模板':'MBPLAP_DSS上传模板',
      src:isXentry?'邮件触发':'定时调度', rule:'—', need,
      ops:[{tm:start,txt:'创建模拟任务 · '+sample.waybill+' · '+statusText}],
      runs:[{
        no:1, cause:'初次执行 · '+case5TriggerDesc(mode, sample.waybill),
        st,
        start,
        dur:sample.status==='completed'?'已完成':sample.status==='running'?'进行中':'待人工处理',
        nodes, fields, files,
        summary:sample.waybill+' · '+statusText,
      }],
    };
    State.tasks.push(t);changed=true;
  });
  if(changed)State.save();
}
/* ==================== Share Point 目录树 ====================
 * Case3 BRD：一级目录按操作日期，二级目录按 HAWB 命名；内容为发票（发票号）、HAWB_分单号，
 * 危险品另有 MSDS_分单号、shippers_Decl_分单号；已生成的导入模板存入同一分单目录。
 * 运行记录按年度累积，以年份命名，放在根目录。
 */
/* 存档公盘页（sharepoint.html）站点信息；根目录年度表格点开即展示运行记录 */
const SP_SITE = {name:'MBPTS 流程存档', sub:'UC34 · Case 3 MBPLAP 发票与预报创建 · 专用组', logo:'MB',
  tip:{text:'完整执行留存示例（危险品票，含发票、HAWB、MSDS、shippers_Decl、导入模板）', path:['20260827','PKLA01458373']},
  records:()=>({cols:CASE3_RUN_RECORD_COLS, rows:case3RunRecords(),
    note:'运行记录逐票累积；以 Process date 12 月 31 日为截止，每年一个表格并按年份命名；未执行到的步骤显示 —。'})};
const SP_TYPE = {xlsx:'Microsoft Excel 工作表', pdf:'Adobe Acrobat 文档', png:'PNG 图片'};
function spFile(name, time, size){
  const ext = /\.xlsx?$/i.test(name) ? 'xlsx' : /\.png$/i.test(name) ? 'png' : 'pdf';
  return {kind:'file', name, time, type:SP_TYPE[ext], size};
}
function spFolder(name, children){ return {kind:'folder', name, children:children||[]}; }
/* 在 parent 下按名称找到或新建一层子目录，保证同一 PDC / 运行周只建一次 */
function spDir(parent, name){
  let d = parent.children.find(x=>x.kind==='folder' && x.name===name);
  if(!d){ d = spFolder(name); parent.children.push(d); }
  return d;
}
function spRunFolder(day, hm){ return day.replace(/-/g,'')+'_'+hm.replace(':',''); }
function buildSharePointTree(){
  const root = spFolder('Share Point');
  CASE3_HOME_SAMPLES.forEach(c=>{
    const f = case3Docs(c), t = c.date+' 09:30', task = State.task('T-'+c.waybill);
    const dir = spDir(spDir(root, c.date.replace(/-/g,'')), c.waybill);
    dir.children.push(spFile(f.invoice, t, '186 KB'), spFile(f.hawb, t, c.hawbImage?'412 KB':'98 KB'),
      ...f.optional.map(name=>spFile(name, t, '240 KB')));
    /* 模板已生成（N4 完成）才归档；业务上传过修正模板则归档修正版 */
    if(task && latestRun(task)?.nodes?.[3]?.st==='ok')
      dir.children.push(spFile(task.fixTemplate?.name || f.template, c.date+' 10:30', '38 KB'));
  });
  const lastDay = CASE3_HOME_SAMPLES.map(c=>c.date).sort().pop();
  root.children.push({...spFile(lastDay.slice(0,4)+'.xlsx', lastDay+' 18:00', '24 KB'), records:true});
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
  return HOME_TASKS.map(sample=>{
    const t=State.task('T-'+sample.waybill);
    if(!t)return sample;
    const st=taskStatus(t);
    return {...sample,status:st==='SUCCEEDED'?'completed':['RUNNING','DISPATCHED','RETRYING'].includes(st)?'running':'manual'};
  });
}
const CASE3_HOME_SAMPLES = [
  {waybill:'PKLA01458373',mawb:'61847739952',invoice:'1100021838',date:'2026-08-27',status:'completed',mailed:true,dg:true},
  {waybill:'PKLA01461207',mawb:'61847741036',invoice:'1100036014',date:'2026-08-28',status:'completed',mailed:true,dg:false,hawbImage:true},
  {waybill:'PKLA01463915',mawb:'61847742870',invoice:'1100036102',date:'2026-08-29',status:'completed',mailed:false,dg:false},
  {waybill:'PKLA01466482',mawb:'61847744512',invoice:'1100036187',date:'2026-08-30',status:'running',mailed:false,dg:false},
  {waybill:'PKLA01469051',mawb:'61847746093',invoice:'1100036255',date:'2026-08-30',status:'manual',mailed:false,dg:false,check:'Customer Code 与 PDC Mapping',
   err:'Customer NO. 在逻辑关系中找不到对应 PDC，PDC 置空并报错；未导入 IES+。'},
  {waybill:'PKLA01472638',mawb:'61847747755',invoice:'1100036319',date:'2026-08-31',status:'manual',mailed:false,dg:true,check:'MBZ/DN No. 与 PID 多对一',
   err:'PID 13302670956 下有 2 个 Del. NO.（2000543335、2000547637）。IES+ 只接受 MBZ/DN No.:PID 为一对多或一对一，已提取完所有数据并停止系统操作。'},
];
/* 运行记录（附件3）：按任务最新一次执行的节点状态逐票生成；未走到的步骤显示 —。
   节点序号：4 导入发票 · 5 创建预报。PDC 仅 BRD 原样例票有确定值。 */
function case3RunRecord(t){
  const c=CASE3_HOME_SAMPLES.find(x=>'T-'+x.waybill===t?.id), run=t&&latestRun(t);
  if(!c||!run) return null;
  const nodes=run.nodes||[], imported=nodes[4]?.st==='ok', created=nodes[5]?.st==='ok';
  const review=nodes.find(n=>n.st==='review'), fail=nodes.find(n=>n.st==='fail');
  /* 重跑的 run.start 为 now() 格式「MM-DD HH:mm」，补当前年份 */
  const day=s=>{const d=(s||'').split(' ')[0];return (/^\d{2}-\d{2}$/.test(d)?new Date().getFullYear()+'-'+d:d).replace(/-/g,'/');}, yn=v=>created?v:'—';
  const result=imported?'Done':review?'未导入：'+(c.check||review.n)+' 待核对':fail?'失败：'+fail.n:'—（执行中）';
  const pdc=imported?(c.waybill==='PKLA01458373'?'North 3PL':'未提供（演示）'):review&&/PDC/.test(c.check||'')?'待核对':'—';
  const dgFile=c.dg?yn('Y'):'不涉及';
  return [day(c.date),pdc,c.waybill,c.invoice,result,yn('N'),imported?'Y':'—',yn('Y'),dgFile,dgFile,day(run.start||c.date)];
}
/* 任务操作日志：按节点逐条写入 BRD 各步动作与附件3 运行记录取值 */
function case3NodeOps(t, run, i){
  const c=CASE3_HOME_SAMPLES.find(x=>'T-'+x.waybill===t?.id), n=run?.nodes?.[i];
  if(!c||!n) return [];
  const f=case3Docs(c), p='R#'+run.no+' · ', dir=c.date.replace(/-/g,'')+' / '+c.waybill;
  const pdc=c.waybill==='PKLA01458373'?'North 3PL':'未提供（演示）', dg=c.dg;
  const rec=(k,v)=>p+'运行记录 · '+k+' = '+v;
  if(n.st==='review') return [p+n.n+' · '+(c.check||n.n)+' 待核对，暂停导入 IES+', rec('Invoice data creation result','未导入：'+(c.check||n.n)+' 待核对')];
  if(n.st==='fail') return [p+n.n+' · 执行失败', rec('Invoice data creation result','失败：'+n.n)];
  if(n.st==='run') return [p+n.n+' · '+(i===6?'通知邮件待发送':'执行中')];
  if(n.st!=='ok') return [];
  return [[
    p+'捕捉邮件 · 命中预报邮件「'+f.subject+'」（标题含 MBPLAP Pre-alert，发件人后缀 @tvsscs.com）',
    p+'捕捉邮件 · 解析正文：HAWB No. '+c.waybill+' · DG '+(dg?'Y':'N'),
    rec('Pre-alert receive date',c.date.replace(/-/g,'/')),
  ],[
    p+'下载附件 · 发票重命名为 '+f.invoice,
    p+'下载附件 · 分单重命名为 '+f.hawb,
    ...(dg?[p+'下载附件 · MSDS 重命名为 '+f.optional[0], p+'下载附件 · Shipper\'s Declaration 重命名为 '+f.optional[1]]:[]),
    p+'归档 · 附件存入 Share Point / '+dir,
  ],[
    p+'OCR识别 · 发票箱单字段识别完成（发票号 '+c.invoice+'）',
    p+'OCR识别 · 运单字段识别完成（HAWB '+c.waybill+'）',
  ],[
    p+'填写发票导入模板 · 生成 '+f.template+'（INV 表头 / INV 表体 / DN 表头 / DN 表体）',
    p+'归档 · 导入模板存入 Share Point / '+dir,
  ],[
    p+'导入发票 · IES+ 导入INV&DN 完成，无 Warning',
    rec('Invoice data creation result','Done'),
    p+'导入发票 · 按发票号 '+c.invoice+' 上传 PDF 发票',
    rec('Invoice hardcopy upload','Y'),
  ],[
    p+'创建预报 · 同一 HAWB '+c.waybill+' 的发票批量生成预报',
    rec('Pre-alert data creation result difference','N'),
    p+'创建预报 · 上传 '+f.hawb,
    rec('HAWB hardcopy upload','Y'),
    ...(dg?[p+'创建预报 · 上传 '+f.optional[0], rec('MSDS upload','Y'), p+'创建预报 · 上传 '+f.optional[1], rec('Shippers_Decl upload','Y')]
      :[rec('MSDS upload','不涉及'), rec('Shippers_Decl upload','不涉及')]),
    p+'创建预报 · IES+ 返回 PDC '+pdc,
    rec('PDC',pdc),
  ],[
    p+'发送邮件通知 · 按 PDC '+pdc+' 匹配 Email Mapping List，回复原预报邮件',
  ]][i]||[];
}
function case3RecordOp(t, run){
  const row=case3RunRecord(t);
  return row?'R#'+run.no+' · 运行记录 · 写入年度运行记录 '+row[10].slice(0,4)+'.xlsx（Process date '+row[10]+'）':'';
}
/* 演示任务初始日志：自执行开始按分钟递增，最新在前 */
function case3SeedOps(t, run){
  const [d,hm]=run.start.split(' '), base=new Date(d+'T'+hm+':00');
  const tm=k=>{const x=new Date(base.getTime()+k*60000),q=v=>String(v).padStart(2,'0');return x.getFullYear()+'-'+q(x.getMonth()+1)+'-'+q(x.getDate())+' '+q(x.getHours())+':'+q(x.getMinutes());};
  const txts=['创建任务 · 邮件触发（规则 R-C3-PREALERT）','生成执行 R#1：'+run.cause,
    ...run.nodes.flatMap((_,i)=>case3NodeOps(t,run,i)), case3RecordOp(t,run)].filter(Boolean);
  return txts.map((txt,k)=>({tm:tm(k),txt})).reverse();
}
function case3RunRecords(){
  return CASE3_HOME_SAMPLES.map(c=>case3RunRecord(State.task('T-'+c.waybill))).filter(Boolean)
    .sort((a,b)=>a[10]===b[10]?a[2].localeCompare(b[2]):a[10]<b[10]?-1:1);
}
function case3Docs(c){
  const invoice=c.invoice+'.pdf', hawb='HAWB_'+c.waybill+(c.hawbImage?'.png':'.pdf');
  const optional=c.dg?['MSDS_'+c.waybill+'.pdf','shippers_Decl_'+c.waybill+'.pdf']:[];
  const subject=c.waybill==='PKLA01458373'
    ?'20260827_MBPLAP Pre-alert_61847739952_PKLA01458373_DG'
    :c.date.replace(/-/g,'')+'_MBPLAP Pre-alert_'+c.mawb+'_'+c.waybill+(c.dg?'_DG':'');
  return {invoice,hawb,optional,subject,mail:subject+'.msg',template:'导入INV＆DN.xlsx'};
}
function case3Files(c){
  const f=case3Docs(c);
  return [{name:f.invoice,pages:c.waybill==='PKLA01458373'?2:1},{name:f.hawb,pages:c.hawbImage?1:2},
    {name:f.mail,pages:1},{name:f.template,pages:4}].concat(f.optional.map(name=>({name,pages:1})));
}
const CASE3_FIELD_IMAGES = {
  '发票/箱单 · Invoice No.':[1], '发票/箱单 · Mode of Shipment':[28,29],
  '发票/箱单 · Date':[2], '发票/箱单 · Customer No.':[3],
  '发票/箱单 · TERMS OF DELIVERY':[30], '发票/箱单 · VALUE OF GOODS;NET':[4],
  '发票/箱单 · BILLING CURRENCY':[5], '发票/箱单 · PACKING CHARGE':[6],
  '发票/箱单 · INSURANCE':[7], '发票/箱单 · FREIGHT CHARGE':[8],
  '发票/箱单 · TOTAL VALUE OF GOODS':[9], '发票/箱单 · Total Gross Wts':[10],
  '发票/箱单 · Invoice Item NO.':[12], '发票/箱单 · Del No.':[31],
  '发票/箱单 · Part Number':[13], '发票/箱单 · Quantity':[14],
  '发票/箱单 · Item Net Weight (kg)':[15], '发票/箱单 · Invoice/Payment Value':[16],
  '发票/箱单 · Order No.':[32], '发票/箱单 · No of Pkgs（PID）':[18],
  '发票/箱单 · Types of Pkgs':[19], '发票/箱单 · L（cm）':[20],
  '发票/箱单 · B（cm）':[21], '发票/箱单 · H（cm）':[22],
  '发票/箱单 · Net Wt（Kg）':[23], '发票/箱单 · Gross Wt（Kg）':[24],
  'INV表头 · PDC（必填）':[25], 'INV表头 · Volume（选填）':[11],
  'DN表头 · MBZ/DN No.（必填）':[17], 'DN表体 · Description EN（选填）':[26],
  'DN表体 · Qty（必填）':[27], 'DN表体 · PID（必填）':[33],
};
function case3Fields(c){
  const sample=c.waybill==='PKLA01458373';
  const value=(stage,k,v,src,docIndex)=>({stage,k,v:v==null?'（示例原文未提供）':String(v),src,
    conf:v==null?0:src==='OCR'?95:100,quality:v==null?'待核实':'演示',docIndex,page:1,
    locator:v!=null&&['OCR','邮件'].includes(src),locatorReason:v==null?'BRD 示例没有该票的原文取值':'该值由规则或映射取得'});
  const output=(sheet,k,v,src,required)=>({stage:3,k:sheet+' · '+k+(required?'（必填）':'（选填）'),
    v:v==null?'（示例原文未提供）':String(v),src,conf:v==null?0:100,
    quality:v==null?'待核实':'演示',docIndex:3,
    page:['INV表头','INV表体','DN表头','DN表体'].indexOf(sheet)+1,locator:false,
    locatorReason:'这是模板取值；原文提取值请在 OCR 识别节点查看'});
  const fields=[
    value(0,'Arrival port',sample?'上海浦东国际机场':null,'邮件',2),
    value(0,'Terminal WH',sample?'东航2区406库':null,'邮件',2),
    value(0,'HAWB No.',c.waybill,'邮件',2),
    value(0,'DG(Y/N)',c.dg?'Y':'N','邮件',2),
  ];
  const invoiceRaw=[
    ['Invoice No.',c.invoice],['Mode of Shipment',sample?'H5 HAZMAT':null],
    ['Date',sample?'05 Nov 2025':null],['Customer No.',sample?'CN081975':null],
    ['TERMS OF DELIVERY',sample?'CIP AP_CN_PVG':null],['VALUE OF GOODS;NET',null],
    ['BILLING CURRENCY',null],['PACKING CHARGE',null],['INSURANCE',null],
    ['FREIGHT CHARGE',null],['TOTAL VALUE OF GOODS',null],['Total Gross Wts',null],
    ['Invoice Item NO.',null],['Del No.',null],['Part Number',null],
    ['Quantity',null],['Item Net Weight (kg)',null],['Invoice/Payment Value',null],
    ['Order No.',null],['No of Pkgs（PID）',null],['Types of Pkgs',null],
    ['L（cm）',null],['B（cm）',null],['H（cm）',null],
    ['Net Wt（Kg）',null],['Gross Wt（Kg）',null],
  ];
  invoiceRaw.forEach(([k,v])=>fields.push(value(2,'发票/箱单 · '+k,v,'OCR',0)));
  [['MAWB',c.mawb],['HAWB No.',c.waybill],['Airline/Carrier',null],
    ['Flight No.',null],['C.W.(KG)',null],['G.W.(KG)',null],
    ['Package QTY',null],['货物尺寸',null],['始发地',null]
  ].forEach(([k,v])=>fields.push(value(2,'运单 · '+k,v,'OCR',1)));
  if(c.check) fields.push({stage:3,k:c.check+'（校验不通过）',v:c.err||'（待处理）',src:'规则',
    conf:0,quality:'低',low:true,docIndex:3,page:3,locator:false,
    locatorReason:'模板校验结果，无原文坐标'});
  const template=[
    ['INV表头',[
      ['SH Tracking No.','（留空）','规则',false],['Invoice No.',c.invoice,'PDF',true],
      ['Invoice type',sample?'DGR':null,'映射',true],['Invoice date',sample?'2025-11-05':null,'PDF',true],
      ['PDC',sample?'North 3PL':null,'映射',true],['Supplier name','MBPLAP','固定',true],
      ['Customer account No.',sample?'CN081975':null,'PDF',false],['Freight type','Air','固定',true],
      ['Incoterm',sample?'CIP':null,'PDF',true],['Goods value',null,'PDF',true],
      ['Currency',null,'PDF',true],['Packing fee',null,'PDF',false],
      ['Charge to airport','（留空）','规则',false],['Insurance',null,'PDF',false],
      ['Freight charge',null,'PDF',false],['DGR fee','（留空）','规则',false],
      ['Others','（留空）','规则',false],['Total Amount',null,'PDF',true],
      ['Urgent Invoice','（留空）','规则',false],['BOL','（留空）','规则',false],
      ['Gross Weight',null,'PDF',true],['Volume','（IES+ 自动计算）','系统',false],
      ['Remark 1','（留空）','规则',false],['Remark 2','（留空）','规则',false],
    ]],
    ['INV表体',[
      ['Item',null,'PDF',true],['MBZ/DN No.',null,'PDF',true],
      ['Invoice No',c.invoice,'PDF',true],['Part Number',null,'PDF',true],
      ['Description EN','（留空）','规则',false],['Qty',null,'汇总',true],
      ['Item Net Weight (kg)',null,'汇总',true],['Unit Price','（留空）','规则',false],
      ['Total Price',null,'汇总',true],['Country of Origin','（留空）','规则',false],
      ['Discount group','（留空）','规则',false],['Dealer Code','（留空）','规则',false],
      ['Order No.',null,'PDF',false],['Order Line','（留空）','规则',false],
    ]],
    ['DN表头',[
      ['Container No.','（留空）','规则',false],['MBZ/DN No.',null,'PDF',true],
      ['PID',null,'PDF',true],['Package Type',null,'PDF',true],
      ['Length(MM)',null,'单位换算',true],['Width(MM)',null,'单位换算',true],
      ['Height(MM)',null,'单位换算',true],['N.W（KG)',null,'PDF',true],
      ['G.W（KG)',null,'PDF',true],
    ]],
    ['DN表体',[
      ['MBZ/DN No.',null,'PDF',true],['PID',null,'PDF',true],
      ['Part Number',null,'PDF',true],['Description EN','（留空）','规则',false],
      ['Qty',null,'匹配推算',true],
    ]],
  ];
  template.forEach(([sheet,rows])=>rows.forEach(([k,v,src,required])=>fields.push(output(sheet,k,v,src,required))));
  const alert=[
    ['MAWB',c.mawb,'OCR',1],['HAWB/BL No.',c.waybill,'OCR',1],
    ['Airline/Carrier',null,'OCR',1],['Flight No.',null,'OCR',1],
    ['DG',c.dg?'Y':'N','规则',2],['C.W.(KG)',null,'OCR',1],
    ['Terminal WH',sample?'东航2区406库':null,'邮件',2],
    ['Avis/Shipping Log No.','（不填写）','规则',1],
    ['Package QTY',null,'OCR',1],['G.W.(KG)',null,'OCR',1],
    ['VOL(m³)',null,'计算',1],['Freight Charge','（不填写）','规则',1],
    ['Freight Currency','（不填写）','规则',1],['Direct Flight',null,'规则',1],
    ['Arrival Port',sample?'上海浦东国际机场':null,'邮件',2],
    ['Departure Port',null,'映射',1],
  ];
  alert.forEach(([k,v,src,docIndex])=>fields.push(value(5,k,v,src,docIndex)));
  fields.forEach(f=>{
    const ids=CASE3_FIELD_IMAGES[f.k];
    if(!ids) return;
    f.images=ids.map(id=>'assets/img/case3/ocr-'+String(id).padStart(2,'0')+'.png');
    f.locator=true;
  });
  return fields;
}
function case3TemplateNodes(c){
  const f=case3Docs(c), originals=[f.invoice,f.hawb,...f.optional];
  const fileRows=names=>names.map(name=>[name,'演示附件']);
  return [
    {n:'捕捉邮件',st:'ok',d:'标题含 MBPLAP Pre-alert · 发件人后缀 @tvsscs.com',okDesc:'预报邮件已命中 · HAWB '+c.waybill,
     subs:[f.mail],fieldFiles:[2],ev:[{type:'email',title:'预报邮件触发',lines:['主题 '+f.subject,'校验标题关键词与 Forwarder 邮箱后缀','邮件正文含 Arrival port / Terminal WH / HAWB No. / DG(Y/N)']}],evFiles:fileRows([f.mail])},
    {n:'下载附件重命名并归档',st:'ok',d:'按发票号、HAWB 号重命名 · 操作日期 / HAWB 归档',okDesc:'邮件附件已下载并归档',
     subs:originals,ev:[{type:'file',title:'附件识别与归档',lines:['发票 → '+f.invoice,'运单 → '+f.hawb,...f.optional.map(name=>'危险品附件 → '+name),'归档目录 '+c.date+' / '+c.waybill]}],evFiles:fileRows(originals)},
    {n:'OCR识别',st:'ok',d:'识别发票箱单与运单原文字段（PDF 或图片）',okDesc:'发票、包装信息和运单字段已识别',
     subs:[f.invoice,f.hawb],fieldFiles:[0,1],evFiles:fileRows([f.invoice,f.hawb])},
    {n:'填写发票导入模板',st:'ok',d:'生成 IES+ 导入INV&DN 模板 · INV 表头/表体、DN 表头/表体',okDesc:'发票导入模板已生成',
     subs:[f.template],fieldFiles:[3],ev:[{type:'table',title:'IES+ 发票导入模板',lines:['INV 表头 / INV 表体 / DN 表头 / DN 表体','模板保存在 '+c.date+' / '+c.waybill+' 分单目录']}],evFiles:fileRows([f.template])},
    {n:'导入发票',st:'ok',d:'IES+ 发票信息 → 导入INV&DN · 按发票号上传 PDF',okDesc:'发票导入与附件上传操作已登记',
     subs:[f.template,f.invoice],ev:[{type:'screen',title:'发票信息操作记录',lines:['选择导入INV&DN 模板并上传','Warning 如有则写入运行记录','按发票号 '+c.invoice+' 查询并上传 PDF 发票']}],evFiles:fileRows([f.template,f.invoice])},
    {n:'创建预报',st:'ok',d:'筛选同一 HAWB 全部发票 → 生成预报 → 上传运单及危险品资料（如有）',okDesc:'预报创建与文档资料上传操作已登记',
     subs:[f.hawb,...f.optional],fieldFiles:[1,2],
     referenceImages:[1,2,3].map(i=>'assets/img/case3/prealert-'+String(i).padStart(2,'0')+'.png'),
     ev:[{type:'screen',title:'IES+ 预报创建',lines:['同一 HAWB '+c.waybill+' 的发票批量生成预报','填写 MAWB / HAWB / Flight No. / DG / 重量 / 体积 / 仓库等 BRD 字段','文档资料：HAWB → HAWB，MSDS → Others，Shipper → Shipper decl','Warning / Difference 如有则记入运行记录']}],evFiles:fileRows([f.hawb,...f.optional])},
    {n:'发送邮件通知',st:'ok',d:'匹配 PDC 与 Email Mapping List · 回复原预报邮件',okDesc:'预报创建完成通知已发送',
     ev:[{type:'email',title:'回复原预报邮件',lines:['只回复本邮件涉及的预报创建信息','收件人由系统 PDC 匹配 Email Mapping List','Dears，','Kindly pls refer to the MBPLAP pre-alert creation status. Thanks~']}],evFiles:fileRows([f.mail])},
  ];
}
function case3PrunedNodes(c){
  const nodes=case3TemplateNodes(c);
  /* 模板校验类差异停在 N4 填写发票导入模板，不导入 IES+ */
  const stop=c.status==='completed'?6:c.status==='manual'?3:2;
  nodes.forEach((node,i)=>{
    if(i<stop) return;
    if(i===stop){
      node.st=c.status==='manual'?'review':'run';
      node.d=c.status==='manual'?c.check+' · 已停止，未导入 IES+':stop===6?'发票与预报已完成，回复通知邮件待发送':'PDF 发票箱单与运单识别执行中';
      if(c.status==='manual') node.err=c.err||c.check;
      delete node.ev;
      if(stop===6) delete node.evFiles;
      return;
    }
    node.st='queued';node.d='等待前序节点完成';delete node.ev;delete node.evFiles;
  });
  return nodes;
}
function ensureCase3Tasks(){
  let changed=false;
  CASE3_HOME_SAMPLES.forEach(c=>{
    const id='T-'+c.waybill;
    if(State.task(id))return;
    const st=c.status==='manual'?'DIFF_PENDING':c.status==='running'||!c.mailed?'RUNNING':'SUCCEEDED';
    const statusText=c.status==='manual'?c.check+' 待核对（演示）':c.status==='running'?'OCR 识别执行中':c.mailed?'发票、预报和邮件通知已完成':'发票与预报已完成，通知邮件待发送';
    const start=c.date+' 10:00';
    const task={id,uc:'UC34',caseId:'case-3',case:'MBPLAP 发票和预报创建',mode:'mbplap',waybill:c.waybill,date:c.date,demoWorkbench:true,
      src:'邮件触发',rule:'—',ops:[],
      runs:[{no:1,cause:'初次执行 · MBPLAP Pre-alert 邮件触发',st,start,dur:st==='SUCCEEDED'?'已完成':st==='RUNNING'?'进行中':'待人工核对',
        nodes:st==='SUCCEEDED'?case3TemplateNodes(c):case3PrunedNodes(c),fields:c.status==='running'?[]:case3Fields(c),files:case3Files(c),summary:statusText}],
      fillFields:case3Fields(c),fillFiles:case3Files(c),fillSummary:'该票发票、预报及邮件通知流程已完成（模拟）。'};
    State.tasks.push(task);
    task.ops=case3SeedOps(task, task.runs[0]);
    changed=true;
  });
  if(changed) State.save();
}

/* ===== 全权限版：注册 Case3 ===== */
/* 解析面板标题（原 Case3 按节点下标写在页面里，这里随节点数据走） */
const C3_FIELD_TITLES = {0:'邮件正文数据', 2:'当前识别数据', 3:'发票导入模板字段', 5:'预报填写字段'};
const _c3Nodes = case3TemplateNodes;
case3TemplateNodes = function(c){ const ns = _c3Nodes(c); ns.forEach((n,i)=>{ if(C3_FIELD_TITLES[i]) n.fieldTitle = C3_FIELD_TITLES[i]; }); return ns; };
function c3DemoTask(){
  const c = CASE3_HOME_SAMPLES[0];
  return {case:'MBPLAP 发票和预报创建', waybill:c.waybill, nodes:case3TemplateNodes(c), fields:case3Fields(c), files:case3Files(c),
    dur:'已完成', fillFields:case3Fields(c), fillFiles:case3Files(c)};
}
registerCase('case-3', {
  label:'Case3 · MBPLAP 发票与预报',
  seed:{rules:SEED.rules, ioRecipients:SEED.ioRecipients, mailTemplates:SEED.mailTemplates, notify:SEED.notify,
    /* BRD 附件1「逻辑关系」（校验 Customer Code 与 PDC Mapping）与 附件5_Mapping list_Email loop（按 PDC 匹配回复邮件收件人）：放映射表配置 */
    cfgItems:SEED.cfgItems.concat([
      {id:'map-c3-pdc', kind:'mapping', scope:'MBPLAP', name:'逻辑关系（Account Number 对应 PDC）',
       desc:'INV 表头中的逻辑关系：发票 PDF 的 Customer NO. 按 Account Number 匹配对应 PDC；找不到对应 PDC 时转人工',
       cols:['Account Number','Description','对应PDC'], rows:[["CN088933", "MB Car / Van (Beijing) - RHVOR", "BJ PDC"], ["CN088943", "MB Car / Van (ShaoXing) - RHVOR", "SX PDC"], ["CN088953", "MB Car / Van (Guangzhou) - RHVOR", "GZ PDC"], ["CN081975", "Hazmat (North 3PL Warehouse)", "North 3PL"], ["CN088954", "Hazmat (South 3PL Warehouse)", "South 3PL"], ["CN088955", "Hazmat (East 3PL Warehouse)", "East 3PL"], ["CN088956", "Hazmat (West 3PL Warehouse)", "West 3PL"], ["CN088957", "MB Car / Van (Kunshan) - RHVOR", "KS PDC"], ["CN088958", "MB Car / Van (Chengdu) - RHVOR", "CD PDC"]], ver:1, time:'2026-09-21'},
      {id:'map-c3-email', kind:'mapping', scope:'MBPLAP', name:'附件5_Mapping list_Email loop',
       desc:'发票和预报创建完成后，按 IES+ 识别出的 PDC 匹配回复邮件通知的收件人邮箱',
       cols:['Account Number','Description','对应PDC','反馈结果收件人邮箱'], rows:[["CN088933", "MB Car / Van (Beijing) - RHVOR", "BJ PDC", "yue.zy.zhang@mercedes-benz.com; yang.liu@bjfcl.com; lu.wang@bjfcl.com; na.he@bjfcl.com; yu.c.chen@mercedes-benz.com; afang.zhang@mercedes-benz.com; pek_prealert-dpts@mercedes-benz.com"], ["CN088943", "MB Car / Van (ShaoXing) - RHVOR", "SX PDC", "yongjian.sun@mercedes-benz.com; shichao.liu@mercedes-benz.com; huizhen.cai@mercedes.com; yaxun.huang@mercedes.com; daojia.lin@mercedes.com; lulu.shao@mercedes.com; zouxiaoli@nlocn.com; zhouyin@nlocn.com"], ["CN088953", "MB Car / Van (Guangzhou) - RHVOR", "GZ PDC", "nan.n.zhao@mercedes-benz.com; xinyi.wang@mercedes-benz.com; jinyan.sun@mercedes-benz.com; leqian.he@mercedes-benz.com; jialei.yue@adp.com.cn; hjxj@adp.com.cn; wenwen.gao@mercedes-benz.com; jianbo.wu@mercedes-benz.com"], ["CN081975", "Hazmat (North 3PL Warehouse)", "North 3PL", "dpts-peralertnorth@mwclg.com; chenps@mwclg.com; liuqian@mwclg.com; yu.c.chen@mercedes-benz.com; yue.zy.zhang@mercedes-benz.com; cs03@efs.com.cn"], ["CN088954", "Hazmat (South 3PL Warehouse)", "South 3PL", "nan.n.zhao@mercedes-benz.com; xinyi.wang@mercedes-benz.com; wenwen.gao@mercedes-benz.com; limx@mwclg.com; dingjq@mwclg.com"], ["CN088955", "Hazmat (East 3PL Warehouse)", "East 3PL", "yongjian.sun@mercedes-benz.com; huizhen.cai@mercedes-benz.com; chenps@mwclg.com"], ["CN088957", "MB Car / Van (Kunshan) - RHVOR", "KS PDC", "shichao.liu@mercedes-benz.com; yongjian.sun@mercedes-benz.com; tangxiang@nlocn.com; zhouyin@nlocn.com"], ["CN088956", "Hazmat (West 3PL Warehouse)", "West 3PL", "nan.n.zhao@mercedes-benz.com; xinyi.wang@mercedes-benz.com; wenwen.gao@mercedes-benz.com; zhangjin@mwclg.com; liubin@mwclg.com; liuqian@mwclg.com"], ["CN088958", "MB Car / Van (Chengdu) - RHVOR", "CD PDC", "nan.n.zhao@mercedes-benz.com; xinyi.wang@mercedes-benz.com; wenwen.gao@mercedes-benz.com; li.k.chen@mercedes-benz.com; junjie.li@mercedes-benz.com"]], ver:1, time:'2026-09-21'},
    ])},
  meta:CASE_META,
  ensure:ensureCase3Tasks,
  spTree:buildSharePointTree, spRecords:SP_SITE.records, spTip:SP_SITE.tip,
  waybillLabel:()=>'HAWB No.',
  rerun:'all',
  rerunText:()=>({lead:'Case 3 MBPLAP 预报邮件和发票、HAWB 等附件已归档；可从原始数据重新执行并记录校验结果。',
    tip:'原始邮件与附件已保存在操作日期 / HAWB 目录'}),
  /* 填写发票导入模板校验不通过：下载平台生成的模板 → 线下调整 → 上传修正模板 → 从「导入发票」续跑 */
  nodeFiles:{'*':{'填写发票导入模板':{file:t=>{ const r = t.runs[t.runs.length-1]; return (r.nodes[3].subs||[])[0] || '导入INV＆DN.xlsx'; },
    upload:true, continueNext:true,
    confirmLines:prev=>[`捕捉邮件 ~ 填写发票导入模板沿用 R#${prev} 结果，模板替换为上传文件`, '从「导入发票」开始执行：导入发票 → 创建预报 → 发送邮件通知', `修正模板存入该票归档文件夹；R#${prev} 保持只读`],
    afterUpload:(t, f, prevNo)=>{ t.fixTemplate = {name:f.name, time:now(), fromRun:prevNo}; }}}},
  hooks:{nodeOps:case3NodeOps, recordOp:case3RecordOp},
  demoTask:c3DemoTask,
  /* 任务中心查询：库房 = IES+ 返回的 PDC（仅有确定值的票）；单号 = HAWB No. */
  pdcOf:t=>{ const r = case3RunRecord(t), v = r ? r[1] : ''; return /PDC|3PL/.test(v) ? v : ''; },
  numLabel:()=>'HAWB No.', numKeys:t=>[t.waybill],
});
Object.assign(window, {CASE3_RUN_RECORD_COLS, case3RunRecord, case3RunRecords, case3Docs, CASE3_HOME_SAMPLES});
})();
