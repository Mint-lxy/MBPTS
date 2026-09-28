/* ===== tasks.js · 任务列表（Task 粒度：状态 = 当前执行实例状态） ===== */
let workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',RUNNING:'执行中',MANUAL:'待人工处理',WAIT_INPUT:'待上传',DIFF_PENDING:'有差异',FAILED:'失败',SUCCEEDED:'已完成'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};
function taskCaseText(t){ return (taskCaseId(t)||'').replace('case-','case'); }
function taskTriggerSource(t){
  const run=latestRun(t);
  const manuallyRerun=t.runs.length>1 && /^(整单重跑|批量重跑|重跑 · 自节点)/.test(run?.cause||'');
  return manuallyRerun?'手动触发':t.src;
}
/* 演示用：「最近执行开始」仅前端展示 —— 定时来源统一显示当天 00:00（BRD：空运每天晚上12点运行，海运同口径），
   手动来源（手动创建 / 手动触发）显示当天实际执行时间 */
function taskRunTimeText(t){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  const today=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(/^定时/.test(taskTriggerSource(t))) return today+' 00:00';
  const hm=/(\d{2}:\d{2})\s*$/.exec(latestRun(t)?.start||'');
  return today+' '+(hm?hm[1]:`${p(d.getHours())}:${p(d.getMinutes())}`);
}
function taskUseCaseText(t){
  return t.case;
}
let taskFilter={st:workbenchFilter?WORKBENCH_STATUS_MAP[workbenchFilter.status]||'all':'all',mode:workbenchFilter?.mode||'all',src:'all',q:''};
function resetTaskFilters(){ taskFilter={st:'all',mode:'all',src:'all',q:''};workbenchFilter=null; }
function scopedTasks(){
  return State.tasks.filter(t=>taskMatch(t)&&(!workbenchScopeActive(workbenchFilter)||
    (t.demoWorkbench&&(!workbenchFilter.start||t.date>=workbenchFilter.start)&&(!workbenchFilter.end||t.date<=workbenchFilter.end))));
}
function render(){
  /* 「手动触发」固定保留在选择项中（当前无手动任务时点击显示空列表） */
  const srcs=[...new Set(['手动触发',...scopedTasks().map(taskTriggerSource)])];
  $('#view').innerHTML=`
  <div class="page-hd">
    <div><h2>任务中心</h2><div class="sub">任务为业务单据粒度 · 状态取自<b>最新执行实例（当前执行）</b> · 每次重跑产生独立 Run（M1 核心模块）</div></div>
    <div style="display:flex;gap:9px"><button class="btn" onclick="exportTasks()">⤓ 导出列表</button><button class="btn primary" onclick="newTaskModal()">新建任务</button></div>
  </div>
  ${workbenchScopeActive(workbenchFilter)?workbenchScopeBanner(workbenchFilter):''}
  <div class="tblwrap">
    <div class="toolbar">
      <div class="chips">${Object.entries(TASK_FILTER_LABELS).map(([s,label])=>`<button class="chip ${taskFilter.st===s?'on':''}" data-st="${s}">${label}</button>`).join('')}</div>
      <select class="pick" id="srcPick"><option value="all">全部来源</option>${srcs.map(s=>`<option ${taskFilter.src===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
      <input class="search" id="qIn" placeholder="搜索任务编号 / 运单号 / case / 用例" value="${esc(taskFilter.q)}">
      ${workbenchScopeActive(workbenchFilter)?'<button class="btn sm" onclick="clearWorkbenchScope()">清除工作台筛选</button>':''}
      <span class="tiny muted" style="margin-left:auto" id="countInfo"></span>
    </div>
    <div class="batch-bar" id="batchBar">
      <span>已勾选 <b id="batchCount">0</b> 个任务</span>
      <span class="bb-hint">批量重跑将为每个任务生成新的执行实例</span>
      <span style="flex:1"></span>
      <button class="btn sm" onclick="clearPick()">清除选择</button>
      <button class="btn sm danger" onclick="batchRerun()">批量重跑</button>
    </div>
    <div id="taskRows"></div>
  </div>`;
  document.querySelectorAll('[data-st]').forEach(c=>c.onclick=()=>{taskFilter.st=c.dataset.st;render()});
  $('#srcPick').onchange=e=>{taskFilter.src=e.target.value;renderRows()};
  $('#qIn').oninput=e=>{taskFilter.q=e.target.value;renderRows()};
  renderRows();
}
function clearWorkbenchScope(){resetTaskFilters();history.replaceState(null,'','tasks.html');render();}
function filtered(){
  return scopedTasks().filter(t=>{
    const st=taskStatus(t);
    if(taskFilter.mode!=='all'&&t.mode!==taskFilter.mode)return false;
    if(taskFilter.st==='MANUAL'&&!['WAIT_INPUT','DIFF_PENDING','FAILED','CREATED'].includes(st))return false;
    if(!['all','MANUAL'].includes(taskFilter.st)&&st!==taskFilter.st)return false;
    if(taskFilter.src!=='all'&&taskTriggerSource(t)!==taskFilter.src)return false;
    if(taskFilter.q&&!(t.id+t.case+t.uc+taskCaseText(t)+taskUseCaseText(t)+(t.waybill||'')).toLowerCase().includes(taskFilter.q.toLowerCase()))return false;
    return true;
  });
}
function renderRows(){
  const list=filtered();
  $('#taskRows').innerHTML=`<table class="tbl">
    <thead><tr><th class="pick-col"><input type="checkbox" id="selAll" aria-label="全选当前筛选结果" title="全选当前筛选结果"></th><th>任务编号</th><th>case</th><th>用例</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th></tr></thead>
    <tbody>${list.map(t=>{
      const st=taskStatus(t),latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id);
      const picked=pickedTaskIds.has(t.id);
      return `<tr class="click${picked?' sel':''}" onclick="location.href='${href}'">
        <td class="pick-col" onclick="event.stopPropagation()"><input type="checkbox" class="row-pick" data-id="${esc(t.id)}" ${picked?'checked':''} aria-label="选择任务 ${esc(t.id)}"></td>
        <td><a href="${href}"><b>${esc(t.id)}</b></a>${t.waybill?`<div class="tiny muted">${esc(t.waybill)}</div>`:''}</td><td><span class="tag gold">${esc(taskCaseText(t))}</span></td><td><b>${esc(taskUseCaseText(t))}</b></td>
        <td class="small">${esc(taskTriggerSource(t))}</td><td>${stTag(st)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td></tr>`;
    }).join('')||'<tr><td colspan="9"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>'}</tbody></table>`;
  $('#countInfo').textContent=`${list.length} / ${scopedTasks().length} 条`;
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
/* ===== 新建任务（Case 2：GLC / MBUSI，创建后立即模拟执行） ===== */
function newTaskModal(){
  openModal('新建任务', `
    <div class="fld" style="margin-bottom:14px"><label>线路</label>
      <select class="pick" style="width:100%" id="newTaskMode">
        <option value="glc">GLC · AVIS & BL 创建（OOCL）</option>
        <option value="mbusi">MBUSI · Shipping Log & BL 创建（CMA CGM）</option>
      </select></div>
    <p class="tiny muted" style="margin:0">创建后将在任务中心新增一条任务，并自动开始模拟执行。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="createNewTask()">创建并执行</button>`);
}
function createNewTask(){
  const mode=$('#newTaskMode')?$('#newTaskMode').value:'glc';
  if(!['glc','mbusi'].includes(mode)) return;
  closeModal();
  const isMbusi=mode==='mbusi';
  const prefix=isMbusi?'T-DEMO-M':'T-DEMO-G';
  let n=1; while(State.task(prefix+String(n).padStart(3,'0'))) n++;
  const id=prefix+String(n).padStart(3,'0');
  const modeText=isMbusi?'MBUSI（CMA CGM）':'GLC（OOCL）';
  const caseName=isMbusi?'MBUSI Shipping Log 与 BL':'AVIS 与 BL 创建（GLC）';
  /* 手动新建沿用各线路的 BRD 样例（节点证据、字段与原文与定时任务一致） */
  const demoWb=isMbusi?'NAM8646083':'OOLU2038969910';
  const demoC=isMbusi?mbusiCase(demoWb):avisCase(demoWb);
  const nodes=case2TemplateNodes(mode, demoWb);
  const t={
    id, uc:'UC34', caseId:'case-2', case:caseName, mode, waybill:demoWb,
    src:'手动创建', rule:'—',
    ops:[{tm:now(), txt:`任务创建 · 手动新建（${modeText}）`}],
    runs:[{
      no:1, cause:'手动创建 · 初次执行 · '+modeText, st:'SUCCEEDED', start:now(), dur:isMbusi?'8m 12s':'10m 05s',
      nodes,
      fields:isMbusi?mbusiFields(demoC, demoWb):avisFields(demoC, demoWb),
      files:isMbusi?mbusiFiles(demoC, demoWb):avisFiles(demoC, demoWb),
      summary:`手动新建任务（${modeText}）已完成：全流程执行成功，证据链已登记。`,
    }],
    fillSummary:`手动新建任务（${modeText}）已完成，证据链已登记。`,
  };
  State.tasks.unshift(t);
  addEvidence('trigger', t.id, 'UC34', `手动新建任务（${modeText} · ${caseName}）`);
  audit('创建任务', `${t.id} · ${caseName} · ${modeText}`, '任务中心');
  State.save();
  toast(`任务 ${t.id} 已创建（${modeText}）`,'ok');
  render();
}
function exportTasks(){
  const list=filtered();
  const rows=[['任务编号','BL No.','线路','用例','case','触发来源','状态','执行次数','最近执行开始'],
    ...list.map(t=>{const r=latestRun(t);return [t.id,t.waybill||'',{glc:'GLC（OOCL）',mbusi:'MBUSI（CMA CGM）'}[t.mode]||'',taskUseCaseText(t),taskCaseText(t),taskTriggerSource(t),STATE_META[taskStatus(t)].t,t.runs.length,r?taskRunTimeText(t):'（未执行）'];})];
  dl(`任务列表_${Date.now()}.csv`,'\uFEFF'+toCsv(rows),'text/csv;charset=utf-8');
  audit('导出任务列表',`${list.length} 条`,'任务中心');
  toast(`已导出 ${list.length} 条任务（CSV）`,'ok');
}
document.addEventListener('DOMContentLoaded',()=>{render();if(qp('new')==='1')newTaskModal();});
