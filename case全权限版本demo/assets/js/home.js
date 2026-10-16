/* ===== home.js · 工作台（全权限版 · Case1 ~ Case5） =====
 * 按 Case 纵向分组，每个子 Case 一排 6 张卡：周期内总任务数 / 周期内已完成数 / 执行中 / 待人工处理 / 累计总任务数 / 累计已完成数。
 * 周期 = 该子 Case 最近一次触发（任务首个执行实例的开始时间相同即同一次触发）；累计 = 全部历史记录。
 * 状态口径：全流程完成（含通知邮件已发送）才算已完成；邮件未发完仍在执行中；其余为待人工处理。
 */
const HOME_CARDS = [
  // [key, 标题, 单位, 色调, 是否可点击]
  ['cycleTotal','周期内总任务数','票','',false],
  ['cycleCompleted','周期内已完成数','票','ok',true],
  ['running','执行中','票','blue',true],
  ['manual','待人工处理','票','warn',true],
  ['total','累计总任务数','票','',true],
  ['completed','累计已完成数','票','ok',true],
];
/* 触发时刻：任务首个执行实例的开始时间（MM-DD 格式补当前年份） */
function homeTrigger(t){
  const s = (t.runs[0]||{}).start || '';
  return /^\d{2}-\d{2} /.test(s) ? new Date().getFullYear()+'-'+s : s;
}
function homeStats(line){
  const tasks = State.tasks.filter(t=>taskMatch(t) && (taskCaseFilter(t)||{}).key===line.key).map(t=>({t, trig:homeTrigger(t), stage:taskStage(t)}));
  const cycle = tasks.reduce((m,x)=>x.trig>m?x.trig:m, '');
  const inCycle = tasks.filter(x=>x.trig===cycle), n = (list,s)=>list.filter(x=>x.stage===s).length;
  return {cycle, cycleDay:cycle.slice(0,10),
    cycleTotal:inCycle.length, cycleCompleted:n(inCycle,'completed'),
    running:n(tasks,'running'), manual:n(tasks,'manual'),
    total:tasks.length, completed:n(tasks,'completed')};
}
function render(){
  const groups = ALLOWED_CASE_IDS.map(id=>({id, lines:visibleCaseFilters().filter(c=>c.caseId===id)})).filter(g=>g.lines.length);
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd slim"><h2>工作台</h2><span class="tag">模拟数据</span></div>
    ${groups.map(renderCaseGroup).join('')}
    <p class="home-demo-note">按 Case 分组，任务以一票运单（HAWB / BL / AWB / Booking No.）为单位计量。周期指该子 Case 最近一次触发；累计为全部历史记录。全流程完成（含通知邮件已发送）才计入已完成，邮件未发完的仍在执行中。点击统计卡片可查看对应任务。</p>
  </section>`;
}
function renderCaseGroup(g){
  return `<section class="home-case">
    <h3 class="home-case-title">${esc((CASES[g.id]||{}).label||caseLabel(g.id))}</h3>
    ${g.lines.map(renderHomeSummary).join('')}
  </section>`;
}
function renderHomeSummary(line){
  const stats=homeStats(line), label=line.label, id=line.key.replace('|','-');
  return `<section class="home-summary" aria-labelledby="homeHeading-${id}">
    <div class="home-summary-heading"><h3 id="homeHeading-${id}">${esc(label)}</h3><span>${stats.cycle?'当前周期：最近一次触发 '+esc(stats.cycle)+' · ':''}累计 ${stats.total} 票任务</span></div>
    <div class="home-summary-grid" aria-live="polite">${[HOME_CARDS.slice(0,4),HOME_CARDS.slice(4)].map((grp,gi)=>`<div class="hs-group ${gi?'hs-total':''}">${grp.map(([key,title,unit,tone,click])=>{
      const tip=key==='cycleTotal'?`最近一次触发（${stats.cycle||'暂无'}）产生的任务`:'全部历史任务';
      return click?`
      <button class="home-stat card ${tone}" onclick="homeCardAction('${line.key}','${key}')" aria-label="${esc(label)} ${title} ${stats[key]} ${unit}，点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>${unit}</small></span><span class="home-stat-footer">任务中心 <span>›</span></span></button>`:`
      <div class="home-stat card" tabindex="0" aria-describedby="homeTip-${id}-${key}"><span class="home-stat-label">${title}<span class="home-help" aria-hidden="true">?</span></span><div class="home-stat-value">${stats[key]}<small>${unit}</small></div><span class="home-stat-footer">${key==='cycleTotal'?'本次触发':'历史累计'}</span><span class="home-stat-tooltip" id="homeTip-${id}-${key}" role="tooltip">${esc(tip)}</span></div>`;
    }).join('')}</div>`).join('')}</div>
  </section>`;
}
/* 周期内已完成：带上周期日期筛选；累计总任务数：该子 Case 全部任务；其余卡片不限日期 */
function homeCardAction(key, card){
  const line = CASE_FILTERS.find(c=>c.key===key);
  if(!line || !['cycleCompleted','completed','running','manual','total'].includes(card)) return;
  const status = card==='cycleCompleted' ? 'completed' : card==='total' ? 'all' : card;
  const params = new URLSearchParams({from:'workbench', case:line.caseId, mode:line.mode, status});
  if(card==='cycleCompleted'){ const d = homeStats(line).cycleDay; if(d){ params.set('start', d); params.set('end', d); } }
  location.href = 'tasks.html?'+params.toString();
}
document.addEventListener('DOMContentLoaded', render);
