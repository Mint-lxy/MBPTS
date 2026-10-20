/* ===== inbound-mails.js · 邮件日志演示数据：公邮收到的邮件（对应 inbound_mail + inbound_attachment，见 docs/rebuild/db/07-mail.md） =====
 * 收到的邮件全部记录，没命中规则的 ruleId 为空。
 * match：AUTO 收信时自动命中 / MANUAL 用户手动挂上 / null 未命中。
 * atts[].code：附件挂上规则后归入的附件种类（规则的 role），未归类为空。
 * taskId：这封邮件建出的任务；自动命中的由 trigger 建，手动挂上的由用户点「手动触发」建。
 * 未命中样例多为写错一两个字（AVlS、Lading、Pre alert）或缺附件，便于演示手动挂规则。
 * 须在 boot.js 之前加载（State.load 会用 SEED.inbound 补齐本地状态）。
 */
SEED.inbound = [
  /* ---------- 自动命中 ---------- */
  {id:'IM-1001', uid:20481, at:'2026-09-14 08:05', from:'avis@oocl.com', to:'ie-import@mb.cn',
   subj:'AVIS - Shanghai S/260914', body:'Dear team,\nPlease find attached AVIS for shipment S/260914.\nBest regards,\nOOCL',
   atts:[{name:'Avis_409523.pdf', size:'186 KB', code:'avis'}],
   ruleId:'R-GLC-AVIS', match:'AUTO', matchedAt:'2026-09-14 08:05', taskId:'T-OOLU2042999001'},
  {id:'IM-1002', uid:20482, at:'2026-09-14 08:06', from:'bl@oocl.com', to:'ie-import@mb.cn',
   subj:'Bill of Landing OOLU2042999001', body:'Dear team,\nAttached is the B/L draft for OOLU2042999001.\nOOCL',
   atts:[{name:'2042999001-1.PDF', size:'240 KB', code:'bl'}],
   ruleId:'R-GLC-BL', match:'AUTO', matchedAt:'2026-09-14 08:06', taskId:'T-OOLU2042999001'},
  {id:'IM-1003', uid:20455, at:'2026-09-07 09:20', from:'website-noreply@cma-cgm.com', to:'ie-import@mb.cn',
   subj:'CMA CGM - 海运提单(Seaway Bill)可供使用', body:'您的海运提单已可下载，详见附件。',
   atts:[{name:'CMDU0907A.PDF', size:'312 KB', code:'bl'}],
   ruleId:'R-MBUSI-BL', match:'AUTO', matchedAt:'2026-09-07 09:20', taskId:''},
  {id:'IM-1004', uid:20398, at:'2026-08-27 10:12', from:'forwarder-demo@tvsscs.com', to:'npm-demo@example.invalid',
   subj:'20260827 MBPLAP Pre-alert 61847739952 PKLA01458373 DG', body:'Dear all,\nPlease check the pre-alert and documents attached.\nTVS SCS',
   atts:[{name:'INV_1100458373.pdf', size:'98 KB', code:'invoice'},{name:'HAWB_PKLA01458373.pdf', size:'120 KB', code:'hawb'},
         {name:'SDS_PKLA01458373.pdf', size:'210 KB', code:'msds'},{name:'shipper_PKLA01458373.pdf', size:'76 KB', code:'shipper_decl'}],
   ruleId:'R-C3-PREALERT', match:'AUTO', matchedAt:'2026-08-27 10:12', taskId:'T-PKLA01458373'},
  {id:'IM-1005', uid:20440, at:'2026-09-05 16:40', from:'forwarder-demo@fedex.com', to:'portal-demo@example.invalid',
   subj:'AWB电子版 (电子运单), Genesis AWB (原始运单), CI (发票), Packing List, 提单自报催办通知 – 524241899574', body:'请查收电子运单及发票。',
   atts:[{name:'att1-524241899574.pdf', size:'1.2 MB', code:'prealert_pdf'}],
   ruleId:'R-C4-FEDEX', match:'AUTO', matchedAt:'2026-09-05 16:40', taskId:''},
  {id:'IM-1006', uid:20436, at:'2026-09-05 11:02', from:'cs@bjfcl.com', to:'asn@mb.cn',
   subj:'快件签收单 0905', body:'附件为今日快件签收单，请查收。',
   atts:[{name:'快件签收单20260905_dan.xlsx', size:'24 KB', code:'pod'}],
   ruleId:'R-XE-FULLCOME', match:'AUTO', matchedAt:'2026-09-05 11:02', taskId:''},
  /* ---------- 手动挂上、还没触发 ---------- */
  {id:'IM-1108', uid:20470, at:'2026-09-11 08:31', from:'avis@oocl.com', to:'ie-import@mb.cn',
   subj:'AVIS-Shanghai S/260911', body:'Dear team,\nAVIS attached.\nOOCL',
   atts:[{name:'Avis_409588.pdf', size:'182 KB', code:'avis'}],
   ruleId:'R-GLC-AVIS', match:'MANUAL', matchedAt:'2026-09-11 09:15', taskId:''},
  /* ---------- 未命中 ---------- */
  {id:'IM-1101', uid:20502, at:'2026-09-15 09:12', from:'avis@oocl.com', to:'ie-import@mb.cn',
   subj:'AVlS - Shanghai S/260915', body:'Dear team,\nPlease find attached AVIS for shipment S/260915.\nOOCL',
   atts:[{name:'Avis_409611.pdf', size:'190 KB', code:''}], ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1102', uid:20505, at:'2026-09-15 10:40', from:'bl@oocl.com', to:'ie-import@mb.cn',
   subj:'Bill of Lading OOLU2043100221', body:'Dear team,\nAttached is the B/L draft for OOLU2043100221.\nOOCL',
   atts:[{name:'2043100221-1.PDF', size:'236 KB', code:''}], ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1103', uid:20420, at:'2026-09-03 14:25', from:'forwarder-demo@tvsscs.com', to:'npm-demo@example.invalid',
   subj:'MBPLAP Pre alert PKLA01470012', body:'Dear all,\nPre-alert documents attached.\nTVS SCS',
   atts:[{name:'INV_1100470012.pdf', size:'101 KB', code:''},{name:'HAWB_PKLA01470012.pdf', size:'118 KB', code:''}],
   ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1104', uid:20462, at:'2026-09-10 17:05', from:'forwarder-demo@fedex.com', to:'portal-demo@example.invalid',
   subj:'Fwd: 524241899611', body:'转发：电子运单及发票见附件。',
   atts:[{name:'att1-524241899611.pdf', size:'1.1 MB', code:''}], ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1105', uid:20476, at:'2026-09-12 07:58', from:'it-notice@example.invalid', to:'ie-import@mb.cn',
   subj:'系统维护通知', body:'本周六 22:00 至次日 02:00 邮件系统维护。', atts:[], ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1106', uid:20451, at:'2026-09-08 13:30', from:'forwarder-demo@tvsscs.com', to:'npm-demo@example.invalid',
   subj:'MBPLAP Pre-alert PKLA01468800', body:'Dear all,\nInvoice attached, HAWB to follow.\nTVS SCS',
   atts:[{name:'INV_1100468800.pdf', size:'96 KB', code:''}], ruleId:null, match:null, matchedAt:'', taskId:''},
  {id:'IM-1107', uid:20512, at:'2026-09-16 11:20', from:'cs@bjfcl.com', to:'asn@mb.cn',
   subj:'快件签收 0916', body:'附件为今日快件签收单，请查收。',
   atts:[{name:'快件签收单20260916_dan.xlsx', size:'23 KB', code:''}], ruleId:null, match:null, matchedAt:'', taskId:''},
];

/* ===== 已发送的邮件（对应 outbound_mail）：任务完成后平台按 Case 的模板用公邮发出，发送成功后记一行 =====
 * tpl：所用模板（mailTemplates 的 id，模板所属 Case 即这封邮件的 Case）；taskId / runNo：完成的任务和执行实例；
 * replyTo：回复的收件（Case 3 回复原预报邮件）；subj 为渲染后的主题。平台不存发出的正文。
 */
const OUTBOUND_C2_TO = 'yongjian.sun@mercedes-benz.com; huizhen.cai@mercedes-benz.com; yu.c.chen@mercedes-benz.com; yue.zy.zhang@mercedes-benz.com; wenwen.gao@mercedes-benz.com; xinyi.wang@mercedes-benz.com; shichao.liu@mercedes-benz.com; nan.n.zhao@mercedes-benz.com; wenjuan.chen@mercedes-benz.com';
SEED.outbound = [
  {id:'OM-3001', tpl:'TPL-C2A-STATUS', taskId:'T-OOLU2036726960', runNo:1, to:OUTBOUND_C2_TO, cc:'',
   subj:'UC34 Case2a AVIS & BL 运行状态记录表', at:'2026-08-31 09:30', replyTo:''},
  {id:'OM-3002', tpl:'TPL-C2A-STATUS', taskId:'T-OOLU2040123456', runNo:1, to:OUTBOUND_C2_TO, cc:'',
   subj:'UC34 Case2a AVIS & BL 运行状态记录表', at:'2026-09-07 09:30', replyTo:''},
  {id:'OM-3003', tpl:'TPL-C2B-STATUS', taskId:'T-NAM8646083', runNo:1, to:OUTBOUND_C2_TO, cc:'',
   subj:'UC34 Case2b MBUSI Shipping Log & BL 运行状态记录表', at:'2026-08-31 09:40', replyTo:''},
  {id:'OM-3004', tpl:'TPL-C2B-STATUS', taskId:'T-NAM8657078', runNo:1, to:OUTBOUND_C2_TO, cc:'',
   subj:'UC34 Case2b MBUSI Shipping Log & BL 运行状态记录表', at:'2026-09-07 09:40', replyTo:''},
  {id:'OM-3005', tpl:'TPL-C3-STATUS', taskId:'T-PKLA01458373', runNo:1, to:'forwarder-demo@tvsscs.com', cc:'npm-demo@example.invalid',
   subj:'Re: 20260827 MBPLAP Pre-alert 61847739952 PKLA01458373 DG', at:'2026-08-27 17:20', replyTo:'IM-1004'},
  {id:'OM-3006', tpl:'TPL-C1-STATUS', taskId:'T-STR03408962', runNo:1,
   to:'huizhen.cai@mercedes-benz.com; wenjuan.chen@mercedes-benz.com; yu.c.chen@mercedes-benz.com', cc:'',
   subj:'危险品托运清单上传状态通知 · STR03408962', at:'2026-09-21 16:05', replyTo:''},
];
