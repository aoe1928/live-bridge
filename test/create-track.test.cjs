const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),cp=require('node:child_process');
function fixture(type='midi',options={}){
 const queue=[],replies=[],calls=[],objects={10:{id:10,group_track:[]},20:{id:20,group_track:[]}};
 const song={tracks:[10],return_tracks:[20],is_playing:0,record_mode:0,session_record:0,call(op,index){calls.push([op,index]);if(options.fail)throw Error('Live track limit');const list=op==='create_return_track'?this.return_tracks:this.tracks;list.push(30);objects[30]={id:30,group_track:[],is_foldable:0,has_midi_input:op==='create_midi_track'?1:0,name:'New track',color_index:5};}};
 const ctx=vm.createContext({Task:function(fn){this.schedule=()=>queue.push(fn);},outlet(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/live-api.js'),'utf8'),ctx);
 Object.assign(ctx,{SESSION:'session',api:()=>song,byId:id=>objects[id],ids:(o,k)=>(o[k]||[]).slice(),val:(o,k)=>o[k],reply:(id,result,error)=>replies.push({id,result,error})});
 const request={id:'req',type,expectedSession:'session',expectedTrackIds:[10],expectedReturnTrackIds:[20]};
 const send=()=>{ctx.raw=JSON.stringify(request);vm.runInContext('createTrack(JSON.parse(raw))',ctx);};
 return {ctx,song,objects,request,send,calls,replies,flush(){while(queue.length)queue.shift()();}};
}
test('all three kinds append via correct API and return verified new identity',()=>{
 for(const type of ['midi','audio','return']){const f=fixture(type);f.send();f.flush();const r=f.replies.at(-1).result;assert.equal(r.verified,true);assert.equal(r.trackId,30);assert.equal(r.type,type);assert.deepEqual(f.calls,[[`create_${type}_track`,type==='return'?undefined:-1]]);f.send();assert.equal(f.calls.length,1);}
});
test('stale session/order, recording, playing and malformed input reject without mutation',()=>{
 for(const patch of [{expectedSession:'old'},{expectedTrackIds:[11]},{expectedReturnTrackIds:[]},{expectedTrackIds:[10,10]},{expectedTrackIds:null},{type:'group'}]){const f=fixture();Object.assign(f.request,patch);assert.throws(f.send);assert.equal(f.calls.length,0);}
 for(const key of ['is_playing','record_mode','session_record']){const f=fixture();f.song[key]=1;assert.throws(f.send);assert.equal(f.calls.length,0);}
});
test('pending or failed duplicate request cannot create a second track',()=>{
 for(const fail of [false,true]){const f=fixture('return',{fail});f.send();f.send();f.flush();f.send();assert.equal(f.calls.length,1);if(fail)assert.match(f.replies.at(-1).error,/track limit.*may remain/);}
});
test('fresh request with stale expected IDs also cannot duplicate creation',()=>{const f=fixture();f.send();f.flush();f.request.id='another';assert.throws(f.send,/Track list changed/);assert.equal(f.calls.length,1);});
test('concurrent topology changes, wrong type, group placement and session switch fail verification',()=>{
 const changes=[f=>f.song.tracks.unshift(99),f=>f.song.return_tracks.push(99),f=>f.objects[10].group_track.push(99),f=>f.objects[30].group_track.push(10),f=>f.objects[30].has_midi_input=0,f=>f.ctx.SESSION='new'];
 for(const change of changes){const f=fixture();f.send();change(f);f.flush();assert.match(f.replies.at(-1).error,/may remain/);assert.equal(f.calls.length,1);}
});
test('MCP exposes write schema and rejects invalid creation arguments before UDP',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'live-track-schema-'));
 try{require('../scripts/build.cjs').build(out);const base={type:'return',expectedSession:'s',expectedTrackIds:[],expectedReturnTrackIds:[]};
 const messages=[{id:1,method:'tools/list'},...[{...base,type:'group'},{...base,expectedTrackIds:[-1]},{type:'midi'},{...base,index:0}].map((arguments,i)=>({id:i+2,method:'tools/call',params:{name:'live_create_track',arguments}}))];
 const result=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:messages.map(x=>JSON.stringify({jsonrpc:'2.0',...x})).join('\n')+'\n',encoding:'utf8'}).trim().split('\n').map(JSON.parse);
 const tool=result[0].result.tools.find(t=>t.name==='live_create_track');assert.equal(tool.annotations.readOnlyHint,false);assert.equal(tool.inputSchema.required.length,4);for(const reply of result.slice(1))assert(reply.error);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
