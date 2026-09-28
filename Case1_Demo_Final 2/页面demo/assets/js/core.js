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
function stTag(st){const m=STATE_META[st]||STATE_META.CREATED;return `<span class="${m.c}">${m.pulse?'<span class="pulse"></span>':''}${m.t}</span>`}
function ucTag(uc){return `<span class="${UC_COLOR[uc]||'tag'}">${uc}</span>`}

/* --- toast / modal --- */
function toast(msg, kind){
  let box = $('#toasts'); if(!box){ box = document.createElement('div'); box.id='toasts'; document.body.appendChild(box); }
  const d=document.createElement('div'); d.className='toast '+(kind||''); d.textContent=msg; box.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';d.style.transition='.3s';setTimeout(()=>d.remove(),300)},2600);
}
function openModal(title, body, footer){
  $('#modalRoot').innerHTML = `
  <div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
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
        n: n.n, okDesc: n.okDesc, subs: n.subs,
        st: i<fromIdx ? 'ok' : 'queued',
        d:  i<fromIdx ? n.d : '等待执行',
      })),
      // 字段版本：新 Run 携带「当前生效取值」（含已修正值）
      fields: deepClone(prev.fields).map(f=>({
        k:f.k, v:f.v, src:f.src, conf:f.conf, quality:f.quality, low:f.low,
        docIndex:f.docIndex, page:f.page, locator:f.locator, locatorReason:f.locatorReason,
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
function animateRun(t, run){
  const seq = run.nodes.map((n,i)=>({n,i})).filter(x=>x.n.st!=='ok').map(x=>x.i);
  const step = (k)=>{
    if(k>=seq.length){ completeRun(t, run); return; }
    const i = seq[k]; const n = run.nodes[i];
    n.st='run'; n.d = n.okDesc ? '执行中…' : n.d; State.save(); rerenderSameTask(t.id, run.no);
    setTimeout(()=>{ n.st='ok'; if(n.okDesc) n.d=n.okDesc;
      addEvidence('process', t.id, t.uc, `R#${run.no} 节点「${n.n}」产出已登记`);
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
  addEvidence('process', t.id, t.uc, `R#${run.no} 全流程产物与证据链`);
  addNotify('任务执行成功', `${t.id} · R#${run.no} · ${t.case} 已完成`, 'g', '✓', `task-detail.html?id=${t.id}`);
  audit('执行完成', `${t.id} · R#${run.no}`, '执行引擎');
  State.save();
}
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
const UC34_CASES = [
  {id:'case-1', name:'Case 1 · 危险品托运清单'},
  {id:'case-2', name:'Case 2 · AVIS / MBUSI 与 BL'},
  {id:'case-3', name:'Case 3 · MBPLAP 发票与预报'},
  {id:'case-4', name:'Case 4 · X-entry 发票与预报'},
  {id:'case-5', name:'Case 5 · ASN'},
];
function getCase(){ return 'all'; }
function taskCaseId(t){
  if(t.uc!=='UC34') return null;
  if(t.caseId) return t.caseId;
  const legacy = {'C01':'case-1', 'C02':'case-2', 'C03':'case-3', 'C05':'case-4', 'C06':'case-5'};
  return legacy[(t.case||'').split(/[\s-]/)[0]] || null;
}
// 任务中心暂聚焦 Case1，列表与导航计数使用同一数据范围。
function taskMatch(t){ return ucMatch(t) && taskCaseId(t)===(getCase()==='all'?'case-1':getCase()); }
function caseLabel(id){ return UC34_CASES.find(c=>c.id===id)?.name || '未归类'; }
function readWorkbenchFilter(){
  if(qp('from')!=='workbench')return null;
  const mode=qp('mode'),start=qp('start'),end=qp('end'),status=qp('status');
  if(!['air','sea'].includes(mode)||!['completed','running','manual','sent','all'].includes(status))return null;
  if(start===null&&end===null)return {mode,status};
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  if(!validDate(start)||!validDate(end)||start>end)return null;
  return {mode,start,end,status};
}
function workbenchScopeActive(filter){return filter&&['all','UC34'].includes(getUC())&&['all','case-1'].includes(getCase());}
function workbenchRows(rows,filter){return rows.filter(r=>r.mode===filter.mode&&(!filter.start||r.date>=filter.start)&&(!filter.end||r.date<=filter.end));}
function workbenchScopeBanner(filter){return `<div class="center-context"><span>来自工作台：Case 1 · ${filter.mode==='air'?'空运':'海运'}${filter.start?' · '+esc(filter.start)+' 至 '+esc(filter.end):' · 全部记录'}</span><a href="index.html">返回工作台</a></div>`;}
/* 当前演示权限范围：仅 Case1；后续权限如含 case1/3/5，则按列表显示对应集合 */
const ALLOWED_CASE_IDS = ['case-1'];
function allowedCaseText(){
  return ALLOWED_CASE_IDS.map(id=>id.replace('case-','case')).join('、');
}
function centerContext(){
  return `<div class="center-context"><span>当前范围：<strong>${esc(allowedCaseText())}</strong></span><span>页面框架预览 · 具体配置将逐页完善</span></div>`;
}

/* --- 应用壳渲染 --- */
const NAV = [
  {sec:'工作区'},
  {r:'home', href:'index.html', ic:'&#8962;', t:'工作台'},
  {r:'tasks', href:'tasks.html', ic:'&#9776;', t:'任务中心', badge:()=>String(State.tasks.filter(taskMatch).length)},
  {r:'dim-tables', href:'dim-tables.html', ic:'&#8613;', t:'上传中心'},
  {r:'rules', href:'rules.html', ic:'&#9993;', t:'邮件中心'},
  {r:'config', href:'config.html', ic:'&#9881;', t:'配置中心'},
];
const PAGE_TITLES = {home:'工作台', tasks:'任务中心', 'task-detail':'任务详情', rules:'邮件中心', 'rule-edit':'邮件规则编辑', 'dim-tables':'上传中心', config:'配置中心', 'uc26-query':'UC26 分析工作台', notify:'提醒中心', govern:'治理运营台', rbac:'权限中心'};

function renderShell(){
  const page = document.body.dataset.page;
  const t = PAGE_TITLES[page]||'';
  $('#app-shell').innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="side-logo" href="index.html"><span class="dot"></span>MBPTS 智能作业平台<span class="ver">v1.0</span></a>
      <nav class="side-nav">
        ${NAV.filter(n=>!n.visible||n.visible()).map(n=> n.sec? `<div class="nav-sec">${n.sec}</div>` : `
          <a class="nav-item ${n.r===page||(n.r==='tasks'&&page==='task-detail')||(n.r==='rules'&&page==='rule-edit')?'on':''}" href="${n.href}">
            <span class="ic">${n.ic}</span>${n.t}
            <span class="badge ${n.badge?'':'hidden'}">${n.badge?n.badge():''}</span>
          </a>`).join('')}
        <div class="nav-sec">说明</div>
        <div style="padding:8px 12px;font-size:11px;color:#5f7890;line-height:1.7">
          交互原型 · 静态演示<br>基线：平台侧 PRD v1.0<br>范围：UC34 · 5 个 Case
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
          <div class="avatar" title="当前用户（业务操作员）">ER</div>
        </div>
      </div>
      <div class="viewport" id="view"></div>
    </div>
  </div>`;
  if(localStorage.getItem('mbpts_theme')==='dark') document.documentElement.setAttribute('data-theme','dark');
}
function updBadges(){
  const u = State.notify.filter(n=>!n.read).length;
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

/* --- dry-run：用规则 criteria 对样本邮件做真实匹配（规则列表 / 编辑器共用） --- */
function dryRun(rid, liveCrit){
  const r = rid ? State.rule(rid) : null;
  if(!r && !liveCrit) return;
  const c = liveCrit || r.crit;
  const name = r?`${r.name}（${r.id}）`:'草稿规则';
  const rs = State.mails.map(m=>{
    const reasons = [];
    if(c.to && !m.to.map(x=>x.toLowerCase()).includes(c.to.toLowerCase())) reasons.push('平台未在 To/Cc（不触发，记审计）');
    if(c.from){ const pats=c.from.split(/[;,，]/).map(s=>s.trim()).filter(Boolean);
      if(pats.length && !pats.some(p=>{ if(p.startsWith('*@')) return m.from.endsWith(p.slice(1)); return m.from===p; })) reasons.push('发件人不在白名单'); }
    if(c.subj && !m.subj.toLowerCase().includes(c.subj.toLowerCase())) reasons.push('主题不含关键词');
    if(Number(c.attMin)>m.att) reasons.push(`附件 ${m.att} < 下限 ${c.attMin}`);
    if(Number(c.attMax)<m.att) reasons.push(`附件 ${m.att} > 上限 ${c.attMax}`);
    return {m, hit: !reasons.length, reasons};
  });
  const hits = rs.filter(x=>x.hit).length;
  const notTrig = rs.filter(x=>!x.hit && x.reasons.some(r2=>r2.includes('不触发'))).length;
  openModal(`规则试运行 · ${esc(name)}`, `
    <p class="small muted" style="margin-bottom:12px">对样本邮件 ${rs.length} 封按当前条件模拟 · <b>不产生任何任务</b></p>
    <div class="dry-res">
      <div class="dry-row"><span>命中 <b style="color:var(--ok)">${hits}</b> / ${rs.length} 封</span><span class="tag ok">将创建任务</span></div>
      <div class="dry-row"><span>未命中 ${rs.length-hits} 封</span><span class="tag warn">${notTrig} 封「已收未触发」· 其余将进归类池</span></div>
      ${rs.map(x=>`<div class="dry-row"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${x.m.id} · ${esc(x.m.subj)}${x.hit?'':`<div class="tiny muted">${x.reasons.join('；')}</div>`}</span><span class="tag ${x.hit?'ok':'dan'}">${x.hit?'命中':'未命中'}</span></div>`).join('')}
    </div>`,
    `<button class="btn primary" onclick="closeModal()">完成</button>`);
  audit('规则试运行', r?r.id:'（草稿）', '规则配置');
}

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
  renderShell();
  settleElapsed();
  updBadges();
});
