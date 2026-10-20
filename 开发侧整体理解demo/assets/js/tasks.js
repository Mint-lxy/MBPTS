/* ===== tasks.js · 任务中心（三级） =====
 * 第一级 tasks.html：任务类型列表，顶部按 Case 筛选。
 * 第二级 tasks.html?type=<类型 id>：该类型的任务列表——月历热力图（可切换月份）、
 *   状态 / 来源 / PDC 筛选、标签搜索、手动触发、批量重跑、批量下载。
 * 第三级 task-detail.html?id=<任务编号>：任务详情。
 * 任务类型即 core.js 的 CASE_FILTERS（子 Case）。状态口径与工作台一致（core.js taskStage）。
 */
let workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',SUCCEEDED:'已完成',RUNNING:'执行中',MANUAL:'待人工处理'};
const CHIP_STAGE={SUCCEEDED:'completed',RUNNING:'running',MANUAL:'manual'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};

/* ===== 通用取值 ===== */
function taskTriggerSource(t){
  const run=latestRun(t);
  const manuallyRerun=t.runs.length>1 && /^(整单重跑|批量重跑|重跑 · 自节点)/.test(run?.cause||'');
  return manuallyRerun?'手动触发':t.src;
}
/* 来源只分两类：自动触发（定时调度 / 邮件触发）、手动触发（手动新建 / 手动触发 / 重跑） */
function taskSrcGroup(t){ return /^(定时|邮件)/.test(taskTriggerSource(t))?'自动触发':'手动触发'; }
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const withYear=s=>/^\d{2}-\d{2} /.test(s||'')?new Date().getFullYear()+'-'+s:(s||'');
/* 「最近执行开始」：最新执行实例的开始时间（重跑产生的「MM-DD HH:mm」补当前年份） */
function taskRunTimeText(t){ return withYear(latestRun(t)?.start)||'—'; }
function taskRunDay(t){ return taskRunTimeText(t).slice(0,10); }
/* 任务所在的日期（日历维度）：首个执行实例的开始日期，即触发日 */
function taskDay(t){ return (withYear((t.runs[0]||{}).start)||t.date||'').slice(0,10); }
const caseOf=t=>CASES[taskCaseId(t)]||{};
function taskNumLabel(t){ const f=caseOf(t).numLabel; return f?f(t.mode):'运单号'; }
/* PDC 只有 CASE_FILTERS 标了 pdc 的任务类型才有（Case1-空运、Case2a-GLC、Case2b-MBUSI） */
function taskPdc(t){ const f=caseOf(t).pdcOf; return (taskCaseFilter(t)||{}).pdc&&f?f(t)||'':''; }

/* ===== 标签：键值对（对应 task_tag），依次为业务单号、运单号（与业务单号不同时）、PDC ===== */
function taskTags(t){
  const mod=caseOf(t), tags=[];
  const num=(mod.numKeys?mod.numKeys(t):[t.waybill])[0];
  if(num) tags.push({k:taskNumLabel(t), v:String(num)});
  if(t.waybill && String(t.waybill)!==String(num)) tags.push({k:mod.waybillLabel?mod.waybillLabel(t):'运单号', v:String(t.waybill)});
  const pdc=taskPdc(t);
  if(pdc) tags.push({k:'PDC', v:pdc});
  return tags;
}
const TAG_COLOR={'HAWB No.':'kc-blue','HAWB/BL No.':'kc-blue','BL/HAWB':'kc-blue','AVIS No.':'kc-green','BL No.':'kc-purple',
  'Booking Number':'kc-cyan','Booking No.':'kc-cyan','AWB No.':'kc-magenta','PDC':'kc-orange'};
const TAG_PALETTE=['kc-blue','kc-green','kc-purple','kc-orange','kc-cyan','kc-magenta'];
function tagColor(k){ return TAG_COLOR[k]||TAG_PALETTE[[...k].reduce((a,c)=>a+c.charCodeAt(0),0)%TAG_PALETTE.length]; }
function taskTagsHtml(t){
  const tags=taskTags(t);
  return tags.length?`<div class="kv-tags">${tags.map(x=>`<span class="kv-tag ${tagColor(x.k)}"><i>${esc(x.k)}</i><b>${esc(x.v)}</b></span>`).join('')}</div>`:'<span class="muted">—</span>';
}

function typeTasks(type){ return State.tasks.filter(t=>taskMatch(t)&&(taskCaseFilter(t)||{}).key===type.key); }
/* 各状态的任务数和最近一次执行时间（状态按钮上的数字、任务类型列表用） */
function typeStats(tasks){
  const n=s=>tasks.filter(t=>taskStage(t)===s).length;
  const last=tasks.map(taskRunTimeText).filter(s=>s!=='—').sort().pop()||'';
  return {total:tasks.length, completed:n('completed'), running:n('running'), manual:n('manual'), last};
}
function typeTriggerText(tasks){ const s=[...new Set(tasks.map(taskSrcGroup))]; return s.length?s.join(' / '):'—'; }

/* ===== 页面状态 ===== */
let currentType=taskTypeById(qp('type'));
if(currentType && !bizAllowed(currentType.biz)) currentType=null;   /* 没有权限的任务类型不能直接进 */
let typeCase=bizAllowed(qp('case'))?qp('case'):'all';
/* 从工作台进入：该行只有一个任务类型时直接进第二级并带上状态、日期；多个类型时进第一级并按 Case 筛选 */
if(workbenchFilter){
  if(workbenchFilter.keys.length===1) currentType=CASE_FILTERS.find(c=>c.key===workbenchFilter.keys[0])||null;
  else { typeCase=CASE_FILTERS.find(c=>c.key===workbenchFilter.keys[0])?.biz||'all'; workbenchFilter=null; }
}
let taskFilter=newTaskFilter();
function newTaskFilter(){
  return {st:workbenchFilter?WORKBENCH_STATUS_MAP[workbenchFilter.status]||'all':'all', src:'all', pdc:'', kw:'', day:''};
}
/* batchMode：'' / 'rerun' 批量重跑 / 'download' 批量下载 */
let batchMode='', pickedTaskIds=new Set();
/* 日历当前显示的月份：默认取该类型最近一票任务所在月份，没有任务时取本月 */
let calMonth=null;
function render(){ currentType?renderTypePage():renderTypeList(); }

/* ==================== 第一级：任务类型列表 ==================== */
function renderTypeList(){
  setCrumb('<b>任务中心</b>');
  const types=visibleCaseFilters().filter(c=>typeCase==='all'||c.biz===typeCase);
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <h2>任务中心</h2>
    ${casePickHtml('typeCasePick', typeCase, true)}
  </div>
  <div class="tblwrap">
    <table class="tbl type-tbl">
      <thead><tr><th>任务类型</th><th>所属 Case</th><th>触发方式</th><th>执行中</th><th>待人工处理</th><th>最近执行</th><th aria-hidden="true"></th></tr></thead>
      <tbody>${types.map(c=>{
        const list=typeTasks(c), s=typeStats(list), href='tasks.html?type='+encodeURIComponent(c.id);
        return `<tr class="click" onclick="location.href='${href}'">
          <td><a href="${href}"><b>${esc(c.label)}</b></a></td>
          <td class="small">${esc(caseLabel(c.biz))}</td>
          <td class="small">${esc(typeTriggerText(list))}</td>
          <td>${s.running?`<span class="tag blue">${s.running}</span>`:'0'}</td>
          <td>${s.manual?`<span class="tag warn">${s.manual}</span>`:'0'}</td>
          <td class="small muted">${esc(s.last||'—')}</td><td class="muted">›</td></tr>`;
      }).join('')||'<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>没有可查看的任务类型</div></td></tr>'}</tbody>
    </table>
  </div>`;
  bindCasePick('typeCasePick', v=>{typeCase=v; history.replaceState(null,'',typeCase==='all'?'?':'?case='+typeCase); renderTypeList();});
}

/* ==================== 第二级：某个任务类型的任务列表 ==================== */
function renderTypePage(){
  const type=currentType, all=typeTasks(type), s=typeStats(all), mod=CASES[type.caseId]||{};
  setCrumb(`<a href="tasks.html">任务中心</a> · <b>${esc(type.label)}</b>`);
  const canTrigger=!!mod.demoTask;
  const pdcs=type.pdc?[...new Set(all.map(taskPdc).filter(Boolean))].sort():[];
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <div><div class="task-back"><a href="tasks.html${typeCase!=='all'?'?case='+typeCase:''}">← 返回任务类型</a></div>
      <h2>${esc(type.label)}</h2><div class="sub">${esc(caseLabel(type.biz))}</div></div>
  </div>
  ${workbenchScopeActive(workbenchFilter)?workbenchScopeBanner(workbenchFilter):''}
  <div class="type-overview">
    <section class="card heat-card" aria-label="按日期的任务日历">
      <div class="heat-hd"><b>任务日历</b>
        <span class="heat-nav"><button class="btn sm ghost" onclick="shiftMonth(-1)" aria-label="上个月">‹</button><b id="calTitle"></b><button class="btn sm ghost" id="calNext" onclick="shiftMonth(1)" aria-label="下个月">›</button></span>
        <span class="heat-legend"><i class="hc red"></i>有待人工处理<i class="hc yellow"></i>有未处理完<i class="hc green"></i>全部成功<i class="hc"></i>无任务</span></div>
      <div id="heatmap"></div>
    </section>
  </div>
  <div class="tblwrap task-frame">
    <div class="toolbar">
      <div class="chips">${Object.entries(TASK_FILTER_LABELS).map(([k,label])=>`<button class="chip ${taskFilter.st===k?'on':''}" data-st="${k}" ${batchMode&&taskFilter.st!==k?`disabled title="${batchMode==='rerun'?'批量重跑':'批量下载'}时状态固定为「${TASK_FILTER_LABELS[taskFilter.st]}」"`:''}>${label}<span class="chip-n">${k==='all'?s.total:s[CHIP_STAGE[k]]}</span></button>`).join('')}</div>
      <select class="pick" id="srcPick" aria-label="触发来源"><option value="all">全部来源</option>${['手动触发','自动触发'].map(x=>`<option ${taskFilter.src===x?'selected':''}>${x}</option>`).join('')}</select>
      ${type.pdc?`<select class="pick" id="pdcPick" aria-label="PDC"><option value="">全部 PDC</option>${pdcs.map(p=>`<option ${taskFilter.pdc===p?'selected':''}>${esc(p)}</option>`).join('')}</select>`:''}
      <input class="pick tag-search" id="kwIn" type="search" value="${esc(taskFilter.kw)}" placeholder="搜索任务编号 / 标签" aria-label="搜索任务编号或标签">
      ${taskFilter.day?`<span class="tag acc">${esc(taskFilter.day)}<button class="tag-x" onclick="pickDay('${taskFilter.day}')" aria-label="清除日期筛选">×</button></span>`:''}
      ${workbenchScopeActive(workbenchFilter)?'<button class="btn sm" onclick="clearWorkbenchScope()">清除工作台筛选</button>':''}
      <span class="tiny muted" style="margin-left:auto" id="countInfo"></span>
      <button class="btn sm" ${canTrigger?'onclick="manualTriggerModal()"':'disabled title="该任务类型不支持手动触发"'}>手动触发</button>
      <button class="btn sm ${batchMode==='rerun'?'primary':''}" onclick="toggleBatch('rerun')">${batchMode==='rerun'?'退出批量重跑':'批量重跑'}</button>
      <button class="btn sm ${batchMode==='download'?'primary':''}" onclick="toggleBatch('download')">${batchMode==='download'?'退出批量下载':'批量下载'}</button>
    </div>
    <div class="batch-bar ${batchMode?'on':''}" id="batchBar">
      <span>${batchMode==='download'?'批量下载：勾选要下载附件的任务':'批量重跑：勾选要重跑的任务'}，已勾选 <b id="batchCount">0</b> 个</span>
      <span class="bb-hint">${batchMode==='download'?'打包下载各任务当前执行的附件':'每个任务生成一个新的执行实例（整单重跑）'}</span>
      <span style="flex:1"></span>
      <button class="btn sm" onclick="clearPick()">清除选择</button>
      ${batchMode==='download'?'<button class="btn sm primary" onclick="batchDownload()">确认下载</button>':'<button class="btn sm danger" onclick="batchRerun()">确认重跑</button>'}
    </div>
    <div class="task-body">
      <div id="taskRows" class="task-scroll"></div>
    </div>
  </div>`;
  renderCalendar(all);
  document.querySelectorAll('[data-st]').forEach(c=>c.onclick=()=>{ if(batchMode) return; taskFilter.st=c.dataset.st; render(); });
  $('#srcPick').onchange=e=>{taskFilter.src=e.target.value;renderRows()};
  if($('#pdcPick')) $('#pdcPick').onchange=e=>{taskFilter.pdc=e.target.value;renderRows()};
  $('#kwIn').oninput=e=>{taskFilter.kw=e.target.value;renderRows()};
  fitTaskFrame();
  renderRows();
}
/* 批量模式锁定状态筛选：批量重跑 = 待人工处理，批量下载 = 已完成；模式内不能切状态，退出后恢复进入前的筛选。两种模式互斥 */
const BATCH_STATUS={rerun:'MANUAL', download:'SUCCEEDED'};
let stBeforeBatch='all';
function toggleBatch(mode){
  if(!batchMode) stBeforeBatch=taskFilter.st;
  batchMode=batchMode===mode?'':mode; pickedTaskIds.clear();
  taskFilter.st=batchMode?BATCH_STATUS[batchMode]:stBeforeBatch;
  render();
}
function exitBatch(){ batchMode=''; pickedTaskIds.clear(); taskFilter.st=stBeforeBatch; }

/* ===== 日历：一次显示一个月，可前后翻月；格子颜色按当天任务的处理情况 ===== */
function dayColor(list){
  if(!list.length) return '';
  if(list.some(t=>taskStage(t)==='manual')) return 'red';
  if(list.some(t=>taskStage(t)!=='completed')) return 'yellow';
  return 'green';
}
function initCalMonth(tasks){
  const last=tasks.map(taskDay).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop();
  const d=last?new Date(+last.slice(0,4), +last.slice(5,7)-1, 1):new Date();
  calMonth={y:d.getFullYear(), m:d.getMonth()};
}
/* 最晚只能翻到「本月」和「最近一票任务所在月」中较晚的那个 */
function maxCalMonth(tasks){
  const last=tasks.map(taskDay).filter(Boolean).sort().pop()||'', today=new Date();
  const a=today.getFullYear()*12+today.getMonth(), b=last?(+last.slice(0,4))*12+(+last.slice(5,7)-1):0;
  return Math.max(a,b);
}
function shiftMonth(d){
  const all=typeTasks(currentType), v=calMonth.y*12+calMonth.m+d;
  if(v>maxCalMonth(all)) return;
  calMonth={y:Math.floor(v/12), m:v%12};
  renderCalendar(all);
}
function renderCalendar(tasks){
  if(!calMonth) initCalMonth(tasks);
  const {y,m}=calMonth, byDay={};
  tasks.forEach(t=>{ const d=taskDay(t); if(/^\d{4}-\d{2}-\d{2}$/.test(d)) (byDay[d]=byDay[d]||[]).push(t); });
  const lead=(new Date(y,m,1).getDay()+6)%7, days=new Date(y,m+1,0).getDate();
  const n=(list,s)=>list.filter(t=>taskStage(t)===s).length;
  const cells=[];
  for(let i=0;i<lead;i++) cells.push('<span class="mc blank"></span>');
  for(let d=1; d<=days; d++){
    const key=ymd(new Date(y,m,d)), list=byDay[key]||[], sel=taskFilter.day===key?' sel':'';
    if(!list.length){ cells.push(`<span class="mc" title="${key} · 无任务">${d}</span>`); continue; }
    const tip=`${key} · ${list.length} 票：已完成 ${n(list,'completed')} / 执行中 ${n(list,'running')} / 待人工处理 ${n(list,'manual')}`;
    cells.push(`<button class="mc ${dayColor(list)}${sel}" title="${tip}" aria-label="${tip}，点击筛选当天任务" onclick="pickDay('${key}')">${d}</button>`);
  }
  while(cells.length%7) cells.push('<span class="mc blank"></span>');
  $('#calTitle').textContent=`${y} 年 ${m+1} 月`;
  $('#calNext').disabled=y*12+m>=maxCalMonth(tasks);
  $('#heatmap').innerHTML=`<div class="mcal">${['一','二','三','四','五','六','日'].map(w=>`<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>`;
}
/* 点击某天：只看当天的任务；再点一次取消 */
function pickDay(d){ taskFilter.day=taskFilter.day===d?'':d; render(); }

/* 列表框撑满到窗口底部：表头不动，列表在框内滚动 */
function fitTaskFrame(){
  const el=document.querySelector('.task-frame'); if(!el) return;
  const vp=document.querySelector('.viewport'), top=el.getBoundingClientRect().top+(vp?vp.scrollTop:0);
  el.style.height=Math.max(420, window.innerHeight-top-24)+'px';
}
window.addEventListener('resize', fitTaskFrame);
function clearWorkbenchScope(){ workbenchFilter=null; taskFilter=newTaskFilter(); history.replaceState(null,'','tasks.html?type='+encodeURIComponent(currentType.id)); render(); }

/* ===== 列表 ===== */
function scopedTasks(){
  return typeTasks(currentType).filter(t=>!workbenchScopeActive(workbenchFilter)||
    ((!workbenchFilter.start||taskRunDay(t)>=workbenchFilter.start)&&(!workbenchFilter.end||taskRunDay(t)<=workbenchFilter.end)));
}
/* 搜索：与 task_tag 的口径一致，匹配任务编号和标签值（不区分大小写，包含即命中） */
function kwMatch(t, kw){
  const q=kw.trim().toLowerCase(); if(!q) return true;
  return [t.id].concat(taskTags(t).map(x=>x.v)).some(v=>String(v).toLowerCase().includes(q));
}
function filtered(){
  return scopedTasks().filter(t=>{
    if(taskFilter.st!=='all'&&taskStage(t)!==CHIP_STAGE[taskFilter.st])return false;
    if(taskFilter.src!=='all'&&taskSrcGroup(t)!==taskFilter.src)return false;
    if(taskFilter.pdc&&taskPdc(t)!==taskFilter.pdc)return false;
    if(taskFilter.day&&taskDay(t)!==taskFilter.day)return false;
    return kwMatch(t, taskFilter.kw);
  });
}
function renderRows(){
  const list=filtered(), cols=batchMode?8:7;
  $('#taskRows').innerHTML=`<table class="tbl">
    <thead><tr>${batchMode?'<th class="pick-col"><input type="checkbox" id="selAll" aria-label="全选当前筛选结果" title="全选当前筛选结果"></th>':''}<th>任务编号</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th><th>标签</th></tr></thead>
    <tbody>${list.map(t=>{
      const latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id), picked=pickedTaskIds.has(t.id);
      return `<tr class="click${picked?' sel':''}" onclick="location.href='${href}'">
        ${batchMode?`<td class="pick-col" onclick="event.stopPropagation()"><input type="checkbox" class="row-pick" data-id="${esc(t.id)}" ${picked?'checked':''} aria-label="选择任务 ${esc(t.id)}"></td>`:''}
        <td><a href="${href}"><b>${esc(t.id)}</b></a></td>
        <td class="small">${esc(taskSrcGroup(t))}</td><td>${stageTag(t)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td><td>${taskTagsHtml(t)}</td></tr>`;
    }).join('')||`<tr><td colspan="${cols}"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>`}</tbody></table>`;
  $('#countInfo').textContent=`${list.length} / ${scopedTasks().length} 条`;
  document.querySelectorAll('.row-pick').forEach(cb=>cb.onchange=()=>{ cb.checked?pickedTaskIds.add(cb.dataset.id):pickedTaskIds.delete(cb.dataset.id); syncBatchUI(); });
  const sa=$('#selAll');
  if(sa) sa.onchange=()=>{ filtered().forEach(t=>sa.checked?pickedTaskIds.add(t.id):pickedTaskIds.delete(t.id)); renderRows(); };
  syncBatchUI();
}

/* ===== 批量操作：勾选任务 ===== */
function syncBatchUI(){
  document.querySelectorAll('.row-pick').forEach(cb=>{ const tr=cb.closest('tr'); if(tr) tr.classList.toggle('sel',cb.checked); });
  const list=filtered(), picked=list.filter(t=>pickedTaskIds.has(t.id)).length, sa=$('#selAll');
  if(sa){ sa.checked=list.length>0&&picked===list.length; sa.indeterminate=picked>0&&picked<list.length; }
  const cnt=$('#batchCount'); if(cnt) cnt.textContent=pickedTaskIds.size;
}
function clearPick(){ pickedTaskIds.clear(); renderRows(); }
function pickedTasks(){ return [...pickedTaskIds].map(id=>State.task(id)).filter(Boolean); }

/* 批量重跑：逐个生成新执行实例（整单重跑） */
function batchRerun(){
  const targets=pickedTasks();
  if(!targets.length){ toast('请先勾选需要重跑的任务','warn'); return; }
  const running=targets.filter(t=>taskStatus(t)==='RUNNING').length;
  openModal('批量重跑确认', `
    <p class="small" style="margin-bottom:10px">将为勾选的 <b>${targets.length}</b> 个任务分别生成新执行实例（整单重跑），原有执行保持只读归档。${running?`<br><b style="color:var(--gold)">其中 ${running} 个任务正在执行中，将自动跳过。</b>`:''}</p>
    <div class="batch-pick-list">${targets.slice(0,8).map(t=>`<div class="bpl-row"><span class="bpl-id">${esc(t.id)}</span><span class="bpl-case">${esc(t.case)}</span>${stageTag(t)}</div>`).join('')}${targets.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${targets.length-8} 个任务</div>`:''}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn danger" onclick="confirmBatchRerun()">确认批量重跑</button>`);
}
function confirmBatchRerun(){
  closeModal();
  let done=0,skipped=0;
  pickedTasks().forEach(t=>{ if(taskStatus(t)==='RUNNING'){ skipped++; return; } if(scheduleRun(t.id,0,'批量重跑')) done++; else skipped++; });
  audit('批量重跑', `${currentType.label} · ${done} 个任务${skipped?` · 跳过 ${skipped} 个`:''}`, '任务中心');
  if(done) toast(`已触发 ${done} 个任务批量重跑${skipped?`，跳过 ${skipped} 个执行中任务`:''}`,'ok');
  else toast('所选任务均在执行中，已跳过','warn');
  exitBatch();
  render();
}

/* 批量下载：打包各任务当前执行的附件（原文 + 节点附件）；没有附件的任务跳过 */
function taskFileNames(t){
  const run=latestRun(t); if(!run) return [];
  return (run.files||[]).map(f=>f.name).concat(...(run.nodes||[]).map(n=>(n.evFiles||[]).map(f=>f[0]))).filter(Boolean);
}
function batchDownload(){
  const targets=pickedTasks();
  if(!targets.length){ toast('请先勾选需要下载的任务','warn'); return; }
  const withFiles=targets.filter(t=>taskFileNames(t).length), files=withFiles.reduce((a,t)=>a+taskFileNames(t).length,0);
  if(!withFiles.length){ toast('所选任务都还没有附件','warn'); return; }
  const skipped=targets.length-withFiles.length;
  audit('批量下载', `${currentType.label} · ${withFiles.length} 个任务 · ${files} 个文件`, '任务中心');
  toast(`已打包下载 ${withFiles.length} 个任务的 ${files} 个附件（演示）${skipped?`，${skipped} 个任务无附件已跳过`:''}`,'ok');
  exitBatch();
  render();
}

/* ===== 手动触发：为当前任务类型触发一次（沿用各 Case 的 BRD 样例，创建后自动模拟执行） ===== */
function manualTriggerModal(){
  openModal('手动触发', `<p class="small" style="margin:0">将为 <b>${esc(currentType.label)}</b> 触发一次任务，触发后在本列表新增一条任务并自动开始执行。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="createNewTask()">确认触发</button>`);
}
function createNewTask(){
  closeModal();
  const t=createDemoTask(currentType); if(!t) return;
  toast(`任务 ${t.id} 已触发（${currentType.label}）`,'ok');
  render();
}
document.addEventListener('DOMContentLoaded', render);
