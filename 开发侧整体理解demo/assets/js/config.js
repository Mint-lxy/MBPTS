/* ===== config.js · 配置中心（按 Case 查看；一次只看一个 Case） =====
 * 每个 Case 有哪些模板配置、映射表配置是写死的（config_file 种子），页面不能增删，也不能在线编辑。
 * 只能上传：每上传一次生成一个版本（config_file_version），版本号 +1，最新版本生效，旧版本保留可下载。
 * 点某一项打开详情：列出全部版本（可逐个下载）和列结构。
 * 上传只校验扩展名、大小、非空；映射表的表头校验（config_file_column）原型不解析文件，仅提示。
 */
/* Case 均为业务 Case（core.js UC34_CASES，Case2a 欧线、Case2b 美线分开） */
const CFG_CASE_IDS = visibleBizCases().map(c=>c.id);
let cfgCase = CFG_CASE_IDS.includes(qp('case')) ? qp('case') : CFG_CASE_IDS[0];
let cfgError = '';   // 最近一次上传校验错误
function resetCenterFilters(){}

/* 演示：部分配置项已经上传过（含多个版本），其余为「未上传」 */
const CFG_DEMO_VERSIONS = {
  'map-pdc':[{no:1, file:'地点汇总.xlsx', time:'2026-08-20 09:30', by:'erxiao'}],
  'map-port':[{no:1, file:'IES Port 对应表.xlsx', time:'2026-08-20 09:40', by:'erxiao'},
              {no:2, file:'IES Port 对应表_0902.xlsx', time:'2026-09-02 09:15', by:'erxiao'}],
  'cfg-glc-avis':[{no:1, file:'AVIS.xlsx', time:'2026-08-25 11:38', by:'erxiao'}],
  'cfg-case3-inv-dn':[{no:1, file:'导入INV＆DN.xlsx', time:'2026-09-20 10:05', by:'erxiao'},
                      {no:2, file:'导入INV＆DN_0927.xlsx', time:'2026-09-27 16:20', by:'erxiao'}],
  'cfg-c4-diag':[{no:1, file:'Star D orders_new.xlsx', time:'2026-09-22 14:00', by:'erxiao'}],
};
/* 配置项清单以种子为准（写死）：本地状态里缺的补回来，并补齐版本记录 */
(function ensureCfgItems(){
  let changed = false;
  SEED.cfgItems.forEach(s=>{
    let c = State.cfgItem(s.id);
    if(!c){ c = deepClone(s); State.cfgItems.push(c); changed = true; }
    if(!c.caseId){ c.caseId = s.caseId; changed = true; }
    if(!Array.isArray(c.versions)){ c.versions = deepClone(CFG_DEMO_VERSIONS[s.id]||[]); changed = true; }
  });
  if(changed) State.save();
})();
const cfgKind = c => c.kind||'template';   /* 未标 kind 的配置项（Case3 / Case5）按模板处理 */
const cfgLatest = c => c.versions.length ? c.versions[c.versions.length-1] : null;
/* 配置项适用的业务 Case（取种子，写死）：显式 cases（如欧线、美线共用的映射表）> 线路所属 Case > 模块下的全部 Case */
function cfgCases(c){
  const s = SEED.cfgItems.find(x=>x.id===c.id) || c;
  return s.cases || (s.line ? [lineBiz(s.line)] : bizCasesOfModule(s.caseId));
}
function cfgItemsOf(kind){
  const ids = new Set(SEED.cfgItems.map(s=>s.id));
  return State.cfgItems.filter(c=>ids.has(c.id) && cfgCases(c).includes(cfgCase) && cfgKind(c)===kind);
}

function render(){
  const tpl = cfgItemsOf('template'), map = cfgItemsOf('mapping');
  const lines = visibleCaseLines().filter(g=>g.biz===cfgCase);
  $('#view').innerHTML = `
  <div class="page-hd">
    <div><h2>配置中心</h2><div class="sub">按 Case 查看导入模板与映射表。配置项固定，只能上传新版本，不能在线编辑。</div></div>
    ${casePickHtml('cfgCasePick', cfgCase, false)}
  </div>
  ${cfgError?`<p class="consignment-error" role="alert">${esc(cfgError)}</p>`:''}

  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">模板配置</h3>
        <p class="sec-sub">流程填写导入模板、托运清单时使用的模板及查表用的业务大表 · 共 ${tpl.length} 项</p></div>
    </div>
    ${lines.map(g=>cfgGroup(g.label, tpl.filter(c=>c.line===g.line))).join('')}
  </div>

  <div class="center-sec">
    <div class="sec-head">
      <div><h3 class="sec-title">映射表配置</h3>
        <p class="sec-sub">流程中用于取值换算的对应关系表 · 共 ${map.length} 项 · 上传时表头须与列结构一致</p></div>
    </div>
    ${cfgGroup('', map)}
  </div>
  <div id="cfgInputs" class="hidden">${tpl.concat(map).map(c=>`<input type="file" data-in="${c.id}" accept="${esc(c.accept||'.xlsx')}">`).join('')}</div>`;
  bindCasePick('cfgCasePick', v=>{ cfgCase = v; cfgError=''; history.replaceState(null,'','?case='+cfgCase); render(); });
  bindCfgUploads();
}

function cfgGroup(label, rows){
  return `<section class="case-group">
    ${label?`<div class="case-group-hd"><h4>${esc(label)}</h4><span>${rows.length} 项配置</span></div>`:''}
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr><th>配置项</th><th>当前文件</th><th style="text-align:center">版本</th><th>更新时间</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map(cfgRow).join('')
          : '<tr><td colspan="5"><div class="empty"><div class="ei">∅</div>没有配置项</div></td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function cfgRow(c){
  const v = cfgLatest(c);
  return `<tr class="click" onclick="cfgDetail('${c.id}')">
      <td><b>${esc(c.name)}</b>${cfgCases(c).length>1?` <span class="tag" title="同一份文件、同一套版本">${cfgCases(c).map(x=>esc(caseLabel(x).split(' · ')[0])).join(' / ')} 共用</span>`:''}<div class="tiny muted">${esc(c.desc)}</div></td>
      <td class="small">${v?esc(v.file):'<span class="tag warn">未上传</span>'}</td>
      <td style="text-align:center">${v?`<span class="tag acc">v${v.no}</span>${c.versions.length>1?`<div class="tiny muted">共 ${c.versions.length} 版</div>`:''}`:'<span class="muted">—</span>'}</td>
      <td class="small muted">${v?esc(v.time):'—'}</td>
      <td style="text-align:right;white-space:nowrap" onclick="event.stopPropagation()">
        <button class="btn sm primary" data-up="${c.id}">上传</button>
        ${v?`<button class="btn sm" onclick="cfgDownload('${c.id}',${v.no})">下载</button>`:''}
      </td>
    </tr>`;
}

/* 下载某个版本（演示：只记录，不生成文件） */
function cfgDownload(id, no){
  const c = State.cfgItem(id), v = c && c.versions.find(x=>x.no===no); if(!v) return;
  audit('下载配置文件', `${c.name} · v${v.no} · ${v.file}`, '配置中心');
  toast(`已下载 ${v.file}（v${v.no}，演示）`, 'ok');
}

/* Excel 列号：0 → A，25 → Z，26 → AA */
function cfgColName(i){ let s=''; for(let n=i+1;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
/* 详情：全部版本（新的在上，最新生效）+ 列结构 */
function cfgDetail(id){
  const c = State.cfgItem(id); if(!c) return;
  const vs = c.versions.slice().reverse(), latest = cfgLatest(c);
  const sheets = c.sheets || (c.cols ? [{sheet:'列结构', cols:c.cols}] : []);
  openDrawer(esc(c.name), `
    <dl class="center-detail">
      <div><dt>类型</dt><dd>${cfgKind(c)==='mapping'?'映射表':'导入模板'}</dd></div>
      <div><dt>适用 Case</dt><dd>${cfgCases(c).map(x=>esc(caseLabel(x))).join('；')}${cfgCases(c).length>1?'（共用同一份文件和版本）':''}</dd></div>
      <div><dt>用途</dt><dd>${esc(c.desc)}</dd></div>
      <div><dt>文件格式</dt><dd>${esc(c.accept||'.xlsx')} · 不超过 20 MB</dd></div>
    </dl>
    <div class="sec-lab">版本 · ${vs.length} 个${latest?` · 当前生效 v${latest.no}`:''}</div>
    ${vs.length?`<div class="tblwrap"><table class="tbl cfg-vers"><thead><tr><th>版本</th><th>文件</th><th>上传时间</th><th>上传人</th><th></th></tr></thead>
      <tbody>${vs.map(v=>`<tr><td><span class="tag ${v===latest?'acc':''}">v${v.no}</span>${v===latest?' <span class="tag ok">生效中</span>':''}</td>
        <td class="small">${esc(v.file)}</td><td class="small muted">${esc(v.time)}</td><td class="small">${esc(v.by||'—')}</td>
        <td style="text-align:right"><button class="btn sm" onclick="cfgDownload('${c.id}',${v.no})">下载</button></td></tr>`).join('')}</tbody></table></div>`
      :'<div class="card center-empty"><p>还没有上传过文件，后续任务取不到这个配置。</p></div>'}
    ${sheets.map(s=>`<div class="sec-lab">${esc(s.sheet)} · ${s.cols.length} 列</div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th style="width:52px">列</th><th>字段名</th></tr></thead>
      <tbody>${s.cols.map((x,i)=>`<tr><td class="small muted">${c.accept==='.docx'?i+1:cfgColName(i)}</td><td>${esc(x)}</td></tr>`).join('')}</tbody>
    </table></div>`).join('')}
    <p class="center-note">${sheets.length?(cfgKind(c)==='mapping'?'上传的映射表每个 sheet 的表头须与上面的列结构完全一致，否则拒绝。':'列结构按 BRD 整理，仅用于核对；导入模板上传时不校验表头。'):'BRD 未给出该文件的列结构，以上传的文件为准。'}</p>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="closeModal();cfgPickFile('${c.id}')">上传新版本</button></div>`);
}

/* 上传：校验扩展名与大小，生成新版本（版本号 = 当前最大 + 1） */
function cfgPickFile(id){ cfgError=''; const input = document.querySelector(`[data-in="${id}"]`); if(input) input.click(); }
function bindCfgUploads(){
  document.querySelectorAll('[data-up]').forEach(btn=>{ btn.onclick = ()=>cfgPickFile(btn.dataset.up); });
  document.querySelectorAll('[data-in]').forEach(input=>{
    input.onchange = e=>{
      const file = e.target.files[0], c = State.cfgItem(input.dataset.in);
      e.target.value = '';
      if(!file || !c) return;
      const err = validateCfgFile(file, c);
      if(err){ cfgError = err; render(); return; }
      const no = c.versions.reduce((m,v)=>Math.max(m,v.no),0) + 1;
      c.versions.push({no, file:file.name, time:new Date().getFullYear()+'-'+now(), by:'erxiao'});
      audit('上传配置文件', `${c.name} · ${file.name} · v${no}`, '配置中心');
      State.save();
      toast(`${c.name} 已上传为 v${no}，后续任务使用新版本`,'ok');
      render();
    };
  });
}
function validateCfgFile(file, c){
  if(!file.size) return '文件为空，请重新选择。';
  if(file.size > 20*1024*1024) return '文件超过 20 MB 限制。';
  const ext = (c.accept||'.xlsx').toLowerCase();
  if(!file.name.toLowerCase().endsWith(ext)) return `${c.name} 需要 ${ext} 文件，当前选择的是「${file.name}」。`;
  return '';
}

document.addEventListener('DOMContentLoaded', render);
