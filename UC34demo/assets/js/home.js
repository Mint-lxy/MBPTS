/* ===== home.js · 工作台（全权限版 · Case1 ~ Case5） =====
 * 顶部筛选：Case 下拉（全部 Case / Case1 ~ 5）+ 执行时间（开始时间 - 结束时间）。
 * 按 Case 纵向分组，每个子 Case 一排 4 张卡：总任务数 / 已完成数 / 执行中 / 待人工处理。
 * 日期口径 = 任务最新一次执行的开始日期（与任务中心「执行时间」一致）；未选日期时为全部记录。
 * 待人工处理始终为全部记录，不随日期变化；其余三张卡按所选日期统计。
 * 状态口径：全流程完成（含通知邮件已发送）才算已完成；邮件未发完仍在执行中；其余为待人工处理。
 */
const HOME_CARDS = [
  // [key, 标题, 色调, 是否随日期变化]
  ['total','总任务数','',true],
  ['completed','已完成数','ok',true],
  ['running','执行中','blue',true],
  ['manual','待人工处理','warn',false],
];
/* 筛选条件存在本标签页，从任务中心返回时保留 */
const HOME_FLT_KEY = 'mbpts_home_filter';
let homeFilter = (()=>{ try{ return Object.assign({caseId:'all', from:'', to:''}, JSON.parse(sessionStorage.getItem(HOME_FLT_KEY)||'{}')); }catch(e){ return {caseId:'all', from:'', to:''}; } })();
if(homeFilter.caseId!=='all' && !ALLOWED_CASE_IDS.includes(homeFilter.caseId)) homeFilter.caseId = 'all';
function saveHomeFilter(){ try{ sessionStorage.setItem(HOME_FLT_KEY, JSON.stringify(homeFilter)); }catch(e){} }
const homeDated = ()=>!!(homeFilter.from||homeFilter.to);

/* 任务所属日期：最新一次执行的开始日期（「MM-DD HH:mm」补当前年份） */
function homeRunDay(t){
  const s = (latestRun(t)||{}).start || '';
  return (/^\d{2}-\d{2} /.test(s) ? new Date().getFullYear()+'-'+s : s).slice(0,10);
}
function homeInRange(t){
  const d = homeRunDay(t);
  return (!homeFilter.from || d>=homeFilter.from) && (!homeFilter.to || d<=homeFilter.to);
}
function homeStats(line){
  const all = State.tasks.filter(t=>taskMatch(t) && (taskCaseFilter(t)||{}).key===line.key);
  const dated = all.filter(homeInRange), n = (list,s)=>list.filter(t=>taskStage(t)===s).length;
  return {all:all.length, total:dated.length, completed:n(dated,'completed'), running:n(dated,'running'), manual:n(all,'manual')};
}
function render(){
  const ids = homeFilter.caseId==='all' ? ALLOWED_CASE_IDS : [homeFilter.caseId];
  const groups = ids.map(id=>({id, lines:visibleCaseFilters().filter(c=>c.caseId===id)})).filter(g=>g.lines.length);
  $('#view').innerHTML=`<section class="freight-home">
    <div class="page-hd slim"><h2>工作台</h2><span class="tag">模拟数据</span></div>
    ${homeFilterBar()}
    ${groups.map(renderCaseGroup).join('')}
    <p class="home-demo-note">任务以一票运单（HAWB / BL / AWB / Booking No.）为单位计量。执行时间按任务最新一次执行的开始日期筛选，未选日期时统计全部记录；待人工处理始终统计全部记录。全流程完成（含通知邮件已发送）才计入已完成，邮件未发完的仍在执行中。点击统计卡片可查看对应任务。</p>
  </section>`;
  $('#homeCase').onchange = e=>{ homeFilter.caseId = e.target.value; saveHomeFilter(); render(); };
}
function homeFilterBar(){
  const inp=(k,ph)=>`<input type="${homeFilter[k]?'date':'text'}" value="${esc(homeFilter[k])}" placeholder="${ph}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" onchange="setHomeDate('${k}',this.value)" aria-label="执行时间${ph}">`;
  const cases = UC34_CASES.filter(c=>ALLOWED_CASE_IDS.includes(c.id));
  return `<div class="home-flt">
    <label class="home-case-pick">Case
      <select class="pick" id="homeCase"><option value="all">全部 Case</option>${cases.map(c=>`<option value="${c.id}" ${homeFilter.caseId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
    </label>
    <div class="d-range${homeDated()?' on':''}"><span class="pk-l">执行时间</span>${inp('from','开始时间')}<i>-</i>${inp('to','结束时间')}</div>
    ${homeDated()||homeFilter.caseId!=='all'?'<button class="tb-clear" onclick="clearHomeFilter()">清除筛选</button>':''}
  </div>`;
}
function setHomeDate(k, v){
  const next = {...homeFilter, [k]:v};
  if(next.from && next.to && next.from>next.to){ toast('开始时间不能晚于结束时间','err'); render(); return; }
  homeFilter[k] = v; saveHomeFilter(); render();
}
function clearHomeFilter(){ homeFilter = {caseId:'all', from:'', to:''}; saveHomeFilter(); render(); }
function renderCaseGroup(g){
  return `<section class="home-case">
    <h3 class="home-case-title">${esc((CASES[g.id]||{}).label||caseLabel(g.id))}</h3>
    ${g.lines.map(renderHomeSummary).join('')}
  </section>`;
}
function renderHomeSummary(line){
  const stats=homeStats(line), label=line.label, id=line.key.replace('|','-');
  return `<section class="home-summary" aria-labelledby="homeHeading-${id}">
    <div class="home-summary-heading"><h3 id="homeHeading-${id}">${esc(label)}</h3><span>累计 ${stats.all} 票任务</span></div>
    <div class="hs-group" aria-live="polite">${HOME_CARDS.map(([key,title,tone,dated])=>{
      const scope = dated && homeDated() ? '所选日期' : '全部记录';
      return `
      <button class="home-stat card ${tone}" onclick="homeCardAction('${line.key}','${key}')" aria-label="${esc(label)} ${title} ${stats[key]} 票（${scope}），点击查看"><span class="home-stat-label">${title}</span><span class="home-stat-value">${stats[key]}<small>票</small></span><span class="home-stat-footer">${scope}<span>任务中心 ›</span></span></button>`;
    }).join('')}</div>
  </section>`;
}
/* 跳转任务中心：带上子 Case 和状态；随日期变化的卡片同时带上所选日期 */
function homeCardAction(key, card){
  const line = CASE_FILTERS.find(c=>c.key===key), def = HOME_CARDS.find(c=>c[0]===card);
  if(!line || !def) return;
  const params = new URLSearchParams({from:'workbench', case:line.caseId, mode:line.mode, status:card==='total'?'all':card});
  if(def[3]){ if(homeFilter.from) params.set('start', homeFilter.from); if(homeFilter.to) params.set('end', homeFilter.to); }
  location.href = 'tasks.html?'+params.toString();
}
document.addEventListener('DOMContentLoaded', render);
