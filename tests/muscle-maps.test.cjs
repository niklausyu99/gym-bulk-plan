const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('content/plan.json','utf8'));
const context={window:{},D:data,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
for(const file of ['app/movements.js','app/muscle-maps.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
const source=fs.readFileSync('app/main.js','utf8').split('\n');
vm.runInNewContext(source.filter(l=>l.startsWith('const breathByExercise=')||['muscleMap','exerciseText','prescriptionStats'].some(n=>l.startsWith('function '+n+'('))).join('\n'),context);
test('每项训练详情均显示可用肌群图、完整动作文字和处方，不再依赖姿态查看器',()=>{
 for(const exercise of data.exercises){const map=context.window.BulkMuscleMaps[exercise.id];assert(map,exercise.id);assert(fs.existsSync(map.src),map.src);context.exercise=exercise;const html=vm.runInNewContext('exerciseText(exercise)',context);assert(html.includes(map.src),exercise.id);for(const label of ['准备','发力','终点','回程','呼吸','留意借力','组 × 次数'])assert(html.includes(label),exercise.id+': '+label);assert(!/movement-frame|data-action="(?:frame|angle|point|zoom-image)"|assets\/movements\//.test(html),exercise.id);}
 const scripts=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert(scripts.indexOf('app/muscle-maps.js')<scripts.indexOf('app/main.js'));
});
test('肌群角色无重复填色，风险轮廓可与正常稳定角色共存，深层区域明确标识',()=>{
 const spec=JSON.parse(fs.readFileSync('content/muscle-map-spec.json','utf8'));const covered=new Set();
 for(const map of spec.maps){const filled=['primary','assist','stable'].flatMap(role=>map[role]);assert.equal(new Set(filled).size,filled.length,map.id);for(const role of ['primary','assist','stable','risk','emphasis'])for(const id of map[role]||[])assert(spec.shapes[id],map.id+': '+id);for(const id of map.exerciseIds){assert(!covered.has(id),id);covered.add(id);}if(filled.some(id=>spec.shapes[id].deep))assert(/深层|透视/.test(map.note),map.id);}
 assert.deepEqual([...covered].sort(),data.exercises.map(e=>e.id).sort());assert(spec.maps.find(m=>m.id==='rdl').risk.includes('erectors'));assert(spec.maps.find(m=>m.id==='rdl').stable.includes('erectors'));
});
