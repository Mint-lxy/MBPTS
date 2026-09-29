/* ===== data.js · Case 5 初始演示数据 + localStorage 持久化 ===== */
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

/* ==================== Case 5 其他种子数据 ==================== */
/* 邮件监听规则（BRD §3.1 / §3.2.3）：只有 X-entry 由邮件触发，MBPLAP 为定时触发不涉及邮件监听。
 * 监听邮箱：BRD 为「Portal 公邮」（未给出地址），演示取规则编辑器已有选项 asn@mb.cn。
 *   报关代理邮件：① 发件人邮箱后缀 @bjfcl.com ② 邮件标题含「快件签收单」；附件为 AF POD（快件签收单<日期>_dan.xlsx）
 *   PO 邮件：邮件标题 / 正文含 PO 号（按任务中取得的 MBPTS PO 动态检索）；Item Number 取自邮件中的 SPM 截屏 */
SEED.rules = [
  {id:'R-XE-FULLCOME', name:'报关代理邮件监控', line:'xentry',
   mail:'asn@mb.cn', prio:1, flow:'case-5-xentry', on:true, hits:2,
   crit:{from:'*@bjfcl.com', to:'', subj:'快件签收单', body:'', attMin:1, attMax:9},
   atts:[{role:'pod', type:'Excel', req:true, multi:false, re:'^快件签收单.*\.xlsx$'}]},
  {id:'R-XE-PO', name:'PO 邮件监控', line:'xentry',
   mail:'asn@mb.cn', prio:2, flow:'case-5-xentry', on:true, hits:1,
   crit:{from:'', to:'', subj:'{PO号}', body:'{PO号}', attMin:1, attMax:20},
   atts:[{role:'spm_screenshot', type:'图片', req:true, multi:true, re:'^image\d+\.png$'}]},
];
SEED.ioRecipients = [];
SEED.mailTemplates = [];
SEED.evidence = { trigger:[], process:[], operation:[] };
/* 站内提醒：两票 X-entry 待人工处理（与任务样例一致），点击进入任务详情 */
SEED.notify = [
  {t:'待人工处理 · 补传进口发票', x:'T-447033505062 · AWB 447033505062 · 按 AWB No. 查询系统库未找到进口发票，需到上传中心补传后整单重跑',
   tm:'04-07 13:54', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-447033505062'},
  {t:'待人工处理 · 录入 ID No.', x:'T-447033508863 · AWB 447033508863 · 诊断仪大表 ID No. 32882 无对应 MBPTS PO，流程已阻断；PO 补上后到上传中心录入 ID No.',
   tm:'04-07 13:54', read:false, ic:'a', sym:'!', link:'task-detail.html?id=T-447033508863'},
];
SEED.audit = [];
SEED.thresholds = {};
SEED.dimTables = [];
/* 配置中心 · 导入模板（line 与邮件监听同一套分组口径）
   BRD：MBPLAP 与 X-entry 共用同一份 9 列 DSS 导入模板（列结构取自 BRD 附件「DSS 导入模板.xlsx」），
   两条线的差异在字段来源、Vendor BP Number 与文件命名，故每条线各列一项 */
const DSS_TEMPLATE_COLS = ['ASN Number','Vendor BP Number （vendor code）','Delivery date','SPM Part Number','Quantity','Unit','SPM PO Number','SPM PO Item Number','ETA date'];
SEED.cfgItems = [
  {id:'cfg-mbplap-dss', line:'mbplap', name:'DSS 导入模板', file:'DSS 导入模板.xlsx', accept:'.xlsx',
   desc:'9 列 · 字段取自 IES+ 发票信息导出（parts.xlsx）· Vendor BP 191110510 · 命名 提单号_发票号（待 BU 确认）',
   cols:DSS_TEMPLATE_COLS, ver:1, time:'2026-09-27'},
  {id:'cfg-xentry-dss', line:'xentry', name:'DSS 导入模板', file:'DSS 导入模板.xlsx', accept:'.xlsx',
   desc:'9 列 · 字段取自诊断仪大表 / IMS PO 邮件 / 进口发票 · Vendor BP 191110260 · 命名 PN_日期（待 BU 确认）',
   cols:DSS_TEMPLATE_COLS, ver:1, time:'2026-09-27'},
];
/* 共享盘监听（触发方式之一）：Case5 由定时调度（MBPLAP）与邮件监听（X-entry）触发，不从共享盘抓取文件，
   因此此处不配置，字段留空并置灰；平台能力保留，其他 Case 需要时再填。 */
SEED.sharepoint = {dir:'', table:'', poll:''};
SEED.pool = [];
SEED.mails = [   /* 取自 BRD 附件邮件；6.2 报关代理邮件按 4.7 样例格式模拟（与任务样例一致） */
  {id:'M-5001', from:'xiaoning.xu@bjfcl.com', to:['asn@mb.cn'], subj:'快件签收单4.7专车运输', att:1},
  {id:'M-5002', from:'ying.c.zhang@mercedes-benz.com', to:['asn@mb.cn'], subj:'Xentry Replenishment Notice 260407', att:15},
  {id:'M-5003', from:'ying.c.zhang@mercedes-benz.com', to:['asn@mb.cn'], subj:'Dummy PO Creation Notice 260803', att:1},
  {id:'M-5004', from:'xiaoning.xu@bjfcl.com', to:['asn@mb.cn'], subj:'快件签收单6.2专车运输', att:1},
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
/* 上传中心提交记录（kind：invoice 进口发票补传 / receipt 手工收货录入 / idno 录入 ID No.） */
SEED.uploads = [
  {id:'UP-0001', kind:'receipt', time:'2026-05-29 15:20', content:'PO 5600321645 · QALCNSD26KIT501 · 98 PC', task:'', by:'erxiao', result:'已记入收货记录（手工）'},
];

/* ===== 状态持久化 ===== */
/* Case5 v4：按 Case2 框架重建 Case5 样例，换 key 使旧缓存自动重建 */
const LS_KEY = 'mbpts_proto_case5_state_v12';
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

const State = {
  data: null,
  load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        this.data = JSON.parse(raw);
        Object.keys(SEED).forEach(k=>{ if(this.data[k]===undefined) this.data[k]=deepClone(SEED[k]); });
        return;
      }
    }catch(e){}
    this.data = deepClone(SEED);
    this.save();
  },
  save(){
    if(this._t) clearTimeout(this._t);
    this._t = setTimeout(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(this.data)); }catch(e){} }, 120);
    if(window.updBadges) try{ updBadges(); }catch(e){}
  },
  reset(){
    localStorage.removeItem(LS_KEY);
    location.reload();
  },
  get tasks(){ return this.data.tasks; },
  get rules(){ return this.data.rules; },
  get evidence(){ return this.data.evidence; },
  get notify(){ return this.data.notify; },
  get audit(){ return this.data.audit; },
  get thresholds(){ return this.data.thresholds; },
  get sharepoint(){ return this.data.sharepoint; },
  get cfgItems(){ return this.data.cfgItems; },
  cfgItem(id){ return this.data.cfgItems.find(c=>c.id===id); },
  get pool(){ return this.data.pool; },
  get mails(){ return this.data.mails; },
  get templates(){ return this.data.templates; },
  get ioRecipients(){ return this.data.ioRecipients; },
  get mailTemplates(){ return this.data.mailTemplates; },
  get dimTables(){ return this.data.dimTables; },
  get dbviews(){ return this.data.dbviews; },
  task(id){ return this.data.tasks.find(t=>t.id===id); },
  rule(id){ return this.data.rules.find(r=>r.id===id); },
};

/* ===== 领域辅助 ===== */
function latestRun(t){ return t.runs.length ? t.runs[t.runs.length-1] : null; }
function runByNo(t, no){ return t.runs.find(r=>r.no===no) || null; }
function taskStatus(t){
  if(t.waitState) return 'WAIT_INPUT';
  const r = latestRun(t);
  return r ? r.st : 'CREATED';
}

const CASE_META = {
  'MBPLAP_DSS上传模板':  {rule:'—', trigger:'定时调度', perDay:2, total:0, avgDur:'—'},
  'X-entry_DSS上传模板': {rule:'—', trigger:'邮件触发', perDay:1, total:0, avgDur:'—'},
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
      node.err='系统库查不到进口发票：ASN Number（Our delivery note number）与 Shipment Date（Document date）无法取值。需到「上传中心 → 进口发票补传」上传该票发票后整单重跑。';
      node.evFiles=[[c.ims+'.msg','1.1 MB'],[m.subj+'.msg','101 KB']];
      return node;
    }
    if(i===1){
      node.st='review';
      node.d='诊断仪大表顶部灰色区未找到 ID No. '+c.id+' 对应的 MBPTS PO，待人工处理';
      node.err='MBPTS PO 为空：报错转人工，并阻断流程。如果后续有 PO，需到「上传中心 → 录入 ID No.」输入 ID No.，等待下一次运行继续流程。';
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
    {k:'ID No.（J 列 · 顶部灰色区无对应 PO，请到上传中心录入 ID No.）',v:c.id,src:'系统',conf:0,quality:'低',low:true,docIndex:0,page:1,locator:true},
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
 * 存放流程运行过程中产生与归档的文件。BRD 未定义归档目录，按业务确认的口径：
 *   根目录：诊断仪大表（! Star D orders_new_Since Aug. 8 handled by IE.xlsx，单独一个文件，只放一份）
 *   MBPLAP  \ <运行时间 YYYYMMDD_HHmm> \ 填好的 DSS 模板
 *   X-entry \ <运行时间 YYYYMMDD_HHmm> \ 填好的 DSS 模板 + 进口发票 + 报关代理附件
 * 进口发票、报关代理附件 BRD 未要求改名，保持原名（BRD 样例：524241793610.pdf、快件签收单2026年4月7日_dan.xlsx）。
 * 只归档已产出的文件：未完成的票没有 DSS 模板与进口发票。
 */
const SP_TYPE = {xlsx:'Microsoft Excel 工作表', pdf:'Adobe Acrobat 文档'};
function spFile(name, time, size){
  const ext = /\.xlsx?$/i.test(name) ? 'xlsx' : 'pdf';
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
  let diagTime = '';
  HOME_TASKS.forEach(sample=>{
    const wb = sample.waybill, done = sample.status==='completed';
    if(sample.mode==='mbplap'){
      const c = mbplapCase(wb);
      if(!done || !c.inv) return;
      const t = c.created+' '+c.run;
      spDir(spDir(root,'MBPLAP'), spRunFolder(c.created, c.run)).children.push(spFile(mbplapDssName(c, wb), t, '9 KB'));
      return;
    }
    const c = xentryCase(wb), m = fullcomeMail(c), t = c.mailDay+' '+m.time;
    const dir = spDir(spDir(root,'X-entry'), spRunFolder(c.mailDay, m.time));
    if(!dir.children.some(f=>f.name===m.att)) dir.children.push(spFile(m.att, t, '19 KB'));
    if(t>diagTime) diagTime = t;
    if(!done || !c.invoice) return;
    dir.children.push(spFile(xentryDssName(c), t, '9 KB'), spFile(c.invoice.file, t, '156 KB'));
  });
  root.children.push(spFile(DIAG_TABLE, diagTime, '7.2 MB'));
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
    return {...sample,status:st==='SUCCEEDED'?'completed':['RUNNING','DISPATCHED'].includes(st)?'running':'manual'};
  });
}
State.load();
ensureWorkbenchTasks();
/* 清理旧缓存：只保留 workbench 生成的任务 */
(function(){
  var before = State.tasks.length;
  State.data.tasks = State.tasks.filter(function(t){ return t.demoWorkbench; });
  if(State.tasks.length !== before) State.save();
})();