const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');const {build}=require('../scripts/build.cjs');
test('MCP advertises optional destination and rejects invalid create requests before Live communication',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'live-clip-schema-'));
 try{build(out);const base={trackId:1,length:4,notes:[{pitch:36,start_time:0,duration:1}],expectedSession:'s'};
 const invalid=[{...base,length:0},{...base,destinationBeat:-1},{...base,notes:[{pitch:128,start_time:0,duration:1}]},{...base,notes:[{pitch:36,start_time:3,duration:2}]},{...base,destinationBeat:1576799},{...base,notes:[{pitch:36,start_time:0,duration:0}]}];const missing={...base};delete missing.expectedSession;invalid.push(missing);
 const messages=[{jsonrpc:'2.0',id:0,method:'tools/list'},...invalid.map((a,i)=>({jsonrpc:'2.0',id:i+1,method:'tools/call',params:{name:'live_create_clip',arguments:a}}))];
 const output=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:messages.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8',timeout:3000});const replies=output.trim().split('\n').map(x=>JSON.parse(x));const tool=replies[0].result.tools.find(t=>t.name==='live_create_clip');assert(tool);assert(!tool.inputSchema.required.includes('destinationBeat'));assert(tool.inputSchema.required.includes('expectedSession'));assert.equal(tool.annotations.readOnlyHint,false);for(const r of replies.slice(1))assert(r.error||r.result.isError);assert.equal(replies.length,messages.length);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
