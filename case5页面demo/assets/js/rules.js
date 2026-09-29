/* ===== rules.js · 邮件中心（Case 5 邮件监听 · 邮件模板） ===== */

let sentMailFilter=readWorkbenchFilter();
function resetCenterFilters(){sentMailFilter=null;}
function render(){
  if(workbenchScopeActive(sentMailFilter)&&sentMailFilter.status==='sent'){renderSentWorkbenchMail();return;}
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>邮件中心</h2><div class="sub">按 Case 管理邮件监听与邮件模板。</div></div>
  </div>
  ${centerContext()}
  ${renderMailMonitor()}
  ${renderMailTemplate()}`;
}

/* ===== 邮件监听（沿用原型 rules.html 的表格写法；Case 标题在表格外，命名取自 core.js CASE_LINES） ===== */
function renderMailMonitor(){
  const on = State.rules.filter(r=>r.on).length;
  return `<div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">邮件监听</h3>
        <p class="sec-sub">自定义筛选条件 → 附件角色录入 → 流程绑定 · 共 ${State.rules.length} 条规则，${on} 条启用</p></div>
      <button class="btn primary" onclick="location.href='rule-edit.html'">+ 新建规则</button>
    </div>
    ${visibleCaseLines().map(renderWatchCase).join('')}
  </div>`;
}
function renderWatchCase(g){
  const rs = State.rules.filter(r=>ruleLine(r)===g.line).sort((a,b)=>a.prio-b.prio);
  const onCnt = rs.filter(r=>r.on).length;
  return `<section class="case-group">
    <div class="case-group-hd">
      <h4>${esc(g.label)}</h4>
      <span>${rs.length} 条规则${rs.length?' · '+onCnt+' 条启用':''}</span>
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>规则</th><th>监听邮箱</th><th style="text-align:center">优先级</th><th>绑定流程</th><th style="text-align:center">累计命中</th><th style="text-align:center">启用</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(watchRow).join('')
          : '<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>这条线路还没有监听规则</div></td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function watchRow(r){
  return `<tr>
      <td><b>${esc(r.name)}</b><div class="tiny muted">${r.id} · 主题含「${esc(r.crit.subj)||'（不限）'}」</div></td>
      <td class="small">${esc(r.mail)}</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn sm ghost" onclick="prio('${r.id}',-1)" title="提高优先级">▲</button>
        <b style="margin:0 3px">${r.prio}</b>
        <button class="btn sm ghost" onclick="prio('${r.id}',1)" title="降低优先级">▼</button>
      </td>
      <td><span class="tag vio">${esc(r.flow)}</span></td>
      <td style="text-align:center">${r.hits}</td>
      <td style="text-align:center"><span class="sw ${r.on?'on':''}" onclick="toggleRule('${r.id}')" title="启停"></span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" onclick="dryRun('${r.id}', null)">试运行</button>
        <button class="btn sm" onclick="location.href='rule-edit.html?id=${encodeURIComponent(r.id)}'">编辑</button>
      </td>
    </tr>`;
}
function toggleRule(id){
  const r = State.rule(id); if(!r) return;
  r.on = !r.on;
  audit(r.on?'启用规则':'停用规则', id, '邮件中心');
  State.save();
  toast(r.on?`规则 ${id} 已启用`:`规则 ${id} 已停用（不影响存量任务）`, r.on?'ok':'warn');
  render();
}
/* 优先级在同一线路内交换，跨线路互不影响 */
function prio(id, d){
  const r = State.rule(id); if(!r) return;
  const list = State.rules.filter(x=>ruleLine(x)===ruleLine(r)).sort((a,b)=>a.prio-b.prio);
  const i = list.findIndex(x=>x.id===id), j = i + d;
  if(j<0 || j>=list.length) return;
  const tmp = list[i].prio; list[i].prio = list[j].prio; list[j].prio = tmp;
  audit('调整规则优先级', `${id} · ${list[i].prio}`, '邮件中心');
  State.save(); render();
  toast(`已调整 ${id} 优先级`,'ok');
}

/* ===== Case 5 邮件模板（BRD 未要求对外发送通知邮件，保留平台能力） ===== */
const TPL_SAMPLE_ROWS=[
  ['2026/09/22','South 3PL','DEMO-A001','DGR','—','Y','Y','—','2026/09/23'],
  ['2026/09/23','West 3PL','DEMO-A002','DGR','—','N','N_ Not required','Not found shippers_Decl','2026/09/23'],
];
function mailTplC1(){ return State.mailTemplates.find(t=>t.caseId==='case-5'); }
function renderMailTemplate(){
  const tpl=mailTplC1();
  /* 平台能力保留：取不到模板时给出明确空状态，而不是整块消失 */
  if(!tpl) return `<section class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">邮件模板</h3>
      <p class="sec-sub">流程结束后对外发送的通知邮件，可配置收件人与正文。</p></div></div>
    <div class="card center-empty"><h3>暂无邮件模板</h3>
      <p>Case5 的运行结果为 DSS 导入模板，在 Portal 上供下载，不发送通知邮件，因此这里是空的。<br>
      需要发通知的 Case 在此配置收件人与正文后即可启用。</p></div>
  </section>`;
  const recv=tpl.recipients||[];
  const toLine=recv.length
    ?recv.map(m=>esc(m)).join('； ')+` <span class="muted">（共 ${recv.length} 人）</span>`
    :'<span class="muted">尚未配置，点击「编辑邮件模板」从 IO 邮箱清单选择</span>';
  return `<div class="center-sec">
    <h3 class="sec-title">邮件模板</h3>
    <section class="card card-p">
    <div class="page-hd" style="margin-bottom:12px">
      <div><h3 class="tpl-name">${esc(tpl.name||'运行结果通知')}</h3></div>
      <div style="display:flex;gap:9px;align-items:center">${recv.length?'<span class="tag ok">已配置</span>':'<span class="tag warn">待配置</span>'}<button class="btn primary" onclick="editMailTemplate()">编辑邮件模板</button></div>
    </div>
    <div class="mail-sheet">
      <div class="mail-hd">
        <div class="mail-hd-row"><span class="mail-lb">收件人</span><div class="mail-to">${toLine}</div></div>
        <div class="mail-hd-row"><span class="mail-lb">主题</span><div class="mail-subject">${esc(tpl.subject)||'<span class="muted">（未设置）</span>'}</div></div>
      </div>
      <div class="mail-bd">
        <div class="mail-text">${tpl.body.split('\n').map(l=>l.trim()?`<div>${esc(l)}</div>`:'<div class="mail-gap"></div>').join('')}</div>
        <div class="mail-tblwrap"><table class="mail-tbl"><thead><tr>${tpl.variables.map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead>
          <tbody>${TPL_SAMPLE_ROWS.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="mail-cap">表格由系统按运行结果自动生成，此处显示样例数据。</div>
      </div>
    </div>
    <div class="tpl-foot"><span class="mail-lb">可用参数</span><div class="tpl-chips">${tpl.variables.map(v=>`<span class="tpl-var">{{${esc(v)}}}</span>`).join('')}</div></div>
    </section>
  </div>`;
}
function editMailTemplate(){
  const tpl=mailTplC1(); if(!tpl) return;
  const recv=tpl.recipients||[];
  openModal('编辑邮件模板 · '+esc(tpl.name||'运行结果通知'), `
    <div class="fld" style="margin-bottom:14px"><label>收件人（IO 接收邮箱清单 · 可多选）</label>
      <div class="tpl-chips" style="margin-bottom:7px">
        <button class="btn sm ghost" onclick="tplPickAll(true)">全选</button>
        <button class="btn sm ghost" onclick="tplPickAll(false)">清空</button>
        <span class="tiny muted" style="margin-left:auto" id="tplRecvCnt">已选 ${recv.length} / ${State.ioRecipients.length}</span>
      </div>
      <div class="tpl-recv">${State.ioRecipients.map(m=>`<label><input type="checkbox" class="tpl-rm" value="${esc(m)}" ${recv.includes(m)?'checked':''} onchange="tplRecvCount()"><span>${esc(m)}</span></label>`).join('')}</div>
    </div>
    <div class="fld" style="margin-bottom:14px"><label>邮件主题</label><input id="tplSubject" value="${esc(tpl.subject)}"></div>
    <div class="fld" style="margin-bottom:14px"><label>正文文字（上传状态表格由系统按运行结果自动生成）</label><textarea id="tplBody" rows="4">${esc(tpl.body)}</textarea></div>
    <div class="fld"><label>可用参数（运行结果字段，系统自动填充）</label>
      <div class="tpl-chips">${tpl.variables.map(v=>`<span class="tpl-var">{{${esc(v)}}}</span>`).join('')}</div>
    </div>
    <p class="center-note">配置仅保存在当前浏览器，重置演示数据可恢复默认。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="saveMailTemplate()">保存模板</button>`);
}
function tplPickAll(on){ document.querySelectorAll('.tpl-rm').forEach(c=>{c.checked=on}); tplRecvCount(); }
function tplRecvCount(){ const el=$('#tplRecvCnt'); if(el) el.textContent=`已选 ${document.querySelectorAll('.tpl-rm:checked').length} / ${State.ioRecipients.length}`; }
function saveMailTemplate(){
  const tpl=mailTplC1(); if(!tpl) return;
  const subject=$('#tplSubject').value.trim(), body=$('#tplBody').value.trim();
  if(!subject){ toast('邮件主题不能为空','err'); return; }
  if(!body){ toast('邮件正文不能为空','err'); return; }
  const recv=[...document.querySelectorAll('.tpl-rm:checked')].map(c=>c.value);
  tpl.subject=subject; tpl.body=body; tpl.recipients=recv;
  audit('更新邮件模板', `${tpl.name||'运行结果通知'} · 收件人 ${recv.length} 人`, '邮件中心');
  State.save();
  closeModal();
  toast('邮件模板已保存（本地演示）','ok');
  render();
}

function renderSentWorkbenchMail(){
  const rows=workbenchRows(HOME_MAILS,sentMailFilter);
  $('#view').innerHTML=`<div class="page-hd"><div><h2>邮件中心</h2><div class="sub">Case 5 · 已发送邮件 · 模拟记录，未实际外发</div></div><a class="btn" href="rules.html">返回邮件中心</a></div>${workbenchScopeBanner(sentMailFilter)}<div class="tblwrap"><div class="toolbar"><b>已发送</b><span class="tag">${rows.length} 封</span></div><table class="tbl"><thead><tr><th>邮件编号</th><th>主题</th><th>运输方式</th><th>发送日期</th><th>状态</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(m.id)}</td><td>托运清单上传状态通知（模拟）</td><td>${m.mode==='air'?'空运':'海运'}</td><td>${esc(m.date)}</td><td><span class="tag ok">已发送（模拟）</span></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">当前范围暂无已发送邮件</div></td></tr>'}</tbody></table></div>`;
}
document.addEventListener('DOMContentLoaded', render);
