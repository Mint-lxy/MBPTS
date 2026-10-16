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

/* ===== 上传中心（Case4）=====
 * BRD §1 特殊情况：Fedex 预报邮件附件 PDF 中不包含 Invoice 时报错转人工，
 * Portal 留存上传原始 PDF 与发票 PDF 的入口；业务上传后，流程在下次 Portal 运行时继续。
 * 入口按子 Case 分组（与配置中心同一写法），每个入口一行，右侧操作。
 */
const UPLOAD_ENTRIES = [
  {id:'invoice', line:'case4-xentry', name:'原始 PDF 与发票补传', btn:'上传文件',
   desc:'Fedex 预报邮件附件 PDF 中不包含 Invoice 时报错转人工；上传原始 PDF（运单主页 + 运单附页）与发票 PDF 后，流程在下次 Portal 运行时继续。',
   accept:'PDF · 原始 PDF + 发票 PDF 各 1 份 · 单个不超过 20 MB'},
];
const UPLOAD_KIND = {invoice:'原始 PDF 与发票补传'};
let upFilter = {kind:'all', q:''};
let upPicked = {};
function resetCenterFilters(){ dimQ=''; upFilter={kind:'all', q:''}; }
function upNow(){ const d=new Date(),p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function upList(){ return State.data.uploads || (State.data.uploads = []); }
/* 待处理：需要该入口补充数据、且尚未提交的任务 */
function upPending(kind){ return State.tasks.filter(t=>taskMatch(t) && t.need===kind && !t.supplied); }
function upTaskLabel(t){ return `${t.id} · HAWB ${t.waybill}`; }

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
        <div class="chips">${[['all','全部'],['invoice','原始 PDF 与发票补传']].map(([k,l])=>`<button class="chip ${upFilter.kind===k?'on':''}" data-upk="${k}">${l}</button>`).join('')}</div>
        <input class="search" id="upQ" aria-label="搜索提交记录" placeholder="搜索任务编号 / HAWB / 文件名" value="${esc(upFilter.q)}">
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
  const pend = upPending(e.id);
  const last = upList().filter(u=>u.kind===e.id).sort((a,b)=>b.time.localeCompare(a.time))[0];
  return `<tr>
    <td style="max-width:460px"><b>${esc(e.name)}</b><div class="tiny muted">${esc(e.desc)}</div></td>
    <td class="small">${esc(e.accept)}</td>
    <td>${pend===null?'<span class="muted small">—</span>'
      : pend.length?`<span class="tag warn">${pend.length} 票待处理</span>${pend.map(t=>`<div class="tiny"><a href="task-detail.html?id=${encodeURIComponent(t.id)}">${esc(upTaskLabel(t))}</a></div>`).join('')}`
      : '<span class="tag ok">无</span>'}</td>
    <td class="small muted">${last?esc(last.time):'—'}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn sm primary" onclick="upOpen('${e.id}')">${esc(e.btn)}</button>
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
/* 原始 PDF 与发票 PDF 分两个上传区，两份都选好才能提交 */
function upOpen(kind, taskId){
  if(kind!=='invoice') return;
  upPicked = {};
  const hasTask = upPending('invoice').length>0;
  const zone = (slot, title, hint)=>`<div class="fld" style="margin-bottom:6px"><label>${title}</label></div>
      <div class="drop" id="upDrop-${slot}" role="button" tabindex="0">拖拽 PDF 到此处，或点击选择文件<br>
        <span class="tiny">${hint}</span>
        <input type="file" id="upFile-${slot}" class="hidden" accept=".pdf"></div>
      <div id="upFileList-${slot}" style="margin-bottom:12px"></div>`;
  openModal('原始 PDF 与发票补传', `
    ${upTaskSelect('invoice', taskId)}
    ${zone('orig', '原始 PDF（运单主页 + 运单附页）', 'PDF · 单个文件 · 不超过 20 MB · 建议以 HAWB 命名，如 448886353380.pdf')}
    ${zone('inv', '发票 PDF（Invoice）', 'PDF · 单个文件 · 不超过 20 MB')}
    <p class="consignment-error hidden" id="upErr" role="alert"></p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" id="upGo" disabled onclick="upSubmitInvoice()">上传文件</button>`);
  ['orig','inv'].forEach(slot=>{
    const dz=$('#upDrop-'+slot), fi=$('#upFile-'+slot);
    dz.onclick=()=>fi.click(); dz.onkeydown=e=>{ if(e.key==='Enter') fi.click(); };
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('ov')}; dz.ondragleave=()=>dz.classList.remove('ov');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('ov');upPickFile(slot, e.dataTransfer.files[0], hasTask)};
    fi.onchange=()=>upPickFile(slot, fi.files[0], hasTask);
  });
}
function upErr(msg){ const e=$('#upErr'); if(!e) return; e.textContent=msg; e.classList.toggle('hidden',!msg); }
function upPickFile(slot, f, hasTask){
  upErr(''); delete upPicked[slot];
  const list=$('#upFileList-'+slot); list.innerHTML='';
  if(f){
    if(!/\.pdf$/i.test(f.name)) upErr(`需要 PDF 文件，当前选择的是「${f.name}」。`);
    else if(!f.size) upErr('文件为空，请重新选择。');
    else if(f.size>20*1024*1024) upErr('文件超过 20 MB，请压缩后重新上传。');
    else {
      upPicked[slot]={name:f.name, size:f.size};
      list.innerHTML=`<div class="file-it"><span>📄</span><span style="font-weight:600">${esc(f.name)}</span><span class="fs">${Math.max(1,Math.round(f.size/1024))} KB</span></div>`;
    }
  }
  $('#upGo').disabled=!(hasTask && upPicked.orig && upPicked.inv);
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
  if(!upPicked.orig || !upPicked.inv){ upErr('请分别选择原始 PDF 与发票 PDF。'); return; }
  const kb=f=>Math.max(1,Math.round(f.size/1024))+' KB';
  upLink(t,'invoice',upPicked.orig.name+' + '+upPicked.inv.name,
    `原始 PDF ${upPicked.orig.name}（${kb(upPicked.orig)}）· 发票 PDF ${upPicked.inv.name}（${kb(upPicked.inv)}）`,
    '已关联任务，下次 Portal 运行时按上传文件继续识别');
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
