/* ===== rule-edit.js · 邮件规则编辑（全权限版）=====
 * 两段：基本信息与筛选条件（规则名称 / 关联 / 发件人白名单 / 主题 / 正文关键词）→ 附件要求。
 * 监听邮箱、收件人、附件数量上下限、多份、流程绑定细项不在页面编辑，保存时沿用原值。 */
/* 可选项：监听邮箱 / 附件角色取自现有规则，关联（绑定流程）取自 core.js CASE_LINES，显示为任务中心的子 Case 名称 */
function optMails(cur){ return [...new Set(State.rules.map(r=>r.mail).concat(cur?[cur]:[]))].filter(Boolean); }
function optRoles(cur){ return [...new Set(State.rules.flatMap(r=>(r.atts||[]).map(a=>a.role)).concat(cur?[cur]:[]))].filter(Boolean); }
function optFlows(){ return visibleCaseLines().flatMap(g=>(g.flows||[]).map(f=>{ const c = ruleCase({flow:f}); return [f, (c?c.label:g.label)+(g.flows.length>1?' · '+f:'')]; })); }
/* 规则所属子 Case（与邮件中心「关联」列一致） */
function ruleCase(r){ const g = CASE_LINES.find(x=>x.line===ruleLine(r)); if(!g) return null; const mode = g.line.replace(/^case\d-/,''); return CASE_FILTERS.find(c=>c.caseId===g.caseId && (g.caseId==='case-1'||c.mode===mode)) || null; }
let draft = null;  // 当前编辑的规则（副本）
/* 流程所属 Case；新建时默认选从邮件中心带来的 Case（?case=）下的第一个流程 */
function flowCaseId(flow){ const g = CASE_LINES.find(x=>(x.flows||[]).includes(flow)); return g ? g.caseId : ''; }
function backHref(r){ const c = (r && flowCaseId(r.flow)) || qp('case'); return 'rules.html'+(c?`?case=${c}&tab=watch`:''); }

function render(){
  const id = qp('id');
  const existing = id ? State.rule(id) : null;
  const r = existing ? JSON.parse(JSON.stringify(existing)) : {
    id:'R-NEW-'+String(State.rules.length+1).padStart(2,'0'),
    name:'', mail:optMails()[0]||'', prio: State.rules.length+1,
    flow:((optFlows().find(f=>flowCaseId(f[0])===qp('case'))||optFlows()[0])||[''])[0], on:true, hits:0,
    crit:{from:'', to:'', subj:'', body:'', attMin:1, attMax:6},
    atts:[{role:optRoles()[0]||'attachment', type:'PDF', req:true, multi:false, re:'.*'}],
  };
  draft = r;
  setCrumb(`<a href="${backHref(existing)}">邮件中心</a> · <b>${existing?esc(existing.id):'新建'}</b>`);
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>${existing?'编辑规则':'新建邮件规则'}</h2></div>
    <div style="display:flex;gap:9px">
      <button class="btn primary" onclick="saveRule()">保存规则</button>
    </div>
  </div>

  <div class="rule-editor">
    <div class="stage">
      <div class="stage-hd"><span class="num">1</span><h3>基本信息与筛选条件</h3></div>
      <div class="stage-bd frm">
        <div class="fld"><label>规则名称 *</label><input id="fName" value="${esc(r.name)}" placeholder="如：报关代理邮件监控"></div>
        <div class="fld"><label>关联 *</label><select id="fFlow">
          ${optFlows().map(([v,t])=>`<option value="${esc(v)}" ${r.flow===v?'selected':''}>${esc(t)}</option>`).join('')}
        </select></div>
        <div class="fld"><label>主题包含关键词</label><input id="fSubj" value="${esc(r.crit.subj)}"></div>
        <div class="fld"><label>正文关键词</label><input id="fBody" value="${esc(r.crit.body)}"></div>
        <!-- 发件人白名单单独占一行，地址多时便于展示 -->
        <div class="fld" style="grid-column:1/-1"><label>发件人白名单</label><input id="fFrom" value="${esc(r.crit.from)}" placeholder="*@abc.com"></div>
      </div>
    </div>

    <div class="stage">
      <div class="stage-hd"><span class="num">2</span><h3>附件要求（角色录入）</h3><button class="btn sm" style="margin-left:auto" onclick="addAtt()">+ 添加附件</button></div>
      <div class="stage-bd" id="attList">
        ${r.atts.map((a,i)=>attRow(a,i)).join('')}
      </div>
    </div>

  </div>`;
}
function attRow(a, i){
  return `<div class="att-row" data-i="${i}">
    <div class="fld"><label>附件角色</label><select class="aRole">
      ${optRoles(a.role).map(x=>`<option ${a.role===x?'selected':''}>${esc(x)}</option>`).join('')}
    </select></div>
    <div class="fld"><label>文件名规则（正则）</label><input class="aRe" value="${esc(a.re)}"></div>
    <div class="fld"><label>类型</label><select class="aType">${['PDF','Excel','图片','不限'].map(x=>`<option ${a.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="fld"><label>必需</label><select class="aReq"><option value="1" ${a.req?'selected':''}>必需</option><option value="0" ${!a.req?'selected':''}>可选</option></select></div>
    <button class="btn sm ghost" onclick="delAtt(${i})">×</button>
  </div>`;
}
function collectForm(){
  return {
    ...draft,
    name: $('#fName').value.trim(),
    flow: $('#fFlow').value,
    /* 线路不单独填写，随绑定流程自动归属 */
    line: lineFromFlow($('#fFlow').value),
    crit: {...draft.crit, from: $('#fFrom').value.trim(), subj: $('#fSubj').value.trim(), body: $('#fBody').value.trim()},
    /* 多份不在页面编辑：沿用原附件要求的取值 */
    atts: [...document.querySelectorAll('#attList .att-row')].map((row,i)=>({
      role: row.querySelector('.aRole').value,
      re: row.querySelector('.aRe').value,
      type: row.querySelector('.aType').value,
      req: row.querySelector('.aReq').value==='1',
      multi: !!((draft.atts||[])[+row.dataset.i]||{}).multi,
    })),
  };
}
function addAtt(){
  draft = collectForm();
  draft.atts.push({role:optRoles()[0]||'attachment', type:'PDF', req:false, multi:false, re:'.*'});
  // 保留表单值后重绘
  $('#attList').insertAdjacentHTML('beforeend', attRow(draft.atts[draft.atts.length-1], draft.atts.length-1));
}
function delAtt(i){
  draft = collectForm();
  if(draft.atts.length<=1){ toast('至少保留一条附件要求','warn'); return; }
  draft.atts.splice(i,1);
  document.querySelector(`#attList .att-row[data-i="${i}"]`).remove();
}
function validate(r){
  if(!r.name) return '规则名称必填';
  if(!r.atts.length) return '至少配置一条附件要求';
  if(!r.atts.some(a=>a.req)) return '至少一条附件要求为「必需」';
  return null;
}
function saveRule(){
  const r = collectForm();
  const err = validate(r);
  if(err){ toast(err,'err'); return; }
  const id = qp('id');
  const existing = id ? State.rule(id) : null;
  if(existing){ Object.assign(existing, r); }
  else { State.rules.push(r); }
  audit(existing?'修改规则':'新建规则', `${r.id} · ${r.name}`, '规则配置');
  State.save();
  toast(`规则 ${r.id} 已保存`,'ok');
  setTimeout(()=>location.href=backHref(r), 400);
}
document.addEventListener('DOMContentLoaded', render);
