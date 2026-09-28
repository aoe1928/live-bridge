const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {planMove,MoveStore,fingerprint,platformAction}=require('../src/track-move.cjs');
const row=(id,parentId=0,isGroup=0)=>({id,parentId,isGroup,frozen:0,name:'Track '+id});
const snapshot=(tracks=[row(1),row(2)])=>({session:'s',playing:0,recording:0,tracks,selectedTrackId:2,selectedTrackIds:[2],arrangementVisible:1});
const args=(s,trackId=2,direction='up')=>({trackId,direction,expectedSession:s.session,expectedOrderFingerprint:fingerprint(s)});
test('Windows and Mac use distinct modifiers; unknown OS fails closed',()=>{assert.equal(platformAction('win32','up').modifier,'Control');assert.equal(platformAction('darwin','down').modifier,'Command');assert.equal(platformAction('darwin','down').key,'ArrowDown');assert.throws(()=>platformAction('linux','up'));});
test('single and group moves preserve IDs and parent relationships',()=>{let s=snapshot();assert.deepEqual(planMove(s,args(s),'win32').after,[[2,0,0],[1,0,0]]);s=snapshot([row(1,0,1),row(2,1),row(3,1),row(4)]);assert.deepEqual(planMove(s,args(s,1,'down'),'darwin').after,[[4,0,0],[1,0,1],[2,1,0],[3,1,0]]);});
test('reject stale session/order, transport, boundary, group children and untested layouts',()=>{
 const s=snapshot();for(const a of [{...args(s),expectedSession:'old'},{...args(s),expectedOrderFingerprint:'old'},args(s,1,'up'),args(s,999),args(s,2,'sideways')])assert.throws(()=>planMove(s,a));
 for(const key of ['playing','recording']){const t={...s,[key]:1};assert.throws(()=>planMove(t,args(t)));}
 for(const [tracks,id,direction] of [[[row(1,0,1),row(2,1),row(3)],2,'down'],[[row(1,0,1),row(2)],2,'up'],[[row(1,0,1),row(2,1,1),row(3)],1,'down'],[[row(1),{...row(2),frozen:1}],2,'up'],[[row(1),row(2,99)],1,'down'],[[row(1),row(1)],1,'down']]){const t=snapshot(tracks);assert.throws(()=>planMove(t,args(t,id,direction)));}
});
async function withStore(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'live-move-'));let current=snapshot(),now=1000;const store=new MoveStore(dir,async()=>structuredClone(current),{platform:'win32',now:()=>now});try{await fn({store,set:s=>current=s,time:n=>now=n,get:()=>current});}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('prepare never claims movement; arm checks exact selection; verified receipt persists',()=>withStore(async({store,get,set})=>{
 const p=await store.prepare(args(get()));assert.equal(p.verified,false);assert.equal(p.state,'prepared');await assert.rejects(store.prepare(args(get())),/pending/);
 set({...get(),selectedTrackIds:[1,2]});await assert.rejects(store.arm(p.moveId),/ONLY/);set({...get(),selectedTrackIds:[2]});
 const a=await store.arm(p.moveId);assert.equal(a.state,'requires_ui_action');await assert.rejects(store.arm(p.moveId),/not prepared/);
 set({...get(),tracks:[{...row(2),name:'Renumbered'},row(1)]});const v=await store.verify(p.moveId);assert.equal(v.verified,true);assert.equal((await store.verify(p.moveId)).cached,true);
}));
test('expired preparation, wrong view, stale state, and playback prevent arming',()=>withStore(async({store,get,set,time})=>{
 const p=await store.prepare(args(get()));set({...get(),arrangementVisible:0});await assert.rejects(store.arm(p.moveId));set({...get(),arrangementVisible:1,playing:1});await assert.rejects(store.arm(p.moveId));set({...get(),playing:0,session:'changed'});await assert.rejects(store.arm(p.moveId));set({...get(),session:'s'});time(122000);await assert.rejects(store.arm(p.moveId),/expired/);
 assert.equal((await store.verify(p.moveId)).state,'unchanged');
}));
test('verify detects unexecuted or unarmed actions, wrong order, session and parent changes',async()=>{
 for(const mode of ['unchanged','unarmed','session','parent'])await withStore(async({store,get,set})=>{const p=await store.prepare(args(get()));if(mode!=='unarmed')await store.arm(p.moveId);if(mode==='unarmed')set({...get(),tracks:[row(2),row(1)]});if(mode==='session')set({...get(),session:'other'});if(mode==='parent')set({...get(),tracks:[row(2),row(1,2)]});const v=await store.verify(p.moveId);assert.equal(v.verified,false);assert.equal(v.state,mode==='unchanged'?'unchanged':'conflict');});
});
