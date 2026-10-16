/* ===== notify.js · 提醒中心 ===== */

function render(){
  const unread = State.notify.filter(n=>!n.read).length;
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>提醒中心</h2><div class="sub">未读 ${unread} 条 · 任务异常自动生成站内提醒（M7）</div></div>
    <div style="display:flex;gap:9px">
      <button class="btn" onclick="markAll()">全部已读</button>
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
document.addEventListener('DOMContentLoaded', render);
