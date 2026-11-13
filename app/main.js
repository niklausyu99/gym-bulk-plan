(()=>{'use strict';
const UI=window.BulkUI,D=window.BULK_DATA,B=window.BulkBlend,C=window.BulkCore,M=window.BulkMeals,P=window.BulkPantry,PV=window.BulkPantryView,FV=window.BulkFoodView,PairV=window.BulkPairingView,SU=window.BulkSupplements,SUV=window.BulkSupplementView,N=window.BulkMicronutrients,NV=window.BulkMicronutrientView,$=s=>document.querySelector(s),KEY='bulkplan-v2';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>C.iso(new Date()),num=(n,d=0)=>Number(n).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const icon=(name)=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',training:'<path d="M4 7v10M7 4v16M17 4v16M20 7v10M7 12h10"/>',nutrition:'<path d="M4 3v6q0 3 3 3V3M10 3v6q0 3-3 3v9M19 3q-5 6 0 9v9M19 3v9"/>',progress:'<path d="M3 3v18h18M6 16l5-6 4 3 5-8"/>',book:'<path d="M12 5q-5-3-9 0v15q4-3 9 0 5-3 9 0V5q-4-3-9 0v15"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.1 14H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',mark:'<path d="M3 17V7h6q4 0 4 3t-4 3H3m6 0q5 0 5 3t-5 3H3M17 5v14m0-7h5"/>'})[name]||'<circle cx="12" cy="12" r="8"/>'}</svg>`;
const btn=(label,action,param='',kind='',extra='')=>`<button type="button" class="btn ${kind}" data-action="${action}" data-param="${esc(param)}" ${extra}>${label}</button>`;
const header=(title,note,actions='')=>`<header class="page-head"><div><h1>${title}</h1><p>${note}</p></div><div class="head-actions">${actions}</div></header>`;
const imeTargets=new Set();let imeNeedsRender=false,renderRevision=0;
let cloud=null,vault=null,localConflict=false,pendingRecovery=[],backupPoints=[],restoreBusy=false;const formDrafts={},openDetails={},horizontalScroll={};
let state=C.emptyState(),storageOK=true,migrated=false,storedRaw=null,invalidRaw=null;
try{storedRaw=localStorage.getItem(KEY);if(storedRaw){const parsed=JSON.parse(storedRaw);if(C.validateState(parsed))state=parsed;else throw Error('invalid')}else{const old=JSON.parse(localStorage.getItem('bulk-weight-data')||'[]');if(Array.isArray(old)){state.weights=old.filter(w=>C.validDate(w.date)&&C.finite(w.value,25,250));migrated=state.weights.length>0;}}}catch(e){storageOK=false;if(storedRaw!==null)invalidRaw=storedRaw;}
const preservedBlendHistory=B.preserveConsumedLegacy(state),migratedFoods=C.migrateCustomFoods(state);for(const p of Object.values(state.plans))M.preserve(p,D.sides);
let renderedDate=today(),foodUndo=null,chickenEdit=null;
let view='',nutritionTab='today',saveStamp='',docSearch='',historyKind='diet',historyDate='',supplementDate='';
const toast=text=>{const el=$('#toast');el.textContent=text;el.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.display='none',3200);};
let pendingConfirmation=null;
function confirmAction(message,label='继续',danger=false){if(pendingConfirmation)return Promise.resolve(false);const dialog=$('#confirm-dialog'),button=$('#confirm-continue');$('#confirm-message').textContent=message;button.textContent=label;button.dataset.danger=String(danger);return new Promise(resolve=>{pendingConfirmation=result=>{dialog.close();pendingConfirmation=null;resolve(result);};dialog.showModal();$('#confirm-cancel').focus();});}
$('#confirm-cancel').addEventListener('click',()=>pendingConfirmation?.(false));$('#confirm-continue').addEventListener('click',()=>pendingConfirmation?.(true));$('#confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();pendingConfirmation?.(false);});
function save(candidate){if(invalidRaw!==null){storageOK=false;saveStamp='原始记录已保留，请先导出并恢复备份';return Promise.resolve(false);}const success=()=>{storageOK=true;saveStamp='已保存在本机';cloud?.changed();document.querySelectorAll('.save-status').forEach(e=>e.textContent=saveStamp);return true;};const fail=e=>{storageOK=false;localConflict=!!vault?.conflicted();saveStamp=localConflict?'另一个页面有新记录，可从本机备份恢复':'本机未能保存，请导出记录';document.querySelectorAll('.save-status').forEach(e=>e.textContent=saveStamp);if(localConflict)render();return false;};if(vault)return vault.write(candidate,candidate?{expected:state}:{}).then(success).catch(fail);try{localStorage.setItem(KEY,JSON.stringify(candidate||state));if(candidate)state=candidate;return Promise.resolve(success());}catch(e){return Promise.resolve(fail(e));}}
function plan(){const t=today(),p=state.plans[t]||(state.plans[t]=C.defaultPlan(Object.entries(state.plans).filter(([date])=>date<t).sort(([a],[b])=>b.localeCompare(a))[0]?.[1].gym??true));M.separate(p,D.sides);return p;}
function items(p=plan()){const list=[];if(p.blend)list.push({...B.nutritionForPlan(D.blendIngredients,p),id:'blend',name:'我的 Blend'});list.push(...M.items(p,D.sides));p.addons.forEach((a,i)=>list.push({...a,id:'add-'+i}));return list;}
function renderRecipeKeepScroll(id){const scroll=$('#main').scrollTop,y=window.scrollY;render();$('#main').scrollTop=scroll;window.scrollTo(0,y);if(id)document.querySelector(`[data-blend-ingredient="${id}"]`)?.focus({preventScroll:true});}
function foodContext(){return {date:today(),getDate:today,confirm:confirmAction,getState:()=>state,getPlan:plan,refresh:render,save,toast,added:(index,entry)=>{foodUndo={date:today(),index,snapshot:JSON.stringify(entry),name:entry.name,eaten:plan().eaten.includes('add-'+index)};nutritionTab='today';window.history?.replaceState(null,'','#nutrition/today');render();document.querySelector(`[data-action="food-edit"][data-param="${index}"]`)?.scrollIntoView({block:'center'});},dialog:$('#details'),content:$('#dialog-content'),items:D.pantryItems,esc,btn};}
function supplementContext(date=supplementDate||today()){return {...foodContext(),date,today:today(),plan:state.plans[date]||C.defaultPlan(),ingredients:D.blendIngredients,sides:D.sides,validDate:C.validDate,getPlan:day=>state.plans[day]||(state.plans[day]=C.defaultPlan(day===today()?plan().gym:state.events.some(e=>e.date===day&&e.phase!=='rest')))};}
function pantryContext(){return {...foodContext(),items:D.pantryItems,header};}
function pantry(){return PV.render(pantryContext());}
function recipe(){return window.BulkRecipeView.render({ingredients:D.blendIngredients,plan:plan(),blend:B,esc,num});}

const plannedTotal=()=>C.nutrition([...items(),...SU.macros(plan())]),actualTotal=()=>C.nutrition([...items().filter(x=>plan().eaten.includes(x.id)),...SU.macros(plan())]);
const target=()=>plan().gym?{k:[2450,2550],p:[100,110],c:[320,360],f:[65,80],fi:[25,30]}:{k:[2350,2450],p:[100,110],c:[280,330],f:[65,80],fi:[25,30]};
const nutritionSummary=window.BulkNutritionSummary?.create({esc,visible:()=>view==='home'||view==='pantry'||view==='nutrition'&&['today','foods','sides','budget'].includes(nutritionTab),getData:()=>({date:today(),plan:plan(),actual:actualTotal(),planned:plannedTotal(),goal:target(),advice:total=>B.suggestions(plan(),total,target(),D.sides)}),renderMicros:()=>NV.render({...supplementContext(today()),title:'维生素与矿物质'}),foods:()=>{nutritionTab='foods';if(view!=='nutrition')location.hash='#nutrition/foods';else{window.history.replaceState(null,'','#nutrition/foods');render();}requestAnimationFrame(()=>document.querySelector('.food-library')?.scrollIntoView({block:'start'}));}});
function nav(){const links=[['home','今天'],['nutrition','饮食'],['progress','进度'],['more','更多']],active=view==='pantry'?'nutrition':view==='history'?'progress':['guide','movement','settings'].includes(view)?'more':view;$('#sidebar').innerHTML=`<a class="brand" href="#home"><img class="brand-symbol" src="assets/icons/bulkplan-lime-192.png" width="32" height="32" alt="">BulkPlan</a><p class="brand-caption">饮食与体重，每天记一点。</p><nav>${links.map(([id,n])=>`<a class="navitem ${active===id?'active':''}" href="#${id}">${icon(id)}${n}</a>`).join('')}</nav><div class="sidebar-bottom"><a class="navitem" href="#guide">${icon('book')}饮食手册</a><a class="navitem" href="#settings">${icon('download')}记录与备份</a><div class="goal-note"><small>个人增肌计划</small><b>49 → 60 kg</b><small>167 cm / 稳定增肌</small></div></div><div class="mobile-tools"><span class="sync-indicator is-pending" data-sync-indicator role="status">未连接备份</span><a class="btn text" href="#settings" aria-label="设置：记录与备份">${icon('settings')}</a></div>`;$('#mobile-nav').innerHTML=links.map(([id,n])=>`<a href="#${id}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${icon(id)}${n}</a>`).join('');}
function home(){const p=plan(),goal=target(),actual=actualTotal(),weight=state.weights.filter(w=>w.date<=today()).sort((a,b)=>a.date.localeCompare(b.date)).at(-1),days=state.weights.filter(w=>w.date>=C.shift(today(),-6)&&w.date<=today()).length;return header('今天',new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))+SUV.reminder(supplementContext(today()))+`<div class="grid12 home-grid"><section class="panel tonal span8"><div class="panel-head"><h2>今天怎么吃</h2></div>${dietModePicker(p)}<div class="home-actions"><a class="btn primary" href="#nutrition">记录今日饮食</a></div></section><section class="panel span4"><div class="panel-head"><h2>今日营养</h2><span class="small">${p.gym?'训练日':'休息日'}</span></div><button type="button" class="home-nutrition-open" data-action="nutrition-summary" aria-haspopup="dialog" aria-controls="nutrition-summary"><span><small>已记录摄入</small><strong>${num(Math.round(actual.k/10)*10)} <small>kcal</small></strong><small>目标 ${goal.k[0]}–${goal.k[1]} kcal</small></span><span>查看缺口 ↗</span></button></section><section class="panel span6"><div class="home-weight"><div><small>最近晨起体重</small><strong>${weight?num(weight.value,1)+' kg':'还没有记录'}</strong><p class="small">${weight?weight.date:'记录后，再看真实趋势。'}</p></div><a class="btn secondary" href="#progress">记体重</a></div></section><section class="panel span6"><div class="panel-head"><h2>最近七天</h2><a class="row-link" href="#history">查看记录</a></div><p style="margin:0">${days} 天体重记录</p><a class="btn secondary section" href="#pantry">食物与采购</a></section></div>`;}
function dietModePicker(p){const dayOptions=[['gym','训练日'],['rest','休息日']],blendOptions=[['yes','有 Blend'],['no','无 Blend']];return `<div class="diet-mode-picker"><div class="mode-group"><div class="mode-label"><span>今日安排</span><small>按实际训练选择</small></div><div class="mode-segments day-segments" role="group" aria-label="今日安排">${dayOptions.map(([v,n])=>`<button data-action="day-mode" data-param="${v}" aria-pressed="${p.gym===(v==='gym')}" class="${p.gym===(v==='gym')?'selected':''}"><span class="mode-check" aria-hidden="true">${p.gym===(v==='gym')?'<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>':''}</span>${n}</button>`).join('')}</div></div><div class="mode-group"><div class="mode-label"><span>今日奶昔</span><small>按今天食材计算</small></div><div class="mode-segments blend-segments" role="group" aria-label="今日奶昔">${blendOptions.map(([v,n])=>`<button data-action="blend-mode" data-param="${v}" aria-pressed="${p.blend===(v==='yes')}" class="${p.blend===(v==='yes')?'selected':''}"><span class="mode-check" aria-hidden="true">${p.blend===(v==='yes')?'<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>':''}</span>${n}</button>`).join('')}</div></div><div class="mode-result" aria-live="polite"><div><small>热量目标 · ${p.gym?'训练日':'休息日'}</small><strong>${p.gym?'2,450–2,550':'2,350–2,450'} <span>kcal</span></strong></div><div><small>${p.blend?'有 Blend':'无 Blend'} · 建议 ${p.blend?1:2} 份搭配</small><strong>已安排 ${p.sides.length} <span>份搭配</span></strong></div></div></div>`;}
function dailyFoodRow(p,a){if(a.id.startsWith('meal-'))return window.BulkMealView.row({p,a,index:+a.id.slice(5),D,esc,num,btn});return `<div class="meal-row"><label class="meal-eaten"><input type="checkbox" data-eaten="${a.id}" aria-label="${esc(a.name)}已吃" ${p.eaten.includes(a.id)?'checked':''}><span>已吃</span></label><div>${a.id.startsWith('add-')?btn(esc(a.name),'food-edit',a.id.slice(4),'text meal-edit-name','aria-haspopup="dialog"'):btn(esc(a.name),'nutrition-tab','recipe','text meal-edit-name')}<small>约${num(a.k)} kcal · 蛋白${num(a.p)}g</small>${a.id==='blend'?`<small>${p.blendAmount===.5?'半杯':'整杯'} · ${btn('调整配方','nutrition-tab','recipe','text')}</small>`:''}</div>${a.id.startsWith('add-')?btn('移除','remove-addon',a.id.slice(4),'text'):''}</div>`;}
function nutrition(){const p=plan(),all=items(),tabs=[['today','今日搭配'],['foods','选食物'],['recipe','Blend 配方'],['supplements','补充剂'],['sides','餐盒指南'],['budget','采购预算']];let content='';if(nutritionTab==='today')content=`<section class="panel nutrition-daily-plan">
 <div class="diet-summary"><div><h2>${p.gym?'训练日':'休息日'} · ${p.blend?'有 Blend':'无 Blend'}</h2><small>${today()}</small></div></div>
 ${window.BulkMealView.chicken({p,btn})}
 <div class="daily-group-head"><h3>配菜</h3>${btn('＋ 添加配菜','side-add-open','','secondary',`aria-haspopup="dialog" ${p.sides.length>=20?'disabled':''}`)}</div>
 ${all.filter(a=>a.id.startsWith('meal-')).map(a=>dailyFoodRow(p,a)).join('')}
 <div class="daily-group-head"><h3>Blend 与加餐</h3>${btn('＋ 选食物','food-jump','','secondary')}</div>
 ${all.filter(a=>a.id==='blend'||a.id.startsWith('add-')).map(a=>dailyFoodRow(p,a)+(foodUndo?.date===today()&&a.id==='add-'+foodUndo.index?`<div class="food-added-result" role="status"><span>${foodUndo.eaten?'已记为已吃':'已加入计划'} ${esc(foodUndo.name)}</span>${btn('撤销这次新增','food-undo','','text')}</div>`:'')).join('')||'<p class="small">今天还没有安排 Blend 或加餐。</p>'}
 </section>`;
if(nutritionTab==='foods')content=`<section class="panel">${FV.choices(foodContext())}</section>`;
if(nutritionTab==='supplements')content=SUV.render(supplementContext());
if(nutritionTab==='recipe')content=recipe();
if(nutritionTab==='sides')content=`<section class="panel"><h2>鸡胸与 Side，按当天搭配</h2><p>鸡胸约160g，约263 kcal · 蛋白48g · 碳水9g · 脂肪6.4g。可单吃，也可搭配一份 Side。</p><p class="small">下列展示整盒参考值；今日配菜按整盒减去鸡胸参考值估算，鸡胸肉按计划份数单独计算。</p><div class="side-guide">${D.sides.map(s=>`<div><strong>${s.name}</strong><small>${s.starch?'主食型，训练日优先':'轻 Side，可另加主食'}</small><p style="margin:10px 0 0">${s.k} kcal / ${s.p}P / ${s.c}C / ${s.f}F</p></div>`).join('')}</div><p class="notice section">明确排除 Garlic Chickpea、Pumpkin Soup、Tomato Soup；Italian Tomato Pasta 可以选。</p><p class="small">餐盒纤维未知，不按零计算。营养数值以实际包装标签为准。</p></section>`;
if(nutritionTab==='budget'){const n=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),b=Math.min(n,state.blendDays),meals=2*n-b,per=389/23;content=`<div class="grid12"><section class="panel span7"><h2>${new Date().getMonth()+1}月采购估算</h2><p class="small">本月 ${n} 天，假设有 Blend 日1盒、无 Blend 日2盒。</p><label class="field">预计 Blend 天数<input type="range" min="0" max="${n}" value="${b}" data-change="blend-days" aria-label="本月Blend天数"></label><div class="metrics-line"><div><small>Blend</small><strong>${b} 天</strong></div><div><small>餐盒需求</small><strong>${meals} 盒</strong></div><div><small>摊销成本</small><strong>RM${num(meals*per)}</strong></div></div><div class="notice">若全部购买完整 Set E，需要 ${Math.ceil(meals/23)} 套，现金支出 RM${Math.ceil(meals/23)*389}，余下 ${Math.ceil(meals/23)*23-meals} 盒。摊销成本与实际付款不同，以上均不含运费及其他食物。</div><h3 class="section">餐盒库存</h3><p class="budget-main">${P.status(state,D.pantryItems.find(i=>i.id==='chicken-box')).unknown?'尚未盘点':state.inventory+' 盒'}</p><a class="btn secondary" href="#pantry">盘点与补货</a><p class="small section">餐盒与其他食材统一在采购页记录；计划与“已吃”不会自动扣减库存。</p></section><section class="panel span5"><h2>先试吃，再滚动补货</h2><div class="stats"><div class="stat"><span>首单 Set C / 11盒</span><b>RM209</b><small>≈RM19/盒</small></div><div class="stat"><span>长期 Set E / 23盒</span><b>RM389</b><small>≈RM16.91/盒</small></div></div><h3 class="section">11盒试吃组合</h3><ul><li>Aglio ×3</li><li>Sweet Potato ×2</li><li>US Potato ×2</li><li>Italian Tomato Pasta ×2</li><li>Mixed Vege ×1</li><li>Mushroom Soup ×1</li></ul><p class="small">长期约70–80%主食型 / 20–30%轻 Side。参考价格，实际售价与配送以商家为准。</p><a href="https://dietchicken.com" target="_blank" rel="noopener">查看商家官网</a></section></div>`;}
return header('饮食','按今天的训练、食欲和缺口来安排。',`<a class="btn secondary" href="#pantry">食物与采购</a>${btn('＋ 加餐','food-jump','','primary')}`)+`<div class="tabs nutrition-tabs" data-scroll-key="nutrition-tabs">${tabs.map(([id,n])=>`<button aria-pressed="${id===nutritionTab}" class="tab ${id===nutritionTab?'active':''}" data-action="nutrition-tab" data-param="${id}">${n}</button>`).join('')}</div>`+content;}
function weightChart(){const rows=state.weights.filter(w=>w.date>=C.shift(today(),-27)&&w.date<=today());if(!rows.length)return '<div class="empty">还没有体重记录。记录晨起体重后，再看真实的日历日趋势。</div>';const vals=rows.map(w=>w.value),low=Math.floor(Math.min(...vals)-.5),high=Math.ceil(Math.max(...vals)+.5),chartWidth=Math.max(240,Math.min(680,($('#main')?.clientWidth||760)-72)),x=d=>42+((new Date(d+'T12:00:00')-new Date(C.shift(today(),-27)+'T12:00:00'))/86400000)/27*(chartWidth-58),y=v=>180-(v-low)/(high-low)*140;return `<svg class="chart" viewBox="0 0 ${chartWidth} 220" role="img" aria-label="最近28个日历日晨起体重趋势，单位kg">${[0,1,2,3].map(i=>{const v=low+(high-low)*i/3;return `<path class="gridline" d="M48 ${y(v)}H${chartWidth-16}"/><text x="38" y="${y(v)+4}" text-anchor="end">${num(v,1)}</text>`;}).join('')}<polyline class="plot" points="${rows.map(w=>`${x(w.date)},${y(w.value)}`).join(' ')}"/>${rows.length===1?`<circle cx="${x(rows[0].date)}" cy="${y(rows[0].value)}" r="4" fill="#365f50"/>`:''}${[27,18,9,0].map(n=>`<text x="${x(C.shift(today(),-n))}" y="210" text-anchor="middle">${C.shift(today(),-n).slice(5)}</text>`).join('')}</svg>`;}
function progress(){const tr=C.trend(state.weights,today()),w=tr.windows[0],prior=tr.windows[1];let message='目标每周约增加0.15–0.25kg，观察周平均，不按单日波动改热量。';if(tr.slow)message='三个7日窗口各有至少4天记录，连续两段均低于+0.1kg/周。先检查执行与恢复，再考虑每天增加150–200kcal。';else if(tr.enough&&tr.changes[0]>.35&&state.waistConcern)message='近期周平均增速超过0.35kg，且你已标记腰围快速上升。可考虑减少100–150kcal，并继续观察。';return header('进度','记录晨起体重，观察每周平均变化。',`<a class="btn secondary" href="#history">全部记录</a>`)+`<div class="grid12"><section class="panel span8"><div class="panel-head"><h2>晨起体重</h2><span class="small">最近28个日历日</span></div>${weightChart()}<div class="stats"><div class="stat"><span>最近7日平均 / ${w.count}天记录</span><b>${w.mean==null?'—':num(w.mean,2)}</b><small>kg</small></div><div class="stat"><span>此前7日平均 / ${prior.count}天记录</span><b>${prior.mean==null?'—':num(prior.mean,2)}</b><small>kg</small></div><div class="stat"><span>周平均变化</span><b>${w.count>=4&&prior.count>=4?(tr.changes[0]>=0?'+':'')+num(tr.changes[0],2):'—'}</b><small>kg</small></div></div><p class="notice section">${message}</p><p class="small">每周至少记录4天，再比较周平均。记录不足时，先继续记录。</p></section><section class="panel span4"><h2>记下今天</h2><div class="form-grid"><label class="field">日期<input id="weight-date" type="date" required max="${today()}" value="${today()}"></label><label class="field">晨起体重 kg<input id="weight-value" type="number" required min="25" max="250" step=".1" inputmode="decimal"></label></div>${btn('保存体重','save-weight','','','style="margin-top:16px"')}<label class="inline small section"><input type="checkbox" id="waist-concern" ${state.waistConcern?'checked':''}>近期腰围明显快速上升</label><div class="weight-list section">${state.weights.slice(-7).reverse().map(w=>`<div><span>${w.date}</span><span>${num(w.value,1)} kg</span>${btn('删除','delete-weight',w.date,'text')}</div>`).join('')||'<p class="small">暂无记录。</p>'}</div></section></div>`;}
function inlineMd(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/https:\/\/[^\s<]+/g,u=>`<a href="${u}" target="_blank" rel="noopener">${u}</a>`);}
function markdown(text){const lines=text.split('\n');let out='',inList=false,table=[];const flush=()=>{if(table.length){const rows=table.filter(l=>!/^\|[\s:|-]+\|$/.test(l));out+='<div class="table-scroll"><table>'+rows.map((l,i)=>'<tr>'+l.trim().replace(/^\||\|$/g,'').split('|').map(x=>`<${i?'td':'th'}>${inlineMd(x.trim())}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table></div>';table=[];}if(inList){out+='</ul>';inList=false;}};for(const l of lines){if(l.startsWith('|')){table.push(l);continue;}if(table.length)flush();if(/^[-*] /.test(l)||/^\d+\. /.test(l)){if(!inList){out+='<ul>';inList=true;}out+='<li>'+inlineMd(l.replace(/^([-*]|\d+\.) /,''))+'</li>';continue;}flush();if(/^#{1,6} /.test(l))out+='<h3>'+inlineMd(l.replace(/^#{1,6} /,''))+'</h3>';else if(l.startsWith('> '))out+='<blockquote>'+inlineMd(l.slice(2))+'</blockquote>';else if(l.trim()&&l!=='---')out+='<p>'+inlineMd(l)+'</p>';}flush();return out;}
function guide(){const source=window.BulkHandbook.nutrition,sections=source.filter(s=>(s.title+s.body).toLowerCase().includes(docSearch.toLowerCase()));return header('饮食手册','查看饮食安排、配方和营养目标。',`<a class="btn secondary" href="#more">更多</a>`)+`<label class="field">查找内容<input class="search" id="doc-search" value="${esc(docSearch)}" placeholder="例如：蛋白质、Blend、预算"></label><p class="source-count">${sections.length} 个章节${docSearch?'符合检索':''}</p>${sections.map(s=>`<details class="chapter" ${docSearch?'open':''}><summary>${esc(s.title)}</summary><div class="doc">${markdown(s.body)}</div></details>`).join('')||'<div class="empty">没有匹配内容，换个关键词试试。</div>'}`;}


function more(){return header('更多','饮食指南、采购与记录备份。')+`<div class="app-links"><a class="app-link" href="#pantry"><div><strong>食物与采购</strong><small>盘点剩余、查看待购、补货后入库</small></div>${icon('nutrition')}</a><a class="app-link" href="#guide"><div><strong>饮食手册</strong><small>饮食安排、配方与营养目标</small></div>${icon('book')}</a><a class="app-link" href="#settings"><div><strong>记录与备份</strong><small>导出、恢复与私有同步</small></div>${icon('download')}</a></div><section class="panel section"><h2>放到 iPhone 主屏幕</h2><ol class="install-steps"><li>在 Safari 打开 BulkPlan。</li><li>点分享，选择“添加到主屏幕”。</li><li>在“记录与备份”连接后，等顶部显示“已同步”。</li></ol><p class="small section">断网浏览准备：<span data-offline-detail>检查中</span></p><p class="small">断网时先保存在本机，连接后的修改会在恢复联网时自动同步。更换设备前建议另存一份备份。</p></section>`;}

function history(){return window.BulkHistory.render({state,kind:historyKind,date:historyDate,D,B,C,esc,btn});}
function settings(){
 return header('记录与备份','本机自动保存，联网后自动上传到私有仓库。')+`
 <section class="panel">
  <h2>本机记录</h2>
  ${invalidRaw!==null||localStorage.getItem('bulkplan-original-raw')!==null?btn('导出原始记录','export-raw','','secondary'):''}
  <div class="stats"><div class="stat"><span>体重</span><b>${state.weights.length}</b><small>天</small></div><div class="stat"><span>饮食记录</span><b>${Object.keys(state.plans).length}</b><small>天</small></div></div>
  ${btn('导出全部记录','export','','secondary')}
  <p class="save-status">${saveStamp||'记录会自动保存'}</p>
 </section>
 ${window.BulkSyncView?.render(cloud,esc,btn)||''}
 <section class="panel section recovery-panel">
  <h2>危险区</h2><p>恢复会用选中的备份替换这台设备上的整份记录。</p>
  ${btn('恢复备份','restore-backup','','secondary','aria-haspopup="dialog"')}
 </section>`;
}
function formKey(el){return (view||'home')+'|'+el.id;}
function render(){if(imeTargets.size){imeNeedsRender=true;return;}const focused=UI.captureFocus($('#main')),fieldErrors=[...$('#main').querySelectorAll('[aria-invalid="true"]')].map(el=>({id:el.id,message:$('#'+el.id+'-error')?.textContent}));renderRevision++;for(const el of document.querySelectorAll('[data-scroll-key]'))horizontalScroll[view+'|'+el.dataset.scrollKey]=el.scrollLeft;for(const d of document.querySelectorAll('#main details[data-keep-open]'))openDetails[view+'|'+d.dataset.keepOpen]=d.open;for(const el of document.querySelectorAll('#main input[id],#main textarea[data-equipment-field],#main input[data-equipment-field]'))if(!el.dataset.equipmentField&&!['session-note','recovery','sync-token'].includes(el.id)&&el.type!=='checkbox'&&el.type!=='range')formDrafts[formKey(el)]=el.value;if(renderedDate!==today()&&supplementDate===renderedDate)supplementDate='';renderedDate=today();nav();const pages={home,nutrition,pantry,progress,guide,settings,more,history};$('#main').innerHTML=(localConflict?`<section class="panel local-conflict"><h2>另一个页面有新记录</h2><p>两个版本都已保存为本机备份。恢复一份备份后可继续记录。</p>${btn('恢复备份','restore-backup','','secondary')}</section>`:'')+(!storageOK?'<div class="notice warning">本机数据无法可靠读取或保存。<a href="#settings">先导出原始记录或恢复备份</a>，原数据不会被覆盖。</div>':'')+(pages[view]||home)();for(const el of document.querySelectorAll('#main input[id],#main textarea[data-equipment-field],#main input[data-equipment-field]')){const value=formDrafts[formKey(el)];if(value!=null&&el.type!=='checkbox'&&el.type!=='range'&&el.id!=='sync-token'&&el.id!=='session-note')el.value=value;}for(const d of document.querySelectorAll('#main details[data-keep-open]')){const open=openDetails[view+'|'+d.dataset.keepOpen];if(open!=null)d.open=open;}for(const el of document.querySelectorAll('[data-scroll-key]'))el.scrollLeft=horizontalScroll[view+'|'+el.dataset.scrollKey]||0;for(const {id,message} of fieldErrors){const field=document.getElementById(id);if(field&&$('#main').contains(field))UI.error(field,message);}UI.restoreFocus(focused,$('#main'));if(cloud)window.BulkSyncView.update(cloud);nutritionSummary?.update();window.dispatchEvent(new Event('bulkplan-render'));}
function route(){for(const el of document.querySelectorAll('#main input[id]'))if(el.id!=='sync-token'&&el.type!=='checkbox')formDrafts[(view||'home')+'|'+el.id]=el.value;view=location.hash.slice(1).split(/[?\/]/)[0]||'home';if(view==='training'||view==='movement'){view='home';window.history?.replaceState(null,'','#home');}if(view==='nutrition'){const tab=location.hash.split('/')[1];nutritionTab=['today','foods','recipe','supplements','sides','budget'].includes(tab)?tab:'today';if(tab==='arrange')window.history?.replaceState(null,'','#nutrition/today');}if(!['home','nutrition','pantry','progress','guide','settings','more','history'].includes(view))view='home';render();$('#main').scrollTo(0,0);scrollTo(0,0);$('#main').focus({preventScroll:true});}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,p=b.dataset.param;
if(a==='supplement-open'){supplementDate=C.validDate(p)&&p<=today()?p:today();nutritionTab='supplements';$('#details').close();location.hash='#nutrition/supplements';route();return;}
if(a.startsWith('supplement-'))return SUV.handle(supplementContext(),a,p);
if(a.startsWith('pairing-'))return PairV.handle(foodContext(),a,p);
if(a.startsWith('pantry-'))return PV.handle(pantryContext(),a,p);
if(a==='food-jump'){nutritionTab='foods';window.history?.replaceState(null,'','#nutrition/foods');}
if(a==='food-undo'){if(!foodUndo||foodUndo.date!==today())return;const q=state.plans[foodUndo.date],i=foodUndo.index;if(!q||JSON.stringify(q.addons[i])!==foodUndo.snapshot){foodUndo=null;render();return toast('这份食物已有变化，请从清单核对后移除。');}const next=structuredClone(state),plan=next.plans[foodUndo.date];plan.addons.splice(i,1);plan.eaten=plan.eaten.filter(id=>id!=='add-'+i).map(id=>id.startsWith('add-')&&+id.slice(4)>i?'add-'+(+id.slice(4)-1):id);if(await save(next)){foodUndo=null;render();toast('已撤销这次新增。');}return;}
if(a.startsWith('food-'))return FV.handle(foodContext(),a,p);
if(a==='zoom-blend'){const img=b.querySelector('img');window.BulkZoom.open(img.getAttribute('src'),img.alt,'Blend食材');return;}
if(a==='guide-tab'||a==='library-day')return;
if(a==='history-kind'){historyKind=p==='weight'?'weight':'diet';render();return;}
if(a==='history-diet'){const q=state.plans[p];if(!q)return;const rows=items(q);$('#dialog-content').innerHTML=`<h2 id="dialog-title">${esc(p)}的饮食</h2><ul>${rows.map(a=>`<li><strong>${esc(a.name)}</strong> · ${q.eaten.includes(a.id)?'已吃':'已安排'}<p>约${num(a.k)} kcal · 蛋白${num(a.p)}g · 碳水${num(a.c)}g · 脂肪${num(a.f)}g</p></li>`).join('')}</ul><section class="supplement-history"><h3>补充剂</h3><ul>${Object.values(q.supplements||{}).map(r=>`<li>${esc(r.snapshot.name)} · 已服用 ${r.count} ${esc(r.snapshot.unit)}</li>`).join('')||'<li>尚未记录</li>'}</ul><p class="small">已知热量 ${num(SU.totals(q).k)} kcal · 脂肪 ${num(SU.totals(q).f)} g</p>${btn('查看与调整补充剂','supplement-open',p,'secondary')}</section>`;$('#details').showModal();return;}
if(a==='chicken-edit'){
 const i=Number(p),q=plan().chickenPortions[i];
 if(!q)return;
 chickenEdit={i,date:today(),original:JSON.stringify(q)};
 $('#dialog-content').innerHTML=`<h2 id="dialog-title">编辑第 ${i+1} 份鸡胸肉</h2>
 <label class="field">这份鸡胸肉有多少克<input id="chicken-grams" type="number" min="1" max="1000" step="any" required inputmode="decimal" value="${q.grams??160}"></label>
 <p class="small">以原计划的 160g 份量为基准，按重量换算营养。</p>
 <div class="food-sheet-actions">${btn('保存修改','chicken-edit-save','','primary')}</div>`;
 $('#details').showModal();
 return;
}
if(a==='chicken-edit-save'){
 const edit=chickenEdit,field=$('#chicken-grams'),grams=Number(field.value);
 if(!edit||edit.date!==today()||JSON.stringify(plan().chickenPortions[edit.i])!==edit.original)return toast('这份记录已有变化，请重新打开。');
 if(!C.finite(grams,1,1000)){UI.error(field,'填写 1–1,000 g 的份量。');field.focus();return;}
 const next=structuredClone(state);
 if(M.chickenGrams(next.plans[edit.date],edit.i,grams)&&await save(next)){
  $('#details').close();
  render();
  toast('鸡胸肉份量已更新。');
 }
 return;
}
if(a==='chicken-count'){if(!M.chickenCount(plan(),Number(p)))return toast('已吃的份数会保留，先取消已吃再减少。');await save();render();return;}
if(a==='side-add-open'){
 if(plan().sides.length>=20)return;
 $('#dialog-content').innerHTML=window.BulkMealView.sidePicker({D,esc,btn,date:today()});
 $('#details').showModal();
 return;
}
if(a==='side-add'){
 const dialog=$('#details');
 if(!dialog.open)return;
 const [id,date]=p.split('|');
 if(date!==today()){dialog.close();return toast('日期已更新，请重新添加。');}
 const q=plan(),next=structuredClone(state);
 if(!M.addSide(next.plans[date],id))return;
 dialog.close();
 if(!await save(next))return toast('配菜未保存，请重试。');
 render();
 const addButton=$('[data-action="side-add-open"]');
 if(addButton&&!addButton.disabled)addButton.focus({preventScroll:true});
 else $(`[data-side="${q.sides.length}"]`)?.focus({preventScroll:true});
 return;
}
if(a==='side-remove'){if(!M.removeSide(plan(),Number(p)))return toast('先取消已吃，再移除这份配菜。');await save();render();return;}
if(a==='chicken-add'){M.addChicken(plan());await save();render();return;}
if(a==='nutrition-summary'){nutritionSummary?.open();return;}if(a==='nutrition-tab'){if(p==='supplements')supplementDate='';nutritionTab=p;window.history?.replaceState(null,'','#nutrition/'+p);render();return;}
if(a==='day-mode'){const q=plan(),next=p==='gym';if(q.gym===next)return;q.gym=next;q.gymOverride=true;save();render();document.querySelector(`[data-action="day-mode"][data-param="${p}"]`)?.focus({preventScroll:true});return;}
if(a==='blend-mode'){const q=plan(),next=p==='yes';if(q.blend===next)return;if(!next&&q.eaten.includes('blend'))return toast('Blend 已记为已吃。先取消已吃，再修改今日安排。');q.blend=next;M.blendDefaults(q);save();render();document.querySelector(`[data-action="blend-mode"][data-param="${p}"]`)?.focus({preventScroll:true});return;}
if(a==='blend-reset'){const q=plan();if(q.eaten.includes('blend'))return toast('先取消已喝，再调整食材。');q.blendRecipe=B.defaultRecipe(D.blendIngredients);delete q.blendSnapshot;save();renderRecipeKeepScroll();return;}
if(a==='blend-yogurt'){const q=plan();if(q.eaten.includes('blend'))return toast('先取消已喝，再调整食材。');q.blendRecipe=q.blendRecipe||B.defaultRecipe(D.blendIngredients);q.blendRecipe.portions.yogurt=Number(p);save();renderRecipeKeepScroll('yogurt');return;}
if(a==='blend-honey'){const q=plan();if(q.eaten.includes('blend'))return toast('先取消已喝，再调整食材。');q.blendRecipe=q.blendRecipe||B.defaultRecipe(D.blendIngredients);q.blendRecipe.portions.honey=Number(p);save();renderRecipeKeepScroll('honey');return;}
if(a==='blend-unrecord'){const q=plan();if(!await confirmAction('取消这杯的已喝记录后，可以重新调整食材；调整好再标记已喝。继续？'))return;q.eaten=q.eaten.filter(id=>id!=='blend');delete q.blendSnapshot;save();renderRecipeKeepScroll();return;}
if(a==='addon'){plan().addons.push({...D.addons.find(x=>x.id===p)});save();render();return;}
if(a==='remove-addon'){const q=plan();if(q.eaten.includes('add-'+p))return toast('这份食物已记为已吃，先取消勾选再移除。');q.addons.splice(+p,1);q.eaten=q.eaten.map(id=>id.startsWith('add-')&&Number(id.slice(4))>+p?'add-'+(Number(id.slice(4))-1):id);save();render();return;}
if(a==='stock'){P.record(state,D.pantryItems.find(i=>i.id==='chicken-box'),Math.max(0,Math.min(10000,state.inventory+Number(p))));save();render();return;}
if(a==='save-weight'){UI.clearErrors($('#main'));const dateField=$('#weight-date'),weightField=$('#weight-value'),date=dateField.value,value=Number(weightField.value);let first=null;if(!C.validDate(date)||date>today()){UI.error(dateField,'选择今天或之前的有效日期。');first=dateField;}if(!C.finite(value,25,250)){UI.error(weightField,'填写25–250 kg之间的体重。');first??=weightField;}if(first){first.focus();return;}state.weights=state.weights.filter(w=>w.date!==date);state.weights.push({date,value});state.weights.sort((a,b)=>a.date.localeCompare(b.date));$('#weight-value').value='';delete formDrafts['progress|weight-value'];save();render();return toast('体重已保存，同日记录采用最后一次。');}
if(a==='delete-weight'){if(await confirmAction('删除 '+p+' 的体重记录？')){state.weights=state.weights.filter(w=>w.date!==p);save();render();}return;}
if(a==='sync-connect'){try{await cloud.connect({owner:$('#sync-owner').value.trim(),repo:$('#sync-repo').value.trim(),secret:$('#sync-token').value,remember:$('#sync-remember').checked});$('#sync-token').value='';render();}catch(e){toast(e.message);}return;}
if(a==='sync-disconnect'){cloud.disconnect();render();return;}
if(a==='restore-backup')return openBackupList();
if(a==='restore-point')return restorePoint(backupPoints[Number(p)]);
if(a==='export-raw'){
 const raw=invalidRaw??localStorage.getItem('bulkplan-original-raw');
 if(raw!==null)downloadSync(raw,'BulkPlan-original-'+today()+'.json');
 return;
}
if(a==='export'){const blob=new Blob([JSON.stringify({app:'BulkPlan',exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='BulkPlan-'+today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);return;}
if(a==='recovery-import'){const data=pendingRecovery[Number(p)]?.data;if(data){$('#details').close();await restoreBackup(data);}return;}
if(a==='import'){$('#details').close();return $('#import-file').click();}
});
document.addEventListener('change',async e=>{if(PairV.input(e)||PV.input(e)||FV.input(e))return;const el=e.target;if(el.dataset.supplementDate!==undefined){if(C.validDate(el.value)&&el.value<=today()){supplementDate=el.value;render();}else toast('请选择今天或之前的有效日期。');return;}
if(el.id==='history-date'){historyDate=el.value;render();return;}
if(el.dataset.chickenPortion!=null){M.selectChicken(plan(),+el.dataset.chickenPortion,el.checked);await save();render();return;}
if(el.dataset.mealPart){const q=plan(),i=+el.dataset.mealIndex;if(q.eaten.includes('meal-'+i)){el.checked=!el.checked;return toast('先取消已吃，再调整这份搭配。');}M.configure(q,i,el.dataset.mealPart,el.checked);save();render();return;}
if(el.dataset.blendIngredient){const q=plan(),id=el.dataset.blendIngredient;if(q.eaten.includes('blend')){el.checked=!el.checked;return toast('先取消已喝，再调整食材。');}const ingredient=D.blendIngredients.find(i=>i.id===id);if(!ingredient||ingredient.group==='core')return;q.blendRecipe=q.blendRecipe||B.defaultRecipe(D.blendIngredients);q.blendRecipe.included=q.blendRecipe.included.filter(x=>x!==id);if(el.checked)q.blendRecipe.included.push(id);delete q.blendSnapshot;save();renderRecipeKeepScroll(id);return;}
if(el.dataset.eaten){const q=plan();q.eaten=q.eaten.filter(x=>x!==el.dataset.eaten);if(el.checked){if(el.dataset.eaten.startsWith('meal-')){const i=+el.dataset.eaten.slice(5);if(q.independentMeals)M.configure(q,i,'side',true);if(!q.independentMeals&&!M.component(q,i,'chicken')&&!M.component(q,i,'side')){el.checked=false;return toast('先选择这一餐要吃的食物。');}}q.eaten.push(el.dataset.eaten);if(el.dataset.eaten==='blend'){q.blendSnapshot=B.capture(D.blendIngredients,q);q.blendSnapshot.micronutrients=N.captureBlend(D.blendIngredients,q);}if(el.dataset.eaten.startsWith('meal-'))M.capture(q,+el.dataset.eaten.slice(5),D.sides);}else if(el.dataset.eaten==='blend')delete q.blendSnapshot;else if(el.dataset.eaten.startsWith('meal-')&&q.mealSnapshots)delete q.mealSnapshots[+el.dataset.eaten.slice(5)];save();render();return;}
if(el.dataset.side!=null){const q=plan(),i=Number(el.dataset.side);if(q.eaten.includes('meal-'+i)||!q.sides[i]||!D.sides.some(s=>s.id===el.value))return;q.sides[i]=el.value;M.configure(q,i,'side',true);q.sidesCustomized=true;await save();render();return;}
if(el.dataset.change==='blend-amount'){if(plan().eaten.includes('blend'))return toast('先取消已喝，再修改份量。');plan().blendAmount=Number(el.value);save();render();return;}
if(el.dataset.change==='blend-days'){state.blendDays=Number(el.value);save();render();return;}
if(el.id==='waist-concern'){state.waistConcern=el.checked;save();render();return;}
});
document.addEventListener('compositionstart',e=>{imeTargets.add(e.target);});
document.addEventListener('compositionend',e=>{const target=e.target;setTimeout(()=>{imeTargets.delete(target);const pending=imeNeedsRender;imeNeedsRender=false;const revision=renderRevision;if(target.isConnected)target.dispatchEvent(new Event('input',{bubbles:true}));if(pending&&revision===renderRevision)render();},0);});
document.addEventListener('input',e=>{if(e.isComposing||imeTargets.has(e.target))return;if(PairV.input(e)||PV.input(e)||FV.input(e)||FV.search(e,foodContext())||PV.search(e,pantryContext()))return;if(e.target.id==='doc-search'){const pos=e.target.selectionStart;docSearch=e.target.value;const scroll=$('#main').scrollTop;render();$('#doc-search').focus({preventScroll:true});$('#doc-search').setSelectionRange(pos,pos);$('#main').scrollTop=scroll;}});
function captureRestoreState(){
 return {raw:localStorage.getItem(KEY),memory:JSON.stringify(state)};
}
function assertRestoreState(expected){
 const current=captureRestoreState();
 if(current.raw!==expected.raw||current.memory!==expected.memory)throw Error('本机记录刚有变化，请重新选择备份。');
}
async function applyBackup(data,{expected=captureRestoreState()}={}){
 assertRestoreState(expected);
 const next=structuredClone(data);
 B.preserveConsumedLegacy(next);
 for(const p of Object.values(next.plans))M.preserve(p,D.sides);
 C.migrateCustomFoods(next);
 if(vault)await vault.replace(next,{expected:state,expectedRaw:expected.raw});
 else{
  if(invalidRaw!==null)localStorage.setItem('bulkplan-original-raw',invalidRaw);
  localStorage.setItem(KEY,JSON.stringify(next));
  state=next;
  openVault();
 }
 invalidRaw=null;
 localConflict=false;
 storageOK=true;
 foodUndo=null;
 render();
}
async function restoreBackup(data){
 const expected=captureRestoreState();
 if(!C.validateState(data))return toast('这份备份无法读取，未更改记录。');
 if(!await confirmAction('用这份备份替换本机记录？当前记录会先保留副本。','恢复并替换',true))return;
 try{
  await applyBackup(data,{expected});
  cloud?.changed({restored:true});
  toast('已恢复备份。');
 }catch(e){toast(e.message);}
}
function backupTime(at){
 const d=new Date(at||'');
 return Number.isNaN(d.getTime())?'时间未知':d.toLocaleString('zh-CN',{hour12:false});
}
async function openBackupList(){
 if(restoreBusy||!await confirmAction('恢复备份会替换本机的饮食、体重和其他记录。继续查看可恢复的版本？','查看恢复点'))return;
 let legacy=[];
 try{legacy=JSON.parse(cloud?.recovery()||'[]');}catch{}
 backupPoints=[...(vault?.recovery()||[]),...legacy].filter(x=>C.validateState(x?.data))
  .map(x=>({at:x.exportedAt,data:x.data}))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 const dialog=$('#details'),content=$('#dialog-content');
 const row=(point,i,source)=>`<div class="history-row"><div><strong>${esc(backupTime(point.at))}</strong>
 <small>${source}${point.data?' · '+Object.keys(point.data.plans).length+' 天饮食 · '+point.data.weights.length+' 天体重':''}</small></div>
 ${btn('选择这份','restore-point',i,'secondary',`aria-label="选择${source} ${esc(backupTime(point.at))}"`)}</div>`;
 content.innerHTML=`<div class="backup-list"><h2 id="dialog-title">选择恢复点</h2>
 <h3>云端同步点</h3><div data-cloud-points role="status">正在读取云端同步点…</div>
 <h3>本机备份</h3>${backupPoints.map((x,i)=>row(x,i,'本机备份')).join('')||'<p class="small">暂无本机备份。</p>'}
 ${btn('从文件恢复','import','','text')}</div>`;
 dialog.showModal();
 const list=content.querySelector('[data-cloud-points]');
 if(!list)return;
 if(!cloud?.config().configured){list.textContent='连接私有仓库后可查看云端同步点。';return;}
 try{
  const rows=await cloud.listBackups();
  if(!dialog.open||!list.isConnected)return;
  const start=backupPoints.length;
  backupPoints.push(...rows);
  list.innerHTML=rows.map((x,i)=>row(x,start+i,'云端')).join('')||'<p class="small">还没有云端同步点。</p>';
 }catch(e){list.textContent=e.message||'暂时无法读取云端同步点。';}
}
async function restorePoint(point){
 if(!point||restoreBusy)return;
 restoreBusy=true;
 const expected=captureRestoreState();
 try{
  if(!await confirmAction('用 '+backupTime(point.at)+' 的'+(point.id?'云端同步点':'本机备份')+'替换本机全部记录？当前本机记录会先保留副本。','恢复并替换',true))return;
  assertRestoreState(expected);
  if(point.id)await cloud.restoreBackup(point.id,expected);
  else{await applyBackup(point.data,{expected});cloud?.changed({restored:true});}
  $('#details').close();
  toast('已恢复备份。');
 }catch(e){toast(e.message||'恢复失败，请重试。');}
 finally{restoreBusy=false;}
}
$('#import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>50000000){e.target.value='';return toast('备份超过50MB，未导入。');}try{const parsed=JSON.parse(await file.text());if(Array.isArray(parsed)){pendingRecovery=parsed.filter(x=>x?.app==='BulkPlan'&&C.validateState(x.data));if(!pendingRecovery.length)throw Error();$('#dialog-content').innerHTML=`<h2 id="dialog-title">选择要恢复的副本</h2>${pendingRecovery.map((x,i)=>`<div class="history-row"><div><strong>${esc(new Date(x.exportedAt).toLocaleString('zh-CN'))}</strong><small>${Object.keys(x.data.plans).length}天饮食 · ${x.data.weights.length}天体重</small></div>${btn('恢复这份','recovery-import',i,'secondary')}</div>`).join('')}`;$('#details').showModal();}else if(parsed.app==='BulkPlan'&&C.validateState(parsed.data))await restoreBackup(parsed.data);else throw Error();}catch{toast('文件不是有效的BulkPlan备份，未更改本机数据。');}e.target.value='';});

$('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus({preventScroll:true});});
$('.close-dialog').addEventListener('click',()=>$('#details').close());$('#details').addEventListener('click',e=>{if(e.target===$('#details'))$('#details').close();});
function openVault(){
 if(window.BulkStorage)vault=window.BulkStorage.create({storage:localStorage,getState:()=>state,apply:data=>{state=data;storageOK=true;localConflict=false;},validate:C.validateState,locks:globalThis.navigator?.locks});
}
if(invalidRaw===null)openVault();window.addEventListener('storage',e=>{if(e.key===KEY&&invalidRaw===null)save().then(()=>render());});
window.addEventListener('hashchange',route);setInterval(()=>{if(renderedDate!==today()&&document.visibilityState==='visible')render();},1000);route();if(preservedBlendHistory||migratedFoods)save();if(migrated){save();toast('已读取旧版体重记录；可在进度页核对并导出。');}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else if(renderedDate!==today())render();});window.addEventListener('pagehide',()=>save());window.addEventListener('bulkplan-before-update',()=>save());window.BulkPlan={version:'0.13.1',flush:()=>save()};
function downloadSync(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
if(window.BulkSync){
 cloud=window.BulkSync.create({
  storage:localStorage,
  fetch:(...args)=>fetch(...args),
  getState:()=>{
   const raw=localStorage.getItem(KEY);
   if(raw===null)return null;
   const persisted=JSON.parse(raw);
   if(!C.validateState(persisted))throw Error('本机记录需要先恢复备份。');
   return persisted;
  },
  getRestoreState:captureRestoreState,
  validate:C.validateState,
  apply:applyBackup,
  onStatus:()=>window.BulkSyncView.update(cloud)
 });
 window.addEventListener('online',()=>cloud.sync());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')cloud.sync();});
 setInterval(()=>{if(document.visibilityState==='visible')cloud.sync();},60000);
 if(view==='settings')render();
 cloud.sync();
}
})();
