// ===== uc26-query.js · UC26 可组合分析工作台（确定性静态原型） =====
const UC26_WS_KEY = 'mbpts_uc26_workspace_v2';
const ANALYSIS_CASES = [
  {label:'本月 PO 交付表现怎么样？',view:0,title:'本月按期交付率稳步改善，但逾期订单仍需持续跟进',summary:'2026 年 9 月按期交付率为 91.4%，环比提升 1.2 个百分点；当前有 37 张逾期 PO，平均逾期 4.2 天。',bullets:['按期交付率已连续两个月改善','逾期 PO 较上月减少 7 张','供应商响应率达到 98.1%']},
  {label:'哪些供应商的逾期 PO 最多？',view:1,title:'逾期订单主要集中在 SUP-1024 与 SUP-2048',summary:'授权范围内共有 37 张逾期 PO，其中 SUP-1024 为 12 张、SUP-2048 为 8 张，是当前优先跟进对象。',bullets:['SUP-1024：12 张，最高','SUP-2048：8 张','12 张订单逾期超过 7 天']},
  {label:'Open BO 的缺口风险如何？',view:2,title:'高风险缺口集中在 7 个物料，需要人工跟进',summary:'BO 与 PO 合并跟踪范围内共有 23 行，7 行缺口超过 100；30 天缺口关闭率为 92%。',bullets:['7 个物料为高风险缺口','11 个供应商承诺改善中','缺口关闭率保持在 90% 以上']},
  {label:'库存风险集中在哪些区域？',view:3,title:'低库存风险主要集中在华东区域',summary:'当前监控 1,204 个 PN，其中 86 个触发低库存预警、12 个为零库存；华东区域低库存 PN 数量最高。',bullets:['华东：38 个低库存 PN','华北：26 个','43 个 PN 已生成补货建议']},
  {label:'3R 未处理情况怎么样？',view:4,title:'14 条 3R 超过 48 小时未 review',summary:'近 30 天共有 87 条 3R，今日新增 9 条；14 条仍为 open，48 小时内 review 率为 96%。',bullets:['今日新增 9 条','14 条 open 未 review','48 小时内 review 率 96%']},
];
const UC26_COMPONENTS = [
  {id:'po-otd',title:'PO 按期交付率趋势',group:'履约',view:0,type:'line',permission:'uc26.data.read'},
  {id:'po-overdue',title:'逾期供应商分布',group:'履约',view:1,type:'horizontal',permission:'uc26.data.read'},
  {id:'bo-risk',title:'Open BO 缺口风险',group:'缺口',view:2,type:'bar',permission:'uc26.data.read'},
  {id:'inventory-risk',title:'库存 PN 区域风险',group:'库存',view:3,type:'bar',permission:'uc26.data.read'},
  {id:'r3-review',title:'3R 处理状态',group:'协同',view:4,type:'bar',permission:'uc26.data.read'},
  {id:'under-watch',title:'Under-watch 关注原因',group:'协同',view:5,type:'horizontal',permission:'uc26.data.read'},
];
function makeInstance(componentId,target,state){
  const c=UC26_COMPONENTS.find(x=>x.id===componentId)||UC26_COMPONENTS[0];
  return {id:`${target.toUpperCase()}-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,componentId:c.id,state:state?JSON.parse(JSON.stringify(state)):{view:c.view,type:c.type,title:c.title,question:'组件仓库',summary:'来自 UC26 已发布计算结果。',bullets:[]}};
}
function seedWorkspace(){
  return {activeTab:'overview',activeDataset:'po-bo',currentCase:0,filters:{branch:'BBAC',supplier:'',start:'2026-09-01',end:'2026-09-30',pn:''},historyCollapsed:false,
    analysis:{view:0,type:'line',title:ANALYSIS_CASES[0].title,question:ANALYSIS_CASES[0].label,summary:ANALYSIS_CASES[0].summary,bullets:ANALYSIS_CASES[0].bullets,showTarget:true,onlyOverdue:false},
    conversations:[{id:'CONV-01',title:'9 月 PO 履约表现',updated:'刚刚',messages:[{who:'assistant',text:'你好，我可以基于 UC26 已发布计算层回答订单履约问题。数据范围已按当前身份过滤。'},{who:'user',text:ANALYSIS_CASES[0].label},{who:'assistant',text:ANALYSIS_CASES[0].summary}]}],
    currentConversation:'CONV-01',dashboard:['po-otd','po-overdue','bo-risk','inventory-risk'].map(id=>makeInstance(id,'dashboard')),
    report:{title:'UC26 采购跟踪分析报告（示例）',narrative:'本报告基于 BBAC 当前授权范围和 T+1 计算结果形成。示例重点展示 PO 交付趋势与逾期供应商分布；实际报告范围、口径与导出权限以后端配置为准。',items:['po-otd','po-overdue'].map(id=>makeInstance(id,'report')),templates:[]},lastAction:null};
}
function loadWorkspace(){
  let value;try{value=JSON.parse(localStorage.getItem(UC26_WS_KEY));}catch(e){}
  const seed=seedWorkspace();if(!value||!Array.isArray(value.dashboard)||!value.report)return seed;
  return Object.assign(seed,value,{filters:Object.assign(seed.filters,value.filters||{}),report:Object.assign(seed.report,value.report||{})});
}
let WS=loadWorkspace();
function saveWorkspace(){try{localStorage.setItem(UC26_WS_KEY,JSON.stringify(WS));}catch(e){}}
function currentConversation(){return WS.conversations.find(x=>x.id===WS.currentConversation)||WS.conversations[0];}
function tabFromUrl(){
  const t=qp('tab');if(['overview','data','analysis','report'].includes(t))WS.activeTab=t;
  const rawRequested=qp('view'),stored=sessionStorage.getItem('mbpts_ask_view');
  const requested=rawRequested===null||rawRequested===''?NaN:Number(rawRequested),storedView=stored===null||stored===''?NaN:Number(stored);
  const view=Number.isFinite(requested)&&requested>=0?requested:storedView;
  if(Number.isInteger(view)&&view>=0&&view<State.dbviews.length){applyCase(Math.max(0,ANALYSIS_CASES.findIndex(x=>x.view===view)),false);WS.activeTab='analysis';}
  sessionStorage.removeItem('mbpts_ask_view');
}
function render(){
  saveWorkspace();setCrumb('<b>UC26 分析工作台</b>');
  $('#view').innerHTML=`
  <section class="uc26-workspace">
    <header class="page-hd uc26-workspace-head">
      <div><div class="eyebrow">UC26 · SUPPLY CHAIN INSIGHT</div><h2>采购跟踪分析工作台</h2><div class="sub">业务数据、自由问数、预置看板与报告在同一授权场景中查看</div></div>
      <div class="uc26-head-meta"><span class="tag ok"><span class="pulse"></span> 数据已更新 08:00</span><a class="tag blue" href="rbac.html">BBAC · 行级范围</a><span class="tag">确定性静态演示</span></div>
    </header>
    <div class="uc26-context card"><div><span>组织范围</span><b>BBAC · 订单专员</b></div>
      <label>工厂<select id="wsBranch" class="pick"><option ${WS.filters.branch==='BBAC'?'selected':''}>BBAC</option><option ${WS.filters.branch!=='BBAC'?'selected':''}>全部已授权工厂</option></select></label>
      <label>供应商<input id="wsSupplier" class="search" placeholder="供应商代码" value="${esc(WS.filters.supplier)}"></label>
      <label>PN<input id="wsPn" class="search" placeholder="物料号" value="${esc(WS.filters.pn)}"></label><button class="btn sm" onclick="applyWorkspaceFilters()">应用上下文</button>
    </div>
    <nav class="uc26-tabs" aria-label="UC26 工作台功能">${[['overview','场景概览','预置看板'],['data','业务数据','受权明细'],['analysis','智能问数','自由问数'],['report','分析报告',WS.report.items.length+' 个组件']].map(x=>`<button class="${WS.activeTab===x[0]?'on':''}" onclick="switchWorkspaceTab('${x[0]}')"><span>${x[1]}</span><small>${x[2]}</small></button>`).join('')}</nav>
    ${renderFeedback()}<div id="uc26Stage">${renderActiveTab()}</div>
  </section>`;bindActiveTab();
}
function renderFeedback(){if(!WS.lastAction)return '';return `<div class="workspace-feedback"><span>✓</span><div><b>${esc(WS.lastAction.message)}</b><small>变更已保存在当前浏览器的原型状态中</small></div><button class="btn sm" onclick="undoLastAction()">撤销</button><button class="icon-btn" onclick="dismissFeedback()" aria-label="关闭">×</button></div>`;}
function renderActiveTab(){if(WS.activeTab==='data')return renderData();if(WS.activeTab==='analysis')return renderAnalysis();if(WS.activeTab==='report')return renderReport();return renderOverview();}
function bindActiveTab(){if(WS.activeTab==='analysis'){const input=$('#askInput');if(input)input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAsk();}};const thread=$('#chatThread');if(thread)thread.scrollTop=thread.scrollHeight;}}
function switchWorkspaceTab(tab){WS.activeTab=tab;WS.lastAction=null;render();}
function applyWorkspaceFilters(){WS.filters.branch=$('#wsBranch').value;WS.filters.supplier=$('#wsSupplier').value.trim();WS.filters.pn=$('#wsPn').value.trim();saveWorkspace();toast('工作台上下文已更新，四个视图将共用该范围','ok');render();}

function renderOverview(){
  const highlights=[['1,847','Open PO lines','授权范围'],['95.2%','Overall OTD','▲ 0.8pp'],['23','逾期 PO','5 条严重'],['1,117','Open BO','7 条高风险'],['18','3R 未处理','14 条超 48h'],['7','一周内耗尽 PN','需关注']];
  return `<div class="overview-intro"><div><h3>采购履约驾驶舱</h3><p>预置看板示例 · 展示已确认的数据视图，不承诺用户自定义或发布能力。</p></div><div class="overview-actions"><span class="tag">预置只读看板</span><button class="btn" onclick="switchWorkspaceTab('data')">查看数据明细</button></div></div>
  <div class="uc26-kpis">${highlights.map((k,i)=>`<div class="uc26-kpi ${i===2||i===5?'risk':''}"><span>${k[1]}</span><b>${k[0]}</b><small>${k[2]}</small></div>`).join('')}</div>
  <div class="dashboard-grid">${WS.dashboard.length?WS.dashboard.map(item=>renderComponentCard(item,'dashboard')).join(''):`<div class="empty-workspace"><div>◇</div><h3>个人看板还没有组件</h3><p>前往智能分析，将有价值的结果固定到这里。</p><button class="btn primary" onclick="switchWorkspaceTab('analysis')">前往智能分析</button></div>`}</div>`;
}
function renderComponentCard(item,target){
  const state=item.state,v=State.dbviews[state.view]||State.dbviews[0];
  const controls=target==='dashboard'?`<button onclick="openComponentInAnalysis('${item.id}','dashboard')">查看详情</button>`:`<span class="tag">${state.question==='组件仓库'?'预置组件':'问数结果'}</span>`;
  return `<article class="insight-component card"><header><div><span class="component-kicker">${esc(v.name)} · ${state.type==='line'?'趋势':state.type==='horizontal'?'排名':'分布'}</span><h3>${esc(state.title||v.chartTitle)}</h3></div><div class="component-actions">${controls}</div></header>${renderVisualization(v,state,'compact')}<footer><span>UC26 计算层 · T+1 08:00</span><span>BBAC 行级过滤</span></footer></article>`;
}
function renderVisualization(v,state,mode){
  const values=v.chart.map(x=>Number(x[1])||0),max=Math.max(...values,1),min=Math.min(...values),range=Math.max(max-min,1);
  if(state.type==='line'){const w=520,h=132,p=18,points=values.map((n,i)=>`${p+i*((w-p*2)/Math.max(1,values.length-1))},${h-p-((n-min)/range)*(h-p*2)}`).join(' ');
    return `<div class="line-viz ${mode||''}"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(v.chartTitle)}"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" class="axis"/>${state.showTarget?`<line x1="${p}" y1="${h*.28}" x2="${w-p}" y2="${h*.28}" class="target"/><text x="${w-p-42}" y="${h*.28-5}">目标线</text>`:''}<polyline points="${points}" class="trend"/>${points.split(' ').map((pt,i)=>{const a=pt.split(',');return `<circle cx="${a[0]}" cy="${a[1]}" r="4"/><text x="${a[0]}" y="${h-3}" text-anchor="middle">${esc(v.chart[i][0])}</text>`}).join('')}</svg></div>`;
  }
  if(state.type==='horizontal')return `<div class="horizontal-viz">${v.chart.map(x=>`<div><span>${esc(x[0])}</span><i><b style="width:${Math.max(8,Math.round(x[1]/max*100))}%"></b></i><strong>${x[1]}</strong></div>`).join('')}</div>`;
  return `<div class="bars workspace-bars">${v.chart.map(x=>`<div class="bar-w"><div class="b ${x[2]?'g':''}" style="height:${Math.max(12,Math.round(x[1]/max*105))}px"><span>${x[1]}</span></div><div class="x">${esc(x[0])}</div></div>`).join('')}</div>`;
}
function openComponentInAnalysis(id,target){const list=target==='report'?WS.report.items:WS.dashboard,item=list.find(x=>x.id===id);if(!item)return;WS.analysis=JSON.parse(JSON.stringify(item.state));WS.activeTab='analysis';render();}

function dataSets(){
  const po=State.dbviews[1],bo=State.dbviews[2],r3=State.dbviews[4];
  return {'po-bo':{name:'PO + BO 合并跟踪',source:'UC26_PO_BO_TRACKING',view:2,cols:['对象','类型','供应商 / 需求方','计划 / required 日','数量 / 状态','风险'],rows:[...po.rows.map(r=>[r[0],'PO',r[1],r[2],r[4],Number.parseInt(r[3])>=7?'严重逾期':'逾期']),...bo.rows.map(r=>[r[0],'BO',r[1],r[2],r[3],r[4]])]},
    r3:{name:'3R Tracking',source:'UC26_3R_TRACKING',view:4,cols:r3.cols,rows:r3.rows},overdue:{name:'逾期 PO 明细',source:'UC26_PO_OVERDUE',view:1,cols:po.cols,rows:po.rows},
    alerts:{name:'预警日志',source:'UC26_ALERT_LOG',view:5,cols:['预警编号','类型','对象','触发时间','状态','接收范围'],rows:[['ALT-260901-37','PO 严重逾期','PO-45081072','09-01 08:04','已外发','BBAC'],['ALT-260901-12','库存耗尽','A001-222-18','09-01 08:03','待跟进','BBAC'],['ALT-260901-09','3R 超时','PO-45081320','09-01 08:02','处理中','BBAC']]}};
}
function renderData(){
  const sets=dataSets(),d=sets[WS.activeDataset]||sets['po-bo'],keyword=(WS.dataKeyword||'').toLowerCase(),rows=d.rows.filter(r=>!keyword||r.join(' ').toLowerCase().includes(keyword));
  return `<div class="data-toolbar card"><div class="data-tabs">${Object.entries(sets).map(([id,x])=>`<button class="${id===WS.activeDataset?'on':''}" onclick="switchDataset('${id}')">${esc(x.name)}</button>`).join('')}</div><input id="dataKeyword" class="search" placeholder="搜索当前授权明细" value="${esc(WS.dataKeyword||'')}"><button class="btn" onclick="searchDataset()">搜索</button><button class="btn" onclick="exportDataset()">⤓ 导出当前范围</button></div>
  <div class="dataset-meta"><div><span>数据集</span><b>${esc(d.source)}</b></div><div><span>刷新</span><b>T+1 · 08:00</b></div><div><span>权限</span><b>BBAC 行级 + 字段级过滤</b></div><div><span>结果</span><b>${rows.length} 行（演示样本）</b></div></div>
  <div class="tblwrap"><table class="tbl dataset-table"><thead><tr>${d.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${renderCell(c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${d.cols.length}"><div class="empty-workspace">没有匹配的授权数据</div></td></tr>`}</tbody></table><div class="dataset-foot"><span>第 1 页 / 共 1 页</span><span>原型仅展示样本；正式查询、排序与分页由服务端在授权全集执行。</span></div></div>`;
}
function renderCell(value){const s=String(value);if(/严重|高|耗尽|逾期/.test(s))return `<span class="tag dan">${esc(s)}</span>`;if(/处理中|待跟进|中|open/.test(s))return `<span class="tag warn">${esc(s)}</span>`;if(/已外发|正常|reviewed/.test(s))return `<span class="tag ok">${esc(s)}</span>`;return esc(s);}
function switchDataset(id){WS.activeDataset=id;WS.dataKeyword='';render();}
function searchDataset(){WS.dataKeyword=$('#dataKeyword').value.trim();render();}
function exportDataset(){const d=dataSets()[WS.activeDataset],rows=d.rows;dl(`${d.source}_authorized.csv`,'﻿'+toCsv([d.cols,...rows]),'text/csv;charset=utf-8');audit('导出 UC26 业务数据',`${d.name} · ${rows.length} 行`,'UC26 分析工作台');toast('已导出当前授权样本；正式环境将在下载时复核权限','ok');}

function renderAnalysis(){
  const c=currentConversation(),a=WS.analysis,v=State.dbviews[a.view]||State.dbviews[0];
  return `<div class="analysis-workbench"><aside class="conversation-rail card"><header><b>问数记录</b><span class="tag">当前会话</span></header><div class="analysis-readonly-note">最近问数</div><div class="conversation-list">${WS.conversations.map(x=>`<button class="${x.id===WS.currentConversation?'on':''}" onclick="selectConversation('${x.id}')"><b>${esc(x.title)}</b><span>${esc(x.updated||'当前')}</span></button>`).join('')}</div></aside>
  <main class="analysis-canvas"><div class="canvas-head"><div><span class="component-kicker">问数结果 · ${esc(v.name)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></div><div class="canvas-actions"><button class="btn" onclick="switchWorkspaceTab('data')">查看数据明细</button><button class="btn primary" onclick="addCurrentToReport()">加入报告</button></div></div>
  <div class="analysis-scope"><span>当前问题：<b>${esc(a.question)}</b></span><span>工厂：<b>${esc(WS.filters.branch)}</b></span>${a.onlyOverdue?'<span>范围：<b>仅逾期</b></span>':''}<span>图形：<b>${a.type==='line'?'趋势图':a.type==='horizontal'?'横向排名':'柱状图'}</b></span></div>
  <div class="analysis-visual card">${renderVisualization(v,a,'large')}</div><div class="analysis-findings"><article class="card"><span>分析结论</span><p>${esc(a.summary)}</p><ul>${(a.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article><article class="card"><span>关键明细</span><div class="mini-table">${v.rows.slice(0,4).map(r=>`<div>${r.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`).join('')}</div></article></div>
  <details class="lineage card"><summary>查看口径、数据来源与权限快照</summary><div class="lineage-grid"><div><b>数据来源</b><span>UC26 PG 计算层</span></div><div><b>刷新频率</b><span>T+1 · 08:00</span></div><div><b>权限快照</b><span>BBAC · 行级过滤</span></div><div><b>允许动作</b><span>自由问数 / 加入报告</span></div></div></details></main>
  <aside class="ask-chat card"><div class="chat-head"><div class="answer-mark">AI</div><div><b>UC26 问数助手</b><span>自由问数 · 基于授权数据</span></div><span class="tag ok">在线</span></div><div class="chat-suggestions"><span>问题示例</span>${ANALYSIS_CASES.slice(0,4).map((x,i)=>`<button class="ask-chip ${i===WS.currentCase?'on':''}" onclick="runSuggested(${i})">${esc(x.label)}</button>`).join('')}</div><div class="chat-thread" id="chatThread">${c.messages.map(m=>`<div class="chat-msg ${m.who}"><span>${m.who==='assistant'?'AI':'我'}</span><p>${esc(m.text)}</p></div>`).join('')}</div><div class="chat-context"><span>数据范围</span><b>${esc(v.name)} · ${esc(WS.filters.branch)}</b></div><div class="chat-compose"><textarea id="askInput" rows="2" placeholder="输入 UC26 采购跟踪相关问题…"></textarea><button class="btn primary" onclick="sendAsk()">发送</button></div><p class="chat-foot">原型以确定性样本演示自由问数入口；回答范围和准确性以后续接口验收为准。</p></aside></div>`;
}
function applyCase(i,append){if(i<0)i=0;const c=ANALYSIS_CASES[i];WS.currentCase=i;WS.analysis={view:c.view,type:i===0?'line':i===1?'horizontal':'bar',title:c.title,question:c.label,summary:c.summary,bullets:c.bullets,showTarget:i===0,onlyOverdue:false};if(append){const conv=currentConversation();conv.messages.push({who:'user',text:c.label},{who:'assistant',text:c.summary});conv.title=c.label.replace(/[？?]/g,'').slice(0,18);conv.updated='刚刚';}}
function runSuggested(i){applyCase(i,true);render();}
function sendAsk(){
  const input=$('#askInput'),q=input.value.trim();if(!q)return;const conv=currentConversation();conv.messages.push({who:'user',text:q});
  let i=0;if(/供应商|逾期/.test(q))i=1;else if(/BO|缺口/i.test(q))i=2;else if(/库存|PN|区域/i.test(q))i=3;else if(/3R|review/i.test(q))i=4;
  applyCase(i,false);WS.analysis.question=q;conv.messages.push({who:'assistant',text:WS.analysis.summary});conv.title=q.slice(0,18);conv.updated='刚刚';render();
}
function selectConversation(id){WS.currentConversation=id;render();}
function addCurrentToReport(){const found=UC26_COMPONENTS.find(x=>x.view===WS.analysis.view),item=makeInstance(found?found.id:'po-otd','report',WS.analysis);WS.report.items.push(item);WS.lastAction={kind:'remove-added',target:'report',id:item.id,message:`已将「${item.state.title}」加入分析报告`};render();}

function renderReport(){
  return `<div class="report-workbench"><main class="report-sheet card"><div class="report-toolbar"><div><span class="component-kicker">预置报告 · 快照示例</span><input id="reportTitle" value="${esc(WS.report.title)}" readonly></div><div><button class="btn" onclick="switchWorkspaceTab('data')">查看数据明细</button><button class="btn" onclick="switchWorkspaceTab('overview')">返回概览</button><button class="btn primary" onclick="exportReport()">导出 HTML</button></div></div>
  <textarea id="reportNarrative" class="report-narrative" readonly>${esc(WS.report.narrative)}</textarea><div class="report-grid">${WS.report.items.map(x=>renderComponentCard(x,'report')).join('')}</div></main>
  <aside class="component-repo card"><header><div><span class="component-kicker">UC26 INDICATORS</span><h3>指标清单</h3></div><span class="tag blue">${UC26_COMPONENTS.length} 个</span></header><div class="repo-list">${UC26_COMPONENTS.map(c=>`<article><div><span>${esc(c.group)}</span><b>${esc(c.title)}</b><small>${esc(c.permission)}</small></div><span class="tag">${WS.report.items.some(x=>x.componentId===c.id)?'报告已展示':'候选指标'}</span></article>`).join('')}</div><div class="template-box"><h4>报告模板</h4><div class="template-item"><button><b>周度履约复盘（预置）</b><span>2 个示例组件 · 只读</span></button></div><p class="tiny muted">自定义模板与动态编排不在当前原型承诺范围内。</p></div></aside></div>`;
}
function exportReport(){const cards=WS.report.items.map(x=>`<section><h2>${esc(x.state.title)}</h2><p>${esc(x.state.summary||'UC26 分析组件')}</p></section>`).join(''),html=`<!doctype html><meta charset="utf-8"><title>${esc(WS.report.title)}</title><style>body{font:14px/1.7 system-ui;max-width:960px;margin:40px auto;color:#182433}section{border-top:1px solid #ddd;padding:18px 0}h1,h2{margin-bottom:6px}</style><h1>${esc(WS.report.title)}</h1><p>${esc(WS.report.narrative)}</p>${cards}<small>UC26 静态原型导出 · BBAC 授权样本 · T+1 08:00</small>`;dl('UC26_分析报告.html',html,'text/html;charset=utf-8');audit('导出 UC26 分析报告',`${WS.report.items.length} 个组件`,'UC26 分析工作台');toast('HTML 报告已导出；PDF 由正式异步导出契约提供','ok');}
function undoLastAction(){const a=WS.lastAction;if(!a)return;if(a.kind==='remove-added'){const i=WS.report.items.findIndex(x=>x.id===a.id);if(i>=0)WS.report.items.splice(i,1);}WS.lastAction=null;render();}
function dismissFeedback(){WS.lastAction=null;render();}
document.addEventListener('DOMContentLoaded',()=>{tabFromUrl();render();});
