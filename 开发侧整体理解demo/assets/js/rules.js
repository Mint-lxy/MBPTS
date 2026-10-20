/* ===== rules.js · 邮件中心（按 Case 查看邮件监听、邮件模板、邮件日志；一次只看一个 Case，没有「全部」） =====
 * 邮件监听：规则只有名称、筛选条件（发件人 / 收件人 / 主题正则 / 正文正则）和附件要求；附件种类按规则写死，不能增删。
 *   编辑在弹窗里完成，不另开页面。
 * 邮件模板：每个 Case 一个，只配置收件人、主题、正文；主题、正文可用 {{参数}}，底部列出可用参数。只有业务操作员视角可见。
 * 邮件日志：单独一个页签，分「收到的邮件」和「已发送的邮件」两个列表（数据见 inbound-mails.js）。
 *   收到的邮件中未命中规则的可手动挂到某个 Case 的某条规则，再点「手动触发」建任务；已挂规则的邮件不能改挂（07-mail.md 第 9 节）。
 *   已发送的邮件对应 outbound_mail：模板、任务、收件人、主题、发送时间；平台不存发出的正文。
 */
/* Case 均为业务 Case（core.js UC34_CASES，Case2a 欧线、Case2b 美线分开） */
const MAIL_CASE_IDS = visibleBizCases().map(c=>c.id);
let mailCase = MAIL_CASE_IDS.includes(qp('case')) ? qp('case') : MAIL_CASE_IDS[0];
const inCase = id => mailCase===id;
function ruleCaseId(r){ return lineBiz(ruleLine(r)); }
/* 页签：用户视角看不到邮件模板 */
const MAIL_TABS = [{k:'watch', t:'邮件监听'}, {k:'tpl', t:'邮件模板', show:canManageMailTpl}, {k:'log', t:'邮件日志'}]
  .filter(x=>!x.show || x.show());
let mailTab = MAIL_TABS.some(x=>x.k===qp('tab')) ? qp('tab') : 'watch';
function syncMailUrl(){ history.replaceState(null,'', `?case=${mailCase}&tab=${mailTab}`); }

function render(){
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>邮件中心</h2><div class="sub">按 Case 管理邮件监听${canManageMailTpl()?'、邮件模板':''}，查看公邮收发的邮件。</div></div>
    ${casePickHtml('mailCasePick', mailCase, false)}
  </div>
  <div class="seg mail-tabs" role="tablist">${MAIL_TABS.map(x=>`<button role="tab" aria-selected="${mailTab===x.k}" class="${mailTab===x.k?'on':''}" data-tab="${x.k}">${x.t}</button>`).join('')}</div>
  ${mailTab==='watch' ? renderMailMonitor() : mailTab==='tpl' ? renderMailTemplates() : renderMailLog()}`;
  bindCasePick('mailCasePick', v=>{
    mailCase = v; logFilter.page = 1; sentFilter.page = 1;
    syncMailUrl(); render();
  });
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ mailTab = b.dataset.tab; syncMailUrl(); render(); });
  if(mailTab==='log') bindMailLog();
}

/* ==================== 邮件监听 ==================== */
function renderMailMonitor(){
  const rules = State.rules.filter(r=>inCase(ruleCaseId(r))), on = rules.filter(r=>r.on).length;
  const groups = visibleCaseLines().filter(g=>inCase(g.biz));
  return `<div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">邮件监听</h3>
        <p class="sec-sub">筛选条件 → 附件要求 · 共 ${rules.length} 条规则，${on} 条启用</p></div>
    </div>
    ${groups.map(renderWatchCase).join('')}
  </div>`;
}
function renderWatchCase(g){
  const rs = State.rules.filter(r=>ruleLine(r)===g.line);
  const onCnt = rs.filter(r=>r.on).length;
  return `<section class="case-group">
    <div class="case-group-hd">
      <h4>${esc(g.label)}</h4>
      <span>${rs.length} 条规则${rs.length?' · '+onCnt+' 条启用':''}</span>
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>规则</th><th>附件要求</th><th style="text-align:center">累计命中</th><th style="text-align:center">启用</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(watchRow).join('')
          : '<tr><td colspan="5"><div class="empty"><div class="ei">∅</div>这条线路没有邮件监听规则</div></td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function watchRow(r){
  return `<tr>
      <td><b>${esc(r.name)}</b><div class="tiny muted">${esc(r.id)} · 主题正则 ${r.crit.subj?`<code>${esc(r.crit.subj)}</code>`:'（不限）'}</div></td>
      <td class="small">${(r.atts||[]).map(a=>`<span class="tag">${esc(a.role)}${a.req?'':' · 可选'}</span>`).join(' ')||'—'}</td>
      <td style="text-align:center">${r.hits}</td>
      <td style="text-align:center"><span class="sw ${r.on?'on':''}" onclick="toggleRule('${esc(r.id)}')" title="启停"></span></td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm" onclick="editRule('${esc(r.id)}')">编辑</button></td>
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

/* ----- 编辑规则（弹窗）：附件种类写死，只改每类附件的文件名正则、类型、必需、多份 ----- */
function editRule(id){
  const r = State.rule(id); if(!r) return;
  const c = r.crit || {};
  openModal('编辑邮件规则 · '+esc(r.id), `
    <h4 class="rule-sec">基本信息与筛选条件</h4>
    <div class="frm rule-frm">
      <div class="fld"><label>规则名称 *</label><input id="fName" value="${esc(r.name)}"></div>
      <div class="fld"><label>启用状态</label><select id="fOn"><option value="1" ${r.on?'selected':''}>启用</option><option value="0" ${!r.on?'selected':''}>停用</option></select></div>
      <div class="fld"><label>发件人白名单（;分隔，支持 *@域名）</label><input id="fFrom" value="${esc(c.from)}" placeholder="留空 = 不限"></div>
      <div class="fld"><label>收件人包含（To/Cc）</label><input id="fTo" value="${esc(c.to)}" placeholder="留空 = 不限"></div>
      <div class="fld"><label>主题正则</label><input id="fSubj" value="${esc(c.subj)}" placeholder="留空 = 不限"></div>
      <div class="fld"><label>正文正则</label><input id="fBody" value="${esc(c.body)}" placeholder="留空 = 不限"></div>
    </div>
    <h4 class="rule-sec">附件要求<span class="tiny muted">附件种类由该规则固定，不能增删</span></h4>
    <div id="attList">${(r.atts||[]).map(attRow).join('')||'<p class="tiny muted">该规则不要求附件</p>'}</div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="saveRule('${esc(r.id)}')">保存规则</button>`, 'wide');
}
function attRow(a){
  return `<div class="att-row fixed">
    <div class="fld"><label>附件种类</label><div class="att-role"><span class="tag acc">${esc(a.role)}</span></div></div>
    <div class="fld"><label>文件名正则</label><input class="aRe" value="${esc(a.re)}"></div>
    <div class="fld"><label>类型</label><select class="aType">${['PDF','Excel','图片','PDF/图片','不限'].map(x=>`<option ${a.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="fld"><label>必需</label><select class="aReq"><option value="1" ${a.req?'selected':''}>必需</option><option value="0" ${!a.req?'selected':''}>可选</option></select></div>
    <div class="fld"><label>多份</label><select class="aMulti"><option value="0">单份</option><option value="1" ${a.multi?'selected':''}>多份</option></select></div>
  </div>`;
}
function badRegex(s){ if(!s) return false; try{ new RegExp(s); return false; }catch(e){ return true; } }
function saveRule(id){
  const r = State.rule(id); if(!r) return;
  const name = $('#fName').value.trim();
  const crit = {...r.crit, from:$('#fFrom').value.trim(), to:$('#fTo').value.trim(), subj:$('#fSubj').value.trim(), body:$('#fBody').value.trim()};
  const rows = [...document.querySelectorAll('#attList .att-row')];
  const atts = (r.atts||[]).map((a,i)=>({...a,
    re: rows[i].querySelector('.aRe').value.trim(),
    type: rows[i].querySelector('.aType').value,
    req: rows[i].querySelector('.aReq').value==='1',
    multi: rows[i].querySelector('.aMulti').value==='1'}));
  if(!name){ toast('规则名称必填','err'); return; }
  if(badRegex(crit.subj)){ toast('主题正则格式不正确','err'); return; }
  if(badRegex(crit.body)){ toast('正文正则格式不正确','err'); return; }
  const badAtt = atts.find(a=>badRegex(a.re));
  if(badAtt){ toast(`附件 ${badAtt.role} 的文件名正则格式不正确`,'err'); return; }
  if(atts.length && !atts.some(a=>a.req)){ toast('至少一类附件为「必需」','err'); return; }
  Object.assign(r, {name, crit, atts, on:$('#fOn').value==='1'});
  audit('修改规则', `${r.id} · ${r.name}`, '邮件中心');
  State.save();
  closeModal();
  toast(`规则 ${r.id} 已保存`,'ok');
  render();
}

/* ==================== 邮件模板：每个 Case 一个，只配收件人、主题、正文 ==================== */
function tplOf(caseId){ return State.mailTemplates.find(t=>t.caseId===caseId); }
/* 模板可用的 {{参数}}：通用参数 + 该 Case 的任务标签（task_tag 的键，写成 {{tag:键}}）；
   Case3 回复原预报邮件，多一个原邮件主题。发送时按任务渲染，取不到的留空。 */
const TPL_COMMON_PARAMS = [['task_code','任务编号'],['task_title','任务标题'],['case_name','Case 名称'],
  ['run_no','执行实例，如 R#2'],['result','执行结果'],['finished_at','完成时间']];
const TPL_EXTRA_PARAMS = {'case-3':[['mail_subject','原预报邮件主题（回复时用）']]};
const TPL_TAG_PARAMS = {'case-1':['HAWB No.','PDC'], 'case-2a':['AVIS No.','BL No.','PDC'], 'case-2b':['Booking Number','PDC'],
  'case-3':['HAWB No.'], 'case-4':['HAWB No.'], 'case-5':['AWB No.','HAWB/BL No.']};
function tplParams(caseId){
  return TPL_COMMON_PARAMS.concat(TPL_EXTRA_PARAMS[caseId]||[], (TPL_TAG_PARAMS[caseId]||[]).map(k=>['tag:'+k, '标签 '+k]));
}
/* 底部参数提示；insertable 时点一下插入到光标处（主题或正文） */
function tplParamsHtml(caseId, insertable){
  return `<div class="tpl-params"><div class="tpl-params-hd">可用的动态参数${insertable?'<span>点击插入到光标处</span>':'<span>在主题、正文里写 {{参数}}，发送时按任务替换</span>'}</div>
    <div class="tpl-params-list">${tplParams(caseId).map(([k,l])=>insertable
      ? `<button type="button" class="tpl-param" onclick="tplInsert('${esc(k)}')"><code>{{${esc(k)}}}</code><small>${esc(l)}</small></button>`
      : `<span class="tpl-param"><code>{{${esc(k)}}}</code><small>${esc(l)}</small></span>`).join('')}</div></div>`;
}
/* 文本里出现但不在可用列表中的参数 */
function unknownParams(caseId, text){
  const ok = new Set(tplParams(caseId).map(p=>p[0]));
  return [...String(text||'').matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map(m=>m[1]).filter(k=>!ok.has(k));
}
/* 模板展示时把 {{参数}} 高亮 */
function tplVarHtml(s){ return esc(s).replace(/\{\{\s*([^}]*?)\s*\}\}/g, '<span class="tpl-var">{{$1}}</span>'); }
let tplFocus = null;
function tplInsert(key){
  const el = tplFocus || $('#tplBody'); if(!el) return;
  const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length, ins = `{{${key}}}`;
  el.value = el.value.slice(0,s) + ins + el.value.slice(e);
  el.focus(); el.selectionStart = el.selectionEnd = s + ins.length;
}
function renderMailTemplates(){
  const ids = MAIL_CASE_IDS.filter(inCase);
  return `<div class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">邮件模板</h3>
      <p class="sec-sub">流程结束后由平台公邮发出的通知邮件，按 Case 配置收件人、主题、正文；主题、正文可用 {{参数}} · 本原型不实际外发</p></div></div>
    ${ids.map(id=>`<section class="case-group">
      <div class="case-group-hd"><h4>${esc(caseLabel(id))}</h4><span>${tplOf(id)?'1 个模板':'不发送通知邮件'}</span></div>
      ${tplOf(id)?renderTpl(tplOf(id)):`<div class="card center-empty"><p>该 Case 的运行结果不对外发送通知邮件（BRD 未要求），这里不需要配置。</p></div>`}
    </section>`).join('')}
  </div>`;
}
function mailBodyHtml(text){ return String(text||'').split('\n').map(l=>l.trim()?`<div>${esc(l)}</div>`:'<div class="mail-gap"></div>').join(''); }
function renderTpl(tpl){
  const recv = tpl.recipients||[];
  return `<section class="card card-p">
    <div class="page-hd" style="margin-bottom:12px">
      <div><h3 class="tpl-name">${esc(tpl.name)}</h3></div>
      <div style="display:flex;gap:9px;align-items:center">${recv.length?'<span class="tag ok">已配置</span>':'<span class="tag warn">待配置收件人</span>'}<button class="btn primary" onclick="editTpl('${tpl.caseId}')">编辑邮件模板</button></div>
    </div>
    <div class="mail-sheet">
      <div class="mail-hd">
        <div class="mail-hd-row"><span class="mail-lb">发件人</span><div class="mail-to">Portal 公邮</div></div>
        <div class="mail-hd-row"><span class="mail-lb">收件人</span><div class="mail-to">${recv.length?recv.map(esc).join('； ')+` <span class="muted">（共 ${recv.length} 人）</span>`:'<span class="muted">尚未配置，点击「编辑邮件模板」添加</span>'}</div></div>
        <div class="mail-hd-row"><span class="mail-lb">主题</span><div class="mail-subject">${tplVarHtml(tpl.subject)||'<span class="muted">（未设置）</span>'}</div></div>
      </div>
      <div class="mail-bd"><div class="mail-text">${String(tpl.body||'').split('\n').map(l=>l.trim()?`<div>${tplVarHtml(l)}</div>`:'<div class="mail-gap"></div>').join('')}</div></div>
    </div>
    ${tplParamsHtml(tpl.caseId, false)}
  </section>`;
}
let tplRecv = [];
function editTpl(caseId){
  const tpl = tplOf(caseId); if(!tpl || !canManageMailTpl()) return;
  tplRecv = (tpl.recipients||[]).slice();
  openModal('编辑邮件模板 · '+esc(tpl.name), `
    <div class="fld" style="margin-bottom:16px"><label>收件人</label>
      <div class="tpl-recv-list" id="tplRecv"></div>
      <div class="tpl-add">
        <input id="tplNewMail" placeholder="输入邮箱，回车或点添加">
        <button class="btn sm" onclick="tplAddMail()">添加</button>
      </div>
    </div>
    <div class="fld" style="margin-bottom:16px"><label>邮件主题 *</label><input id="tplSubject" value="${esc(tpl.subject)}"></div>
    <div class="fld"><label>正文 *</label><textarea id="tplBody" rows="6">${esc(tpl.body)}</textarea></div>
    ${tplParamsHtml(caseId, true)}
    <p class="center-note">配置仅保存在当前浏览器，重置演示数据可恢复默认。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="saveTpl('${caseId}')">保存模板</button>`, 'wide');
  tplFocus = null;
  ['#tplSubject','#tplBody'].forEach(s=>{ $(s).onfocus = e=>{ tplFocus = e.target; }; });
  renderTplRecv();
  $('#tplNewMail').onkeydown = e=>{ if(e.key==='Enter'){ e.preventDefault(); tplAddMail(); } };
}
function renderTplRecv(){
  $('#tplRecv').innerHTML = tplRecv.length
    ? tplRecv.map((m,i)=>`<span class="recv-chip">${esc(m)}<button type="button" onclick="tplDelMail(${i})" aria-label="移除 ${esc(m)}">×</button></span>`).join('')
    : '<span class="tiny muted">还没有收件人</span>';
}
function tplAddMail(){
  const inp = $('#tplNewMail'), v = (inp.value||'').trim();
  if(!v) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ toast('邮箱格式不正确','err'); return; }
  if(tplRecv.includes(v)){ toast('该收件人已在清单中','warn'); inp.value=''; return; }
  tplRecv.push(v); inp.value=''; renderTplRecv();
}
function tplDelMail(i){ tplRecv.splice(i,1); renderTplRecv(); }
function saveTpl(caseId){
  const tpl = tplOf(caseId); if(!tpl || !canManageMailTpl()) return;
  const subject = $('#tplSubject').value.trim(), body = $('#tplBody').value.trim();
  if(!tplRecv.length){ toast('至少添加一位收件人','err'); return; }
  if(!subject){ toast('邮件主题不能为空','err'); return; }
  if(!body){ toast('邮件正文不能为空','err'); return; }
  const bad = [...new Set(unknownParams(caseId, subject+'\n'+body))];
  if(bad.length){ toast(`不认识的参数：${bad.map(k=>'{{'+k+'}}').join('、')}，请从底部列表选择`,'err'); return; }
  Object.assign(tpl, {subject, body, recipients:tplRecv.slice()});
  audit('更新邮件模板', `${tpl.name} · 收件人 ${tplRecv.length} 人`, '邮件中心');
  State.save();
  closeModal();
  toast('邮件模板已保存（本地演示）','ok');
  render();
}

/* ==================== 邮件日志：公邮收到的邮件 ====================
 * 当前 Case 下显示：挂在本 Case 规则上的邮件 + 所有未命中的邮件（未命中的不属于任何 Case，各 Case 都能看到并认领）。 */
const LOG_PAGE_SIZE = 10;
const LOG_CHIPS = {all:'全部', matched:'已命中', unmatched:'未命中'};
let logFilter = {m:'all', kw:'', page:1};
function inboundMails(){ return State.data.inbound || (State.data.inbound = []); }
function inboundMail(id){ return inboundMails().find(m=>m.id===id); }
function mailRule(m){ return m.ruleId ? State.rule(m.ruleId) : null; }
function mailInCase(m){ const r = mailRule(m); return !m.ruleId || (r && ruleCaseId(r)===mailCase); }
function caseMails(){ return inboundMails().filter(mailInCase).sort((a,b)=>b.at.localeCompare(a.at)); }
function logRows(){
  const q = logFilter.kw.trim().toLowerCase();
  return caseMails().filter(m=>{
    if(logFilter.m==='matched' && !m.ruleId) return false;
    if(logFilter.m==='unmatched' && m.ruleId) return false;
    return !q || [m.subj, m.from].concat(m.atts.map(a=>a.name)).some(v=>String(v).toLowerCase().includes(q));
  });
}
function matchTag(m){
  return m.match==='AUTO' ? '<span class="tag ok">自动命中</span>'
    : m.match==='MANUAL' ? '<span class="tag acc">手动挂规则</span>' : '<span class="tag warn">未命中</span>';
}
function mailTaskCell(m){
  if(!m.ruleId) return '<span class="muted">—</span>';
  if(m.taskId && State.task(m.taskId)) return `<a href="task-detail.html?id=${encodeURIComponent(m.taskId)}">${esc(m.taskId)}</a>`;
  return m.match==='MANUAL' ? '<span class="muted">未触发</span>' : '<span class="muted">已交给 trigger</span>';
}
function renderMailLog(){
  const inN = caseMails().length, outN = caseSent().length;
  return `<div class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">邮件日志</h3>
      <p class="sec-sub">${logKind==='in'?'公邮收到的邮件 · 未命中规则的邮件可以挂到某条规则后手动触发':'平台用公邮发出的通知邮件 · 发送成功后记录，不存正文'}</p></div>
      <div class="seg" role="tablist" aria-label="邮件日志类型">
        <button role="tab" aria-selected="${logKind==='in'}" class="${logKind==='in'?'on':''}" data-lk="in">收到的邮件 ${inN}</button>
        <button role="tab" aria-selected="${logKind==='out'}" class="${logKind==='out'?'on':''}" data-lk="out">已发送的邮件 ${outN}</button>
      </div></div>
    ${logKind==='in' ? renderInbox() : renderSent()}
  </div>`;
}
function renderInbox(){
  const all = caseMails(), un = all.filter(m=>!m.ruleId).length;
  const cnt = {all:all.length, matched:all.length-un, unmatched:un};
  return `<div class="tblwrap">
      <div class="toolbar">
        <div class="chips">${Object.entries(LOG_CHIPS).map(([k,l])=>`<button class="chip ${logFilter.m===k?'on':''}" data-lm="${k}">${l}<span class="chip-n">${cnt[k]}</span></button>`).join('')}</div>
        <input class="tag-search" id="logKw" type="search" value="${esc(logFilter.kw)}" placeholder="搜索主题 / 发件人 / 附件名" aria-label="搜索邮件">
        <span class="tiny muted" style="margin-left:auto" id="logCount"></span>
      </div>
      <div id="logBody"></div>
    </div>`;
}
function bindMailLog(){
  document.querySelectorAll('[data-lk]').forEach(b=>b.onclick=()=>{ logKind=b.dataset.lk; render(); });
  if(logKind==='out'){
    $('#sentKw').oninput = e=>{ sentFilter.kw=e.target.value; sentFilter.page=1; renderSentBody(); };
    renderSentBody(); return;
  }
  document.querySelectorAll('[data-lm]').forEach(c=>c.onclick=()=>{ logFilter.m=c.dataset.lm; logFilter.page=1; render(); });
  $('#logKw').oninput = e=>{ logFilter.kw=e.target.value; logFilter.page=1; renderLogBody(); };
  renderLogBody();
}

/* ----- 已发送的邮件（outbound_mail）：按模板所属 Case 过滤 ----- */
let logKind = 'in';
let sentFilter = {kw:'', page:1};
function sentMails(){ return State.data.outbound || (State.data.outbound = []); }
function sentTpl(o){ return State.mailTemplates.find(t=>t.id===o.tpl); }
function caseSent(){ return sentMails().filter(o=>(sentTpl(o)||{}).caseId===mailCase).sort((a,b)=>b.at.localeCompare(a.at)); }
function sentRows(){
  const q = sentFilter.kw.trim().toLowerCase();
  return caseSent().filter(o=>!q || [o.subj, o.to, o.cc, o.taskId].some(v=>String(v||'').toLowerCase().includes(q)));
}
function renderSent(){
  return `<div class="tblwrap">
      <div class="toolbar">
        <input class="tag-search" id="sentKw" type="search" value="${esc(sentFilter.kw)}" placeholder="搜索主题 / 收件人 / 任务编号" aria-label="搜索已发送的邮件">
        <span class="tiny muted" style="margin-left:auto" id="sentCount"></span>
      </div>
      <div id="sentBody"></div>
    </div>`;
}
function addrCell(s){
  const list = String(s||'').split(';').map(x=>x.trim()).filter(Boolean);
  if(!list.length) return '<span class="muted">—</span>';
  return `<span title="${esc(list.join('; '))}">${esc(list[0])}${list.length>1?` <span class="muted">等 ${list.length} 人</span>`:''}</span>`;
}
function renderSentBody(){
  const rows = sentRows(), pages = Math.max(1, Math.ceil(rows.length/LOG_PAGE_SIZE));
  if(sentFilter.page>pages) sentFilter.page = pages;
  const cur = rows.slice((sentFilter.page-1)*LOG_PAGE_SIZE, sentFilter.page*LOG_PAGE_SIZE);
  $('#sentBody').innerHTML = `<table class="tbl mail-log">
    <thead><tr><th>发送时间</th><th>模板</th><th>收件人</th><th>抄送</th><th>主题</th><th>任务</th><th>回复的邮件</th></tr></thead>
    <tbody>${cur.map(o=>{ const tpl = sentTpl(o), reply = o.replyTo && inboundMail(o.replyTo); return `<tr>
      <td class="small muted" style="white-space:nowrap">${esc(o.at)}</td>
      <td class="small">${tpl?esc(tpl.name):'<span class="muted">—</span>'}<div class="tiny muted">${esc(o.id)}</div></td>
      <td class="small">${addrCell(o.to)}</td>
      <td class="small">${addrCell(o.cc)}</td>
      <td><b>${esc(o.subj)}</b></td>
      <td class="small">${State.task(o.taskId)?`<a href="task-detail.html?id=${encodeURIComponent(o.taskId)}">${esc(o.taskId)}</a>`:esc(o.taskId)} <span class="tag">R#${o.runNo}</span></td>
      <td class="small">${reply?`<a href="#" onclick="viewMail('${reply.id}');return false">${esc(reply.id)}</a>`:'<span class="muted">—</span>'}</td>
    </tr>`; }).join('') || '<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>这个 Case 还没有发出过邮件</div></td></tr>'}</tbody></table>
    <div class="pager">
      <span class="tiny muted">共 ${rows.length} 封 · 每页 ${LOG_PAGE_SIZE} 封</span>
      <button class="btn sm" ${sentFilter.page<=1?'disabled':''} onclick="sentPage(-1)" aria-label="上一页">‹</button>
      <span class="small">${sentFilter.page} / ${pages}</span>
      <button class="btn sm" ${sentFilter.page>=pages?'disabled':''} onclick="sentPage(1)" aria-label="下一页">›</button>
    </div>`;
  $('#sentCount').textContent = `${rows.length} / ${caseSent().length} 封`;
}
function sentPage(d){ sentFilter.page += d; renderSentBody(); }
function renderLogBody(){
  const rows = logRows(), pages = Math.max(1, Math.ceil(rows.length/LOG_PAGE_SIZE));
  if(logFilter.page>pages) logFilter.page = pages;
  const cur = rows.slice((logFilter.page-1)*LOG_PAGE_SIZE, logFilter.page*LOG_PAGE_SIZE);
  $('#logBody').innerHTML = `<table class="tbl mail-log">
    <thead><tr><th>接收时间</th><th>发件人</th><th>主题</th><th>附件</th><th>匹配</th><th>规则</th><th>任务</th><th></th></tr></thead>
    <tbody>${cur.map(m=>{ const r = mailRule(m); return `<tr class="click" onclick="viewMail('${m.id}')">
      <td class="small muted" style="white-space:nowrap">${esc(m.at)}</td>
      <td class="small">${esc(m.from)}</td>
      <td><b>${esc(m.subj)}</b><div class="tiny muted">${esc(m.id)}</div></td>
      <td class="small" style="text-align:center">${m.atts.length}</td>
      <td>${matchTag(m)}</td>
      <td class="small">${r?`${esc(r.name)}<div class="tiny muted">${esc(r.id)}</div>`:'<span class="muted">—</span>'}</td>
      <td class="small">${mailTaskCell(m)}</td>
      <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">${
        !m.ruleId ? `<button class="btn sm primary" onclick="attachMail('${m.id}')">挂规则</button>`
        : m.match==='MANUAL' && !m.taskId ? `<button class="btn sm primary" onclick="triggerMail('${m.id}')">手动触发</button>`
        : `<button class="btn sm" onclick="viewMail('${m.id}')">查看</button>`}</td>
    </tr>`; }).join('') || '<tr><td colspan="8"><div class="empty"><div class="ei">∅</div>没有符合条件的邮件</div></td></tr>'}</tbody></table>
    <div class="pager">
      <span class="tiny muted">共 ${rows.length} 封 · 每页 ${LOG_PAGE_SIZE} 封</span>
      <button class="btn sm" ${logFilter.page<=1?'disabled':''} onclick="logPage(-1)" aria-label="上一页">‹</button>
      <span class="small">${logFilter.page} / ${pages}</span>
      <button class="btn sm" ${logFilter.page>=pages?'disabled':''} onclick="logPage(1)" aria-label="下一页">›</button>
    </div>`;
  $('#logCount').textContent = `${rows.length} / ${caseMails().length} 封`;
}
function logPage(d){ logFilter.page += d; renderLogBody(); }

/* 邮件详情：头信息、正文、附件（含归入的附件种类） */
function mailDetailHtml(m){
  const r = mailRule(m);
  return `<div class="mail-sheet">
    <div class="mail-hd">
      <div class="mail-hd-row"><span class="mail-lb">发件人</span><div class="mail-to">${esc(m.from)}</div></div>
      <div class="mail-hd-row"><span class="mail-lb">收件人</span><div class="mail-to">${esc(m.to)}</div></div>
      <div class="mail-hd-row"><span class="mail-lb">主题</span><div class="mail-subject">${esc(m.subj)}</div></div>
      <div class="mail-hd-row"><span class="mail-lb">接收时间</span><div class="mail-to">${esc(m.at)} · UID ${m.uid}</div></div>
      ${r?`<div class="mail-hd-row"><span class="mail-lb">规则</span><div class="mail-to">${esc(r.name)}（${esc(r.id)}）· ${m.match==='AUTO'?'自动命中':'手动挂上'} · ${esc(m.matchedAt)}</div></div>`:''}
    </div>
    <div class="mail-bd"><div class="mail-text">${mailBodyHtml(m.body)}</div></div>
    <div class="mail-atts">${m.atts.length?m.atts.map(a=>`<span class="mail-att">📎 ${esc(a.name)} <small>${esc(a.size)}</small>${a.code?` <span class="tag acc">${esc(a.code)}</span>`:''}</span>`).join(''):'<span class="tiny muted">没有附件</span>'}</div>
  </div>`;
}
function viewMail(id){
  const m = inboundMail(id); if(!m) return;
  const act = !m.ruleId ? `<button class="btn primary" onclick="attachMail('${m.id}')">挂规则</button>`
    : m.match==='MANUAL' && !m.taskId ? `<button class="btn primary" onclick="triggerMail('${m.id}')">手动触发</button>`
    : m.taskId && State.task(m.taskId) ? `<a class="btn primary" href="task-detail.html?id=${encodeURIComponent(m.taskId)}">查看任务</a>` : '';
  openModal('邮件 · '+esc(m.id), mailDetailHtml(m), `<button class="btn" onclick="closeModal()">关闭</button>${act}`, 'wide');
}

/* ----- 手动挂规则：选 Case → 选规则 → 预览附件归类；缺必需附件时提示，由用户决定是否继续 ----- */
function rulesOfCase(caseId){ return State.rules.filter(r=>r.on && ruleCaseId(r)===caseId); }
/* 按规则的附件要求给邮件附件归类：每个附件归入第一个文件名正则匹配的种类；单份的种类只取第一个 */
function classifyAtts(m, r){
  const used = new Set();
  const rows = (r.atts||[]).map(a=>{
    let re; try{ re = new RegExp(a.re||'.*', 'i'); }catch(e){ re = null; }
    const files = m.atts.filter(f=>!used.has(f.name) && re && re.test(f.name));
    const take = a.multi ? files : files.slice(0,1);
    take.forEach(f=>used.add(f.name));
    return {a, files:take};
  });
  return {rows, missing:rows.filter(x=>x.a.req && !x.files.length).map(x=>x.a.role),
    rest:m.atts.filter(f=>!used.has(f.name)).map(f=>f.name)};
}
/* 基本信息逐项比对（口径同收信自动匹配）：条件为空 = 不限；
   发件人白名单 ; 分隔，*@域名 按后缀；收件人包含 = 每个地址都出现在收件人里；主题 / 正文按正则 */
function critChecks(m, r){
  const c = r.crit || {}, split = s=>String(s||'').split(/[;；,，]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  const reTest = (s, v)=>{ try{ return new RegExp(s).test(v||''); }catch(e){ return null; } };
  const from = String(m.from||'').toLowerCase(), to = String(m.to||'').toLowerCase();
  const item = (label, cond, val, ok)=>({label, cond, val, ok: cond ? ok : 'any'});
  return [
    item('发件人白名单', c.from, m.from, split(c.from).some(p=>p.startsWith('*@') ? from.endsWith(p.slice(1)) : from===p)),
    item('收件人包含', c.to, m.to, split(c.to).every(p=>to.includes(p))),
    item('主题正则', c.subj, m.subj, reTest(c.subj, m.subj)),
    item('正文正则', c.body, m.body, reTest(c.body, m.body)),
  ];
}
let attachState = null;
function attachMail(id){
  const m = inboundMail(id); if(!m) return;
  if(m.ruleId){ toast('这封邮件已挂规则，不能改挂','warn'); return; }
  const cases = MAIL_CASE_IDS.filter(c=>rulesOfCase(c).length);
  if(!cases.length){ toast('没有可挂的规则','warn'); return; }
  attachState = {id, caseId: cases.includes(mailCase) ? mailCase : cases[0], ruleId:''};
  attachState.ruleId = rulesOfCase(attachState.caseId)[0].id;
  openModal('挂规则 · '+esc(m.id), `
    <p class="small" style="margin:0 0 12px"><b>${esc(m.subj)}</b><span class="muted"> · ${esc(m.at)} · UID ${m.uid}</span></p>
    <h4 class="rule-sec">挂到规则<span class="tiny muted">下方逐项提示是否匹配，仅作提醒；挂上后不能改挂</span></h4>
    <div class="frm rule-frm">
      <div class="fld"><label>Case</label><select id="amCase">${cases.map(c=>`<option value="${c}" ${c===attachState.caseId?'selected':''}>${esc(caseLabel(c))}</option>`).join('')}</select></div>
      <div class="fld"><label>规则</label><select id="amRule"></select></div>
    </div>
    <div id="amPreview"></div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" id="amOk" onclick="confirmAttach()">挂上规则</button>`, 'wide');
  $('#amCase').onchange = e=>{ attachState.caseId = e.target.value; attachState.ruleId = rulesOfCase(attachState.caseId)[0].id; renderAttachPick(); };
  $('#amRule').onchange = e=>{ attachState.ruleId = e.target.value; renderAttachPick(); };
  renderAttachPick();
}
function renderAttachPick(){
  const m = inboundMail(attachState.id), r = State.rule(attachState.ruleId);
  $('#amRule').innerHTML = rulesOfCase(attachState.caseId).map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${esc(x.name)}（${esc(x.id)}）</option>`).join('');
  const c = classifyAtts(m, r), checks = critChecks(m, r);
  const okTag = ok => ok==='any' ? '<span class="tag">不限</span>' : ok===null ? '<span class="tag warn">规则正则无效</span>'
    : ok ? '<span class="tag ok">✓ 匹配</span>' : '<span class="tag dan">✕ 不匹配</span>';
  const matched = c.rows.flatMap(x=>x.files.map(f=>({f, a:x.a})));
  const lacking = c.rows.filter(x=>!x.files.length).map(x=>x.a);
  const bad = checks.filter(x=>x.ok===false||x.ok===null).map(x=>x.label);
  $('#amPreview').innerHTML = `
    <div class="am-sec"><div class="am-hd">基本信息</div>
      <table class="tbl am-check"><thead><tr><th>条件</th><th>规则</th><th>这封邮件</th><th>结果</th></tr></thead>
      <tbody>${checks.map(x=>`<tr class="${x.ok===false||x.ok===null?'miss':''}"><td class="small"><b>${x.label}</b></td>
        <td class="small">${x.cond?`<code>${esc(x.cond)}</code>`:'<span class="muted">（不限）</span>'}</td>
        <td class="small am-val" title="${esc(x.val)}">${esc(x.val)||'<span class="muted">（空）</span>'}</td><td>${okTag(x.ok)}</td></tr>`).join('')}</tbody></table></div>
    <div class="am-sec"><div class="am-hd">附件</div>
      <div class="am-atts">
        <div class="am-col ok"><div class="am-col-hd">匹配上规则的附件<span>${matched.length}</span></div>
          ${matched.map(x=>`<div class="am-item"><span class="am-name">${esc(x.f.name)}</span><span class="tag acc">${esc(x.a.role)}</span></div>`).join('')||'<div class="am-none">无</div>'}</div>
        <div class="am-col extra"><div class="am-col-hd">没匹配上规则的附件<span>${c.rest.length}</span></div>
          ${c.rest.map(n=>`<div class="am-item"><span class="am-name">${esc(n)}</span><span class="tiny muted">不归类</span></div>`).join('')||'<div class="am-none">无</div>'}</div>
        <div class="am-col lack"><div class="am-col-hd">规则要求、邮件里没有<span>${lacking.length}</span></div>
          ${lacking.map(a=>`<div class="am-item"><span class="tag acc">${esc(a.role)}</span><span class="${a.req?'dan-txt':'tiny muted'}">${a.req?'必需':'可选'}</span><code class="am-re">${esc(a.re)}</code></div>`).join('')||'<div class="am-none">无</div>'}</div>
      </div></div>
    ${bad.length||c.missing.length?`<div class="att-warn" role="alert">${bad.length?`${bad.map(esc).join('、')}不匹配。`:''}${c.missing.length?`缺少必需附件 ${c.missing.map(esc).join('、')}，后续建任务可能缺文件。`:''}确认是这条规则的邮件再挂上。</div>`:''}`;
  const warn = bad.length || c.missing.length;
  $('#amOk').textContent = warn ? '仍然挂上' : '挂上规则';
  $('#amOk').classList.toggle('danger', !!warn);
  $('#amOk').classList.toggle('primary', !warn);
}
function confirmAttach(){
  const m = inboundMail(attachState.id), r = State.rule(attachState.ruleId);
  if(!m || !r || m.ruleId) return;
  const c = classifyAtts(m, r);
  m.atts.forEach(f=>{ const row = c.rows.find(x=>x.files.includes(f)); f.code = row ? row.a.role : ''; });
  Object.assign(m, {ruleId:r.id, match:'MANUAL', matchedAt:now()});
  const bad = critChecks(m, r).filter(x=>x.ok===false||x.ok===null).map(x=>x.label);
  audit('邮件挂规则', `${m.id} → ${r.id}${bad.length?' · 不匹配 '+bad.join('、'):''}${c.missing.length?' · 缺 '+c.missing.join('、'):''}`, '邮件中心');
  State.save();
  closeModal();
  if(ruleCaseId(r)!==mailCase){ mailCase = ruleCaseId(r); syncMailUrl(); }
  toast(`已把 ${m.id} 挂到「${r.name}」，可以点「手动触发」建任务`,'ok');
  render();
}

/* ----- 手动触发：为挂上规则的邮件建任务（演示：沿用该任务类型的 BRD 样例，创建即完成） ----- */
function ruleTaskType(r){
  const line = ruleLine(r), biz = ruleCaseId(r);
  return CASE_FILTERS.find(c=>c.biz===biz && line.endsWith(c.mode)) || CASE_FILTERS.find(c=>c.biz===biz) || null;
}
function triggerMail(id){
  const m = inboundMail(id), r = m && mailRule(m); if(!r) return;
  if(m.taskId){ toast('这封邮件已经建过任务','warn'); return; }
  const type = ruleTaskType(r);
  openModal('手动触发', `<p class="small" style="margin:0">将按规则 <b>${esc(r.name)}</b>（${esc(r.id)}）为邮件 <b>${esc(m.id)}</b> 建一票 <b>${esc(type?type.label:'')}</b> 任务，建好后自动开始执行。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="doTriggerMail('${m.id}')">确认触发</button>`);
}
function doTriggerMail(id){
  closeModal();
  const m = inboundMail(id), r = m && mailRule(m), type = r && ruleTaskType(r);
  if(!type){ toast('找不到这条规则对应的任务类型','err'); return; }
  const t = createDemoTask(type, {rule:r.id, cause:`邮件手动触发 · ${m.id} · ${r.name}`,
    op:`任务创建 · 邮件 ${m.id} 挂规则 ${r.id} 后手动触发`, module:'邮件中心'});
  if(!t){ toast('该任务类型不支持手动触发','err'); return; }
  m.taskId = t.id;
  State.save();
  toast(`已为 ${m.id} 建任务 ${t.id}`,'ok');
  render();
}
document.addEventListener('DOMContentLoaded', render);
