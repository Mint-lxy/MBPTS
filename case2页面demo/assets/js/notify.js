/* ===== notify.js · 提醒中心 ===== */

function render(){
  const unread = State.notify.filter(n=>!n.read).length;
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>提醒中心</h2><div class="sub">未读 ${unread} 条 · 任务异常自动生成站内提醒（M7）</div></div>
    <div style="display:flex;gap:9px">
      <button class="btn" onclick="markAll()">全部已读</button>
      <button class="btn" onclick="mailAudit()">外发审计</button>
      <button class="btn primary" onclick="location.href='rules.html'">邮件模板管理</button>
    </div>
  </div>
  <div class="card" style="overflow:hidden">
    ${State.notify.map((n,i)=>`
    <div class="ntf ${n.read?'':'unread'}" onclick="openNtf(${i})">
      <div class="ni ${n.ic}">${n.sym}</div>
      <div style="flex:1;min-width:0"><div class="nt">${esc(n.t)}</div><div class="nx">${esc(n.x)}</div></div>
      <span class="tm">${n.tm}</span>
    </div>`).join('') || '<div class="empty"><div class="ei">✓</div>没有消息</div>'}
  </div>`;
}
function openNtf(i){
  const n = State.notify[i];
  n.read = true; State.save();
  if(n.link){ location.href = n.link; return; }
  render();
}
function markAll(){
  State.notify.forEach(n=>n.read=true);
  State.save(); render();
  toast('已全部标为已读','ok');
}
function mailAudit(){
  openModal('外发邮件审计', `
    <table class="tbl"><thead><tr><th>邮件编号</th><th>主题</th><th>运输方式</th><th>发送日期</th><th>状态</th></tr></thead><tbody>
      ${HOME_MAILS.map(m=>`<tr><td class="small">${esc(m.id)}</td><td>托运清单上传状态通知（模拟）</td><td class="small">${m.mode==='air'?'空运':'海运'}</td><td class="small">${esc(m.date)}</td><td><span class="tag ok">已发送（模拟）</span></td></tr>`).join('')}
    </tbody></table>
    <p class="tiny muted" style="margin-top:10px">Case 1 运行结果通知 · 收件人为 IO 同事（可在邮件中心配置）· 演示记录，未实际外发</p>`,
    `<button class="btn primary" onclick="closeModal()">关闭</button>`);
}
document.addEventListener('DOMContentLoaded', render);
