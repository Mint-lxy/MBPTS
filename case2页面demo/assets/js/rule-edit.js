/* ===== rule-edit.js · 三段式规则编辑器 ===== */
let draft = null;  // 当前编辑的规则（副本）

function render(){
  const id = qp('id');
  const existing = id ? State.rule(id) : null;
  const r = existing ? JSON.parse(JSON.stringify(existing)) : {
    id:'R-NEW-'+String(State.rules.length+1).padStart(2,'0'),
    name:'', mail:'ie-import@mb.cn', prio: State.rules.length+1,
    flow:'case-2-glc', on:false, hits:0,
    crit:{from:'', to:'ie-import@mb.cn', subj:'', body:'', attMin:1, attMax:6},
    atts:[{role:'avis', type:'PDF', req:true, multi:false, re:'.*'}],
  };
  draft = r;
  setCrumb(`<a href="rules.html">邮件中心</a> · <b>${existing?esc(existing.id):'新建'}</b>`);
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>${existing?'编辑规则':'新建邮件规则'}</h2><div class="sub">三段式表单：筛选条件 → 附件要求 → 流程绑定 · 保存前可 dry-run 验证</div></div>
    <div style="display:flex;gap:9px">
      <button class="btn" onclick="dryFromForm()">试运行 dry-run</button>
      <button class="btn primary" onclick="saveRule()">保存规则</button>
    </div>
  </div>

  <div class="rule-editor">
    <div class="stage">
      <div class="stage-hd"><span class="num">1</span><h3>基本信息与筛选条件</h3><span class="tiny muted" style="margin-left:auto">至少 6 种筛选维度</span></div>
      <div class="stage-bd frm">
        <div class="fld"><label>规则名称 *</label><input id="fName" value="${esc(r.name)}" placeholder="如：AVIS 监控"></div>
        <div class="fld"><label>监听邮箱（平台收发人）*</label><select id="fMail">
          ${['ie-import@mb.cn','ie-export@mb.cn','asn@mb.cn'].map(m=>`<option ${r.mail===m?'selected':''}>${m}</option>`).join('')}
        </select></div>
        <div class="fld"><label>发件人白名单（;分隔，支持 *@域名）</label><input id="fFrom" value="${esc(r.crit.from)}"></div>
        <div class="fld"><label>收件人包含（To/Cc）</label><input id="fTo" value="${esc(r.crit.to)}"></div>
        <div class="fld"><label>主题包含关键词</label><input id="fSubj" value="${esc(r.crit.subj)}" placeholder="留空 = 不限"></div>
        <div class="fld"><label>正文关键词</label><input id="fBody" value="${esc(r.crit.body)}"></div>
        <div class="fld"><label>附件数量下限</label><input id="fMin" type="number" min="0" value="${r.crit.attMin}"></div>
        <div class="fld"><label>附件数量上限</label><input id="fMax" type="number" min="1" value="${r.crit.attMax}"></div>
      </div>
    </div>

    <div class="stage">
      <div class="stage-hd"><span class="num">2</span><h3>附件要求（角色录入）</h3><button class="btn sm" style="margin-left:auto" onclick="addAtt()">+ 添加附件</button></div>
      <div class="stage-bd" id="attList">
        ${r.atts.map((a,i)=>attRow(a,i)).join('')}
      </div>
    </div>

    <div class="stage">
      <div class="stage-hd"><span class="num">3</span><h3>流程绑定</h3><span class="tiny muted" style="margin-left:auto">支持 N:1 汇聚 / 1:N 分流</span></div>
      <div class="stage-bd frm">
        <div class="fld"><label>绑定流程 *</label><select id="fFlow">
          ${[['case-2-glc','case-2-glc · AVIS 与 BL 创建'],['case-2-glc-dg','case-2-glc-dg · DG 判断分支'],['case-2-mbusi','case-2-mbusi · Shipping Log 与 BL 创建']].map(([v,t])=>`<option value="${v}" ${r.flow===v?'selected':''}>${t}</option>`).join('')}
        </select></div>
        <div class="fld"><label>汇聚策略</label><select id="fAgg"><option>首命中放行</option><option>全命中（凑齐必需附件后放行）</option></select></div>
        <div class="fld"><label>关联 OCR Schema</label><select id="fSchema"><option>avis_pdf v1.0</option><option>oocl_bl v1.0</option><option>cma_cgm_bl v1.0</option><option>shippers_decl v1.0</option></select></div>
        <div class="fld"><label>去重键</label><input id="fDedup" value="邮件ID + 附件指纹"></div>
        <div class="fld"><label>优先级</label><input id="fPrio" type="number" min="1" value="${r.prio}"></div>
        <div class="fld"><label>启用状态</label><select id="fOn"><option value="1" ${r.on?'selected':''}>启用</option><option value="0" ${!r.on?'selected':''}>停用</option></select></div>
      </div>
    </div>
  </div>`;
}
function attRow(a, i){
  return `<div class="att-row" data-i="${i}">
    <div class="fld"><label>附件角色</label><select class="aRole">
      ${['avis','shipper_decl','bl','shipping_log'].map(x=>`<option ${a.role===x?'selected':''}>${x}</option>`).join('')}
    </select></div>
    <div class="fld"><label>文件名规则（正则）</label><input class="aRe" value="${esc(a.re)}"></div>
    <div class="fld"><label>类型</label><select class="aType">${['PDF','Excel','图片','不限'].map(x=>`<option ${a.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="fld"><label>必需</label><select class="aReq"><option value="1" ${a.req?'selected':''}>必需</option><option value="0" ${!a.req?'selected':''}>可选</option></select></div>
    <div class="fld"><label>多份</label><select class="aMulti"><option value="0">单份</option><option value="1" ${a.multi?'selected':''}>多份</option></select></div>
    <button class="btn sm ghost" onclick="delAtt(${i})">×</button>
  </div>`;
}
function collectForm(){
  return {
    ...draft,
    name: $('#fName').value.trim(),
    mail: $('#fMail').value,
    flow: $('#fFlow').value,
    /* 线路不单独填写，随绑定流程自动归属 */
    line: lineFromFlow($('#fFlow').value),
    prio: +$('#fPrio').value || 9,
    on: $('#fOn').value==='1',
    crit: {
      from: $('#fFrom').value.trim(), to: $('#fTo').value.trim(),
      subj: $('#fSubj').value.trim(), body: $('#fBody').value.trim(),
      attMin: +$('#fMin').value||0, attMax: +$('#fMax').value||99,
    },
    atts: [...document.querySelectorAll('#attList .att-row')].map(row=>({
      role: row.querySelector('.aRole').value,
      re: row.querySelector('.aRe').value,
      type: row.querySelector('.aType').value,
      req: row.querySelector('.aReq').value==='1',
      multi: row.querySelector('.aMulti').value==='1',
    })),
  };
}
function addAtt(){
  draft = collectForm();
  draft.atts.push({role:'bl', type:'PDF', req:false, multi:false, re:'.*'});
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
  if(r.crit.attMin > r.crit.attMax) return '附件数量下限不能大于上限';
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
  setTimeout(()=>location.href='rules.html', 400);
}
function dryFromForm(){
  const r = collectForm();
  const err = validate(r);
  if(err){ toast('试运行前先修正：'+err,'warn'); }
  const rid = qp('id');
  if(rid) dryRun(rid, r.crit); else {
    // 草稿：借用 rules.js 的 dryRun 逻辑（临时注入）
    window.__draftCrit = r.crit;
    dryRun(null, r.crit);
  }
}
document.addEventListener('DOMContentLoaded', render);
