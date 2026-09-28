/* ===== rbac.js · 权限中心（只读原型） ===== */
const RBAC_ROLES = [
  {id:'OPERATOR',name:'业务操作员',scope:'本人相关任务',desc:'字段修正、安全重跑、业务核对'},
  {id:'MANAGER',name:'业务主管',scope:'团队与场景范围',desc:'审批、对外动作确认、不可逆重跑、导出'},
  {id:'ADMIN',name:'平台管理员',scope:'平台配置范围',desc:'规则、模板、维度表及配置发布'},
  {id:'AUDITOR',name:'审计员',scope:'只读审计范围',desc:'证据、权限与审计日志只读'},
];
const RBAC_ACTIONS = [
  ['任务查看','task.read','本人相关','团队范围','全部','只读全部'],
  ['字段修正','task.field.correct','允许','—','—','—'],
  ['安全重跑','run.rerun.safe','允许','允许','允许','—'],
  ['不可逆重跑','run.rerun.irreversible','—','允许','—','—'],
  ['内部确认','run.approve.internal','允许','允许','—','—'],
  ['对外动作确认','run.approve.external','—','允许','—','—'],
  ['规则编辑','rule.edit','—','—','允许','—'],
  ['配置发布','config.publish','—','—','允许','—'],
  ['分析导出','analytics.export','—','允许','允许','—'],
];
let rbacTab='mine';
let demoRole='AUDITOR';

function render(){
  const role=RBAC_ROLES.find(x=>x.id===demoRole)||RBAC_ROLES[3];
  setCrumb('<b>只读权限查询</b>');
  $('#view').innerHTML=`
  <div class="page-hd rbac-heading">
    <div><div class="eyebrow">GOVERNANCE · READ ONLY</div><h2>权限中心</h2><div class="sub">查询 Alice 身份映射、角色权限、数据范围与授权决策；平台不提供角色分配编辑。</div></div>
    <div class="rbac-head-actions"><span class="tag ok">策略服务正常</span><span class="tag">policy-2026.09.08.3</span></div>
  </div>
  <div class="banner rbac-banner"><span class="ic">ℹ</span><div class="txt"><b>只读页面</b> · 用户开通、停用和角色分配由 Alice 管理；本页没有新增、编辑、保存或发布权限的入口。</div></div>
  <div class="rbac-tabs seg">
    ${[['mine','我的权限'],['matrix','权限矩阵'],['scope','数据范围'],['decisions','决策记录']].map(x=>`<button class="${rbacTab===x[0]?'on':''}" onclick="setRbacTab('${x[0]}')">${x[1]}</button>`).join('')}
  </div>
  <div class="prototype-role"><span>原型演示视角</span><select class="pick" onchange="demoRole=this.value;render()">${RBAC_ROLES.map(x=>`<option value="${x.id}" ${x.id===demoRole?'selected':''}>${x.id} · ${x.name}</option>`).join('')}</select><span class="tiny muted">仅用于验证页面显隐，不代表真实 Alice 鉴权</span></div>
  ${rbacTab==='mine'?renderMine(role):rbacTab==='matrix'?renderMatrix():rbacTab==='scope'?renderScopes(role):renderDecisions()}`;
}

function renderMine(role){
  return `<div class="rbac-layout">
    <div class="identity-card card">
      <div class="identity-avatar">ER</div><div><span class="tiny muted">ALICE IDENTITY</span><h3>erxiao</h3><p>erxiao@example.corp</p></div><span class="tag ok">会话有效</span>
      <div class="identity-grid"><div><span>当前角色</span><b>${role.id} · ${role.name}</b></div><div><span>角色来源</span><b>Alice entitlement</b></div><div><span>数据范围</span><b>${role.scope}</b></div><div><span>策略版本</span><b>policy-2026.09.08.3</b></div></div>
    </div>
    <div class="card role-card"><div class="role-icon">${role.id.slice(0,1)}</div><div><span class="tiny muted">当前角色能力</span><h3>${role.name}</h3><p>${role.desc}</p></div><span class="tag acc">显式授权</span></div>
    <div class="card permission-list"><div class="panel-title"><h4>当前动作权限</h4><span class="tiny muted">由服务端状态推导，UI 显隐不替代授权</span></div>${RBAC_ACTIONS.map(a=>{const idx={OPERATOR:2,MANAGER:3,ADMIN:4,AUDITOR:5}[role.id];const val=a[idx];return `<div class="permission-row"><div><b>${a[0]}</b><code>${a[1]}</code></div><span class="perm ${val==='—'?'no':'yes'}">${val==='—'?'无权限':val}</span></div>`}).join('')}</div>
    <div class="card maintainer-card"><div class="role-icon warn">M</div><div><h3>MAINTAINER 不是超级管理员</h3><p>仅在双人批准、限时 break-glass 下访问运维读路径；业务写入、审批、修正、重跑和配置发布均不可绕过。</p></div></div>
  </div>`;
}
function renderMatrix(){
  return `<div class="card matrix-card"><div class="panel-title"><h4>角色 × 动作权限</h4><span class="tiny muted">角色无隐含继承，空白即无权限</span></div><div class="matrix-scroll"><table class="tbl permission-matrix"><thead><tr><th>动作</th><th>权限键</th>${RBAC_ROLES.map(r=>`<th>${r.id}<small>${r.name}</small></th>`).join('')}</tr></thead><tbody>${RBAC_ACTIONS.map(a=>`<tr><td><b>${a[0]}</b></td><td><code>${a[1]}</code></td>${a.slice(2).map(v=>`<td><span class="perm ${v==='—'?'no':'yes'}">${v==='—'?'—':v}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="sod-note"><b>职责分离：</b>业务主管不是操作员的权限超集；主管没有字段修正权，操作员没有对外动作确认权。</div></div>`;
}
function renderScopes(role){
  const scopes=[
    ['行级范围',role.scope,'任务列表、看板、导出使用同一结构化范围'],
    ['场景范围','UC26 / UC34 / UC64','场景不编码进角色名，由 data_scope 表达'],
    ['供应商范围','BBAC 授权供应商集合','UC26 场景概览、问数与导出保持一致'],
    ['字段掩码','supplier_quote / personal_id','未经授权的字段不进入页面、下载、通知或模型上下文'],
  ];
  return `<div class="scope-grid">${scopes.map((s,i)=>`<div class="card scope-card"><span class="scope-no">0${i+1}</span><h3>${s[0]}</h3><b>${s[1]}</b><p>${s[2]}</p></div>`).join('')}</div><div class="card scope-contract"><div><h3>结构化授权结果</h3><p>页面只展示可解释结果，不输出可执行 SQL；“未计算”“空范围”和“无限制”是不同状态。</p></div><pre>{\n  "row_scope": "${role.id.toLowerCase()}-scope",\n  "field_masks": ["supplier_quote"],\n  "policy_version": "policy-2026.09.08.3"\n}</pre></div>`;
}
function renderDecisions(){
  const rows=[
    ['09-10 16:42:18','erxiao','task.read','T-0901-0018','允许','policy-2026.09.08.3'],
    ['09-10 16:40:03','erxiao','task.field.correct','T-0901-0018','拒绝','policy-2026.09.08.3'],
    ['09-10 16:33:49','audit.lee','evidence.read','EV-P-2209','允许','policy-2026.09.08.3'],
    ['09-10 16:21:12','manager.zhao','analytics.export','PO KPI','允许','policy-2026.09.08.3'],
  ];
  return `<div class="card decisions-card"><div class="toolbar"><b>最近授权决策</b><input class="search" placeholder="主体 / 动作 / 资源" style="margin-left:auto"><span class="tag">只读</span></div><table class="tbl"><thead><tr><th>时间</th><th>主体</th><th>动作</th><th>资源</th><th>结果</th><th>策略版本</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td>${i===4?`<span class="tag ${x==='允许'?'ok':'dan'}">${x}</span>`:esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="decision-foot">拒绝结果不展示不可见资源细节；本原型记录用于呈现审计结构，不代表真实授权日志。</div></div>`;
}
function setRbacTab(tab){ rbacTab=tab; render(); }
document.addEventListener('DOMContentLoaded',render);
