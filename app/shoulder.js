(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BulkShoulder=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';const WINDOW=96*60*60*1000,LIMIT=3;
 function drafts(s){return [s.draft,...Object.values(s.trainingEdits||{}),s.editReturnDraft,...Object.values(s.parkedDrafts||{})].filter(Boolean);}
 function status(s,now=Date.now()){const all=[...drafts(s),...s.sessions],seen=new Set();let completed=0;for(const d of all){if(seen.has(d.id))continue;seen.add(d.id);for(const e of d.exercises)if(e.shoulder)for(const t of e.sets)if(t.done){const time=t.doneAt??d.finished??d.started;if(time>now-WINDOW&&time<=now)completed++;}}const pending=drafts(s).flatMap(d=>d.exercises.filter(e=>e.shoulder).flatMap(e=>e.sets.filter(t=>!t.done))).length;return {completed,pending,available:Math.max(0,LIMIT-completed)};}
 function attach(s,now=Date.now()){const d=s.draft;if(!d)return {error:'先开始本次训练。'};if(d.recovery!=='normal')return {error:'本次已有疲劳或不适记录，先不加肩部补充。'};if(d.exercises.some(e=>!e.extra&&e.sets.some(t=>!t.done)))return {error:'完成基础与已选核心训练后，再加入左肩补强。'};if(d.exercises.some(e=>e.shoulder))return {error:'本次已加入左肩补强。'};if(d.exercises.some(e=>e.extra))return {error:'本次已有补充项目，不再叠加左肩补强。'};const available=status(s,now).available;if(!available)return {error:'近4天已完成3组左肩补强，先恢复。'};
  const carried=[];for(const other of drafts(s))if(other!==d){for(const e of other.exercises)if(e.shoulder){carried.push(...e.sets.filter(t=>!t.done));e.sets=e.sets.filter(t=>t.done);}other.exercises=other.exercises.filter(e=>e.sets.length);}
  const sets=carried.slice(0,available);while(sets.length<available)sets.push({kg:null,reps:null,rir:3,done:false,quality:true});
  const entry={id:'lateral-extra',variant:'左臂绳索侧平举',shoulder:true,trainingSide:'left',extra:true,extraKey:true,sets};d.exercises.push(entry);return {entry,moved:carried.length>0};
 }
 return {WINDOW,LIMIT,status,attach};
});
