const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {build}=require('../scripts/build.cjs');
test('local build pairs credentials, preserves them on update, and packages both device types',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'live-bridge-test-'));
 try{
 build(out);const cfg=JSON.parse(fs.readFileSync(path.join(out,'bridge-config.json')));assert.match(cfg.token,/^[a-f0-9]{64}$/);assert(fs.readFileSync(path.join(out,'live-api.js'),'utf8').includes(cfg.token));
 for(const kind of ['MIDI','Audio']){const b=fs.readFileSync(path.join(out,'Live Bridge '+kind+'.amxd'));assert.equal(b.toString('ascii',0,4),'ampf');assert.equal(b.readUInt32LE(28),b.length-32);const doc=JSON.parse(require('../scripts/frozen-device.cjs').unpack(b)[0].data.toString().replace(/\0+$/,''));const boxes=doc.patcher.boxes;assert(boxes.some(x=>x.box.id==='help-window'));const text=JSON.stringify(doc);assert(!/__SETUP_PROMPT__|__LIVE_BRIDGE_TOKEN__|__LOCAL_PATH__/.test(text));assert(text.includes('入力：None'));assert(text.includes('live_list_tracks'));assert(boxes.some(x=>x.box.text===(kind==='Audio'?'plugin~':'midiin')));}
 build(out);assert.equal(JSON.parse(fs.readFileSync(path.join(out,'bridge-config.json'))).token,cfg.token);
 const library=path.join(out,'Test User Library');fs.mkdirSync(library);cp.execFileSync(process.execPath,[path.join(out,'install-browser.cjs'),library]);const installed=JSON.parse(fs.readFileSync(path.join(library,'Remote Scripts/LiveBridgeBrowser/config.json')));assert.equal(installed.token,cfg.token);assert.equal(installed.port,17833);
 const messages=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05'}},{jsonrpc:'2.0',id:2,method:'tools/list'}];const stdout=cp.execFileSync(process.execPath,[path.join(out,'server.cjs')],{input:messages.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8'});const replies=stdout.trim().split('\n').map(x=>JSON.parse(x));assert.equal(replies[0].result.serverInfo.version,'0.9.0');assert.equal(replies[1].result.tools.length,27);assert.equal(replies[1].result.tools.find(t=>t.name==='live_insert_l2').annotations.readOnlyHint,false);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
