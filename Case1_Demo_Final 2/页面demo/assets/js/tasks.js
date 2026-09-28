/* ===== tasks.js · 任务列表（Task 粒度：状态 = 当前执行实例状态） ===== */
let workbenchFilter=readWorkbenchFilter();
const TASK_FILTER_LABELS={all:'全部',RUNNING:'执行中',MANUAL:'待人工处理',WAIT_INPUT:'待上传',DIFF_PENDING:'有差异',FAILED:'失败',SUCCEEDED:'已完成'};
const WORKBENCH_STATUS_MAP={completed:'SUCCEEDED',running:'RUNNING',manual:'MANUAL',all:'all'};
function taskCaseText(t){ return (taskCaseId(t)||'').replace('case-','case'); }
function taskTriggerSource(t){
  const run=latestRun(t);
  const manuallyRerun=t.runs.length>1 && /^(整单重跑|重跑 · 自节点)/.test(run?.cause||'');
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
  const name=taskCaseId(t)==='case-1'?'C01- 危险品托运清单':t.case;
  const mode={air:'空运',sea:'海运'}[t.mode];
  return name+(mode?' - '+mode:'');
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
    <thead><tr><th>任务编号</th><th>case</th><th>用例</th><th>触发来源</th><th>状态（当前执行）</th><th>执行次数</th><th>最近执行开始</th><th>当前环节</th></tr></thead>
    <tbody>${list.map(t=>{
      const st=taskStatus(t),latest=latestRun(t);
      const cur=latest?(latest.nodes.find(n=>['run','fail','review'].includes(n.st))||latest.nodes[latest.nodes.length-1]):null;
      const href='task-detail.html?id='+encodeURIComponent(t.id);
      return `<tr class="click" onclick="location.href='${href}'">
        <td><a href="${href}"><b>${esc(t.id)}</b></a>${t.waybill?`<div class="tiny muted">${esc(t.waybill)}</div>`:''}</td><td><span class="tag gold">${esc(taskCaseText(t))}</span></td><td><b>${esc(taskUseCaseText(t))}</b></td>
        <td class="small">${esc(taskTriggerSource(t))}</td><td>${stTag(st)}</td><td style="text-align:center"><span class="tag ${t.runs.length>1?'acc':''}">${t.runs.length||'—'}</span></td>
        <td class="small muted">${latest?esc(taskRunTimeText(t)):esc(t.start||'—')}</td><td class="small muted">${t.waitState?`待上传 ${t.waitState.missing.length} 个文件`:cur?esc(cur.n):'—'}</td></tr>`;
    }).join('')||'<tr><td colspan="8"><div class="empty"><div class="ei">∅</div>没有匹配当前筛选条件的任务</div></td></tr>'}</tbody></table>`;
  $('#countInfo').textContent=`${list.length} / ${scopedTasks().length} 条`;
}
/* ===== 新建任务（Case 1：仅空运 / 海运，创建后立即模拟执行） ===== */
function newTaskModal(){
  openModal('新建任务', `
    <div class="fld" style="margin-bottom:14px"><label>运输方式</label>
      <select class="pick" style="width:100%" id="newTaskMode">
        <option value="air">空运 · C01 危险品托运清单</option>
        <option value="sea">海运 · C01 危险品托运清单</option>
      </select></div>
    <p class="tiny muted" style="margin:0">创建后将在任务中心新增一条任务，并自动开始模拟执行。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="createNewTask()">创建并执行</button>`);
}
function createNewTask(){
  const mode=$('#newTaskMode')?$('#newTaskMode').value:'air';
  if(!['air','sea'].includes(mode)) return;
  closeModal();
  const prefix=mode==='air'?'T-DEMO-A':'T-DEMO-S';
  let n=1; while(State.task(prefix+String(n).padStart(3,'0'))) n++;
  const id=prefix+String(n).padStart(3,'0');
  const modeText=mode==='air'?'空运':'海运';
  const t={
    id, uc:'UC34', caseId:'case-1', case:'C01 危险品托运清单', mode, waybill:id.slice(2),
    src:'手动创建', rule:'—',
    plan:[
      {n:'手动触发', st:'ok', d:`手动创建 · ${modeText}`},
      {n:'附件下载与登记', st:'queued', d:'IES 批量导出附件并登记', subs:['IES导出预报清单','IES导出 Part list','IES导出 Shipper'], okDesc:'附件已登记 · sharepoint://inbox/dg/'},
      {n:'按UN No.匹配初筛', st:'queued', d:'UN No. 匹配 Data base · 剔除 N / #N/A', okDesc:'初筛完成 · 生成待制作清单'},
      {n:'OCR识别Shipper', st:'queued', d:'识别 Shippers_Decl 字段与置信度', okDesc:'字段识别完成 · 置信度明细已登记'},
      {n:'托运清单写入', st:'queued', d:'写入表头与表体 · 与识别值联动', subs:['表头信息','表体信息'], okDesc:'托运清单已生成并按 BL/HAWB 命名'},
      {n:'IES导入', st:'queued', d:'托运清单上传 IES+ 预报界面', okDesc:'上传完成 · 证据链完整'},
      {n:'邮件发送', st:'queued', d:'上传状态通知 IO 同事', okDesc:'上传状态通知已发送'},
    ],
    fillFields:[
      {k:'UN 编号', v:'UN1263', src:'模型', conf:98},
      {k:'品名', v:'PAINT RELATED MATERIAL', src:'OCR', conf:95},
      {k:'危险类别', v:'Class 3', src:'规则', conf:100},
      {k:'数量', v:'120 CTN', src:'OCR', conf:92},
      {k:'PO 号', v:'PO-45081277', src:'规则', conf:99},
    ],
    fillFiles:[{name:'DG_Note_45081277.pdf', pages:3}],
    fillSummary:`${modeText}手动新建任务已完成：UN No. 初筛、Shippers_Decl 识别、托运清单写入、IES 导入与邮件通知成功，证据链完整。`,
    ops:[{tm:now(), txt:`任务创建 · 手动新建（${modeText}）`}],
    runs:[],
  };
  State.tasks.unshift(t);
  addEvidence('trigger', t.id, 'UC34', `手动新建任务（${modeText} · C01 危险品托运清单）`);
  audit('创建任务', `${t.id} · C01 危险品托运清单 · ${modeText}`, '任务中心');
  State.save();
  scheduleRun(t.id, 0, '手动创建 · 初次执行');
  toast(`任务 ${t.id} 已创建，模拟执行已开始`,'ok');
  render();
}
function exportTasks(){
  const list=filtered();
  const rows=[['任务编号','HAWB/BL No.','运输方式','用例','case','触发来源','状态','执行次数','最近执行开始'],
    ...list.map(t=>{const r=latestRun(t);return [t.id,t.waybill||'',t.mode==='air'?'空运':t.mode==='sea'?'海运':'',taskUseCaseText(t),taskCaseText(t),taskTriggerSource(t),STATE_META[taskStatus(t)].t,t.runs.length,r?taskRunTimeText(t):'（未执行）'];})];
  dl(`任务列表_${Date.now()}.csv`,'\uFEFF'+toCsv(rows),'text/csv;charset=utf-8');
  audit('导出任务列表',`${list.length} 条`,'任务中心');
  toast(`已导出 ${list.length} 条任务（CSV）`,'ok');
}
document.addEventListener('DOMContentLoaded',()=>{render();if(qp('new')==='1')newTaskModal();});
