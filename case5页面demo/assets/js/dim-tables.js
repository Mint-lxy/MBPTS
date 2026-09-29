/* ===== dim-tables.js · 数据维度表 =====
 * 用户上传 Excel → 平台自动转换为 Markdown → Airflow 任务引用最新版本。
 * 逻辑由原证据中心「手工维度表」tab 独立成页迁移而来。
 */
let dimQ = '';

/* ===== Markdown 表格解析（Excel → md 呈现） ===== */
function mdTable(md){
  if(!md) return '<div class="empty"><div class="ei">—</div>暂无内容</div>';
  const lines = md.split('\n').filter(l=>l.trim());
  if(lines.length<2) return '<pre class="md-raw">'+esc(md)+'</pre>';
  const parse = l => l.split('|').map(c=>c.trim()).filter((_,i,a)=>i>0&&i<a.length);
  const hdr = parse(lines[0]);
  const rows = lines.slice(2).map(parse);
  return '<div class="md-tbl-wrap"><table class="tbl md-tbl"><thead><tr>'
    +hdr.map(h=>'<th>'+esc(h)+'</th>').join('')
    +'</tr></thead><tbody>'
    +rows.map(r=>'<tr>'+r.map(c=>'<td>'+(c.startsWith('_')?'<span class="muted">'+esc(c.replace(/^_|_$/g,''))+'</span>':esc(c))+'</td>').join('')+'</tr>').join('')
    +'</tbody></table></div>';
}

/* ===== 上传中心（Case5）=====
 * 系统无法自动取得、必须人工补充的数据从这里进入平台，提交后回到原任务整单重跑 / 等待下一次运行。
 * 入口按子 Case 分组（与配置中心同一写法），每个入口一行，右侧操作。
 */
const UPLOAD_ENTRIES = [
  {id:'invoice', line:'xentry', name:'进口发票补传', btn:'上传发票',
   desc:'按 AWB No. 查询系统库查不到对应进口发票时，上传该票发票；ASN Number 取 Our delivery note number，Shipment Date 取 Document date。',
   accept:'PDF · 单个文件 · 不超过 20 MB'},
  {id:'receipt', line:'xentry', name:'手工收货记录录入', btn:'录入收货',
   desc:'BU 线下手工收货后，录入 PO 号、Part No.、线下已收货数量；自动收货按「从第一行 Item 顺次收货」扣减剩余。',
   accept:'PO 号 + Part No. + 线下已收货数量'},
  {id:'idno', line:'xentry', name:'录入 ID No.', btn:'录入 ID No.',
   desc:'诊断仪大表 MBPTS PO 为空时流程阻断；PO 补上后在此录入 ID No.，流程等下一次运行继续。',
   accept:'ID No.（诊断仪大表 J 列）'},
];
const UPLOAD_KIND = {invoice:'进口发票补传', receipt:'手工收货录入', idno:'录入 ID No.'};
let upFilter = {kind:'all', q:''};
let upPicked = null;
function resetCenterFilters(){ dimQ=''; upFilter={kind:'all', q:''}; }
function upNow(){ const d=new Date(),p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function upList(){ return State.data.uploads || (State.data.uploads = []); }
function upReceipts(){ return State.data.receipts || (State.data.receipts = []); }
function upPoLines(){ return State.data.poLines || []; }
/* 待处理：需要该入口补充数据、且尚未提交的任务 */
function upPending(kind){ return State.tasks.filter(t=>taskMatch(t) && t.need===kind && !t.supplied); }
function upTaskLabel(t){ return `${t.id} · AWB ${t.waybill}`; }

function render(){
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>上传中心</h2><div class="sub">系统无法自动取得的数据从这里补充，提交后回到原任务继续流程。</div></div>
  </div>
  ${centerContext()}
  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">需要人工补充的数据</h3>
        <p class="sec-sub">共 ${UPLOAD_ENTRIES.length} 个入口 · ${UPLOAD_ENTRIES.reduce((n,e)=>n+upPending(e.id).length,0)} 票任务等待补充</p></div>
    </div>
    ${visibleCaseLines().map(renderUpCase).join('')}
  </div>
  <div class="center-sec">
    <div class="sec-head"><div><h3 class="sec-title">提交记录</h3><p class="sec-sub">本地演示记录，仅保存在当前浏览器</p></div></div>
    <div class="tblwrap">
      <div class="toolbar">
        <div class="chips">${[['all','全部'],['invoice','进口发票补传'],['receipt','手工收货录入'],['idno','录入 ID No.']].map(([k,l])=>`<button class="chip ${upFilter.kind===k?'on':''}" data-upk="${k}">${l}</button>`).join('')}</div>
        <input class="search" id="upQ" aria-label="搜索提交记录" placeholder="搜索任务编号 / AWB / PO 号 / Part No. / 文件名" value="${esc(upFilter.q)}">
        <span class="tiny muted" style="margin-left:auto" id="upCount"></span>
      </div>
      <div id="upRows"></div>
    </div>
  </div>`;
  document.querySelectorAll('[data-upk]').forEach(c=>c.onclick=()=>{upFilter.kind=c.dataset.upk;render()});
  $('#upQ').oninput = e=>{upFilter.q=e.target.value;renderUpRows()};
  renderUpRows();
}
function renderUpCase(g){
  const rs = UPLOAD_ENTRIES.filter(e=>e.line===g.line);
  return `<section class="case-group">
    <div class="case-group-hd"><h4>${esc(g.label)}</h4><span>${rs.length} 个入口</span></div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>入口</th><th>提交内容</th><th>待处理任务</th><th>最近提交</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(upEntryRow).join('')
          : '<tr><td colspan="5"><div class="empty"><div class="ei">∅</div>这条线路的数据均由系统自动获取，无需人工补充</div></td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function upEntryRow(e){
  const pend = e.id==='receipt' ? null : upPending(e.id);
  const last = upList().filter(u=>u.kind===e.id).sort((a,b)=>b.time.localeCompare(a.time))[0];
  return `<tr>
    <td style="max-width:460px"><b>${esc(e.name)}</b><div class="tiny muted">${esc(e.desc)}</div></td>
    <td class="small">${esc(e.accept)}</td>
    <td>${pend===null?'<span class="muted small">—</span>'
      : pend.length?`<span class="tag warn">${pend.length} 票待处理</span>${pend.map(t=>`<div class="tiny"><a href="task-detail.html?id=${encodeURIComponent(t.id)}">${esc(upTaskLabel(t))}</a></div>`).join('')}`
      : '<span class="tag ok">无</span>'}</td>
    <td class="small muted">${last?esc(last.time):'—'}</td>
    <td style="text-align:right;white-space:nowrap">
      ${e.id==='receipt'?'<button class="btn sm" onclick="upReceiptDrawer()">收货记录</button> ':''}<button class="btn sm primary" onclick="upOpen('${e.id}')">${esc(e.btn)}</button>
    </td>
  </tr>`;
}
function renderUpRows(){
  const q = upFilter.q.trim().toLowerCase();
  const list = upList().filter(u=>(upFilter.kind==='all'||u.kind===upFilter.kind) && (!q||(u.content+' '+(u.task||'')+' '+(u.awb||'')).toLowerCase().includes(q)))
    .slice().sort((a,b)=>b.time.localeCompare(a.time));
  $('#upRows').innerHTML = `<table class="tbl">
    <thead><tr><th>提交时间</th><th>入口</th><th>提交内容</th><th>关联任务</th><th>操作人</th><th>处理结果</th></tr></thead>
    <tbody>${list.map(u=>`<tr>
      <td class="small muted">${esc(u.time)}</td>
      <td><span class="tag">${esc(UPLOAD_KIND[u.kind]||u.kind)}</span></td>
      <td class="small">${esc(u.content)}</td>
      <td class="small">${u.task?`<a href="task-detail.html?id=${encodeURIComponent(u.task)}">${esc(u.task)}</a>`:'<span class="muted">—</span>'}</td>
      <td class="small">${esc(u.by)}</td>
      <td class="small muted">${esc(u.result)}</td>
    </tr>`).join('')||'<tr><td colspan="6"><div class="empty"><div class="ei">∅</div>没有匹配的提交记录</div></td></tr>'}</tbody></table>`;
  $('#upCount').textContent = `${list.length} / ${upList().length} 条`;
}

/* ---------- 入口弹窗 ---------- */
function upTaskSelect(kind, taskId){
  const pend = upPending(kind);
  if(!pend.length) return `<p class="small muted" style="margin:0 0 12px">当前没有等待${esc(UPLOAD_KIND[kind])}的任务。</p>`;
  return `<div class="fld" style="margin-bottom:13px"><label>关联任务</label>
    <select class="pick" style="width:100%" id="upTask">${pend.map(t=>`<option value="${esc(t.id)}" ${t.id===taskId?'selected':''}>${esc(upTaskLabel(t))}</option>`).join('')}</select></div>`;
}
function upOpen(kind, taskId){
  upPicked = null;
  if(kind==='invoice'){
    const hasTask = upPending('invoice').length>0;
    openModal('进口发票补传', `
      ${upTaskSelect('invoice', taskId)}
      <div class="drop" id="upDrop" role="button" tabindex="0">拖拽发票 PDF 到此处，或点击选择文件<br>
        <span class="tiny">PDF · 单个文件 · 不超过 20 MB · 建议以 AWB No. 命名，如 447033505062.pdf</span>
        <input type="file" id="upFile" class="hidden" accept=".pdf"></div>
      <div id="upFileList"></div>
      <p class="consignment-error hidden" id="upErr" role="alert"></p>`,
      `<button class="btn" onclick="closeModal()">取消</button>
       <button class="btn primary" id="upGo" disabled onclick="upSubmitInvoice()">上传发票</button>`);
    const dz=$('#upDrop'), fi=$('#upFile');
    dz.onclick=()=>fi.click(); dz.onkeydown=e=>{ if(e.key==='Enter') fi.click(); };
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('ov')}; dz.ondragleave=()=>dz.classList.remove('ov');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('ov');upPickFile(e.dataTransfer.files[0], hasTask)};
    fi.onchange=()=>upPickFile(fi.files[0], hasTask);
    return;
  }
  if(kind==='idno'){
    openModal('录入 ID No.', `
      ${upTaskSelect('idno', taskId)}
      <div class="fld" style="margin-bottom:6px"><label>ID No.（诊断仪大表 J 列）</label>
        <input id="upIdNo" inputmode="numeric" maxlength="8" placeholder="如 32883" autocomplete="off"></div>
      <p class="tiny muted" style="margin:0 0 8px" id="upIdHint"></p>
      <p class="consignment-error hidden" id="upErr" role="alert"></p>`,
      `<button class="btn" onclick="closeModal()">取消</button>
       <button class="btn primary" ${upPending('idno').length?'':'disabled'} onclick="upSubmitIdNo()">录入 ID No.</button>`);
    const hint=()=>{ const t=State.task(($('#upTask')||{}).value); const h=$('#upIdHint'); if(h) h.textContent=t?`当前 ID No.：${(XENTRY_CASES[t.waybill]||{}).id||'—'}（顶部灰色区无对应 MBPTS PO）`:''; };
    if($('#upTask')) $('#upTask').onchange=hint;
    hint();
    return;
  }
  const pos=[...new Set(upPoLines().map(l=>l.po))];
  openModal('手工收货记录录入', `
    <div class="fld" style="margin-bottom:13px"><label>PO 号</label>
      <input id="upPo" list="upPoList" inputmode="numeric" maxlength="10" placeholder="10 位数字，如 5600321645" autocomplete="off">
      <datalist id="upPoList">${pos.map(p=>`<option value="${esc(p)}">`).join('')}</datalist></div>
    <div class="fld" style="margin-bottom:13px"><label>Part No.</label>
      <input id="upPn" list="upPnList" maxlength="20" placeholder="如 QALCNSD26KIT501" autocomplete="off">
      <datalist id="upPnList"></datalist></div>
    <div class="fld" style="margin-bottom:6px"><label>线下已收货数量（PC）</label>
      <input id="upQty" type="number" min="1" max="99999" step="1" placeholder="正整数"></div>
    <p class="tiny muted" style="margin:0 0 8px" id="upPoHint"></p>
    <p class="consignment-error hidden" id="upErr" role="alert"></p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="upSubmitReceipt()">录入收货</button>`);
  const sync=()=>{
    const po=$('#upPo').value.trim(), lines=upPoLines().filter(l=>l.po===po);
    $('#upPnList').innerHTML=[...new Set(lines.map(l=>l.pn))].map(p=>`<option value="${esc(p)}">`).join('');
    $('#upPoHint').textContent=lines.length?`该 PO 来自 IMS 邮件「${lines[0].mail}」，共 ${lines.length} 个 Item`:'';
  };
  $('#upPo').oninput=sync;
}
function upErr(msg){ const e=$('#upErr'); if(!e) return; e.textContent=msg; e.classList.toggle('hidden',!msg); }
function upPickFile(f, hasTask){
  upErr(''); upPicked=null;
  if(!f) return;
  if(!/\.pdf$/i.test(f.name)){ upErr(`进口发票需要 PDF 文件，当前选择的是「${f.name}」。`); return; }
  if(!f.size){ upErr('文件为空，请重新选择。'); return; }
  if(f.size>20*1024*1024){ upErr('文件超过 20 MB，请压缩后重新上传。'); return; }
  upPicked={name:f.name, size:f.size};
  $('#upFileList').innerHTML=`<div class="file-it"><span>📄</span><span style="font-weight:600">${esc(f.name)}</span><span class="fs">${Math.max(1,Math.round(f.size/1024))} KB</span></div>`;
  $('#upGo').disabled=!hasTask;
}
function upLink(t, kind, text, content, result){
  const time=upNow();
  t.supplied={kind, text, time};
  t.ops.unshift({tm:now(), txt:`上传中心 · ${UPLOAD_KIND[kind]}：${text}`});
  addEvidence('trigger', t.id, t.uc, `上传中心 · ${UPLOAD_KIND[kind]}：${text}（erxiao）`);
  audit(UPLOAD_KIND[kind], `${t.id} · ${text}`, '上传中心');
  upList().unshift({id:'UP-'+String(upList().length+1).padStart(4,'0'), kind, time, content, task:t.id, awb:t.waybill, by:'erxiao', result});
  State.save();
  upDone(t, `${UPLOAD_KIND[kind]}已提交：${text}`);
}
function upDone(t, msg){
  toast(msg,'ok');
  render();
  if(t){
    openModal('提交成功', `<p class="small">${esc(msg)}，已关联任务 <b>${esc(t.id)}</b>。回到任务点「上传文件/整单重跑」即可继续流程。</p>`,
      `<button class="btn" onclick="closeModal()">继续上传</button>
       <button class="btn primary" onclick="location.href='task-detail.html?id=${encodeURIComponent(t.id)}'">返回任务</button>`);
  } else closeModal();
}
function upSubmitInvoice(){
  const t=State.task(($('#upTask')||{}).value);
  if(!t){ upErr('请选择关联任务。'); return; }
  if(!upPicked){ upErr('请先选择进口发票 PDF。'); return; }
  upLink(t,'invoice',upPicked.name,`${upPicked.name}（${Math.max(1,Math.round(upPicked.size/1024))} KB）`,'已关联任务，整单重跑时按该发票取 ASN Number / Shipment Date');
}
function upSubmitIdNo(){
  const t=State.task(($('#upTask')||{}).value);
  const v=($('#upIdNo').value||'').trim();
  if(!t){ upErr('请选择关联任务。'); return; }
  if(!/^\d{4,8}$/.test(v)){ upErr('ID No. 为 4~8 位数字，请核对诊断仪大表 J 列。'); return; }
  const run=latestRun(t), f=run&&(run.fields||[]).find(x=>/^ID No\./.test(x.k));
  if(f && f.v===v){ upErr(`ID No. ${v} 与当前值相同，请录入 PO 补上后的 ID No.`); return; }
  const old=f?f.v:'';
  if(f){ f.delta={old:f.v, tm:now(), runNo:run.no}; f.v=v; }
  upLink(t,'idno','ID No. '+v,`AWB ${t.waybill} · ID No. ${old?old+' → ':''}${v}`,'已写入当前生效值，等待下一次运行继续流程');
}
function upSubmitReceipt(){
  const po=$('#upPo').value.trim(), pn=$('#upPn').value.trim().toUpperCase(), qty=Number($('#upQty').value);
  if(!/^\d{10}$/.test(po)){ upErr('PO 号为 10 位数字。'); return; }
  if(!/^[A-Z0-9]{5,20}$/.test(pn)){ upErr('Part No. 为 5~20 位字母或数字。'); return; }
  if(!Number.isInteger(qty)||qty<1||qty>99999){ upErr('线下已收货数量须为 1~99999 的整数。'); return; }
  const time=upNow();
  upReceipts().push({id:'GR-M-'+String(upReceipts().length+1).padStart(4,'0'), src:'manual', by:'erxiao', po, item:'', pn, qty, time});
  upList().unshift({id:'UP-'+String(upList().length+1).padStart(4,'0'), kind:'receipt', time, content:`PO ${po} · ${pn} · ${qty} PC`, task:'', by:'erxiao', result:'已记入收货记录（手工）'});
  audit('手工收货录入', `PO ${po} · ${pn} · ${qty} PC`, '上传中心');
  State.save();
  upDone(null, `已录入手工收货：PO ${po} · ${pn} · ${qty} PC`);
}

/* ---------- 收货记录（自动 + 手工合并 · 按 PO / Part No. 搜索 · 每 PO 已收 / 剩余） ---------- */
let rcvQ='';
function upPoSummary(po){
  const lines=upPoLines().filter(l=>l.po===po).map(l=>({...l,rpa:0,manual:0}));
  const recs=upReceipts().filter(r=>r.po===po);
  recs.filter(r=>r.src==='rpa').forEach(r=>{ const l=lines.find(x=>x.item===r.item&&x.pn===r.pn); if(l) l.rpa+=r.qty; });
  const pool={};
  recs.filter(r=>r.src==='manual').forEach(r=>{ pool[r.pn]=(pool[r.pn]||0)+r.qty; });
  Object.keys(pool).forEach(pn=>{ let left=pool[pn]; lines.filter(l=>l.pn===pn).forEach(l=>{ const take=Math.max(0,Math.min(left,l.qty-l.rpa)); l.manual+=take; left-=take; }); });
  lines.forEach(l=>{ l.left=l.qty-l.rpa-l.manual; });
  return lines;
}
function upReceiptDrawer(){
  openDrawer('收货记录', `
    <input class="search" id="rcvQ" style="width:100%;margin-bottom:12px" aria-label="按 PO 号或 Part No. 搜索" placeholder="按 PO 号 / Part No. 搜索" value="${esc(rcvQ)}">
    <div id="rcvBody"></div>
    <p class="center-note">手工收货只录入 PO 号、Part No.、线下已收货数量（无 Item），按「从第一行的 Item No 及 Quantity 顺次收货」计入各 Item。</p>`);
  $('#rcvQ').oninput=e=>{rcvQ=e.target.value;upRcvBody()};
  upRcvBody();
}
function upRcvBody(){
  const q=rcvQ.trim().toLowerCase(), hit=(po,pn)=>!q||po.toLowerCase().includes(q)||pn.toLowerCase().includes(q);
  const recs=upReceipts().filter(r=>hit(r.po,r.pn)).slice().sort((a,b)=>b.time.localeCompare(a.time));
  const pos=[...new Set(upPoLines().filter(l=>hit(l.po,l.pn)).map(l=>l.po).concat(recs.map(r=>r.po)))];
  $('#rcvBody').innerHTML=`
    <div class="sec-lab">自动收货与手工收货记录（${recs.length} 条）</div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>收货时间</th><th>来源</th><th>PO 号</th><th>Item</th><th>Part No.</th><th style="text-align:right">数量</th></tr></thead>
      <tbody>${recs.map(r=>`<tr><td class="small muted">${esc(r.time)}</td><td>${r.src==='rpa'?'<span class="tag blue">RPA</span>':`<span class="tag gold">手工 · ${esc(r.by)}</span>`}</td><td class="small">${esc(r.po)}</td><td class="small">${esc(r.item||'—')}</td><td class="small">${esc(r.pn)}</td><td style="text-align:right"><b>${r.qty}</b></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">没有匹配的收货记录</div></td></tr>'}</tbody></table></div>
    ${pos.map(po=>{ const ls=upPoSummary(po); if(!ls.length) return ''; const sum=k=>ls.reduce((a,l)=>a+l[k],0);
      return `<div class="sec-lab">PO ${esc(po)} · 已收 ${sum('rpa')+sum('manual')} / 订购 ${sum('qty')} · 剩余 ${sum('left')} PC</div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Item</th><th>Part No.</th><th style="text-align:right">订购</th><th style="text-align:right">RPA 已收</th><th style="text-align:right">手工已收</th><th style="text-align:right">剩余</th></tr></thead>
        <tbody>${ls.map(l=>`<tr><td class="small">${esc(l.item)}</td><td class="small">${esc(l.pn)}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">${l.rpa||'—'}</td><td style="text-align:right">${l.manual||'—'}</td><td style="text-align:right"><b>${l.left}</b></td></tr>`).join('')}</tbody></table></div>`; }).join('')}`;
}

/* ===== 维度表列表 ===== */
function renderDimTables(){
  const list = State.dimTables.filter(d=>
    !dimQ || (d.id+d.name+d.title+d.desc+d.usedBy.join(',')).toLowerCase().includes(dimQ.toLowerCase()));
  $('#dimTable').innerHTML = `
  <div class="dim-hd">
    <div><span class="small muted">用户上传 Excel → 平台自动转换为 Markdown → Airflow 任务引用最新版本</span></div>
    <button class="btn primary" onclick="dimUploadNew()">+ 上传新维度表</button>
  </div>
  ${list.length ? list.map(d=>{
    const cur = d.versions[0];
    return `<div class="dim-card card">
      <div class="dim-card-hd">
        <div class="dim-card-left">
          <h3 class="dim-title">\ud83d\udcca ${esc(d.title)}</h3>
          <div class="small muted">${esc(d.desc)}</div>
          <div class="dim-meta">
            <span class="tag">v${cur.ver}</span>
            ${cur.rows?'<span class="small muted">'+cur.rows+' \u884c \u00d7 '+cur.cols+' \u5217</span>':'<span class="small muted">\u6a21\u677f</span>'}
            <span class="small muted">${cur.time} \u00b7 ${cur.by}</span>
          </div>
        </div>
        <div class="dim-card-acts">
          <button class="btn sm" onclick="dimPreview('${d.id}')">\ud83d\udc41 \u67e5\u770b Markdown</button>
          <button class="btn sm" onclick="dimUpload('${d.id}')">\u2912 \u4e0a\u4f20\u65b0\u7248\u672c</button>
        </div>
      </div>
      <div class="dim-refs">
        <span class="tiny muted" style="margin-right:6px">\u5f15\u7528\u573a\u666f\uff1a</span>
        ${d.usedBy.map(c=>'<span class="tag">'+esc(c)+'</span>').join('')}
        <span class="dim-af tiny muted" style="margin-left:auto">Airflow param: <code>${esc(d.airflowParam)}</code></span>
      </div>
      <div class="dim-ver-toggle tiny muted" style="cursor:pointer" onclick="toggleDimVer('${d.id}',this)">\u5386\u53f2\u7248\u672c (${d.versions.length}) \u25bc</div>
      <div class="dim-ver-list" id="dim-ver-${d.id}" style="display:none">
        ${d.versions.map(v=>`<div class="dim-ver-row${v.ver===cur.ver?' on':''}">
          <span class="tag${v.ver===cur.ver?' acc':''}">v${v.ver}${v.ver===cur.ver?' \u5f53\u524d':''}</span>
          <span class="small">${esc(v.file)}</span>
          ${v.rows?'<span class="small muted">'+v.rows+'\u884c</span>':''}
          <span class="small muted">${v.time}</span>
          <span class="small muted">${v.by}</span>
          <button class="btn sm ghost" onclick="dimPreview('${d.id}',${v.ver})" style="margin-left:auto">\u67e5\u770b</button>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('') : '<div class="empty"><div class="ei">\u2205</div>\u6ca1\u6709\u5339\u914d\u7684\u7ef4\u5ea6\u8868</div>'}`;
}

function toggleDimVer(id, el){
  const list = $('#dim-ver-'+id);
  if(!list) return;
  const open = list.style.display!=='none';
  list.style.display = open?'none':'block';
  el.textContent = open ? '\u5386\u53f2\u7248\u672c ('+State.dimTables.find(d=>d.id===id).versions.length+') \u25bc'
                        : '\u6536\u8d77\u5386\u53f2\u7248\u672c \u25b2';
}

function dimPreview(id, ver){
  const d = State.dimTables.find(x=>x.id===id);
  if(!d) return;
  const v = ver ? d.versions.find(x=>x.ver===ver) : d.versions[0];
  const isLatest = !ver || ver===d.versions[0].ver;
  openDrawer(`${d.title} · v${v.ver}${isLatest?' \uff08\u5f53\u524d\uff09':''}`, `
    <div class="kv"><span class="k">\u6587\u4ef6\u540d</span><span class="v">${esc(v.file)}</span></div>
    <div class="kv"><span class="k">\u4e0a\u4f20\u65f6\u95f4</span><span class="v">${v.time}</span></div>
    <div class="kv"><span class="k">\u4e0a\u4f20\u4eba</span><span class="v">${v.by}</span></div>
    ${v.rows?'<div class="kv"><span class="k">\u89c4\u6a21</span><span class="v">'+v.rows+' \u884c \u00d7 '+v.cols+' \u5217</span></div>':''}
    <div class="kv"><span class="k">Airflow param</span><span class="v"><code>${esc(d.airflowParam)}</code></span></div>
    <div class="kv"><span class="k">\u5f15\u7528\u573a\u666f</span><span class="v">${d.usedBy.join(' / ')}</span></div>
    <div class="sec-lab">Markdown \u9884\u89c8\uff08Excel \u81ea\u52a8\u8f6c\u6362\uff09</div>
    <div class="dim-md-info tiny muted" style="margin-bottom:8px">${esc(v.file)} \u2192 ${esc(d.airflowParam)}${isLatest?'':' \uff08\u5386\u53f2\u7248\u672c\uff0c\u4ec5\u4f9b\u53c2\u8003\uff09'}</div>
    ${mdTable(d.md)}
    <div class="tiny muted" style="margin-top:10px">\u5b58\u50a8\uff1aSharePoint \u539f\u59cb Excel + \u5e73\u53f0\u8f6c\u6362\u540e Markdown \u53cc\u526f\u672c\u7559\u5b58 \u00b7 \u4efb\u52a1\u6267\u884c\u65f6\u81ea\u52a8\u83b7\u53d6\u6700\u65b0 Markdown \u7248\u672c</div>
    <div style="display:flex;gap:9px;margin-top:12px">
      <button class="btn" onclick="dimDownload('${d.id}',${v.ver})">\u2913 \u4e0b\u8f7d Markdown</button>
      ${isLatest?'<button class="btn" onclick="dimUpload(\''+d.id+'\')">\u2912 \u4e0a\u4f20\u65b0\u7248\u672c</button>':''}
    </div>`);
}

function dimUpload(id){
  const d = State.dimTables.find(x=>x.id===id);
  if(!d) return;
  const cur = d.versions[0];
  openModal('\u4e0a\u4f20\u65b0\u7248\u672c · '+d.title,
    `<p class="small" style="margin-bottom:10px">\u5f53\u524d\u7248\u672c\uff1a<b>v${cur.ver}</b>（${cur.time}），\u4e0a\u4f20\u540e\u5c06\u751f\u6210 <b>v${cur.ver+1}</b>\u3002</p>
     <p class="small muted" style="margin-bottom:12px">\u4e0a\u4f20 Excel \u2192 \u5e73\u53f0\u81ea\u52a8\u8f6c\u6362\u4e3a Markdown \u2192 Airflow \u4efb\u52a1\u4e0b\u6b21\u6267\u884c\u65f6\u81ea\u52a8\u83b7\u53d6\u6700\u65b0\u7248\u672c</p>
     <div class="dim-upload-zone" id="dimUpZone" onclick="document.getElementById('dimFile').click()">
       <div>\ud83d\udcc2 \u70b9\u51fb\u9009\u62e9\u6216\u62d6\u62fd Excel \u6587\u4ef6</div>
       <div class="tiny muted">\u652f\u6301 .xlsx / .xls</div>
     </div>
     <input type="file" id="dimFile" accept=".xlsx,.xls" style="display:none" onchange="dimDoUpload('${d.id}')">`,
    '<button class="btn" onclick="closeModal()">\u53d6\u6d88</button>');
}
function dimDoUpload(id){
  closeModal();
  const d = State.dimTables.find(x=>x.id===id); if(!d) return;
  const cur = d.versions[0];
  const nv = cur.ver+1;
  d.versions.unshift({ver:nv, file:d.name+'_v'+nv+'.xlsx', time:now(), by:'erxiao', rows:cur.rows+(Math.floor(Math.random()*5)), cols:cur.cols});
  State.save();
  audit('\u4e0a\u4f20\u7ef4\u5ea6\u8868', d.title+' v'+nv, '\u6570\u636e\u7ef4\u5ea6\u8868');
  toast('\u5df2\u4e0a\u4f20 '+d.title+' v'+nv+'\uff0cMarkdown \u5df2\u81ea\u52a8\u8f6c\u6362\uff0c\u4e0b\u6b21\u4efb\u52a1\u6267\u884c\u5c06\u81ea\u52a8\u5f15\u7528\u65b0\u7248\u672c','ok');
  render();
}

function dimUploadNew(){
  openModal('\u4e0a\u4f20\u65b0\u7ef4\u5ea6\u8868',
    `<p class="small" style="margin-bottom:12px">\u4e0a\u4f20\u4e00\u4efd\u65b0\u7684 Excel \u7ef4\u5ea6\u8868\uff0c\u5e73\u53f0\u5c06\u81ea\u52a8\u8f6c\u6362\u4e3a Markdown \u5e76\u5206\u914d\u7f16\u53f7\u3002</p>
     <div class="dim-upload-zone">
       <div>\ud83d\udcc2 \u70b9\u51fb\u9009\u62e9\u6216\u62d6\u62fd Excel \u6587\u4ef6</div>
       <div class="tiny muted">\u652f\u6301 .xlsx / .xls</div>
     </div>
     <p class="small muted" style="margin-top:10px">\u6f14\u793a\u6a21\u5f0f\uff1a\u65b0\u8868\u5c06\u81ea\u52a8\u6dfb\u52a0\u5230\u5217\u8868\uff08\u5b9e\u9645\u7cfb\u7edf\u9700\u5728 Airflow DAG \u914d\u7f6e\u4e2d\u586b\u5199\u5bf9\u5e94 param \u540d\u79f0\uff09</p>`,
    '<button class="btn" onclick="closeModal()">\u53d6\u6d88</button>');
}

function dimDownload(id, ver){
  const d = State.dimTables.find(x=>x.id===id); if(!d) return;
  const v = d.versions.find(x=>x.ver===ver);
  const content =
`# ${d.title} · v${v.ver}
> 源文件：${v.file}  
> 上传时间：${v.time} · 上传人：${v.by}  
> Airflow 参数：${d.airflowParam}  
> 引用场景：${d.usedBy.join(' / ')}

${d.md}
`;
  dl(d.airflowParam, content);
  audit('\u4e0b\u8f7d\u7ef4\u5ea6\u8868', d.title+' v'+v.ver, '\u6570\u636e\u7ef4\u5ea6\u8868');
  toast(d.airflowParam+' \u5df2\u4e0b\u8f7d','ok');
}

document.addEventListener('DOMContentLoaded', ()=>{ render(); const a=qp('action'); if(UPLOAD_ENTRIES.some(e=>e.id===a)) upOpen(a, qp('task')); });
