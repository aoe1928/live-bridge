const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./production.test.cjs');
// Track 11 becomes an audio track with one empty Session slot (60); creating a clip yields clip 61.
function audio(f,{occupied=false,createFails=false}={}){
 const t=f.objects[11];t.has_audio_input=1;t.clip_slots=[60];
 const slot=f.object(60,{has_clip:occupied?1:0,clip:occupied?[59]:[]});
 const made=[];
 function makeClip(id,start){return f.object(id,{name:'',file_path:made.at(-1),is_midi_clip:0,warping:1,length:8,start_time:start,end_time:start+8,loop_start:0,loop_end:8});}
 slot.call=function(op,file){f.calls.push([60,op,file]);assert.equal(op,'create_audio_clip');made.push(file);if(!createFails){this.has_clip=1;this.clip=[61];makeClip(61,0);}};
 t.call=function(op,file,pos){f.calls.push([11,op,file,pos]);assert.equal(op,'create_audio_clip');made.push(file);if(!createFails){t.arrangement_clips=[...t.arrangement_clips,62];makeClip(62,pos);}};
 return {t,slot,made};
}
const file='/Users/me/Splice - Pack/Loops/FSS_140_bass loop_G.wav';
test('session audio clip: calls ClipSlot.create_audio_clip with the raw path and verifies the clip',()=>{
 const f=fixture(),a=audio(f);f.run('x_audio_clip_create',{trackId:11,filePath:file,slotIndex:0,name:'Bass'});f.flush();
 const r=f.last().result;assert.equal(r.verified,true);assert.equal(r.placement,'session');assert.equal(r.clip.id,61);assert.equal(r.clip.filePath,file);assert.equal(r.clip.name,'Bass');assert.equal(a.made[0],file);
 assert.deepEqual(f.calls,[[60,'create_audio_clip',file]]);
});
test('arrangement audio clip: calls Track.create_audio_clip at the beat and checks start_time',()=>{
 const f=fixture();audio(f);f.run('x_audio_clip_create',{trackId:11,filePath:file,position:296});f.flush();
 const r=f.last().result;assert.equal(r.verified,true);assert.equal(r.placement,'arrangement');assert.equal(r.clip.id,62);assert.equal(r.clip.startTime,296);
 assert.deepEqual(f.calls,[[11,'create_audio_clip',file,296]]);
});
test('rejects MIDI tracks, frozen tracks, occupied slots, bad paths and ambiguous targets before calling Live',()=>{
 const cases=[
  [f=>{},{trackId:10,filePath:file,slotIndex:0},/Not an audio track/],
  [f=>{audio(f);f.objects[11].is_frozen=1;},{trackId:11,filePath:file,slotIndex:0},/frozen/],
  [f=>audio(f,{occupied:true}),{trackId:11,filePath:file,slotIndex:0},/occupied/],
  [f=>audio(f),{trackId:11,filePath:file,slotIndex:3},/outside Session/],
  [f=>audio(f),{trackId:11,filePath:'relative/loop.wav',slotIndex:0},/Absolute/],
  [f=>audio(f),{trackId:11,filePath:'/x/loop.txt',slotIndex:0},/extension/],
  [f=>audio(f),{trackId:11,filePath:file},/exactly one/],
  [f=>audio(f),{trackId:11,filePath:file,slotIndex:0,position:4},/exactly one/],
  [f=>{audio(f);f.song.is_playing=1;},{trackId:11,filePath:file,slotIndex:0},/Stop playback/],
 ];
 for(const [setup,args,re] of cases){const f=fixture();setup(f);f.run('x_audio_clip_create',args);assert.match(f.last().error,re);assert.equal(f.calls.length,0,JSON.stringify(args));}
});
test('reports a failure when Live silently creates nothing',()=>{
 const f=fixture();audio(f,{createFails:true});f.run('x_audio_clip_create',{trackId:11,filePath:file,slotIndex:0});f.flush();assert.match(f.last().error,/not created/);
 const g=fixture();audio(g,{createFails:true});g.run('x_audio_clip_create',{trackId:11,filePath:file,position:8});g.flush();assert.match(g.last().error,/not created/);
});
test('server precheck refuses missing files before contacting Live',async()=>{
 const {executeProduction}=require('../src/production-tools.cjs');
 const calls=[];const request=async(op,a)=>{calls.push(op);return {ok:1};};
 await assert.rejects(executeProduction('x_audio_clip_create',{trackId:11,filePath:'/nonexistent/loop.wav',slotIndex:0},request,'/tmp'),/not found/);
 await assert.rejects(executeProduction('x_audio_clip_create',{trackId:11,filePath:'loop.wav',slotIndex:0},request,'/tmp'),/absolute/);
 await assert.rejects(executeProduction('x_audio_clip_create',{trackId:11,filePath:__filename,slotIndex:0},request,'/tmp'),/extension/);
 assert.equal(calls.length,0);
});
