/* ===== sharepoint.js · Share Point（过程文件归档） =====
 * 云文档式浏览：左侧目录树 + 右侧文件列表 + 面包屑，可逐层点进去查看文件。
 * 目录结构由 data.js 的 buildSharePointTree() 按 BRD 命名规则生成。
 */
const SP_TREE = buildSharePointTree();
let spPath = [];      // 当前所在层级的目录名数组（不含根）
let spQuery = '';     // 当前目录内的搜索词
let spOpen = {};      // 目录树展开状态，键为路径字符串

function spKey(path){ return path.join('/'); }
function spNodeAt(path){
  let n = SP_TREE;
  for(const name of path){
    const next = (n.children||[]).find(x=>x.kind==='folder' && x.name===name);
    if(!next) return SP_TREE;
    n = next;
  }
  return n;
}
function spIcon(node){
  if(node.kind==='folder') return '<span class="sp-ic folder">▣</span>';
  if(/\.xlsx?$/i.test(node.name)) return '<span class="sp-ic xls">X</span>';
  if(/\.pdf$/i.test(node.name)) return '<span class="sp-ic pdf">P</span>';
  return '<span class="sp-ic">·</span>';
}
/* 统计目录下的文件总数（含子目录），用于列表里显示文件夹内容量 */
function spCount(node){
  return (node.children||[]).reduce((n,c)=>n + (c.kind==='file' ? 1 : spCount(c)), 0);
}
function spTime(t){ return t || '—'; }
/* 目录树里的时间只保留「月-日」，避免挤占文件夹名 */
function spShort(t){ return t ? t.slice(5,10) : ''; }

function spGo(path){ spPath = path; spQuery = ''; spOpen[spKey(path)] = true; render(); }
function spUp(){ if(spPath.length) spGo(spPath.slice(0,-1)); }
function spToggle(key, ev){
  if(ev) ev.stopPropagation();
  spOpen[key] = !spOpen[key];
  render();
}

/* ---------- 左侧目录树 ---------- */
function spTreeNode(node, path){
  const key = spKey(path);
  const dirs = (node.children||[]).filter(x=>x.kind==='folder');
  const isOpen = !!spOpen[key];
  const isCur = key === spKey(spPath);
  return `<li>
    <div class="sp-tw ${isCur?'on':''}">
      ${dirs.length
        ? `<button class="sp-caret" onclick="spToggle('${esc(key)}',event)" aria-label="${isOpen?'收起':'展开'}">${isOpen?'▾':'▸'}</button>`
        : '<span class="sp-caret"></span>'}
      <button class="sp-tn" onclick="spGo(${JSON.stringify(path).replace(/"/g,'&quot;')})"
        title="${esc(node.name)} · ${spCount(node)} 个文件 · 最近修改 ${esc(spTime(node.time))}">
        ${spIcon(node)}<span>${esc(node.name)}</span><i>${esc(spShort(node.time))}</i>
      </button>
    </div>
    ${dirs.length && isOpen
      ? `<ul>${dirs.map(d=>spTreeNode(d, path.concat(d.name))).join('')}</ul>`
      : ''}
  </li>`;
}

/* ---------- 面包屑 ---------- */
function spCrumb(){
  const parts = [{n:SP_TREE.name, p:[]}].concat(spPath.map((n,i)=>({n, p:spPath.slice(0,i+1)})));
  return parts.map((x,i)=>{
    const last = i===parts.length-1;
    return last
      ? `<b>${esc(x.n)}</b>`
      : `<button onclick="spGo(${JSON.stringify(x.p).replace(/"/g,'&quot;')})">${esc(x.n)}</button><span class="sp-sep">›</span>`;
  }).join('');
}

/* ---------- 文件列表 ---------- */
function spRows(){
  const cur = spNodeAt(spPath);
  const q = spQuery.trim().toLowerCase();
  /* 顺序沿用 data.js 的 spCmp（目录在前 · 修改日期倒序），与目录树保持一致 */
  const list = (cur.children||[]).filter(x=>!q || x.name.toLowerCase().includes(q));
  if(!list.length) return `<tr><td colspan="4"><div class="empty"><div class="ei">▣</div>${q?'没有匹配的文件或文件夹':'这个文件夹是空的'}</div></td></tr>`;
  return list.map(x=>{
    const path = spPath.concat(x.name);
    const act = x.kind==='folder'
      ? `spGo(${JSON.stringify(path).replace(/"/g,'&quot;')})`
      : `spPreview(${JSON.stringify(spPath).replace(/"/g,'&quot;')},'${esc(x.name)}')`;
    return `<tr class="click" onclick="${act}">
      <td><span class="sp-name">${spIcon(x)}<span>${esc(x.name)}</span></span></td>
      <td class="small muted">${esc(spTime(x.time))}</td>
      <td class="small">${x.kind==='folder'?'文件夹':esc(x.type)}</td>
      <td class="small muted" style="text-align:right">${x.kind==='folder'?spCount(x)+' 个文件':esc(x.size)}</td>
    </tr>`;
  }).join('');
}

/* ---------- 文件预览 ---------- */
function spPreview(path, name){
  const dir = spNodeAt(path);
  const f = (dir.children||[]).find(x=>x.kind==='file' && x.name===name);
  if(!f) return;
  openDrawer(esc(f.name), `
    <dl class="center-detail">
      <div><dt>所在文件夹</dt><dd>${esc([SP_TREE.name].concat(path).join(' / '))}</dd></div>
      <div><dt>类型</dt><dd>${esc(f.type)}</dd></div>
      <div><dt>大小</dt><dd>${esc(f.size)}</dd></div>
      <div><dt>修改时间</dt><dd>${esc(f.time)}</dd></div>
    </dl>
    <div class="sp-canvas">${spIcon(f)}<b>${esc(f.name)}</b>
      <p>文件使用与任务详情相同的授权预览容器；本原型仅展示元信息。</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn sm" onclick="toast('文件下载（演示）','ok')">下载</button>
      <button class="btn sm" onclick="toast('已复制文件路径（演示）','ok')">复制路径</button>
    </div>
    <p class="center-note">文件按 BRD 的文件夹命名规则归档，可按 Case 与提单号追溯。</p>`);
}

function render(){
  const cur = spNodeAt(spPath);
  const dirs = (SP_TREE.children||[]).filter(x=>x.kind==='folder');
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>Share Point</h2><div class="sub">按 Case 与提单号归档的过程文件。</div></div>
    <span class="tag">只读演示</span>
  </div>
  ${centerContext()}
  <div class="sp-explorer card">
    <nav class="sp-tree" aria-label="目录树">
      <div class="sp-tree-hd">文件夹</div>
      <ul>${spTreeNode(SP_TREE, [])}</ul>
    </nav>
    <section class="sp-main">
      <div class="sp-bar">
        <button class="btn sm ghost" onclick="spUp()" ${spPath.length?'':'disabled'} title="返回上一层">↑</button>
        <div class="sp-crumb">${spCrumb()}</div>
        <input class="search" id="spSearch" placeholder="在当前文件夹中搜索" value="${esc(spQuery)}">
      </div>
      <div class="tblwrap sp-list">
        <table class="tbl">
          <thead><tr><th>名称</th><th>修改日期</th><th>类型</th><th style="text-align:right">大小</th></tr></thead>
          <tbody>${spRows()}</tbody>
        </table>
      </div>
      <div class="sp-foot">
        <span>${(cur.children||[]).length} 个项目</span>
        <span>共 ${dirs.map(d=>spCount(d)).reduce((a,b)=>a+b,0)} 个文件</span>
      </div>
    </section>
  </div>`;
  const s = $('#spSearch');
  if(s) s.oninput = e=>{ spQuery = e.target.value; const v = spQuery;
    $('#view').querySelector('.sp-list tbody').innerHTML = spRows();
    $('#spSearch').value = v; };
}

document.addEventListener('DOMContentLoaded', ()=>{
  spOpen[spKey([])] = true;
  render();
});
