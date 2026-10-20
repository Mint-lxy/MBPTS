/* ===== config.js · 配置中心（全权限版：Case1 ~ 5） =====
 * 三个大类：模板配置 / 映射表配置 / 手工配置表，各一张表，「关联」列标出所属子 Case。
 * 手工配置表（kind='manual'，如 Case5 收货记录表）与映射表同一套操作：下载当前版本、上传新版本、点行看版本与列结构。
 * 右上角 Case 下拉（Case1 ~ 5，无「全部」，同邮件中心），一次只看一个 Case 的配置项（URL ?case=）。
 * 行内操作：模板 查看 / 上传 / 删除。
 * 映射表（仿开发侧整体理解 demo）：配置项固定，不在线编辑，只能上传新版本——每上传一次版本号 +1，最新版本生效，旧版本保留可下载；
 *   点一行打开详情：全部版本 + 列结构。上传只校验扩展名、大小、非空；表头须与列结构一致（原型不解析文件，仅提示）。
 */
let cfgError = '';   // 最近一次上传校验错误
const CFG_CASE_IDS = UC34_CASES.filter(c=>ALLOWED_CASE_IDS.includes(c.id)).map(c=>c.id);
let cfgCase = CFG_CASE_IDS.includes(qp('case')) ? qp('case') : CFG_CASE_IDS[0];
function resetCenterFilters(){}

function cfgConfigured(c){ return !!c.upFile; }
/* 更新时间只显示日期：「YYYY-MM-DD HH:mm」取日期；上传 / 编辑后记录的「MM-DD HH:mm」补当前年份 */
function cfgDate(t){ const v=String(t||''); return /^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):/^\d{2}-\d{2}/.test(v)?new Date().getFullYear()+'-'+v.slice(0,5):v||'—'; }
/* 未标 kind 的配置项（Case3 / Case5）按模板处理 */
function cfgOf(kind){ return State.cfgItems.filter(c=>(c.kind||'template')===kind); }

/* 关联：配置项对应的子 Case（与任务中心 / 邮件中心同名）。模板按线路推导；映射表按适用范围推导 */
const MODE_WORD = {air:'空运', sea:'海运', glc:'GLC', mbusi:'MBUSI', mbplap:'MBPLAP', xentry:'X-entry'};
function tplRel(c){
  const g = CASE_LINES.find(x=>x.line===c.line); if(!g) return [];
  const mode = g.line.replace(/^case\d-/,'');
  return CASE_FILTERS.filter(f=>f.caseId===g.caseId && (g.caseId==='case-1'||f.mode===mode));
}
function mapRel(c){
  const fs = CASE_FILTERS.filter(f=>f.caseId===c.caseId), scope = String(c.scope||'');
  const hit = fs.filter(f=>scope.includes(MODE_WORD[f.mode]));
  return hit.length ? hit : fs;
}
const relPicked = rel=>rel.some(f=>f.caseId===cfgCase);
const relOrder = rel=>Math.min(...rel.map(f=>CASE_FILTERS.indexOf(f)), 99);
function relTags(rel){ return rel.map(f=>`<span class="tag gold">${esc(f.label)}</span>`).join(' '); }
/* 映射表版本（演示）：有 BRD 来源文件的已上传，其余「未上传」 */
const MAP_DEMO_VERSIONS = {
  'map-c1-header':[{no:1, file:'Data base.xlsx', time:'2026-09-21 10:00', by:'erxiao'}],
  'map-c1-package':[{no:1, file:'附表3_Package Type.xlsx', time:'2026-09-21 10:00', by:'erxiao'}],
  'map-c1-transport':[{no:1, file:'Data base.xlsx', time:'2026-09-21 10:00', by:'erxiao'}],
  'map-pdc':[{no:1, file:'地点汇总.xlsx', time:'2026-08-20 09:30', by:'erxiao'}],
  'map-port':[{no:1, file:'IES Port 对应表.xlsx', time:'2026-08-20 09:40', by:'erxiao'},
              {no:2, file:'IES Port 对应表_0902.xlsx', time:'2026-09-02 09:15', by:'erxiao'}],
  'map-c3-pdc':[{no:1, file:'附件1_马来西亚发票提取需求.xlsx', time:'2026-09-21 10:00', by:'erxiao'}],
  'map-c3-email':[{no:1, file:'附件5_Mapping list_Email loop.xlsx', time:'2026-09-21 10:00', by:'erxiao'}],
  'map-c4-pn':[{no:1, file:'PN.xlsx', time:'2026-02-27 10:00', by:'erxiao'}],
  'man-c5-receipt':[{no:1, file:'收货记录表.xlsx', time:'2026-09-27 10:00', by:'erxiao'}],
};
const KIND_NAME = {mapping:'映射表', manual:'手工配置表'};
function mapVersions(c){
  if(!Array.isArray(c.versions)){ c.versions = deepClone(MAP_DEMO_VERSIONS[c.id]||[]); State.save(); }
  return c.versions;
}
const mapLatest = c=>{ const vs = mapVersions(c); return vs.length ? vs[vs.length-1] : null; };
/* 两张表同一套列宽，字段对齐 */
const CFG_COLS = '<colgroup><col style="width:25%"><col style="width:15%"><col style="width:15%"><col style="width:7%"><col style="width:11%"><col style="width:10%"><col style="width:17%"></colgroup>';

function render(){
  /* 只列出所选 Case 的模板与映射表，按子 Case 顺序排列 */
  const tpl = cfgOf('template').filter(c=>relPicked(tplRel(c))).sort((x,y)=>relOrder(tplRel(x))-relOrder(tplRel(y)));
  const byRel = kind=>cfgOf(kind).filter(c=>relPicked(mapRel(c))).sort((x,y)=>relOrder(mapRel(x))-relOrder(mapRel(y)));
  const map = byRel('mapping'), man = byRel('manual');
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>配置中心</h2><div class="sub">按 Case 管理导入模板、映射表与手工配置表。</div></div>
    <label class="home-case-pick">Case
      <select class="pick" id="cfgCasePick">${CFG_CASE_IDS.map(id=>`<option value="${id}" ${cfgCase===id?'selected':''}>${esc(caseLabel(id))}</option>`).join('')}</select>
    </label>
  </div>

  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">模板配置</h3></div>
    </div>
    <div class="tblwrap">
      <table class="tbl cfg-tbl">${CFG_COLS}
        <thead><tr><th>配置项</th><th>关联</th><th>当前文件</th><th style="text-align:center">版本</th><th>更新时间</th><th style="text-align:center">状态</th><th></th></tr></thead>
        <tbody>${tpl.length ? tpl.map(cfgRow).join('')
          : '<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>该 Case 没有模板配置</div></td></tr>'}</tbody>
      </table>
    </div>
    ${cfgError?`<p class="consignment-error" role="alert">${esc(cfgError)}</p>`:''}
  </div>

  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">映射表配置</h3></div>
    </div>
    <div class="tblwrap">
      <table class="tbl cfg-tbl">${CFG_COLS}
        <thead><tr><th>配置项</th><th>关联</th><th>当前文件</th><th style="text-align:center">版本</th><th>更新时间</th><th style="text-align:center">状态</th><th></th></tr></thead>
        <tbody>${map.length ? map.map(mapRow).join('')
          : '<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>该 Case 没有映射表配置</div></td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">手工配置表</h3></div>
    </div>
    <div class="tblwrap">
      <table class="tbl cfg-tbl">${CFG_COLS}
        <thead><tr><th>配置项</th><th>关联</th><th>当前文件</th><th style="text-align:center">版本</th><th>更新时间</th><th style="text-align:center">状态</th><th></th></tr></thead>
        <tbody>${man.length ? man.map(mapRow).join('')
          : '<tr><td colspan="7"><div class="empty"><div class="ei">∅</div>该 Case 没有手工配置表</div></td></tr>'}</tbody>
      </table>
    </div>
  </div>
  <div id="mapInputs" class="hidden">${map.concat(man).map(c=>`<input type="file" data-min="${c.id}" accept="${esc(c.accept||'.xlsx')}">`).join('')}</div>`;
  $('#cfgCasePick').onchange = e=>{ cfgCase = e.target.value; cfgError = ''; history.replaceState(null,'','?case='+cfgCase); render(); };
  bindCfgUploads();
  bindMapUploads();
}

/* 映射表行：只能上传新版本、下载；点行打开详情（版本 + 列结构） */
function mapRow(c){
  const v = mapLatest(c), n = mapVersions(c).length, rel = mapRel(c);
  return `<tr class="click" onclick="mapDetail('${c.id}')">
      <td><b>${esc(c.name)}</b>${rel.length>1?` <span class="tag" title="同一份文件、同一套版本">共用</span>`:''}<div class="tiny muted">${esc(c.desc)}</div></td>
      <td>${relTags(rel)}</td>
      <td class="small">${v?esc(v.file):'—'}</td>
      <td style="text-align:center">${v?`<span class="tag acc">v${v.no}</span>${n>1?`<div class="tiny muted">共 ${n} 版</div>`:''}`:'<span class="muted">—</span>'}</td>
      <td class="small muted">${v?esc(cfgDate(v.time)):'—'}</td>
      <td style="text-align:center">${v?'<span class="tag ok">生效中</span>':'<span class="tag warn">未上传</span>'}</td>
      <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
        <button class="btn sm primary" onclick="mapPickFile('${c.id}')">上传</button>
        ${v?`<button class="btn sm" onclick="mapDownload('${c.id}',${v.no})">下载</button>`:''}
      </td>
    </tr>`;
}
/* 下载某个版本（演示：只记录，不生成文件） */
function mapDownload(id, no){
  const c = State.cfgItem(id), v = c && mapVersions(c).find(x=>x.no===no); if(!v) return;
  audit('下载'+KIND_NAME[c.kind], `${c.name} · v${v.no} · ${v.file}`, '配置中心');
  toast(`已下载 ${v.file}（v${v.no}，演示）`, 'ok');
}
/* 详情：全部版本（新的在上，最新生效）+ 列结构 */
function mapDetail(id){
  const c = State.cfgItem(id); if(!c) return;
  const vs = mapVersions(c).slice().reverse(), latest = mapLatest(c), rel = mapRel(c);
  const sheets = c.sheets || (c.cols ? [{sheet:'列结构', cols:c.cols}] : []);
  openDrawer(esc(c.name), `
    <dl class="center-detail">
      <div><dt>类型</dt><dd>${KIND_NAME[c.kind]}</dd></div>
      <div><dt>关联</dt><dd>${rel.map(f=>esc(f.label)).join('；')}${rel.length>1?'（共用同一份文件和版本）':''}</dd></div>
      <div><dt>用途</dt><dd>${esc(c.desc)}</dd></div>
      <div><dt>文件格式</dt><dd>${esc(c.accept||'.xlsx')} · 不超过 20 MB</dd></div>
    </dl>
    <div class="sec-lab">版本 · ${vs.length} 个${latest?` · 当前生效 v${latest.no}`:''}</div>
    ${vs.length?`<div class="tblwrap"><table class="tbl"><thead><tr><th>版本</th><th>文件</th><th>上传时间</th><th>上传人</th><th></th></tr></thead>
      <tbody>${vs.map(v=>`<tr><td><span class="tag ${v===latest?'acc':''}">v${v.no}</span>${v===latest?' <span class="tag ok">生效中</span>':''}</td>
        <td class="small">${esc(v.file)}</td><td class="small muted">${esc(cfgDate(v.time))}</td><td class="small">${esc(v.by||'—')}</td>
        <td style="text-align:right"><button class="btn sm" onclick="mapDownload('${c.id}',${v.no})">下载</button></td></tr>`).join('')}</tbody></table></div>`
      :'<div class="card center-empty"><p>还没有上传过文件，后续任务取不到这个配置。</p></div>'}
    ${sheets.map(sh=>`<div class="sec-lab">${esc(sh.sheet)} · ${sh.cols.length} 列</div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th style="width:52px">列</th><th>字段名</th></tr></thead>
      <tbody>${sh.cols.map((x,i)=>`<tr><td class="small muted">${cfgColName(i)}</td><td>${esc(x)}</td></tr>`).join('')}</tbody>
    </table></div>`).join('')}
    <p class="center-note">${sheets.length?`上传的${KIND_NAME[c.kind]}每个 sheet 的表头须与上面的列结构完全一致，否则拒绝。`:'BRD 未给出该文件的列结构，以上传的文件为准。'}</p>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="closeModal();mapPickFile('${c.id}')">上传新版本</button></div>`);
}
/* 上传：校验扩展名与大小，生成新版本（版本号 = 当前最大 + 1） */
function mapPickFile(id){ cfgError=''; const input = document.querySelector(`[data-min="${id}"]`); if(input) input.click(); }
function bindMapUploads(){
  document.querySelectorAll('[data-min]').forEach(input=>{
    input.onchange = e=>{
      const file = e.target.files[0], c = State.cfgItem(input.dataset.min);
      e.target.value = '';
      if(!file || !c) return;
      const err = validateCfgFile(file, c);
      if(err){ cfgError = err; render(); return; }
      const vs = mapVersions(c), no = vs.reduce((m,v)=>Math.max(m,v.no),0) + 1;
      vs.push({no, file:file.name, time:new Date().getFullYear()+'-'+now(), by:'erxiao'});
      audit('上传'+KIND_NAME[c.kind], `${c.name} · ${file.name} · v${no}`, '配置中心');
      State.save();
      toast(`${c.name} 已上传为 v${no}，后续任务使用新版本`,'ok');
      render();
    };
  });
}
function cfgRow(c){
  const replaced = cfgConfigured(c);
  return `<tr>
      <td><b>${esc(c.name)}</b><div class="tiny muted">${esc(c.desc)}</div></td>
      <td>${relTags(tplRel(c))}</td>
      <td class="small">${esc(replaced?c.upFile:c.file)}</td>
      <td style="text-align:center"><span class="tag acc">v${c.ver}</span></td>
      <td class="small muted">${esc(cfgDate(c.time))}</td>
      <td style="text-align:center">${replaced?'<span class="tag ok">已替换</span>':'<span class="tag">平台默认</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" onclick="cfgPreview('${c.id}')">查看</button>
        <button class="btn sm primary" data-up="${c.id}">上传</button>
        <button class="btn sm del" onclick="cfgDelete('${c.id}')">删除</button>
        <input type="file" class="hidden" data-in="${c.id}" accept="${esc(c.accept)}">
      </td>
    </tr>`;
}

/* 删除配置项：二次确认后整行移除，可用侧栏「重置演示数据」恢复 */
function cfgDelete(id){
  const c = State.cfgItem(id); if(!c) return;
  openModal('删除配置项', `
    <p class="small" style="margin-bottom:10px">将删除配置项 <b>${esc(c.name)}</b>${c.scope?`（适用 ${esc(c.scope)}）`:''}：</p>
    <ul class="small" style="padding-left:18px;color:var(--ink-2)">
      <li>${c.kind==='mapping'?`当前 ${(c.rows||[]).length} 条映射`:`当前文件 ${esc(cfgConfigured(c)?c.upFile:c.file)}`} 及其版本记录一并移除</li>
      <li>删除后该项不再出现在配置中心，流程取值将失去依据</li>
      <li>演示环境可用侧栏「重置演示数据」恢复</li>
    </ul>`,
    `<button class="btn" onclick="closeModal()">取消</button>
     <button class="btn danger" onclick="confirmCfgDelete('${c.id}')">确认删除</button>`);
}
function confirmCfgDelete(id){
  const i = State.cfgItems.findIndex(c=>c.id===id);
  if(i < 0){ closeModal(); return; }
  const c = State.cfgItems[i];
  State.cfgItems.splice(i, 1);
  audit('删除配置项', `${c.name}${c.scope?' · '+c.scope:''}`, '配置中心');
  State.save();
  closeModal();
  toast(`${c.name} 已删除`, 'warn');
  cfgError = '';
  render();
}

/* Excel 列号：0 → A，25 → Z，26 → AA */
function cfgColName(i){ let s=''; for(let n=i+1;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
/* 查看：展示模板列结构与当前生效文件（演示信息，不解析实际内容） */
function cfgPreview(id){
  const c = State.cfgItem(id); if(!c) return;
  openDrawer(esc(c.name), `
    <dl class="center-detail">
      <div><dt>当前文件</dt><dd>${esc(cfgConfigured(c)?c.upFile:c.file)}</dd></div>
      <div><dt>所属线路</dt><dd>${esc(lineLabel(c.line))}</dd></div>
      <div><dt>版本</dt><dd>v${c.ver} · ${esc(cfgDate(c.time))}</dd></div>
      <div><dt>用途</dt><dd>${esc(c.desc)}</dd></div>
    </dl>
    ${(c.sheets||(c.cols?[{sheet:'模板列结构',cols:c.cols}]:[])).map(s=>`<div class="sec-lab">${esc(s.sheet)} · ${s.cols.length} 列</div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th style="width:52px">列</th><th>字段名</th></tr></thead>
      <tbody>${s.cols.map((x,i)=>`<tr><td class="small muted">${c.accept==='.docx'?i+1:cfgColName(i)}</td><td>${esc(x)}</td></tr>`).join('')}</tbody>
    </table></div>`).join('')}
    <p class="center-note">${c.sheets||c.cols?'列结构按 BRD 标注整理，仅用于核对；上传新模板不会改变此处列定义。':'BRD 未给出该文件的列结构，以业务上传的文件为准。'}</p>`);
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
      audit('替换配置模板', `${c.name} · ${file.name} · v${c.ver}`, '配置中心');
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

document.addEventListener('DOMContentLoaded', render);
