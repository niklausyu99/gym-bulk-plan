const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('content/plan.json','utf8'));
const context={window:{},D:data,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
for(const file of ['app/movements.js','app/muscle-maps.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
test('归档训练肌群图仍保留，可恢复时使用；当前页面不加载训练模块',()=>{for(const e of data.exercises){const map=context.window.BulkMuscleMaps[e.id];assert(map,e.id);assert(fs.existsSync(map.src),map.src);}assert(!fs.readFileSync('index.html','utf8').includes('src="app/muscle-maps.js"'));});
test('肌群角色无重复填色，风险轮廓可与正常稳定角色共存，深层区域明确标识',()=>{
 const spec=JSON.parse(fs.readFileSync('content/muscle-map-spec.json','utf8'));const covered=new Set();
 for(const map of spec.maps){const filled=['primary','assist','stable'].flatMap(role=>map[role]);assert.equal(new Set(filled).size,filled.length,map.id);for(const role of ['primary','assist','stable','risk','emphasis'])for(const id of map[role]||[])assert(spec.shapes[id],map.id+': '+id);for(const id of map.exerciseIds){assert(!covered.has(id),id);covered.add(id);}if(filled.some(id=>spec.shapes[id].deep))assert(/深层|透视/.test(map.note),map.id);}
 assert.deepEqual([...covered].sort(),data.exercises.map(e=>e.id).sort());assert(spec.maps.find(m=>m.id==='rdl').risk.includes('erectors'));assert(spec.maps.find(m=>m.id==='rdl').stable.includes('erectors'));
});
