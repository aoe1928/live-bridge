const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const {execute,load,structural}=require('../src/set-automation.cjs');
const envelope=(id,target,events)=>`<AutomationEnvelope Id="${id}"><EnvelopeTarget><PointeeId Value="${target}" /></EnvelopeTarget><Automation><Events>${events}</Events><AutomationTransformViewState><IsTransformPending Value="false" /><TimeAndValueTransforms /></AutomationTransformViewState></Automation></AutomationEnvelope>`;
const fixture=()=>`<?xml version="1.0" encoding="UTF-8"?><Ableton MajorVersion="5" MinorVersion="11.0_11300" Creator="Ableton Live 11.3.43"><LiveSet><Tracks><MidiTrack Id="12"><Name><EffectiveName Value="Test &amp; 音楽" /></Name><DeviceChain><Mixer><Volume><Manual Value="0.7" /><AutomationTarget Id="42"><LockEnvelope Value="0" /></AutomationTarget></Volume></Mixer><Devices><Opaque Value="keep me" /></Devices></DeviceChain><AutomationEnvelopes><Envelopes /></AutomationEnvelopes><Notes>123</Notes></MidiTrack><ReturnTrack Id="13"><Name><EffectiveName Value="Return" /></Name><DeviceChain><Mixer><Volume><Manual Value="0.4" /><AutomationTarget Id="43" /></Volume></Mixer></DeviceChain><AutomationEnvelopes><Envelopes /></AutomationEnvelopes></ReturnTrack></Tracks><MasterTrack><DeviceChain><Mixer><Tempo><Manual Value="120" /><AutomationTarget Id="8" /></Tempo></Mixer></DeviceChain><AutomationEnvelopes><Envelopes>${envelope('1','8','<FloatEvent Id="1" Time="-63072000" Value="120" /><FloatEvent Id="2" Time="4" Value="125" CurveControl1X="0.2" CurveControl1Y="0.7" FutureAttribute="preserve" /><FloatEvent Id="3" Time="8" Value="130" />')}</Envelopes></AutomationEnvelopes></MasterTrack></LiveSet></Ableton>`;
function run(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'set-envelope-'));try{const sourcePath=path.join(dir,'source.als');fs.writeFileSync(sourcePath,zlib.gzipSync(fixture()));const source=fs.readFileSync(sourcePath);const expectedFileSha256=load(sourcePath).sha;const args={sourcePath,expectedFileSha256,outputPath:path.join(dir,'edited.als'),trackKey:'master',targetId:'8',minValue:20,maxValue:999};fn({dir,args,source});}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('exact stored attributes, pagination, master tempo and target discovery',()=>run(({args,dir})=>{
 const list=execute('set_automation_read',{sourcePath:args.sourcePath},dir);assert.equal(list.targets.total,3);assert.equal(list.liveApplied,false);assert.equal(list.valueDomain,'saved-set-xml');assert.match(list.valueWarning,/linear gain/);
 const r=execute('set_automation_read',{sourcePath:args.sourcePath,trackKey:'master',targetId:'8',offset:1,limit:1},dir);assert.equal(r.events.items[0].attributes.CurveControl1X,'0.2');assert.equal(r.events.nextOffset,2);assert.equal(r.tempo,true);
}));
test('edit tempo, preserve curve attributes, unrelated XML and source, byte-exact restoration',()=>run(({args,dir,source})=>{
 const result=execute('set_automation_edit',{...args,updates:[{eventId:'2',value:135}],points:[{time:16,value:140}]},dir);
 assert(result.verified);assert.equal(result.liveApplied,false);assert.deepEqual(fs.readFileSync(args.sourcePath),source);
 assert.equal(structural(load(args.sourcePath)),structural(load(args.outputPath)));
 const r=execute('set_automation_read',{sourcePath:args.outputPath,trackKey:'master',targetId:'8'},dir);assert.equal(r.events.items[1].attributes.FutureAttribute,'preserve');assert.equal(r.events.items[1].attributes.Value,'135');
 const restored=execute('set_automation_restore',{sourcePath:args.outputPath,expectedFileSha256:result.fileSha256,outputPath:path.join(dir,'restored.als'),snapshotId:result.snapshotId,snapshotSha256:result.snapshotSha256},dir);
 assert(restored.exactOriginalFile);assert.deepEqual(fs.readFileSync(restored.outputPath),source);
}));
test('creates absent track and return envelopes using baseline manual value',()=>run(({args,dir})=>{
 for(const [trackKey,targetId] of [['MidiTrack:12','42'],['ReturnTrack:13','43']]){
 const outputPath=path.join(dir,targetId+'.als');execute('set_automation_edit',{...args,outputPath,trackKey,targetId,minValue:0,maxValue:1,points:[{time:0,value:0.5},{time:8,value:0.9}]},dir);
 const r=execute('set_automation_read',{sourcePath:outputPath,trackKey,targetId},dir);assert.equal(r.events.total,3);assert.equal(r.events.items[0].attributes.Time,'-63072000');assert.equal(r.events.items[2].attributes.Value,'0.9');
 }
}));
test('stale hashes, collisions, bad ranges, unknown IDs fail without output',()=>run(({args,dir})=>{
 const changes=[{expectedFileSha256:'0'.repeat(64),points:[{time:2,value:100}]},{points:[{time:4,value:100}]},{points:[{time:2,value:1000}]},{points:[{time:-1,value:100}]},{updates:[{eventId:'missing',value:130}]},{updates:[{eventId:'2',time:8}]},{deleteEventIds:['1']},{targetId:'999',points:[{time:2,value:100}]},{points:[{time:2,value:NaN}]}];
 for(const c of changes){assert.throws(()=>execute('set_automation_edit',{...args,...c},dir));assert(!fs.existsSync(args.outputPath));}
}));
test('never overwrites output or source, requires same project directory',()=>run(({args,dir,source})=>{
 fs.writeFileSync(args.outputPath,'untouched');assert.throws(()=>execute('set_automation_edit',{...args,points:[{time:2,value:100}]},dir));assert.equal(fs.readFileSync(args.outputPath,'utf8'),'untouched');
 assert.throws(()=>execute('set_automation_edit',{...args,outputPath:args.sourcePath,points:[{time:2,value:100}]},dir));assert.deepEqual(fs.readFileSync(args.sourcePath),source);
 fs.mkdirSync(path.join(dir,'other'));assert.throws(()=>execute('set_automation_edit',{...args,outputPath:path.join(dir,'other','x.als'),points:[{time:2,value:100}]},dir),/beside/);
}));
test('restore refuses unrelated edits and tampered snapshots',()=>run(({args,dir})=>{
 const saved=execute('set_automation_snapshot',args,dir);const d=load(args.sourcePath);fs.writeFileSync(args.outputPath,zlib.gzipSync(d.xml.replace('<Notes>123','<Notes>456')));const current=load(args.outputPath);
 const a={sourcePath:args.outputPath,expectedFileSha256:current.sha,outputPath:path.join(dir,'restored.als'),...saved};assert.throws(()=>execute('set_automation_restore',a,dir),/unrelated/);assert(!fs.existsSync(a.outputPath));
 assert.throws(()=>execute('set_automation_restore',{...a,snapshotSha256:'0'.repeat(64)},dir),/changed/);
}));
test('malformed XML, entities and untested versions fail closed',()=>run(({args})=>{
 for(const xml of [fixture().replace('</LiveSet>','</Bad>'),fixture().replace('11.0_11300','12.0_12300'),fixture().replace('<LiveSet>','<!DOCTYPE x><LiveSet>')]){
 fs.writeFileSync(args.sourcePath,zlib.gzipSync(xml));assert.throws(()=>load(args.sourcePath));
 }
}));
test('deletes or moves selected events without replacing other event metadata',()=>run(({args,dir})=>{
 const result=execute('set_automation_edit',{...args,updates:[{eventId:'2',time:6}],deleteEventIds:['3']},dir);
 const r=execute('set_automation_read',{sourcePath:result.outputPath,trackKey:'master',targetId:'8'},dir);assert.equal(r.events.total,2);assert.equal(r.events.items[1].attributes.Time,'6');assert.equal(r.events.items[1].attributes.CurveControl1Y,'0.7');
}));
