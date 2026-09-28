/* ===== data.js · 初始演示数据 + localStorage 持久化 =====
 * 领域模型（严格区分）：
 *   Task  —— 业务单据。含编号 / 场景 / 触发来源 / 操作日志 / 待办状态。不直接承载执行结果。
 *   Run   —— 一次执行实例（runs[] 中最末为「当前执行」，其余为历史）。每次初次触发、
 *            节点级重跑、整单重跑、归类池指派均产生新的 Run：
 *            { no, cause, st, start, dur, nodes[], fields[], files[], summary, runInfo? }
 *   Task.st 等动态状态一律由 taskStatus(t) 推导，不落库。
 */
const SEED = {};
const HOME_TASKS = [
  {waybill:'DEMO-A001',mode:'air',date:'2026-09-21',status:'completed'},
  {waybill:'DEMO-A002',mode:'air',date:'2026-09-21',status:'completed'},
  {waybill:'DEMO-A003',mode:'air',date:'2026-09-22',status:'completed'},
  {waybill:'DEMO-A004',mode:'air',date:'2026-09-22',status:'running'},
  {waybill:'DEMO-A005',mode:'air',date:'2026-09-22',status:'manual'},
  {waybill:'DEMO-A006',mode:'air',date:'2026-09-23',status:'manual'},
  {waybill:'DEMO-S001',mode:'sea',date:'2026-09-14',status:'completed'},
  {waybill:'DEMO-S002',mode:'sea',date:'2026-09-16',status:'completed'},
  {waybill:'DEMO-S003',mode:'sea',date:'2026-09-18',status:'completed'},
  {waybill:'DEMO-S004',mode:'sea',date:'2026-09-20',status:'manual'},
];
const HOME_MAILS = [
  {id:'DEMO-M001',mode:'air',date:'2026-09-21'},
  {id:'DEMO-M002',mode:'air',date:'2026-09-22'},
  {id:'DEMO-M003',mode:'sea',date:'2026-09-20'},
];

SEED.tasks = [
  {
    id:'T-0901-0021', uc:'UC34', case:'C01 危险品托运清单', src:'邮件触发', rule:'R-DG-CN',
    ops:[{tm:'09-01 14:06', txt:'R#1 邮件发送完成 · 证据 EV-P-2211 已登记'}],
    runs:[{
      no:1, cause:'初次执行 · 命中邮件规则 R-DG-CN', st:'SUCCEEDED', start:'09-01 14:02', dur:'3m 42s',
      nodes:[
        {n:'定时任务触发', st:'ok', d:'每晚 00:00 定时调度（支持手动触发）'},
        {n:'附件下载与登记', st:'ok', d:'IES 批量导出附件并登记', subs:['IES导出预报清单','IES导出 Part list','IES导出 Shipper']},
        {n:'按UN No.匹配初筛', st:'ok', d:'UN No. 匹配 Data base · 剔除 N / #N/A'},
        {n:'OCR识别Shipper', st:'ok', d:'识别 Shippers_Decl · 字段 18 项 · 平均置信度 96%'},
        {n:'托运清单写入', st:'ok', d:'写入表头与表体 · 与识别值联动', subs:['表头信息','表体信息']},
        {n:'IES导入', st:'ok', d:'托运清单上传 IES+ 预报界面 · 文档资料'},
        {n:'邮件发送', st:'ok', d:'上传状态通知 IO 同事 · 12 人'},
      ],
      fields:[
        {k:'UN 编号', v:'UN1263', src:'模型', conf:98},
        {k:'品名', v:'PAINT RELATED MATERIAL', src:'OCR', conf:95},
        {k:'危险类别', v:'Class 3', src:'规则', conf:100},
        {k:'数量', v:'120 CTN', src:'OCR', conf:92},
        {k:'PO 号', v:'PO-45081277', src:'规则', conf:99},
      ],
      files:[{name:'DG_Note_45081277.pdf', pages:3}],
      summary:'本单已完成危险品托运清单生成全流程：UN No. 初筛、Shippers_Decl 识别、托运清单写入、IES 导入与邮件通知均成功，证据链完整。',
    }],
  },
  {
    id:'T-0901-0018', uc:'UC34', case:'C09 X-entry 出口单证', src:'人工上传', rule:'—',
    ops:[
      {tm:'09-01 13:10', txt:'字段修正标记：发票金额 · 证据 EV-O-0098'},
      {tm:'09-01 11:24', txt:'R#1 跨单证金额比对发现差异 · 证据 EV-P-2209'},
    ],
    runs:[{
      no:1, cause:'初次执行 · 人工上传发票 + 报关单', st:'DIFF_PENDING', start:'09-01 11:20', dur:'5m 10s',
      nodes:[
        {n:'文件接收与登记', st:'ok', d:'人工上传 · 发票 + 报关单'},
        {n:'OCR 单证抽取', st:'ok', d:'字段 24 项 · 2 项低置信度'},
        {n:'跨单证一致性比对', st:'review', d:'发票金额与报关单金额存在差异', okDesc:'差异字段已修正 · 一致性复核通过'},
        {n:'导出表单生成', st:'queued', d:'等待差异处理后继续', okDesc:'export_form_0901.xlsx 已生成并登记'},
      ],
      fields:[
        {k:'发票号', v:'INV-7731', src:'OCR', conf:97, quality:'高', docIndex:0, page:1, locator:true},
        {k:'发票金额', v:'USD 84,520.00', src:'OCR', conf:78, quality:'低', docIndex:0, page:1, locator:true, low:true},
        {k:'报关金额', v:'USD 84,250.00', src:'OCR', conf:81, quality:'中', docIndex:1, page:1, locator:true, low:true},
        {k:'收货人', v:'Mercedes-Benz AG', src:'规则', conf:100, quality:'规则确定', docIndex:0, page:1, locator:false, locatorReason:'规则推导字段，无原文坐标'},
      ],
      files:[{name:'XEntry_Invoice_7731.pdf', pages:2},{name:'Customs_Decl_7731.pdf', pages:1}],
      summary:'发票金额与报关金额不一致（差 270 美元），两处取值置信度均偏低，建议核对原文后修正并重跑导出。',
    }],
  },
  {
    id:'T-0901-0015', uc:'UC34', case:'C12 CCC 信息提取', src:'人工上传', rule:'—',
    waitState:{ missing:['CCC 证书扫描件（PDF）','产品一致性清单（Excel）'] },
    plan:[
      {n:'任务创建', st:'ok', d:'由用户 erxiao 发起'},
      {n:'文件接收与登记', st:'queued', d:'等待上传', okDesc:'2 份文件已登记 · sharepoint://upload/ccc/0901-15/'},
      {n:'OCR 证书字段抽取', st:'queued', d:'agent ccc-extractor v1.0', okDesc:'字段 12 项 · 平均置信度 95%'},
      {n:'结果写回与归档', st:'queued', d:'回写任务中心', okDesc:'CCC 摘要已归档'},
    ],
    fillFields:[
      {k:'CCC 证书编号', v:'2026010901234567', src:'OCR', conf:96},
      {k:'产品名称', v:'汽车用夹层玻璃', src:'OCR', conf:94},
      {k:'制造商', v:'Shanghai Glass Co.', src:'OCR', conf:97},
      {k:'有效期至', v:'2031-05-20', src:'OCR', conf:93},
    ],
    fillFiles:[{name:'CCC_Cert_scan.pdf', pages:2}],
    fillSummary:'CCC 证书已完成字段抽取，证书编号与产品一致性清单吻合（4/4 字段一致），结果已归档，无需人工干预。',
    ops:[{tm:'09-01 09:44', txt:'任务创建 · 等待必需文件'}],
    runs:[],
  },
  {
    id:'T-0901-0009', uc:'UC26', case:'BW 日批抽数', src:'定时调度', rule:'cron 06:30',
    ops:[{tm:'09-01 08:00', txt:'Airflow cron 触发 · 证据 EV-T-1038'}],
    runSeed:{cause:'初次执行 · Airflow cron 06:30 日批'},
    runs:[{
      no:1, cause:'初次执行 · Airflow cron 06:30 日批', st:'RUNNING', start:'09-01 08:00', dur:'进行中',
      nodes:[
        {n:'BW HANA 视图抽数', st:'ok', d:'PO 42,318 行 · BO 6,104 行'},
        {n:'清洗转换建模', st:'run', d:'底表重写中…', okDesc:'6 张业务底表已重写（全量）'},
        {n:'预警规则计算', st:'queued', d:'4 类 Alert 规则', okDesc:'命中：周KPI 37 · 潜在逾期 58 · DN未收货 12 · 新3R 9'},
        {n:'看板底表刷新', st:'queued', d:'6 张看板', okDesc:'看板数据已刷新 08:00'},
      ],
      fields:[], files:[], summary:'',
    }],
    fillSummary:'BW T+1 日批已完成：PO 42,318 / BO 6,104 行入库，4 类预警规则全量计算，看板底表已刷新。',
  },
  {
    id:'T-0831-0077', uc:'UC26', case:'PO 逾期预警外发', src:'定时调度', rule:'cron 17:00',
    ops:[{tm:'08-31 17:02', txt:'R#1 外发完成 · 审计已记录'}],
    runs:[{
      no:1, cause:'初次执行 · 定时调度（逾期预警批）', st:'SUCCEEDED', start:'08-31 17:00', dur:'1m 58s',
      nodes:[
        {n:'逾期计算', st:'ok', d:'DN/GR <50% 且已到期 · 命中 37 单'},
        {n:'供应商匹配', st:'ok', d:'vendor master 匹配 37/37'},
        {n:'邮件外发', st:'ok', d:'SMTP 已发送 37 封 · 去重 0'},
      ],
      fields:[], files:[],
      summary:'本期共 37 张 PO 触发逾期预警，已全部外发至供应商邮箱，发送结果与审计已留痕。',
    }],
  },
  {
    id:'T-0901-0011', uc:'UC64', case:'后台批次交叉校验', src:'DSS 调用', rule:'—',
    ops:[{tm:'09-01 10:15', txt:'R#1 结果回传 DSS · 证据 EV-P-2204'}],
    runs:[{
      no:1, cause:'初次执行 · DSS verify 接口调用', st:'SUCCEEDED', start:'09-01 10:12', dur:'2m 31s',
      nodes:[
        {n:'DSS 影像接收', st:'ok', d:'46 单 · 订单字段 + 已解密影像'},
        {n:'多模态识别', st:'ok', d:'agent key-doc v2.1 · 发票 / 注册证 / 保险单'},
        {n:'跨文件校验', st:'ok', d:'VIN 一致性 46/46 · 2 单置信度 <85% 已标记'},
        {n:'结果回传 DSS', st:'ok', d:'verify 接口 200 · 46 条结论'},
      ],
      fields:[], files:[],
      summary:'46 单钥匙单证交叉校验完成，VIN / 车主名 / 金额全量一致，2 单低置信度已带标记回传 DSS 审核页。',
    }],
  },
  {
    id:'T-0831-0068', uc:'UC26', case:'交期调整表导入', src:'人工上传', rule:'—', fixable:true,
    ops:[
      {tm:'09-01 09:12', txt:'R#2 导入成功 · 1,208 行已入底表'},
      {tm:'09-01 09:10', txt:'生成执行 R#2：整单重跑（源文件已修正）'},
      {tm:'08-31 16:06', txt:'R#1 导入失败 · 站内提醒已发送'},
    ],
    runs:[
      {
        no:1, cause:'初次执行 · 人工上传 delivery_adjust_0831.xlsx', st:'FAILED', start:'08-31 16:05', dur:'0m 48s',
        nodes:[
          {n:'文件接收与登记', st:'ok', d:'delivery_adjust_0831.xlsx'},
          {n:'格式校验', st:'fail', d:'解析失败', err:'ValidationError: sheet[1] 缺失必需列 "更新交期" (expected at column E)\n  at validateSheet (k02/import.py:88)', okDesc:'模板校验通过 · 1,208 行进入处理'},
          {n:'合并入底表', st:'queued', d:'唯一键 PO+item 覆盖', okDesc:'1,208 行已入底表 · 上一版本已覆盖并留痕'},
        ],
        fields:[], files:[{name:'delivery_adjust_0831.xlsx', pages:1}],
        summary:'导入失败：Excel 模板缺少「更新交期」列（column E），格式校验未通过，后续步骤未执行。',
      },
      {
        no:2, cause:'整单重跑 · 源文件已修正', st:'SUCCEEDED', start:'09-01 09:10', dur:'1m 32s',
        nodes:[
          {n:'文件接收与登记', st:'ok', d:'delivery_adjust_0831_v2.xlsx'},
          {n:'格式校验', st:'ok', d:'模板校验通过 · 1,208 行进入处理'},
          {n:'合并入底表', st:'ok', d:'1,208 行已入底表 · 上一版本已覆盖并留痕'},
        ],
        fields:[], files:[{name:'delivery_adjust_0831_v2.xlsx', pages:1}],
        summary:'修正后的交期调整表已重新导入：1,208 行按唯一键 PO+item 覆盖合并入底表，覆盖操作已留痕。',
      },
    ],
    fillSummary:'修正后的交期调整表已重新导入：1,208 行按唯一键 PO+item 覆盖合并入底表，覆盖操作已留痕。',
  },
  {
    id:'T-0831-0065', uc:'UC34', case:'C06 ASN 创建（SPM）', src:'邮件触发', rule:'R-ASN-V1 / R-ASN-V2 / R-ASN-V3',
    ops:[{tm:'08-31 15:43', txt:'R#1 SPM 结果截图已回传 · 判定成功'}],
    runs:[{
      no:1, cause:'初次执行 · 三邮件规则 N:1 汇聚凑齐', st:'SUCCEEDED', start:'08-31 15:31', dur:'12m 20s',
      nodes:[
        {n:'三规则汇聚（N:1）', st:'ok', d:'DN + 发票 + 装箱单 凑齐'},
        {n:'字段抽取', st:'ok', d:'agent asn-extractor v1.1'},
        {n:'SPM 填报文件生成', st:'ok', d:'asn_fill_0831.xlsx 已生成'},
        {n:'人工导入结果回传', st:'ok', d:'用户上传截图 · 绿点成功判定'},
      ],
      fields:[
        {k:'DN 号', v:'DN-88342', src:'OCR', conf:99},
        {k:'发运数量', v:'3,400 PC', src:'OCR', conf:94},
        {k:'ETA', v:'2026-09-12', src:'OCR', conf:91},
      ],
      files:[{name:'ASN_DN_88342.pdf', pages:1}],
      summary:'三条邮件规则汇聚后自动生成 SPM 填报文件，人工导入结果截图判定为成功（绿点），全程证据链完整。',
    }],
  },
];

/* ===== 节点级证据截图（按 Task→Run→Node 索引映射） ===== */
(function applyNodeEvidence(){
  var E = {
    'T-0901-0021': [[
      [{type:'rule',title:'定时任务触发',lines:['空运：每晚 00:00 自动运行','海运：跑上周一 ~ 上周日','保留手动触发入口']}],
      [{type:'file',title:'SharePoint 登记',lines:['sharepoint://inbox/dg/0901-21/','DG_Note_45081277.pdf (1.2 MB)','PackingList_S77120.pdf (340 KB)']}],
      [{type:'table',title:'UN No. 匹配初筛',lines:['UN1263 → Transport name：Y','UN 为空 → NA · 无需制作','剔除 N / #N/A 行 · 3 票待制作']}],
      [{type:'ocr',title:'OCR 识别结果',lines:['字段 18 项 · avg conf 96%','UN1263 | Class 3 | 120 CTN','PO-45081277 匹配成功'],id:'EV-P-2211'}],
      [{type:'table',title:'托运清单写入',lines:['表头：PDC / Invoice Type / Terminal WH','表体：Shippers_Decl / MSDS / Package Type','命名：道路运输危险货物托运清单_BL/HAWB']}],
      [{type:'screen',title:'IES+ 上传完成',lines:['路径：预报界面 → 文档资料','道路运输危险货物托运清单_S77120.xlsx','上传时间 14:05:33']}],
      [{type:'smtp',title:'邮件发送',lines:['收件人：IO 同事 12 人','正文：托运清单上传状态表','发送时间 14:06:10']}],
    ]],
    'T-0901-0018': [[
      [{type:'file',title:'上传文件登记',lines:['XEntry_Invoice_7731.pdf','Customs_Decl_7731.pdf','上传人 erxiao']}],
      [{type:'ocr',title:'OCR 抽取结果',lines:['字段 24 项 · 2 项低置信度','INV-7731 | USD 84,520.00','收货人 Mercedes-Benz AG']}],
      [{type:'check',title:'金额比对明细',lines:['发票: USD 84,520.00 (78%)','报关: USD 84,250.00 (81%)','差异: +USD 270.00 ⚠'],id:'EV-P-2209'}],
      null,
    ]],
    'T-0901-0009': [[
      [{type:'table',title:'HANA 查询结果',lines:['PO_HEADER: 42,318 rows','BO_TRACKING: 6,104 rows','耗时 2m 14s']}],
      [{type:'table',title:'底表重写进度',lines:['3/6 张底表已完成','po_master ✓ | bo_track ✓','vendor_perf ⟳ 处理中…']}],
      null,
      null,
    ]],
    'T-0831-0077': [[
      [{type:'rule',title:'逾期规则命中',lines:['DN/GR < 50% 且已到期','命中 37 单 · 12 供应商','最长逾期 14 天'],id:'EV-P-2198'}],
      [{type:'table',title:'供应商匹配',lines:['vendor master 37/37','SUP-1024: 12 | SUP-2048: 8','SUP-3391: 6 | 其他: 11']}],
      [{type:'smtp',title:'SMTP 发送报告',lines:['已发送 37 封 · 失败 0','送达率 100%','最后发送 17:01:42']}],
    ]],
    'T-0901-0011': [[
      [{type:'api',title:'DSS 请求接收',lines:['POST /api/verify','46 单 · 含解密影像','multipart/form-data']}],
      [{type:'ocr',title:'多模态识别',lines:['发票 46 · 注册证 46 · 保险 46','agent key-doc v2.1','avg conf 94.2%'],id:'EV-P-2204'}],
      [{type:'check',title:'VIN 一致性校验',lines:['一致 44/46 (95.7%)','⚠ 2 单 conf < 85%','已标记待人工复核']}],
      [{type:'api',title:'DSS 回传结果',lines:['PUT /api/verify/result','HTTP 200 · 46 条结论','耗时 320ms']}],
    ]],
    'T-0831-0068': [
      [
        [{type:'file',title:'文件登记',lines:['delivery_adjust_0831.xlsx','1 sheet · 1,208 rows','上传人 erxiao 16:05']}],
        [{type:'check',title:'模板校验',lines:['❌ 缺失必需列','Expected: col E "更新交期"','校验未通过 → 终止']}],
        null,
      ],
      [
        [{type:'file',title:'文件登记',lines:['delivery_adjust_0831_v2.xlsx','1 sheet · 1,208 rows','上传人 erxiao 09:10']}],
        [{type:'check',title:'模板校验',lines:['✓ 全部必需列齐全','1,208 行 × 8 列','数据类型检查通过']}],
        [{type:'table',title:'合并入底表',lines:['PO+item 覆盖合并','更新 1,208 行 · 新增 0','上一版本已归档留痕']}],
      ],
    ],
    'T-0831-0065': [[
      [{type:'email',title:'三邮件汇聚',lines:['DN: Delivery Note DN-88342','INV: Invoice INV-55210','PKG: Packing List DN-88342']}],
      [{type:'ocr',title:'ASN 字段抽取',lines:['DN-88342 | 3,400 PC','ETA: 2026-09-12','asn-extractor v1.1']}],
      [{type:'file',title:'SPM 填报文件',lines:['asn_fill_0831.xlsx','Sheet: ASN_Entry','自动填入 12 个字段']}],
      [{type:'screen',title:'SPM 导入结果',lines:['🟢 绿点 = 导入成功','ASN-2026-88342 已创建','用户截图 15:42 上传']}],
    ]],
  };
  /* 节点文件附件（按 Task→Run→Node 索引映射） */
  var F = {
    'T-0901-0021': [[
      null,
      [['DG_Note_45081277.pdf','1.2 MB'],['PackingList_S77120.pdf','340 KB']],
      [['UN初筛_匹配结果.xlsx','16 KB']],
      [['OCR_抽取结果_18字段.json','8 KB']],
      [['道路运输危险货物托运清单_S77120.xlsx','86 KB']],
      [['IES_上传回执_S77120.pdf','42 KB']],
      [['邮件副本_上传状态通知.eml','38 KB']],
    ]],
    'T-0901-0018': [[
      [['XEntry_Invoice_7731.pdf','480 KB'],['Customs_Decl_7731.pdf','320 KB']],
      [['OCR_抽取_24字段.json','12 KB']],
      [['比对明细_金额差异.xlsx','18 KB']],
      null,
    ]],
    'T-0901-0009': [[
      [['HANA_query_log.txt','4 KB']],
      [['ETL_进度.log','2 KB']],
      null,
      null,
    ]],
    'T-0831-0077': [[
      [['逾期明细_37单.xlsx','42 KB']],
      [['匹配结果_vendor.csv','6 KB']],
      [['SMTP_发送报告.log','3 KB'],['邮件模板_snapshot.html','12 KB']],
    ]],
    'T-0901-0011': [[
      [['DSS_request_payload.json','156 KB']],
      [['识别结果_46单.json','88 KB']],
      [['VIN_校验报告.xlsx','24 KB']],
      [['DSS_response_200.json','32 KB']],
    ]],
    'T-0831-0068': [
      [
        [['delivery_adjust_0831.xlsx','86 KB']],
        [['校验错误报告.txt','1 KB']],
        null,
      ],
      [
        [['delivery_adjust_0831_v2.xlsx','88 KB']],
        [['校验通过报告.txt','1 KB']],
        [['合并日志_1208行.log','4 KB']],
      ],
    ],
    'T-0831-0065': [[
      [['DN_88342.pdf','220 KB'],['INV_55210.pdf','180 KB'],['PL_88342.pdf','340 KB']],
      [['ASN_fields_extracted.json','6 KB']],
      [['asn_fill_0831.xlsx','32 KB']],
      [['SPM_导入截图.png','180 KB']],
    ]],
  };
  Object.entries(E).forEach(function([tid,runs]){
    var t = SEED.tasks.find(function(x){return x.id===tid});
    if(!t) return;
    runs.forEach(function(nodeEvArr, ri){
      if(!t.runs[ri] || !nodeEvArr) return;
      nodeEvArr.forEach(function(ev, ni){
        if(ev && t.runs[ri].nodes[ni]) t.runs[ri].nodes[ni].ev = ev;
      });
    });
  });
  Object.entries(F).forEach(function([tid,runs]){
    var t = SEED.tasks.find(function(x){return x.id===tid});
    if(!t) return;
    runs.forEach(function(nodeFiles, ri){
      if(!t.runs[ri] || !nodeFiles) return;
      nodeFiles.forEach(function(files, ni){
        if(files && files.length && t.runs[ri].nodes[ni]) t.runs[ri].nodes[ni].evFiles = files;
      });
    });
  });
})();

SEED.rules = [
  {id:'R-DG-CN', name:'危险品托运清单 · 华东', mail:'ie-import@mb.cn', prio:1, flow:'C01-clause-CN-East', on:true, hits:128,
   crit:{from:'*@supplier-cn.com', to:'ie-import@mb.cn', subj:'DG Declaration', body:'', attMin:1, attMax:6},
   atts:[{role:'dg_note', type:'PDF', req:true, multi:false, re:'.*DG.*'}]},
  {id:'R-AVIS-01', name:'AVIS 海运预报', mail:'ie-import@mb.cn', prio:2, flow:'C02', on:true, hits:64,
   crit:{from:'', to:'ie-import@mb.cn', subj:'AVIS', body:'', attMin:1, attMax:4},
   atts:[{role:'avis', type:'PDF', req:true, multi:false, re:'.*'}]},
  {id:'R-ASN-V1', name:'ASN · 发货通知', mail:'asn@mb.cn', prio:1, flow:'C06 (N:1)', on:true, hits:41,
   crit:{from:'', to:'asn@mb.cn', subj:'Delivery Note', body:'', attMin:1, attMax:2},
   atts:[{role:'dn', type:'PDF', req:true, multi:false, re:'.*DN.*'}]},
  {id:'R-ASN-V2', name:'ASN · 供应商发票', mail:'asn@mb.cn', prio:2, flow:'C06 (N:1)', on:true, hits:41,
   crit:{from:'', to:'asn@mb.cn', subj:'Invoice', body:'', attMin:1, attMax:2},
   atts:[{role:'invoice', type:'PDF', req:true, multi:false, re:'.*'}]},
  {id:'R-ASN-V3', name:'ASN · 装箱单', mail:'asn@mb.cn', prio:3, flow:'C06 (N:1)', on:false, hits:39,
   crit:{from:'', to:'asn@mb.cn', subj:'Packing', body:'', attMin:1, attMax:2},
   atts:[{role:'packing_list', type:'PDF', req:true, multi:false, re:'.*'}]},
  {id:'R-XE-EXP', name:'X-entry 出口单证', mail:'ie-export@mb.cn', prio:3, flow:'C09', on:true, hits:22,
   crit:{from:'', to:'ie-export@mb.cn', subj:'X-entry', body:'', attMin:1, attMax:6},
   atts:[{role:'invoice', type:'PDF', req:true, multi:false, re:'.*'},{role:'bl', type:'PDF', req:false, multi:false, re:'.*B.?L.*'}]},
];

/* ===== Case 1 通知邮件模板（依据 BRD「七、发送邮件通知」） =====
 * 收件人清单来自 IO 接收邮箱地址（可勾选配置）；正文含上传状态表格，参数即表格字段。 */
SEED.ioRecipients = [
  'huizhen.cai@mercedes-benz.com','wenjuan.chen@mercedes-benz.com','yu.c.chen@mercedes-benz.com',
  'wenwen.gao@mercedes-benz.com','shichao.liu@mercedes-benz.com','wanjuan.liu@mercedes-benz.com',
  'yongjian.sun@mercedes-benz.com','meng.w.wang@mercedes-benz.com','afang.zhang@mercedes-benz.com',
  'yue.zy.zhang@mercedes-benz.com','xinyi.wang@mercedes-benz.com','nan.n.zhao@mercedes-benz.com',
];
SEED.mailTemplates = [
  {
    id:'TPL-C1-STATUS', caseId:'case-1', name:'危险品托运清单上传状态通知', scene:'Case 1 · 危险品托运清单',
    subject:'危险品托运清单上传状态通知',
    body:'Dears,\nKindly pls refer to the consignment list upload status as below. Thanks~',
    variables:['Pre-alert creation date','PDC','BL/HAWB','Invoice Type','Terminal WH','Shippers_Decl uploaded(Y/N)','Consignment list upload（Y/N）','Remark','Process date'],
    recipients:[...SEED.ioRecipients],
  },
];

SEED.evidence = {
  trigger:[
    {id:'EV-T-1042', task:'T-0901-0021', what:'R#1 邮件命中规则 R-DG-CN', time:'09-01 14:02', hash:'a3f8c25d91e0', uc:'UC34'},
    {id:'EV-T-1039', task:'T-0901-0015', what:'人工上传创建任务（操作人 erxiao）· 待必需文件', time:'09-01 09:44', hash:'b71d04f833af', uc:'UC34'},
    {id:'EV-T-1038', task:'T-0901-0009', what:'R#1 Airflow cron 触发（06:30 日批）', time:'09-01 08:00', hash:'c902e1a77b12', uc:'UC26'},
    {id:'EV-T-1031', task:'T-0901-0011', what:'R#1 DSS verify 接口调用', time:'09-01 10:12', hash:'d558f9b4e0c4', uc:'UC64'},
  ],
  process:[
    {id:'EV-P-2211', task:'T-0901-0021', what:'R#1 OCR 抽取结果 · 18 字段 · 置信度明细', time:'09-01 14:04', hash:'e612ab300f87', uc:'UC34'},
    {id:'EV-P-2209', task:'T-0901-0018', what:'R#1 跨单证金额比对明细（差异 270 USD）', time:'09-01 11:24', hash:'f0773c114d29', uc:'UC34'},
    {id:'EV-P-2204', task:'T-0901-0011', what:'R#1 多模态识别结果 + 跨文件校验结论', time:'09-01 10:14', hash:'08aa51d2c63d', uc:'UC64'},
    {id:'EV-P-2198', task:'T-0831-0077', what:'R#1 预警规则命中 37 单明细', time:'08-31 17:01', hash:'19bf608ed2a8', uc:'UC26'},
  ],
  operation:[
    {id:'EV-O-0098', task:'T-0901-0018', what:'字段修正标记：发票金额（erxiao）· 待下次执行生效', time:'09-01 13:10', hash:'2acd77f2b1f5', uc:'UC34'},
    {id:'EV-O-0092', task:'T-0831-0068', what:'交期调整表上传（覆盖上一版 08-24）', time:'08-31 16:05', hash:'4c9a2e537e10', uc:'UC26'},
  ],
};

SEED.notify = [
  {t:'任务待人工处理', x:'T-DEMO-A005 · 危险品托运清单 · 空运 · 识别结果待人工处理', tm:'13:26', read:false, ic:'r', sym:'≠', link:'task-detail.html?id=T-DEMO-A005'},
  {t:'任务待人工处理', x:'T-DEMO-A006 · 危险品托运清单 · 空运 · 识别结果待人工处理', tm:'12:18', read:false, ic:'r', sym:'≠', link:'task-detail.html?id=T-DEMO-A006'},
  {t:'任务待人工处理', x:'T-DEMO-S004 · 危险品托运清单 · 海运 · 识别结果待人工处理', tm:'11:02', read:false, ic:'r', sym:'≠', link:'task-detail.html?id=T-DEMO-S004'},
  {t:'任务执行中', x:'T-DEMO-A004 · 危险品托运清单 · 空运 · 字段识别执行中', tm:'10:40', read:true, ic:'a', sym:'i', link:'task-detail.html?id=T-DEMO-A004'},
  {t:'任务执行成功', x:'T-DEMO-A003 · 危险品托运清单已完成 · 证据链已归档', tm:'09:12', read:true, ic:'g', sym:'✓', link:'task-detail.html?id=T-DEMO-A003'},
  {t:'任务执行成功', x:'T-DEMO-S003 · 危险品托运清单已完成 · 证据链已归档', tm:'昨日 18:20', read:true, ic:'g', sym:'✓', link:'task-detail.html?id=T-DEMO-S003'},
];

SEED.audit = [
  {tm:'09-01 13:12', who:'erxiao', act:'触发重跑', obj:'T-0901-0018 · 自节点「导出表单生成」', src:'任务中心'},
  {tm:'09-01 11:30', who:'admin.wang', act:'停用规则', obj:'R-ASN-V3', src:'规则配置'},
  {tm:'09-01 09:44', who:'erxiao', act:'创建任务', obj:'T-0901-0015 · C12 CCC 信息提取', src:'任务上传'},
  {tm:'08-31 17:05', who:'sclin', act:'导出看板', obj:'PO 逾期明细 · Excel', src:'看板'},
];

SEED.thresholds = {kpi:'50', ndays:'14', dnDays:'7', r3:'fixed'};

/* ===== 手工维度表（Excel → Markdown 呈现，供 Airflow 任务引用） ===== */
SEED.dimTables = [
  {
    id:'DIM-001', name:'vendor_master', title:'供应商主数据',
    desc:'供应商编号、名称、联系方式、评级 — BW 日批及预警外发任务的维度表',
    usedBy:['BW 日批抽数','PO 逾期预警外发'],
    airflowParam:'dim_vendor_master.md',
    versions:[
      {ver:3, file:'vendor_master_v3.xlsx', time:'09-01 10:20', by:'erxiao', rows:128, cols:8},
      {ver:2, file:'vendor_master_v2.xlsx', time:'08-25 14:30', by:'sclin', rows:125, cols:8},
      {ver:1, file:'vendor_master_v1.xlsx', time:'08-10 09:00', by:'admin.wang', rows:120, cols:8},
    ],
    md:'| 供应商编号 | 名称 | 联系邮箱 | 城市 | 评级 | 年度交付率 | 质量合格率 | 备注 |\n|---|---|---|---|---|---|---|---|\n| SUP-1024 | 华东线束供应商 | ops@supplier-cn.com | 上海 | A | 97.2% | 99.1% | 核心供应商 |\n| SUP-2048 | 深圳电子元件 | pm@shenzhen-elec.com | 深圳 | B+ | 91.5% | 96.8% | |\n| SUP-3391 | 青岛包装材料 | info@qd-pack.com | 青岛 | A- | 94.8% | 98.5% | |\n| SUP-4120 | 长春零部件 | sales@cc-parts.com | 长春 | B | 88.3% | 95.2% | Under-watch |\n| SUP-5567 | 宁波物流配件 | log@nb-logistics.cn | 宁波 | B+ | 92.1% | 97.0% | |\n| _…共 128 行，此处展示前 5 行_ | | | | | | | |',
  },
  {
    id:'DIM-002', name:'delivery_adjust_template', title:'交期调整表模板',
    desc:'定义交期调整表的标准列结构与数据校验规则',
    usedBy:['交期调整表导入'],
    airflowParam:'dim_delivery_template.md',
    versions:[
      {ver:2, file:'delivery_adjust_template_v2.xlsx', time:'08-28 15:00', by:'admin.wang', rows:0, cols:8},
      {ver:1, file:'delivery_adjust_template_v1.xlsx', time:'08-15 10:00', by:'admin.wang', rows:0, cols:7},
    ],
    md:'| 列名 | 列位置 | 数据类型 | 必需 | 说明 |\n|---|---|---|---|---|\n| PO 号 | A | Text | ✓ | 采购订单编号 |\n| Item | B | Number | ✓ | 行项目号 |\n| 供应商 | C | Text | ✓ | 供应商代码 |\n| 原交期 | D | Date | ✓ | YYYY-MM-DD |\n| 更新交期 | E | Date | ✓ | 调整后交期 |\n| 数量 | F | Number | ✓ | 交付数量 |\n| 调整原因 | G | Text | | 变更说明 |\n| 确认状态 | H | Text | | 供应商确认 |',
  },
  {
    id:'DIM-004', name:'kpi_threshold', title:'KPI 预警阈值配置',
    desc:'各类 KPI 的预警阈值、升级条件与通知规则',
    usedBy:['BW 日批抽数','PO 逾期预警外发'],
    airflowParam:'dim_kpi_threshold.md',
    versions:[
      {ver:4, file:'kpi_threshold_v4.xlsx', time:'08-30 16:00', by:'erxiao', rows:12, cols:7},
      {ver:3, file:'kpi_threshold_v3.xlsx', time:'08-22 09:15', by:'sclin', rows:10, cols:7},
    ],
    md:'| 指标 | 阈值 | 条件 | 升级 | 通知对象 | 频率 | 启用 |\n|---|---|---|---|---|---|---|\n| PO 逾期天数 | 7 天 | DN/GR < 50% | 14天→主管 | 采购+供应商 | 每日 | ✓ |\n| 3R 未 review | 48h | 创建后未处理 | 72h→主管 | 负责人 | 每日 | ✓ |\n| 低库存覆盖 | 14 天 | 可用覆盖不足 | 7天→紧急 | 仓储主管 | 每日 | ✓ |\n| 交付率 | 90% | 月度 < 阈值 | 85%→警告 | 质量团队 | 月度 | ✓ |\n| Under-watch | 30 天 | pending 超期 | 45天→升级 | 项目经理 | 每周 | ✓ |',
  },
];
SEED.sharepoint = {dir:'sharepoint://customs/audit-trigger', table:'trigger_c11.xlsx', poll:'5'};

SEED.pool = [
  {id:'M-3011', subj:'Re: Q3 Ratecard 更新', from:'log@vendor-a.com', why:'发件人不在任何规则白名单', time:'09-01 13:40'},
  {id:'M-3007', subj:'Weekly Report 周报', from:'noreply@ies.mb.cn', why:'主题不含任何规则关键词', time:'09-01 12:02'},
  {id:'M-2990', subj:'DG Declaration 草稿确认', from:'ops@supplier-cn.com', why:'主题命中但被排除正则过滤（draft）', time:'09-01 10:18'},
];

SEED.mails = [
  {id:'M-2231', from:'ops@supplier-cn.com', to:['ie-import@mb.cn'], subj:'DG Declaration - Shipment S/77120', att:2},
  {id:'M-2227', from:'ops@supplier-cn.com', to:['boss@mb.cn'], subj:'DG Declaration Fw:', att:1},
  {id:'M-2190', from:'avis@carrier.com', to:['ie-import@mb.cn'], subj:'AVIS 预报 Vessel MAYA v.12', att:0},
  {id:'M-2184', from:'pm@asn-partner.com', to:['asn@mb.cn'], subj:'Delivery Note DN-88342', att:1},
  {id:'M-2183', from:'pm@asn-partner.com', to:['asn@mb.cn'], subj:'Invoice INV-55210 for DN-88342', att:1},
  {id:'M-2180', from:'pm@asn-partner.com', to:['asn@mb.cn'], subj:'Packing List for DN-88342', att:3},
  {id:'M-2170', from:'xentry@freight.com', to:['ie-export@mb.cn'], subj:'X-entry 出口单证包 S/88211', att:4},
  {id:'M-2166', from:'unknown@random.com', to:['ie-import@mb.cn'], subj:'广告：一站式物流服务', att:0},
  {id:'M-2155', from:'ops@supplier-cn.com', to:['ie-import@mb.cn'], subj:'draft DG Declaration（待确认）', att:1},
  {id:'M-2140', from:'avis@carrier.com', to:['ie-import@mb.cn'], subj:'AVIS 更正 Vessel MAYA v.12', att:1},
];

SEED.templates = [
  {id:'TPL-01', name:'PO 逾期预警', vars:['{po_no}','{supplier}','{due_date}','{overdue_days}'],
   body:'尊敬的 {supplier}：\n\nPO {po_no} 原计划交付日期为 {due_date}，目前已逾期 {overdue_days} 天，请尽快回复最新交期。\n\nMBPTS 订单履约团队'},
  {id:'TPL-02', name:'新 3R 订单通知', vars:['{po_no}','{supplier}'],
   body:'尊敬的 {supplier}：\n\n您收到一张新的 3R 订单 {po_no}，请登录供应商门户确认。\n\nMBPTS 订单履约团队'},
  {id:'TPL-03', name:'DN 超期未收货提醒', vars:['{dn_no}','{days}'],
   body:'提醒：DN {dn_no} 已发出 {days} 天仍未收货，请核查物流状态。\n\nMBPTS 智能作业平台（自动提醒）'},
];

/* 看板 6 视图数据 */
SEED.dbviews = [
  {name:'PO KPI', cols:['月份','按期交付率','逾期 PO','区域'],
   kpis:[['91.4%','本月按期交付率','up','▲ 环比 +1.2pp'],['37','逾期 PO','dn','已外发预警'],['4.2 天','平均逾期时长','','较上月 -0.6'],['98.1%','供应商响应率','up','▲']],
   chart:[['6月',88,1],['7月',90,0],['8月',90,1],['9月',91,0]],
   chartTitle:'按期交付率趋势（%）',
   rows:[['2026-06','88.0%','41','华东'],['2026-07','90.1%','39','华东'],['2026-08','90.2%','44','华北'],['2026-09','91.4%','37','华东']]},
  {name:'PO 逾期明细', cols:['PO 号','供应商','应交日期','逾期天数','DN/GR'],
   kpis:[['37','已逾期 PO','dn','环比 -7'],['12','逾期 >7 天','dn','重点关注'],['58','未来 14 天临期','','阈值可调'],['100%','预警外发覆盖','ok','SMTP 全送达']],
   chart:[['SUP-1024',12,0],['SUP-2048',8,1],['SUP-3391',6,1],['SUP-4120',5,0],['SUP-5567',4,1],['其他',2,0]],
   chartTitle:'各供应商逾期 PO 数量分布',
   rows:[['PO-45081211','SUP-1024','08-28','4 天','42%'],['PO-45081190','SUP-2048','08-27','5 天','31%'],['PO-45081258','SUP-3391','08-29','3 天','48%'],['PO-45081072','SUP-4120','08-25','7 天','22%'],['PO-45081298','SUP-5567','08-30','2 天','45%']]},
  {name:'BO 预警', cols:['PN','需求方','required 日','缺口数量','风险'],
   kpis:[['23','并集 tracking 行','','BO+PO'],['7','高风险缺口','dn','需人工跟进'],['11','供应商承诺改善中','',''],['92%','缺口关闭率 30 天','up','▲']],
   chart:[['缺口>100',7,1],['缺口 50-100',9,0],['缺口<50',7,0]],
   chartTitle:'缺口数量分档',
   rows:[['A002-991-77','华北工厂','09-05','380','高'],['A002-991-80','华东工厂','09-08','120','中'],['A203-330-01','华南','09-12','64','低']]},
  {name:'库存 PN 预警', cols:['PN','库存','在途','可用覆盖天数','状态'],
   kpis:[['1,204','监控 PN 总数','','全盘'],['86','低库存预警','dn','覆盖 <14 天'],['12','零库存','dan',''],['43','已生成补货建议','ok','']],
   chart:[['华东',38,0],['华北',26,1],['华南',22,0]],
   chartTitle:'低库存 PN 区域分布',
   rows:[['A001-222-09','3','1,200','9','低'],['A001-222-18','0','0','0','零库存'],['A118-880-02','45','300','22','正常']]},
  {name:'3R 提醒', cols:['PO 号','类型','创建时间','review 状态','供应商'],
   kpis:[['9','新 3R（今日）','','已通知'],['14','open 未 review','dn','超 48h'],['87','近 30 天累计','',''],['96%','48h 内 review 率','up','▲']],
   chart:[['新 3R',9,0],['open 未 review',14,1],['已 closed',64,0]],
   chartTitle:'3R 状态分布（滚动 30 天）',
   rows:[['PO-45081320','3R','09-01 09:12','open','SUP-1024'],['PO-45081311','3R','08-31 15:40','open','SUP-2048'],['PO-45081300','3R','08-31 10:05','reviewed','SUP-4120']]},
  {name:'Under-watch', cols:['项目','关注原因','开始日期','负责人','状态'],
   kpis:[['6','Under-watch 项目','dn','需重点关注'],['2','long pending >30 天','dan',''],['4','本周新增','',''],['1','本周解除','ok','']],
   chart:[['质量',3,1],['产能',2,0],['物流',1,0]],
   chartTitle:'关注原因分布',
   rows:[['SUP-4120 线束','9 月两次交付瑕疵','08-14','L. 张','跟进中'],['PN A203-330-01','长期 pending 42 天','07-21','K. 王','升级'],['SUP-99 海运时效','深圳港拥堵','08-28','—','观察']]},
];

/* ===== 状态持久化 ===== */
const LS_KEY = 'mbpts_proto_state_v5';
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

const State = {
  data: null,
  load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        this.data = JSON.parse(raw);
        /* 种子新增键回填：旧本地缓存缺少时补齐，不影响既有演示数据 */
        Object.keys(SEED).forEach(k=>{ if(this.data[k]===undefined) this.data[k]=deepClone(SEED[k]); });
        /* 提醒种子同步（v2）：移除旧内置提醒（旧任务/旧种子），补入当前种子；用户操作产生的提醒（tm 为「刚刚」）保留 */
        if(Array.isArray(this.data.notify) && this.data.notifyVer!==2){
          const builtinLink=/task-detail\.html\?id=(T-0901|T-0831|T-DEMO-A003|T-DEMO-A004|T-DEMO-A005|T-DEMO-A006|T-DEMO-S003|T-DEMO-S004)/;
          this.data.notify=this.data.notify.filter(n=>!(builtinLink.test(n&&n.link||'')&&n.tm!=='刚刚')).concat(deepClone(SEED.notify));
          this.data.notifyVer=2;
          this.save();
        }
        return;
      }
    }catch(e){}
    this.data = deepClone(SEED);
    this.save();
  },
  save(){
    if(this._t) clearTimeout(this._t);
    this._t = setTimeout(()=>{ try{ localStorage.setItem(LS_KEY, JSON.stringify(this.data)); }catch(e){} }, 120);
    if(window.updBadges) try{ updBadges(); }catch(e){}
  },
  reset(){
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem('mbpts_uc26_workspace_v1');
    localStorage.removeItem('mbpts_uc26_workspace_v2');
    location.reload();
  },
  get tasks(){ return this.data.tasks; },
  get rules(){ return this.data.rules; },
  get evidence(){ return this.data.evidence; },
  get notify(){ return this.data.notify; },
  get audit(){ return this.data.audit; },
  get thresholds(){ return this.data.thresholds; },
  get sharepoint(){ return this.data.sharepoint; },
  get pool(){ return this.data.pool; },
  get mails(){ return this.data.mails; },
  get templates(){ return this.data.templates; },
  get ioRecipients(){ return this.data.ioRecipients; },
  get mailTemplates(){ return this.data.mailTemplates; },
  get dimTables(){ return this.data.dimTables; },
  get dbviews(){ return this.data.dbviews; },
  task(id){ return this.data.tasks.find(t=>t.id===id); },
  rule(id){ return this.data.rules.find(r=>r.id===id); },
};

/* ===== 领域辅助（Task ⇄ Run 严格分离） ===== */
function latestRun(t){ return t.runs.length ? t.runs[t.runs.length-1] : null; }
function runByNo(t, no){ return t.runs.find(r=>r.no===no) || null; }
function taskStatus(t){
  if(t.waitState) return 'WAIT_INPUT';
  const r = latestRun(t);
  return r ? r.st : 'CREATED';
}

/* ===== 任务类型元信息 + 触发历史记录生成（规则级） ===== */
const CASE_META = {
  'C01 危险品托运清单':   {rule:'R-DG-CN',   trigger:'邮件规则',perDay:2, total:42,avgDur:'3m 28s'},
  'C09 X-entry 出口单证': {rule:'—',         trigger:'人工上传',perDay:0, total:18,avgDur:'4m 55s'},
  'C12 CCC 信息提取':     {rule:'—',         trigger:'人工上传',perDay:0, total:6, avgDur:'2m 40s'},
  'BW 日批抽数':          {rule:'cron 06:30',trigger:'定时调度',perDay:1, total:30,avgDur:'12m 08s'},
  'PO 逾期预警外发':      {rule:'cron 17:00',trigger:'定时调度',perDay:1, total:30,avgDur:'1m 52s'},
  '后台批次交叉校验':     {rule:'—',         trigger:'DSS 调用',perDay:3, total:72,avgDur:'2m 25s'},
  '交期调整表导入':       {rule:'—',         trigger:'人工上传',perDay:0, total:4, avgDur:'1m 10s'},
  'C06 ASN 创建（SPM）':  {rule:'R-ASN-*',   trigger:'邮件规则',perDay:1, total:22,avgDur:'11m 40s'},
};
function getCaseHistory(t){
  const meta = CASE_META[t.case]||{rule:t.rule||'—',trigger:t.src,perDay:1,total:10,avgDur:'3m'};
  const entries = [];
  State.tasks.filter(x=>x.case===t.case).forEach(x=>{
    const lr=latestRun(x); if(!lr) return;
    entries.push({id:x.id,date:lr.start,st:lr.st,dur:lr.dur,self:x.id===t.id,real:true});
  });
  /* 仅统计真实任务：时间倒序（兼容 MM-DD 与 YYYY-MM-DD 两种 start 格式） */
  const ts=s=>{const m=/(?:(\d{4})-)?(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s||'');return m?new Date(+(m[1]||new Date().getFullYear()),+m[2]-1,+m[3],+m[4],+m[5]).getTime():0;};
  entries.sort((a,b)=>ts(b.date)-ts(a.date));
  const ok=entries.filter(e=>e.st==='SUCCEEDED').length;
  const rate=entries.length?Math.round(ok/entries.length*1000)/10:0;
  const secs=entries.map(e=>/(\d+)m\s*(\d+)s/.exec(e.dur||'')).filter(Boolean).map(m=>Number(m[1])*60+Number(m[2]));
  const avg=secs.length?Math.round(secs.reduce((a,b)=>a+b,0)/secs.length):0;
  const avgDur=secs.length?`${Math.floor(avg/60)}m ${String(avg%60).padStart(2,'0')}s`:meta.avgDur;
  return {meta,total:entries.length,rate,avgDur,entries};
}

/* ===== Case1 节点轨迹（7 步流程）共享构建：完整 / 进行中剪枝两种形态 ===== */
function case1TemplateNodes(){
  const tpl=SEED.tasks.find(t=>t.id==='T-0901-0021');
  return tpl?deepClone(tpl.runs[0].nodes):[];
}
function case1PrunedNodes(st){
  return case1TemplateNodes().map((node,i)=>{
    if(i<3) return node;
    if(i===3){
      node.st=st==='RUNNING'?'run':'review';
      node.d=st==='RUNNING'?'字段识别执行中':'识别结果待人工处理';
      node.okDesc='字段识别完成';
      return node;
    }
    node.st='queued'; node.d='等待前序节点完成';
    delete node.ev; delete node.evFiles;
    return node;
  });
}
function case1TriggerDesc(mode){
  return (mode==='sea'?'海运 · 每周一跑上周一~周日':'空运 · 每晚 00:00')+' 定时调度（支持手动触发）';
}
function ensureWorkbenchTasks(){
  const template=SEED.tasks.find(t=>t.id==='T-0901-0021');
  let changed=false;
  HOME_TASKS.forEach(sample=>{
    const id='T-'+sample.waybill;
    if(State.task(id))return;
    const t=deepClone(template),run=t.runs[0];
    Object.assign(t,{id,caseId:'case-1',waybill:sample.waybill,mode:sample.mode,date:sample.date,demoWorkbench:true,src:'定时调度',rule:'—'});
    run.st={completed:'SUCCEEDED',running:'RUNNING',manual:'DIFF_PENDING'}[sample.status];
    run.start=sample.date+' 00:00';
    run.cause='初次执行 · '+(sample.mode==='air'?'空运':'海运')+'模拟任务';
    const statusText={completed:'托运清单已完成',running:'字段识别执行中',manual:'识别结果待人工处理'}[sample.status];
    run.nodes=sample.status==='completed'?case1TemplateNodes():case1PrunedNodes(run.st);
    run.nodes[0].d=case1TriggerDesc(sample.mode);
    if(sample.status!=='completed') run.dur=sample.status==='running'?'进行中':'待人工处理';
    if(sample.status==='manual')Object.assign(run.fields[0],{low:true,quality:'低',conf:78});
    run.fields.unshift({k:'HAWB/BL No.',v:sample.waybill,src:'系统',conf:100,locator:false,locatorReason:'任务关联运单号'});
    run.summary=sample.waybill+' · '+statusText+'。节点、字段和原文预览复用现有详情样例，仅用于演示。';
    t.fillSummary=sample.waybill+' · 本次模拟执行已完成，托运清单和证据已登记。';
    t.ops=[{tm:run.start,txt:'创建模拟任务 · '+sample.waybill+' · '+statusText}];
    State.tasks.push(t);changed=true;
  });
  const oldIndex=State.tasks.findIndex(t=>t.id==='T-0901-0021');
  if(oldIndex>=0){State.tasks.splice(oldIndex,1);changed=true;}
  if(changed)State.save();
}
/* ===== 旧缓存节点轨迹升级（nodesVer 2）：仅重建左侧节点轨迹与节点内容，保留执行与字段修正状态 ===== */
function migrateCase1Nodes(){
  if(State.data.nodesVer===2) return;
  State.tasks.filter(t=>t.caseId==='case-1').forEach(t=>{
    t.runs.forEach(run=>{
      run.nodes=(run.st==='SUCCEEDED')?case1TemplateNodes():case1PrunedNodes(run.st);
      if(run.nodes.length) run.nodes[0].d=case1TriggerDesc(t.mode);
    });
    if(t.plan){
      t.plan=case1TemplateNodes().map((node,i)=>{
        delete node.ev; delete node.evFiles;
        if(i===0){node.n='手动触发';node.d='手动创建 · '+(t.mode==='sea'?'海运':'空运');node.st='ok';}
        else node.st='queued';
        return node;
      });
    }
  });
  State.data.nodesVer=2;
  State.save();
}
function homeTaskRecords(){
  return HOME_TASKS.map(sample=>{
    const t=State.task('T-'+sample.waybill);
    if(!t)return sample;
    const st=taskStatus(t);
    return {...sample,status:st==='SUCCEEDED'?'completed':['RUNNING','DISPATCHED'].includes(st)?'running':'manual'};
  });
}
State.load();
ensureWorkbenchTasks();
migrateCase1Nodes();
