/* ===== sharepoint.js · 存档公盘（模拟在线文档库，新标签页打开） =====
 * 全平台通用：各 Case 的 sharepoint.js 完全一致，差异只在 data.js：
 *   buildSharePointTree() —— 按该 Case BRD 存档要求生成的目录树；
 *   SP_SITE —— 站点名称 / 副标题 / 完整留存示例（可选）。
 * 正式版：Portal 导航「Share Point」直接打开存档文件夹；demo 用本页模拟在线公盘的样子。
 * 当前目录记在 URL hash 中，浏览器前进 / 后退可用。
 */
const SP_TREE = buildSharePointTree();
const SITE = Object.assign({name:'MBPTS 流程存档', sub:'', logo:'MB'}, typeof SP_SITE==='object' ? SP_SITE : {});
const LIB = '文档';
let spQuery = '', spSel = '';

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function toast(msg){
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),300)},2400);
}
function spPath(){ return location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent); }
function spGo(path){ spQuery=''; spSel=''; location.hash = '/'+path.map(encodeURIComponent).join('/'); }
function spNodeAt(path){
  let n = SP_TREE;
  for(const name of path){
    const next = (n.children||[]).find(x=>x.kind==='folder' && x.name===name);
    if(!next) return null;
    n = next;
  }
  return n;
}
function spCount(node){ return (node.children||[]).reduce((n,c)=>n + (c.kind==='file' ? 1 : spCount(c)), 0); }
function spIcon(x){
  if(x.kind==='folder') return '<span class="ic folder"></span>';
  if(/\.xlsx?$/i.test(x.name)) return '<span class="ic xls">X</span>';
  if(/\.pdf$/i.test(x.name)) return '<span class="ic pdf">P</span>';
  if(/\.docx?$/i.test(x.name)) return '<span class="ic doc">W</span>';
  if(/\.(png|jpe?g)$/i.test(x.name)) return '<span class="ic img">▣</span>';
  return '<span class="ic file">·</span>';
}
/* 修改时间按在线文档库的写法显示：2026年8月20日 12:00 */
function spTime(t){
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(t||'');
  return m ? `${m[1]}年${+m[2]}月${+m[3]}日 ${m[4]}` : '—';
}
/* 修改者：流程归档的文件为 MBPTS RPA；业务维护的文件在目录树中以 owner 标注 */
function spOwner(x){ return x.owner || 'MBPTS RPA'; }
function spAct(path, x){
  return x.kind==='folder' ? `spGo(${esc(JSON.stringify(path.concat(x.name)))})` : `spPick(${esc(JSON.stringify(x.name))})`;
}

function render(){
  const path = spPath(), cur = spNodeAt(path);
  if(!cur){ spGo([]); return; }
  const q = spQuery.trim().toLowerCase();
  const list = (cur.children||[]).filter(x=>!q || x.name.toLowerCase().includes(q));
  const sel = spSel && (cur.children||[]).find(x=>x.kind==='file' && x.name===spSel);
  const crumbs = [{n:LIB, p:[]}].concat(path.map((n,i)=>({n, p:path.slice(0,i+1)})));
  const tip = SITE.tip;
  document.getElementById('spApp').innerHTML = `
  <div class="sp-page">
    <header class="suite">
      <button class="waffle" title="应用启动器" onclick="toast('应用启动器（演示）')">⋮⋮⋮</button>
      <span class="brand">SharePoint</span>
      <input class="search" placeholder="搜索此库" aria-label="搜索此库" oninput="spFilter(this.value)" value="${esc(spQuery)}">
      <span class="me" title="erxiao">ER</span>
    </header>
    <div class="site-hd">
      <span class="site-logo">${esc(SITE.logo)}</span>
      <div><div class="site-name">${esc(SITE.name)}</div><div class="site-sub">${esc(SITE.sub)}</div></div>
      <div class="demo-note"><b>本页仅为 DEMO 演示</b><span>正式版点击 Portal「Share Point」将直接跳转到存档文件夹</span></div>
    </div>
    <nav class="site-nav"><a href="#/" class="on">${LIB}</a><a href="javascript:toast('网站内容（演示）')">网站内容</a></nav>
    <div class="sp-body">
      <section class="sp-main">
        <div class="cmdbar">
          <button onclick="toast('新建（演示）')"><span class="i">＋</span>新建</button>
          <button onclick="toast('上传（演示）')"><span class="i">⤒</span>上传</button>
          <button onclick="toast('已复制链接（演示）')"><span class="i">🔗</span>复制链接</button>
          <button onclick="toast('同步到本地文件夹（演示）')"><span class="i">↻</span>同步</button>
          <button onclick="toast('下载（演示）')"><span class="i">⤓</span>下载</button>
          <span class="sp"></span>
          <input class="filter" placeholder="筛选当前文件夹" aria-label="筛选当前文件夹" oninput="spFilter(this.value)" value="${esc(spQuery)}">
        </div>
        <div class="crumb">${crumbs.map((c,i)=>i===crumbs.length-1
          ? `<b>${esc(c.n)}</b>`
          : `<button onclick="spGo(${esc(JSON.stringify(c.p))})">${esc(c.n)}</button><span class="sep">›</span>`).join('')}</div>
        <div class="list">
          <table>
            <thead><tr><th style="width:50%">名称</th><th>修改时间</th><th>修改者</th><th style="text-align:right">文件大小</th></tr></thead>
            <tbody>${list.length ? list.map(x=>`<tr class="row ${sel&&sel.name===x.name?'sel':''}" onclick="${spAct(path,x)}">
              <td><span class="name">${spIcon(x)}<span>${esc(x.name)}</span></span></td>
              <td>${esc(spTime(x.time))}</td>
              <td>${esc(spOwner(x))}</td>
              <td style="text-align:right">${x.kind==='folder' ? spCount(x)+' 个项目' : esc(x.size)}</td>
            </tr>`).join('') : `<tr><td colspan="4" class="empty">${q?'没有匹配的文件或文件夹':'此文件夹为空'}</td></tr>`}</tbody>
          </table>
        </div>
        <div class="foot">${(cur.children||[]).length} 个项目 · 本库共 ${spCount(SP_TREE)} 个文件${tip&&tip.path?` · ${esc(tip.text||'完整留存示例')}：<button class="tip-link" onclick="spGo(${esc(JSON.stringify(tip.path))})">${esc(tip.path.join(' › '))}</button>`:''}</div>
      </section>
      ${sel ? renderPane(path, sel) : ''}
    </div>
  </div>`;
}
/* 年度运行记录等表格文件：文件节点或 SP_SITE 提供 records 取数函数时，详情窗格直接展示表格内容 */
function renderRecords(f){
  const src = typeof f.records==='function' ? f.records
    : f.records && typeof SP_SITE==='object' && typeof SP_SITE.records==='function' ? SP_SITE.records : null;
  if(!src) return '';
  const {cols, rows, note} = src();
  return `<div class="records"><div class="records-hd">${esc(f.name)} · ${rows.length} 行</div>
    <div class="records-wrap"><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}">暂无运行记录</td></tr>`}</tbody></table></div>
    ${note?`<p class="records-note">${esc(note)}</p>`:''}</div>`;
}
function renderPane(path, f){
  const rec = renderRecords(f);
  return `<aside class="pane ${rec?'wide':''}" aria-label="详细信息">
    <div class="pane-hd">${spIcon(f)}<h3>${esc(f.name)}</h3><button class="x" title="关闭" onclick="spPick('')">×</button></div>
    <div class="pane-bd">
      ${rec || '<div class="preview">文件预览（演示）<br>正式版在此打开存档的原文件</div>'}
      <dl>
        <dt>位置</dt><dd>${esc([LIB].concat(path).join(' › '))}</dd>
        <dt>类型</dt><dd>${esc(f.type)}</dd>
        <dt>文件大小</dt><dd>${esc(f.size)}</dd>
        <dt>修改时间</dt><dd>${esc(spTime(f.time))}</dd>
        <dt>修改者</dt><dd>${esc(spOwner(f))}</dd>
      </dl>
    </div>
    <div class="pane-acts">
      <button class="pri" onclick="toast('打开文件（演示）')">打开</button>
      <button onclick="toast('下载文件（演示）')">下载</button>
      <button onclick="toast('已复制链接（演示）')">复制链接</button>
    </div>
  </aside>`;
}
function spPick(name){ spSel = name; render(); }
/* 两个搜索框共用同一关键词；重绘后把光标放回正在输入的那个框 */
let spFocus = '.filter';
function spFilter(v){
  spQuery = v; render();
  const box = document.querySelector(spFocus);
  if(box){ box.focus(); box.setSelectionRange(v.length, v.length); }
}
document.addEventListener('focusin', e=>{ if(e.target.matches('.search, .filter')) spFocus = e.target.matches('.search') ? '.search' : '.filter'; });
window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', render);
