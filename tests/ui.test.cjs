const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function boot(){
 const elements=new Map(),events={},host={append(el){elements.set(el.id,el);}},document={activeElement:null,getElementById:id=>elements.get(id),createElement:()=>element(),addEventListener:(name,fn)=>events[name]=fn};
 function element(id='',data={}){const attrs=new Map();return {id,dataset:data,tagName:'INPUT',isConnected:true,disabled:false,selectionStart:null,selectionEnd:null,validity:{valid:false},matches:()=>true,closest:()=>host,parentElement:host,setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k)||null,removeAttribute:k=>attrs.delete(k),focus(options){this.focusOptions=options;document.activeElement=this;}};}
 const window={};vm.runInNewContext(fs.readFileSync('app/ui.js','utf8'),{window,document});return {UI:window.BulkUI,document,element,elements,events};
}
test('重绘后焦点回到原鸡胸份数，邻近复选框不抢焦点且不跳动滚动位置',()=>{
 const a=boot(),old=a.element('',{chickenPortion:'0'});a.document.activeElement=old;const saved=a.UI.captureFocus({contains:e=>e===old});old.isConnected=false;
 const other=a.element('',{chickenPortion:'1'}),current=a.element('',{chickenPortion:'0'});a.UI.restoreFocus(saved,{querySelectorAll:()=>[other,current]});assert.equal(a.document.activeElement,current);assert.equal(current.focusOptions.preventScroll,true);
 a.document.activeElement=other;a.UI.restoreFocus({...saved,element:current},{querySelectorAll:()=>[current]});assert.equal(a.document.activeElement,other);
});
test('字段错误持续关联说明；修正后只移除错误关联，保留原有帮助文字',()=>{
 const a=boot(),field=a.element('weight-value');field.setAttribute('aria-describedby','weight-help');a.UI.error(field,'填写25–250 kg之间的体重。');assert.equal(field.getAttribute('aria-invalid'),'true');assert.equal(field.getAttribute('aria-describedby'),'weight-help weight-value-error');assert.equal(a.elements.get('weight-value-error').textContent,'填写25–250 kg之间的体重。');assert.equal(a.elements.get('weight-value-error').getAttribute('role'),'status');
 a.events.input({target:field});assert.equal(field.getAttribute('aria-invalid'),'true');field.validity.valid=true;a.events.input({target:field});assert.equal(field.getAttribute('aria-invalid'),'false');assert.equal(field.getAttribute('aria-describedby'),'weight-help');assert.equal(a.elements.get('weight-value-error').textContent,'');
});
test('补充剂勾选改变下一次操作参数时，仍恢复同一个控件焦点',()=>{
 const a=boot(),old=a.element('',{focusKey:'supplement-multi',action:'supplement-count',param:'date|multi|1'});old.tagName='BUTTON';a.document.activeElement=old;const saved=a.UI.captureFocus({contains:()=>true});old.isConnected=false;const current=a.element('',{focusKey:'supplement-multi',action:'supplement-count',param:'date|multi|0'});current.tagName='BUTTON';a.UI.restoreFocus(saved,{querySelectorAll:()=>[current]});assert.equal(a.document.activeElement,current);
});
test('饮食和历史的共用样式进入当前运行包，不依赖已下架的训练样式',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),files=JSON.parse(sw.match(/^const FILES=(.+);$/m)[1]);for(const path of ['app/ui.js','app/daily.css','app/mobile-fixes.css']){assert(html.includes(path));assert(files.includes(path));assert(fs.existsSync('dist/'+path));}assert(!html.includes('href="app/workout.css"'));assert(!files.includes('app/workout.css'));
});
