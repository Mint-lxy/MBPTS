/* ===== task-detail.js · 任务详情（全权限版：Case1 ~ 5 共用，节点文件 / 重跑方式 / 文案取自 cases/caseN.js） =====
 * 严格区分：Task（业务单据，顶栏/横幅/操作日志） vs Run（执行实例，节点/字段/文件/总结）。
 * 默认展示「当前执行」（runs 最末）；可切换到本任务的任意历史 Run 查看，历史只读。
 *
 * 待人工处理的任务（taskStage = manual）：
 *   - 可修正字段；可上传覆盖没有字段定位的文件（按钮在「下载附件」旁）
 *   - 右上角两种重跑：节点重跑（从待处理节点接着当前 Run 执行）、整单重跑（新开一个 Run 从头执行）
 * 其余状态只读。
 */
let zoom = 1, pageNo = 1;
let selRun = -1;   // -1 = 当前执行（最新）；否则为 run.no
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
  const kw = /\u62bd\u53d6|OCR|\u8bc6\u522b|\u6bd4\u5bf9|\u4e00\u81f4\u6027|\u5b57\u6bb5|PO\u90ae\u4ef6|\u53d1\u7968\u4fe1\u606f/; // 抽取|OCR|识别|比对|一致性|字段|PO邮件|发票信息
  const hasParse = (run.fields && run.fields.length) || (run.files && run.files.length);
  if(!hasParse) return -1;
  let idx = run.nodes.findIndex(n=> n.evFiles && n.evFiles.length && kw.test(n.n));
  if(idx<0) idx = run.nodes.findIndex(n=> kw.test(n.n));
  if(idx<0) idx = run.nodes.findIndex(n=> (n.ev&&n.ev.length)||(n.evFiles&&n.evFiles.length));
  if(idx<0) idx = 0;
  return idx;
}

/* ================================================================
 *  本任务执行切换（同一 Task 内的多次 Run）
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
/* 待人工处理、正在看当前执行、且当前执行没在跑时，才能修正字段、上传覆盖文件 */
function canHandle(t, isLatest){ const r = latestRun(t); return isLatest && !!r && r.st!=='RUNNING' && taskStage(t)==='manual'; }
/* 原文文件 fi 是否被字段定位引用（有定位的文件不能覆盖，否则字段坐标失效） */
function fileLocated(run, fi){ return (run.fields||[]).some(f=>(f.docIndex||0)===fi && f.locator!==false); }
function overrideBtn(kind, idx, located){
  return located
    ? `<button class="btn sm" disabled title="该文件有字段定位，不能覆盖">⤒ 上传覆盖</button>`
    : `<label class="btn sm">⤒ 上传覆盖<input type="file" class="hidden" onchange="overrideFile('${kind}',${idx},this)"></label>`;
}
/* 上传覆盖：kind = doc（原文 run.files）/ ev（当前节点附件 evFiles）；扩展名需与原文件一致 */
function overrideFile(kind, idx, input){
  const t = T(), run = latestRun(t), file = input.files[0];
  input.value = '';
  if(!file || !canHandle(t, true)) return;
  const n = run.nodes[activeNode];
  const old = kind==='doc' ? (run.files[idx]||{}).name : ((n.evFiles||[])[idx]||[])[0];
  if(!old) return;
  if(kind==='doc' && fileLocated(run, idx)){ toast('该文件有字段定位，不能覆盖','warn'); return; }
  const ext = s => (/\.[^.]+$/.exec(s)||[''])[0].toLowerCase();
  if(ext(file.name)!==ext(old)){ toast(`需要 ${ext(old)||'同类型'} 文件`,'err'); return; }
  if(!file.size){ toast('文件为空，请重新选择','err'); return; }
  if(file.size>20*1024*1024){ toast('文件超过 20 MB，请压缩后重新上传','err'); return; }
  if(kind==='doc') Object.assign(run.files[idx], {name:file.name, replaced:{old, tm:now()}});
  else n.evFiles[idx] = [file.name, Math.max(1,Math.round(file.size/1024))+' KB'];
  t.ops.unshift({tm:now(), txt:`上传覆盖：${old} → ${file.name}（R#${run.no}${kind==='ev'?' · '+n.n:''}）`});
  addEvidence('operation', t.id, t.uc, `上传覆盖 ${old} → ${file.name}（erxiao）`);
  audit('上传覆盖文件', `${t.id} · ${old} → ${file.name}`, '任务中心');
  State.save();
  toast(`已用 ${file.name} 覆盖 ${old}，重跑时生效`,'ok');
  render();
}
function renderDocumentPreview(t, run, isLatest){
  const fields=run.fields||[];
  const files=run.files||[];
  const indices=(run.nodes[activeNode]?.fieldFiles||files.map((_,i)=>i)).filter(i=>files[i]);
  if(!indices.length) return '<div class="preview-empty"><span>▤</span><b>没有可预览的原文</b><p>该节点未登记 PDF 或图片文件。</p></div>';
  if(!indices.includes(selectedFile)) selectedFile=indices[0];
  const file=files[selectedFile];
  const totalPages=file.pages||1;
  if(pageNo>totalPages) pageNo=totalPages;
  const visibleFields=fields.map((f,i)=>({f,i})).filter(x=>
    (x.f.stage===activeNode || (x.f.stage===undefined&&activeNode===parseNodeIndex(run))) &&
    (x.f.docIndex||0)===selectedFile && (x.f.page||1)===pageNo);
  const focused=fields[spotIdx];
  const fieldShots=focused&&(focused.stage===activeNode||focused.stage===undefined)?focused.images||[]:[];
  const shots=fieldShots.length?fieldShots:run.nodes[activeNode]?.referenceImages||[];
  return `<div class="unified-preview">
    <div class="doc-tabs">${indices.map(i=>{const f=files[i];return `<button class="${i===selectedFile?'on':''}" onclick="setFile(${i})"><span>${fileIconOf(f.name)}</span>${esc(f.name)}<small>${f.pages||1} 页</small></button>`}).join('')}</div>
    <div class="pdf-bar"><b>原文预览</b><span class="tiny muted">R#${run.no} · 授权路径引用</span><span class="preview-spacer"></span>
      <button class="btn sm ghost" ${pageNo<=1?'disabled':''} onclick="setPage(${pageNo-1})">‹</button><span class="tiny">${pageNo} / ${totalPages}</span><button class="btn sm ghost" ${pageNo>=totalPages?'disabled':''} onclick="setPage(${pageNo+1})">›</button>
      <button class="btn sm ghost" onclick="setZoom(-1)">−</button><span class="tiny" id="zoomLv">${Math.round(zoom*100)}%</span><button class="btn sm ghost" onclick="setZoom(1)">+</button>
    </div>
    <div class="pdf-body compact"><div class="pdf-paper ${shots.length?'with-captures':''}" id="paper" style="transform:scale(${zoom})">
      <div class="paper-head"><span>MBPTS · DOCUMENT VIEW</span><h5>${shots.length?'BRD 字段定位示例':esc(file.name)}</h5><small>${shots.length?'附件原图 · 非当前演示票原文':'第 '+pageNo+' / '+totalPages+' 页 · 演示渲染'}</small></div>
      ${shots.length?`<div class="case3-captures">${shots.map((src,i)=>`<figure><img src="${esc(src)}" alt="${esc(fieldShots.length?focused.k:run.nodes[activeNode].n)} · BRD参考图 ${i+1}" loading="lazy"><figcaption>${fieldShots.length?esc(focused.k)+' · ':''}附件截图 ${i+1} / ${shots.length}</figcaption></figure>`).join('')}</div>`
        :visibleFields.length?visibleFields.map(x=>`<div class="ln ${spotIdx===x.i?'spot':''}" id="pln-${x.i}"><span>${esc(x.f.k)}</span><b><span class="mark">${esc(x.f.v)}</span></b></div>`).join(''):'<div class="paper-placeholder"><b>本页暂无可定位字段</b><span>可继续翻页或切换其他文档。</span></div>'}
      <div class="paper-foot">${shots.length?'来源：BRD 截图 · 非当前任务 OCR 坐标':'字段定位来源：document_id + page + normalized bbox'}</div>
    </div></div>
    <div class="file-acts"><button class="btn sm" onclick="toast('附件下载（演示）','ok')">下载附件</button>${canHandle(t,isLatest)?overrideBtn('doc',selectedFile,fileLocated(run,selectedFile)):''}${file.replaced?`<span class="tiny muted">已覆盖 · 原文件 ${esc(file.replaced.old)} · ${esc(file.replaced.tm)}</span>`:''}</div>
  </div>`;
}
function renderParsePanel(t, run, isLatest){
  const fields=(run.fields||[]).map((f,i)=>({f,i})).filter(({f})=>
    f.stage===activeNode || (f.stage===undefined&&activeNode===parseNodeIndex(run)));
  const editable=canHandle(t, isLatest);
  const title=run.nodes[activeNode]?.fieldTitle||'当前识别数据';
  return `<div class="parse-workspace">
    <section class="field-pane"><div class="panel-title"><div><h4>${title}</h4><span class="tiny muted">Task 当前有效值 · ${editable?'可行内修正':'只读'}</span></div><span class="tag acc">${fields.length} 项</span></div>
      <div class="field-list">${fields.length?fields.map(({f,i})=>`<div class="field-row ${f.low&&!f.delta?'issue':''} ${spotIdx===i?'selected':''}" id="fr-${i}">
        <div class="field-main"><span>${esc(f.k)}</span><div id="fv-${i}"><b>${esc(f.v)}</b>${f.delta?`<small><s>${esc(f.delta.old)}</s> → 已修正 · ${esc(f.delta.tm)}</small>`:''}${f.carried&&f.carried.fromRun?`<small>自 R#${f.carried.fromRun} 修正值继承</small>`:''}</div></div>
        <div class="field-meta"><span class="tag">${esc(f.src)}</span>${qualityTag(f)}</div>
        <div class="field-actions">${f.locator!==false?`<button class="btn sm ghost" onclick="spotField(${i})">定位</button>`:`<span class="no-locator" title="${esc(f.locatorReason||'该字段没有可用定位信息')}">无定位</span>`}${editable?`<button class="btn sm" onclick="editField(${i})">修正</button>`:''}</div>
      </div>`).join(''):'<div class="preview-empty"><span>—</span><b>暂无识别字段</b></div>'}</div>
      <div class="field-legend"><span>置信度仅为原型演示值，不代表 BRD 实测结果</span><span>质量等级不在前端按阈值推导</span></div>
    </section>
    <section class="preview-pane">${renderDocumentPreview(t, run, isLatest)}</section>
  </div>`;
}
function renderEvidencePicker(n, ctx){
  const evs=n.ev||[], files=n.evFiles||[];
  if(!evs.length&&!files.length) return '<div class="preview-empty"><span>◇</span><b>暂无节点证据</b><p>该节点未登记截图或附件。</p></div>';
  return `<div class="asset-picker"><div class="sec-lab">节点证据与附件</div>${evs.map((ev,i)=>`<button class="asset-row ${activePreview&&activePreview.kind==='evidence'&&activePreview.idx===i?'on':''}" onclick="previewNodeEv(${ctx.ri},${ctx.ni},${i})"><span class="asset-icon">▧</span><span><b>${esc(ev.title)}</b><small>${esc(ev.id||'过程证据')}</small></span><i>预览 ›</i></button>`).join('')}${files.map((f,i)=>`<button class="asset-row ${activePreview&&activePreview.kind==='file'&&activePreview.idx===i?'on':''}" onclick="previewNodeFile(${ctx.ri},${ctx.ni},${i})"><span class="asset-icon">${fileIconOf(f[0])}</span><span><b>${esc(f[0])}</b><small>${esc(f[1])}</small></span><i>预览 ›</i></button>`).join('')}</div>`;
}
function renderAssetPreview(t,run,n,isLatest){
  if(!activePreview) return '<div class="preview-empty"><span>⌁</span><b>选择证据或附件</b><p>内容将在当前工作区预览，不会打开弹窗。</p></div>';
  if(activePreview.kind==='evidence'){
    const ev=(n.ev||[])[activePreview.idx]; if(!ev) return '';
    return `<div class="asset-preview"><div class="preview-title"><div><span class="tiny muted">节点证据 · R#${run.no}</span><h4>${esc(ev.title)}</h4></div>${ev.id?`<span class="hash">${esc(ev.id)}</span>`:''}</div><div class="evidence-canvas ${ev.type}"><div class="ev-bar"><span class="ev-dots">● ● ●</span>${esc(ev.title)}</div>${ev.lines.map(l=>`<div class="ev-ln">${esc(l)}</div>`).join('')}</div><div class="preview-meta"><span>所属节点：${esc(n.n)}</span><span>WORM 防篡改留痕</span></div></div>`;
  }
  const f=(n.evFiles||[])[activePreview.idx]; if(!f) return '';
  return `<div class="asset-preview"><div class="preview-title"><div><span class="tiny muted">节点附件 · R#${run.no}</span><h4>${esc(f[0])}</h4></div><span class="tag">${esc(f[1])}</span></div><div class="file-canvas"><span>${fileIconOf(f[0])}</span><b>${esc(f[0])}</b><p>文件内容使用与原文相同的授权预览容器；本原型仅展示元信息。</p></div><div class="file-acts"><button class="btn sm" onclick="toast('附件下载（演示）','ok')">下载附件</button>${canHandle(t,isLatest)?overrideBtn('ev',activePreview.idx,false):''}</div></div>`;
}
function renderNodeWorkspace(t,run,isLatest,parseIdx,ri){
  if(activeNode<0||activeNode>=run.nodes.length){
    activeNode=run.nodes.findIndex(n=>['fail','review','run'].includes(n.st));
    if(activeNode<0) activeNode=parseIdx>=0?parseIdx:run.nodes.length-1;
  }
  const n=run.nodes[activeNode];
  const hasFields=n.st!=='queued' && ((run.fields||[]).some(f=>f.stage===activeNode) || activeNode===parseIdx);
  const status=n.st==='ok'?'<span class="tag ok">完成</span>':n.st==='run'?'<span class="tag blue"><span class="pulse"></span>执行中</span>':n.st==='fail'?'<span class="tag dan">失败</span>':n.st==='review'?'<span class="tag warn">待人工处理</span>':'<span class="tag">等待</span>';
  return `<div class="task-workbench card">
    <nav class="node-rail" aria-label="节点执行轨迹"><div class="rail-head"><span>节点执行轨迹</span><b>R#${run.no}</b></div>${run.nodes.map((x,i)=>`<button class="rail-node ${i===activeNode?'on':''} ${x.st}" onclick="selectNode(${i})"><span class="rail-dot"></span><span><b>${esc(x.n)}</b><small>${esc(x.d)}</small>${x.subs&&x.subs.length?`<span class="rail-subs">${x.subs.map(s=>`<i>${esc(s)}</i>`).join('')}</span>`:''}</span>${i===parseIdx?'<em>解析</em>':''}</button>`).join('')}</nav>
    <section class="node-workspace"><div class="workspace-head"><div><span class="tiny muted">节点 ${activeNode+1} / ${run.nodes.length}</span><h3>${esc(n.n)}</h3><p>${esc(n.d)}</p></div><div>${status}${activeNode===parseIdx?'<span class="tag acc">解析节点</span>':''}</div></div>${n.err?`<div class="err workspace-error">${esc(n.err)}</div>`:''}
      ${hasFields?renderParsePanel(t,run,isLatest):`<div class="asset-workspace"><div>${renderEvidencePicker(n,{ri,ni:activeNode})}</div><div class="preview-pane">${renderAssetPreview(t,run,n,isLatest)}</div></div>`}
      ${isLatest&&nodeActions(t,n,activeNode)?`<div class="workspace-actions">${nodeActions(t,n,activeNode)}</div>`:''}
    </section>
  </div>`;
}

/* ===== 节点文件操作（全平台通用，样式同 case3 / case5）=====
 * 产出文件的节点：⤓ 下载 / ⤒ 上传 / ↻ 重跑。是否允许上传以 BRD 为准：
 *   NODE_FILES[线路][节点名].upload 为真、且节点待人工处理时可上传，否则上传按钮置灰。
 *   reviewOnly：只在节点待人工处理时显示；requireUpload：上传后才能重跑。 */
function caseMod(t){ return CASES[taskCaseId(t)] || {}; }
/* 各 Case 的节点文件配置在 cases/caseN.js 的 nodeFiles：线路（mode 或 '*'）→ 节点名 → 配置 */
function nodeFile(t, n){ const m = caseMod(t).nodeFiles || {}; return (m[t.mode] || m['*'] || {})[n.n] || null; }
function nodeUploaded(t, ni){ return (t.nodeUploads||{})[ni] || null; }
function nodeActions(t, n, ni){
  const out = c5NeedActions(t, n, ni), cfg = nodeFile(t, n), up = nodeUploaded(t, ni);
  if(cfg && ['ok','fail','review'].includes(n.st) && !(cfg.reviewOnly && n.st!=='review')){
    const canUp = cfg.upload && n.st==='review', upLabel = cfg.upLabel || '上传修正模板';
    if(up) out.push(`<span class="tag ok" title="${esc(up.time)}">已上传 ${esc(up.names.join('、'))}</span>`);
    out.push(`<button class="btn" onclick="downloadNodeFile(${ni})">⤓ ${esc(cfg.dl || '下载模板')}</button>`,
      canUp ? `<label class="btn">⤒ ${esc(upLabel)}<input type="file" class="hidden" accept="${esc(cfg.accept || '.xlsx')}"${cfg.count>1?' multiple':''} onchange="onNodeUpload(${ni},this)"></label>`
            : `<button class="btn" disabled title="${cfg.upload?'节点待人工处理时可上传':'按 BRD 无需上传'}">⤒ ${esc(upLabel)}</button>`);
  }
  return out.join('');
}
function downloadNodeFile(ni){
  const t = T(), run = latestRun(t), cfg = nodeFile(t, run.nodes[ni]); if(!cfg) return;
  const name = cfg.file(t);
  t.ops.unshift({tm:now(), txt:`下载 ${name}（R#${run.no} · ${run.nodes[ni].n}）`});
  audit('下载节点文件', `${t.id} · ${name}`, '任务中心');
  State.save();
  toast(`已下载 ${name}（演示）`,'ok');
  render();
}
function onNodeUpload(ni, input){
  const t = T(), run = latestRun(t), n = run.nodes[ni], cfg = nodeFile(t, n);
  const files = [...input.files], need = cfg.count || 1, ext = cfg.accept || '.xlsx';
  input.value = '';
  const err = files.length!==need ? `请一次选择 ${need} 个文件${cfg.countHint?'（'+cfg.countHint+'）':''}。`
    : files.find(f=>!f.name.toLowerCase().endsWith(ext)) ? `需要 ${ext} 文件。`
    : files.find(f=>!f.size) ? '文件为空，请重新选择。'
    : files.find(f=>f.size>20*1024*1024) ? '文件超过 20 MB，请压缩后重新上传。' : '';
  if(err){ toast(err,'err'); return; }
  if(cfg.continueNext){ confirmContinue(ni, files[0]); return; }
  const names = files.map(f=>f.name);
  t.nodeUploads = Object.assign(t.nodeUploads||{}, {[ni]:{names, time:now()}});
  t.ops.unshift({tm:now(), txt:`${n.n} · 上传 ${names.join('、')}${cfg.after?' · '+cfg.after:''}`});
  addEvidence('operation', t.id, t.uc, `${n.n} · 上传 ${names.join('、')}（erxiao）`);
  audit('节点上传', `${t.id} · ${names.join('、')}`, '任务中心');
  State.save();
  toast(`已上传 ${names.join('、')}${cfg.after?'，'+cfg.after:''}`,'ok');
  render();
}
/* 上传修正文件并从下一节点续跑（Case3：上传修正的导入模板 → 从「导入发票」开始执行） */
let contPicked = null;
function confirmContinue(ni, f){
  const t = T(), run = latestRun(t), cfg = nodeFile(t, run.nodes[ni]), next = run.nodes[ni+1];
  contPicked = {ni, name:f.name, size:f.size};
  openModal('上传修正模板 · 续跑确认', `
    <p class="small" style="margin-bottom:10px">将上传 <b>${esc(f.name)}</b>，接着 <b>R#${run.no}</b> 继续执行：</p>
    <ul class="small" style="padding-left:18px;color:var(--ink-2)">${(cfg.confirmLines?cfg.confirmLines(run.no):[`从「${next?next.n:''}」开始执行`]).map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="doContinue()">上传并续跑</button>`);
}
function doContinue(){
  closeModal();
  const t = T(), run = latestRun(t), f = contPicked; if(!f) return;
  const cfg = nodeFile(t, run.nodes[f.ni]), next = run.nodes[f.ni+1];
  if(run.st==='RUNNING'){ toast('该任务已有执行实例在运行中','warn'); return; }
  t.ops.unshift({tm:now(), txt:`上传修正模板 ${f.name}（替换 R#${run.no} 生成的模板）`});
  addEvidence('operation', t.id, t.uc, `上传修正模板 ${f.name}（erxiao）`);
  audit('上传修正模板', `${t.id} · ${f.name}`, '任务中心');
  if(cfg.afterUpload) cfg.afterUpload(t, f, run.no);
  Object.assign(run.nodes[f.ni], {st:'ok', d:'已上传修正模板 '+f.name, subs:[f.name], evFiles:[[f.name, Math.max(1,Math.round(f.size/1024))+' KB']]});
  delete run.nodes[f.ni].err;
  if(!resumeRun(t.id, f.ni+1, `上传修正模板 · 从「${next?next.n:''}」续跑`)) return;
  contPicked = null; selRun = -1; activeNode = -1;
  toast(`已上传 ${f.name}，R#${run.no} 从「${next?next.n:''}」接着执行`,'ok');
  setTimeout(render, 350);
}

/* ===== Case5 待人工处理：MBPTS PO 为空时在「捕捉PO邮件」节点录入 ID No.（BRD：等待下一次运行继续流程） ===== */
const C5_PO_NODE = 1, C5_DSS_NODE = 2;
const RERUN_NEED = {
  invoice:{what:'按 AWB No. 查询系统库未找到对应进口发票', act:'', node:C5_DSS_NODE, nodeName:'填入DSS导入模板'},
  idno:{what:'诊断仪大表 MBPTS PO 为空，流程已阻断', act:'录入 ID No.', node:C5_PO_NODE, nodeName:'捕捉PO邮件'},
};
function c5Need(t){ return taskCaseId(t)==='case-5' ? RERUN_NEED[t.need] || null : null; }
function c5NeedActions(t, n, ni){
  const need = c5Need(t);
  if(!need || t.need!=='idno' || need.node!==ni || n.st!=='review') return [];
  return [t.supplied ? `<span class="tag ok">已录入 ${esc(t.supplied.text)} · 等待下一次运行继续流程</span>`
    : `<button class="btn primary" onclick="idNoModal()">录入 ID No.</button>`];
}
function formErr(id, msg){ const e=$('#'+id); if(!e) return; e.textContent=msg; e.classList.toggle('hidden',!msg); }
function idNoModal(){
  const t = T(), f = ((latestRun(t)||{}).fields||[]).find(x=>/^ID No\./.test(x.k));
  openModal('录入 ID No.', `
    <div class="fld" style="margin-bottom:6px"><label>ID No.（诊断仪大表 J 列）</label>
      <input id="idNoIn" inputmode="numeric" maxlength="8" placeholder="如 32883" autocomplete="off"></div>
    <p class="tiny muted" style="margin:0 0 8px">当前 ID No.：${esc(f?f.v:'—')}（顶部灰色区无对应 MBPTS PO）</p>
    <p class="consignment-error hidden" id="idNoErr" role="alert"></p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="saveIdNo()">录入 ID No.</button>`);
  $('#idNoIn').focus();
}
function saveIdNo(){
  const t = T(), run = latestRun(t), v = ($('#idNoIn').value||'').trim();
  const f = (run.fields||[]).find(x=>/^ID No\./.test(x.k));
  if(!/^\d{4,8}$/.test(v)){ formErr('idNoErr','ID No. 为 4~8 位数字，请核对诊断仪大表 J 列。'); return; }
  if(f && f.v===v){ formErr('idNoErr',`ID No. ${v} 与当前值相同，请录入 PO 补上后的 ID No.`); return; }
  const old = f ? f.v : '';
  if(f){ f.delta={old:f.v, tm:now(), runNo:run.no}; f.v=v; }
  t.supplied = {kind:'idno', text:'ID No. '+v, time:now()};
  t.ops.unshift({tm:now(), txt:`录入 ID No.：${old?old+' → ':''}${v} · 等待下一次运行继续流程`});
  addEvidence('operation', t.id, t.uc, `录入 ID No. ${v}（erxiao）`);
  audit('录入 ID No.', `${t.id} · ${v}`, '任务中心');
  State.save(); closeModal();
  toast(`已录入 ID No. ${v}，等待下一次运行继续流程`,'ok');
  render();
}

function render(){
  const t = T();
  if(!t || !taskMatch(t)){ $('#view').innerHTML = '<div class="empty">任务不存在或没有查看权限，<a href="tasks.html">返回任务列表</a></div>'; return; }
  /* 重渲染前记住节点轨迹和当前字段列表的位置，避免定位字段后跳回顶部 */
  const railEl = document.querySelector('.node-rail');
  const railTop = railEl ? railEl.scrollTop : 0;
  const sameNode = document.querySelector('.rail-node.on')?.getAttribute('onclick')===`selectNode(${activeNode})`;
  const fieldTop = sameNode ? document.querySelector('.field-list')?.scrollTop||0 : 0;
  const typeLine = taskCaseFilter(t);
  setCrumb(`<a href="tasks.html">任务中心</a> · ${typeLine?`<a href="${taskTypeHref(t)}">${esc(typeLine.label)}</a> · `:''}<b>${t.id}</b>`);
  const st = taskStatus(t);
  const {run, isLatest} = viewingRun(t);
  const latest = latestRun(t);

  const runSwitcher = renderRunSwitcher(t, run, isLatest, latest);
  const viewingBar = t.runs.length > 1 ? renderViewingBar(run, isLatest) : '';

  const ri = isLatest ? -1 : run.no;
  const parseIdx = parseNodeIndex(run);

  $('#view').innerHTML = `
  <div class="task-detail-head card">
    <div class="task-title"><div class="task-back"><a href="${taskTypeHref(t)}">← 返回${typeLine?esc(typeLine.label)+' ':''}任务列表</a><span>${ucTag(t.uc)}</span></div><h2>${t.id}</h2><div class="sub">${esc(t.case)}${t.waybill?' · '+esc(caseMod(t).waybillLabel?caseMod(t).waybillLabel(t):'运单号')+'：'+esc(t.waybill):''} · ${esc(t.src)} · 规则 ${esc(t.rule||'—')}</div></div>
    <div class="task-head-stats"><div><span>当前状态</span>${stageTag(t)}</div><div><span>当前执行</span><b>${latest?`R#${latest.no}`:'尚无执行'}</b></div><div><span>执行次数</span><b>${t.runs.length}</b></div></div>
    <div class="task-primary-actions">
      ${canHandle(t,true)?`<button class="btn" onclick="nodeRerun()" title="从待处理节点接着 R#${latest.no} 执行">↻ 节点重跑</button>
      <button class="btn danger" onclick="rerunAll()" title="新开 R#${latest.no+1} 从头执行">↻ 整单重跑</button>`:''}
    </div>
  </div>

  ${t.waitState?`
  <div class="banner amber"><span class="ic">⇪</span><div class="txt"><b>任务尚未创建执行</b> · 缺少 ${t.waitState.missing.length} 个必需文件：
    <ul style="margin:6px 0 0;padding-left:18px">${t.waitState.missing.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>
    <div class="tiny muted" style="margin-top:4px">上传齐后将生成第一个执行实例 R#1</div></div>
    <div class="act"><button class="btn primary" onclick="uploadModal('${t.id}')">去上传</button></div></div>`:''}
  ${!t.waitState && isLatest && st==='DIFF_PENDING' && c5Need(t)?`
  <div class="banner amber"><span class="ic">!</span><div class="txt"><b>R#${latest.no} 待人工处理</b> · ${esc(c5Need(t).what)}。${!c5Need(t).act?'':t.supplied?`已录入 ${esc(t.supplied.text)}，等待下一次运行继续流程。`:`请在「${esc(c5Need(t).nodeName)}」节点${esc(c5Need(t).act)}。`}</div>
    <div class="act"><button class="btn" onclick="goNode(${c5Need(t).node})">${c5Need(t).act?'前往处理':'查看节点'}</button></div></div>`:''}
  ${!t.waitState && isLatest && st==='DIFF_PENDING' && !c5Need(t)?`
  <div class="banner amber"><span class="ic">≠</span><div class="txt"><b>R#${latest.no} 比对存在差异</b> · 请在下方解析节点核对字段（金色高亮行）。修正取值写入<b>当前生效版本</b>，修正后在右上角选择节点重跑（接着 R#${latest.no} 执行）或整单重跑（新开 R#${latest.no+1}），重跑都会携带修正值。UC34 全场景无人工审批，修正仅作留痕。</div>
    <div class="act"><button class="btn" onclick="scrollToParse()">查看差异字段</button></div></div>`:''}
  ${!t.waitState && isLatest && st==='FAILED'?`
  <div class="banner red"><span class="ic">×</span><div class="txt"><b>R#${latest.no} 执行失败</b> · 失败节点：${esc((latest.nodes.find(n=>n.st==='fail')||{}).n||'')}${t.fixable?'。演示模式下视为源文件已修正，整单重跑将成功并生成新执行实例':''}</div></div>`:''}

  ${runSwitcher}
  ${viewingBar}

  ${run?renderNodeWorkspace(t,run,isLatest,parseIdx,ri):'<div class="card empty"><div class="ei">—</div>等待必需文件上传后创建首个执行实例</div>'}

  <div class="task-secondary-grid one">
    <details class="card task-log"><summary>任务操作日志 <span>${(t.ops||[]).length} 条</span></summary><div class="task-log-body">${(t.ops||[]).map(o=>`<div class="kv"><span class="k">${o.tm}</span><span class="v">${esc(o.txt)}</span></div>`).join('')||'<div class="small muted">暂无操作记录</div>'}</div></details>
  </div>`;
  const newRail = document.querySelector('.node-rail');
  if(newRail && railTop) newRail.scrollTop = railTop;
  const newFields = document.querySelector('.field-list');
  if(newFields && fieldTop) newFields.scrollTop = fieldTop;
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
  toast(f.images?.length?'已展示 BRD 字段定位示例（非当前票原文）':`已定位到${run.files[selectedFile]?run.files[selectedFile].name:'原文'}第 ${pageNo} 页`,'ok');
}

let editing=-1;
function editField(i){
  const t = T(); const {run, isLatest} = viewingRun(t);
  if(!isLatest){ toast('历史执行为只读，请切换到当前执行后修正','warn'); return; }
  if(!canHandle(t, isLatest)){ toast('只有待人工处理的任务可以修正字段','warn'); return; }
  if(editing>=0) { toast('请先完成当前字段修正','warn'); return; }
  editing=i; const f=run.fields[i];
  $(`#fv-${i}`).innerHTML = `<input class="fld-edit" id="fi-${i}" value="${esc(f.v)}">
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn sm primary" onclick="saveField(${i})">保存并留痕（重跑时生效）</button>
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
  t.ops.unshift({tm:now(), txt:`字段修正：${f.k} · R#${run.no} 取值「${f.delta.old} → ${nv}」 · 重跑时携带`});
  addEvidence('operation', t.id, t.uc, `字段修正：${f.k}「${f.delta.old} → ${nv}」（R#${run.no} 版本，erxiao）`);
  audit('修正字段', `${t.id} · ${f.k} · R#${run.no}`, '任务中心');
  toast('修正已保存（留痕），节点重跑或整单重跑时生效','ok');
  render();
}

/* ===== 重跑（右上角，仅待人工处理）：需先在节点上传 / 录入时不能重跑 ===== */
function rerunBlock(t){
  const need = rerunNeed(t) || c5Blocked(t);
  if(need) toast(`请先在「${need.n.n}」节点${need.act}`,'warn');
  return !!need;
}
/* 节点重跑：从第一个失败 / 待人工处理的节点起，接着当前 Run 执行，不新开 Run */
function nodeRerun(){
  const t = T(), run = latestRun(t); if(!run || rerunBlock(t)) return;
  const idx = run.nodes.findIndex(n=>['fail','review'].includes(n.st));
  if(idx<0){ toast('当前执行没有待处理的节点，请用整单重跑','warn'); return; }
  const n = run.nodes[idx];
  openModal('节点重跑确认', `
    <p class="small" style="margin-bottom:12px">将从节点 <b>「${esc(n.n)}」</b> 起，接着 <b>R#${run.no}</b> 继续执行：</p>
    <ul class="small" style="padding-left:18px;color:var(--ink-2)">
      <li>不新开执行实例，「${esc(n.n)}」之前已完成的节点保持原结果</li>
      <li>沿用当前生效的字段值和文件（含本次修正、覆盖）</li>
    </ul>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn primary" onclick="doNodeRerun(${idx})">接着 R#${run.no} 执行</button>`);
}
function doNodeRerun(idx){
  closeModal();
  const t = T(), run = resumeRun(t.id, idx);
  if(!run) return;
  selRun = -1; activeNode = -1;
  toast(`R#${run.no} 已从「${run.nodes[idx].n}」接着执行`,'ok');
  setTimeout(render, 350);
}
/* 整单重跑：新开一个 Run，从头执行全部节点；原 Run 只读归档 */
function rerunAll(){
  const t = T(); const run = latestRun(t); if(!run || rerunBlock(t)) return;
  const txt = rerunText(t);
  openModal('整单重跑确认', `<p class="small">将新开执行实例 <b>R#${run.no+1}</b> 从头执行全部节点，携带当前生效的字段值。${esc(txt.lead||'')}${t.fixable?'<b class="gold">演示模式：视为源文件已修正，将执行成功。</b>':''}<br>R#${run.no} 保持只读归档。</p>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn danger" onclick="doRerun(0,'整单重跑')">新开 R#${run.no+1} 整单重跑</button>`);
}
/* 各 Case 的重跑说明文案（cases/caseN.js rerunText） */
function rerunText(t){ const f = caseMod(t).rerunText; return f ? f(t.mode) : {lead:'', tip:''}; }
/* 待人工处理节点要求先上传、但尚未上传时，返回该节点 */
function rerunNeed(t){
  const run = latestRun(t), ni = run ? run.nodes.findIndex(n=>n.st==='review') : -1;
  if(ni<0) return null;
  const cfg = nodeFile(t, run.nodes[ni]);
  return cfg && cfg.requireUpload && !nodeUploaded(t, ni) ? {ni, n:run.nodes[ni], act:cfg.upLabel||'上传修正模板'} : null;
}
/* Case5 ID No. 未录入 */
function c5Blocked(t){ const need = c5Need(t); return need && need.act && !t.supplied ? {ni:need.node, n:{n:need.nodeName}, act:need.act} : null; }
function goNode(i){ closeModal(); selectNode(i); const el=document.querySelector('.task-workbench'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
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
