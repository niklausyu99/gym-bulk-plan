const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../app/blend.js'),C=require('../app/core.js');
const ingredients=require('../content/blend-ingredients.json').ingredients;
const fresh=()=>B.defaultRecipe(ingredients),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const plan=()=>({...C.defaultPlan(true),blend:true,sides:['aglio'],blendRecipe:fresh()});
test('完整配方默认包含青葡萄和菠萝，保留Whey一勺、燕麦25g，移除Glutamine',()=>{
 const r=fresh();assert.equal(r.included.length,13);
 for(const id of ['pineapple','grapes','oats','peanut'])assert(r.included.includes(id));
 assert.equal(ingredients.find(i=>i.id==='whey').grams,40);
 assert.equal(ingredients.find(i=>i.id==='oats').grams,25);
 assert(!ingredients.some(i=>/glutamine/i.test(i.name)));assert(B.validRecipe(r));
});
test('逐食材计算完整配方，取消葡萄准确扣除34.5kcal和9.05g碳水，可恢复',()=>{
 const r=fresh(),full=B.nutrition(ingredients,r);
 near(full.k,947.406);near(full.p,54.226);near(full.c,111.5294);near(full.f,35.295);near(full.fi,13.533);
 r.included=r.included.filter(i=>i!=='grapes');const without=B.nutrition(ingredients,r);
 near(full.k-without.k,34.5);near(full.c-without.c,9.05);near(full.fi-without.fi,.45);
 r.included.push('grapes');assert.deepEqual(B.nutrition(ingredients,r),full);
});
test('所有可切换食材各自扣除五项营养，核心食材保持必选',()=>{
 const full=B.nutrition(ingredients,fresh());
 for(const food of ingredients.filter(i=>i.group!=='core')){
  const r=fresh();r.included=r.included.filter(id=>id!==food.id);
  const total=B.nutrition(ingredients,r);
  for(const k of B.KEYS)near(full[k]-total[k],food.per100g[k]*food.grams/100);
 }
 const r=fresh();r.included=r.included.filter(id=>id!=='milk');assert.equal(B.validRecipe(r),false);
});
test('半杯应用到全部五项；酸奶1/2汤匙独立于是否启用',()=>{
 const r=fresh(),full=B.nutrition(ingredients,r),half=B.nutrition(ingredients,r,.5);
 for(const k of B.KEYS)near(half[k],full[k]/2);
 r.portions.yogurt=15;near(full.k-B.nutrition(ingredients,r).k,9.15);
 assert.equal(B.selectedItems(ingredients,r).find(i=>i.id==='yogurt').grams,15);
 assert.throws(()=>B.nutrition(ingredients,r,2));
});
test('新一天配方独立，不继承昨天缺货状态',()=>{
 const yesterday=fresh();yesterday.included.pop();yesterday.portions.yogurt=15;
 const next=fresh();assert.equal(next.included.length,13);assert.deepEqual(next.portions,{});
});
test('已喝摄入冻结食材与营养，不随后续配方或食品数据变化',()=>{
 const p=plan();p.blendAmount=.5;p.blendSnapshot=B.capture(ingredients,p);p.eaten=['blend'];
 const recorded=B.nutritionForPlan(ingredients,p);
 p.blendRecipe.included=p.blendRecipe.included.filter(id=>id!=='grapes');
 const updated=structuredClone(ingredients);updated[0].per100g.k=999;
 assert.deepEqual(B.nutritionForPlan(updated,p),recorded);
 assert(p.blendSnapshot.recipe.included.includes('grapes'));
 p.eaten=[];assert.notDeepEqual(B.nutritionForPlan(ingredients,p),recorded);
});
test('原已喝记录保留旧摄入，不捏造具体食材份量；未喝和新配方使用新数据',()=>{
 const s=C.emptyState();const p={...C.defaultPlan(),blend:true,blendAmount:.5,eaten:['blend']};
 s.plans['2026-10-28']=p;assert(B.preserveConsumedLegacy(s));
 near(B.nutritionForPlan(ingredients,p).k,565);assert.equal(p.blendSnapshot.legacy,true);
 assert(!JSON.stringify(p.blendSnapshot.items).includes('1.5'));
 assert.equal(B.preserveConsumedLegacy(s),false);assert(C.validateState(s));
 near(B.nutritionForPlan(ingredients,plan()).k,947.406);
});
test('新配方、已喝快照可备份恢复；无效食材、份量和营养被拒绝',()=>{
 const s=C.emptyState();const p=plan();p.blendRecipe.included=p.blendRecipe.included.filter(id=>id!=='grapes');
 p.blendSnapshot=B.capture(ingredients,p);p.eaten=['blend'];s.plans['2026-10-29']=p;
 assert(C.validateState(JSON.parse(JSON.stringify(s))));
 for(const change of [q=>q.blendRecipe.included.push('unknown'),q=>q.blendRecipe.portions.yogurt=999,q=>q.blendSnapshot.nutrition.k=-1,q=>q.blendSnapshot.amount=.5]){
  const invalid=structuredClone(s);change(invalid.plans['2026-10-29']);assert.equal(C.validateState(invalid),false);
 }
});
test('纤维缺失保持未知，并传递到每日总量',()=>{
 const data=structuredClone(ingredients);data[0].per100g.fi=null;
 const result=B.nutrition(data,fresh());assert(result.unknownFibre);
 const total=C.nutrition([result,{k:100,p:2,c:20,f:1,fi:3}]);assert(total.unknownFibre);near(total.fi,result.fi+3);
});
test('食材变化同步五项缺口，餐盒数量规则不随配方变动',()=>{
 const goals={k:[2450,2550],p:[100,110],c:[320,360],f:[65,80],fi:[25,30]},p=plan();
 const full=B.nutritionForPlan(ingredients,p),g1=B.gaps(full,goals);
 p.blendRecipe.included=p.blendRecipe.included.filter(id=>id!=='grapes');
 const g2=B.gaps(B.nutritionForPlan(ingredients,p),goals);
 for(const k of B.KEYS)near(g2[k]-g1[k],ingredients.find(i=>i.id==='grapes').per100g[k]/2);
 assert.deepEqual(p.sides,['aglio']);
 assert(B.suggestions(p,{...full,p:110},goals,[{id:'aglio',starch:true}]).some(x=>x.includes('蛋白质已够')));
 assert(B.suggestions(p,{...full,p:80},goals,[{id:'aglio',starch:true}]).some(x=>x.includes('正餐搭配蛋白质')));
});
