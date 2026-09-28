/* ===== govern.js · 治理运营台 ===== */
let gQ = '';

function render(){
  const failed = State.tasks.filter(t=>t.st==='FAILED').length;
  const total = State.tasks.length;
  $('#view').innerHTML = `
  <div class="page-hd"><div><h2>治理运营台</h2><div class="sub">面向平台管理员 · 所有操作不可篡改留痕（M8）</div></div></div>
  <div class="kpis">
    <div class="kpi"><div class="n">58</div><div class="l">Airflow 今日 DAG 次数</div></div>
    <div class="kpi"><div class="n" style="color:var(--danger)">${total?(failed/total*100).toFixed(1):'0'}%</div><div class="l">任务失败率（本原型）</div><div class="t ${failed?'dn':'up'}">${failed} 个失败任务</div></div>
    <div class="kpi"><div class="n">42s</div><div class="l">调度延迟 P95</div></div>
    <div class="kpi"><div class="n">¥ 318</div><div class="l">今日模型调用成本</div><div class="t">94 次 · 白名单模型</div></div>
    <div class="kpi"><div class="n">${State.evidence.trigger.length+State.evidence.process.length+State.evidence.operation.length}</div><div class="l">证据总量</div><div class="t up">WORM 全量留痕</div></div>
  </div>
  <div class="grid" style="grid-template-columns:1.5fr 1fr">
    <div class="card" style="overflow:hidden">
      <div class="toolbar" style="font-weight:650">审计日志（共 ${State.audit.length} 条）
        <input class="search" style="margin-left:auto" id="gQ" placeholder="按操作人 / 动作 / 对象检索" value="${esc(gQ)}">
      </div>
      <div id="auditRows"></div>
    </div>
    <div>
      <div class="card card-p" style="margin-bottom:14px">
        <h3 style="font-size:14.5px;margin-bottom:12px">运行监控</h3>
        <div class="kv"><span class="k">Airflow scheduler</span><span class="v"><span class="tag ok">×2 双活</span></span></div>
        <div class="kv"><span class="k">Worker slot 饱和度</span><span class="v">62%</span></div>
        <div class="prog"><i style="width:62%"></i></div>
        <div class="kv" style="margin-top:10px"><span class="k">SQS 队列积压</span><span class="v">0 条</span></div>
        <div class="prog"><i style="width:2%"></i></div>
        <div class="kv" style="margin-top:10px"><span class="k">DLQ 死信</span><span class="v"><span class="tag ok">0</span></span></div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="toolbar" style="font-weight:650">模型调用与成本归集</div>
        <table class="tbl">
          <thead><tr><th>agent</th><th>版本</th><th>次数</th><th>成本</th></tr></thead>
          <tbody>
            <tr><td>dg-extractor</td><td><span class="tag">v1.3</span></td><td>31</td><td>¥126</td></tr>
            <tr><td>key-doc（多模态 W13）</td><td><span class="tag">v2.1</span></td><td>46</td><td>¥141</td></tr>
            <tr><td>asn-extractor</td><td><span class="tag">v1.1</span></td><td>12</td><td>¥38</td></tr>
            <tr><td>summary-writer</td><td><span class="tag">v0.9</span></td><td>5</td><td>¥13</td></tr>
          </tbody>
        </table>
        <div class="toolbar tiny muted" style="border-bottom:none;border-top:1px solid var(--line)">agent 按 id+version 锁定调用 · 全部记入 agent_run_id 审计</div>
      </div>
    </div>
  </div>`;
  $('#gQ').oninput = e=>{gQ=e.target.value;renderRows()};
  renderRows();
}
function renderRows(){
  const list = State.audit.filter(a=>!gQ || (a.tm+a.who+a.act+a.obj+a.src).toLowerCase().includes(gQ.toLowerCase()));
  $('#auditRows').innerHTML = `
  <table class="tbl">
    <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>入口</th></tr></thead>
    <tbody>
      ${list.map(a=>`<tr><td class="small muted">${a.tm}</td><td>${a.who}</td><td><span class="tag vio">${a.act}</span></td><td class="small">${esc(a.obj)}</td><td class="small muted">${a.src}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty"><div class="ei">∅</div>没有匹配的审计记录</div></td></tr>'}
    </tbody>
  </table>`;
}
document.addEventListener('DOMContentLoaded', render);
