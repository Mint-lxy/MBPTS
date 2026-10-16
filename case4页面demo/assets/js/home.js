/* ===== home.js · 工作台（Case 4 · X-entry 发票与预报创建） ===== */
const HOME_CARDS = [
  ['total','总任务数','票',''],
  ['completed','已完成数','份','ok'],
  ['running','执行中','票','blue'],
  ['manual','待人工处理','票','warn'],
];
function homeStats(){
  const tasks=[...new Map(homeTaskRecords().map(t=>[t.waybill,t])).values()];
  return {total:tasks.length,completed:tasks.filter(t=>t.status==='completed').length,running:tasks.filter(t=>t.status==='running').length,manual:tasks.filter(t=>t.status==='manual').length};
}
function render(){
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd"><div><h2>工作台</h2><div class="sub">Case 4 · X-entry 发票与预报创建</div></div><span class="tag">模拟数据</span></div>
    ${renderHomeSummary()}
    <p class="home-demo-note">以一票 HAWB（一封 Fedex 预报邮件）为单位统计：已完成数指发票已导入 IES+、预报已生成且 PDF 已命名存档；待人工处理包括附件缺发票、HAWB 三方比对不一致、旧货 SN 比对不一致。点击统计卡片可查看对应任务。</p>
  </section>`;
}
function renderHomeSummary(){
  const stats=homeStats();
  return `<section class="home-summary" aria-labelledby="homeHeading-case4">
    <div class="home-summary-heading"><h3 id="homeHeading-case4">Case4-X-entry任务总结</h3><span>共 ${stats.total} 票任务</span></div>
    <div class="home-summary-grid" aria-live="polite">${HOME_CARDS.map(([key,title,unit,tone])=>key==='total'?`
      <div class="home-stat card" tabindex="0" aria-describedby="homeTotalTip-case4"><span class="home-stat-label">${title}<span class="home-help" aria-hidden="true">?</span></span><div class="home-stat-value">${stats[key]}<small>${unit}</small></div><span class="home-stat-footer">按 HAWB 统计</span><span class="home-stat-tooltip" id="homeTotalTip-case4" role="tooltip">以一票 HAWB 为单位计量</span></div>`:`
      <button class="home-stat card ${tone}" onclick="homeCardAction('${key}')" aria-label="Case4 ${title} ${stats[key]} ${unit}，点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>${unit}</small></span><span class="home-stat-footer">任务中心 <span>›</span></span></button>`).join('')}</div>
  </section>`;
}
function homeCardAction(key){
  if(!['completed','running','manual'].includes(key))return;
  const params=new URLSearchParams({from:'workbench',mode:'xentry',status:key});
  location.href='tasks.html?'+params.toString();
}
document.addEventListener('DOMContentLoaded',render);
