const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('iOS icon, header and manifest resolve to packaged full-size PNGs with distinct paths',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),files=JSON.parse(sw.match(/^const FILES=(.+);$/m)[1]);
 const touch=html.match(/rel="apple-touch-icon" sizes="180x180" href="([^"]+)"/)[1];
 const paths=[new URL(touch).pathname.replace('/gym-bulk-plan/',''),'apple-touch-icon.png','assets/icons/brand-v3-192.png',...JSON.parse(fs.readFileSync('manifest.webmanifest')).icons.map(i=>i.src)];
 for(const p of paths){assert(files.includes(p),p);const b=fs.readFileSync('dist/'+p);assert.equal(b.toString('ascii',1,4),'PNG');const size=p.includes('512')?512:p.includes('192')?192:180;assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 assert(fs.readFileSync('app/main.js','utf8').includes('src="assets/icons/brand-v3-192.png"'));
});
test('foreground update checks are throttled and tolerate offline failures',async()=>{
 const events={},docEvents={};let time=100000,checks=0;
 const reg={waiting:null,addEventListener(){},async update(){checks++},};
 const win={addEventListener:(n,f)=>events[n]=f};const doc={visibilityState:'visible',addEventListener:(n,f)=>docEvents[n]=f,querySelectorAll:()=>[]};
 const nav={onLine:true,serviceWorker:{controller:null,addEventListener(){},register:async()=>reg,ready:Promise.resolve(reg)}};
 vm.runInNewContext(fs.readFileSync('app/pwa.js','utf8'),{window:win,document:doc,navigator:nav,location:{hostname:'example.com'},matchMedia:()=>({matches:false}),Date:{now:()=>time},URLSearchParams,});
 // Secure context required for registration.
 assert.equal(checks,0);
 win.isSecureContext=true;
 vm.runInNewContext(fs.readFileSync('app/pwa.js','utf8'),{window:win,document:doc,navigator:nav,location:{hostname:'example.com'},matchMedia:()=>({matches:false}),Date:{now:()=>time},URLSearchParams});
 await new Promise(r=>setImmediate(r));assert.equal(checks,1);events.pageshow();await new Promise(r=>setImmediate(r));assert.equal(checks,1);
 time+=61000;doc.visibilityState='hidden';docEvents.visibilitychange();assert.equal(checks,1);
 doc.visibilityState='visible';docEvents.visibilitychange();await new Promise(r=>setImmediate(r));assert.equal(checks,2);
 time+=61000;nav.onLine=false;events.pageshow();assert.equal(checks,2);
 nav.onLine=true;reg.update=async()=>{checks++;throw Error('offline')};events.pageshow();await new Promise(r=>setImmediate(r));assert.equal(checks,3);assert.equal(win.BulkOffline.ready,true);
});
