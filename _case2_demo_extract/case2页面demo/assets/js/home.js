/* ===== home.js · 工作台（Case 2 · GLC / MBUSI） ===== */
const HOME_CARDS = [
  ['total','总任务数','票',''],
  ['completed','已完成数','份','ok'],
  ['running','执行中','票','blue'],
  ['manual','待人工处理','票','warn'],
];
function homeStats(mode){
  const tasks=[...new Map(homeTaskRecords().filter(t=>t.mode===mode).map(t=>[t.waybill,t])).values()];
  return {total:tasks.length,completed:tasks.filter(t=>t.status==='completed').length,running:tasks.filter(t=>t.status==='running').length,manual:tasks.filter(t=>t.status==='manual').length};
}
function render(){
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd"><div><h2>工作台</h2><div class="sub">Case 2 · AVIS / MBUSI 与 BL</div></div><span class="tag">模拟数据</span></div>
    ${['glc','mbusi'].map(renderHomeSummary).join('')}
    <p class="home-demo-note">按线路汇总全部演示记录，任务以一个 BL No. 为单位计量；点击统计卡片可查看对应任务。</p>
  </section>`;
}
/* 分组标题统一取自 core.js 的 CASE_LINES，与邮件中心等页面保持一致 */
function renderHomeSummary(mode){
  const stats=homeStats(mode),label=lineLabel(mode);
  return `<section class="home-summary" aria-labelledby="homeHeading-${mode}">
    <div class="home-summary-heading"><h3 id="homeHeading-${mode}">${esc(label)}</h3><span>共 ${stats.total} 票任务</span></div>
    <div class="home-summary-grid" aria-live="polite">${HOME_CARDS.map(([key,title,unit,tone])=>key==='total'?`
      <div class="home-stat card" tabindex="0" aria-describedby="homeTotalTip-${mode}"><span class="home-stat-label">${title}<span class="home-help" aria-hidden="true">?</span></span><div class="home-stat-value">${stats[key]}<small>${unit}</small></div><span class="home-stat-footer">按运单统计</span><span class="home-stat-tooltip" id="homeTotalTip-${mode}" role="tooltip">以一个 BL No. 为单位计量</span></div>`:`
      <button class="home-stat card ${tone}" onclick="homeCardAction('${mode}','${key}')" aria-label="${esc(label)} ${title} ${stats[key]} ${unit}，点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>${unit}</small></span><span class="home-stat-footer">任务中心 <span>›</span></span></button>`).join('')}</div>
  </section>`;
}
function homeCardAction(mode,key){
  if(!['glc','mbusi'].includes(mode)||!['completed','running','manual'].includes(key))return;
  const params=new URLSearchParams({from:'workbench',mode,status:key});
  location.href='tasks.html?'+params.toString();
}
document.addEventListener('DOMContentLoaded',render);