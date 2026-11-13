window.BulkMealView={
chicken({p,btn}) {
 const count=p.chickenPortions.length,ate=p.chickenPortions.filter(q=>q.eaten).length;
 return `<section class="chicken-daily">
  <div class="daily-group-head"><div><h3>鸡胸肉</h3><small aria-live="polite">计划 ${count} 份 · 已吃 ${ate} 份</small></div></div>
  <div class="chicken-tools">
   <small>每份约160g · 263 kcal · 蛋白48g</small>
   <div class="portion-stepper" role="group" aria-label="鸡胸肉计划份数">
    ${btn('−','chicken-count',count-1,'secondary',`data-focus-key="chicken-less" aria-label="减少一份鸡胸肉" ${count<=ate?'disabled':''}`)}
    <strong>${count} 份</strong>
    ${btn('＋','chicken-add','','secondary',`aria-label="增加一份鸡胸肉" ${count>=20?'disabled':''}`)}
   </div>
  </div>
  ${count?`<div class="chicken-portions" role="group" aria-label="鸡胸肉已吃记录">${p.chickenPortions.map((q,i)=>`<div class="chicken-portion ${q.eaten?'is-selected':''}"><label><input type="checkbox" data-chicken-portion="${i}" aria-label="鸡胸肉第${i+1}份已吃" ${q.eaten?'checked':''}><span><b>第 ${i+1} 份</b><small>${q.eaten?'已吃':'待吃'}</small></span></label>${btn((q.grams??160)+' g','chicken-edit',i,'text',`aria-label="编辑第 ${i+1} 份鸡胸肉，${q.grams??160}克" aria-haspopup="dialog"`)}</div>`).join('')}</div>`:''}
 </section>`;
},
row({p,a,index,D,esc,num,btn}) {
 const eaten=p.eaten.includes(a.id);
 return `<div class="meal-row daily-side">
  <label class="meal-eaten"><input type="checkbox" data-eaten="${a.id}" aria-label="${esc(a.name)}已吃" ${eaten?'checked':''}><span>已吃</span></label>
  <div>${eaten?`<strong>${esc(a.name)}</strong>`:`<select data-side="${index}" aria-label="第 ${index+1} 份配菜">${D.sides.map(s=>`<option value="${s.id}" ${p.sides[index]===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`}
  <small>约${num(a.k)} kcal · 蛋白${num(a.p)}g</small></div>
  ${eaten?'':btn('移除','side-remove',index,'text',`aria-label="移除第 ${index+1} 份配菜"`)}
 </div>`;
},
sidePicker({D,esc,btn,date}) {
 return `<h2 id="dialog-title">添加配菜</h2>
  <div class="side-picker">${D.sides.map(s=>btn(esc(s.name),'side-add',s.id+'|'+date,'secondary')).join('')}</div>`;
}
};
