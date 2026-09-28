/* ===== rules.js · 邮件中心（Case 1 通知邮件模板 · 收件人与内容可配置） ===== */

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

/* ===== 邮件监听（Case 1 不涉及监听：空列表，保留表头） ===== */
function renderMailMonitor(){
  return `<div class="center-sec">
    <h3 class="sec-title">邮件监听</h3>
    <div class="tblwrap center-table">
      <table class="tbl">
        <thead><tr><th>规则</th><th>监听邮箱</th><th style="text-align:center">优先级</th><th>绑定流程</th><th style="text-align:center">累计命中</th><th style="text-align:center">启用</th></tr></thead>
        <tbody><tr><td colspan="6"><div class="empty"><div class="ei">∅</div>暂无邮件监听规则</div></td></tr></tbody>
      </table>
    </div>
  </div>`;
}

/* ===== Case 1 邮件模板（BRD「七、发送邮件通知」· 收件人与内容可配置） ===== */
const TPL_SAMPLE_ROWS=[
  ['2026/09/22','South 3PL','DEMO-A001','DGR','—','Y','Y','—','2026/09/23'],
  ['2026/09/23','West 3PL','DEMO-A002','DGR','—','N','N_ Not required','Not found shippers_Decl','2026/09/23'],
];
function mailTplC1(){ return State.mailTemplates.find(t=>t.caseId==='case-1'); }
function renderMailTemplate(){
  const tpl=mailTplC1(); if(!tpl) return '';
  const recv=tpl.recipients||[];
  const toLine=recv.length
    ?recv.map(m=>esc(m)).join('； ')+` <span class="muted">（共 ${recv.length} 人）</span>`
    :'<span class="muted">尚未配置，点击「编辑邮件模板」从 IO 邮箱清单选择</span>';
  return `<div class="center-sec">
    <h3 class="sec-title">邮件模板</h3>
    <section class="card card-p">
    <div class="page-hd" style="margin-bottom:12px">
      <div><h3 class="tpl-name">Case 1 · 危险品托运清单上传状态通知</h3></div>
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
  openModal('编辑邮件模板 · Case 1 · 危险品托运清单', `
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
  audit('更新邮件模板', `Case 1 · 收件人 ${recv.length} 人`, '邮件中心');
  State.save();
  closeModal();
  toast('邮件模板已保存（本地演示）','ok');
  render();
}

function renderSentWorkbenchMail(){
  const rows=workbenchRows(HOME_MAILS,sentMailFilter);
  $('#view').innerHTML=`<div class="page-hd"><div><h2>邮件中心</h2><div class="sub">Case 1 · 已发送邮件 · 模拟记录，未实际外发</div></div><a class="btn" href="rules.html">返回邮件中心</a></div>${workbenchScopeBanner(sentMailFilter)}<div class="tblwrap"><div class="toolbar"><b>已发送</b><span class="tag">${rows.length} 封</span></div><table class="tbl"><thead><tr><th>邮件编号</th><th>主题</th><th>运输方式</th><th>发送日期</th><th>状态</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(m.id)}</td><td>托运清单上传状态通知（模拟）</td><td>${m.mode==='air'?'空运':'海运'}</td><td>${esc(m.date)}</td><td><span class="tag ok">已发送（模拟）</span></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">当前范围暂无已发送邮件</div></td></tr>'}</tbody></table></div>`;
}
document.addEventListener('DOMContentLoaded', render);
