/* ===== task-detail.js · 任务详情 =====
 * 严格区分：Task（业务单据，顶栏/横幅/操作日志） vs Run（执行实例，节点/字段/文件/总结）。
 * 默认展示「当前执行」（runs 最末）；可切换到任意历史 Run 查看，历史只读。
 *
 * 两层历史视图：
 *   Level 1 — 触发历史（规则级）：同一规则/触发条件产生的所有独立 Task，类似 Airflow DAG Runs
 *   Level 2 — 本任务重试（Task 级）：同一 Task 内的多次 Run（R#1→R#2 等重跑/重试）
 *
 * 单栏布局（Q2-B）：证据、附件、抽取字段与原文（PDF）预览均内联折叠到「节点执行轨迹」中
 * 对应节点的卡片下。字段修正/PDF 定位（hook）能力仅挂在发生解析的那个具体节点上，
 * 其它节点只读展示证据与附件。是否允许修改由技术侧编排，平台侧不区分场景、不额外留痕。
 */
let zoom = 1, pageNo = 1;
let selRun = -1;   // -1 = 当前执行（最新）；否则为 run.no
let historyOpen = false;
let activeNode = -1;
let activePreview = null;
let selectedFile = 0;
let spotIdx = -1;

function T(){ return State.task(qp('id')); }
function viewingRun(t){
  const cur = latestRun(t);
  if(selRun===-1) return {run: cur, isLatest: true};
  const r = runByNo(t, selRun);
  return r ? {run:r, isLatest:false} : {run: cur, isLatest: true};
}
function toggleHistory(){ historyOpen = !historyOpen; render(); }
function selectLatest(){ selRun=-1; pageNo=1; zoom=1; activeNode=-1; activePreview=null; selectedFile=0; spotIdx=-1; render(); }

/* 执行状态元信息（面向业务用户的友好标签） */
const RUN_ST = {
  SUCCEEDED:    { icon:'\u2713', label:'\u6210\u529f',   cls:'ok' },
  DIFF_PENDING: { icon:'\u2260', label:'\u6709\u5dee\u5f02', cls:'gd' },
  FAILED:       { icon:'\u2715', label:'\u5931\u8d25',   cls:'dn' },
  RUNNING:      { icon:'\u25cf', label:'\u6267\u884c\u4e2d', cls:'bl' },
};

/* 解析节点识别：Run 内承载字段/原文产出的那个节点（抽取/比对类）。
 * fields 与 files 挂在 Run 上，这里把它们内联绑定到该节点卡片下。
 * 优先取带 evFiles 且携带原文的节点；否则取节点名含抽取/比对/识别关键词者；再退化为首个带证据的节点。 */
function parseNodeIndex(run){
  if(!run || !run.nodes || !run.nodes.length) return -1;
  const kw = /\u62bd\u53d6|OCR|\u8bc6\u522b|\u6bd4\u5bf9|\u4e00\u81f4\u6027|\u5b57\u6bb5/; // 抽取|OCR|识别|比对|一致性|字段
  const hasParse = (run.fields && run.fields.length) || (run.files && run.files.length);
  if(!hasParse) return -1;
  let idx = run.nodes.findIndex(n=> n.evFiles && n.evFiles.length && kw.test(n.n));
  if(idx<0) idx = run.nodes.findIndex(n=> kw.test(n.n));
  if(idx<0) idx = run.nodes.findIndex(n=> (n.ev&&n.ev.length)||(n.evFiles&&n.evFiles.length));
  if(idx<0) idx = 0;
  return idx;
}

/* ================================================================
 *  Level 1 — 触发历史面板（规则级）
 * ================================================================ */
function renderExecHistory(t){
  const hist = getCaseHistory(t);

  const byDay = {};
  hist.entries.forEach(function(e){
    var day = (e.date||'').replace(/^\d{4}-/,'').split(' ')[0];
    if(!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });
  const days = [];
  const baseD = new Date();
  for(var d=14;d>=0;d--){
    var dt = new Date(baseD.getFullYear(),baseD.getMonth(),baseD.getDate()-d);
    days.push(String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'));
  }
  var heatHtml = days.map(function(day){
    var execs = byDay[day]||[];
    var label = day.split('-')[1];
    var dots = execs.length
      ? execs.slice(0,4).map(function(e){
          var s = RUN_ST[e.st]||RUN_ST.SUCCEEDED;
          return '<div class="hist-dot '+s.cls+(e.self?' self':'')+'" title="'+esc(e.id)+' \u00b7 '+s.label+' \u00b7 '+e.dur+'"></div>';
        }).join('')
      : '<div class="hist-dot empty"></div>';
    return '<div class="hist-day"><div class="hist-day-lbl">'+label+'</div>'+dots+'</div>';
  }).join('');

  var listHtml = hist.entries.slice(0,8).map(function(e){
    var s = RUN_ST[e.st]||RUN_ST.SUCCEEDED;
    return '<div class="hist-row'+(e.self?' self':'')+'"'
      +(e.real&&!e.self?' onclick="location.href=\'task-detail.html?id='+e.id+'\'"':'')
      +'>'
      +'<span class="h-dot '+s.cls+'"></span>'
      +'<span class="h-date">'+esc((e.date||'').replace(/^\d{4}-/,''))+'</span>'
      +'<span class="h-id">'+esc(e.id)+'</span>'
      +'<span class="tag '+s.cls+'" style="font-size:11px">'+s.label+'</span>'
      +'<span class="h-dur">'+esc(e.dur)+'</span>'
      +(e.self?'<span class="tag acc" style="font-size:10px;margin-left:auto">\u5f53\u524d</span>':'')
    +'</div>';
  }).join('');

  return '<div class="run-ov card" style="margin-bottom:16px">'
    +'<div class="run-ov-hd" onclick="toggleHistory()">'
      +'<div class="run-ov-left">'
        +'<div><h3 style="font-size:15px">触发历史</h3><div class="tiny muted" style="margin-top:3px;font-weight:400">该 Case 下的同批兄弟任务</div></div>'
        +'<div class="run-counts">'
          +'<span class="rc ok">\u7d2f\u8ba1 '+hist.total+' \u6b21</span>'
          +'<span class="rc">\u6210\u529f\u7387 '+hist.rate+'%</span>'
          +'<span class="rc bl">\u5e73\u5747 '+esc(hist.avgDur)+'</span>'
        +'</div>'
      +'</div>'
      +'<button class="btn sm ghost">'+(historyOpen?'\u6536\u8d77 \u25b2':'\u5c55\u5f00\u8be6\u60c5 \u25bc')+'</button>'
    +'</div>'
    +(historyOpen
      ?'<div style="padding:0 20px 16px">'
        +'<div class="tiny muted" style="margin-bottom:6px">\u8fd1 15 \u5929\u6267\u884c\u72b6\u6001</div>'
        +'<div class="hist-heat">'+heatHtml+'</div>'
        +'<div class="tiny muted" style="margin:14px 0 8px">\u6700\u8fd1\u6267\u884c\u8bb0\u5f55</div>'
        +'<div class="hist-list">'+listHtml+'</div>'
        +(hist.total>8?'<div class="tiny muted" style="margin-top:8px;text-align:right">\u5171 '+hist.total+' \u6761\u8bb0\u5f55\uff0c\u5df2\u5c55\u793a\u6700\u8fd1 8 \u6761</div>':'')
      +'</div>'
      :'')
  +'</div>';
}

/* ================================================================
 *  Level 2 — 本任务重试切换（Task 级）
 * ================================================================ */
function renderRunSwitcher(t, run, isLatest, latest){
  if(t.runs.length <= 1) return '';
  var chips = t.runs.map(function(r){
    var s = RUN_ST[r.st]||RUN_ST.SUCCEEDED;
    var isSel = run && run.no===r.no;
    var isCur = latest && latest.no===r.no;
    return '<div class="sw-chip'+(isSel?' on':'')+'" onclick="selectRun('+r.no+')">'
      +'<span class="sw-dot '+s.cls+'"></span>'
      +s.icon+' R#'+r.no
      +(isCur?' \u5f53\u524d':'')
    +'</div>';
  }).join('');
  return '<div class="run-sw">'
    +'<span class="tiny muted" style="padding-right:4px">\u672c\u4efb\u52a1\u91cd\u8bd5\uff1a</span>'
    +chips
  +'</div>';
}

/* ---------- 节点证据截图 + 文件（点击内联预览，不再跳转） ---------- */
function renderNodeEvidence(n, ctx){
  var evArr = n.ev, files = n.evFiles;
  if((!evArr||!evArr.length)&&(!files||!files.length)) return '';
  var icons = {email:'\ud83d\udce7',ocr:'\ud83d\udd0d',screen:'\ud83d\udda5',api:'\u2197',file:'\ud83d\udcc1',table:'\ud83d\udcca',smtp:'\ud83d\udce4',check:'\u2611',rule:'\u2699'};
  var html = '<div class="nd-evidence"><div class="nd-ev-hd">\ud83d\udccb \u6b65\u9aa4\u8bc1\u636e</div>';
  if(evArr && evArr.length){
    html += '<div class="nd-ev">';
    evArr.forEach(function(ev, ei){
      var ic = icons[ev.type]||'\ud83d\udcc4';
      html += '<div class="ev-card" onclick="previewNodeEv('+ctx.ri+','+ctx.ni+','+ei+')" title="\u67e5\u770b\u8bc1\u636e\u622a\u56fe">'
        +'<div class="ev-thumb '+ev.type+'">'
          +'<div class="ev-bar"><span class="ev-dots">\u25cf \u25cf \u25cf</span>'+ic+' '+esc(ev.title)+'</div>'
          +ev.lines.map(function(l){return '<div class="ev-ln">'+esc(l)+'</div>';}).join('')
        +'</div>'
        +(ev.id?'<div class="ev-foot">'+ev.id+'</div>':'')
      +'</div>';
    });
    html += '</div>';
  }
  if(files && files.length){
    html += '<div class="nd-ev-files">';
    files.forEach(function(f, fi){
      html += '<div class="ev-file click" onclick="previewNodeFile('+ctx.ri+','+ctx.ni+','+fi+')" title="\u9884\u89c8\u9644\u4ef6"><span class="ef-icon">'+fileIconOf(f[0])+'</span><span class="ef-name">'+esc(f[0])+'</span><span class="ef-size">'+esc(f[1])+'</span><span class="ef-open tiny muted">\u9884\u89c8 \u203a</span></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}
function fileIconOf(name){
  if(/\.pdf$/i.test(name)) return '\ud83d\udcc4';
  if(/\.xlsx?$/i.test(name)) return '\ud83d\udcca';
  if(/\.json$/i.test(name)) return '{ }';
  if(/\.png|\.jpg|\.jpeg$/i.test(name)) return '\ud83d\uddbc';
  if(/\.eml$/i.test(name)) return '\u2709';
  if(/\.csv$/i.test(name)) return '\ud83d\udcc3';
  if(/\.html$/i.test(name)) return '\ud83c\udf10';
  return '\ud83d\udcce';
}

/* 节点证据截图内联预览（抽屉） */
function previewNodeEv(ri, ni, ei){
  const t = T(); const run = ri===-1?latestRun(t):runByNo(t, ri); if(!run) return;
  const n = run.nodes[ni]; if(!n||!n.ev) return;
  const ev = n.ev[ei]; if(!ev) return;
  activeNode=ni;
  activePreview={kind:'evidence',ni,idx:ei};
  render();
}
/* 节点附件内联预览（抽屉） */
function previewNodeFile(ri, ni, fi){
  const t = T(); const run = ri===-1?latestRun(t):runByNo(t, ri); if(!run) return;
  const n = run.nodes[ni]; if(!n||!n.evFiles) return;
  const f = n.evFiles[fi]; if(!f) return;
  activeNode=ni;
  activePreview={kind:'file',ni,idx:fi};
  render();
}

/* ---------- 当前查看指示条 ---------- */
function renderViewingBar(run, isLatest){
  if(!run) return '';
  var m = RUN_ST[run.st]||RUN_ST.SUCCEEDED;
  return '<div class="run-viewing">'
    +'<span class="rv-dot '+m.cls+'"></span>'
    +'<b>\u6b63\u5728\u67e5\u770b\uff1aR#'+run.no+'</b>'
    +'<span style="color:var(--line)">\u00b7</span>'
    +'<span class="muted">'+esc(run.cause)+'</span>'
    +'<span style="color:var(--line)">\u00b7</span>'
    +'<span class="muted">'+run.start+' \u00b7 '+run.dur+'</span>'
    +(isLatest
      ?'<span class="tag acc" style="margin-left:auto">\u5f53\u524d\u6267\u884c</span>'
      :'<span class="tag" style="margin-left:6px">\u5386\u53f2\u6267\u884c \u00b7 \u53ea\u8bfb</span><button class="btn sm" style="margin-left:auto" onclick="selectLatest()">\u5207\u56de\u5f53\u524d\u6267\u884c \u2192</button>')
  +'</div>';
}

/* ---------- 统一工作台：字段、原文、证据、附件共享同一个预览区域 ---------- */
function qualityTag(f){
  const q=f.quality||'';
  const cls=q==='低'?'dan':q==='中'?'warn':q==='高'?'ok':'';
  return `<span class="tag ${cls}">${q?esc(q)+' · ':''}${f.conf}%</span>`;
}
function renderDocumentPreview(run){
  const fields=run.fields||[];
  const files=run.files||[];
  const file=files[selectedFile]||files[0];
  if(!file) return '<div class="preview-empty"><span>▤</span><b>没有可预览的原文</b><p>该节点未登记 PDF 或图片文件。</p></div>';
  const totalPages=file.pages||1;
  if(pageNo>totalPages) pageNo=totalPages;
  const visibleFields=fields.map((f,i)=>({f,i})).filter(x=>(x.f.docIndex||0)===selectedFile && (x.f.page||1)===pageNo);
  return `<div class="unified-preview">
    <div class="doc-tabs">${files.map((f,i)=>`<button class="${i===selectedFile?'on':''}" onclick="setFile(${i})"><span>${fileIconOf(f.name)}</span>${esc(f.name)}<small>${f.pages||1} 页</small></button>`).join('')}</div>
    <div class="pdf-bar"><b>原文预览</b><span class="tiny muted">R#${run.no} · 授权路径引用</span><span class="preview-spacer"></span>
      <button class="btn sm ghost" ${pageNo<=1?'disabled':''} onclick="setPage(${pageNo-1})">‹</button><span class="tiny">${pageNo} / ${totalPages}</span><button class="btn sm ghost" ${pageNo>=totalPages?'disabled':''} onclick="setPage(${pageNo+1})">›</button>
      <button class="btn sm ghost" onclick="setZoom(-1)">−</button><span class="tiny" id="zoomLv">${Math.round(zoom*100)}%</span><button class="btn sm ghost" onclick="setZoom(1)">+</button>
    </div>
    <div class="pdf-body compact"><div class="pdf-paper" id="paper" style="transform:scale(${zoom})">
      <div class="paper-head"><span>MBPTS · DOCUMENT VIEW</span><h5>${esc(file.name)}</h5><small>第 ${pageNo} / ${totalPages} 页 · 演示渲染</small></div>
      ${visibleFields.length?visibleFields.map(x=>`<div class="ln ${spotIdx===x.i?'spot':''}" id="pln-${x.i}"><span>${esc(x.f.k)}</span><b><span class="mark">${esc(x.f.v)}</span></b></div>`).join(''):'<div class="paper-placeholder"><b>本页暂无可定位字段</b><span>可继续翻页或切换其他文档。</span></div>'}
      <div class="paper-foot">字段定位来源：document_id + page + normalized bbox</div>
    </div></div>
  </div>`;
}
function renderParsePanel(t, run, isLatest){
  const fields=run.fields||[];
  const editable=isLatest && run.st!=='RUNNING';
  return `<div class="parse-workspace">
    <section class="field-pane"><div class="panel-title"><div><h4>当前识别数据</h4><span class="tiny muted">Task 当前有效值 · ${editable?'可行内修正':'只读'}</span></div><span class="tag acc">${fields.length} 项</span></div>
      <div class="field-list">${fields.length?fields.map((f,i)=>`<div class="field-row ${f.low&&!f.delta?'issue':''} ${spotIdx===i?'selected':''}" id="fr-${i}">
        <div class="field-main"><span>${esc(f.k)}</span><div id="fv-${i}"><b>${esc(f.v)}</b>${f.delta?`<small><s>${esc(f.delta.old)}</s> → 已修正 · ${esc(f.delta.tm)}</small>`:''}${f.carried&&f.carried.fromRun?`<small>自 R#${f.carried.fromRun} 修正值继承</small>`:''}</div></div>
        <div class="field-meta"><span class="tag">${esc(f.src)}</span>${qualityTag(f)}</div>
        <div class="field-actions">${f.locator!==false?`<button class="btn sm ghost" onclick="spotField(${i})">定位</button>`:`<span class="no-locator" title="${esc(f.locatorReason||'该字段没有可用定位信息')}">无定位</span>`}${editable?`<button class="btn sm" onclick="editField(${i})">修正</button>`:''}</div>
      </div>`).join(''):'<div class="preview-empty"><span>—</span><b>暂无识别字段</b></div>'}</div>
      <div class="field-legend"><span>置信度为识别结果返回值</span><span>质量等级不在前端按阈值推导</span></div>
    </section>
    <section class="preview-pane">${renderDocumentPreview(run)}</section>
  </div>`;
}
function renderEvidencePicker(n, ctx){
  const evs=n.ev||[], files=n.evFiles||[];
  if(!evs.length&&!files.length) return '<div class="preview-empty"><span>◇</span><b>暂无节点证据</b><p>该节点未登记截图或附件。</p></div>';
  return `<div class="asset-picker"><div class="sec-lab">节点证据与附件</div>${evs.map((ev,i)=>`<button class="asset-row ${activePreview&&activePreview.kind==='evidence'&&activePreview.idx===i?'on':''}" onclick="previewNodeEv(${ctx.ri},${ctx.ni},${i})"><span class="asset-icon">▧</span><span><b>${esc(ev.title)}</b><small>${esc(ev.id||'过程证据')}</small></span><i>预览 ›</i></button>`).join('')}${files.map((f,i)=>`<button class="asset-row ${activePreview&&activePreview.kind==='file'&&activePreview.idx===i?'on':''}" onclick="previewNodeFile(${ctx.ri},${ctx.ni},${i})"><span class="asset-icon">${fileIconOf(f[0])}</span><span><b>${esc(f[0])}</b><small>${esc(f[1])}</small></span><i>预览 ›</i></button>`).join('')}</div>`;
}
function renderAssetPreview(run,n){
  if(!activePreview) return '<div class="preview-empty"><span>⌁</span><b>选择证据或附件</b><p>内容将在当前工作区预览，不会打开弹窗。</p></div>';
  if(activePreview.kind==='evidence'){
    const ev=(n.ev||[])[activePreview.idx]; if(!ev) return '';
    return `<div class="asset-preview"><div class="preview-title"><div><span class="tiny muted">节点证据 · R#${run.no}</span><h4>${esc(ev.title)}</h4></div>${ev.id?`<span class="hash">${esc(ev.id)}</span>`:''}</div><div class="evidence-canvas ${ev.type}"><div class="ev-bar"><span class="ev-dots">● ● ●</span>${esc(ev.title)}</div>${ev.lines.map(l=>`<div class="ev-ln">${esc(l)}</div>`).join('')}</div><div class="preview-meta"><span>所属节点：${esc(n.n)}</span><span>WORM 防篡改留痕</span></div></div>`;
  }
  const f=(n.evFiles||[])[activePreview.idx]; if(!f) return '';
  return `<div class="asset-preview"><div class="preview-title"><div><span class="tiny muted">节点附件 · R#${run.no}</span><h4>${esc(f[0])}</h4></div><span class="tag">${esc(f[1])}</span></div><div class="file-canvas"><span>${fileIconOf(f[0])}</span><b>${esc(f[0])}</b><p>文件内容使用与原文相同的授权预览容器；本原型仅展示元信息。</p></div><button class="btn sm" onclick="toast('附件下载（演示）','ok')">下载附件</button></div>`;
}
function renderNodeWorkspace(t,run,isLatest,parseIdx,ri){
  if(activeNode<0||activeNode>=run.nodes.length){
    activeNode=run.nodes.findIndex(n=>['fail','review','run'].includes(n.st));
    if(activeNode<0) activeNode=parseIdx>=0?parseIdx:run.nodes.length-1;
  }
  const n=run.nodes[activeNode];
  const status=n.st==='ok'?'<span class="tag ok">完成</span>':n.st==='run'?'<span class="tag blue"><span class="pulse"></span>执行中</span>':n.st==='fail'?'<span class="tag dan">失败</span>':n.st==='review'?'<span class="tag gold">有差异</span>':'<span class="tag">等待</span>';
  return `<div class="task-workbench card">
    <nav class="node-rail" aria-label="节点执行轨迹"><div class="rail-head"><span>节点执行轨迹</span><b>R#${run.no}</b></div>${run.nodes.map((x,i)=>`<button class="rail-node ${i===activeNode?'on':''} ${x.st}" onclick="selectNode(${i})"><span class="rail-dot"></span><span><b>${esc(x.n)}</b><small>${esc(x.d)}</small>${x.subs&&x.subs.length?`<span class="rail-subs">${x.subs.map(s=>`<i>${esc(s)}</i>`).join('')}</span>`:''}</span>${i===parseIdx?'<em>解析</em>':''}</button>`).join('')}</nav>
    <section class="node-workspace"><div class="workspace-head"><div><span class="tiny muted">节点 ${activeNode+1} / ${run.nodes.length}</span><h3>${esc(n.n)}</h3><p>${esc(n.d)}</p></div><div>${status}${activeNode===parseIdx?'<span class="tag acc">解析节点</span>':''}</div></div>${n.err?`<div class="err workspace-error">${esc(n.err)}</div>`:''}
      ${activeNode===parseIdx?renderParsePanel(t,run,isLatest):`<div class="asset-workspace"><div>${renderEvidencePicker(n,{ri,ni:activeNode})}</div><div class="preview-pane">${renderAssetPreview(run,n)}</div></div>`}
      ${isLatest&&['fail','review'].includes(n.st)?`<div class="workspace-actions"><button class="btn" onclick="rerunFrom(${activeNode})">↻ 从此节点重跑（新执行）</button></div>`:''}
    </section>
  </div>`;
}

function render(){
  const t = T();
  if(!t){ $('#view').innerHTML = '<div class="empty">任务不存在，<a href="tasks.html">返回任务列表</a></div>'; return; }
  setCrumb(`<a href="tasks.html">任务中心</a> · <b>${t.id}</b>`);
  const st = taskStatus(t);
  const {run, isLatest} = viewingRun(t);
  const latest = latestRun(t);

  const execHistory = renderExecHistory(t);
  const runSwitcher = renderRunSwitcher(t, run, isLatest, latest);
  const viewingBar = t.runs.length > 1 ? renderViewingBar(run, isLatest) : '';

  const ri = isLatest ? -1 : run.no;
  const parseIdx = parseNodeIndex(run);

  $('#view').innerHTML = `
  <div class="task-detail-head card">
    <div class="task-title"><div class="task-back"><a href="tasks.html">← 返回任务中心</a><span>${ucTag(t.uc)}</span></div><h2>${t.id}</h2><div class="sub">${esc(t.case)}${t.mode?' · '+(t.mode==='air'?'空运':'海运'):''}${t.waybill?' · BL/HAWB：'+esc(t.waybill):''} · ${esc(t.src)} · 规则 ${esc(t.rule||'—')}</div></div>
    <div class="task-head-stats"><div><span>当前状态</span>${stTag(st)}</div><div><span>当前执行</span><b>${latest?`R#${latest.no}`:'尚无执行'}</b></div><div><span>执行次数</span><b>${t.runs.length}</b></div></div>
    <div class="task-primary-actions">
      ${st==='FAILED'?`<button class="btn danger" onclick="rerunAll()">↻ 整单重跑（生成新执行）</button>`:''}
      ${st==='DIFF_PENDING'?`<button class="btn danger" onclick="uploadForRerun()">上传文件/整单重跑</button>`:''}
    </div>
  </div>

  ${t.waitState?`
  <div class="banner amber"><span class="ic">⇪</span><div class="txt"><b>任务尚未创建执行</b> · 缺少 ${t.waitState.missing.length} 个必需文件：
    <ul style="margin:6px 0 0;padding-left:18px">${t.waitState.missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>
    <div class="tiny muted" style="margin-top:4px">上传齐后将生成第一个执行实例 R#1</div></div>
    <div class="act"><button class="btn primary" onclick="uploadModal('${t.id}')">去上传</button></div></div>`:''}
  ${!t.waitState && isLatest && st==='DIFF_PENDING'?`
  <div class="banner amber"><span class="ic">≠</span><div class="txt"><b>R#${latest.no} 比对存在差异</b> · 请在下方解析节点核对字段（金色高亮行）。修正取值写入<b>当前生效版本</b>，重跑将生成新执行实例 R#${latest.no+1} 并携带修正值。UC34 全场景无人工审批，修正仅作留痕。</div>
    <div class="act"><button class="btn" onclick="scrollToParse()">查看差异字段</button></div></div>`:''}
  ${!t.waitState && isLatest && st==='FAILED'?`
  <div class="banner red"><span class="ic">×</span><div class="txt"><b>R#${latest.no} 执行失败</b> · 失败节点：${esc((latest.nodes.find(n=>n.st==='fail')||{}).n||'')}${t.fixable?'。演示模式下视为源文件已修正，整单重跑将成功并生成新执行实例':''}</div></div>`:''}

  ${runSwitcher}
  ${viewingBar}

  ${run?renderNodeWorkspace(t,run,isLatest,parseIdx,ri):'<div class="card empty"><div class="ei">—</div>等待必需文件上传后创建首个执行实例</div>'}

  <div class="task-secondary-grid">
    ${execHistory}
    <details class="card task-log"><summary>任务操作日志 <span>${(t.ops||[]).length} 条</span></summary><div class="task-log-body">${(t.ops||[]).map(o=>`<div class="kv"><span class="k">${o.tm}</span><span class="v">${esc(o.txt)}</span></div>`).join('')||'<div class="small muted">暂无操作记录</div>'}</div></details>
  </div>`;
}

function scrollToParse(){
  const t=T(); const run=viewingRun(t).run; const idx=parseNodeIndex(run);
  if(idx>=0){ selectNode(idx); const el=document.querySelector('.task-workbench'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
}

function selectRun(no){
  const t = T();
  const latest = latestRun(t);
  selRun = (latest && latest.no===no) ? -1 : no;
  pageNo=1; zoom=1; activeNode=-1; activePreview=null; selectedFile=0; spotIdx=-1; render();
}

function selectNode(i){ activeNode=i; activePreview=null; spotIdx=-1; selectedFile=0; pageNo=1; zoom=1; render(); }
function setFile(i){ selectedFile=i; pageNo=1; spotIdx=-1; render(); }
function setZoom(d){ zoom=Math.min(1.6,Math.max(.6,zoom+d*.1)); const p=$('#paper'); if(p) p.style.transform=`scale(${zoom})`; const lv=$('#zoomLv'); if(lv) lv.textContent=Math.round(zoom*100)+'%'; }
function setPage(p){ pageNo=p; render(); }
function spotField(i){
  const t=T(); const run=viewingRun(t).run; const f=run&&run.fields?run.fields[i]:null;
  if(!f||f.locator===false){ toast(f&&f.locatorReason?f.locatorReason:'该字段没有可用定位信息','warn'); return; }
  selectedFile=f.docIndex||0; pageNo=f.page||1; spotIdx=i; render();
  toast(`已定位到${run.files[selectedFile]?run.files[selectedFile].name:'原文'}第 ${pageNo} 页`,'ok');
}

let editing=-1;
function editField(i){
  const t = T(); const {run, isLatest} = viewingRun(t);
  if(!isLatest){ toast('历史执行为只读，请切换到当前执行后修正','warn'); return; }
  if(run.st==='RUNNING'){ toast('执行进行中，暂不可修正','warn'); return; }
  if(editing>=0) { toast('请先完成当前字段修正','warn'); return; }
  editing=i; const f=run.fields[i];
  $(`#fv-${i}`).innerHTML = `<input class="fld-edit" id="fi-${i}" value="${esc(f.v)}">
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn sm primary" onclick="saveField(${i})">保存并留痕（自下次执行生效）</button>
      <button class="btn sm" onclick="editing=-1;render()">取消</button>
    </div>`;
  $(`#fi-${i}`).focus();
}
function saveField(i){
  const t = T(); const {run} = viewingRun(t); const f = run.fields[i];
  const nv = $(`#fi-${i}`).value.trim();
  editing=-1;
  if(!nv){ toast('取值不能为空','warn'); render(); return; }
  if(nv===f.v){ render(); return; }
  f.delta = {old:f.v, tm:now(), runNo: run.no};
  f.v = nv;
  t.ops.unshift({tm:now(), txt:`字段修正：${f.k} · R#${run.no} 取值「${f.delta.old} → ${nv}」 · 待下次执行携带`});
  addEvidence('operation', t.id, t.uc, `字段修正：${f.k}「${f.delta.old} → ${nv}」（R#${run.no} 版本，erxiao）`);
  audit('修正字段', `${t.id} · ${f.k} · R#${run.no}`, '任务中心');
  toast('修正已保存（留痕），将从下一执行实例携带生效','ok');
  render();
}

function rerunFrom(idx){
  const t = T(); const run = latestRun(t); if(!run) return;
  const n = run.nodes[idx];
  openModal('确认重跑 · 生成新执行实例', `
    <p class="small" style="margin-bottom:12px">将以节点 <b>「${esc(n.n)}」</b> 为起点，生成新执行实例 <b>R#${run.no+1}</b>：</p>
    <ul class="small" style="padding-left:18px;color:var(--ink-2)">
      <li>R#${run.no+1} 携带当前生效字段值（含本次修正），重新执行后续节点</li>
      <li><b>R#${run.no} 保持只读归档</b>，其节点轨迹与证据不受影响</li>
      <li>重跑同样产生完整证据链，任务当前状态以 R#${run.no+1} 为准</li>
    </ul>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="doRerun(${idx})">生成 R#${run.no+1} 并执行</button>`);
}
function rerunAll(){
  const t = T(); const run = latestRun(t); if(!run) return;
  openModal('整单重跑确认', `<p class="small">将生成新执行实例 <b>R#${run.no+1}</b> 并从头执行全部节点。${t.fixable?'<b class="gold">演示模式：视为源文件已修正，R#2 将执行成功。</b>':''}历史执行 R#${run.no} 保持只读。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn danger" onclick="doRerun(0,'整单重跑')">整单重跑</button>`);
}
/* ===== 差异处理：整单重跑（Case 1 无需上传文件，系统自动从 IES+ 获取数据） ===== */
function uploadForRerun(){
  const t = T(); if(!t) return;
  const run = latestRun(t);
  const files = (run && run.files || []).map(f=>f.name);
  openModal(`整单重跑 · ${t.id}`, `
    <p class="small" style="margin-bottom:4px">将生成新执行实例并整单重跑；Case 1 无需上传文件，系统自动从 IES+ 获取数据。</p>
    ${files.length?`<p class="tiny muted" style="margin-bottom:10px">当前源文件：${esc(files.join('、'))}</p>`:''}
    <div class="drop drop-off" aria-disabled="true">
      无需上传文件<br>
      <span class="tiny">Case 1 由系统自动从 IES+ 获取数据</span>
    </div>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="confirmUploadForRerun()">上传并整单重跑</button>`);
}
function confirmUploadForRerun(){
  const t = T(); if(!t) return;
  closeModal();
  addEvidence('trigger', t.id, t.uc, '人工触发整单重跑（Case 1 无需上传文件，系统自动从 IES+ 获取数据）');
  t.ops.unshift({tm:now(), txt:'差异处理 · 整单重跑（系统自动从 IES+ 获取数据）'});
  audit('整单重跑', `${t.id} · 差异处理`, '任务中心');
  const run = scheduleRun(t.id, 0, '整单重跑');
  if(!run) return;
  selRun = -1;
  toast(`已生成执行 R#${run.no} 并开始整单重跑`,'ok');
  setTimeout(render, 350);
}
function doRerun(idx, cause){
  closeModal();
  const t = T();
  const run = scheduleRun(t.id, idx, cause);
  if(!run) return;
  toast(`已生成执行 R#${run.no} 并开始执行`,'ok');
  selRun = -1;
  setTimeout(render, 350);
}
document.addEventListener('DOMContentLoaded', render);
