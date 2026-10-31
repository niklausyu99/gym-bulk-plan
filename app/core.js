(function(root,factory){const blend=typeof module==='object'&&module.exports?require('./blend.js'):root.BulkBlend;const meals=typeof module==='object'&&module.exports?require('./meals.js'):root.BulkMeals;const core=factory(blend,meals);if(typeof module==='object'&&module.exports)module.exports=core;else root.BulkCore=core;})(typeof globalThis!=='undefined'?globalThis:this,(B,M)=>{
 'use strict';
 const CYCLE=['push','pull','legs','rest'];
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&iso(new Date(s+'T12:00:00'))===s;
 const shift=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);};
 const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 function nutrition(items){const total={k:0,p:0,c:0,f:0,fi:0,unknownFibre:false};for(const i of items){for(const k of ['k','p','c','f'])total[k]+=Number(i[k]||0);if(i.fi==null)total.unknownFibre=true;else total.fi+=i.fi;if(i.unknownFibre)total.unknownFibre=true;}return total;}
 function weightWindow(weights,end){const start=shift(end,-6),rows=weights.filter(w=>w.date>=start&&w.date<=end);return {start,end,count:rows.length,mean:rows.length?rows.reduce((s,w)=>s+w.value,0)/rows.length:null};}
 function trend(weights,end){const windows=[0,7,14].map(n=>weightWindow(weights,shift(end,-n)));const enough=windows.every(w=>w.count>=4);const changes=windows.slice(0,2).map((w,i)=>w.mean!=null&&windows[i+1].mean!=null?w.mean-windows[i+1].mean:null);return {windows,changes,enough,slow:enough&&changes.every(x=>x<.1)};}
 function progression(rows,maxReps,required){return rows.length>=required&&rows.slice(0,required).every(s=>s.done&&s.quality!==false&&(s.sideRecords?Object.values(s.sideRecords):[s]).every(t=>t.reps>=maxReps&&t.rir>=1&&t.rir<=2));}
 const loadConventions=['stack_display_kg','plates_total_kg','plates_per_arm_kg','added_plates_total_kg','each_dumbbell_kg','one_shared_dumbbell_kg','stack_display_per_side_kg','bar_inclusive_total_kg','assistance_kg','band_configuration','body_mass_plus_external_load_kg'];
 const reading=(s,band=false)=>s&&(band?s.kg==null||finite(s.kg,0,1000):finite(s.kg,0,1000))&&finite(s.reps,1,100)&&Number.isInteger(s.reps)&&finite(s.rir,0,10);
 function validSet(s){if(!s)return false;const r=s.recording;if(r&&!r.legacy&&!loadConventions.includes(r.loadConvention))return false;const band=r?.loadConvention==='band_configuration';if(r?.sided)return s.sideRecords&&Object.keys(s.sideRecords).length===2&&['left','right'].every(side=>reading(s.sideRecords[side],band));return !s.sideRecords&&reading(s,band);}
 const safeText=(v,n)=>typeof v==='string'&&v.length<=n;
 function validRecording(r){if(!r||typeof r!=='object'||Array.isArray(r))return false;if(r.legacy===true)return safeText(r.label,150);return r.version===1&&typeof r.variantId==='string'&&typeof r.familyId==='string'&&/^[a-z0-9-]{1,100}$/.test(r.variantId)&&/^[a-z0-9-]{1,100}$/.test(r.familyId)&&safeText(r.label,150)&&['',...loadConventions].includes(r.loadConvention)&&typeof r.sided==='boolean'&&typeof r.comparable==='boolean'&&safeText(r.signature,1600)&&safeText(r.device,100)&&safeText(r.settings,300)&&(r.bodyMass==null||finite(r.bodyMass,25,250))&&['both','working_limb','force_origin'].includes(r.sideAxis);}
 function optionalAllowed(checks){return Array.isArray(checks)&&checks.length===4&&checks.every(x=>x===true);}
 function nextPhase(cursor,complete){return complete?(cursor+1)%4:cursor;}
 function defaultPlan(gym=true){return {gym,blend:false,sides:['aglio','sweet'],addons:[],eaten:[],blendAmount:1};}
 function emptyState(){return {schema:2,cursor:0,events:[],sessions:[],draft:null,parkedDrafts:{},trainingSelections:{},plans:{},weights:[],inventory:0,blendDays:10,waistConcern:false,restEnds:0};}
 function activateDraft(s,day,create){
  if(!CYCLE.includes(day))throw Error('Unknown training day');
  if(s.draft?.day===day)return s.draft;
  const parked=s.parkedDrafts||(s.parkedDrafts={});
  if(s.draft){if(parked[s.draft.day])throw Error('Duplicate training draft');parked[s.draft.day]=s.draft;}
  s.draft=null;s.restEnds=0;
  if(day!=='rest'){s.draft=parked[day]||create(day);delete parked[day];}
  return s.draft;
 }
 function parseSetField(field,raw){if(!['kg','reps','rir'].includes(field))return {valid:false};if(raw==='')return {valid:true,value:null};const v=Number(raw),bounds={kg:[0,1000],reps:[1,100],rir:[0,10]};return {valid:finite(v,...bounds[field])&&(field!=='reps'||Number.isInteger(v)),value:v};}
 function restCursor(cursor){return cursor===3?0:cursor;}
 function validateState(s){
  if(!s||s.schema!==2||!Number.isInteger(s.cursor)||s.cursor<0||s.cursor>3||!Array.isArray(s.weights)||!Array.isArray(s.sessions)||!Array.isArray(s.events)||!s.plans||typeof s.plans!=='object'||Array.isArray(s.plans))return false;
  if(s.weights.length>10000||s.sessions.length>3000||s.events.length>12000||Object.keys(s.plans).length>5000||!Number.isInteger(s.inventory)||!finite(s.inventory,0,10000)||!Number.isInteger(s.blendDays)||!finite(s.blendDays,0,31)||typeof s.waistConcern!=='boolean'||!finite(s.restEnds,0,Date.now()+86400000))return false;
  if(s.weights.some(w=>!w||!validDate(w.date)||!finite(w.value,25,250))||new Set(s.weights.map(w=>w.date)).size!==s.weights.length)return false;
  if(s.events.some(e=>!e||!validDate(e.date)||!CYCLE.includes(e.phase)||(e.sessionId!=null&&typeof e.sessionId!=='string')))return false;
  const ids=['incline','flat','shoulder','lateral','fly','overhead','pulldown','row','latrow','rear','curl','hammer','hack','rdl','thrust','legcurl','extension','abduction','calf','crunch','pallof','pushdown','lowfly','straight','shrug','preacher','kickback','adduction','seatedcalf','wristcurl','wristextension'];
  const safeSession=x=>x&&(x.updatedAt==null||finite(x.updatedAt,x.started,Date.now()+86400000))&&validDate(x.date)&&['push','pull','legs'].includes(x.day)&&typeof x.id==='string'&&x.id.length>0&&x.id.length<100&&typeof x.note==='string'&&x.note.length<=300&&['normal','fatigue','pain'].includes(x.recovery)&&finite(x.started,0,Date.now()+86400000)&&(x.finished==null||finite(x.finished,x.started,Date.now()+86400000))&&Array.isArray(x.exercises)&&x.exercises.length<=32&&(!x.checks||(Array.isArray(x.checks)&&x.checks.length===4&&x.checks.every(b=>typeof b==='boolean')))&&new Set(x.exercises.map(e=>e?.id)).size===x.exercises.length&&x.exercises.every(e=>e&&typeof e.id==='string'&&ids.includes(e.id.replace(/-extra$/,''))&&typeof e.variant==='string'&&e.variant.length<150&&['extra','core','extraKey','manual','omitted','endedEarly','customSets'].every(k=>e[k]==null||typeof e[k]==='boolean')&&Array.isArray(e.sets)&&e.sets.length>0&&e.sets.length<=99&&e.sets.every(t=>t&&typeof t.done==='boolean'&&(t.quality==null||typeof t.quality==='boolean')&&['kg','reps','rir'].every(k=>t[k]===null||(typeof t[k]==='number'&&parseSetField(k,t[k]).valid))&&(!t.done||validSet(t))));
  if(s.sessions.some(x=>!safeSession(x))||(s.draft&&!safeSession(s.draft)))return false;
  if(s.editReturnDraft!=null&&(!s.draft?.editingSessionId||!safeSession(s.editReturnDraft)||s.editReturnDraft.editingSessionId))return false;if(s.trainingEdits!=null&&(typeof s.trainingEdits!=='object'||Array.isArray(s.trainingEdits)||Object.keys(s.trainingEdits).length>100||Object.entries(s.trainingEdits).some(([id,d])=>!safeSession(d)||d.editingSessionId!==id||d.id!==id)))return false;for(const d of [s.draft,...Object.values(s.trainingEdits||{})].filter(x=>x?.editingSessionId))if(typeof d.editingSessionId!=='string'||d.id!==d.editingSessionId||!s.sessions.some(x=>x.id===d.editingSessionId)||!finite(d.editingBaseUpdated,0,Date.now()+86400000))return false;
  if(s.parkedDrafts!=null){const p=s.parkedDrafts;if(typeof p!=='object'||Array.isArray(p)||Object.entries(p).some(([day,d])=>!['push','pull','legs'].includes(day)||!safeSession(d)||d.day!==day||(s.draft?.day===day&&!s.draft.editingSessionId))||new Set(Object.values(p).map(d=>d.id)).size!==Object.keys(p).length||Object.values(p).some(d=>d.id===s.draft?.id))return false;}
  for(const d of [...s.sessions,s.draft,s.editReturnDraft,...Object.values(s.trainingEdits||{}),...Object.values(s.parkedDrafts||{})].filter(Boolean))for(const e of d.exercises){if(e.shoulder!=null&&(e.shoulder!==true||e.id!=='lateral-extra'||e.trainingSide!=='left'||e.extra!==true||e.sets.length>99))return false;if(e.equipment!=null){const q=e.equipment;if(typeof q.variantId!=='string'||!/^[a-z0-9-]{1,100}$/.test(q.variantId)||!['',...loadConventions].includes(q.convention)||!q.setup||!safeText(q.setup.device,100)||!safeText(q.setup.settings,300)||typeof q.setup.confirmed!=='boolean'||(q.setup.bodyMass!=null&&!finite(q.setup.bodyMass,25,250)))return false;}for(const t of e.sets){if(t.doneAt!=null&&!finite(t.doneAt,d.started,Date.now()+86400000))return false;if(t.recording!=null&&!validRecording(t.recording))return false;if(t.sideRecords!=null&&(!t.recording?.sided||!['left','right'].every(side=>t.sideRecords[side]&&['kg','reps','rir'].every(k=>t.sideRecords[side][k]===null||parseSetField(k,t.sideRecords[side][k]).valid))||Object.keys(t.sideRecords).length!==2))return false;}}
  if(s.trainingSelections!=null){if(typeof s.trainingSelections!=='object'||Array.isArray(s.trainingSelections)||Object.keys(s.trainingSelections).length>5000)return false;for(const [date,days] of Object.entries(s.trainingSelections)){if(!validDate(date)||!days||typeof days!=='object'||Array.isArray(days))return false;for(const [day,q] of Object.entries(days)){if(!['push','pull','legs'].includes(day)||!q||!Array.isArray(q.items)||q.items.length>31||new Set(q.items.map(i=>i.id)).size!==q.items.length||q.items.some(i=>!ids.includes(i.id)||typeof i.variantId!=='string'||!/^[a-z0-9-]{1,100}$/.test(i.variantId))||!q.preferences||typeof q.preferences!=='object'||Array.isArray(q.preferences)||Object.entries(q.preferences).some(([id,v])=>!ids.includes(id)||typeof v!=='string'||!/^[a-z0-9-]{1,100}$/.test(v))||typeof q.customOrder!=='boolean')return false;}}}
  for(const [date,p] of Object.entries(s.plans)){
   if(!validDate(date)||!p||typeof p.gym!=='boolean'||typeof p.blend!=='boolean'||!Array.isArray(p.sides)||p.sides.length<1||p.sides.length>2||p.sides.some(x=>!['aglio','sweet','us','tomato','veg','mushroom'].includes(x))||!Array.isArray(p.addons)||p.addons.length>100||!Array.isArray(p.eaten)||![.5,1].includes(p.blendAmount))return false;
   if(!M.valid(p))return false;
   if(p.gymOverride!=null&&typeof p.gymOverride!=='boolean')return false;
   if(p.blendRecipe!=null&&!B.validRecipe(p.blendRecipe))return false;
   if(p.blendSnapshot!=null&&(!B.validSnapshot(p.blendSnapshot)||p.blendSnapshot.amount!==p.blendAmount))return false;
   const itemIds=[...(p.chickenPortions||[]).map((_,i)=>'chicken-'+i),...(p.blend?['blend']:[]),...p.sides.map((_,i)=>'meal-'+i),...p.addons.map((_,i)=>'add-'+i)];
   if(p.eaten.some(id=>typeof id!=='string'||!itemIds.includes(id))||new Set(p.eaten).size!==p.eaten.length)return false;
   if(p.addons.some(a=>!a||typeof a.name!=='string'||a.name.length>100||!['k','p','c','f'].every(k=>finite(a[k],0,10000))||(a.fi!=null&&!finite(a.fi,0,300))))return false;
  }
  return true;
 }

 return {CYCLE,iso,validDate,shift,finite,nutrition,weightWindow,trend,progression,validSet,optionalAllowed,nextPhase,defaultPlan,emptyState,parseSetField,restCursor,activateDraft,validateState};
});
