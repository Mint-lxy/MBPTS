/* ===== tasks.js · 任务中心（三级） =====
 * 第一级 tasks.html：任务类型列表（即 core.js CASE_FILTERS 的子 Case），顶部 Case 下拉（全部 Case / Case1 ~ 5）。
 * 第二级 tasks.html?type=<类型 id>：该类型的任务列表——分页查询、横向筛选（状态 / 库房 / 执行时间 / 单号搜索）、
 *   批量重跑、批量下载、新建任务、导出列表。
 * 第三级 task-detail.html?id=<任务编号>：任务详情。
 * 日期口径 = 任务最新一次执行的开始日期；状态口径与工作台一致（core.js taskStage）。
 */
const workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',SUCCEEDED:'已完成',RUNNING:'执行中',MANUAL:'待人工处理'};
const CHIP_STAGE={SUCCEEDED:'completed',RUNNING:'running',MANUAL:'manual'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};
const PAGE_SIZE_OPTIONS=[10,20,50,100];
const BATCH_DOWNLOAD_PAGE_SIZE=30;
const TAG_COLORS={'HAWB No.':'blue','Invoice No.':'geekblue','Delivery No.':'purple','PO No.':'cyan','Waybill No.':'orange',PDC:'green'};
const TAG_FALLBACK_COLORS=['magenta','volcano','gold','lime','cyan','purple'];
/* 标签色与平台任务列表一致：常见键固定颜色，其他键按键名稳定取色。 */
function tagColor(key){
  if(TAG_COLORS[key]) return TAG_COLORS[key];
  let hash=0;
  for(const ch of String(key||'')) hash=(hash*31+ch.charCodeAt(0))%TAG_FALLBACK_COLORS.length;
  return TAG_FALLBACK_COLORS[hash]||'default';
}

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
/* 执行时间：该任务最新一次执行的开始日期 */
function taskRunDay(t){ const d=taskRunTimeText(t).slice(0,10); return isDay(d)?d:''; }
const caseOf=t=>CASES[taskCaseId(t)]||{};
function taskPdc(t){ const f=caseOf(t).pdcOf; return f?f(t)||'':''; }
function taskNumKeys(t){ const f=caseOf(t).numKeys; return [t.id].concat(f?f(t):[t.waybill]).filter(Boolean).map(x=>String(x).toLowerCase()); }
/* 任务的单号字段名（HAWB No. / AVIS No. / Booking Number …），由各 Case 模块给出 */
function taskNumLabel(t){ const f=caseOf(t).numLabel; return f?f(t.mode):'运单号'; }
function typeNumLabel(type){ const f=(CASES[type.caseId]||{}).numLabel; return f?f(type.mode):'运单号'; }
/* 标签列与平台任务列表一致：键值对 Tag，键小字、值加粗，按固定色/稳定色着色。 */
function taskTagItems(t){
  const f=caseOf(t).numKeys, num=(f?f(t):[t.waybill])[0]||'', pdc=taskPdc(t), out=[];
  if(num) out.push({key:taskNumLabel(t),value:num});
  if(pdc) out.push({key:'PDC',value:pdc});
  return out;
}
function taskTagsHtml(t){
  const tags=taskTagItems(t);
  if(!tags.length) return '<span class="muted">—</span>';
  return `<div class="biz-tags">${tags.map(x=>`<span class="biz-tag biz-tag--${tagColor(x.key)}" title="${esc(x.key)}：${esc(x.value)}"><span class="biz-tag-key">${esc(x.key)}</span><span class="biz-tag-value">${esc(x.value)}</span></span>`).join('')}</div>`;
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
let taskFilter={...emptyQuery(), st:'all', page:1, size:PAGE_SIZE_OPTIONS[0]};
if(workbenchFilter) Object.assign(taskFilter, {st:WORKBENCH_STATUS_MAP[workbenchFilter.status]||'all', runFrom:workbenchFilter.start||'', runTo:workbenchFilter.end||''});
let fltOpen='', batchMode=null, selectedTaskIds=new Set(), filterBeforeBatch=null;
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
  const stageLocked=batchMode!==null;
  $('#view').innerHTML=`
  <div class="page-hd slim">
    <div><div class="task-back"><a href="tasks.html${typeCase!=='all'?'?case='+typeCase:''}">← 返回任务类型</a></div>
      <h2>${esc(type.label)}</h2><div class="sub">${esc(caseLabel(type.caseId))}</div></div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end">
      <button class="btn" onclick="exportTasks()">⤓ 导出列表</button>
      <button class="btn${batchMode==='rerun'?' primary':''}" onclick="toggleBatchMode('rerun')">批量重跑</button>
      <button class="btn${batchMode==='download'?' primary':''}" onclick="toggleBatchMode('download')">批量下载</button>
      <button class="btn primary" ${mod.demoTask?'onclick="newTaskModal()"':'disabled title="该任务类型不支持新建"'}>新建任务</button>
    </div>
  </div>
  ${workbenchFilter?`<div class="center-context"><span>来自工作台：${esc(type.label)}</span><a href="index.html">返回工作台</a></div>`:''}
  <div class="tblwrap task-frame">
    <div class="toolbar tb-flt">
      <div class="chips">${Object.entries(TASK_FILTER_LABELS).map(([s,label])=>`<button class="chip ${taskFilter.st===s?'on':''}" data-st="${s}" ${stageLocked?'disabled':''}>${label}<span class="chip-n" data-n="${s}"></span></button>`).join('')}</div>
      ${pdcDropdown(all)}${runRange()}
      <label class="q-box">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4 14 14"/></svg>
        <input id="qIn" placeholder="搜索任务编号 / 标签" value="${esc(taskFilter.q)}" aria-label="搜索任务编号或标签">
      </label>
      ${activeFilters()?'<button class="tb-clear" onclick="fltClearAll()">清除筛选</button>':''}
      <span class="tb-count" id="countInfo"></span>
    </div>
    ${batchMode?renderBatchBar():''}
    <div class="task-body">
      <div id="taskRows" class="task-scroll"></div>
    </div>
    <div id="taskPager"></div>
  </div>`;
  document.querySelectorAll('[data-st]').forEach(c=>c.onclick=()=>{taskFilter.st=c.dataset.st;taskFilter.page=1;selectedTaskIds.clear();render()});
  bindFilter();
  fitTaskFrame();
  renderRows();
}
function renderBatchBar(){
  const download=batchMode==='download';
  return `<div class="batch-bar on" id="batchBar">
    <span>已勾选 <b id="batchCount">${selectedTaskIds.size}</b> 个任务</span>
    <span class="bb-hint">${download?`每页固定 ${BATCH_DOWNLOAD_PAGE_SIZE} 条，只能勾选当前页，翻页后清空`:'每个任务生成一个新的执行实例（整单重跑），只列出能重跑的任务'}</span>
    <span style="flex:1"></span>
    ${download?'':'<button class="btn sm" onclick="selectAllFiltered()">全选所有任务</button>'}
    <button class="btn sm" onclick="clearPick()">清除选择</button>
    <button class="btn sm" onclick="exitBatchMode()">退出批量模式</button>
    <button class="btn sm primary" id="batchConfirm" onclick="${download?'batchDownload()':'batchRerun()'}" ${selectedTaskIds.size?'':'disabled'}>${download?'批量下载':'批量重跑'}</button>
  </div>`;
}
function toggleBatchMode(mode){
  if(batchMode===mode){exitBatchMode();return;}
  const prevMode=batchMode;
  if(batchMode===null) filterBeforeBatch={...taskFilter,pdc:[...taskFilter.pdc]};
  batchMode=mode;
  selectedTaskIds.clear();
  taskFilter.page=1;
  taskFilter.st=mode==='rerun'?'MANUAL':'SUCCEEDED';
  if(mode==='download') taskFilter.size=BATCH_DOWNLOAD_PAGE_SIZE;
  else if(prevMode==='download' && filterBeforeBatch) taskFilter.size=filterBeforeBatch.size;
  fltOpen='';
  render();
}
function exitBatchMode(){
  batchMode=null;
  selectedTaskIds.clear();
  if(filterBeforeBatch){taskFilter={...filterBeforeBatch,pdc:[...filterBeforeBatch.pdc]};}
  filterBeforeBatch=null;
  render();
}

function activeFilters(){ return (taskFilter.st!=='all')+taskFilter.pdc.length+!!(taskFilter.runFrom||taskFilter.runTo)+!!taskFilter.q.trim(); }
function fltClearAll(){ taskFilter={...emptyQuery(), st:'all', page:1, size:taskFilter.size}; selectedTaskIds.clear(); fltOpen=''; render(); }

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
function pdcPick(p){ const a=taskFilter.pdc, i=a.indexOf(p); i<0?a.push(p):a.splice(i,1); taskFilter.page=1; selectedTaskIds.clear(); render(); }
function pdcClear(){ taskFilter.pdc=[]; taskFilter.page=1; selectedTaskIds.clear(); render(); }
document.addEventListener('click', e=>{ if(fltOpen && !e.target.closest('.flt')){ fltOpen=''; render(); } });
/* ---------- 执行时间：开始时间 - 结束时间（任务最新一次执行的日期） ---------- */
function runRange(){
  const inp=(k,ph)=>`<input type="${taskFilter[k]?'date':'text'}" id="${k}In" value="${esc(taskFilter[k])}" placeholder="${ph}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="setRun('${k}',this.value)" aria-label="执行时间${ph}">`;
  return `<div class="d-range${taskFilter.runFrom||taskFilter.runTo?' on':''}"><span class="pk-l">执行时间</span>${inp('runFrom','开始时间')}<i>-</i>${inp('runTo','结束时间')}</div>`;
}
function setRun(k, v){
  const next={...taskFilter, [k]:v};
  if(next.runFrom&&next.runTo&&next.runFrom>next.runTo){ toast('开始时间不能晚于结束时间','err'); render(); return; }
  taskFilter[k]=v; taskFilter.page=1; selectedTaskIds.clear(); render();
}
/* ---------- 搜索框：输入即筛选；粘贴多行时换行转空格 ---------- */
function bindFilter(){
  const q=$('#qIn'); if(!q) return;
  q.oninput=e=>{ taskFilter.q=e.target.value; taskFilter.page=1; selectedTaskIds.clear(); renderRows(); };
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

/* ===== 列表（前端分页模拟服务端分页查询） ===== */
function taskRerunnable(t){ return taskStage(t)==='manual'; }
/* skipSt：不按状态过滤（状态按钮上的数字用） */
function filtered(skipSt){
  return typeTasks(currentType).filter(t=>{
    if(batchMode==='rerun'&&!taskRerunnable(t))return false;
    if(!skipSt&&taskFilter.st!=='all'&&taskStage(t)!==CHIP_STAGE[taskFilter.st])return false;
    if(taskFilter.pdc.length&&!taskFilter.pdc.includes(taskPdc(t)))return false;
    const d=taskRunDay(t);
    if(taskFilter.runFrom&&d<taskFilter.runFrom)return false;
    if(taskFilter.runTo&&d>taskFilter.runTo)return false;
    return qMatch(t);
  });
}
function pageButtons(page,pages){
  const nums=[...new Set([1,pages,page-2,page-1,page,page+1,page+2])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
  let prev=0, out=[];
  nums.forEach(n=>{
    if(prev&&n-prev>1) out.push('<span class="pager-gap">…</span>');
    out.push(`<button class="pager-btn ${n===page?'on':''}" onclick="gotoPage(${n})" ${n===page?'aria-current="page"':''}>${n}</button>`);
    prev=n;
  });
  return out.join('');
}
function renderPager(total){
  const pages=Math.max(1,Math.ceil(total/taskFilter.size));
  if(taskFilter.page>pages) taskFilter.page=pages;
  const sizeLocked=batchMode==='download';
  const sizeSel=sizeLocked?`<span class="tiny muted">每页 ${taskFilter.size} 条</span>`:
    `<label class="pager-size">每页 <select id="pageSizeSel">${PAGE_SIZE_OPTIONS.map(n=>`<option value="${n}" ${n===taskFilter.size?'selected':''}>${n}</option>`).join('')}</select> 条</label>`;
  $('#taskPager').innerHTML=`<div class="pager task-pager">
    <span class="tiny muted">共 ${total} 条 · 第 ${taskFilter.page} / ${pages} 页</span>
    ${sizeSel}
    <button class="btn sm" onclick="gotoPage(${taskFilter.page-1})" ${taskFilter.page<=1?'disabled':''} aria-label="上一页">‹</button>
    ${pageButtons(taskFilter.page,pages)}
    <button class="btn sm" onclick="gotoPage(${taskFilter.page+1})" ${taskFilter.page>=pages?'disabled':''} aria-label="下一页">›</button>
  </div>`;
  const sel=$('#pageSizeSel');
  if(sel) sel.onchange=()=>{taskFilter.size=Number(sel.value);taskFilter.page=1;renderRows();};
}
function gotoPage(page){
  const pages=Math.max(1,Math.ceil(filtered().length/taskFilter.size));
  taskFilter.page=Math.min(Math.max(1,page),pages);
  if(batchMode==='download') selectedTaskIds.clear();
  renderRows();
}
function renderRows(){
  const all=filtered(), totalAll=typeTasks(currentType).length;
  const pages=Math.max(1,Math.ceil(all.length/taskFilter.size));
  if(taskFilter.page>pages) taskFilter.page=pages;
  const start=(taskFilter.page-1)*taskFilter.size;
  const list=all.slice(start,start+taskFilter.size);
  const showPick=batchMode!==null;
  $('#taskRows').innerHTML=`<table class="tbl">
    <thead><tr>${showPick?'<th class="pick-col"><input type="checkbox" id="selAll" aria-label="全选本页" title="全选本页"></th>':''}<th>任务编号</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th><th>标签</th></tr></thead>
    <tbody>${list.map(t=>{
      const latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id), picked=selectedTaskIds.has(t.id);
      return `<tr class="${batchMode?'': 'click '}${picked?'sel':''}" ${batchMode?'':`onclick="location.href='${href}'"`}>
        ${showPick?`<td class="pick-col" onclick="event.stopPropagation()"><input type="checkbox" class="row-pick" data-id="${esc(t.id)}" ${picked?'checked':''} aria-label="选择任务 ${esc(t.id)}"></td>`:''}
        <td><a href="${href}" onclick="${batchMode?'event.stopPropagation();return false;':''}"><b>${esc(t.id)}</b></a></td>
        <td class="small">${esc(taskSrcGroup(t))}</td><td>${stageTag(t)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td><td>${taskTagsHtml(t)}</td></tr>`;
    }).join('')||`<tr><td colspan="${showPick?8:7}"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>`}</tbody></table>`;
  /* 状态按钮上的数字：按状态以外的筛选条件统计 */
  const base=filtered(true);
  document.querySelectorAll('[data-n]').forEach(el=>{ const s=el.dataset.n; el.textContent=s==='all'?base.length:base.filter(t=>taskStage(t)===CHIP_STAGE[s]).length; });
  /* 搜索多个号码时，提示命中几个；未找到的号码放在悬停提示里 */
  const terms=qTerms(), ci=$('#countInfo');
  if(terms.length>1){
    const miss=terms.filter(q=>!all.some(t=>taskNumKeys(t).some(k=>k.includes(q))));
    ci.textContent=`号码命中 ${terms.length-miss.length} / ${terms.length} · ${all.length} / ${totalAll} 条`;
    ci.title=miss.length?'未找到：'+miss.join('、'):'';
  }else{ ci.textContent=`${all.length} / ${totalAll} 条`; ci.title=''; }
  document.querySelectorAll('.row-pick').forEach(cb=>cb.onchange=()=>{
    cb.checked?selectedTaskIds.add(cb.dataset.id):selectedTaskIds.delete(cb.dataset.id);
    renderRows();
  });
  const batchCount=$('#batchCount');
  if(batchCount) batchCount.textContent=selectedTaskIds.size;
  const batchConfirm=$('#batchConfirm');
  if(batchConfirm) batchConfirm.disabled=selectedTaskIds.size===0;
  const sa=$('#selAll');
  if(sa){
    const picked=list.filter(t=>selectedTaskIds.has(t.id)).length;
    sa.checked=list.length>0&&picked===list.length;
    sa.indeterminate=picked>0&&picked<list.length;
    sa.onchange=()=>{
      if(sa.checked) list.forEach(t=>selectedTaskIds.add(t.id)); else list.forEach(t=>selectedTaskIds.delete(t.id));
      renderRows();
    };
  }
  renderPager(all.length);
}
/* ===== 批量选择与异步批量重跑 ===== */
function selectAllFiltered(){
  const all=filtered();
  all.forEach(t=>selectedTaskIds.add(t.id));
  renderRows();
  toast(`已全选 ${all.length} 个任务`,'ok');
}
function clearPick(){ selectedTaskIds.clear(); renderRows(); }
/* ===== 批量下载：勾选任务的当前执行文件打包下载（演示） ===== */
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
  const targets=[...selectedTaskIds].map(id=>State.task(id)).filter(Boolean);
  if(!targets.length){ toast('请先勾选需要下载的任务','warn'); return; }
  const list=targets.map(t=>({t,files:taskFiles(t)})), total=list.reduce((n,x)=>n+x.files.length,0);
  openModal('批量下载确认', `
    <p class="small" style="margin-bottom:10px">将把勾选的 <b>${targets.length}</b> 个任务共 <b>${total}</b> 个文件打包为一个压缩包下载，每个任务一个文件夹。</p>
    <div class="batch-pick-list">${list.slice(0,8).map(x=>`<div class="bpl-row"><span class="bpl-id">${esc(x.t.id)}</span><span class="bpl-case" title="${esc(x.files.join('、'))}">${x.files.length?esc(x.files.join('、')):'暂无可下载文件'}</span><span class="tag">${x.files.length} 个</span></div>`).join('')}${list.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${list.length-8} 个任务</div>`:''}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" ${total?'':'disabled'} onclick="confirmBatchDownload()">确认下载</button>`);
}
function confirmBatchDownload(){
  closeModal();
  const targets=[...selectedTaskIds].map(id=>State.task(id)).filter(Boolean);
  const total=targets.reduce((n,t)=>n+taskFiles(t).length,0);
  const name=`任务文件_${targets.length}票_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.zip`;
  targets.forEach(t=>t.ops.unshift({tm:now(), txt:`批量下载 · 本任务 ${taskFiles(t).length} 个文件（${name}）`}));
  audit('批量下载', `${targets.length} 个任务 · ${total} 个文件`, '任务中心');
  State.save();
  selectedTaskIds.clear();
  renderRows();
  toast(`已下载 ${name}（演示）`,'ok');
}

function batchRerun(){
  const targets=[...selectedTaskIds].map(id=>State.task(id)).filter(Boolean);
  if(!targets.length){ toast('请先勾选需要重跑的任务','warn'); return; }
  const codes=targets.slice(0,8).map(t=>esc(t.id)).join('、');
  openModal('批量重跑确认', `
    <p class="small" style="margin-bottom:10px">将提交以下 <b>${targets.length}</b> 个任务批量重跑；任务先进入「重试中」，调度后生成新的执行实例：</p>
    <p class="small" style="margin:0 0 10px">${codes}${targets.length>8?` 等共 ${targets.length} 个`:''}</p>
    <div class="batch-pick-list">${targets.slice(0,8).map(t=>`<div class="bpl-row"><span class="bpl-id">${esc(t.id)}</span><span class="bpl-case">${esc(t.case)}</span>${stageTag(t)}</div>`).join('')}${targets.length>8?`<div class="tiny muted" style="padding:8px 0 0">…另有 ${targets.length-8} 个任务</div>`:''}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="confirmBatchRerun()">确认重跑</button>`);
}
function confirmBatchRerun(){
  closeModal();
  const targets=[...selectedTaskIds].map(id=>State.task(id)).filter(Boolean);
  let done=0,skipped=0;
  targets.forEach(t=>{
    if(!taskRerunnable(t)||['RUNNING','RETRYING'].includes(taskStatus(t))){ skipped++; return; }
    if(scheduleRun(t.id,0,'批量重跑',{deferStartMs:3000})) done++; else skipped++;
  });
  audit('批量重跑', `${currentType.label} · ${done} 个任务进入重试中${skipped?` · 跳过 ${skipped} 个`:''}`, '任务中心');
  toast(`已提交 ${done} 个任务批量重跑，进入重试中${skipped?`，跳过 ${skipped} 个`:''}`,'ok');
  /* 异步提交后退出批量模式，直接切到「执行中」，让重试中的任务立即可见。 */
  const restore = filterBeforeBatch ? {...filterBeforeBatch,pdc:[...filterBeforeBatch.pdc]} : {...taskFilter,pdc:[...taskFilter.pdc]};
  batchMode=null; filterBeforeBatch=null; selectedTaskIds.clear();
  taskFilter={...restore,st:'RUNNING',page:1};
  render();
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
