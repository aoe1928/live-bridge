const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),zlib=require('node:zlib');
test('saved-Set MCP executes without a Live connection and advertises file-only scope',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'set-automation-mcp-'));
 try{require('../scripts/build.cjs').build(out);
 const sourcePath=path.join(out,'source.als');fs.writeFileSync(sourcePath,zlib.gzipSync('<Ableton MinorVersion="11.0_11300"><LiveSet><Tracks /><MasterTrack><DeviceChain><Mixer><Tempo><Manual Value="120" /><AutomationTarget Id="8" /></Tempo></Mixer></DeviceChain><AutomationEnvelopes><Envelopes /></AutomationEnvelopes></MasterTrack></LiveSet></Ableton>'));
 const queries=[{id:1,method:'tools/list'},{id:2,method:'tools/call',params:{name:'live_read_set_automation',arguments:{sourcePath}}},{id:3,method:'tools/call',params:{name:'live_edit_set_automation',arguments:{sourcePath}}}];
 const replies=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:queries.map(q=>JSON.stringify({jsonrpc:'2.0',...q})).join('\n')+'\n',encoding:'utf8',timeout:5000}).trim().split('\n').map(JSON.parse);
 const all=replies[0].result.tools;assert.equal(all.length,62);assert.equal(all.find(t=>t.name==='live_edit_set_automation').annotations.readOnlyHint,false);assert.equal(all.find(t=>t.name==='live_read_set_automation').annotations.readOnlyHint,true);
 assert(!replies[1].result.isError);const read=JSON.parse(replies[1].result.content[0].text);assert.equal(read.liveApplied,false);assert.equal(read.targets.items[0].trackKey,'master');assert(replies[2].error);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
