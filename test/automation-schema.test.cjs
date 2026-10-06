const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
test('automation tools declare destructive writes and reject invalid requests before connection',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'automation-schema-'));
 try{
 require('../scripts/build.cjs').build(out);
 const requests=[{id:1,method:'tools/list'},
 {id:2,method:'tools/call',params:{name:'live_write_automation',arguments:{readToken:'t',expectedSession:'s',points:[{beat:0,value:0},{beat:1,value:1}],shape:'bezier',resolution:1}}},
 {id:3,method:'tools/call',params:{name:'live_clear_automation',arguments:{readToken:'t'}}},
 {id:4,method:'tools/call',params:{name:'live_read_automation',arguments:{targetId:'t',clipId:'c',parameterId:'p',startBeat:0,endBeat:4,sampleCount:999}}}];
 const replies=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:requests.map(x=>JSON.stringify({jsonrpc:'2.0',...x})).join('\n')+'\n',encoding:'utf8'}).trim().split('\n').map(JSON.parse);
 const tools=replies[0].result.tools;
 for(const name of ['live_write_automation','live_clear_automation']){const t=tools.find(t=>t.name===name);assert.equal(t.annotations.readOnlyHint,false);assert.equal(t.annotations.destructiveHint,true);}
 assert.equal(tools.find(t=>t.name==='live_read_automation').annotations.readOnlyHint,true);
 for(const reply of replies.slice(1))assert(reply.error);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
