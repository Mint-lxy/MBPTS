/* 临时校验脚本（验证后删除） */
const fs = require('fs'), vm = require('vm'), path = require('path');
const load = f => fs.readFileSync(path.join(__dirname, 'assets/js', f), 'utf8');
const store = {};
const ctx = {
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  window: {}, setTimeout, clearTimeout, console, JSON, Math, Date, String, Number, Object, Array, RegExp, parseInt, isNaN,
  location: { search: '' }, navigator: {}, URLSearchParams,
  document: { addEventListener(){}, querySelectorAll(){ return []; }, querySelector(){ return null; },
    body: { dataset: {} }, documentElement: { setAttribute(){} } },
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(load('data.js'), ctx, { filename: 'data.js' });
vm.runInContext(load('core.js'), ctx, { filename: 'core.js' });
vm.runInContext(load('sharepoint.js'), ctx, { filename: 'sharepoint.js' });

vm.runInContext(`
render = function(){};
function show(p, label){
  console.log('');
  console.log(label + '  （' + (p.length?p.join(' / '):'根') + '）');
  (spNodeAt(p).children||[]).forEach(function(c, i){
    console.log('  ' + (i+1) + '. ' + (c.kind==='folder'?'[目录] ':'       ') + c.name
      + new Array(Math.max(1, 46 - c.name.length)).join(' ') + (c.time||'-'));
  });
}
show(['GLC','GZ PDC'], '运行周排序');
show(['GLC','GZ PDC','2026-W36'], '同一周内的票据夹');
show(['GLC','GZ PDC','2026-W36','400759 OOLU2038969910 ETA 2026.09.29 DG'], '文件排序');
show([], '根目录');
show(['MBUSI','Kunshan'], 'MBUSI 运行周');

console.log('');
console.log('=== 校验 ===');
function times(p){ return (spNodeAt(p).children||[]).map(function(c){ return c.time||''; }); }
function isDesc(a){ for(var i=1;i<a.length;i++){ if(a[i] > a[i-1]) return false; } return true; }
[['GLC/GZ PDC', ['GLC','GZ PDC']],
 ['GLC/GZ PDC/2026-W36', ['GLC','GZ PDC','2026-W36']],
 ['票据夹内文件', ['GLC','GZ PDC','2026-W36','400759 OOLU2038969910 ETA 2026.09.29 DG']],
 ['MBUSI/Kunshan', ['MBUSI','Kunshan']]].forEach(function(t){
  console.log('  ' + t[0] + ' 日期倒序: ' + (isDesc(times(t[1])) ? '是' : '否 ⚠'));
});
var root = spNodeAt([]).children;
console.log('  目录仍排在文件之前: ' + (function(){
  var seenFile=false, ok=true;
  (spNodeAt(['GLC','GZ PDC','2026-W36','400759 OOLU2038969910 ETA 2026.09.29 DG']).children||[]).forEach(function(c){
    if(c.kind==='file') seenFile=true; else if(seenFile) ok=false;
  });
  return ok ? '是' : '否 ⚠';
})());
`, ctx);
