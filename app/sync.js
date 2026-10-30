/* Private GitHub storage. Tokens are user credentials, never bundled with the app. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BulkSync=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
async function digest(x){const bytes=new TextEncoder().encode(stable(x)),hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
const encode=s=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const meaningful=s=>!!(s.sessions.length||s.weights.length||s.events.length||s.draft||Object.keys(s.parkedDrafts||{}).length||Object.keys(s.plans).length||s.inventory||s.cursor||s.waistConcern||s.blendDays!==10);
function create({storage,fetch:request,getState,apply,validate,onStatus=()=>{},now=()=>new Date().toISOString()}){
 const KEY='bulkplan-github-sync',RECOVERY='bulkplan-sync-recovery';let cfg={},token='',busy=false,timer=null,epoch=0,conflict=null,status='未连接';
 try{cfg=JSON.parse(storage.getItem(KEY)||'{}');token=cfg.token||'';}catch{cfg={};}
 const config=()=>({owner:cfg.owner||'niklausyu99',repo:cfg.repo||'bulkplan-private-data',remember:!!cfg.token,connected:!!token,last:cfg.last||'',status,conflict:!!conflict,busy});
 function report(s){status=s;onStatus(config());}
 function persist(){storage.setItem(KEY,JSON.stringify(cfg));}
 async function api(path,method='GET',body,raw=false){let response;try{response=await request('https://api.github.com'+path,{method,headers:{Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}catch{throw Error('暂时无法联网，记录已保存在本机；联网后重试');}if(response.status===404)return null;if(!response.ok){const e=Error(response.status===401?'授权已失效，请重新连接':response.status===403?'访问被拒绝，请检查授权范围或稍后重试':response.status===409||response.status===422?'线上记录已变化，请重新同步':'同步失败，请稍后重试');e.code=response.status;throw e;}return raw?response.text():response.json();}
 const path=()=>'/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo);
 async function remote(){const repo=await api(path());if(!repo)throw Error('找不到私有仓库，请检查仓库名称与授权范围');if(repo.private!==true)throw Error('仅支持私有仓库，未上传任何个人记录');const branch=repo.default_branch||'main',file=await api(path()+'/contents/bulkplan-records.json?ref='+encodeURIComponent(branch));if(!file)return {file:null,branch};if(file.type!=='file'||file.size>50*1024*1024)throw Error('线上记录太大或格式不支持，请先导出备份');let text;if(file.encoding==='base64'&&typeof file.content==='string')text=decode(file.content);else if(file.encoding==='none')text=await api(path()+'/contents/bulkplan-records.json?ref='+encodeURIComponent(branch),'GET',null,true);else throw Error('线上记录格式不支持，已停止同步');let pack;try{pack=JSON.parse(text);}catch{throw Error('线上文件无法读取，已停止同步');}if(pack.app!=='BulkPlan'||pack.format!==1||!validate(pack.data))throw Error('线上记录格式不兼容，已停止同步');return {file,branch,data:pack.data,hash:await digest(pack.data)};}
 function backup(local){let rows=[];try{rows=JSON.parse(storage.getItem(RECOVERY)||'[]');}catch{}rows.unshift({app:'BulkPlan',exportedAt:now(),data:local});storage.setItem(RECOVERY,JSON.stringify(rows.slice(0,3)));}
 function baseline(hash,sha){cfg.base=hash;cfg.sha=sha;cfg.last=now();persist();}
 function schedule(){clearTimeout(timer);if(token&&!conflict)timer=setTimeout(()=>{sync();},1800);}
 function changed(){if(token){report(conflict?'两台设备都有修改，请选择要保留的版本':'已保存在本机，等待同步');schedule();}}
 async function pull(r,captured,run){if(stable(getState())!==captured){schedule();report('本机有新修改，正在等待下一次同步');return;}if(run!==epoch)return;backup(getState());apply(structuredClone(r.data));baseline(r.hash,r.file.sha);conflict=null;report('已同步到私有仓库');}
 async function push(r,local,hash,run){const result=await api(path()+'/contents/bulkplan-records.json','PUT',{message:'Save BulkPlan records',content:encode(JSON.stringify({app:'BulkPlan',format:1,updatedAt:now(),data:local})),branch:r.branch,...(r.file?{sha:r.file.sha}:{})});if(!result)throw Error('未能保存线上记录，请重新连接');if(run!==epoch)return;baseline(hash,result.content.sha);conflict=null;if(stable(getState())!==stable(local)){report('新修改已存本机，等待下一次同步');schedule();}else report('已同步到私有仓库');}
 async function sync(choice){if(!token||busy)return;busy=true;const run=epoch;report('正在同步…');try{const local=structuredClone(getState());if(!validate(local))throw Error('本机记录需要先恢复备份，未上传');const captured=stable(local),hash=await digest(local),r=await remote();if(run!==epoch)return;
 if(choice&&conflict){if((r.file?.sha||null)!==conflict.sha||hash!==conflict.local){conflict=null;report('记录再次变化，请重新同步后选择');return;}if(choice==='remote'&&r.file)await pull(r,captured,run);else if(choice==='local'){backup(local);await push(r,local,hash,run);}return;}
 if(!r.file){if(cfg.base){conflict={sha:null,local:hash};report('线上文件已移除，请确认后再上传本机记录');}else await push(r,local,hash,run);}
 else if(r.hash===hash){baseline(hash,r.file.sha);conflict=null;report('已同步到私有仓库');}
 else if(cfg.base===r.hash)await push(r,local,hash,run);
 else if(cfg.base===hash||(!cfg.base&&!meaningful(local)))await pull(r,captured,run);
 else {conflict={sha:r.file.sha,local:hash};report('两台设备都有修改，请选择要保留的版本');}
 }catch(e){report(e.message||'暂时无法联网，记录已保存在本机');}finally{busy=false;onStatus(config());}}
 async function connect({owner,repo,secret,remember}){if(busy)throw Error('正在同步，请稍后再连接');if(!/^[a-zA-Z0-9-]{1,39}$/.test(owner)||!/^[a-zA-Z0-9._-]{1,100}$/.test(repo)||!secret?.trim())throw Error('请填写账户、私有仓库和访问令牌');const same=cfg.owner===owner&&cfg.repo===repo;epoch++;cfg={owner,repo,...(same?{base:cfg.base,sha:cfg.sha,last:cfg.last}:{}),...(remember?{token:secret.trim()}:{})};token=secret.trim();conflict=null;persist();await sync();}
 function disconnect(){epoch++;clearTimeout(timer);token='';delete cfg.token;conflict=null;persist();report('已断开连接，本机与线上记录均保留');}
 function recovery(){return storage.getItem(RECOVERY)||'[]';}
 async function remoteBackup(){if(busy)throw Error('正在同步，请稍后再导出');if(!token)throw Error('请先连接私有仓库');const r=await remote();if(!r.file)throw Error('线上暂无记录');return JSON.stringify({app:'BulkPlan',exportedAt:now(),data:r.data},null,2);}
 return {config,connect,disconnect,sync,changed,recovery,remoteBackup};
}
return {create,stable,digest,encode,decode,meaningful};
});
