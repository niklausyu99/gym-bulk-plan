(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BulkCustomExercise=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const groups={chest:'胸部',back:'背部',shoulder:'肩部',biceps:'二头',triceps:'三头',forearms:'前臂',quads:'大腿前侧',hamstrings:'大腿后侧',glutes:'臀部',calves:'小腿',core:'核心',other:'其他部位'};
const units={stack_display_kg:'器械标重 kg',plates_total_kg:'全部加片合计 kg',plates_per_arm_kg:'每侧加片 kg',each_dumbbell_kg:'每只哑铃 kg',body_mass_plus_external_load_kg:'额外负重 kg',assistance_kg:'辅助重量 kg'};
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b,isId=id=>typeof id==='string'&&/^custom-[a-z0-9-]{8,70}$/.test(id);
function valid(q){return q&&typeof q==='object'&&!Array.isArray(q)&&Object.hasOwn(groups,q.group)&&typeof q.name==='string'&&q.name.length<=80&&Object.hasOwn(units,q.unit)&&Number.isInteger(q.sets)&&finite(q.sets,1,99)&&(q.kg===null||finite(q.kg,0,1000))&&(q.reps===null||Number.isInteger(q.reps)&&finite(q.reps,1,100))&&Number.isInteger(q.rest)&&finite(q.rest,15,600);}
function label(q){return q.name.trim()||groups[q.group]+' · 自定项目';}
function snapshot(e){return {version:1,custom:true,variantId:e.id,familyId:e.id,label:e.variant,loadConvention:e.custom.unit,sideAxis:'both',sided:false,device:'',settings:'',bodyMass:null,comparable:false,signature:JSON.stringify([e.id,e.custom.unit])};}
function blank(e,prefill=false){return {kg:prefill?e.custom.kg:null,reps:prefill?e.custom.reps:null,rir:null,done:false,quality:true,recording:snapshot(e)};}
function create(q,id='custom-'+globalThis.crypto.randomUUID()){if(!valid(q)||!isId(id))throw Error('请检查部位、重量、次数和组数。');const e={id,variant:label(q),custom:structuredClone(q),manual:true,sets:[]};e.sets=Array.from({length:q.sets},()=>blank(e,true));return e;}
function summary(t){return `${t.kg} ${units[t.recording?.loadConvention]||'kg'} × ${t.reps}次${t.rir==null?'':' / 余力'+t.rir}`;}
return {groups,units,valid,isId,label,snapshot,blank,create,summary};
});
