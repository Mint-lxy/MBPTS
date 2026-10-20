/* ===== rules.js · 邮件中心（全权限版：右上角 Case 下拉，一次看一个 Case；页签 邮件监听 / 邮件模板 / 邮件日志） =====
 * 邮件监听、邮件模板沿用全权限版原有内容；邮件日志取自开发侧整体理解 demo（数据见 inbound-mails.js）。
 * 邮件日志分「收到的邮件」和「已发送的邮件」：未命中规则的邮件可手动挂到某条规则，再点「手动触发」建任务；已挂规则的邮件不能改挂。
 */
const MAIL_CASE_IDS = UC34_CASES.filter(c=>ALLOWED_CASE_IDS.includes(c.id)).map(c=>c.id);
let mailCase = MAIL_CASE_IDS.includes(qp('case')) ? qp('case') : MAIL_CASE_IDS[0];
const MAIL_TABS = [{k:'watch', t:'邮件监听'}, {k:'tpl', t:'邮件模板'}, {k:'log', t:'邮件日志'}];
let mailTab = MAIL_TABS.some(x=>x.k===qp('tab')) ? qp('tab') : 'watch';
function syncMailUrl(){ history.replaceState(null,'', `?case=${mailCase}&tab=${mailTab}`); }

function render(){
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>邮件中心</h2><div class="sub">按 Case 管理邮件监听、邮件模板，查看公邮收发的邮件。</div></div>
    <label class="home-case-pick">Case
      <select class="pick" id="mailCasePick">${MAIL_CASE_IDS.map(id=>`<option value="${id}" ${mailCase===id?'selected':''}>${esc(caseLabel(id))}</option>`).join('')}</select>
    </label>
  </div>
  <div class="seg mail-tabs" role="tablist">${MAIL_TABS.map(x=>`<button role="tab" aria-selected="${mailTab===x.k}" class="${mailTab===x.k?'on':''}" data-tab="${x.k}">${x.t}</button>`).join('')}</div>
  ${mailTab==='watch' ? renderMailMonitor() : mailTab==='tpl' ? renderMailTemplates() : renderMailLog()}`;
  $('#mailCasePick').onchange = e=>{ mailCase = e.target.value; logFilter.page = 1; sentFilter.page = 1; syncMailUrl(); render(); };
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ mailTab = b.dataset.tab; syncMailUrl(); render(); });
  if(mailTab==='log') bindMailLog();
}

/* ==================== 邮件监听：一张表，只列当前 Case 的规则；「关联」显示任务中心的子 Case 名称 ==================== */
/* 规则所属子 Case：按绑定流程推导线路，Case1 不区分空运 / 海运 */
function ruleCase(r){
  const g = CASE_LINES.find(x=>x.line===ruleLine(r)); if(!g) return null;
  const mode = g.line.replace(/^case\d-/,'');
  return CASE_FILTERS.find(c=>c.caseId===g.caseId && (g.caseId==='case-1'||c.mode===mode)) || null;
}
/* 规则所属 Case（按线路） */
function ruleCaseId(r){ const g = CASE_LINES.find(x=>x.line===ruleLine(r)); return g ? g.caseId : ''; }
function renderMailMonitor(){
  const order = c=>c?CASE_FILTERS.indexOf(c):99;
  const rs = State.rules.filter(r=>ruleCaseId(r)===mailCase).sort((a,b)=>order(ruleCase(a))-order(ruleCase(b))||a.prio-b.prio);
  const on = rs.filter(r=>r.on).length;
  return `<div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">邮件监听</h3>
        <p class="sec-sub">自定义筛选条件 → 附件角色录入 → 流程绑定 · 共 ${rs.length} 条规则，${on} 条启用</p></div>
      ${CASE_LINES.some(g=>g.caseId===mailCase&&(g.flows||[]).length)?`<button class="btn primary" onclick="location.href='rule-edit.html?case=${mailCase}'">+ 新建规则</button>`:''}
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>规则</th><th>发件人白名单</th><th>关联</th><th style="text-align:center;white-space:nowrap">累计命中</th><th style="text-align:center">启用</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(watchRow).join('')
          : '<tr><td colspan="6"><div class="empty"><div class="ei">∅</div>该 Case 没有邮件监听规则</div></td></tr>'}</tbody>
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

/* ==================== 邮件模板：当前 Case 的模板（三个 Case 用同一套模板配置） ====================
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
  const tpl = tplOf(mailCase);
  return `<div class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">邮件模板</h3>
      <p class="sec-sub">流程结束后对外发送的通知邮件，配置收件人与正文 · 本原型不实际外发</p></div></div>
    ${tpl?renderTpl(tpl):`<div class="card center-empty"><p>该 Case 的运行结果不对外发送通知邮件（BRD 未要求），这里不需要配置。</p></div>`}
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
        !m.ruleId ? `<button class="btn sm primary" onclick="attachMail('${m.id}')">处理</button>`
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
  const act = !m.ruleId ? `<button class="btn primary" onclick="attachMail('${m.id}')">处理</button>`
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
function ruleTaskType(r){ return ruleCase(r) || CASE_FILTERS.find(c=>c.caseId===ruleCaseId(r)) || null; }
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
  const t = createDemoTask(type, {src:'手动触发', rule:r.id, cause:`邮件手动触发 · ${m.id} · ${r.name}`,
    op:`任务创建 · 邮件 ${m.id} 挂规则 ${r.id} 后手动触发`, module:'邮件中心'});
  if(!t){ toast('该任务类型不支持手动触发','err'); return; }
  m.taskId = t.id;
  State.save();
  toast(`已为 ${m.id} 建任务 ${t.id}`,'ok');
  render();
}
document.addEventListener('DOMContentLoaded', render);
