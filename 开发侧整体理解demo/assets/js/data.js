/* ===== data.js · 全权限版公共数据层 =====
 * 业务老师拥有 Case1 ~ Case5 全部权限时的演示平台。
 * 各 Case 的业务样例在 assets/js/cases/caseN.js（取自对应 caseN页面demo 的 data.js，独立作用域），
 * 通过 registerCase 注册到 CASES；boot.js 合并各 Case 的种子数据、加载本地状态并生成演示任务。
 * 领域模型：Task 为业务单据，Run 为一次执行实例（runs[] 最末为当前执行），Task 状态由 taskStatus(t) 推导。
 */
const CASES = {};
function registerCase(id, mod){ CASES[id] = Object.assign({id}, mod); }

/* 公共种子：数组类由各 Case 种子拼接；ioRecipients 按 Case 分开保存（各邮件模板只用本 Case 的收件人清单） */
const SEED = {
  tasks:[], rules:[], ioRecipients:{}, mailTemplates:[], evidence:{trigger:[], process:[], operation:[]},
  notify:[], audit:[], thresholds:{}, dimTables:[], cfgItems:[], pool:[], templates:[], dbviews:[],
  poLines:[], receipts:[],
};

/* ===== 状态持久化 ===== */
const LS_KEY = 'mbpts_proto_all_state_v4';  /* v4：Case2 拆成 Case2a 欧线 / Case2b 美线（邮件模板各一个），换 key 让旧缓存重建 */
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

const State = {
  data: null,
  load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        this.data = JSON.parse(raw);
        Object.keys(SEED).forEach(k=>{ if(this.data[k]===undefined) this.data[k]=deepClone(SEED[k]); });
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
    location.reload();
  },
  get tasks(){ return this.data.tasks; },
  get rules(){ return this.data.rules; },
  get evidence(){ return this.data.evidence; },
  get notify(){ return this.data.notify; },
  get audit(){ return this.data.audit; },
  get thresholds(){ return this.data.thresholds; },
  get cfgItems(){ return this.data.cfgItems; },
  cfgItem(id){ return this.data.cfgItems.find(c=>c.id===id); },
  get pool(){ return this.data.pool; },
  get templates(){ return this.data.templates; },
  get mailTemplates(){ return this.data.mailTemplates; },
  get dimTables(){ return this.data.dimTables; },
  get dbviews(){ return this.data.dbviews; },
  /* 某个 Case 的收件人清单（可编辑，保存在本地状态） */
  ioList(caseId){ const m = this.data.ioRecipients || (this.data.ioRecipients = {}); return m[caseId] || (m[caseId] = []); },
  task(id){ return this.data.tasks.find(t=>t.id===id); },
  rule(id){ return this.data.rules.find(r=>r.id===id); },
};

/* ===== 领域辅助 ===== */
function latestRun(t){ return t.runs.length ? t.runs[t.runs.length-1] : null; }
function runByNo(t, no){ return t.runs.find(r=>r.no===no) || null; }
function taskStatus(t){
  if(t.waitState) return 'WAIT_INPUT';
  const r = latestRun(t);
  return r ? r.st : 'CREATED';
}

/* 任务类型元信息：各 Case 的 CASE_META 在 boot.js 合并进来 */
const CASE_META = {};
function getCaseHistory(t){
  const meta = CASE_META[t.case]||{rule:t.rule||'—',trigger:t.src,perDay:1,total:10,avgDur:'3m'};
  const entries = [];
  State.tasks.filter(x=>x.case===t.case && x.caseId===t.caseId).forEach(x=>{
    const lr=latestRun(x); if(!lr) return;
    entries.push({id:x.id,date:lr.start,st:lr.st,dur:lr.dur,self:x.id===t.id,real:true});
  });
  const ts=s=>{const m=/(?:(\d{4})-)?(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s||'');return m?new Date(+(m[1]||new Date().getFullYear()),+m[2]-1,+m[3],+m[4],+m[5]).getTime():0;};
  entries.sort((a,b)=>ts(b.date)-ts(a.date));
  const ok=entries.filter(e=>e.st==='SUCCEEDED').length;
  const rate=entries.length?Math.round(ok/entries.length*1000)/10:0;
  const secs=entries.map(e=>/(\d+)m\s*(\d+)s/.exec(e.dur||'')).filter(Boolean).map(m=>Number(m[1])*60+Number(m[2]));
  const avg=secs.length?Math.round(secs.reduce((a,b)=>a+b,0)/secs.length):0;
  const avgDur=secs.length?`${Math.floor(avg/60)}m ${String(avg%60).padStart(2,'0')}s`:meta.avgDur;
  return {meta,total:entries.length,rate,avgDur,entries};
}
