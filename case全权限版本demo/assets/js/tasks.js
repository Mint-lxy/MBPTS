/* ===== tasks.js · 任务列表（Task 粒度：状态 = 当前执行实例状态） ===== */
let workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',SUCCEEDED:'已完成',RUNNING:'执行中',MANUAL:'待人工处理'};
const CHIP_STAGE={SUCCEEDED:'completed',RUNNING:'running',MANUAL:'manual'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};
function taskCaseText(t){ return (taskCaseId(t)||'').replace('case-','case'); }
/* case 列按子 Case 显示（如 Case5-MBPLAP / Case5-XEntry） */
function taskCaseLabel(t){ const c=taskCaseFilter(t); return c?c.label:taskCaseText(t); }
function taskTriggerSource(t){
  const run=latestRun(t);
  const manuallyRerun=t.runs.length>1 && /^(整单重跑|批量重跑|重跑 · 自节点)/.test(run?.cause||'');
  return manuallyRerun?'手动触发':t.src;
}
function taskSrcGroup(t){ return /^(定时|邮件)/.test(taskTriggerSource(t))?'自动触发':'人工触发'; }
/* 「最近执行开始」：最新执行实例的开始时间（重跑产生的「MM-DD HH:mm」补当前年份） */
function taskRunTimeText(t){
  const s=latestRun(t)?.start||'';
  return /^\d{2}-\d{2} /.test(s)?new Date().getFullYear()+'-'+s:s||'—';
}
/* 执行时间：该任务最新一次执行的开始日期 */
function taskRunDay(t){ return taskRunTimeText(t).slice(0,10); }
/* ===== 横向筛选（仿 case2 任务中心）：状态 / 库房 / 执行时间 / 单号搜索 =====
 * 筛选维度固定；搜索框只有一个，各 Case 搜索各自的单号（Case1/3/4 HAWB No.、Case2-GLC AVIS No.、Case2-MBUSI Booking Number、Case5 运单号）。 */
const caseOf=t=>CASES[taskCaseId(t)]||{};
function taskPdc(t){ const f=caseOf(t).pdcOf; return f?f(t)||'':''; }
function taskNumKeys(t){ const f=caseOf(t).numKeys; return [t.id].concat(f?f(t):[t.waybill]).filter(Boolean).map(x=>String(x).toLowerCase()); }
/* 任务的单号字段名（HAWB No. / AVIS No. / Booking Number …），由各 Case 模块给出 */
function taskNumLabel(t){ const f=caseOf(t).numLabel; return f?f(t.mode):'运单号'; }
/* 当前勾选的子 Case 可搜索的单号（作为搜索框占位文字） */
function numFields(){
  return [...new Set(visibleCaseFilters().filter(c=>taskFilter.lines.includes(c.key)).map(c=>{ const f=(CASES[c.caseId]||{}).numLabel; return f?f(c.mode):'运单号'; }))];
}
/* 标签列：各 Case 的业务字段值上下两行（单号 + PDC），字段名放在悬停提示里 */
function taskTagsHtml(t){
  const f=caseOf(t).numKeys, num=(f?f(t):[t.waybill])[0]||'', pdc=taskPdc(t);
  return `<div title="${esc(taskNumLabel(t))}">${esc(num||'—')}</div>${pdc?`<div class="tiny muted" title="PDC">${esc(pdc)}</div>`:''}`;
}
function parseNums(v){ return [...new Set(String(v||'').split(/[\s,，;；、]+/).map(x=>x.trim()).filter(Boolean))]; }
/* 搜索：多个号码用空格、逗号或换行分隔，任一命中即显示 */
const qTerms=()=>parseNums(taskFilter.q).map(x=>x.toLowerCase());
function qMatch(t){ const ts=qTerms(); if(!ts.length) return true; const ks=taskNumKeys(t); return ts.some(q=>ks.some(k=>k.includes(q))); }
function activeFilters(){ return (taskFilter.st!=='all')+taskFilter.pdc.length+!!(taskFilter.runFrom||taskFilter.runTo)+!!taskFilter.q.trim(); }
let fltOpen='';
function taskUseCaseText(t){
  return t.case;
}
/* lines：第二排勾选的子 Case（默认全选有权限的子 Case；从工作台进入时只勾该线路） */
const allLineKeys=()=>visibleCaseFilters().map(c=>c.key);
const emptyQuery=()=>({pdc:[],runFrom:'',runTo:'',q:''});
let taskFilter={st:workbenchFilter?WORKBENCH_STATUS_MAP[workbenchFilter.status]||'all':'all',lines:workbenchFilter?[workbenchFilter.key]:allLineKeys(),...emptyQuery()};
function resetTaskFilters(){ taskFilter={st:'all',lines:allLineKeys(),...emptyQuery()};workbenchFilter=null;fltOpen=''; }
function scopedTasks(){
  return State.tasks.filter(t=>taskMatch(t)&&(!workbenchScopeActive(workbenchFilter)||
    ((!workbenchFilter.start||taskRunDay(t)>=workbenchFilter.start)&&(!workbenchFilter.end||taskRunDay(t)<=workbenchFilter.end))));
}
function render(){
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <h2>任务中心</h2>
    <div style="display:flex;gap:9px"><button class="btn" onclick="exportTasks()">⤓ 导出列表</button><button class="btn primary" onclick="newTaskModal()">新建任务</button></div>
  </div>
  ${workbenchScopeActive(workbenchFilter)?workbenchScopeBanner(workbenchFilter):''}
  <div class="tblwrap task-frame">
    <div class="toolbar tb-flt">
      <div class="chips">${Object.entries(TASK_FILTER_LABELS).map(([s,label])=>`<button class="chip ${taskFilter.st===s?'on':''}" data-st="${s}">${label}</button>`).join('')}</div>
      ${pdcDropdown()}${runRange()}
      <label class="q-box">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/></svg>
        <input id="qIn" placeholder="${esc(numFields().join(' / ')||'单号')}" value="${esc(taskFilter.q)}" aria-label="搜索单号">
      </label>
      ${activeFilters()?'<button class="tb-clear" onclick="fltClearAll()">清除筛选</button>':''}
      ${workbenchScopeActive(workbenchFilter)?'<button class="tb-clear" onclick="clearWorkbenchScope()">清除工作台筛选</button>':''}
      <span class="tb-count" id="countInfo"></span>
    </div>
    <div class="toolbar">
      <div class="case-picks">
        <label class="case-pick ${taskFilter.lines.length===allLineKeys().length?'on':''}"><input type="checkbox" id="lineAll" ${taskFilter.lines.length===allLineKeys().length?'checked':''}>全部</label>
        ${visibleCaseFilters().map(c=>{const on=taskFilter.lines.includes(c.key);return `<label class="case-pick ${on?'on':''}"><input type="checkbox" data-line="${esc(c.key)}" ${on?'checked':''}>${esc(c.label)}</label>`;}).join('')}
      </div>
    </div>
    <div class="batch-bar" id="batchBar">
      <span>已勾选 <b id="batchCount">0</b> 个任务</span>
      <span class="bb-hint">批量重跑将为每个任务生成新的执行实例</span>
      <span style="flex:1"></span>
      <button class="btn sm" onclick="clearPick()">清除选择</button>
      <button class="btn sm" onclick="batchDownload()">⤓ 批量下载</button>
      <button class="btn sm danger" onclick="batchRerun()">批量重跑</button>
    </div>
    <div class="task-body">
      <div id="taskRows" class="task-scroll"></div>
    </div>
  </div>`;
  document.querySelectorAll('[data-st]').forEach(c=>c.onclick=()=>{taskFilter.st=c.dataset.st;render()});
  document.querySelectorAll('[data-line]').forEach(c=>c.onchange=()=>{
    taskFilter.lines=c.checked?[...new Set(taskFilter.lines.concat(c.dataset.line))]:taskFilter.lines.filter(k=>k!==c.dataset.line);render()});
  const all=$('#lineAll');
  all.indeterminate=taskFilter.lines.length>0&&taskFilter.lines.length<allLineKeys().length;
  all.onchange=()=>{taskFilter.lines=all.checked?allLineKeys():[];render()};
  bindFilter();
  fitTaskFrame();
  renderRows();
}
/* 列表框固定高度（撑满到窗口底部）：表头不动，列表在框内上下、左右滚动 */
function fitTaskFrame(){
  const el=document.querySelector('.task-frame'); if(!el) return;
  const vp=document.querySelector('.viewport'), top=el.getBoundingClientRect().top+(vp?vp.scrollTop:0);
  el.style.height=Math.max(420, window.innerHeight-top-24)+'px';
}
window.addEventListener('resize', fitTaskFrame);
function clearWorkbenchScope(){resetTaskFilters();history.replaceState(null,'','tasks.html');render();}
function fltClearAll(){ const lines=taskFilter.lines; Object.assign(taskFilter, emptyQuery(), {st:'all', lines}); fltOpen=''; render(); }
/* ---------- 库房（多选下拉）：选项为当前勾选 Case 下任务的 PDC；没有库房的 Case 不出现在选项里 ---------- */
function pdcOptions(){
  return [...new Set(scopedTasks().filter(t=>taskFilter.lines.includes((taskCaseFilter(t)||{}).key)).map(taskPdc).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh'));
}
function pdcDropdown(){
  const sel=taskFilter.pdc, opts=pdcOptions();
  return `<div class="flt${fltOpen==='pdc'?' open':''}">
    <button class="pick-btn${sel.length?' on':''}" ${opts.length||sel.length?'':'disabled title="所选 Case 没有库房"'} onclick="fltToggle('pdc')"><span class="pk-l">库房</span><span class="pk-v">${!sel.length?'全部':sel.length===1?esc(sel[0]):sel.length+' 项'}</span></button>
    ${fltOpen==='pdc'?`<div class="flt-pop">
      <button class="flt-all" onclick="pdcClear()">全部库房</button>
      ${opts.map(p=>`<label class="flt-opt"><input type="checkbox" ${sel.includes(p)?'checked':''} onchange="pdcPick('${esc(p)}')"><span>${esc(p)}</span></label>`).join('')}
    </div>`:''}
  </div>`;
}
function fltToggle(k){ fltOpen=fltOpen===k?'':k; render(); }
function pdcPick(p){ const a=taskFilter.pdc, i=a.indexOf(p); i<0?a.push(p):a.splice(i,1); render(); }
function pdcClear(){ taskFilter.pdc=[]; render(); }
document.addEventListener('click', e=>{ if(fltOpen && !e.target.closest('.flt')){ fltOpen=''; render(); } });
/* ---------- 执行时间：开始时间 - 结束时间（任务最新一次执行的日期） ---------- */
function runRange(){
  const inp=(k,ph)=>`<input type="${taskFilter[k]?'date':'text'}" id="${k}In" value="${esc(taskFilter[k])}" placeholder="${ph}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="setRun('${k}',this.value)" aria-label="执行时间${ph}">`;
  return `<div class="d-range${taskFilter.runFrom||taskFilter.runTo?' on':''}"><span class="pk-l">执行时间</span>${inp('runFrom','开始时间')}<i>-</i>${inp('runTo','结束时间')}</div>`;
}
function setRun(k, v){
  const next={...taskFilter, [k]:v};
  if(next.runFrom&&next.runTo&&next.runFrom>next.runTo){ toast('开始时间不能晚于结束时间','err'); render(); return; }
  taskFilter[k]=v; render();
}
/* ---------- 搜索框：输入即筛选；粘贴多行时换行转空格 ---------- */
function bindFilter(){
  const q=$('#qIn'); if(!q) return;
  q.oninput=e=>{ taskFilter.q=e.target.value; renderRows(); };
  q.onchange=()=>render();
  q.onpaste=e=>{
    const txt=(e.clipboardData||window.clipboardData).getData('text');
    if(!/[\r\n\t]/.test(txt)) return;
    e.preventDefault();
    q.setRangeText(txt.trim().replace(/[\r\n\t]+/g,' '), q.selectionStart, q.selectionEnd, 'end');
    q.dispatchEvent(new Event('input'));
  };
  /* 下拉超出视口右侧时改为右对齐 */
  document.querySelectorAll('.flt-pop').forEach(pop=>{ if(pop.getBoundingClientRect().right>window.innerWidth-12){ pop.style.left='auto'; pop.style.right='0'; } });
}
function filtered(){
  return scopedTasks().filter(t=>{
    const st=taskStatus(t);
    if(!taskFilter.lines.includes((taskCaseFilter(t)||{}).key))return false;
    /* 与工作台同一口径（core.js taskStage） */
    if(taskFilter.st!=='all'&&taskStage(t)!==CHIP_STAGE[taskFilter.st])return false;
    if(taskFilter.pdc.length&&!taskFilter.pdc.includes(taskPdc(t)))return false;
    if(taskFilter.runFrom&&taskRunDay(t)<taskFilter.runFrom)return false;
    if(taskFilter.runTo&&taskRunDay(t)>taskFilter.runTo)return false;
    if(!qMatch(t))return false;
    return true;
  });
}
function renderRows(){
  const list=filtered();
  $('#taskRows').innerHTML=`<table class="tbl">
    <thead><tr><th class="pick-col"><input type="checkbox" id="selAll" aria-label="全选当前筛选结果" title="全选当前筛选结果"></th><th>任务编号</th><th>case</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th><th>标签</th></tr></thead>
    <tbody>${list.map(t=>{
      const st=taskStatus(t),latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id);
      const picked=pickedTaskIds.has(t.id);
      return `<tr class="click${picked?' sel':''}" onclick="location.href='${href}'">
        <td class="pick-col" onclick="event.stopPropagation()"><input type="checkbox" class="row-pick" data-id="${esc(t.id)}" ${picked?'checked':''} aria-label="选择任务 ${esc(t.id)}"></td>
        <td><a href="${href}"><b>${esc(t.id)}</b></a></td><td><span class="tag gold">${esc(taskCaseLabel(t))}</span></td>
        <td class="small">${esc(taskSrcGroup(t))}</td><td>${stageTag(t)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td><td>${taskTagsHtml(t)}</td></tr>`;
    }).join('')||'<tr><td colspan="9"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>'}</tbody></table>`;
  /* 搜索多个号码时，提示命中几个；未找到的号码放在悬停提示里 */
  const terms=qTerms(), ci=$('#countInfo');
  if(terms.length>1){
    const miss=terms.filter(q=>!list.some(t=>taskNumKeys(t).some(k=>k.includes(q))));
    ci.textContent=`号码命中 ${terms.length-miss.length} / ${terms.length} · ${list.length} / ${scopedTasks().length} 条`;
    ci.title=miss.length?'未找到：'+miss.join('、'):'';
  }else{ ci.textContent=`${list.length} / ${scopedTasks().length} 条`; ci.title=''; }
  document.querySelectorAll('.row-pick').forEach(cb=>cb.onchange=()=>{
    cb.checked?pickedTaskIds.add(cb.dataset.id):pickedTaskIds.delete(cb.dataset.id);
    syncBatchUI();
  });
  $('#selAll').onchange=()=>{
    const cur=filtered();
    if($('#selAll').checked) cur.forEach(t=>pickedTaskIds.add(t.id)); else cur.forEach(t=>pickedTaskIds.delete(t.id));
    renderRows();
  };
  syncBatchUI();
}
/* ===== 批量选择与批量重跑（勾选任务 → 逐个生成新执行实例） ===== */
let pickedTaskIds=new Set();
function syncBatchUI(){
  document.querySelectorAll('.row-pick').forEach(cb=>{
    const tr=cb.closest('tr'); if(tr) tr.classList.toggle('sel',cb.checked);
  });
  const list=filtered();
  const picked=list.filter(t=>pickedTaskIds.has(t.id)).length;
  const sa=$('#selAll');
  if(sa){ sa.checked=list.length>0&&picked===list.length; sa.indeterminate=picked>0&&picked<list.length; }
  const bar=$('#batchBar'); if(bar) bar.classList.toggle('on',pickedTaskIds.size>0);
  const cnt=$('#batchCount'); if(cnt) cnt.textContent=pickedTaskIds.size;
}
function clearPick(){ pickedTaskIds.clear(); renderRows(); }
/* ===== 批量下载：勾选任务的文件打包下载（每票：原始文件 + 已执行节点产出的文件，如填好的导入模板） ===== */
function taskFiles(t){
  const run = latestRun(t); if(!run) return [];
  const nf = caseOf(t).nodeFiles || {}, cfgs = nf[t.mode] || nf['*'] || {};
  const out = (run.files||[]).map(f=>f.name);
  run.nodes.forEach(n=>{
    if(!['ok','fail','review'].includes(n.st)) return;
    const c = cfgs[n.n];
    if(c && c.file) out.push(c.file(t));
    (n.evFiles||[]).forEach(f=>{ if(/\.(xlsx|pdf|docx|msg)$/i.test(f[0])) out.push(f[0]); });
  });
  return [...new Set(out.filter(Boolean))];
}
function batchDownload(){
  const targets = [...pickedTaskIds].map(id=>State.task(id)).filter(Boolean);
  if(!targets.length){ toast('请先勾选需要下载的任务','warn'); return; }
  const list = targets.map(t=>({t, files:taskFiles(t)})), total = list.reduce((n,x)=>n+x.files.length, 0);
  openModal('批量下载确认', `
    <p class="small" style="margin-bottom:10px">将把勾选的 <b>${targets.length}</b> 个任务共 <b>${total}</b> 个文件打包为一个压缩包下载，每个任务一个文件夹。</p>
    <div class="batch-pick-list">${list.slice(0,8).map(x=>`<div class="bpl-row"><span class="bpl-id">${esc(x.t.id)}</span><span class="bpl-case" title="${esc(x.files.join('、'))}">${x.files.length?esc(x.files.join('、')):'暂无可下载文件'}</span><span class="tag">${x.files.length} 个</span></div>`).join('')}${list.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${list.length-8} 个任务</div>`:''}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" ${total?'':'disabled'} onclick="confirmBatchDownload()">下载</button>`);
}
function confirmBatchDownload(){
  closeModal();
  const targets = [...pickedTaskIds].map(id=>State.task(id)).filter(Boolean);
  const total = targets.reduce((n,t)=>n+taskFiles(t).length, 0);
  const name = `任务文件_${targets.length}票_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.zip`;
  targets.forEach(t=>t.ops.unshift({tm:now(), txt:`批量下载 · 本任务 ${taskFiles(t).length} 个文件（${name}）`}));
  audit('批量下载', `${targets.length} 个任务 · ${total} 个文件`, '任务中心');
  State.save();
  toast(`已下载 ${name}（演示）`,'ok');
}
function batchRerun(){
  const targets=[...pickedTaskIds].map(id=>State.task(id)).filter(Boolean);
  if(!targets.length){ toast('请先勾选需要重跑的任务','warn'); return; }
  const running=targets.filter(t=>taskStatus(t)==='RUNNING').length;
  openModal('批量重跑确认', `
    <p class="small" style="margin-bottom:10px">将为勾选的 <b>${targets.length}</b> 个任务分别生成新执行实例（整单重跑），原有执行保持只读归档。${running?`<br><b style="color:var(--gold)">其中 ${running} 个任务正在执行中，将自动跳过。</b>`:''}</p>
    <div class="batch-pick-list">${targets.slice(0,8).map(t=>`<div class="bpl-row"><span class="bpl-id">${esc(t.id)}</span><span class="bpl-case">${esc(taskUseCaseText(t))}</span>${stTag(taskStatus(t))}</div>`).join('')}${targets.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${targets.length-8} 个任务</div>`:''}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn danger" onclick="confirmBatchRerun()">确认批量重跑</button>`);
}
function confirmBatchRerun(){
  closeModal();
  const targets=[...pickedTaskIds].map(id=>State.task(id)).filter(Boolean);
  let done=0,skipped=0;
  targets.forEach(t=>{
    if(taskStatus(t)==='RUNNING'){ skipped++; return; }
    if(scheduleRun(t.id,0,'批量重跑')) done++; else skipped++;
  });
  audit('批量重跑', `${done} 个任务${skipped?` · 跳过 ${skipped} 个`:''}`, '任务中心');
  if(done) toast(`已触发 ${done} 个任务批量重跑${skipped?`，跳过 ${skipped} 个执行中任务`:''}`,'ok');
  else toast('所选任务均在执行中，已跳过','warn');
  pickedTaskIds.clear();
  renderRows();
}
/* ===== 新建任务（全权限版：有权限的子 Case 均可新建，沿用各 Case 的 BRD 样例，创建后为已完成执行） ===== */
function newTaskModal(){
  openModal('新建任务', `
    <div class="fld" style="margin-bottom:14px"><label>子 Case</label>
      <select class="pick" style="width:100%" id="newTaskLine">
        ${visibleCaseFilters().filter(c=>CASES[c.caseId]&&CASES[c.caseId].demoTask).map(c=>`<option value="${esc(c.key)}">${esc(c.label)} · ${esc(CASES[c.caseId].label.split(' · ')[1]||'')}</option>`).join('')}
      </select></div>
    <p class="tiny muted" style="margin:0">创建后将在任务中心新增一条任务，并自动开始模拟执行。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="createNewTask()">创建并执行</button>`);
}
function createNewTask(){
  const line=CASE_FILTERS.find(c=>c.key===($('#newTaskLine')||{}).value);
  const mod=line&&CASES[line.caseId];
  if(!mod||!mod.demoTask||!ALLOWED_CASE_IDS.includes(line.caseId)) return;
  closeModal();
  const prefix='T-DEMO-'+line.abbr+'-';
  let n=1; while(State.task(prefix+String(n).padStart(3,'0'))) n++;
  const id=prefix+String(n).padStart(3,'0');
  const demo=mod.demoTask(line.mode);
  const t={
    id, uc:'UC34', caseId:line.caseId, case:demo.case, mode:line.mode, waybill:demo.waybill, date:demo.date,
    src:'手动创建', rule:'—',
    ops:[{tm:now(), txt:`任务创建 · 手动新建（${line.label}）`}],
    runs:[{
      no:1, cause:'手动创建 · 初次执行 · '+line.label, st:'SUCCEEDED', start:now(), dur:demo.dur||'已完成',
      nodes:demo.nodes, fields:demo.fields, files:demo.files,
      summary:`手动新建任务（${line.label}）已完成：全流程执行成功，证据链已登记。`,
    }],
    fillFields:demo.fillFields, fillFiles:demo.fillFiles,
    fillSummary:`手动新建任务（${line.label}）已完成，证据链已登记。`,
  };
  State.tasks.unshift(t);
  addEvidence('trigger', t.id, 'UC34', `手动新建任务（${line.label} · ${demo.case}）`);
  audit('创建任务', `${t.id} · ${line.label} · ${demo.case}`, '任务中心');
  State.save();
  toast(`任务 ${t.id} 已创建（${line.label}）`,'ok');
  render();
}
function exportTasks(){
  const list=filtered();
  const rows=[['任务编号','运单号','case','用例','触发来源','状态','执行次数','最近执行开始'],
    ...list.map(t=>{const r=latestRun(t);return [t.id,t.waybill||'',taskCaseLabel(t),taskUseCaseText(t),taskSrcGroup(t),STAGE_META[taskStage(t)].t,t.runs.length,r?taskRunTimeText(t):'（未执行）'];})];
  dl(`任务列表_${Date.now()}.csv`,'\uFEFF'+toCsv(rows),'text/csv;charset=utf-8');
  audit('导出任务列表',`${list.length} 条`,'任务中心');
  toast(`已导出 ${list.length} 条任务（CSV）`,'ok');
}
document.addEventListener('DOMContentLoaded',()=>{render();if(qp('new')==='1')newTaskModal();});
