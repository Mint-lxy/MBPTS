/* ===== core.js · 应用壳 / 通用组件 / 模拟执行引擎 ===== */

const $ = s => document.querySelector(s);
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
/* 演示：时间戳同步浏览器当前日期（MM-DD HH:mm），不再固定为 09-01 */
function now(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`}
function qp(k){return new URLSearchParams(location.search).get(k)}
function dl(filename, content, mime){
  const blob = new Blob([content], {type: mime||'text/plain;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
function toCsv(rows){ return rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n'); }

/* --- state tags --- */
const STATE_META = {
  CREATED:    {t:'已创建',  c:'tag'},
  DISPATCHED: {t:'已派发',  c:'tag blue'},
  RUNNING:    {t:'执行中',  c:'tag blue', pulse:true},
  WAIT_INPUT: {t:'待上传',  c:'tag warn'},
  DIFF_PENDING:{t:'有差异', c:'tag gold'},
  FAILED:     {t:'失败',    c:'tag dan'},
  SUCCEEDED:  {t:'成功',    c:'tag ok'},
};
const UC_COLOR = {UC26:'tag acc', UC34:'tag gold', UC64:'tag vio'};
/* 业务状态口径（工作台、任务中心筛选与列表共用）：
   已完成 = DSS 导入模板已生成；执行中 = 执行中；其余为待人工处理 */
const STAGE_META = {
  completed:{t:'已完成', c:'tag ok'},
  running:{t:'执行中', c:'tag blue', pulse:true},
  manual:{t:'待人工处理', c:'tag warn'},
};
function taskStage(t){
  const st = taskStatus(t);
  if(st==='SUCCEEDED') return 'completed';
  return ['RUNNING','DISPATCHED'].includes(st) ? 'running' : 'manual';
}
function stageTag(t){const m=STAGE_META[taskStage(t)];return `<span class="${m.c}">${m.pulse?'<span class="pulse"></span>':''}${m.t}</span>`}
function stTag(st){const m=STATE_META[st]||STATE_META.CREATED;return `<span class="${m.c}">${m.pulse?'<span class="pulse"></span>':''}${m.t}</span>`}
function ucTag(uc){return `<span class="${UC_COLOR[uc]||'tag'}">${uc}</span>`}

/* --- toast / modal --- */
function toast(msg, kind){
  let box = $('#toasts'); if(!box){ box = document.createElement('div'); box.id='toasts'; document.body.appendChild(box); }
  const d=document.createElement('div'); d.className='toast '+(kind||''); d.textContent=msg; box.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';d.style.transition='.3s';setTimeout(()=>d.remove(),300)},2600);
}
function openModal(title, body, footer, cls){
  $('#modalRoot').innerHTML = `
  <div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal ${cls||''}">
      <div class="modal-hd"><h3>${title}</h3><button class="x-btn" onclick="closeModal()">×</button></div>
      <div class="modal-bd">${body}</div>
      ${footer?`<div class="modal-ft">${footer}</div>`:''}
    </div>
  </div>`;
}
function closeModal(){$('#modalRoot').innerHTML=''}
function openDrawer(title, body){
  $('#modalRoot').innerHTML = `
  <div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="drawer">
      <div class="modal-hd"><h3>${title}</h3><button class="x-btn" onclick="closeModal()">×</button></div>
      <div class="modal-bd">${body}</div>
    </div>
  </div>`;
}

/* --- 业务留痕 --- */
function audit(act, obj, src){
  State.audit.unshift({tm:now(), who:'erxiao', act, obj, src});
  State.save();
}
function addEvidence(kind, taskId, uc, what){
  const seq = String(State.evidence[kind].length + 100).padStart(4,'0');
  const prefix = {trigger:'EV-T', process:'EV-P', operation:'EV-O'}[kind];
  const hash = Math.random().toString(16).slice(2,10) + Math.random().toString(16).slice(2,10);
  State.evidence[kind].unshift({id:`${prefix}-${seq}`, task:taskId, what, time:now(), hash, uc});
  State.save();
  return `${prefix}-${seq}`;
}
function addNotify(t, x, ic, sym, link){
  State.notify.unshift({t, x, tm:'刚刚', read:false, ic, sym, link: link||''});
  State.save();
}

/* --- 模拟执行引擎（Run 实例驱动；时间戳跨页结算） --- */
/* scheduleRun: 生成一条新的 Run 实例（runs[] 追加），历史 Run 不可变。
   任务状态由 taskStatus(t) 推导，不在 Task 上落库。 */
function scheduleRun(taskId, fromIdx, cause){
  const t = State.task(taskId); if(!t) return null;
  const prev = latestRun(t);
  if(prev && prev.st==='RUNNING'){ toast('该任务已有执行实例在运行中', 'warn'); return null; }
  let run;
  if(prev){
    const fromName = prev.nodes[fromIdx] ? prev.nodes[fromIdx].n : '起点';
    run = {
      no: prev.no + 1,
      cause: cause || `重跑 · 自节点「${fromName}」`,
      st: 'RUNNING', start: now(), dur: '进行中',
      nodes: prev.nodes.map((n,i)=>({
        n: n.n, okDesc: n.okDesc, subs: n.subs, fieldFiles: n.fieldFiles,
        referenceImages: n.referenceImages, fieldTitle: n.fieldTitle,
        st: i<fromIdx ? 'ok' : 'queued',
        d:  i<fromIdx ? n.d : '等待执行',
      })),
      // 字段版本：新 Run 携带「当前生效取值」（含已修正值）
      fields: deepClone(prev.fields).map(f=>({
        k:f.k, v:f.v, src:f.src, conf:f.conf, quality:f.quality, low:f.low, stage:f.stage,
        images:f.images, docIndex:f.docIndex, page:f.page, locator:f.locator, locatorReason:f.locatorReason,
        carried:f.delta?{fromRun:prev.no}:{}
      })),
      files: deepClone(prev.files||[]),
      summary: '',
    };
    if(t.fixable && cause==='整单重跑') run.cause += '（源文件已修正）';
  } else {
    // 首次执行（如 WAIT_INPUT 上传完成后）
    t.waitState = undefined;
    run = {
      no: 1, cause: cause || '初次执行', st:'RUNNING', start: now(), dur:'进行中',
      nodes: (t.plan||[]).map(n=>({...n})),
      fields: [], files: deepClone(t.fillFiles||[]), summary: '',
    };
  }
  t.runs.push(run);
  const remain = run.nodes.filter(n=>n.st!=='ok').length * 1200;
  run.runInfo = {finishAt: Date.now()+remain};
  t.ops.unshift({tm:now(), txt:`生成执行 R#${run.no}：${run.cause}`});
  addEvidence('operation', t.id, t.uc, `R#${run.no} 触发：${run.cause}（erxiao）`);
  audit('生成执行实例', `${t.id} · R#${run.no} · ${run.cause}`, '任务中心');
  State.save();
  animateRun(t, run);
  return run;
}
/* resumeRun：节点重跑——不新开 Run，把当前 Run 从 fromIdx 起的节点重置为等待并接着执行。
   fromIdx 之前的节点保持原结果；字段沿用当前生效值（含已修正值）。 */
function resumeRun(taskId, fromIdx, cause){
  const t = State.task(taskId); if(!t) return null;
  const run = latestRun(t); if(!run) return null;
  if(run.st==='RUNNING'){ toast('该任务已有执行实例在运行中', 'warn'); return null; }
  const fromName = run.nodes[fromIdx] ? run.nodes[fromIdx].n : '';
  run.nodes.forEach((n,i)=>{ if(i>=fromIdx){ n.st='queued'; n.d='等待执行'; delete n.err; } });
  run.st = 'RUNNING'; run.dur = '进行中';
  run.resumes = (run.resumes||[]).concat({tm:now(), from:fromName});
  const remain = run.nodes.filter(n=>n.st!=='ok').length * 1200;
  run.runInfo = {finishAt: Date.now()+remain};
  const txt = cause || `节点重跑 · 自节点「${fromName}」`;
  t.ops.unshift({tm:now(), txt:`R#${run.no} ${txt}`});
  addEvidence('operation', t.id, t.uc, `R#${run.no} ${txt}（erxiao）`);
  audit('节点重跑', `${t.id} · R#${run.no} · ${fromName}`, '任务中心');
  State.save();
  animateRun(t, run);
  return run;
}
function animateRun(t, run){
  const seq = run.nodes.map((n,i)=>({n,i})).filter(x=>x.n.st!=='ok').map(x=>x.i);
  const step = (k)=>{
    if(k>=seq.length){ completeRun(t, run); return; }
    const i = seq[k]; const n = run.nodes[i];
    n.st='run'; n.d = n.okDesc ? '执行中…' : n.d; State.save(); rerenderSameTask(t.id, run.no);
    setTimeout(()=>{ n.st='ok'; if(n.okDesc) n.d=n.okDesc;
      addEvidence('process', t.id, t.uc, `R#${run.no} 节点「${n.n}」产出已登记`);
      const hk = caseHooks(t);
      if(hk.nodeOps) hk.nodeOps(t, run, i).forEach(txt=>t.ops.unshift({tm:now(), txt}));
      State.save(); rerenderSameTask(t.id, run.no);
      step(k+1); }, 1100);
  };
  step(0);
}
function completeRun(t, run){
  delete run.runInfo;
  run.st = 'SUCCEEDED'; run.dur = `R#${run.no} 完成`;
  if(t.fillFields && !run.fields.length) run.fields = deepClone(t.fillFields);
  if(t.fillFiles && (!run.files || !run.files.length)) run.files = deepClone(t.fillFiles);
  if(t.fillSummary && !run.summary) run.summary = t.fillSummary;
  t.ops.unshift({tm:now(), txt:`R#${run.no} 执行完成 · 全流程成功 · 证据链已归档`});
  const hk = caseHooks(t), recordOp = hk.recordOp ? hk.recordOp(t, run) : '';
  if(recordOp) t.ops.unshift({tm:now(), txt:recordOp});
  addEvidence('process', t.id, t.uc, `R#${run.no} 全流程产物与证据链`);
  addNotify('任务执行成功', `${t.id} · R#${run.no} · ${t.case} 已完成`, 'g', '✓', `task-detail.html?id=${t.id}`);
  audit('执行完成', `${t.id} · R#${run.no}`, '执行引擎');
  State.save();
}
/* 各 Case 的执行引擎钩子（如 Case3 / Case4 按节点写操作日志），只作用于本 Case 的任务 */
function caseHooks(t){ return ((CASES[taskCaseId(t)]||{}).hooks) || {}; }
/* 跨页加载结算：有 runInfo 且已到期的 Run 直接置完成；未到期则接管动画 */
function settleElapsed(){
  const nowTs = Date.now(); let changed=false;
  State.tasks.forEach(t=>{
    t.runs.forEach(run=>{
      if(!run.runInfo) return;
      if(run.runInfo.finishAt <= nowTs){
        run.nodes.forEach(n=>{ if(n.st!=='ok'){ n.st='ok'; if(n.okDesc)n.d=n.okDesc; } });
        completeRun(t, run); changed=true;
      } else {
        animateRun(t, run); changed=true;
      }
    });
  });
  if(changed) State.save();
}
function rerenderSameTask(taskId, runNo){
  if(document.body.dataset.page==='task-detail' && qp('id')===taskId && window.render){
    if(window.selRun===undefined || window.selRun===runNo || window.selRun===-1) window.render();
  } else if(window.render && document.body.dataset.page!=='task-detail'){
    window.render();
  }
}

/* --- 主题 / UC 过滤（跨页持久） --- */
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme')==='dark'?'':'dark';
  document.documentElement.setAttribute('data-theme',t); localStorage.setItem('mbpts_theme',t);
}
// 当前演示聚焦 UC34，不再读取已移除入口的历史筛选状态。
function getUC(){ return 'UC34'; }
function ucMatch(t){ const u=getUC(); return u==='all'||t.uc===u; }
/* --- 演示视角：存在 localStorage，切换后刷新 ---
   业务操作员：全部 Case、全部功能；用户：只有分配给他的 Case（演示只给一个），看不到邮件模板管理。
   cases 为业务 Case id（UC34_CASES），null = 全部。 */
const ROLES = {
  operator:{name:'业务操作员', short:'ER', cases:null},
  user:{name:'用户', short:'US', cases:['case-3']},
};
function currentRole(){ const r = localStorage.getItem('mbpts_role'); return ROLES[r] ? r : 'operator'; }
function setRole(r){ if(ROLES[r]){ localStorage.setItem('mbpts_role', r); location.reload(); } }
/* 邮件模板管理只对业务操作员开放 */
function canManageMailTpl(){ return currentRole()==='operator'; }

/* 业务 Case（= 场景 scenario）。欧线 GLC、美线 MBUSI 是两个 Case（PRD Case2a / Case2b），
   只是演示实现共用 cases/case2.js 一个模块。页面上的 Case 选择框、按 Case 分组都用这里的 id；
   module 是 CASES 里的模块 id（ALLOWED_CASE_IDS、taskCaseId 按模块），modes 为该 Case 的线路（不填 = 模块的全部线路）。 */
const UC34_CASES = [
  {id:'case-1',  module:'case-1', name:'Case 1 · 危险品托运清单'},
  {id:'case-2a', module:'case-2', modes:['glc'],   name:'Case 2a · 欧线 AVIS 与 BL（GLC）'},
  {id:'case-2b', module:'case-2', modes:['mbusi'], name:'Case 2b · 美线 Shipping Log 与 BL（MBUSI）'},
  {id:'case-3',  module:'case-3', name:'Case 3 · MBPLAP 发票与预报'},
  {id:'case-4',  module:'case-4', name:'Case 4 · X-entry 发票与预报'},
  {id:'case-5',  module:'case-5', name:'Case 5 · ASN'},
];
/* 模块 + 线路 → 业务 Case id */
function bizCaseId(module, mode){ const c = UC34_CASES.find(x=>x.module===module && (!x.modes || x.modes.includes(mode))); return c ? c.id : module; }
/* 某个模块下的全部业务 Case id */
function bizCasesOfModule(module){ return UC34_CASES.filter(c=>c.module===module).map(c=>c.id); }
/* 当前视角有权限的业务 Case；ALLOWED_CASE_IDS 是它们涉及的模块（模块级的取数、注册仍按模块） */
const ALLOWED_BIZ_IDS = ROLES[currentRole()].cases || UC34_CASES.map(c=>c.id);
const ALLOWED_CASE_IDS = [...new Set(UC34_CASES.filter(c=>ALLOWED_BIZ_IDS.includes(c.id)).map(c=>c.module))];
const bizAllowed = id => ALLOWED_BIZ_IDS.includes(id);
function visibleBizCases(){ return UC34_CASES.filter(c=>bizAllowed(c.id)); }
/* 页面右上角的 Case 选择框；只有一个 Case 时显示成固定标签。withAll：加「全部 Case」选项 */
function casePickHtml(id, cur, withAll){
  const cs = visibleBizCases();
  if(cs.length===1) return `<span class="type-case-pick">Case <span class="tag acc">${esc(cs[0].name)}</span></span>`;
  return `<label class="type-case-pick">Case
      <select class="pick" id="${id}">${withAll?'<option value="all">全部 Case</option>':''}${cs.map(c=>`<option value="${c.id}" ${cur===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
    </label>`;
}
/* 绑定 Case 选择框（只有一个 Case 时没有选择框） */
function bindCasePick(id, fn){ const el = document.getElementById(id); if(el) el.onchange = e=>fn(e.target.value); }
/* Case × 线路的规范命名（工作台 / 邮件中心等页面共用同一份，避免两处命名漂移）。
   caseId 为模块 id，biz 为业务 Case id。 */
const CASE_LINES = [
  {caseId:'case-1', biz:'case-1',  line:'case1', label:'Case1 - 危险品托运清单（空运 / 海运）',
   flows:[]},
  {caseId:'case-2', biz:'case-2a', line:'glc',   label:'Case2a - AVIS & BL（欧线 · OOCL）',
   flows:['case-2-glc','case-2-glc-dg']},
  {caseId:'case-2', biz:'case-2b', line:'mbusi', label:'Case2b - MBUSI Shipping Log & BL（美线 · CMA CGM）',
   flows:['case-2-mbusi']},
  {caseId:'case-3', biz:'case-3',  line:'case3-mbplap', label:'Case3 - MBPLAP 发票与预报创建',
   flows:['case-3-mbplap']},
  {caseId:'case-4', biz:'case-4',  line:'case4-xentry', label:'Case4 - X-entry 发票与预报创建',
   flows:['case-4-xentry']},
  {caseId:'case-5', biz:'case-5',  line:'mbplap', label:'Case5 - MBPLAP_DSS上传模板',
   flows:['case-5-mbplap']},
  {caseId:'case-5', biz:'case-5',  line:'xentry', label:'Case5 - X-entry_DSS上传模板',
   flows:['case-5-xentry']},
];
function lineLabel(line){ const x = CASE_LINES.find(c=>c.line===line); return x ? x.label : line; }
/* 线路所属的业务 Case */
function lineBiz(line){ const x = CASE_LINES.find(c=>c.line===line); return x ? x.biz : ''; }
function visibleCaseLines(){ return CASE_LINES.filter(c=>bizAllowed(c.biz)); }
/* 线路由「绑定流程」推导：流程编号本身已含线路信息，规则编辑页无需再填一次 */
function lineFromFlow(flow){ const x = CASE_LINES.find(c=>(c.flows||[]).includes(flow)); return x ? x.line : ''; }
function ruleLine(r){ return lineFromFlow(r.flow) || r.line || ''; }
function getCase(){ return 'all'; }
function taskCaseId(t){
  if(t.uc!=='UC34') return null;
  if(t.caseId) return t.caseId;
  const legacy = {'C01':'case-1', 'C02':'case-2', 'C03':'case-3', 'C05':'case-4', 'C06':'case-5'};
  return legacy[(t.case||'').split(/[\s-]/)[0]] || null;
}
// 任务中心与导航计数：用户有权限的 Case 下的全部任务。
function taskMatch(t){ return ucMatch(t) && bizAllowed(bizCaseId(taskCaseId(t), t.mode)); }
/* 站内提醒：链接到任务的，只显示有权限的任务 */
function ntfVisible(n){ const id = /task-detail\.html\?id=([^&]+)/.exec(n.link||''); const t = id && State.task(decodeURIComponent(id[1])); return !t || taskMatch(t); }
function caseLabel(id){ return UC34_CASES.find(c=>c.id===id)?.name || '未归类'; }
/* 工作台卡片跳转：?from=workbench&row=case-2a&status=…[&start&end]；row 为 WORKBENCH_ROWS 的 id，可对应多条线路 */
function readWorkbenchFilter(){
  if(qp('from')!=='workbench')return null;
  const rowId=qp('row'),start=qp('start'),end=qp('end'),status=qp('status');
  const row=WORKBENCH_ROWS.find(r=>r.id===rowId);
  if(!row||!bizAllowed(row.biz)||!['completed','running','manual','all'].includes(status))return null;
  const base={row:row.id,keys:row.keys,label:workbenchRowLabel(row),status};
  if(start===null&&end===null)return base;
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  if(!validDate(start)||!validDate(end)||start>end)return null;
  return {...base,start,end};
}
function workbenchScopeActive(filter){return !!filter;}
function workbenchScopeBanner(filter){return `<div class="center-context"><span>来自工作台：${esc(filter.label)}${filter.start?' · '+esc(filter.start)+' 至 '+esc(filter.end):' · 全部记录'}</span><a href="index.html">返回工作台</a></div>`;}
/* 全平台子 Case（工作台分组、任务中心第二排筛选、case 列共用）：只显示用户有权限的 Case；abbr 用于手动新建任务编号 */
const CASE_FILTERS = [
  {caseId:'case-1', mode:'air',    label:'Case1-空运',    abbr:'C1A', pdc:true},
  {caseId:'case-1', mode:'sea',    label:'Case1-海运',    abbr:'C1S'},
  {caseId:'case-2', mode:'glc',    label:'Case2a-GLC',    abbr:'C2G', pdc:true},
  {caseId:'case-2', mode:'mbusi',  label:'Case2b-MBUSI',  abbr:'C2M', pdc:true},
  {caseId:'case-3', mode:'mbplap', label:'Case3-MBPLAP',  abbr:'C3'},
  {caseId:'case-4', mode:'xentry', label:'Case4-XEntry',  abbr:'C4'},
  {caseId:'case-5', mode:'mbplap', label:'Case5-MBPLAP',  abbr:'C5M'},
  {caseId:'case-5', mode:'xentry', label:'Case5-XEntry',  abbr:'C5X'},
].map(c=>({...c, key:c.caseId+'|'+c.mode, id:c.caseId+'-'+c.mode, biz:bizCaseId(c.caseId, c.mode)}));
/* 任务中心的"任务类型"即上面的子 Case；id 用于 URL：tasks.html?type=case-2-glc */
function taskTypeById(id){ return CASE_FILTERS.find(c=>c.id===id) || null; }
function taskTypeHref(t){ const c=taskCaseFilter(t); return c ? 'tasks.html?type='+encodeURIComponent(c.id) : 'tasks.html'; }
function visibleCaseFilters(){ return CASE_FILTERS.filter(c=>bizAllowed(c.biz)); }
/* 按任务类型新建一票演示任务（沿用各 Case 的 BRD 样例，创建即完成）。
   任务中心「手动触发」、邮件日志「挂规则后手动触发」共用；opts 可改来源、规则、执行原因、操作日志、留痕模块 */
function createDemoTask(type, opts){
  const mod = CASES[type.caseId];
  if(!mod || !mod.demoTask || !bizAllowed(type.biz)) return null;
  const o = Object.assign({src:'手动触发', rule:'—', cause:'手动触发 · 初次执行 · '+type.label,
    op:`任务创建 · 手动触发（${type.label}）`, module:'任务中心'}, opts||{});
  const prefix = 'T-DEMO-'+type.abbr+'-';
  let n = 1; while(State.task(prefix+String(n).padStart(3,'0'))) n++;
  const id = prefix+String(n).padStart(3,'0'), demo = mod.demoTask(type.mode);
  const t = {
    id, uc:'UC34', caseId:type.caseId, case:demo.case, mode:type.mode, waybill:demo.waybill, date:demo.date,
    src:o.src, rule:o.rule,
    ops:[{tm:now(), txt:o.op}],
    runs:[{
      no:1, cause:o.cause, st:'SUCCEEDED', start:now(), dur:demo.dur||'已完成',
      nodes:demo.nodes, fields:demo.fields, files:demo.files,
      summary:`手动触发的任务（${type.label}）已完成：全流程执行成功，证据链已登记。`,
    }],
    fillFields:demo.fillFields, fillFiles:demo.fillFiles,
    fillSummary:`手动触发的任务（${type.label}）已完成，证据链已登记。`,
  };
  State.tasks.unshift(t);
  addEvidence('trigger', t.id, 'UC34', `${o.src}任务（${type.label} · ${demo.case}）`);
  audit('手动触发', `${t.id} · ${type.label} · ${demo.case}`, o.module);
  State.save();
  return t;
}
/* 工作台的行：每个 Case 一排卡片，不再按线路分二级标题。
   Case2 的两条线路业务不同，拆成 Case2a（GLC）、Case2b（MBUSI）两行；Case1、Case5 的线路合并为一行。
   label 为空时取 CASES[caseId].label（各 caseN.js 注册时给出）。 */
const WORKBENCH_ROWS = [
  {id:'case-1',  caseId:'case-1', modes:['air','sea']},
  {id:'case-2a', caseId:'case-2', modes:['glc'],   label:'Case2a · AVIS / MBUSI 与 BL-GLC'},
  {id:'case-2b', caseId:'case-2', modes:['mbusi'], label:'Case2b · AVIS / MBUSI 与 BL-MBUSI'},
  {id:'case-3',  caseId:'case-3', modes:['mbplap']},
  {id:'case-4',  caseId:'case-4', modes:['xentry']},
  {id:'case-5',  caseId:'case-5', modes:['mbplap','xentry']},
].map(r=>({...r, keys:r.modes.map(m=>r.caseId+'|'+m), biz:bizCaseId(r.caseId, r.modes[0])}));
function workbenchRowLabel(row){ return row.label || (CASES[row.caseId]||{}).label || caseLabel(row.caseId); }
function visibleWorkbenchRows(){ return WORKBENCH_ROWS.filter(r=>bizAllowed(r.biz)); }
function taskCaseFilter(t){ return CASE_FILTERS.find(c=>c.caseId===taskCaseId(t) && c.mode===t.mode) || null; }
function allowedCaseText(){
  const cs = visibleBizCases();
  return cs.length===UC34_CASES.length ? 'Case 1 ~ 5 · 全部权限' : cs.map(c=>c.name.split(' · ')[0]).join('、')+' · '+ROLES[currentRole()].name;
}
function centerContext(){
  return `<div class="center-context"><span>当前范围：<strong>${esc(allowedCaseText())}</strong></span><span>页面框架预览 · 具体配置将逐页完善</span></div>`;
}

/* --- 应用壳渲染 --- */
const NAV = [
  {sec:'工作区'},
  {r:'home', href:'index.html', ic:'&#8962;', t:'工作台'},
  {r:'tasks', href:'tasks.html', ic:'&#9776;', t:'任务中心', badge:()=>String(State.tasks.filter(taskMatch).length)},
  {r:'rules', href:'rules.html', ic:'&#9993;', t:'邮件中心'},
  {r:'config', href:'config.html', ic:'&#9881;', t:'配置中心'},
  /* 存档公盘：新标签页打开（正式版直接打开存档文件夹） */
  {r:'sharepoint', href:'sharepoint.html', ic:'&#9729;', t:'Share Point', blank:true},
];
const PAGE_TITLES = {home:'工作台', tasks:'任务中心', 'task-detail':'任务详情', rules:'邮件中心', config:'配置中心', sharepoint:'Share Point', notify:'提醒中心'};

function renderShell(){
  const page = document.body.dataset.page;
  const t = PAGE_TITLES[page]||'';
  $('#app-shell').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="side-logo" href="index.html"><span class="dot"></span>MBPTS 智能作业平台<span class="ver">v1.0</span></a>
      <nav class="side-nav">
        ${NAV.filter(n=>!n.visible||n.visible()).map(n=> n.sec? `<div class="nav-sec">${n.sec}</div>` : `
          <a class="nav-item ${n.r===page||(n.r==='tasks'&&page==='task-detail')?'on':''}" href="${n.href}"${n.blank?' target="_blank" rel="noopener" title="在新标签页打开存档公盘"':''}>
            <span class="ic">${n.ic}</span>${n.t}${n.blank?'<span style="margin-left:6px;opacity:.6;font-size:11px">↗</span>':''}
            <span class="badge ${n.badge?'':'hidden'}">${n.badge?n.badge():''}</span>
          </a>`).join('')}
        <div class="nav-sec">说明</div>
        <div style="padding:8px 12px;font-size:11px;color:#5f7890;line-height:1.7">
          交互原型 · 静态演示<br>基线：平台侧 PRD v1.0<br>范围：UC34 · ${esc(allowedCaseText())}
        </div>
      </nav>
      <div class="side-foot">2026-09-01 · 演示数据
        <button onclick="resetDemo()">重置演示数据</button>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <span class="page-title">${t}</span>
        <span class="crumb" id="crumb"></span>
        <div class="topbar-actions">
          <a class="icon-btn" href="notify.html" title="提醒" style="text-decoration:none">&#9993;<span class="rdot" id="bellDot"></span></a>
          <button class="icon-btn" onclick="toggleTheme()" title="切换主题">&#9788;</button>
          <label class="role-pick" title="切换演示视角">视角
            <select onchange="setRole(this.value)" aria-label="切换演示视角">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${currentRole()===k?'selected':''}>${v.name}</option>`).join('')}</select>
          </label>
          <div class="avatar" title="当前用户（${ROLES[currentRole()].name}）">${ROLES[currentRole()].short}</div>
        </div>
      </div>
      <div class="viewport" id="view"></div>
    </div>
  </div>`;
  if(localStorage.getItem('mbpts_theme')==='dark') document.documentElement.setAttribute('data-theme','dark');
}
function updBadges(){
  const u = State.notify.filter(n=>!n.read && ntfVisible(n)).length;
  const dot = $('#bellDot'); if(dot) dot.style.display = u?'block':'none';
  const items = document.querySelectorAll('.nav-item');
  items.forEach(a=>{
    const b = a.querySelector('.badge:not(.hidden)'); if(!b) return;
    if(a.textContent.includes('任务中心')) b.textContent = State.tasks.filter(taskMatch).length;
    if(a.textContent.includes('提醒中心')) b.textContent = u;
  });
}
function resetDemo(){
  openModal('重置演示数据','<p class="small">将清空本地演示操作（字段修正 / 规则修改 / 已读状态等），恢复为初始演示数据。页面将自动刷新。</p>',
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn danger" onclick="State.reset()">确认重置</button>`);
}
function setCrumb(html){ const c=$('#crumb'); if(c) c.innerHTML = html; }

/* --- 任务级上传（共享：任务列表 / 任务详情 / 工作台） --- */
let pickedFiles = [];
function uploadModal(tid){
  const t = tid==='new'?null:State.task(tid);
  const scenePicker = t ? '' : `
    <div class="fld" style="margin-bottom:13px"><label>选择目标场景</label>
      <select class="pick" style="width:100%" id="upScene">
        <option value="C12">UC34 · C12 CCC 信息提取（政府网站禁爬虫，人工下载后上传）</option>
        <option value="C13">UC34 · C13 关务报表原始数据（IES 导出后上传）</option>
        <option value="C06">UC34 · C06 ASN 结果回传（SPM 导入截图判定）</option>
        <option value="UC26-ADJ">UC26 · 交期调整表（覆盖式 · 唯一键 PO+item）</option>
        <option value="UC26-VMD">UC26 · Vendor master data（覆盖式）</option>
      </select></div>`;
  openModal(t?`任务级上传 · ${t.id}`:'新建任务 / 上传文件', `
    ${scenePicker}
    ${t&&t.waitState?`<p class="small" style="margin-bottom:10px">必需文件：${t.waitState.missing.map(m=>`<span class="tag warn">${esc(m)}</span>`).join(' ')}</p>
      <p class="tiny muted" style="margin:0 0 10px">覆盖式上传将明确提示旧版本；缺必需附件不允许提交</p>`:''}
    <div class="drop" id="dropZone">
      拖拽文件到此处，或点击选择文件<br>
      <span class="tiny">类型 / 大小 / 数量按场景定义校验 · 上传历史留痕</span>
      <input type="file" id="fileIn" class="hidden" multiple>
    </div>
    <div id="fileList"></div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" id="upGoBtn" disabled onclick="confirmUpload('${tid}')">${t?'上传并继续执行':'提交并创建任务'}</button>`);
  const dz = $('#dropZone'), fi = $('#fileIn');
  dz.onclick = ()=>fi.click();
  dz.ondragover = e=>{e.preventDefault();dz.classList.add('ov')};
  dz.ondragleave = ()=>dz.classList.remove('ov');
  dz.ondrop = e=>{e.preventDefault();dz.classList.remove('ov');addFiles([...e.dataTransfer.files])};
  fi.onchange = ()=>addFiles([...fi.files]);
}
function addFiles(files){
  const up = $('#upScene'); const scene = up ? up.value : '';
  const okType = f => {
    const n = f.name.toLowerCase();
    if(scene==='C12') return n.endsWith('.pdf')||n.endsWith('.xlsx')||n.endsWith('.xls');
    if(scene==='C13'||scene.startsWith('UC26')) return n.endsWith('.xlsx')||n.endsWith('.xls');
    if(scene==='C06') return n.endsWith('.png')||n.endsWith('.jpg')||n.endsWith('.jpeg')||n.endsWith('.xlsx')||n.endsWith('.xls');
    return true;
  };
  const bad = files.filter(f=>!okType(f));
  if(bad.length) toast(`文件类型不符，已拒绝：${bad.map(f=>f.name).join('、')}`,'err');
  files.filter(okType).forEach(f=>{
    pickedFiles.push({name:f.name, size:f.size});
    const d=document.createElement('div');d.className='file-it';
    d.innerHTML = `<span>📄</span><span style="font-weight:600">${esc(f.name)}</span><span class="fs">${(f.size/1024).toFixed(0)} KB</span>`;
    $('#fileList').appendChild(d);
  });
  if(pickedFiles.length) $('#upGoBtn').disabled = false;
}
function confirmUpload(tid){
  closeModal();
  if(tid!=='new'){
    // 待件任务：补齐必需文件 → 生成该任务的首个执行实例 R#1
    const t = State.task(tid); if(!t) return;
    addEvidence('trigger', t.id, t.uc, `人工上传 ${pickedFiles.length} 个必需文件：${pickedFiles.map(f=>f.name).join('、')}`);
    t.ops.unshift({tm:now(), txt:`必需文件上传完成（${pickedFiles.map(f=>f.name).join('、')}）`});
    audit('上传文件', `${t.id} · ${pickedFiles.length} 个文件`, '任务级上传');
    toast('文件已上传，已生成执行实例 R#1','ok');
    scheduleRun(t.id, 1, '缺件补齐 · 首次执行');
    pickedFiles=[];
    if(window.render) setTimeout(window.render, 400); else setTimeout(()=>location.href=`task-detail.html?id=${t.id}`, 500);
    return;
  }
  const scene = $('#upScene') ? $('#upScene').value : 'C12';
  const uc = scene.startsWith('UC26')?'UC26':'UC34';
  const caseMap = {'C12':'C12 CCC 信息提取','C13':'C13 关务报表原始数据','C06':'C06 ASN 创建（SPM）','UC26-ADJ':'交期调整表导入','UC26-VMD':'Vendor master data 导入'};
  const id = 'T-0901-' + String(24 + State.tasks.length).padStart(4,'0');
  const fNames = pickedFiles.map(f=>f.name).join('、');
  const t = {
    id, uc, case: caseMap[scene], src:'人工上传', rule:'—',
    plan:[
      {n:'文件接收与登记', st:'ok', d:`人工上传 ${pickedFiles.length} 个文件`},
      {n:'格式校验', st:'queued', d:'按场景模板校验', okDesc:'模板校验通过'},
      {n:'AI 字段抽取 / 数据处理', st:'queued', d:'agent 抽取', okDesc:'字段抽取完成 · 置信度明细已登记'},
      {n:'结果写回与归档', st:'queued', d:'回写产物', okDesc:'结果已归档，证据链完整'},
    ],
    fillFields:[{k:'文件名称', v:pickedFiles[0]?pickedFiles[0].name:'—', src:'系统', conf:100}],
    fillFiles:[{name:pickedFiles[0]?pickedFiles[0].name:'upload_file', pages:2}],
    fillSummary:`${caseMap[scene]} 已处理完成：文件校验通过，字段抽取与结果归档成功，证据链完整。`,
    ops:[{tm:now(), txt:`任务创建 · 手动上传 ${pickedFiles.length} 个文件（${fNames}）`}],
    runs:[],
  };
  State.tasks.unshift(t);
  addEvidence('trigger', t.id, uc, `人工上传创建任务（${fNames}）`);
  audit('创建任务', `${t.id} · ${t.case}`, '任务上传');
  pickedFiles=[];
  scheduleRun(t.id, 0, '创建后初次执行');
  toast(`任务 ${t.id} 已创建，执行实例 R#1 已触发`,'ok');
  setTimeout(()=>location.href=`task-detail.html?id=${t.id}`, 500);
}

/* --- 启动 --- */
document.addEventListener('DOMContentLoaded', ()=>{
  if(!document.body.dataset.page) return;   /* 存档公盘页没有应用壳，只借用 core.js 的权限定义 */
  renderShell();
  settleElapsed();
  updBadges();
});
