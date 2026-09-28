/* ===== data.js · Case 2 初始演示数据 + localStorage 持久化 ===== */
const SEED = {};
/* 演示任务的运行日期取连续三个周一（BRD：每周一运行上周一至周日的数据），
   已完成的票在较早的运行周，执行中与待人工处理的票在最近一周。 */
const HOME_TASKS = [
  {waybill:'OOLU2036726960',mode:'glc',date:'2026-08-31',status:'completed'},
  {waybill:'OOLU2038969910',mode:'glc',date:'2026-08-31',status:'completed'},
  {waybill:'OOLU2040123456',mode:'glc',date:'2026-09-07',status:'completed'},
  {waybill:'OOLU2041567890',mode:'glc',date:'2026-09-14',status:'running'},
  {waybill:'OOLU2042999001',mode:'glc',date:'2026-09-14',status:'manual'},
  {waybill:'NAM8646083',mode:'mbusi',date:'2026-08-31',status:'completed'},
  {waybill:'NAM8646084',mode:'mbusi',date:'2026-09-07',status:'completed'},
  {waybill:'NAM8646085',mode:'mbusi',date:'2026-09-14',status:'running'},
  {waybill:'NAM8646086',mode:'mbusi',date:'2026-09-14',status:'manual'},
  {waybill:'NAM8646087',mode:'mbusi',date:'2026-09-07',status:'completed'},
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

/* ==================== Case 2 任务数据 ==================== */
SEED.tasks = [];

/* ===== 节点级证据截图 ===== */
(function applyNodeEvidence(){
  /* SEED.tasks 为空，证据由 ensureWorkbenchTasks 动态生成 */
})();

/* ==================== Case 2 其他种子数据 ==================== */
/* 邮件监听规则：line 决定归属线路分组，crit.subj 为邮件标题关键词（监听的核心条件） */
SEED.rules = [
  {id:'R-GLC-AVIS', name:'AVIS 监控', line:'glc',
   mail:'ie-import@mb.cn', prio:1, flow:'case-2-glc', on:true, hits:86,
   crit:{from:'', to:'ie-import@mb.cn', subj:'AVIS', body:'', attMin:1, attMax:4},
   atts:[{role:'avis', type:'PDF', req:true, multi:false, re:'^Avis_\\d+\\.pdf$'}]},
  {id:'R-GLC-SHIPPER', name:'Shipper 监控', line:'glc',
   mail:'ie-import@mb.cn', prio:2, flow:'case-2-glc-dg', on:true, hits:18,
   crit:{from:'mbox-006-gsp-lsa-vds2@mercedes-benz.com', to:'', subj:'Shippers_Decl', body:'', attMin:1, attMax:2},
   atts:[{role:'shipper_decl', type:'PDF', req:true, multi:false, re:'^Shippers_Decl_\\d+.*$'}]},
  {id:'R-GLC-BL', name:'BL 监控', line:'glc',
   mail:'ie-import@mb.cn', prio:3, flow:'case-2-glc', on:true, hits:72,
   crit:{from:'', to:'ie-import@mb.cn', subj:'Bill of Landing', body:'', attMin:1, attMax:3},
   atts:[{role:'bl', type:'PDF', req:true, multi:false, re:'^\\d+-\\d+\\.PDF$'}]},
  {id:'R-MBUSI-BL', name:'提单邮件监控', line:'mbusi',
   mail:'ie-import@mb.cn', prio:1, flow:'case-2-mbusi', on:true, hits:45,
   crit:{from:'website-noreply@cma-cgm.com', to:'', subj:'CMA CGM - 海运提单(Seaway Bill)可供使用', body:'', attMin:1, attMax:2},
   atts:[{role:'bl', type:'PDF', req:true, multi:false, re:'.*\\.PDF$'}]},
];
SEED.ioRecipients = [];
SEED.mailTemplates = [];
SEED.evidence = { trigger:[], process:[], operation:[] };
SEED.notify = [];
SEED.audit = [];
SEED.thresholds = {};
SEED.dimTables = [];
/* 配置中心 · 导入模板与对应关系表（line 与邮件监听同一套分组口径）
   列结构取自 BRD：AVIS fig-24 / BL fig-50 / Shipping Log fig-10 / 港口信息 AVIS detail list Sheet2 */
SEED.cfgItems = [
  {id:'cfg-glc-avis', line:'glc', name:'AVIS 导入模板', file:'AVIS.xlsx', accept:'.xlsx',
   desc:'7 列 · IES+「批量导入 AVIS」使用，字段取自 AVIS PDF',
   cols:['AVIS/Shipping Log No.','MBZ /BOL','Container No.','Container Type','Seal Number','Container VOL(m³)','Container Load(KG)'],
   ver:1, time:'2026-08-25 11:38'},
  {id:'cfg-glc-bl', line:'glc', name:'BL 导入模板', file:'BL.xlsx', accept:'.xlsx',
   desc:'9 列 · IES+「集装箱信息」导入使用，字段取自 BL PDF',
   cols:['No.','Shipping log No./ AVIS No.','HAWB / BL No.','Container No.','Container Type','Seal No.','Package Qty','Container Load(KG)','Container VOL(m³)'],
   ver:1, time:'2026-08-25 13:37'},
  {id:'cfg-glc-port', line:'glc', name:'IES 系统 Port 和英文对应表', file:'港口信息对应表.xlsx', accept:'.xlsx',
   desc:'生成预报时把提单英文港口名换成 IES+ 的港口名称 · 由业务维护',
   cols:['英文港口名','IES 港口名称','备注'],
   ver:2, time:'2026-09-02 09:15'},
  {id:'cfg-mbusi-bl', line:'mbusi', name:'BL 导入模板', file:'BL.xlsx', accept:'.xlsx',
   desc:'9 列 · IES+「集装箱信息」导入使用，字段取自 CMA CGM 提单',
   cols:['No.','Shipping log No./ AVIS No.','HAWB / BL No.','Container No.','Container Type','Seal No.','Package Qty','Container Load(KG)','Container VOL(m³)'],
   ver:1, time:'2026-08-25 17:02'},
  {id:'cfg-mbusi-slog', line:'mbusi', name:'Shipping Log 导入模板', file:'Shipping Log.xlsx', accept:'.xlsx',
   desc:'7 列 · 基础字段取自 gvShipLog，体积重量回填自 BL',
   cols:['AVIS/Shipping Log No.','MBZ /BOL','Container No.','Container Type','Seal Number','Container VOL(m³)','Container Load(KG)'],
   ver:1, time:'2026-08-25 16:52'},
];
/* 共享盘监听（触发方式之一）：Case2 由邮件监听触发，不从共享盘抓取文件，
   因此此处不配置，字段留空并置灰；平台能力保留，其他 Case 需要时再填。 */
SEED.sharepoint = {dir:'', table:'', poll:''};
SEED.pool = [];
SEED.mails = [
  {id:'M-5001', from:'avis@oocl.com', to:['ie-import@mb.cn'], subj:'AVIS - Shanghai S/260915', att:1},
  {id:'M-5002', from:'bl@oocl.com', to:['ie-import@mb.cn'], subj:'Bill of Landing OOLU2036726960', att:1},
  {id:'M-5003', from:'website-noreply@cma-cgm.com', to:['ie-import@mb.cn'], subj:'CMA CGM - 海运提单(Seaway Bill)可供使用 NAM8646083', att:1},
  {id:'M-5004', from:'mbox-006-gsp-lsa-vds2@mercedes-benz.com', to:['ie-import@mb.cn'], subj:'Shippers_Decl_260915-002_1', att:1},
];
SEED.templates = [];
SEED.dbviews = [];

/* ===== 状态持久化 ===== */
/* v8：演示任务日期改为每周一、运行周统一推导，换 key 使旧缓存自动重建 */
const LS_KEY = 'mbpts_proto_case2_state_v8';
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
  'AVIS 与 BL 创建（GLC）':          {rule:'—', trigger:'定时调度', perDay:2, total:86, avgDur:'10m 05s'},
  'MBUSI Shipping Log 与 BL 创建':   {rule:'—', trigger:'定时调度', perDay:1, total:45, avgDur:'8m 12s'},
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

/* ==================== Case 2 · AVIS（欧线 GLC / OOCL）业务样例 ====================
 * 取值依据：BRD【MBPTS-UC34】case 2：AVIS_BL_Automation_BRD_0920.md 与简化版 PDF。
 * 字段映射：fig-22/23/24（AVIS PDF → AVIS.xlsx）、fig-50/51/52（BL PDF → BL.xlsx）、
 *          fig-05（AVIS BL status report 列位）、fig-19（文件夹应含文件）、
 *          fig-34（DG FOB 价格差异公式）、fig-43/46（生成预报字段）、
 *          fig-59（集装箱导入差异项弹窗）、fig-65（IES+ 文档类别）。
 * BRD 11 步流程 → demo 7 节点：2.1~2.4 归入节点1，字段抽取独立为节点2（解析节点），
 *          2.5→节点3，2.6→节点4，2.7+2.8→节点5，2.9+2.10→节点6，2.11→节点7。
 */
const CASE2_TDRIVE = 'T:\\MBPTS\\IE\\11. RPA\\10. AVIS Shipping log 海运进口预报创建';
const AVIS_SENDER_AVIS = 'mbox-006-gsp-lsa-vds2@mercedes-benz.com';
const AVIS_SENDER_BL = 'DO_NOT_REPLY_BL_ISSUE@oocl.com';
/* 每票的业务标识：AVIS 号、PDC、港口、船名航次、ETA、集装箱与体积重量、是否 DG */
const AVIS_CASES = {
  'OOLU2036726960':{avis:'527452',cust:'CN819505',pdc:'GZ PDC',dep:'ROTTERDAM',arr:'SHANGHAI',
    vessel:'OOCL SWEDEN 008 E',eta:'2026.08.17',dg:false,inv:18,mbz:'6535025526',
    ctn:'OOLU6750777',ctype:"40'",seal:'OOLKVL0458',pkg:'68',vol:'27.111',kg:'6179.1'},
  'OOLU2038969910':{avis:'400759',cust:'CN819505',pdc:'GZ PDC',dep:'ROTTERDAM',arr:'SHANGHAI',
    vessel:'OOCL SWEDEN 008 E',eta:'2026.09.29',dg:true,inv:22,mbz:'6535025526',
    ctn:'OOLU6750777',ctype:"40'",seal:'OOLKVL0458',pkg:'68',vol:'27.111',kg:'6179.1',
    fob:[['1063075984','221.43'],['1063075983','2265.57']]},
  'OOLU2040123456':{avis:'404076',cust:'CN819505',pdc:'GZ PDC',dep:'ROTTERDAM',arr:'HUANGPU',
    vessel:'OOCL PORTUGAL 012 E',eta:'2026.10.06',dg:false,inv:15,mbz:'6535027781',
    ctn:'OOLU7742301',ctype:"40'",seal:'OOLKVL1182',pkg:'52',vol:'24.860',kg:'5320.4'},
  'OOLU2041567890':{avis:'404077',cust:'CN819505',pdc:'GZ PDC',dep:'ROTTERDAM',arr:'HUANGPU',
    vessel:'OOCL PORTUGAL 012 E',eta:'2026.10.13',dg:false,inv:19,mbz:'6535027905',
    ctn:'OOLU7815566',ctype:"40'",seal:'OOLKVL1264',pkg:'61',vol:'26.045',kg:'5884.2'},
  /* 差异票：接口值（AVIS 明细）与提单值不一致，数值取自 fig-59 差异项弹窗 */
  'OOLU2042999001':{avis:'409523',cust:'CN819505',pdc:'GZ PDC',dep:'ROTTERDAM',arr:'HUANGPU',
    vessel:'EVER ACE 019 E',eta:'2026.10.20',dg:false,inv:21,mbz:'6535028140',
    ctn:'OOCU8811345',ctype:"40'",seal:'OOLKVK7520',pkg:'28',vol:'41.511',kg:'2835.1',
    diff:[['G.W','2835.1','2645.1','190'],['QTY','28','20','8'],['VOL','41.511','31.68','9.831']],
    blPkg:'20',blVol:'31.68',blKg:'2645.1'},
};
function avisCase(waybill){ return AVIS_CASES[waybill] || AVIS_CASES['OOLU2038969910']; }
/* 文件夹命名：Shippers Ref + OOLU+AWB/B/L No. + ETA + 日期（DG 货物追加 DG） */
function avisFolder(c, wb){ return c.avis+' '+wb+' ETA '+c.eta+(c.dg?' DG':''); }
function avisFileNames(c, wb){
  return {avis:'Avis_'+c.avis+'.pdf', bl:'BL_'+wb+'.PDF', sh:'Shippers_Decl_'+c.avis+'.pdf',
    rawBl:wb.replace(/^OOLU/,'')+'-20260401092243.PDF'};
}
/* 7 节点轨迹（含节点级证据截图与附件） */
function avisNodes(c, wb){
  const f = avisFileNames(c, wb), folder = avisFolder(c, wb);
  const crossLines = c.diff
    ? c.diff.map(d=>d[0]+' 接口值 '+d[1]+' / 提单值 '+d[2]+' → 差异 '+d[3])
    : ['Package Qty '+c.pkg+' 一致','Container VOL '+c.vol+' m³ 一致','Container Load '+c.kg+' KG 一致'];
  return [
    {n:'下载 AVIS / Shipper / BL', st:'ok',
     d:'每周一 09:00 · 上周一至周日 · Portal 公邮',
     okDesc:'AVIS / '+(c.dg?'Shipper / ':'')+'BL 已归档并按规范重命名',
     subs:[f.avis].concat(c.dg?[f.sh]:[]).concat([f.bl]),
     ev:[{type:'rule',title:'定时触发',lines:['每周一 09:00 运行','范围：上周一 ~ 上周日','来源：Portal 公邮（可配置）']},
         {type:'email',title:'AVIS 邮件命中',lines:['发件人 '+AVIS_SENDER_AVIS,'标题含 AVIS：Avis_'+c.avis,'附件 '+f.avis+'（39 KB）']}]
       .concat(c.dg?[{type:'email',title:'Shippers_Decl 命中 → DG',lines:['标题 Shippers_Decl_'+c.avis+'_1','与 AVIS 同日送达公邮','判定 DG：文件夹追加 DG 后缀']}]:[])
       .concat([{type:'email',title:'BL 邮件命中',lines:['OOCL Provided Documents','OOCL - Copy Bill of Lading for '+wb,'附件 '+f.rawBl+'（37 KB）']},
         {type:'file',title:'T 盘归档与命名',lines:[CASE2_TDRIVE,c.pdc+'\\GLC\\'+runWeek(wb)+'\\'+folder,'重命名 '+f.bl+' · 放入 AVIS.xlsx / BL.xlsx']}]),
     evFiles:[[f.avis,'39 KB']].concat(c.dg?[[f.sh,'0.28 MB']]:[]).concat([[f.bl,'37 KB'],['AVIS.xlsx','24 KB'],['BL.xlsx','22 KB']])},

    {n:'OCR 识别', st:'ok',
     d:'AVIS PDF 2 页 + BL PDF · 字段 17 项',
     okDesc:'字段抽取完成 · AVIS 与 BL 交叉核对通过',
     subs:[f.avis, f.bl],
     ev:[{type:'ocr',title:'AVIS PDF 字段抽取',lines:['Shippers Ref. '+c.avis+' · AWB/B/L '+wb.replace(/^OOLU/,''),'Arrival '+c.arr+' · ETA '+c.eta,'MBZ '+c.mbz+' · Customer code '+c.cust]},
         {type:'ocr',title:'BL PDF 字段抽取',lines:['SEA WAYBILL NO. '+wb,'SHPR REF '+c.avis+' → 匹配已登记 AVIS','CNTR '+c.ctn+' · SEAL '+c.seal]},
         {type:'table',title:'Customer code → PDC 映射',lines:[c.cust+' → '+c.cust.replace(/^CN/,'')+' → Guangzhou','PDC = '+c.pdc,'未命中配置表则建 Other 并记异常']},
         {type:'check',title:'AVIS ⇄ BL 交叉核对',lines:crossLines}],
     evFiles:[['OCR_AVIS_字段抽取.json','9 KB'],['OCR_BL_字段抽取.json','7 KB'],['PDC_映射校验.xlsx','15 KB']]},

    {n:'写入 AVIS 模板', st:'ok',
     d:'AVIS.xlsx · 7 列全部取自 AVIS PDF',
     okDesc:'AVIS.xlsx 写入完成 · 必填校验通过',
     subs:['AVIS.xlsx'],
     ev:[{type:'table',title:'AVIS.xlsx 写入结果',lines:['AVIS/Shipping Log No. '+c.avis+' · MBZ '+c.mbz,'Container '+c.ctn+' · '+c.ctype+' · Seal '+c.seal,'VOL '+c.vol+' m³ · Load '+c.kg+' KG']},
         {type:'check',title:'单位换算与必填校验',lines:['体积：AVIS 明细合计 ÷ 1000 → '+c.vol,'重量：德式小数转换 → '+c.kg,'7 个必填列均有值，允许上传']}],
     evFiles:[['AVIS.xlsx','26 KB']]},

    {n:'写入 BL 模板', st:'ok',
     d:'BL.xlsx · 9 列取自 BL PDF',
     okDesc:'BL.xlsx 写入完成 · 单位已统一',
     subs:['BL.xlsx'],
     ev:[{type:'table',title:'BL.xlsx 写入结果',lines:['Shipping log No./AVIS No. '+c.avis,'HAWB / BL No. '+wb+' · Package Qty '+(c.blPkg||c.pkg),'Container Type 40HQ → '+c.ctype]},
         {type:'check',title:'BL 取值口径',lines:['Container Load(KG) '+(c.blKg||c.kg),'Container VOL(m³) '+(c.blVol||c.vol),"Container Type 单位统一为 '"]}],
     evFiles:[['BL.xlsx','24 KB']]},

    {n:'导入 AVIS 模板', st:'ok',
     d:'IES+ 发票信息 · 批量导入 AVIS'+(c.dg?' · DG FOB 处理':''),
     okDesc:'AVIS 导入成功 · 回写状态报告 G 列',
     subs:['AVIS.xlsx'].concat(c.dg?['发票_invoice级导出.xlsx']:[]),
     ev:[{type:'screen',title:'IES+ MBZ/DN 查询',lines:['进口管理 → 发票信息 → 点击查询','MBZ '+c.mbz,'共 '+c.inv+' 张发票']},
         {type:'screen',title:'批量导入 AVIS',lines:['导入 → 批量导入 AVIS','选择 AVIS.xlsx · 绿灯后点击上传','回写 G 列 AVIS creation = Y']}]
       .concat(c.dg?[{type:'check',title:'DG · FOB Charges 核对',lines:['价格差异 = Total − Goods − Packing − Insurance − Freight − DGR']
         .concat((c.fob||[]).map(x=>'发票 '+x[0]+' 差异 '+x[1])).concat(['核对 PDF 发票后填入 Others 并保存'])}]:[]),
     evFiles:[['IES_发票查询_'+c.inv+'张.png','180 KB']]
       .concat(c.dg?[['发票_invoice级导出.xlsx','96 KB'],['FOB_差异核对.xlsx','22 KB']]:[])},

    {n:'导入 BL 模板', st:'ok',
     d:'生成预报 + 集装箱信息导入',
     okDesc:'导入成功 · 生成台账成功',
     subs:['BL.xlsx'],
     ev:[{type:'screen',title:'生成预报',lines:['HAWB/BL NO. '+wb,'Flight NO./Vessels NO. '+c.vessel,'DG '+(c.dg?'Y':'N')+' · '+c.dep+' → '+c.arr]},
         {type:'screen',title:'集装箱信息导入',lines:['进口预报 → 修改 → 集装箱信息 → 导入','选择 BL.xlsx · 绿灯后点击上传','✓ 导入成功    ✓ 生成台账成功']}],
     evFiles:[['预报生成_回执.png','150 KB'],['BL_导入成功_台账.png','168 KB']]},

    {n:'上传原始文件', st:'ok',
     d:'IES+ 文档资料上传 · 回写状态报告',
     okDesc:'附件上传完成 · 状态报告已回写',
     subs:[f.avis].concat(c.dg?[f.sh]:[]).concat([f.bl,'AVIS_BL_status_report.xlsx']),
     ev:[{type:'screen',title:'IES+ 文档资料上传',lines:[f.avis+' → 类别 Others']
           .concat(c.dg?[f.sh+' → 类别 Shipper decl']:[]).concat([f.bl+' → 类别 BL','单文件 ≤ 50M · PDF/EXCEL/MSG 等'])},
         {type:'table',title:'AVIS BL status report 回写',lines:['G AVIS creation = Y · J BL Creation = Y','H/K/N PDF Upload = Y'+(c.dg?' · M Shipper exsit = Y':''),'L BL different / P 异常反馈：空']}],
     evFiles:[['IES_文档资料_上传回执.png','142 KB'],['AVIS_BL_status_report.xlsx','86 KB']]},
  ];
}
/* 未完成形态：解析节点（索引 1 · OCR 识别）停在执行中 / 待人工处理，其后节点剪枝 */
function avisPrunedNodes(c, wb, st){
  return avisNodes(c, wb).map((node,i)=>{
    if(i===0) return node;
    if(i===1){
      node.st = st==='RUNNING' ? 'run' : 'review';
      node.d  = st==='RUNNING' ? 'AVIS / BL 字段抽取执行中…' : 'AVIS 与 BL 交叉核对存在差异，待人工处理';
      return node;
    }
    node.st='queued'; node.d='等待前序节点完成';
    delete node.ev; delete node.evFiles;
    return node;
  });
}
/* 解析节点字段：AVIS.xlsx 与 BL.xlsx 的取值来源（docIndex 0=AVIS PDF，1=BL PDF） */
function avisFields(c, wb){
  return [
    {k:'AVIS No.（Shippers Ref.）',v:c.avis,src:'OCR',conf:99,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Customer code',v:c.cust,src:'OCR',conf:98,quality:'高',docIndex:0,page:1,locator:true},
    {k:'PDC',v:c.pdc,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'由 Customer code 对应关系表映射，无原文坐标'},
    {k:'AWB / B/L No.',v:wb.replace(/^OOLU/,''),src:'OCR',conf:98,quality:'高',docIndex:0,page:1,locator:true},
    {k:'BL No.（加 OOLU）',v:wb,src:'OCR',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'Port（Arrival）',v:c.arr,src:'OCR',conf:97,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Departure',v:c.dep,src:'OCR',conf:97,quality:'高',docIndex:0,page:1,locator:true},
    {k:'ETA Date',v:c.eta,src:'OCR',conf:96,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Flight No. / Vessel Name',v:c.vessel,src:'OCR',conf:96,quality:'高',docIndex:0,page:1,locator:true},
    {k:'MBZ /BOL',v:c.mbz,src:'OCR',conf:95,quality:'高',docIndex:0,page:2,locator:true},
    {k:'Container No.',v:c.ctn,src:'OCR',conf:94,quality:'中',docIndex:0,page:2,locator:true},
    {k:'Container Type',v:c.ctype,src:'规则',conf:100,quality:'规则确定',docIndex:1,page:1,locator:true},
    {k:'Seal Number',v:c.seal,src:'OCR',conf:96,quality:'高',docIndex:0,page:2,locator:true},
    {k:'Package Qty',v:c.pkg,src:'OCR',conf:95,quality:'高',docIndex:0,page:2,locator:true},
    {k:'Container VOL(m³)',v:c.vol,src:'OCR',conf:93,quality:'中',docIndex:0,page:2,locator:true},
    {k:'Container Load(KG)',v:c.kg,src:'OCR',conf:93,quality:'中',docIndex:0,page:2,locator:true},
    {k:'DG 标识',v:c.dg?'Y':'N',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'由 Shippers_Decl 是否命中判定，无原文坐标'},
  ];
}
/* 差异票：与提单值不一致的三项标为低质量，在字段列表中金色高亮 */
function avisMarkDiff(fields, c){
  const low = {'Container Load(KG)':79,'Package Qty':76,'Container VOL(m³)':78};
  fields.forEach(f=>{ if(low[f.k]!==undefined){ f.low=true; f.quality='低'; f.conf=low[f.k]; } });
}
/* 原文预览文件：AVIS PDF（2 页）、BL PDF（1 页）、DG 票附 Shipper（2 页） */
function avisFiles(c, wb){
  const f = avisFileNames(c, wb);
  const files = [{name:f.avis,pages:2},{name:f.bl,pages:1}];
  if(c.dg) files.push({name:f.sh,pages:2});
  return files;
}

/* ==================== Case 2 · MBUSI（美线 CMA CGM）业务样例 ====================
 * 取值依据：BRD【MBPTS-UC34】case 2：MBUSI_Shipping_Log_BL_Automation_BRD_0920.md。
 * 字段映射：fig-04/05（gvShipLog 列位 → 状态报告美线 sheet）、fig-10（Shipping Log.xlsx）、
 *          fig-13（BL PDF → BL.xlsx）、fig-15（文件夹应含文件）、fig-20（生成预报字段）、
 *          fig-26（集装箱台账与生成台账成功）、fig-29（IES+ 文档类别 BL）。
 * 10 节点对应：下载 gvShipLog → 拆分子表 → 填 Shipping Log → 下载邮件附件 → OCR 识别
 *          → 填 BL 模板（并回填 VOL/Load）→ 导入 Shipping Log → 生成预报 → 导入 BL 模板 → 上传 BL PDF。
 */
const MBUSI_SITE = 'Mercedes-Benz North America Central Warehouse';
const MBUSI_SENDER_BL = 'website-noreply@cma-cgm.com';
/* ctns 每项：[Container No., Seal No., Package Qty, Container Load(KG), Container VOL(m³)] */
const MBUSI_CASES = {
  'NAM8646083':{slf:'SLGZNAM8646083',pdc:'Guangzhou',dep:'Savannah',depCn:'萨凡纳（美国）',
    arr:'Huangpu',arrCn:'黄埔港务码头',vessel:'CMA CGM J.ADAMS 0XRBEW1MA',eta:'2026.10.05',
    created:'2026-09-28',inv:6,
    bol:['10889847','10889848','10889921','10890013','10890015','10890034'],
    ctns:[['CMAU9676069','7937096','24','2223','48.943'],['ECMU7114194','7940010','8','746','50.75'],
          ['BEAU5627639','7937149','20','3077','47.943'],['CMAU4445370','7940013','9','748.5','52.839']],
    totPkg:'61',totKg:'6794.5',totVol:'200.475'},
  'NAM8646084':{slf:'SLKSNAM8646084',pdc:'Kunshan',dep:'Savannah',depCn:'萨凡纳（美国）',
    arr:'Shanghai',arrCn:'上海港务码头',vessel:'C. C. MEXICO 0XRBGW1MA',eta:'2026.10.08',
    created:'2026-09-29',inv:5,
    bol:['10890112','10890118','10890124','10890131','10890140'],
    ctns:[['GCXU5855254','7937137','22','2105','46.320'],['ECMU5541962','7940026','14','1580','44.870'],
          ['TCLU9818491','7937886','18','2460','45.115']],
    totPkg:'54',totKg:'6145',totVol:'136.305'},
  'NAM8646085':{slf:'SLHZNAM8646085',pdc:'Hangzhou',dep:'Savannah',depCn:'萨凡纳（美国）',
    arr:'Shanghai',arrCn:'上海港务码头',vessel:'C. C. MEXICO 0XRBGW1MA',eta:'2026.10.12',
    created:'2026-10-05',inv:7,
    bol:['10890205','10890211','10890219','10890226','10890233','10890241','10890250'],
    ctns:[['CMAU5628150','7937887','26','2890','49.204'],['CMAU6459096','7937876','12','1340','43.660'],
          ['TCLU9673037','7937917','21','2755','47.880']],
    totPkg:'59',totKg:'6985',totVol:'140.744'},
  /* 差异票：Shipping Log 子表漏数，件数/重量/体积与提单不一致（BRD 异常流程需人工处理） */
  'NAM8646086':{slf:'SLGZNAM8646086',pdc:'Guangzhou',dep:'Savannah',depCn:'萨凡纳（美国）',
    arr:'Huangpu',arrCn:'黄埔港务码头',vessel:'CMA CGM J.ADAMS 0XRBEW1MA',eta:'2026.10.15',
    created:'2026-10-06',inv:6,
    bol:['10890318','10890325','10890333','10890340','10890348','10890357'],
    ctns:[['FDCU0011005','7940020','19','2240','45.930'],['TRHU7523086','7937890','23','3010','48.115'],
          ['SEGU4694167','7937889','16','1785','44.220']],
    totPkg:'58',totKg:'7035',totVol:'138.265',
    diff:[['Package Qty','58','61','3'],['Container Load(KG)','7035','7320','285'],
          ['Container VOL(m³)','138.265','142.880','4.615']],
    blPkg:'61',blKg:'7320',blVol:'142.880'},
  'NAM8646087':{slf:'SLKSNAM8646087',pdc:'Kunshan',dep:'Savannah',depCn:'萨凡纳（美国）',
    arr:'Shanghai',arrCn:'上海港务码头',vessel:'C. C. MEXICO 0XRBGW1MA',eta:'2026.10.19',
    created:'2026-10-12',inv:4,
    bol:['10890402','10890409','10890417','10890424'],
    ctns:[['SEGU6427909','7937884','20','2380','46.505'],['TIIU8116389','7937805','15','1690','43.940']],
    totPkg:'35',totKg:'4070',totVol:'90.445'},
};
function mbusiCase(waybill){ return MBUSI_CASES[waybill] || MBUSI_CASES['NAM8646083']; }
/* 文件夹命名：<BL 号> ETA <YYYY.MM.DD>，位于 <PDC>\MBUSI\<运行周> 下 */
function mbusiFolder(c, wb){ return wb+' ETA '+c.eta; }
function mbusiFileNames(c, wb){
  return {bl:'BL_'+wb+'.pdf', sub:'Shipping log information_'+wb+'.xlsx',
    slog:'Shipping Log.xlsx', blx:'BL.xlsx', exp:'gvShipLog.xlsx'};
}
function mbusiNodes(c, wb){
  const f = mbusiFileNames(c, wb), folder = mbusiFolder(c, wb);
  const ctnLines = c.ctns.map(x=>x[0]+' / '+x[1]+' / '+x[2]+' 件 / '+x[3]+' KG / '+x[4]+' m³');
  const crossLines = c.diff
    ? c.diff.map(d=>d[0]+' 子表 '+d[1]+' / 提单 '+d[2]+' → 差异 '+d[3])
    : ['集装箱号与铅封与 gvShipLog 一致','件数合计 '+c.totPkg+' 件','重量 '+c.totKg+' KG · 体积 '+c.totVol+' m³'];
  return [
    {n:'下载美国 gvShipLog', st:'ok',
     d:'每周一 09:00 · 上周一至周日 · 美国中央仓网站',
     okDesc:'gvShipLog 已导出 · 新增记录已识别',
     subs:[f.exp],
     ev:[{type:'rule',title:'定时触发',lines:['每周一 09:00 运行','范围：上周一 ~ 上周日','权限受限时可改为读取 T 盘报告']},
         {type:'screen',title:'网站导出',lines:[MBUSI_SITE,'Customer → Shipments → MB China','Export to Excel → 默认文件名 gvShipLog']},
         {type:'table',title:'新增记录识别',lines:['O 列 Created 落在上周一 ~ 周日 · '+c.created,'与状态报告美线 sheet 对碰防重','本票 D 列 Booking Number = '+wb]}],
     evFiles:[[f.exp,'1.8 MB']]},

    {n:'拆分 Booking No. 子表', st:'ok',
     d:'同一 Booking No. 的行集单独保存',
     okDesc:'子表已生成 · PDC 文件夹已建立',
     subs:[f.sub, f.slog, f.blx],
     ev:[{type:'table',title:'按提单拆分',lines:['Booking Number '+wb+' → '+c.bol.length+' 行','子表 '+f.sub,'仅保留该提单相关行集']},
         {type:'file',title:'T 盘归档',lines:[CASE2_TDRIVE,c.pdc+'\\MBUSI\\'+runWeek(wb)+'\\'+folder,'同时放入 '+f.slog+' / '+f.blx+' 模板']},
         {type:'table',title:'状态报告登记',lines:['C 列 PDC '+c.pdc+' · D 列 Port '+c.arr,'E 列 Shipping Log No '+c.slf,'F 列 Booking Number · G 列 ETA Date '+c.eta]}],
     evFiles:[[f.sub,'13 KB'],[f.slog,'15 KB'],[f.blx,'13 KB']]},

    {n:'填入 Shipping Log 模板', st:'ok',
     d:'Shipping Log.xlsx · 基础字段取自 gvShipLog',
     okDesc:'基础字段写入完成 · 体积重量待 BL 回填',
     subs:[f.slog],
     ev:[{type:'table',title:'基础字段写入',lines:['A ← D 列 Booking Number '+wb,'B ← M 列 BOL（'+c.bol.length+' 行）'+c.bol.slice(0,2).join('、')+' …','C/D/E ← J/K/L 列 集装箱 / 类型 / 铅封']},
         {type:'check',title:'待回填项',lines:['F Container VOL(m³) 暂空','G Container Load(KG) 暂空','来源：提单 MEASUREMENT(20) / GROSS WEIGHT(19)']}],
     evFiles:[[f.slog,'15 KB']]},

    {n:'下载邮件附件', st:'ok',
     d:'Portal 公邮 · CMA CGM 提单邮件',
     okDesc:'提单已下载并重命名 · 与大表匹配成功',
     subs:[f.bl],
     ev:[{type:'email',title:'提单邮件命中',lines:['发件人 '+MBUSI_SENDER_BL,'标题含 CMA CGM - 海运提单(Seaway Bill)可供使用','附件重命名为 '+f.bl]},
         {type:'check',title:'BL 与大表对碰',lines:['提单 Booking Number '+wb,'大表已登记该票 → 匹配成功','未匹配则记异常并停止该票']}],
     evFiles:[[f.bl,'223 KB']]},

    {n:'OCR 识别', st:'ok',
     d:'BL PDF 字段抽取 · '+c.ctns.length+' 个集装箱',
     okDesc:'字段抽取完成 · 与 gvShipLog 核对通过',
     subs:[f.bl],
     ev:[{type:'ocr',title:'BL PDF 字段抽取',lines:['DOCUMENT NO (5) '+wb,"DESCRIPTION OF GOODS (18) 4x40HC → Container Type 40'",'集装箱 '+c.ctns.length+' 个 · 件数合计 '+c.totPkg]},
         {type:'table',title:'集装箱明细',lines:ctnLines},
         {type:'check',title:'与 gvShipLog 核对',lines:crossLines}],
     evFiles:[['OCR_BL_字段抽取.json','8 KB'],['集装箱明细_'+c.ctns.length+'箱.xlsx','16 KB']]},

    {n:'填入 BL 模板', st:'ok',
     d:'BL.xlsx · 9 列取自 BL PDF · 并回填 Shipping Log',
     okDesc:'BL.xlsx 写入完成 · Shipping Log 已填齐',
     subs:[f.blx, f.slog],
     ev:[{type:'table',title:'BL.xlsx 写入结果',lines:['B/C ← DOCUMENT NO (5) '+wb,'D/F ← MARKS AND NUMBERS (16) 集装箱号 / 铅封','G ← NO. of PKGS. (17) · 共 '+c.ctns.length+' 行']},
         {type:'check',title:'回填 Shipping Log',lines:['Container Load(KG) ← GROSS WEIGHT (19) '+c.totKg,'Container VOL(m³) ← MEASUREMENT (20) '+c.totVol,'两个模板均已保存，可上传 IES+']}],
     evFiles:[[f.blx,'13 KB'],[f.slog,'15 KB']]},

    {n:'导入 Shipping Log', st:'ok',
     d:'IES+ 发票信息 · 批量导入 Shipping Log',
     okDesc:'Shipping Log 导入成功',
     subs:[f.slog],
     ev:[{type:'screen',title:'IES+ BOL 查询',lines:['进口管理 → 发票信息 → 点击查询','BOL '+c.bol[0]+' 等 '+c.bol.length+' 个','共 '+c.inv+' 条发票数据']},
         {type:'screen',title:'批量导入 Shipping Log',lines:['导入 → 批量导入 shipping log','选择 '+f.slog+' · 绿灯后点击上传','上传完成，回写状态报告']}],
     evFiles:[['IES_发票查询_'+c.inv+'条.png','176 KB'],['ShippingLog_导入回执.png','148 KB']]},

    {n:'生成预报', st:'ok',
     d:'全选发票 · 预报信息来源于提单',
     okDesc:'预报生成成功',
     subs:[f.bl],
     ev:[{type:'screen',title:'生成预报',lines:['HAWB/BL NO. '+wb,'Flight NO./Vessels NO. '+c.vessel,'DG N · '+c.depCn+' → '+c.arrCn]},
         {type:'table',title:'港口对应关系',lines:['Departure '+c.dep+' → '+c.depCn,'Arrival '+c.arr+' → '+c.arrCn,'口径参照 AVIS detail list (Sheet2) 港口信息']}],
     evFiles:[['预报生成_回执.png','152 KB']]},

    {n:'导入 BL 模板', st:'ok',
     d:'进口预报 → 集装箱信息导入',
     okDesc:'导入成功 · 生成台账成功',
     subs:[f.blx],
     ev:[{type:'screen',title:'集装箱信息导入',lines:['进口预报 → 查询 '+wb+' → 修改','集装箱信息 → 导入 '+f.blx+' · 绿灯后上传','✓ 生成台账成功 · 共 '+c.ctns.length+' 条数据']},
         {type:'table',title:'集装箱台账',lines:ctnLines}],
     evFiles:[['BL_导入成功_台账.png','168 KB']]},

    {n:'导入 BL PDF 保存', st:'ok',
     d:'IES+ 文档资料上传 · 回写状态报告',
     okDesc:'BL PDF 上传完成 · 状态报告已回写',
     subs:[f.bl,'AVIS_BL_status_report.xlsx'],
     ev:[{type:'screen',title:'IES+ 文档资料上传',lines:['上传文档 → 文档类别 BL',f.bl+'（223 KB）','单文件 ≤ 50M · PDF/EXCEL/MSG 等']},
         {type:'table',title:'状态报告回写',lines:['Shipping Log 创建 = Y · BL Creation = Y','BL PDF Upload = Y','BL different / 异常反馈：空']}],
     evFiles:[['IES_文档资料_上传回执.png','142 KB'],['AVIS_BL_status_report.xlsx','86 KB']]},
  ];
}
/* 未完成形态：解析节点（索引 4 · OCR 识别）停在执行中 / 待人工处理，其后节点剪枝 */
function mbusiPrunedNodes(c, wb, st){
  return mbusiNodes(c, wb).map((node,i)=>{
    if(i<4) return node;
    if(i===4){
      node.st = st==='RUNNING' ? 'run' : 'review';
      node.d  = st==='RUNNING' ? 'BL PDF 字段抽取执行中…' : 'Shipping Log 子表与提单存在差异，待人工处理';
      return node;
    }
    node.st='queued'; node.d='等待前序节点完成';
    delete node.ev; delete node.evFiles;
    return node;
  });
}
/* 解析节点字段：docIndex 0 = BL PDF，1 = Shipping Log 子表（gvShipLog 拆分） */
function mbusiFields(c, wb){
  const ctn = c.ctns[0];
  return [
    {k:'Booking Number（BL No.）',v:wb,src:'系统',conf:100,quality:'系统取值',docIndex:1,page:1,locator:true},
    {k:'Ship Log File',v:c.slf,src:'系统',conf:100,quality:'系统取值',docIndex:1,page:1,locator:true},
    {k:'PDC',v:c.pdc,src:'系统',conf:100,quality:'系统取值',docIndex:1,page:1,locator:true},
    {k:'Vessel Name / Voyage',v:c.vessel,src:'系统',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'Departure Port',v:c.dep,src:'系统',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'Arrival Port',v:c.arr,src:'系统',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'ETA Date',v:c.eta,src:'系统',conf:99,quality:'高',docIndex:1,page:1,locator:true},
    {k:'Created（新增判定）',v:c.created,src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'按运行周区间判定新增，无原文坐标'},
    {k:'MBZ /BOL',v:c.bol[0]+' 等 '+c.bol.length+' 项',src:'系统',conf:98,quality:'高',docIndex:1,page:1,locator:true},
    {k:'DOCUMENT NO (5)（提单号核对）',v:wb,src:'OCR',conf:99,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Container No.（MARKS 16）',v:ctn[0]+' 等 '+c.ctns.length+' 项',src:'OCR',conf:96,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Seal No.（MARKS 16）',v:ctn[1]+' 等 '+c.ctns.length+' 项',src:'OCR',conf:95,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Container Type（GOODS 18）',v:"40'",src:'规则',conf:100,quality:'规则确定',docIndex:0,page:1,locator:true},
    {k:'Package Qty（PKGS 17 合计）',v:c.totPkg,src:'OCR',conf:95,quality:'高',docIndex:0,page:1,locator:true},
    {k:'Container Load(KG)（GROSS WEIGHT 19）',v:c.totKg,src:'OCR',conf:94,quality:'中',docIndex:0,page:1,locator:true},
    {k:'Container VOL(m³)（MEASUREMENT 20）',v:c.totVol,src:'OCR',conf:93,quality:'中',docIndex:0,page:1,locator:true},
    {k:'DG 标识',v:'N',src:'规则',conf:100,quality:'规则确定',locator:false,locatorReason:'MBUSI 不涉及 DG 判断，固定为 N'},
  ];
}
/* 差异票：与提单不一致的三项标为低质量，在字段列表中金色高亮 */
function mbusiMarkDiff(fields, c){
  const low = {'Package Qty（PKGS 17 合计）':76,'Container Load(KG)（GROSS WEIGHT 19）':79,'Container VOL(m³)（MEASUREMENT 20）':78};
  fields.forEach(f=>{ if(low[f.k]!==undefined){ f.low=true; f.quality='低'; f.conf=low[f.k]; } });
}
function mbusiFiles(c, wb){
  const f = mbusiFileNames(c, wb);
  return [{name:f.bl,pages:2},{name:f.sub,pages:1}];
}

/* ===== Case2 节点轨迹 =====
 * GLC（AVIS）7 节点走 avisNodes；MBUSI 10 节点走 mbusiNodes。 */
function case2TemplateNodes(mode, waybill){
  if(mode==='mbusi'){
    const wb = waybill || 'NAM8646083';
    return mbusiNodes(mbusiCase(wb), wb);
  }
  const wb = waybill || 'OOLU2038969910';
  return avisNodes(avisCase(wb), wb);
}
function case2PrunedNodes(mode, st, waybill){
  if(mode==='mbusi'){
    const wb = waybill || 'NAM8646083';
    return mbusiPrunedNodes(mbusiCase(wb), wb, st);
  }
  const wb = waybill || 'OOLU2038969910';
  return avisPrunedNodes(avisCase(wb), wb, st);
}
function case2TriggerDesc(mode){
  return '每周一运行 · 上周一至周日数据 · '+(mode==='mbusi'?'MBUSI（CMA CGM）':'GLC（OOCL）')+' 定时调度';
}
function ensureWorkbenchTasks(){
  let changed=false;
  HOME_TASKS.forEach(sample=>{
    const id='T-'+sample.waybill;
    if(State.task(id))return;
    const mode=sample.mode;
    const isMbusi=mode==='mbusi';
    const st={completed:'SUCCEEDED',running:'RUNNING',manual:'DIFF_PENDING'}[sample.status];
    let nodes, fields, files, statusText;
    if(isMbusi){
      /* MBUSI（美线 CMA CGM）：10 节点，节点证据、附件、字段与原文均按 BRD 样例生成 */
      const c=mbusiCase(sample.waybill);
      nodes=sample.status==='completed'?mbusiNodes(c, sample.waybill):mbusiPrunedNodes(c, sample.waybill, st);
      fields=mbusiFields(c, sample.waybill);
      files=mbusiFiles(c, sample.waybill);
      if(sample.status==='manual') mbusiMarkDiff(fields, c);
      statusText={completed:'Shipping Log 与 BL 创建完成 · 台账已生成',
        running:'BL PDF 字段抽取执行中',
        manual:'Shipping Log 子表与提单存在差异，待人工处理'}[sample.status];
    } else {
      /* AVIS（欧线 OOCL）：节点、证据、附件、字段与原文均按 BRD 样例生成 */
      const c=avisCase(sample.waybill);
      nodes=sample.status==='completed'?avisNodes(c, sample.waybill):avisPrunedNodes(c, sample.waybill, st);
      fields=avisFields(c, sample.waybill);
      files=avisFiles(c, sample.waybill);
      if(sample.status==='manual') avisMarkDiff(fields, c);
      statusText={completed:'AVIS/BL 创建完成 · 台账已生成',
        running:'AVIS / BL 字段抽取执行中',
        manual:'AVIS 与 BL 存在差异，待人工处理'}[sample.status];
    }
    const t={
      id, uc:'UC34', caseId:'case-2', waybill:sample.waybill, mode, date:sample.date, demoWorkbench:true,
      case:isMbusi?'MBUSI Shipping Log 与 BL':'AVIS 与 BL 创建（GLC）',
      src:'定时调度', rule:'—',
      ops:[{tm:sample.date+' 00:00',txt:'创建模拟任务 · '+sample.waybill+' · '+statusText}],
      runs:[{
        no:1, cause:'初次执行 · '+case2TriggerDesc(mode),
        st,
        start:sample.date+' 00:00',
        dur:sample.status==='completed'?isMbusi?'8m 12s':'10m 05s':sample.status==='running'?'进行中':'待人工处理',
        nodes, fields, files,
        summary:sample.waybill+' · '+statusText,
      }],
    };
    State.tasks.push(t);changed=true;
  });
  if(changed)State.save();
}
/* ==================== Share Point 目录树 ====================
 * 存放流程运行过程中产生与归档的文件，按 Case 与提单号分层。
 * 目录层级按 BRD（两条线路都先按运行周建一层）：
 *   GLC   ：<PDC> \ GLC   \ <运行周> \ <Shippers Ref + OOLU+BL No. + ETA + 日期 [+ DG]>
 *   MBUSI ：<PDC> \ MBUSI \ <运行周> \ <Booking No. + ETA + 日期>
 * 文件清单与修改时间取自 BRD 截图（GLC：AVIS fig-29；MBUSI：MBUSI fig-15）。
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
function buildSharePointTree(){
  const root = spFolder('Share Point');
  const glc = spDir(root, 'GLC'), mbusi = spDir(root, 'MBUSI');
  Object.keys(AVIS_CASES).forEach(wb=>{
    const c = AVIS_CASES[wb], d = spDay(wb), f = avisFileNames(c, wb);
    const files = [
      spFile('AVIS.xlsx', d+' 10:04', '14 KB'),
      spFile(f.avis,      d+' 10:02', '42 KB'),
      spFile('BL.xlsx',   d+' 10:10', '13 KB'),
      spFile(f.bl,        d+' 10:01', '39 KB'),
    ];
    if(c.dg) files.push(spFile(f.sh, d+' 10:02', '286 KB'));
    spDir(spDir(glc, c.pdc), runWeek(wb)).children.push(spFolder(avisFolder(c, wb), files));
  });
  Object.keys(MBUSI_CASES).forEach(wb=>{
    const c = MBUSI_CASES[wb], d = spDay(wb), f = mbusiFileNames(c, wb);
    const files = [
      spFile(f.blx,  d+' 17:02', '13 KB'),
      spFile('HAWB_'+wb+'.pdf', d+' 15:38', '223 KB'),
      spFile(f.sub,  d+' 23:12', '13 KB'),
      spFile(f.slog, d+' 16:52', '15 KB'),
    ];
    spDir(spDir(mbusi, c.pdc), runWeek(wb)).children.push(spFolder(mbusiFolder(c, wb), files));
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