/* ===== home.js · 工作台（全权限版 · Case1 ~ Case5） =====
 * 每个 Case 一排 6 张卡，没有二级标题：周期内总任务数 / 周期内已完成数 / 执行中 / 待人工处理 / 累计总任务数 / 累计已完成数。
 * 行的划分见 core.js 的 WORKBENCH_ROWS：Case2 拆成 Case2a（GLC）、Case2b（MBUSI）；Case1、Case5 的线路合并统计。
 * 周期 = 该行最近一次触发（任务首个执行实例的开始时间相同即同一次触发）；累计 = 全部历史记录。
 * 状态口径：全流程完成（含通知邮件已发送）才算已完成；邮件未发完仍在执行中；其余为待人工处理。
 */
const HOME_CARDS = [
  // [key, 标题, 单位, 色调, 是否可点击]
  ['cycleTotal','周期内总任务数','票','',false],
  ['cycleCompleted','周期内已完成数','票','ok',true],
  ['running','执行中','票','blue',true],
  ['manual','待人工处理','票','warn',true],
  ['total','累计总任务数','票','',false],
  ['completed','累计已完成数','票','ok',true],
];
/* 触发时刻：任务首个执行实例的开始时间（MM-DD 格式补当前年份） */
function homeTrigger(t){
  const s = (t.runs[0]||{}).start || '';
  return /^\d{2}-\d{2} /.test(s) ? new Date().getFullYear()+'-'+s : s;
}
function homeStats(row){
  const tasks = State.tasks.filter(t=>taskMatch(t) && row.keys.includes((taskCaseFilter(t)||{}).key)).map(t=>({t, trig:homeTrigger(t), stage:taskStage(t)}));
  const cycle = tasks.reduce((m,x)=>x.trig>m?x.trig:m, '');
  const inCycle = tasks.filter(x=>x.trig===cycle), n = (list,s)=>list.filter(x=>x.stage===s).length;
  return {cycle, cycleDay:cycle.slice(0,10),
    cycleTotal:inCycle.length, cycleCompleted:n(inCycle,'completed'),
    running:n(tasks,'running'), manual:n(tasks,'manual'),
    total:tasks.length, completed:n(tasks,'completed')};
}
function render(){
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd"><div><h2>工作台</h2><div class="sub">UC34 · ${esc(allowedCaseText())}</div></div><span class="tag">模拟数据</span></div>
    ${visibleWorkbenchRows().map(renderHomeRow).join('')}
    <p class="home-demo-note">每个 Case 一排统计，Case2 按 GLC、MBUSI 分为 Case2a、Case2b。任务以一票运单（HAWB / BL / AWB / Booking No.）为单位计量。周期指该 Case 最近一次触发；累计为全部历史记录。全流程完成（含通知邮件已发送）才计入已完成，邮件未发完的仍在执行中。点击统计卡片可查看对应任务。</p>
  </section>`;
}
function renderHomeRow(row){
  const stats=homeStats(row), label=workbenchRowLabel(row), id=row.id;
  return `<section class="home-case" aria-labelledby="homeHeading-${id}">
    <div class="home-case-title"><h3 id="homeHeading-${id}">${esc(label)}</h3><span>${stats.cycle?'当前周期：最近一次触发 '+esc(stats.cycle)+' · ':''}累计 ${stats.total} 票任务</span></div>
    <div class="home-summary-grid" aria-live="polite">${HOME_CARDS.map(([key,title,unit,tone,click])=>{
      const tip=key==='cycleTotal'?`最近一次触发（${stats.cycle||'暂无'}）产生的任务`:'全部历史任务';
      return click?`
      <button class="home-stat card ${tone}" onclick="homeCardAction('${row.id}','${key}')" aria-label="${esc(label)} ${title} ${stats[key]} ${unit}，点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>${unit}</small></span><span class="home-stat-footer">任务中心 <span>›</span></span></button>`:`
      <div class="home-stat card" tabindex="0" aria-describedby="homeTip-${id}-${key}"><span class="home-stat-label">${title}<span class="home-help" aria-hidden="true">?</span></span><div class="home-stat-value">${stats[key]}<small>${unit}</small></div><span class="home-stat-footer">${key==='cycleTotal'?'本次触发':'历史累计'}</span><span class="home-stat-tooltip" id="homeTip-${id}-${key}" role="tooltip">${esc(tip)}</span></div>`;
    }).join('')}</div>
  </section>`;
}
/* 周期内已完成：带上周期日期筛选；其余卡片不限日期 */
function homeCardAction(rowId, card){
  const row = WORKBENCH_ROWS.find(r=>r.id===rowId);
  if(!row || !['cycleCompleted','completed','running','manual'].includes(card)) return;
  const params = new URLSearchParams({from:'workbench', row:row.id, status:card==='cycleCompleted'?'completed':card});
  if(card==='cycleCompleted'){ const d = homeStats(row).cycleDay; if(d){ params.set('start', d); params.set('end', d); } }
  location.href = 'tasks.html?'+params.toString();
}
document.addEventListener('DOMContentLoaded', render);
