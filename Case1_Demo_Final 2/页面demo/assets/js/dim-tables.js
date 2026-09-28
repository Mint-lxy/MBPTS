/* ===== dim-tables.js · 数据维度表 =====
 * 用户上传 Excel → 平台自动转换为 Markdown → Airflow 任务引用最新版本。
 * 逻辑由原证据中心「手工维度表」tab 独立成页迁移而来。
 */
let dimQ = '';
function resetCenterFilters(){ dimQ=''; }

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

function render(){
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>上传中心</h2><div class="sub">集中管理手工补充数据与业务参考表，查看文件及历史版本。</div></div>
    <button class="btn primary" disabled>上传数据（待完善）</button>
  </div>
  ${centerContext()}
  <div class="center-toolbar"><b>数据文件</b><input class="search" id="dimSearch" aria-label="搜索数据文件" placeholder="搜索数据名称 / 文件名" value="${esc(dimQ)}"></div>
  <div class="tblwrap center-table" id="uploadRows"></div>`;
  $('#dimSearch').oninput = e=>{dimQ=e.target.value;renderUploadRows()};
  renderUploadRows();
}
function uploadEntries(){
  /* Case1 不涉及上传中心功能：当前范围不展示任何数据文件（原示例已移除） */
  return [];
}
function renderUploadRows(){
  const list=uploadEntries().filter(d=>(d.title+' '+d.versions[0].file).toLowerCase().includes(dimQ.toLowerCase()));
  $('#uploadRows').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>数据名称</th><th>所属场景</th><th>当前文件</th><th>版本</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${list.map(d=>{const v=d.versions[0];return `<tr><td><b>${esc(d.title)}</b><div class="tiny muted">业务参考数据 · 演示样例</div></td><td>${esc(d.caseId?caseLabel(d.caseId):d.uc)}</td><td>${esc(v.file)}</td><td><span class="tag">v${v.ver}</span></td><td>${esc(v.time)}</td><td><button class="btn sm" onclick="previewUpload('${d.id}')">查看文件</button></td></tr>`}).join('')}</tbody></table>` : '<div class="center-empty"><h3>暂无数据文件</h3><p>Case1 暂不涉及上传中心功能。</p></div>';
}
function previewUpload(id){
  const d=uploadEntries().find(x=>x.id===id); if(!d) return;
  const v=d.versions[0];
  openDrawer(esc(d.title), `<dl class="center-detail"><div><dt>当前文件</dt><dd>${esc(v.file)}</dd></div><div><dt>所属场景</dt><dd>${esc(d.caseId?caseLabel(d.caseId):d.uc)}</dd></div></dl><div class="sec-lab">数据预览（演示样例）</div>${mdTable(d.md)}<div class="sec-lab">版本记录</div>${d.versions.map(x=>`<div class="kv"><span class="k">v${x.ver} · ${esc(x.time)}</span><span class="v">${esc(x.file)}</span></div>`).join('')}<p class="center-note">本页仅展示样例与版本信息，文件上传和下载将在后续配置。</p>`);
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

document.addEventListener('DOMContentLoaded', render);
