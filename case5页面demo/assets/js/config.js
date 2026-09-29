/* ===== config.js · 配置中心 =====
 * 与邮件中心同一套规则与展示：Case 标题在表格外（命名取自 core.js CASE_LINES），
 * 每个 Case 一张表，行内「查看 / 上传」。上传仅校验文件名与大小，内容解析未接入。
 */
let cfgError = '';   // 最近一次上传校验错误
function resetCenterFilters(){}

function cfgConfigured(c){ return !!c.upFile; }
function render(){
  const items = State.cfgItems;
  const done = items.filter(cfgConfigured).length;
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>配置中心</h2><div class="sub">按 Case 管理导入模板与对应关系表。</div></div>
  </div>
  ${centerContext()}
  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">模板配置</h3>
        <p class="sec-sub">上传后作为该线路的生效版本，任务执行时按此模板生成 DSS 导入文件，在 Portal 上供下载 · 共 ${items.length} 项，${done} 项本地已替换</p></div>
    </div>
    ${visibleCaseLines().map(renderCfgCase).join('')}
    ${cfgError?`<p class="consignment-error" role="alert">${esc(cfgError)}</p>`:''}
    <p class="center-note">演示文件仅保存在当前浏览器，只校验文件名与大小；模板内容解析与 RPA 尚未接入。</p>
  </div>
  ${renderSharepoint()}`;
  bindCfgUploads();
}

function renderCfgCase(g){
  const rs = State.cfgItems.filter(c=>c.line===g.line);
  return `<section class="case-group">
    <div class="case-group-hd">
      <h4>${esc(g.label)}</h4>
      <span>${rs.length} 项配置</span>
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>配置项</th><th>当前文件</th><th style="text-align:center">版本</th><th>更新时间</th><th style="text-align:center">状态</th><th></th></tr></thead>
        <tbody>${rs.length ? rs.map(cfgRow).join('')
          : '<tr><td colspan="6"><div class="empty"><div class="ei">∅</div>这条线路还没有配置项</div></td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function cfgRow(c){
  const replaced = cfgConfigured(c);
  return `<tr>
      <td><b>${esc(c.name)}</b><div class="tiny muted">${esc(c.desc)}</div></td>
      <td class="small">${esc(replaced?c.upFile:c.file)}</td>
      <td style="text-align:center"><span class="tag${replaced?' acc':''}">v${c.ver}.0</span></td>
      <td class="small muted">${esc(c.time)}</td>
      <td style="text-align:center">${replaced?'<span class="tag ok">已替换</span>':'<span class="tag">平台默认</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" onclick="cfgPreview('${c.id}')">查看</button>
        <button class="btn sm primary" data-up="${c.id}">上传</button>
        <input type="file" class="hidden" data-in="${c.id}" accept="${esc(c.accept)}">
      </td>
    </tr>`;
}

/* 查看：展示模板列结构与当前生效文件（演示信息，不解析实际内容） */
function cfgPreview(id){
  const c = State.cfgItem(id); if(!c) return;
  openDrawer(esc(c.name), `
    <dl class="center-detail">
      <div><dt>当前文件</dt><dd>${esc(cfgConfigured(c)?c.upFile:c.file)}</dd></div>
      <div><dt>所属线路</dt><dd>${esc(lineLabel(c.line))}</dd></div>
      <div><dt>版本</dt><dd>v${c.ver}.0 · ${esc(c.time)}</dd></div>
      <div><dt>用途</dt><dd>${esc(c.desc)}</dd></div>
    </dl>
    <div class="sec-lab">模板列结构</div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th style="width:52px">列</th><th>字段名</th></tr></thead>
      <tbody>${c.cols.map((x,i)=>`<tr><td class="small muted">${String.fromCharCode(65+i)}</td><td>${esc(x)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="center-note">列结构按 BRD 标注整理，仅用于核对；上传新模板不会改变此处列定义。</p>`);
}

/* 上传：校验扩展名与大小后记录文件名与时间，版本号 +1 */
function bindCfgUploads(){
  document.querySelectorAll('[data-up]').forEach(btn=>{
    const id = btn.dataset.up;
    const input = document.querySelector(`[data-in="${id}"]`);
    if(!input) return;
    btn.onclick = ()=>{ cfgError=''; input.click(); };
    input.onchange = e=>{
      const file = e.target.files[0];
      if(!file) return;
      const err = validateCfgFile(file, State.cfgItem(id));
      if(err){ cfgError = err; render(); return; }
      const c = State.cfgItem(id);
      c.upFile = file.name; c.ver = (c.ver||1) + 1; c.time = now();
      audit('替换配置模板', `${c.name} · ${file.name} · v${c.ver}.0`, '配置中心');
      State.save();
      toast(`${c.name} 已更新为 ${file.name}`,'ok');
      render();
    };
  });
}
function validateCfgFile(file, c){
  if(!file || !c) return '请重新选择文件。';
  if(!file.size) return '文件为空，请重新选择。';
  if(file.size > 20*1024*1024) return '文件超过本 demo 的 20 MB 限制。';
  const ext = (c.accept||'.xlsx').toLowerCase();
  if(!file.name.toLowerCase().endsWith(ext)) return `${c.name} 需要 ${ext} 文件，当前选择的是「${file.name}」。`;
  return '';
}

/* 共享盘监听：触发方式之一。Case5 走定时调度与邮件监听，不涉及公盘抓取，字段留空置灰 */
function renderSharepoint(){
  return `<div class="center-sec">
    <h3 class="sec-title">共享盘监听</h3>
    <div class="card card-p sp-readonly">
      <div class="kv"><span class="k">监听目录</span><span class="v"><input class="search" style="min-width:0;width:230px;padding:4px 8px" value="${esc(State.sharepoint.dir)}" disabled></span></div>
      <div class="kv"><span class="k">触发模板文件</span><span class="v"><input class="search" style="min-width:0;width:230px;padding:4px 8px" value="${esc(State.sharepoint.table)}" disabled></span></div>
      <div class="kv"><span class="k">轮询间隔（分钟）</span><span class="v"><input class="search" style="min-width:0;width:70px;padding:4px 8px" value="${esc(State.sharepoint.poll)}" disabled></span></div>
      <div class="kv"><span class="k">文件指纹去重</span><span class="v"><span class="tag">开启</span> <span class="muted small">（重复文件不重复触发）</span></span></div>
      <div style="margin-top:12px"><button class="btn sm primary" disabled>保存配置</button></div>
    </div>
  </div>`;
}

document.addEventListener('DOMContentLoaded', render);
