/* ===== tasks.js · 任务中心（三级） =====
 * 第一级 tasks.html：任务类型列表（即 core.js CASE_FILTERS 的子 Case），顶部 Case 下拉（全部 Case / Case1 ~ 5）。
 * 第二级 tasks.html?type=<类型 id>：该类型的任务列表——任务日历（按月翻页，点某天只看当天）、
 *   横向筛选（状态 / 库房 / 执行时间 / 单号搜索）、批量下载、批量重跑、新建任务、导出列表。
 * 第三级 task-detail.html?id=<任务编号>：任务详情。
 * 日期口径一律 = 任务最新一次执行的开始日期：日历、执行时间筛选、工作台跳转带入的日期相同。
 * 状态口径与工作台一致（core.js taskStage）。
 */
const workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',SUCCEEDED:'已完成',RUNNING:'执行中',MANUAL:'待人工处理'};
const CHIP_STAGE={SUCCEEDED:'completed',RUNNING:'running',MANUAL:'manual'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};

/* ===== 通用取值 ===== */
function taskTriggerSource(t){
  const run=latestRun(t);
  const manuallyRerun=t.runs.length>1 && /^(整单重跑|批量重跑|重跑 · 自节点)/.test(run?.cause||'');
  return manuallyRerun?'手动触发':t.src;
}
function taskSrcGroup(t){ return /^(定时|邮件)/.test(taskTriggerSource(t))?'自动触发':'人工触发'; }
const withYear=s=>/^\d{2}-\d{2} /.test(s||'')?new Date().getFullYear()+'-'+s:(s||'');
const isDay=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
/* 「最近执行开始」：最新执行实例的开始时间（重跑产生的「MM-DD HH:mm」补当前年份） */
function taskRunTimeText(t){ return withYear(latestRun(t)?.start)||'—'; }
/* 执行时间 / 日历：该任务最新一次执行的开始日期 */
function taskRunDay(t){ const d=taskRunTimeText(t).slice(0,10); return isDay(d)?d:''; }
const caseOf=t=>CASES[taskCaseId(t)]||{};
function taskPdc(t){ const f=caseOf(t).pdcOf; return f?f(t)||'':''; }
function taskNumKeys(t){ const f=caseOf(t).numKeys; return [t.id].concat(f?f(t):[t.waybill]).filter(Boolean).map(x=>String(x).toLowerCase()); }
/* 任务的单号字段名（HAWB No. / AVIS No. / Booking Number …），由各 Case 模块给出 */
function taskNumLabel(t){ const f=caseOf(t).numLabel; return f?f(t.mode):'运单号'; }
function typeNumLabel(type){ const f=(CASES[type.caseId]||{}).numLabel; return f?f(type.mode):'运单号'; }
/* 标签列：各 Case 的业务字段值上下两行（单号 + PDC），字段名放在悬停提示里 */
function taskTagsHtml(t){
  const f=caseOf(t).numKeys, num=(f?f(t):[t.waybill])[0]||'', pdc=taskPdc(t);
  return `<div title="${esc(taskNumLabel(t))}">${esc(num||'—')}</div>${pdc?`<div class="tiny muted" title="PDC">${esc(pdc)}</div>`:''}`;
}
function parseNums(v){ return [...new Set(String(v||'').split(/[\s,，;；、]+/).map(x=>x.trim()).filter(Boolean))]; }
/* 搜索：多个号码用空格、逗号或换行分隔，任一命中即显示 */
const qTerms=()=>parseNums(taskFilter.q).map(x=>x.toLowerCase());
function qMatch(t){ const ts=qTerms(); if(!ts.length) return true; const ks=taskNumKeys(t); return ts.some(q=>ks.some(k=>k.includes(q))); }

function typeTasks(type){ return State.tasks.filter(t=>taskMatch(t)&&(taskCaseFilter(t)||{}).key===type.key); }
function typeStats(tasks){
  const n=s=>tasks.filter(t=>taskStage(t)===s).length;
  const last=tasks.map(taskRunTimeText).filter(s=>s!=='—').sort().pop()||'';
  return {total:tasks.length, completed:n('completed'), running:n('running'), manual:n('manual'), last};
}
function typeTriggerText(tasks){ const s=[...new Set(tasks.map(taskSrcGroup))]; return s.length?s.join(' / '):'—'; }

/* ===== 页面状态 ===== */
let currentType=taskTypeById(qp('type'));
if(currentType && !ALLOWED_CASE_IDS.includes(currentType.caseId)) currentType=null;   /* 没有权限的任务类型不能直接进 */
let typeCase=ALLOWED_CASE_IDS.includes(qp('case'))?qp('case'):'all';
/* 从工作台进入：直接进该子 Case 的任务列表，带上状态和日期（日期写入执行时间筛选） */
if(workbenchFilter){
  currentType=CASE_FILTERS.find(c=>c.key===workbenchFilter.key)||currentType;
  if(currentType) history.replaceState(null,'','tasks.html?type='+encodeURIComponent(currentType.id));
}
const emptyQuery=()=>({pdc:[],runFrom:'',runTo:'',q:''});
let taskFilter={...emptyQuery(), st:'all'};
if(workbenchFilter) Object.assign(taskFilter, {st:WORKBENCH_STATUS_MAP[workbenchFilter.status]||'all', runFrom:workbenchFilter.start||'', runTo:workbenchFilter.end||''});
let fltOpen='', calView=null, pickedTaskIds=new Set();
function render(){ currentType?renderTypePage():renderTypeList(); }

/* ==================== 第一级：任务类型列表 ==================== */
function renderTypeList(){
  setCrumb('');
  const cases=UC34_CASES.filter(c=>ALLOWED_CASE_IDS.includes(c.id));
  const types=visibleCaseFilters().filter(c=>typeCase==='all'||c.caseId===typeCase);
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <h2>任务中心</h2>
    <label class="home-case-pick">Case
      <select class="pick" id="typeCasePick"><option value="all">全部 Case</option>${cases.map(c=>`<option value="${c.id}" ${typeCase===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
    </label>
  </div>
  <div class="tblwrap">
    <table class="tbl type-tbl">
      <thead><tr><th>任务类型</th><th>所属 Case</th><th>触发方式</th><th style="text-align:center">总任务数</th><th style="text-align:center">执行中</th><th style="text-align:center">待人工处理</th><th>最近执行</th><th aria-hidden="true"></th></tr></thead>
      <tbody>${types.map(c=>{
        const list=typeTasks(c), s=typeStats(list), href='tasks.html?type='+encodeURIComponent(c.id);
        return `<tr class="click" onclick="location.href='${href}'">
          <td><a href="${href}"><b>${esc(c.label)}</b></a></td>
          <td class="small">${esc(caseLabel(c.caseId))}</td>
          <td class="small">${esc(typeTriggerText(list))}</td>
          <td style="text-align:center">${s.total}</td>
          <td style="text-align:center">${s.running?`<span class="tag blue">${s.running}</span>`:'0'}</td>
          <td style="text-align:center">${s.manual?`<span class="tag warn">${s.manual}</span>`:'0'}</td>
          <td class="small muted">${esc(s.last||'—')}</td><td class="muted">›</td></tr>`;
      }).join('')||'<tr><td colspan="8"><div class="empty"><div class="ei">∅</div>没有可查看的任务类型</div></td></tr>'}</tbody>
    </table>
  </div>`;
  $('#typeCasePick').onchange=e=>{ typeCase=e.target.value; history.replaceState(null,'',typeCase==='all'?'tasks.html':'?case='+typeCase); renderTypeList(); };
}

/* ==================== 第二级：某个任务类型的任务列表 ==================== */
function renderTypePage(){
  const type=currentType, all=typeTasks(type), mod=CASES[type.caseId]||{};
  setCrumb(`<a href="tasks.html">任务中心</a> · <b>${esc(type.label)}</b>`);
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <div><div class="task-back"><a href="tasks.html${typeCase!=='all'?'?case='+typeCase:''}">← 返回任务类型</a></div>
      <h2>${esc(type.label)}</h2><div class="sub">${esc(caseLabel(type.caseId))}</div></div>
    <div style="display:flex;gap:9px"><button class="btn" onclick="exportTasks()">⤓ 导出列表</button><button class="btn primary" ${mod.demoTask?'onclick="newTaskModal()"':'disabled title="该任务类型不支持新建"'}>新建任务</button></div>
  </div>
  ${workbenchFilter?`<div class="center-context"><span>来自工作台：${esc(type.label)}</span><a href="index.html">返回工作台</a></div>`:''}
  <div class="type-overview">
    <section class="card gh-cal" aria-label="按日期的任务日历"><div id="heatmap" class="gh-wrap"></div></section>
  </div>
  <div class="tblwrap task-frame">
    <div class="toolbar tb-flt">
      <div class="chips">${Object.entries(TASK_FILTER_LABELS).map(([s,label])=>`<button class="chip ${taskFilter.st===s?'on':''}" data-st="${s}">${label}<span class="chip-n" data-n="${s}"></span></button>`).join('')}</div>
      ${pdcDropdown(all)}${runRange()}
      <label class="q-box">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/></svg>
        <input id="qIn" placeholder="${esc(typeNumLabel(type))}" value="${esc(taskFilter.q)}" aria-label="搜索单号">
      </label>
      ${activeFilters()?'<button class="tb-clear" onclick="fltClearAll()">清除筛选</button>':''}
      <span class="tb-count" id="countInfo"></span>
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
  renderCalendar(all);
  document.querySelectorAll('[data-st]').forEach(c=>c.onclick=()=>{taskFilter.st=c.dataset.st;render()});
  bindFilter();
  fitTaskFrame();
  renderRows();
}
function activeFilters(){ return (taskFilter.st!=='all')+taskFilter.pdc.length+!!(taskFilter.runFrom||taskFilter.runTo)+!!taskFilter.q.trim(); }
function fltClearAll(){ taskFilter={...emptyQuery(), st:'all'}; fltOpen=''; render(); }

/* ===== 任务日历（仿 GitHub 贡献图）=====
 * 一列一周（周一至周日），右侧切换「最近一年 / 各年份」。
 * 颜色 = 当天任务状态（红 有待人工处理 / 黄 有执行中 / 绿 全部已完成），深浅 = 当天票数（1 / 2 / 3~4 / 5+）。
 * 点某天 = 执行时间设为当天；执行时间范围内的格子加描边。 */
function dayColor(list){
  if(list.some(t=>taskStage(t)==='manual')) return 'red';
  if(list.some(t=>taskStage(t)!=='completed')) return 'yellow';
  return 'green';
}
const dayLevel=n=>n>=5?4:n>=3?3:n;
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const parseDay=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
function calYears(tasks){ return [...new Set(tasks.map(taskRunDay).filter(Boolean).map(d=>+d.slice(0,4)).concat(new Date().getFullYear()))].sort((a,b)=>b-a); }
/* 显示范围：最近一年 = 截至今天（有更晚的任务时截至该任务）往前 52 周；某一年 = 1 月 1 日 ~ 12 月 31 日 */
function calWindow(tasks){
  if(calView!=='last') return {from:new Date(calView,0,1), to:new Date(calView,11,31)};
  const t=new Date(), last=tasks.map(taskRunDay).filter(Boolean).sort().pop();
  let to=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  if(last && parseDay(last)>to) to=parseDay(last);
  return {from:addDays(to,-364), to};
}
/* 默认最近一年；所选执行时间不在最近一年内时切到它所在的年份 */
function syncCalView(tasks){
  calView='last';
  const ref=taskFilter.runTo||taskFilter.runFrom; if(!ref) return;
  const w=calWindow(tasks), d=parseDay(ref);
  if(d<w.from||d>w.to) calView=+ref.slice(0,4);
}
function pickYear(v){ calView=v; renderCalendar(typeTasks(currentType)); }
function inRunRange(day){ return (taskFilter.runFrom||taskFilter.runTo) && (!taskFilter.runFrom||day>=taskFilter.runFrom) && (!taskFilter.runTo||day<=taskFilter.runTo); }
function renderCalendar(tasks){
  if(calView===null) syncCalView(tasks);
  const {from,to}=calWindow(tasks), byDay={};
  tasks.forEach(t=>{ const d=taskRunDay(t); if(d) (byDay[d]=byDay[d]||[]).push(t); });
  const n=(list,s)=>list.filter(t=>taskStage(t)===s).length;
  /* 一张网格：第 1 行月份、第 2~8 行周一~周日；第 1 列星期，之后一列一周（格子固定 11px） */
  const cells=[], months=[]; let total=0, prevM=-1, weeks=0;
  for(let w=addDays(from,-((from.getDay()+6)%7)), ci=0; w<=to; w=addDays(w,7), ci++){
    let firstIn=null; weeks=ci+1;
    for(let i=0;i<7;i++){
      const d=addDays(w,i), key=ymd(d), at=`grid-area:${i+2}/${ci+2}`;
      if(d<from||d>to) continue;
      if(!firstIn) firstIn=d;
      const list=byDay[key]||[], sel=inRunRange(key)?' sel':'';
      if(!list.length){ cells.push(`<span class="gh-c${sel}" style="${at}" title="${key} · 无任务"></span>`); continue; }
      total+=list.length;
      const tip=`${key} · ${list.length} 票：已完成 ${n(list,'completed')} / 执行中 ${n(list,'running')} / 待人工处理 ${n(list,'manual')}`;
      cells.push(`<button class="gh-c ${dayColor(list)} l${dayLevel(list.length)}${sel}" style="${at}" title="${tip}" aria-label="${tip}，点击筛选当天任务" onclick="pickDay('${key}')"></button>`);
    }
    /* 月份标在该月第一次出现的那一列上方 */
    if(firstIn && firstIn.getMonth()!==prevM){ months.push({ci, m:firstIn.getMonth()}); prevM=firstIn.getMonth(); }
  }
  if(months.length>1 && months[1].ci-months[0].ci<3) months.shift();
  const lv=c=>[1,2,3,4].map(l=>`<i class="gh-c ${c} l${l}"></i>`).join('');
  $('#heatmap').innerHTML=`
    <div class="gh-main">
      <div class="gh-hd"><b>${calView==='last'?'最近一年':calView+' 年'} ${total} 票任务</b><span>按最新一次执行日期 · 点击日期筛选当天任务</span></div>
      <div class="gh-box">
        <div class="gh-graph" style="grid-template-columns:auto repeat(${weeks},var(--gh-cell))">
          ${months.map(x=>`<span class="gh-m" style="grid-area:1/${x.ci+2}">${x.m+1}月</span>`).join('')}
          ${[['周一',0],['周三',2],['周五',4]].map(([w,r])=>`<span class="gh-w" style="grid-area:${r+2}/1">${w}</span>`).join('')}
          ${cells.join('')}
        </div>
        <div class="gh-ft">
          <span class="gh-lg"><i class="gh-c red l3"></i>有待人工处理<i class="gh-c yellow l3"></i>有执行中<i class="gh-c green l3"></i>全部已完成</span>
          <span class="gh-lg">少<i class="gh-c"></i>${lv('green')}多</span>
        </div>
      </div>
    </div>
    <div class="gh-years">${['last'].concat(calYears(tasks)).map(v=>`<button class="${calView===v?'on':''}" onclick="pickYear(${v==='last'?"'last'":v})">${v==='last'?'最近一年':v}</button>`).join('')}</div>`;
}
/* 点击某天：执行时间设为当天；再点一次取消 */
function pickDay(d){
  const same=taskFilter.runFrom===d&&taskFilter.runTo===d;
  taskFilter.runFrom=same?'':d; taskFilter.runTo=same?'':d; render();
}

/* 列表框固定高度（撑满到窗口底部）：表头不动，列表在框内上下、左右滚动 */
function fitTaskFrame(){
  const el=document.querySelector('.task-frame'); if(!el) return;
  const vp=document.querySelector('.viewport'), top=el.getBoundingClientRect().top+(vp?vp.scrollTop:0);
  el.style.height=Math.max(420, window.innerHeight-top-24)+'px';
}
window.addEventListener('resize', fitTaskFrame);

/* ---------- 库房（多选下拉）：选项为该类型任务的 PDC；没有库房的类型不显示 ---------- */
function pdcDropdown(all){
  const sel=taskFilter.pdc, opts=[...new Set(all.map(taskPdc).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh'));
  if(!opts.length && !sel.length) return '';
  return `<div class="flt${fltOpen==='pdc'?' open':''}">
    <button class="pick-btn${sel.length?' on':''}" onclick="fltToggle('pdc')"><span class="pk-l">库房</span><span class="pk-v">${!sel.length?'全部':sel.length===1?esc(sel[0]):sel.length+' 项'}</span></button>
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
/* ---------- 执行时间：开始时间 - 结束时间（任务最新一次执行的日期）；日历跳到所选月份 ---------- */
function runRange(){
  const inp=(k,ph)=>`<input type="${taskFilter[k]?'date':'text'}" id="${k}In" value="${esc(taskFilter[k])}" placeholder="${ph}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="setRun('${k}',this.value)" aria-label="执行时间${ph}">`;
  return `<div class="d-range${taskFilter.runFrom||taskFilter.runTo?' on':''}"><span class="pk-l">执行时间</span>${inp('runFrom','开始时间')}<i>-</i>${inp('runTo','结束时间')}</div>`;
}
function setRun(k, v){
  const next={...taskFilter, [k]:v};
  if(next.runFrom&&next.runTo&&next.runFrom>next.runTo){ toast('开始时间不能晚于结束时间','err'); render(); return; }
  taskFilter[k]=v; if(v) calView=null; render();
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

/* ===== 列表 ===== */
/* skipSt：不按状态过滤（状态按钮上的数字用） */
function filtered(skipSt){
  return typeTasks(currentType).filter(t=>{
    if(!skipSt&&taskFilter.st!=='all'&&taskStage(t)!==CHIP_STAGE[taskFilter.st])return false;
    if(taskFilter.pdc.length&&!taskFilter.pdc.includes(taskPdc(t)))return false;
    const d=taskRunDay(t);
    if(taskFilter.runFrom&&d<taskFilter.runFrom)return false;
    if(taskFilter.runTo&&d>taskFilter.runTo)return false;
    return qMatch(t);
  });
}
function renderRows(){
  const list=filtered(), total=typeTasks(currentType).length;
  $('#taskRows').innerHTML=`<table class="tbl">
    <thead><tr><th class="pick-col"><input type="checkbox" id="selAll" aria-label="全选当前筛选结果" title="全选当前筛选结果"></th><th>任务编号</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th><th>标签</th></tr></thead>
    <tbody>${list.map(t=>{
      const latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id), picked=pickedTaskIds.has(t.id);
      return `<tr class="click${picked?' sel':''}" onclick="location.href='${href}'">
        <td class="pick-col" onclick="event.stopPropagation()"><input type="checkbox" class="row-pick" data-id="${esc(t.id)}" ${picked?'checked':''} aria-label="选择任务 ${esc(t.id)}"></td>
        <td><a href="${href}"><b>${esc(t.id)}</b></a></td>
        <td class="small">${esc(taskSrcGroup(t))}</td><td>${stageTag(t)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td><td>${taskTagsHtml(t)}</td></tr>`;
    }).join('')||'<tr><td colspan="8"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>'}</tbody></table>`;
  /* 状态按钮上的数字：按状态以外的筛选条件统计 */
  const base=filtered(true);
  document.querySelectorAll('[data-n]').forEach(el=>{ const s=el.dataset.n; el.textContent=s==='all'?base.length:base.filter(t=>taskStage(t)===CHIP_STAGE[s]).length; });
  /* 搜索多个号码时，提示命中几个；未找到的号码放在悬停提示里 */
  const terms=qTerms(), ci=$('#countInfo');
  if(terms.length>1){
    const miss=terms.filter(q=>!list.some(t=>taskNumKeys(t).some(k=>k.includes(q))));
    ci.textContent=`号码命中 ${terms.length-miss.length} / ${terms.length} · ${list.length} / ${total} 条`;
    ci.title=miss.length?'未找到：'+miss.join('、'):'';
  }else{ ci.textContent=`${list.length} / ${total} 条`; ci.title=''; }
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
    <div class="batch-pick-list">${targets.slice(0,8).map(t=>`<div class="bpl-row"><span class="bpl-id">${esc(t.id)}</span><span class="bpl-case">${esc(t.case)}</span>${stageTag(t)}</div>`).join('')}${targets.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${targets.length-8} 个任务</div>`:''}</div>`,
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
  audit('批量重跑', `${currentType.label} · ${done} 个任务${skipped?` · 跳过 ${skipped} 个`:''}`, '任务中心');
  if(done) toast(`已触发 ${done} 个任务批量重跑${skipped?`，跳过 ${skipped} 个执行中任务`:''}`,'ok');
  else toast('所选任务均在执行中，已跳过','warn');
  pickedTaskIds.clear();
  renderRows();
}
/* ===== 新建任务：为当前任务类型新建一票（沿用各 Case 的 BRD 样例，创建后为已完成执行） ===== */
function newTaskModal(){
  openModal('新建任务', `<p class="small" style="margin:0">将为 <b>${esc(currentType.label)}</b> 新建一条任务，创建后显示在本列表。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="createNewTask()">创建并执行</button>`);
}
function createNewTask(){
  closeModal();
  const t=createDemoTask(currentType); if(!t) return;
  toast(`任务 ${t.id} 已创建（${currentType.label}）`,'ok');
  render();
}
function exportTasks(){
  const list=filtered();
  const rows=[['任务编号','运单号','任务类型','用例','触发来源','状态','执行次数','最近执行开始'],
    ...list.map(t=>{const r=latestRun(t);return [t.id,t.waybill||'',currentType.label,t.case,taskSrcGroup(t),STAGE_META[taskStage(t)].t,t.runs.length,r?taskRunTimeText(t):'（未执行）'];})];
  dl(`任务列表_${currentType.label}_${Date.now()}.csv`,'\uFEFF'+toCsv(rows),'text/csv;charset=utf-8');
  audit('导出任务列表',`${currentType.label} · ${list.length} 条`,'任务中心');
  toast(`已导出 ${list.length} 条任务（CSV）`,'ok');
}
document.addEventListener('DOMContentLoaded',()=>{render();if(currentType&&qp('new')==='1')newTaskModal();});
