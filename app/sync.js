/* Private GitHub storage. Tokens are user credentials, never bundled with the app. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BulkSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';

const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
async function digest(value){
  const bytes=new TextEncoder().encode(stable(value)),hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
const encode=s=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const meaningful=s=>!!(s.sessions.length||s.weights.length||s.events.length||s.draft||Object.keys(s.parkedDrafts||{}).length||Object.values(s.plans).some(p=>Object.keys(p.supplements||{}).length||p.blend||p.eaten.length||p.addons.length||p.gymOverride||p.chickenConfigured||p.sidesCustomized||p.blendRecipe||p.blendAmount!==1||JSON.stringify(p.sides)!==JSON.stringify(['aglio','sweet'])||Object.values(p.mealParts||{}).some(q=>(!p.independentMeals&&!q.chicken)||!q.side)||(p.chickenPortions||[]).some(q=>q.eaten)||(p.chickenPortions||[]).length>2)||Object.values(s.trainingSelections||{}).some(days=>Object.values(days).some(q=>q.items.length||Object.keys(q.preferences).length))||Object.keys(s.pantry?.items||{}).length||Object.keys(s.pantry?.history||{}).length||Object.keys(s.foodPreferences||{}).length||Object.keys(s.customFoods||{}).length||s.inventory||s.cursor||s.waistConcern||s.blendDays!==10);
const FILE='bulkplan-records.json',SAVE_MESSAGE='Save BulkPlan records',MAX_BYTES=50*1024*1024;
const SAVED='已自动备份到私有仓库',PENDING='记录已保存在本机，等待自动备份';

function create({storage,fetch:request,getState,getRestoreState=getState,apply,validate,onStatus=()=>{},now=()=>new Date().toISOString()}){
  const KEY='bulkplan-github-sync',RECOVERY='bulkplan-sync-recovery',COPIES='bulkplan-sync-copies';
  let cfg={},token='',timer=null,epoch=0,verified=false,syncTask=null,restoring=false,listed=new Set();
  try{
    const stored=JSON.parse(storage.getItem(KEY)||'{}');
    if(stored&&typeof stored==='object'&&!Array.isArray(stored))cfg=stored;
    token=cfg.token||'';
  }catch{}
  let phase=token?'pending':'disconnected',status=token?PENDING:'未连接';

  const config=()=>({
    owner:cfg.owner||'niklausyu99',repo:cfg.repo||'bulkplan-private-data',remember:!!cfg.token,
    connected:!!token&&verified,configured:!!token,phase,last:cfg.last||'',status,busy:!!syncTask||restoring
  });
  function report(next,message){
    phase=next;
    status=message;
    onStatus(config());
  }
  function persist(){storage.setItem(KEY,JSON.stringify(cfg));}
  function active(run){if(run!==epoch||!token)throw Error('私有仓库连接已变更，请重试。');}
  async function api(run,path,method='GET',body,raw=false){
    active(run);
    let response;
    try{
      response=await request('https://api.github.com'+path,{
        method,headers:{
          Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json',
          Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',
          ...(body?{'Content-Type':'application/json'}:{})
        },
        cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)
      });
    }catch{
      throw Object.assign(Error('暂时无法联网，记录已保存在本机。联网后会自动重试。'),{retry:true});
    }
    active(run);
    if(response.status===404)return null;
    if(!response.ok){
      const code=response.status;
      if(code===401||code===403)verified=false;
      const retry=code===409||code===422||code===429||code>=500;
      const message=code===401?'授权已失效，请重新连接。':code===403?'访问被拒绝，请检查授权范围。':retry?'暂时无法备份，稍后会自动重试。':'暂时无法访问私有仓库。';
      throw Object.assign(Error(message),{code,retry});
    }
    const result=await (raw?response.text():response.json());
    active(run);
    return result;
  }
  const path=()=>'/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo);
  const filePath=()=>path()+'/contents/'+FILE;
  async function repository(run){
    const repo=await api(run,path());
    if(!repo||repo.private!==true){
      verified=false;
      throw Error(repo?'仅支持私有仓库。':'找不到私有仓库，请检查仓库名称与授权范围。');
    }
    verified=true;
    return repo.default_branch||'main';
  }
  async function records(run,ref){
    const url=filePath()+'?ref='+encodeURIComponent(ref),file=await api(run,url);
    if(!file)return null;
    if(file.type!=='file'||file.size>MAX_BYTES)throw Error('云端备份太大或格式不支持。');
    try{
      const content=file.encoding==='base64'&&typeof file.content==='string'?decode(file.content):
        file.encoding==='none'?await api(run,url,'GET',null,true):null;
      const pack=JSON.parse(content);
      if(pack?.app!=='BulkPlan'||pack.format!==1||!validate(pack.data))throw Error();
      return pack.data;
    }catch(e){
      if(e.code||e.retry||run!==epoch)throw e;
      throw Error('云端备份无法读取或格式不兼容。');
    }
  }
  function schedule(){
    clearTimeout(timer);
    if(token&&!restoring)timer=setTimeout(()=>sync(),1800);
  }
  function changed({restored=false}={}){
    if(restored){
      cfg.restored=true;
      try{persist();}catch{}
    }
    if(!token)return;
    if(phase!=='error')report('pending',PENDING);
    schedule();
  }

  function saved(local,hash){
    cfg.base=hash;
    cfg.last=now();
    delete cfg.restored;
    persist();
    try{
      const rows=recoveryRows(COPIES).filter(row=>stable(row.data)!==stable(local));
      rows.unshift({app:'BulkPlan',exportedAt:cfg.last,data:local});
      storage.setItem(COPIES,JSON.stringify(rows.slice(0,2)));
    }catch{} // Optional recovery copies must never block cloud backups.
  }
  async function upload(run){
    for(let attempt=0;attempt<2;attempt++){
      const local=structuredClone(getState());
      if(local==null){
        if(!verified)await repository(run);
        if(getState()!=null)changed();
        else report('idle','本机暂无记录可备份。');
        return;
      }
      if(!validate(local))throw Error('本机记录无法读取，请先恢复有效备份。');
      const hash=await digest(local);
      active(run);
      if(hash===cfg.base&&!cfg.restored){
        if(!verified)await repository(run);
        if(stable(getState())!==stable(local))changed();
        else report('synced',SAVED);
        return;
      }
      const branch=await repository(run),remote=await api(run,filePath()+'?ref='+encodeURIComponent(branch));
      if(stable(getState())!==stable(local)){
        changed();
        return;
      }
      if(remote&&!cfg.base&&!cfg.restored&&!meaningful(local)){
        report('idle','本机暂无记录，已有云端备份可在「恢复备份」中查看。');
        return;
      }
      if(remote&&(remote.type!=='file'||!remote.sha))throw Error('云端备份文件格式不支持。');
      try{
        const result=await api(run,filePath(),'PUT',{
          message:SAVE_MESSAGE,content:encode(JSON.stringify({app:'BulkPlan',format:1,updatedAt:now(),data:local})),
          branch,...(remote?{sha:remote.sha}:{})
        });
        if(!result?.content?.sha)throw Error('未能保存云端备份，请检查连接。');
        saved(local,hash);
        if(stable(getState())!==stable(local))changed();
        else report('synced',SAVED);
        return;
      }catch(e){
        if(attempt||![409,422].includes(e.code))throw e;
      }
    }
  }
  function sync(){
    if(!token||restoring)return;
    if(syncTask)return syncTask;
    clearTimeout(timer);
    const run=epoch;
    syncTask=Promise.resolve().then(()=>upload(run)).catch(e=>{
      if(run===epoch)report(e.retry?'pending':'error',e.message||'暂时无法备份。');
    }).finally(()=>{
      syncTask=null;
      onStatus(config());
    });
    return syncTask;
  }
  async function connect({owner,repo,secret,remember}){
    if(syncTask||restoring)throw Error('正在处理备份，请稍后再连接。');
    if(!/^[a-zA-Z0-9-]{1,39}$/.test(owner)||!/^[a-zA-Z0-9._-]{1,100}$/.test(repo)||!secret?.trim())throw Error('请填写账户、私有仓库和访问令牌。');
    const same=cfg.owner===owner&&cfg.repo===repo;
    epoch++;
    listed=new Set();
    cfg={owner,repo,...(same?{base:cfg.base,last:cfg.last}:{}),...(cfg.restored?{restored:true}:{}),...(remember?{token:secret.trim()}:{})};
    token=secret.trim();
    verified=false;
    persist();
    report('pending',PENDING);
    await sync();
  }
  function disconnect(){
    epoch++;
    clearTimeout(timer);
    token='';
    verified=false;
    listed=new Set();
    delete cfg.token;
    persist();
    report('disconnected','已断开连接，本机记录和云端备份均已保留。');
  }
  function recoveryRows(key){
    try{
      const rows=JSON.parse(storage.getItem(key)||'[]');
      return Array.isArray(rows)?rows.filter(r=>r?.app==='BulkPlan'&&validate(r.data)):[];
    }catch{return [];}
  }
  function recovery(){
    return JSON.stringify([...recoveryRows(RECOVERY),...recoveryRows(COPIES)].sort(
      (a,b)=>(Date.parse(b.exportedAt)||0)-(Date.parse(a.exportedAt)||0)
    ));
  }
  async function listBackups(){
    if(!token)throw Error('请先连接私有仓库。');
    const run=epoch,branch=await repository(run);
    let commits;
    try{
      commits=await api(run,path()+'/commits?'+new URLSearchParams({sha:branch,path:FILE,per_page:'30'}));
    }catch(e){
      if(e.code!==409)throw e;
    }
    const points=(Array.isArray(commits)?commits:[]).filter(entry=>
      /^[a-f0-9]{40}$/i.test(entry?.sha)&&entry.commit?.message===SAVE_MESSAGE&&Number.isFinite(Date.parse(entry.commit?.committer?.date))
    ).map(entry=>({id:entry.sha,at:entry.commit.committer.date}));
    listed=new Set(points.map(point=>point.id));
    return points;
  }
  async function restoreBackup(id,expected=getRestoreState()){
    if(!listed.has(id))throw Error('请重新打开恢复列表并选择一份备份。');
    if(restoring)throw Error('正在恢复备份，请稍候。');
    const run=epoch;
    expected=structuredClone(expected);
    restoring=true;
    clearTimeout(timer);
    let restored=false;
    try{
      await syncTask;
      await repository(run);
      const snapshot=await records(run,id);
      if(!snapshot)throw Error('找不到选中的云端备份。');
      if(stable(getRestoreState())!==stable(expected))throw Error('恢复期间本机记录有变化，请重新选择备份。');
      active(run);
      await apply(structuredClone(snapshot),{expected});
      restored=true;
    }finally{
      restoring=false;
      if(restored&&run===epoch){
        changed({restored:true});
      }else if(token&&phase==='pending'){
        schedule();
      }
      onStatus(config());
    }
  }

  return {config,connect,disconnect,sync,changed,recovery,listBackups,restoreBackup};
}
return {create,stable,digest,encode,decode,meaningful};
});
