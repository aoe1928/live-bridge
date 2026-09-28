const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {build}=require('../scripts/build.cjs');
test('appearance MCP tools require optimistic guards and reject malformed writes before transport',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'live-appearance-schema-'));
 try {
  build(out);
  const rename={trackId:1,name:'Kick',expectedName:'Old',expectedSession:'s'};
  const color={trackId:1,colorIndex:0,expectedColorIndex:1,expectedSession:'s'};
  const bad=[...['','   ','bad\nname','x'.repeat(129)].map(name=>['live_rename_track',{...rename,name}]),['live_rename_track',{...rename,expectedName:undefined}],['live_rename_track',{...rename,expectedSession:undefined}],...[-1,70,1.5].map(colorIndex=>['live_set_track_color',{...color,colorIndex}]),['live_set_track_color',{...color,expectedColorIndex:undefined}]];
  const messages=[{jsonrpc:'2.0',id:0,method:'tools/list'},...bad.map(([name,args],i)=>({jsonrpc:'2.0',id:i+1,method:'tools/call',params:{name,arguments:args}}))];
  const output=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:messages.map(JSON.stringify).join('\n')+'\n',encoding:'utf8',timeout:3000});
  const replies=output.trim().split('\n').map(JSON.parse);
  for(const name of ['live_rename_track','live_set_track_color']){
   const tool=replies[0].result.tools.find(t=>t.name===name);assert(tool);assert.equal(tool.annotations.readOnlyHint,false);assert(tool.inputSchema.required.includes('expectedSession'));
  }
  assert.equal(replies.length,messages.length);
  for(const reply of replies.slice(1))assert(reply.error||reply.result.isError);
 } finally {fs.rmSync(out,{recursive:true,force:true});}
});
