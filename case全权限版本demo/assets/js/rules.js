/* ===== rules.js · 邮件中心（全权限版：Case1 ~ 5 邮件监听 · 各 Case 邮件模板） ===== */

function render(){
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>邮件中心</h2><div class="sub">按 Case 管理邮件监听与邮件模板。</div></div>
  </div>
  ${casePickBar()}
  ${renderMailMonitor()}
  ${renderMailTemplates()}`;
  bindCasePickBar(render);
}

/* ===== 邮件监听：一张表（同任务中心），按顶部 Case 多选过滤；「关联」显示任务中心的子 Case 名称 ===== */
/* 规则所属子 Case：按绑定流程推导线路，Case1 不区分空运 / 海运 */
function ruleCase(r){
  const g = CASE_LINES.find(x=>x.line===ruleLine(r)); if(!g) return null;
  const mode = g.line.replace(/^case\d-/,'');
  return CASE_FILTERS.find(c=>c.caseId===g.caseId && (g.caseId==='case-1'||c.mode===mode)) || null;
}
function renderMailMonitor(){
  const lines = visibleCaseLines().filter(linePicked);
  const order = c=>c?CASE_FILTERS.indexOf(c):99;
  const rs = State.rules.filter(r=>lines.some(g=>g.line===ruleLine(r))).sort((a,b)=>order(ruleCase(a))-order(ruleCase(b))||a.prio-b.prio);
  const on = rs.filter(r=>r.on).length;
  return `<div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">邮件监听</h3>
        <p class="sec-sub">自定义筛选条件 → 附件角色录入 → 流程绑定 · 共 ${rs.length} 条规则，${on} 条启用</p></div>
      <button class="btn primary" onclick="location.href='rule-edit.html'">+ 新建规则</button>
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>规则</th><th>发件人白名单</th><th>关联</th><th style="text-align:center;white-space:nowrap">累计命中</th><th style="text-align:center">启用</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(watchRow).join('')
          : '<tr><td colspan="6"><div class="empty"><div class="ei">∅</div>所选 Case 没有邮件监听规则</div></td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
}
function watchRow(r){
  const from = String(r.crit.from||'').split(/[;,，]/).map(x=>x.trim()).filter(Boolean), c = ruleCase(r);
  return `<tr>
      <td><b>${esc(r.name)}</b><div class="tiny muted">${r.id} · 主题含「${esc(r.crit.subj)||'（不限）'}」</div></td>
      <td class="small">${from.length?from.map(esc).join('<br>'):'<span class="muted">（不限）</span>'}</td>
      <td><span class="tag gold">${esc(c?c.label:r.flow)}</span></td>
      <td style="text-align:center">${r.hits}</td>
      <td style="text-align:center"><span class="sw ${r.on?'on':''}" onclick="toggleRule('${r.id}')" title="启停"></span></td>
      <td style="text-align:right;white-space:nowrap">
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

/* ===== 邮件模板：按 Case 分组，三个 Case 用同一套模板配置 =====
 * 收件人：可增可减；主题、正文可改；
 * 状态记录表（status report）以 Excel 附件形式随邮件发送：仅可初始上传，上传后不可修改、不可配置字段。
 * Case4 / Case5：BRD 未要求发送通知邮件。 */
/* 各 Case 的状态记录表附件（BRD：Case1 附表5 运行结果 / Case2 AVIS BL status report）；
 * Case3 演示「尚未上传」：在编辑弹窗里上传附件3 运行结果，上传一次后锁定 */
const TPL_ATTACH = {'case-1':'运行结果.xlsx', 'case-2':'AVIS BL status report.xlsx'};
function tplOf(caseId){
  const tpl = State.mailTemplates.find(t=>t.caseId===caseId); if(!tpl) return null;
  if(tpl.attachment===undefined && TPL_ATTACH[caseId]) tpl.attachment = {name:TPL_ATTACH[caseId], time:'初始上传'};
  if(caseId==='case-3' && !(tpl.recipients||[]).length) tpl.recipients = c3Recipients().slice();
  return tpl;
}
function renderMailTemplates(){
  return `<div class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">邮件模板</h3>
      <p class="sec-sub">流程结束后对外发送的通知邮件，按 Case 配置收件人与正文 · 本原型不实际外发</p></div></div>
    ${ALLOWED_CASE_IDS.filter(casePicked).map(id=>`<section class="case-group">
      <div class="case-group-hd"><h4>${esc((CASES[id]||{}).label||id)}</h4><span>${tplOf(id)?'1 个模板':'不发送通知邮件'}</span></div>
      ${tplOf(id)?renderTpl(tplOf(id)):`<div class="card center-empty"><p>该 Case 的运行结果不对外发送通知邮件（BRD 未要求），这里不需要配置。</p></div>`}
    </section>`).join('')}
  </div>`;
}
function mailBodyHtml(text){ return String(text||'').split('\n').map(l=>l.trim()?`<div>${esc(l)}</div>`:'<div class="mail-gap"></div>').join(''); }
/* Case2 主题 / 正文的运行周等占位符，预览时按当前运行数据替换 */
function tplFill(tpl, text){
  if(tpl.caseId!=='case-2') return String(text||'');
  const rows=c2StatusRows(), last=rows[rows.length-1];
  return String(text||'').replace(/\{运行周\}/g, last?c2IsoWeek(last.date):'').replace(/\{运行日期\}/g, last?last.date:'').replace(/\{票数\}/g, String(rows.length));
}
function attChip(att){ return `<span class="mail-att"><span class="mail-att-ic">X</span><b>${esc(att.name)}</b></span>`; }
function renderTpl(tpl){
  const recv=tpl.recipients||[];
  return `<section class="card card-p">
    <div class="page-hd" style="margin-bottom:12px">
      <div><h3 class="tpl-name">${esc(tpl.name)}</h3></div>
      <div style="display:flex;gap:9px;align-items:center">${recv.length&&tpl.attachment?'<span class="tag ok">已配置</span>':'<span class="tag warn">待配置</span>'}<button class="btn primary" onclick="editTpl('${tpl.caseId}')">编辑邮件模板</button></div>
    </div>
    <div class="mail-sheet">
      <div class="mail-hd">
        <div class="mail-hd-row"><span class="mail-lb">收件人</span><div class="mail-to">${recv.length?recv.map(esc).join('； ')+` <span class="muted">（共 ${recv.length} 人）</span>`:'<span class="muted">尚未配置收件人</span>'}</div></div>
        <div class="mail-hd-row"><span class="mail-lb">主题</span><div class="mail-subject">${esc(tplFill(tpl, tpl.subject))||'<span class="muted">（未设置）</span>'}</div></div>
        <div class="mail-hd-row"><span class="mail-lb">附件</span><div class="mail-to">${tpl.attachment?attChip(tpl.attachment):'<span class="muted">未上传</span>'}</div></div>
      </div>
      <div class="mail-bd"><div class="mail-text">${mailBodyHtml(tplFill(tpl, tpl.body))}</div></div>
    </div>
  </section>`;
}
/* ===== 编辑：收件人可增可减；附件仅可初始上传，上传后锁定 ===== */
let tplDraft=null;   // {caseId, recipients:[], attachment}
function editTpl(caseId){
  const tpl=tplOf(caseId); if(!tpl) return;
  tplDraft={caseId, recipients:(tpl.recipients||[]).slice(), attachment:tpl.attachment||null};
  openModal('编辑邮件模板 · '+esc(tpl.name), `
    <div class="fld" style="margin-bottom:16px"><label>收件人</label>
      <div class="rcp-box" id="tplRecv"></div>
      <div class="tpl-add">
        <input id="tplNewMail" placeholder="name@mercedes-benz.com">
        <button class="btn sm" onclick="tplAddMail()">添加</button>
      </div>
    </div>
    <div class="fld" style="margin-bottom:16px"><label>邮件主题</label><input id="tplSubject" value="${esc(tpl.subject)}"></div>
    <div class="fld" style="margin-bottom:16px"><label>正文</label><textarea id="tplBody" rows="5">${esc(tpl.body)}</textarea></div>
    <div class="fld"><label>附件</label><div id="tplAtt"></div></div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="saveTpl()">保存模板</button>`, 'wide');
  renderTplRecv(); renderTplAtt();
  const inp=$('#tplNewMail');
  if(inp) inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); tplAddMail(); } };
}
function renderTplRecv(){
  const r=tplDraft.recipients;
  $('#tplRecv').innerHTML=r.length
    ? r.map((m,i)=>`<span class="rcp">${esc(m)}<button title="移除" onclick="tplDelMail(${i})">×</button></span>`).join('')+`<span class="rcp-cnt">共 ${r.length} 人</span>`
    : '<span class="muted small">还没有收件人</span>';
}
function tplAddMail(){
  const inp=$('#tplNewMail'), v=(inp.value||'').trim();
  if(!v) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ toast('邮箱格式不正确','err'); return; }
  if(tplDraft.recipients.includes(v)){ toast('该收件人已在清单中','warn'); inp.value=''; return; }
  tplDraft.recipients.push(v); inp.value=''; renderTplRecv();
}
function tplDelMail(i){ tplDraft.recipients.splice(i,1); renderTplRecv(); }
function renderTplAtt(){
  const a=tplDraft.attachment;
  $('#tplAtt').innerHTML=a
    ? `<div class="att-lock">${attChip(a)}<span class="tag">不可修改</span></div>`
    : `<label class="btn sm att-up">⤒ 上传附件<input type="file" class="hidden" accept=".xlsx" onchange="tplPickAtt(this)"></label>`;
}
function tplPickAtt(input){
  const f=input.files[0]; input.value='';
  if(!f) return;
  if(!/\.xlsx$/i.test(f.name)){ toast('需要 .xlsx 文件','err'); return; }
  if(!f.size){ toast('文件为空，请重新选择','err'); return; }
  tplDraft.attachment={name:f.name, time:now()}; renderTplAtt();
}
function saveTpl(){
  const tpl=tplOf(tplDraft.caseId); if(!tpl) return;
  const subject=$('#tplSubject').value.trim(), body=$('#tplBody').value.trim();
  if(!tplDraft.recipients.length){ toast('至少保留一位收件人','err'); return; }
  if(!subject){ toast('邮件主题不能为空','err'); return; }
  if(!body){ toast('邮件正文不能为空','err'); return; }
  tpl.subject=subject; tpl.body=body; tpl.recipients=tplDraft.recipients.slice(); tpl.attachment=tplDraft.attachment;
  audit('更新邮件模板', `${tpl.name} · 收件人 ${tpl.recipients.length} 人`, '邮件中心');
  State.save(); closeModal();
  toast('邮件模板已保存（本地演示）','ok');
  render();
}
/* Case3 初始收件人：按演示票 PDC 匹配映射表「附件5_Mapping list_Email loop」（配置中心可维护） */
function c3Recipients(){
  const r=case3RunRecord(State.task('T-PKLA01458373')), pdc=r&&r[1];
  const m=State.cfgItem('map-c3-email'), row=m&&(m.rows||[]).find(x=>x[2]===pdc);
  if(row) return String(row[3]||'').split(/[;\s]+/).filter(Boolean);
  const list=window.CASE3_PDC_RECIPIENTS?.[pdc];
  return Array.isArray(list)?list:[];
}
document.addEventListener('DOMContentLoaded', render);
