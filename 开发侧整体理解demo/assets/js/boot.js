/* ===== boot.js · 全权限版启动：合并各 Case 种子 → 加载本地状态 → 生成各 Case 演示任务 ===== */
(function mergeSeeds(){
  const ARRAYS = ['rules', 'mailTemplates', 'notify', 'cfgItems', 'poLines', 'receipts'];
  Object.values(CASES).forEach(m=>{
    const s = m.seed || {};
    ARRAYS.forEach(k=>{ if(Array.isArray(s[k])) SEED[k].push(...deepClone(s[k]).map(x=>k==='cfgItems'?Object.assign(x,{caseId:m.id}):x)); });
    if(Array.isArray(s.ioRecipients)) SEED.ioRecipients[m.id] = deepClone(s.ioRecipients);
    Object.assign(CASE_META, m.meta || {});
  });
})();
State.load();
Object.values(CASES).forEach(m=>{ if(m.ensure) m.ensure(); });
/* 只保留属于 Case1 ~ 5 的任务（演示样例与手动新建） */
(function(){
  const before = State.tasks.length;
  State.data.tasks = State.tasks.filter(t=>t.caseId && CASES[t.caseId]);
  if(State.tasks.length !== before) State.save();
})();

/* ===== Share Point：一个存档库，根目录按 Case 分文件夹，文件夹内为该 Case 原有的归档结构 ===== */
const SP_CASE_FOLDERS = {'case-1':'Case1 危险品托运清单', 'case-2':'Case2 AVIS & MBUSI 与 BL', 'case-3':'Case3 MBPLAP 发票与预报',
  'case-4':'Case4 X-entry 发票与预报', 'case-5':'Case5 ASN 自动创建'};
function spBindRecords(node, fn){
  if(node.kind==='file'){ if(node.records && fn) node.records = fn; return; }
  (node.children||[]).forEach(c=>spBindRecords(c, fn));
}
function buildSharePointTree(){
  const root = {kind:'folder', name:'Share Point', children:[]};
  Object.values(CASES).forEach(m=>{
    /* 只列当前视角有权限的 Case（ALLOWED_CASE_IDS 在 core.js，本函数在页面加载后才调用） */
    if(!m.spTree || (typeof ALLOWED_CASE_IDS!=='undefined' && !ALLOWED_CASE_IDS.includes(m.id))) return;
    const t = m.spTree();
    spBindRecords(t, m.spRecords);
    const times = (t.children||[]).map(c=>c.time||'').sort();
    root.children.push({kind:'folder', name:SP_CASE_FOLDERS[m.id]||m.label, time:times.pop()||'', children:t.children||[]});
  });
  return root;
}
const SP_SITE = {name:'MBPTS 流程存档', logo:'MB',
  get sub(){ return 'UC34 · ' + (typeof allowedCaseText==='function' ? allowedCaseText() : 'Case 1 ~ 5 · 全部权限'); },
  get tip(){
    const ok = typeof ALLOWED_CASE_IDS==='undefined' || ALLOWED_CASE_IDS.includes('case-3');
    return ok && CASES['case-3'] && CASES['case-3'].spTip
      ? {text:CASES['case-3'].spTip.text, path:[SP_CASE_FOLDERS['case-3']].concat(CASES['case-3'].spTip.path)} : null;
  }};
