const CONSIGNMENT_PREFIX = '道路运输危险货物托运清单_';
let consignmentBusy=false, consignmentRecords=[], consignmentLoadError=false, consignmentError='';
let cfgUploads = State.data.cfgUploads || {};
function case1Visible(){ return ucMatch({uc:'UC34'}) && ['all','case-1'].includes(getCase()); }
function resetCenterFilters(){}
function render(){
  const configured=consignmentRecords[0] || null;
  const status=consignmentError?'解析失败':configured?'配置':'未配置';
  const statusClass=consignmentError?'dan':configured?'ok':'';
  const filename=configured?configured.name:'';
  $('#view').innerHTML=`
  <div class="page-hd"><div><h2>配置中心</h2><div class="sub">管理 Case 的模板配置与共享盘监听。</div></div></div>
  <div class="center-context"><span>当前范围：<strong>${esc(allowedCaseText())}</strong></span><span>本地交互演示 · 未连接后台服务</span></div>
  ${case1Visible()?`
  <div class="center-sec">
    <h3 class="sec-title">模板配置</h3>
    <div class="card cfg-list">
      <div class="cfg-row">
        <div class="cfg-main"><b>危险品托运清单模板配置</b><div class="cfg-sub">${configured?`文件 ${esc(filename)} · BL/HAWB：${esc(configured.waybill)}`:'上传「道路运输危险货物托运清单」文件（按 BL/HAWB 命名）'}</div></div>
        <button class="btn sm primary" id="consignmentUpload" ${consignmentBusy?'disabled':''}>${consignmentBusy?'上传中…':'上传'}</button>
        <span class="tag ${statusClass}" role="status" title="${esc(consignmentError||'本地演示配置状态，不代表 IES+ 上传结果')}">${status}</span>
        <input id="consignmentInput" type="file" accept=".xlsx" class="hidden" aria-label="上传托运清单">
      </div>
      <div class="cfg-row">
        <div class="cfg-main"><b>Database里表头填写信息对应关系表</b><div class="cfg-sub">${cfgUploads['header-mapping'] ? `文件 ${esc(cfgUploads['header-mapping'].filename)} · ${esc(cfgUploads['header-mapping'].time)}` : 'Data base.xlsx · 表头 Mapping list'}</div></div>
        <button class="btn sm primary" id="cfgBtn1">上传</button>
        <span class="tag ok">已配置</span>
        <input id="cfgInput1" type="file" accept=".xlsx" class="hidden">
      </div>
      <div class="cfg-row">
        <div class="cfg-main"><b>Database里"包装规格"信息对应关系表</b><div class="cfg-sub">${cfgUploads['package-type'] ? `文件 ${esc(cfgUploads['package-type'].filename)} · ${esc(cfgUploads['package-type'].time)}` : 'Data base.xlsx · Package Type'}</div></div>
        <button class="btn sm primary" id="cfgBtn2">上传</button>
        <span class="tag ok">已配置</span>
        <input id="cfgInput2" type="file" accept=".xlsx" class="hidden">
      </div>
      <div class="cfg-row">
        <div class="cfg-main"><b>database里是否需要制作托运清单的对应关系表</b><div class="cfg-sub">${cfgUploads['transport-name'] ? `文件 ${esc(cfgUploads['transport-name'].filename)} · ${esc(cfgUploads['transport-name'].time)}` : 'Data base.xlsx · Transport name'}</div></div>
        <button class="btn sm primary" id="cfgBtn3">上传</button>
        <span class="tag ok">已配置</span>
        <input id="cfgInput3" type="file" accept=".xlsx" class="hidden">
      </div>
      <div class="cfg-row">
        <div class="cfg-main"><b>待发出邮件附件的记录表</b><div class="cfg-sub">${cfgUploads['mail-record'] ? `文件 ${esc(cfgUploads['mail-record'].filename)} · ${esc(cfgUploads['mail-record'].time)}` : '邮件附件与发送状态记录'}</div></div>
        <button class="btn sm primary" id="cfgBtn4">上传</button>
        <span class="tag ok">已配置</span>
        <input id="cfgInput4" type="file" accept=".xlsx" class="hidden">
      </div>
    </div>
  ${consignmentError?`<p class="consignment-error" role="alert">${esc(consignmentError)}</p>`:''}
  ${consignmentLoadError?'<p class="consignment-error" role="alert">无法读取本地配置记录，请检查浏览器存储权限后刷新。</p>':''}
  <p class="center-note">演示文件仅保存在当前浏览器；文件名和大小校验通过后显示“配置”，文件内容解析及 RPA 尚未接入。</p>
  </div>
  <div class="center-sec">
    <h3 class="sec-title">共享盘监听</h3>
    <div class="card card-p sp-readonly">
      <div class="kv"><span class="k">监听目录</span><span class="v"><input class="search" style="min-width:0;width:230px;padding:4px 8px" value="${esc(State.sharepoint.dir)}" disabled></span></div>
      <div class="kv"><span class="k">触发模板文件</span><span class="v"><input class="search" style="min-width:0;width:230px;padding:4px 8px" value="${esc(State.sharepoint.table)}" disabled></span></div>
      <div class="kv"><span class="k">轮询间隔（分钟）</span><span class="v"><input class="search" style="min-width:0;width:70px;padding:4px 8px" value="${esc(State.sharepoint.poll)}" disabled></span></div>
      <div class="kv"><span class="k">文件指纹去重</span><span class="v"><span class="tag">开启</span> <span class="muted small">（重复文件不重复触发）</span></span></div>
      <div style="margin-top:12px"><button class="btn sm primary" disabled>保存配置</button></div>
    </div>
  </div>`:'<div class="card center-empty"><h3>暂无配置内容</h3><p>当前页面先完善 Case 1，其他 Case 按后续确认的业务内容配置。</p></div>'}`;
  if(!case1Visible()) return;
  $('#consignmentUpload').onclick=()=>$('#consignmentInput').click();
  $('#consignmentInput').onchange=e=>selectConsignmentFiles([...e.target.files]);
  // Bind upload handlers for items 2-5
  ['header-mapping', 'package-type', 'transport-name', 'mail-record'].forEach((key, i) => {
    const btn = $(`#cfgBtn${i+1}`);
    const input = $(`#cfgInput${i+1}`);
    if(!btn || !input) return;
    btn.onclick = () => input.click();
    input.onchange = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      if(!cfgUploads[key]) cfgUploads[key] = {};
      cfgUploads[key].filename = file.name;
      cfgUploads[key].time = now();
      State.data.cfgUploads = cfgUploads;
      State.save();
      toast(`${file.name} 已上传`, 'ok');
      render();
    };
  });
}
function consignmentWaybill(file){
  return file && file.name.startsWith(CONSIGNMENT_PREFIX) && /\.xlsx$/i.test(file.name) ? file.name.slice(CONSIGNMENT_PREFIX.length,-5).trim() : '';
}
function validateConsignment(file,waybill=consignmentWaybill(file)){
  if(!file) return '请选择该票货物的托运清单。';
  if(!waybill || waybill.length>100 || /[\\/:*?"<>|\u0000-\u001f]/.test(waybill)) return '文件名应为：道路运输危险货物托运清单_实际BL或HAWB号.xlsx';
  if(!/\.xlsx$/i.test(file.name)) return '本 demo 请上传 Excel（.xlsx）托运清单。';
  if(file.size===0) return '文件为空，请重新选择。';
  if(file.size>20*1024*1024) return '文件超过本 demo 的 20 MB 限制。';
  if(file.name.slice(0,-5)!==CONSIGNMENT_PREFIX+waybill) return '文件名应为：'+CONSIGNMENT_PREFIX+waybill+'.xlsx';
  return '';
}
async function selectConsignmentFiles(files){
  if(consignmentBusy||!case1Visible()||!files.length) return;
  consignmentError=files.length!==1?'请一次选择一份托运清单。':validateConsignment(files[0]);
  if(consignmentError){render();return;}
  await submitConsignment(files[0]);
}
function consignmentStore(mode,action){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error('Storage unavailable'));return;}
    const request=indexedDB.open('mbpts_consignment_demo',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('submissions',{keyPath:'id',autoIncrement:true});
    request.onerror=()=>reject(new Error('Storage unavailable'));
    request.onblocked=()=>reject(new Error('Storage blocked'));
    request.onsuccess=()=>{
      const db=request.result;
      try{
        const tx=db.transaction('submissions',mode),result=action(tx.objectStore('submissions'));
        tx.oncomplete=()=>{db.close();resolve(result.result)};
        tx.onerror=tx.onabort=()=>{db.close();reject(new Error('Storage failed'))};
      }catch(error){db.close();reject(error);}
    };
  });
}
async function submitConsignment(file){
  if(consignmentBusy||!case1Visible()) return;
  consignmentError=validateConsignment(file);
  if(consignmentError){render();return;}
  consignmentBusy=true;
  render();
  try{
    const record={waybill:consignmentWaybill(file),name:file.name,size:file.size,submittedAt:new Date().toISOString(),file};
    const id=await consignmentStore('readwrite',store=>store.add(record));
    consignmentRecords.unshift({...record,id});
    consignmentLoadError=false;
    toast('托运清单已保存至本地演示配置。','ok');
  }catch(error){
    toast('上传未保存，请检查浏览器存储权限或可用空间后重试。','err');
  }finally{
    consignmentBusy=false;
    render();
  }
}
document.addEventListener('DOMContentLoaded',async()=>{
  render();
  try{
    const records=await consignmentStore('readonly',store=>store.getAll());
    consignmentRecords=[...new Map([...records,...consignmentRecords].map(r=>[r.id,r])).values()].sort((a,b)=>b.id-a.id);
  }catch(error){consignmentLoadError=true;}
  render();
});
