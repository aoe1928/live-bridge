const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {build}=require('../scripts/build.cjs');
test('MCP move schemas reject missing guards, OS overrides and path traversal without contacting Live',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'live-move-schema-'));
 try{
  build(out);const a={trackId:1,direction:'up',expectedSession:'s',expectedOrderFingerprint:'a'.repeat(64)};
  const cases=[['live_prepare_track_move',{...a,expectedSession:undefined}],['live_prepare_track_move',{...a,platform:'darwin'}],['live_prepare_track_move',{...a,direction:'left'}],['live_prepare_track_move',{...a,expectedOrderFingerprint:'bad'}],['live_arm_track_move',{moveId:'../config'}],['live_verify_track_move',{moveId:'../config'}]];
  const msgs=[{jsonrpc:'2.0',id:0,method:'tools/list'},...cases.map(([name,args],i)=>({jsonrpc:'2.0',id:i+1,method:'tools/call',params:{name,arguments:args}}))];
  const lines=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{encoding:'utf8',input:msgs.map(JSON.stringify).join('\n')+'\n',timeout:3000}).trim().split('\n').map(JSON.parse);
  assert.equal(lines[0].result.tools.find(t=>t.name==='live_read_track_order').annotations.readOnlyHint,true);
  for(const name of ['live_prepare_track_move','live_arm_track_move','live_verify_track_move'])assert.equal(lines[0].result.tools.find(t=>t.name===name).annotations.readOnlyHint,false);
  assert.equal(lines.length,msgs.length);for(const r of lines.slice(1))assert(r.error||r.result.isError);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
