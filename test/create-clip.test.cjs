const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(options={}){
 const queue=[],replies=[],calls=[],objects={};let next=100;
 const song={id:1,tracks:[10],is_playing:0,record_mode:0,session_record:0};
 const track={id:10,has_midi_input:1,is_foldable:0,is_frozen:0,clip_slots:[20],arrangement_clips:[]};
 function clip(start){const c={id:next++,is_midi_clip:1,start_time:start,end_time:start+4,notes:[],call(op,payload){calls.push(op);if(op==='add_new_notes')this.notes=options.dropNotes?[]:JSON.parse(payload).notes;}};objects[c.id]=c;return c;}
 const slot={id:20,has_clip:options.full?1:0,clip:[],call(op,length){calls.push(op);const c=clip(0);c.end_time=length;this.clip=[c.id];this.has_clip=1;}};
 track.call=function(op,id,beat){calls.push(op);assert.match(id,/^id \d+$/);if(options.duplicateFails)throw Error('duplicate failed');const source=objects[Number(id.slice(3))],c=clip(beat);c.end_time=beat+source.end_time;c.notes=source.notes;this.arrangement_clips.push(c.id);};
 Object.assign(objects,{1:song,10:track,20:slot});if(options.overlap){const c=clip(8);track.arrangement_clips.push(c.id);}
 const ctx=vm.createContext({Task:function(fn){this.schedule=()=>queue.push(fn);},outlet(){},messagename:'/codex'});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/live-api.js'),'utf8'),ctx);
 Object.assign(ctx,{SESSION:'session',api:()=>song,track:id=>{if(id!==10)throw Error('outside Set');return track;},byId:id=>{if(!objects[id])throw Error('Missing object');return objects[id];},ids:(obj,k)=>(obj[k]||[]).slice(),val:(obj,k)=>obj[k],notes:c=>c.notes,clipInfo:c=>({id:c.id,start:c.start_time,end:c.end_time}),reply:(id,result,error)=>replies.push({id,result,error})});
 const request={id:'test',expectedSession:'session',trackId:10,length:4,notes:[{pitch:36,start_time:0,duration:0.25,velocity:100}],...options.request};
 function send(){ctx.raw=JSON.stringify(request);vm.runInContext('createMidiClip(JSON.parse(raw))',ctx);}
 function flush(){while(queue.length)queue.shift()();}
 return {send,flush,request,ctx,track,song,slot,objects,queue,calls,replies};
}
test('creates Session clip and verifies count without Arrangement destination',()=>{const f=fixture();f.send();f.flush();assert.equal(f.replies.at(-1).result.noteCount,1);assert.equal(f.replies.at(-1).result.arrangementClip,null);assert.deepEqual(f.calls,['create_clip','add_new_notes']);});
test('destinationBeat zero creates and verifies Arrangement while retaining source',()=>{const f=fixture({request:{destinationBeat:0}});f.send();f.flush();const r=f.replies.at(-1).result;assert.equal(r.destinationBeat,0);assert.equal(r.arrangementClip.start,0);assert.equal(r.arrangementClip.end,4);assert.equal(f.slot.has_clip,1);assert.equal(f.track.arrangement_clips.length,1);f.send();f.flush();assert.equal(f.calls.filter(x=>x==='create_clip').length,1);});
test('preflight rejects invalid session, playback, target, timing, full slots and overlaps without mutation',()=>{
 const cases=[{request:{expectedSession:'old'}},{request:{trackId:999}},{request:{length:0}},{request:{notes:[{pitch:128,start_time:0,duration:1}]}},{request:{notes:[{pitch:36,start_time:3,duration:2}]}},{request:{destinationBeat:-1}},{full:true},{overlap:true,request:{destinationBeat:8}}];
 for(const options of cases){const f=fixture(options);assert.throws(f.send);assert.equal(f.calls.length,0);}
 for(const [obj,key] of [['song','is_playing'],['song','record_mode'],['song','session_record'],['track','is_frozen'],['track','is_foldable']]){const f=fixture();f[obj][key]=1;assert.throws(f.send);assert.equal(f.calls.length,0);}
 const f=fixture();f.track.has_midi_input=0;assert.throws(f.send);assert.equal(f.calls.length,0);
});
test('note count mismatch stops before Arrangement and duplicate requests do not create again',()=>{const f=fixture({dropNotes:true,request:{destinationBeat:8}});f.send();f.send();f.flush();assert.match(f.replies.at(-1).error,/Note count verification failed/);assert.equal(f.track.arrangement_clips.length,0);f.send();assert.equal(f.calls.filter(x=>x==='create_clip').length,1);});
test('playback starting during async work stops remaining writes with partial-state report',()=>{const f=fixture();f.send();f.song.is_playing=1;f.flush();assert.deepEqual(f.calls,['create_clip']);assert.match(f.replies.at(-1).error,/partial creation/);});
test('new overlap between stages prevents duplication',()=>{const f=fixture({request:{destinationBeat:8}});f.send();f.queue.shift()();f.objects[500]={id:500,start_time:8,end_time:12};f.track.arrangement_clips.push(500);f.flush();assert.match(f.replies.at(-1).error,/overlaps/);assert(!f.calls.includes('duplicate_clip_to_arrangement'));});
test('duplicate failure reports partial state and does not retry',()=>{const f=fixture({duplicateFails:true,request:{destinationBeat:8}});f.send();f.flush();assert.match(f.replies.at(-1).error,/duplicate failed.*partial creation/);f.send();assert.equal(f.calls.filter(x=>x==='duplicate_clip_to_arrangement').length,1);});
