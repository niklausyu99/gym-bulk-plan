const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../app/sync.js'),C=require('../app/core.js');
const FILE='bulkplan-records.json';
const state=(inventory=0)=>({...C.emptyState(),inventory});

function fixture(){
  let server=null,serial=0,privateRepo=true,offline=false,denied=0,hook=null;
  const calls=[],commits=[];
  const ok=value=>({status:200,ok:true,json:async()=>value});
  const fail=status=>({status,ok:false});
  function write(data){
    const id=(++serial).toString(16).padStart(40,'0');
    const at=new Date(Date.UTC(2026,10,1,12,0,serial)).toISOString();
    server={id,sha:'blob-'+serial,data:structuredClone(data)};
    commits.unshift({...server,at});
    return server;
  }
  const request=async(url,opts)=>{
    const path=new URL(url);
    calls.push({path,opts});
    if(offline)throw Error('offline');
    if(denied)return fail(denied);
    if(path.pathname.endsWith('/commits')){
      assert.equal(path.searchParams.get('path'),FILE);
      assert.equal(path.searchParams.get('sha'),'main');
      return ok(commits.map(row=>({sha:row.id,commit:{message:'Save BulkPlan records',committer:{date:row.at}}})));
    }
    if(!path.pathname.includes('/contents/'))return ok({private:privateRepo,default_branch:'main'});
    if(hook){
      const run=hook;
      hook=null;
      if(!await run({path,opts}))hook=run;
    }
    if(opts.method==='PUT'){
      const body=JSON.parse(opts.body);
      assert.equal(body.branch,'main');
      if((body.sha||null)!==(server?.sha||null))return fail(409);
      const pack=JSON.parse(S.decode(body.content));
      assert.equal(pack.format,1);
      return ok({content:{sha:write(pack.data).sha}});
    }
    const ref=path.searchParams.get('ref');
    const row=ref==='main'?server:commits.find(row=>row.id===ref);
    if(!row)return fail(404);
    return ok({sha:row.sha,type:'file',encoding:'base64',content:S.encode(JSON.stringify({app:'BulkPlan',format:1,data:row.data}))});
  };
  function device(initial=state(),saved=new Map()){
    let data=structuredClone(initial),applies=0,failCopy=false;
    const storage={
      getItem:key=>saved.get(key)||null,
      setItem:(key,value)=>{
        if(failCopy&&key==='bulkplan-sync-copies')throw Error('quota');
        saved.set(key,value);
      }
    };
    const sync=S.create({
      storage,fetch:request,getState:()=>data,getRestoreState:()=>({local:data}),
      apply(next,{expected}){
        assert.deepEqual(expected,{local:data});
        applies++;
        data=next;
      },
      validate:C.validateState,
      now:()=>new Date(Date.UTC(2026,10,1,12,0,serial)).toISOString()
    });
    return {
      sync,saved,get data(){return data;},set data(next){data=next;},get applies(){return applies;},set failCopy(value){failCopy=value;},
      connect:(remember=false)=>sync.connect({owner:'test',repo:'private',secret:'fake-secret-for-test-only',remember})
    };
  }
  return {
    device,calls,write,commits,
    get server(){return server;},set server(value){server=value;},
    set private(value){privateRepo=value;},set offline(value){offline=value;},set denied(value){denied=value;},set hook(value){hook=value;}
  };
}

test('首次连接只上传本机记录，Unicode 与备份字段完整往返，默认不保存令牌',async()=>{
  const f=fixture(),a=f.device(state(6));
  a.data.weights.push({date:'2026-10-30',value:68});
  await a.connect();
  assert.deepEqual(f.server.data,a.data);
  assert(!JSON.parse(a.saved.get('bulkplan-github-sync')).token);
  assert(!JSON.stringify(f.server).includes('fake-secret'));
  assert.equal(a.sync.config().connected,true);
  assert.equal(a.applies,0);
});

test('空白新设备连接私有仓库但不读取或覆盖现有备份',async()=>{
  const f=fixture();
  f.write(state(4));
  const blank=state();
  blank.plans['2026-11-01']=C.defaultPlan(true);
  for(const initial of [null,blank]){
    const a=f.device(initial);
    await a.connect();
    assert.equal(a.sync.config().connected,true);
    assert.equal(a.sync.config().phase,'idle');
    assert.deepEqual(a.data,initial);
    assert.equal(f.server.data.inventory,4);
    assert.equal(a.applies,0);
  }
  assert.equal(f.calls.filter(c=>c.path.pathname.endsWith('/commits')||c.opts.method==='PUT').length,0);
});

test('其他设备的新记录不拉取，手机下次保存自动上传并保留云端旧点',async()=>{
  const f=fixture(),a=f.device(state(3));
  await a.connect();
  f.write(state(4));
  await a.sync.sync();
  assert.equal(a.data.inventory,3);
  assert.equal(f.server.data.inventory,4);
  a.data.inventory=8;
  a.sync.changed();
  await a.sync.sync();
  assert.equal(f.server.data.inventory,8);
  assert.equal(a.applies,0);
  assert.deepEqual(f.commits.map(row=>row.data.inventory),[8,4,3]);
});

test('最近的同步点按时间列出，只有明确选择的云端点才写回手机',async()=>{
  const f=fixture(),a=f.device(state(7));
  const first=f.write(state(1)),second=f.write(state(2));
  await a.connect();
  await assert.rejects(a.sync.restoreBackup(first.id),/重新打开/);
  const points=await a.sync.listBackups();
  assert.deepEqual(points.slice(1).map(p=>p.id),[second.id,first.id]);
  assert.equal(a.applies,0);
  await a.sync.restoreBackup(first.id,{local:a.data});
  assert.equal(a.applies,1);
  assert.equal(a.data.inventory,1);
  assert.equal(f.server.data.inventory,7);
  await a.sync.sync();
  assert.equal(f.server.data.inventory,1);
  assert.deepEqual(f.commits.map(row=>row.data.inventory),[1,7,2,1]);
});

test('明确恢复空白本机副本也可以覆盖备份新头，旧点仍保留',async()=>{
  const f=fixture(),a=f.device(state());
  f.write(state(5));
  await a.connect();
  a.sync.changed({restored:true});
  await a.sync.sync();
  assert.equal(f.server.data.inventory,0);
  assert.equal(f.commits[1].data.inventory,5);
});

test('最终确认后本机变化或云端备份损坏，均保留当前手机记录',async()=>{
  const f=fixture(),a=f.device(state(4));
  const old=f.write(state(1)),bad=f.write({wrong:true});
  await a.connect();
  await a.sync.listBackups();
  await assert.rejects(a.sync.restoreBackup(bad.id),/无法读取|不兼容/);
  const expected={local:structuredClone(a.data)};
  f.hook=({path})=>{
    if(path.searchParams.get('ref')!==old.id)return false;
    a.data.inventory=6;
    return true;
  };
  await assert.rejects(a.sync.restoreBackup(old.id,expected),/本机记录有变化/);
  assert.equal(a.data.inventory,6);
  assert.equal(a.applies,0);
});

test('拒绝公开仓库和失效授权；离线保留手机记录并在下次联网同步',async()=>{
  for(const mode of ['public','denied','offline']){
    const f=fixture(),a=f.device(state(6));
    if(mode==='public')f.private=false;
    if(mode==='offline')f.offline=true;
    if(mode==='denied')f.denied=401;
    await a.connect();
    assert.equal(a.data.inventory,6);
    assert.equal(f.server,null,mode);
    assert.equal(a.sync.config().connected,false);
    assert.equal(a.sync.config().phase,mode==='offline'?'pending':'error');
    if(mode==='offline'){
      f.offline=false;
      await a.sync.sync();
      assert.equal(f.server.data.inventory,6);
      assert.equal(a.sync.config().phase,'synced');
    }
  }
});

test('正常上传只需要云端文件信息，损坏的云端内容仍留在历史中',async()=>{
  const f=fixture(),a=f.device(state(7));
  const old=f.write({wrong:true});
  await a.connect();
  assert.equal(f.server.data.inventory,7);
  assert.equal(f.commits[1].id,old.id);
  assert.equal(a.applies,0);
  const invalid=f.calls.some(call=>call.path.searchParams.get('ref')===old.id);
  assert.equal(invalid,false);
});

test('两台设备同时上传时自动取新 SHA 重试，保留中间备份点',async()=>{
  const f=fixture(),a=f.device(state(8));
  f.write(state(2));
  f.hook=({opts})=>{
    if(opts.method!=='PUT')return false;
    f.write(state(5));
    return true;
  };
  await a.connect();
  assert.equal(f.server.data.inventory,8);
  assert.deepEqual(f.commits.map(row=>row.data.inventory),[8,5,2]);
  assert.equal(a.sync.config().phase,'synced');
});

test('写入期间的新修改不会被标成已备份，下次上传取最新手机记录',async()=>{
  const f=fixture(),a=f.device(state(8));
  f.hook=({opts})=>{
    if(opts.method!=='PUT')return false;
    a.data.inventory=9;
    return true;
  };
  await a.connect();
  assert.equal(f.server.data.inventory,8);
  assert.equal(a.sync.config().phase,'pending');
  await a.sync.sync();
  assert.equal(f.server.data.inventory,9);
});

test('恢复等待正在上传的请求后再应用备份',async()=>{
  const f=fixture(),a=f.device(state(5)),old=f.write(state(2));
  await a.connect();
  await a.sync.listBackups();
  let release,notify;
  const started=new Promise(resolve=>{notify=resolve;});
  f.hook=async({opts})=>{
    if(opts.method!=='PUT')return false;
    await new Promise(resolve=>{release=resolve;notify();});
    return true;
  };
  a.data.inventory=6;
  const pending=a.sync.sync();
  await started;
  const restoring=a.sync.restoreBackup(old.id);
  assert.equal(a.applies,0);
  release();
  await pending;
  await restoring;
  assert.equal(a.data.inventory,2);
  await a.sync.sync();
  assert.deepEqual(f.commits.map(row=>row.data.inventory),[2,6,5,2]);
});

test('保留旧版副本和最近两个手机同步点，本机额外副本写入失败不会阻止自动备份',async()=>{
  const f=fixture(),a=f.device(state(4));
  a.saved.set('bulkplan-sync-recovery',JSON.stringify([{app:'BulkPlan',exportedAt:'2026-10-30T00:00:00Z',data:state(2)}]));
  await a.connect(true);
  for(const value of [5,6,7]){
    a.data.inventory=value;
    if(value===7)a.failCopy=true;
    await a.sync.sync();
  }
  assert.equal(f.server.data.inventory,7);
  assert.deepEqual(JSON.parse(a.sync.recovery()).map(row=>row.data.inventory),[6,5,2]);
  assert(JSON.parse(a.saved.get('bulkplan-github-sync')).token);
  a.sync.disconnect();
  assert(!JSON.parse(a.saved.get('bulkplan-github-sync')).token);
  assert.equal(a.data.inventory,7);
});

test('仅补充剂服用、份量偏好或自定义食物也构成可备份的手机记录',async()=>{
  const SU=require('../app/supplements.js'),F=require('../app/foods.js'),f=fixture(),a=f.device(state());
  const plan=a.data.plans['2026-11-01']=C.defaultPlan();
  SU.record(plan,'omega3',2);
  assert(S.meaningful(a.data));
  a.data.foodPreferences={bread:F.config(F.get('bread'),{amount:3})};
  assert(S.meaningful({...state(),foodPreferences:a.data.foodPreferences}));
  assert(S.meaningful({...state(),customFoods:{local:{name:'红豆粥'}}}));
  f.write(state(6));
  await a.connect();
  assert.deepEqual(f.server.data,a.data);
  assert.equal(SU.totals(f.server.data.plans['2026-11-01']).nutrients.epa,1000);
});

test('恢复旧点保留停用训练的内容和计重快照',async()=>{
  const X=require('../app/custom-exercise.js'),f=fixture();
  const archived=state();
  const exercise=X.create({group:'back',name:'划船',unit:'plates_per_arm_kg',sets:2,kg:20,reps:12,rest:90});
  exercise.sets[0].done=true;
  archived.draft={id:'custom-cloud',day:'pull',date:'2026-11-01',started:Date.now(),recovery:'normal',note:'',exercises:[exercise]};
  assert(C.validateState(archived));
  const old=f.write(archived),a=f.device(state(4));
  await a.connect();
  await a.sync.listBackups();
  await a.sync.restoreBackup(old.id);
  assert.deepEqual(a.data.draft,archived.draft);
  await a.sync.sync();
  assert.equal(f.server.data.draft.exercises[0].sets[0].recording.loadConvention,'plates_per_arm_kg');
});

test('上传遇到 403 时自动备份状态不显示已连接或成功',async()=>{
  const f=fixture(),a=f.device(state(5));
  await a.connect();
  f.denied=403;
  a.data.inventory=9;
  await a.sync.sync();
  assert.equal(a.sync.config().connected,false);
  assert.equal(a.sync.config().phase,'error');
  assert.match(a.sync.config().status,/访问被拒绝/);
  assert.equal(f.server.data.inventory,5);
  f.denied=0;
  await a.sync.sync();
  assert.equal(f.server.data.inventory,9);
});

test('空白手机明确恢复空白旧点后，即使上传前关闭也会在重开时自动备份',async()=>{
  const f=fixture(),old=f.write(state()),a=f.device(null);
  f.write(state(8));
  await a.connect(true);
  await a.sync.listBackups();
  await a.sync.restoreBackup(old.id);
  assert.equal(a.data.inventory,0);
  assert.equal(f.server.data.inventory,8);
  const reopened=f.device(a.data,a.saved);
  await reopened.sync.sync();
  assert.equal(f.server.data.inventory,0);
  a.sync.disconnect();
});
