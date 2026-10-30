import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Blend=require('../app/blend.js');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const blendData=JSON.parse(readFileSync(resolve(root,'content/blend-ingredients.json'),'utf8')),ingredients=blendData.ingredients;
const full=Blend.nutrition(ingredients,Blend.defaultRecipe(ingredients));
const recipeTable='| 食材 | 份量 | 分类 |\n|---|---|---|\n'+ingredients.map(i=>'| '+i.name+' | '+i.portion+' | '+({core:'基础',recommended:'建议保留',optional:'可选'})[i.group]+' |').join('\n');
const summary='完整配方约'+Math.round(full.k/10)*10+' kcal、蛋白质'+Math.round(full.p)+' g、碳水'+Math.round(full.c)+' g、脂肪'+Math.round(full.f)+' g、纤维'+Math.round(full.fi)+' g。';
const sections=file=>{const text=readFileSync(resolve(root,file),'utf8').replace('{{BLEND_RECIPE}}',recipeTable).replace('{{BLEND_NUTRITION}}',summary).replace('{{BLEND_FIBRE}}',String(Math.round(full.fi))),parts=text.split(/^#{1,2} (.+)\r?\n/gm),out=[];for(let i=1;i<parts.length;i+=2)out.push({title:parts[i].trim(),body:parts[i+1].trim()});return out;};
const plan=JSON.parse(readFileSync(resolve(root,'content/plan.json'),'utf8'));
plan.blendIngredients=ingredients;delete plan.blend;delete plan.recipe;
// Shared foods use the same per-ingredient data; the separate oats snack remains 50 g.
for(const [id,grams] of [['milk',258],['banana',118],['oats',50]]){
 const food=ingredients.find(i=>i.id===id),addon=plan.addons.find(a=>a.id===id);
 for(const key of Blend.KEYS)addon[key]=food.per100g[key]*grams/100;
}
writeFileSync(resolve(root,'app/data.js'),'window.BULK_DATA = '+JSON.stringify(plan,null,2)+';\n');
const equipment=JSON.parse(readFileSync(resolve(root,'content/equipment.json'),'utf8'));
writeFileSync(resolve(root,'app/equipment-data.js'),`(function(root,data){if(typeof module==='object'&&module.exports)module.exports=data;else root.BulkEquipmentData=data;})(typeof globalThis!=='undefined'?globalThis:this,${JSON.stringify(equipment)});\n`);
const books={training:sections('content/training-guide.md'),nutrition:sections('content/nutrition-guide.md')};
writeFileSync(resolve(root,'app/handbook.js'),'window.BulkHandbook = '+JSON.stringify(books,null,2)+';\n');
console.log('Built product handbooks');
