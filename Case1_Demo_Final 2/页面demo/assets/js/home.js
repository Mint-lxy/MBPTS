/* ===== home.js · 工作台 ===== */
const HOME_CARDS = [
  ['total','总任务数','票',''],
  ['completed','已完成数','份','ok'],
  ['mails','已发送邮件数','封','acc'],
  ['running','执行中','票','blue'],
  ['manual','待人工处理','票','warn'],
];
function homeStats(mode){
  const tasks=[...new Map(homeTaskRecords().filter(t=>t.mode===mode).map(t=>[t.waybill,t])).values()];
  return {total:tasks.length,completed:tasks.filter(t=>t.status==='completed').length,running:tasks.filter(t=>t.status==='running').length,manual:tasks.filter(t=>t.status==='manual').length,mails:new Set(HOME_MAILS.filter(m=>m.mode===mode).map(m=>m.id)).size};
}
function render(){
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd"><div><h2>工作台</h2><div class="sub">Case 1 · 危险品托运清单</div></div><span class="tag">模拟数据</span></div>
    ${['air','sea'].map(renderHomeSummary).join('')}
    <p class="home-demo-note">按运输方式汇总全部演示记录，任务以一个 HAWB/BL No. 为单位计量；点击统计卡片可查看对应任务或邮件。</p>
  </section>`;
}
function renderHomeSummary(mode){
  const stats=homeStats(mode),label=mode==='air'?'空运':'海运';
  return `<section class="home-summary" aria-labelledby="homeHeading-${mode}">
    <div class="home-summary-heading"><h3 id="homeHeading-${mode}">Case1-${label}任务总结</h3><span>共 ${stats.total} 票任务</span></div>
    <div class="home-summary-grid" aria-live="polite">${HOME_CARDS.map(([key,title,unit,tone])=>key==='total'?`
      <div class="home-stat card" tabindex="0" aria-describedby="homeTotalTip-${mode}"><span class="home-stat-label">${title}<span class="home-help" aria-hidden="true">?</span></span><div class="home-stat-value">${stats[key]}<small>${unit}</small></div><span class="home-stat-footer">按运单统计</span><span class="home-stat-tooltip" id="homeTotalTip-${mode}" role="tooltip">以一个 HAWB/BL No. 为单位计量</span></div>`:`
      <button class="home-stat card ${tone}" onclick="homeCardAction('${mode}','${key}')" aria-label="${label}${title} ${stats[key]} ${unit}，点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>${unit}</small></span><span class="home-stat-footer">${key==='mails'?'邮件中心':'任务中心'} <span>›</span></span></button>`).join('')}</div>
  </section>`;
}
function homeCardAction(mode,key){
  if(!['air','sea'].includes(mode)||!['completed','mails','running','manual'].includes(key))return;
  const params=new URLSearchParams({from:'workbench',mode,status:key==='mails'?'sent':key});
  location.href=(key==='mails'?'rules.html':'tasks.html')+'?'+params.toString();
}
document.addEventListener('DOMContentLoaded',render);
