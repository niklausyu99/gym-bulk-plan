(()=>{'use strict';
let status='检查中',ready=false,registration=null,updating=false,lastUpdateCheck=0,checkingUpdate=false;
const checkUpdate=async()=>{if(!registration||!navigator.onLine||document.visibilityState==='hidden'||checkingUpdate||Date.now()-lastUpdateCheck<60000)return;checkingUpdate=true;lastUpdateCheck=Date.now();try{await registration.update();if(registration.waiting)showUpdate();}catch{}finally{checkingUpdate=false;}};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkUpdate();});window.addEventListener('pageshow',()=>checkUpdate());window.addEventListener('online',()=>checkUpdate());
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const paint=()=>{document.querySelectorAll('[data-offline-detail]').forEach(el=>el.textContent=status);};
const announce=()=>{window.BulkOffline={ready,status,standalone};paint();};
const showUpdate=()=>{const el=document.querySelector('#update-notice');el.hidden=false;el.innerHTML='<span>有新版本，记录会保留</span><button type="button" id="apply-app-update">更新</button>';el.querySelector('button').addEventListener('click',async()=>{if(!registration?.waiting)return;const unfinished=[...document.querySelectorAll('#food-name,#food-k,#food-p,#food-c,#food-f,#food-fi,#weight-value')].some(i=>i.value.trim());if(unfinished||window.BulkPlan?.hasUnsavedSettings?.()){el.querySelector('span').textContent='先保存或清空当前输入，再更新';return;}if(window.BulkPlan?.flush&&!await window.BulkPlan.flush()){el.querySelector('span').textContent='记录尚未保存，请先导出备份';return;}updating=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});});};
window.addEventListener('bulkplan-render',paint);window.addEventListener('online',paint);window.addEventListener('offline',paint);
if(!('serviceWorker' in navigator)||!window.isSecureContext){status='离线暂不可用，请保持联网';announce();return;}
if(local&&!new URLSearchParams(location.search).has('offline')){status='尚未准备离线内容，请保持联网';announce();return;}
let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;if(updating&&navigator.serviceWorker.controller){refreshing=true;location.reload();}});
navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{registration=reg;if(reg.waiting)showUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate();});});await navigator.serviceWorker.ready;ready=true;status='内容已保存，可离线打开';announce();checkUpdate();}).catch(()=>{status='离线准备未完成，联网后重新打开再试';announce();});
announce();
})();
