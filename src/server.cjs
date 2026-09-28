const fs=require('node:fs'),path=require('node:path'),dgram=require('node:dgram'),crypto=require('node:crypto'),readline=require('node:readline');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'bridge-config.json')));
function oscStr(s){const b=Buffer.from(s+'\0');return Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);}
function decode(b){let p=0;function str(){const e=b.indexOf(0,p);if(e<0)throw Error('Invalid OSC');const v=b.toString('utf8',p,e);p=(e+4)&~3;return v;}const addr=str(),types=str(),args=[];for(const t of types.slice(1)){if(t==='s')args.push(str());else if(t==='i'){args.push(b.readInt32BE(p));p+=4;}else if(t==='f'){args.push(b.readFloatBE(p));p+=4;}else throw Error('Unsupported OSC');}return {addr,args};}
async function request(op,args={}){const id=crypto.randomUUID(),sock=dgram.createSocket('udp4'),chunks=[];return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{sock.close();reject(Error('Live bridge timed out. Load exactly one MIDI or Audio bridge in the Live Set.'));},10000);let finished=false;function finish(e,v){if(finished)return;finished=true;clearTimeout(timer);sock.close();e?reject(e):resolve(v);}sock.on('error',e=>finish(e));sock.on('message',(b,remote)=>{if(remote.address!=='127.0.0.1')return;try{const m=decode(b);if(m.addr!=='/reply'||m.args[0]!==id)return;const [,index,total,data]=m.args;chunks[index]=data;if(chunks.filter(x=>x!==undefined).length===total){const r=JSON.parse(decodeURIComponent(chunks.join('')));finish(r.error?Error(r.error):null,r.result);}}catch(e){finish(e);}});sock.bind(cfg.responsePort,'127.0.0.1',()=>{const req=JSON.stringify({id,token:cfg.token,op,...args});sock.send(Buffer.concat([oscStr('/codex'),oscStr(',s'),oscStr(req)]),cfg.requestPort,'127.0.0.1');});});}
const beat={type:'number',minimum:0};
const tools=[['live_status','Read connection and host track','status',{}],['live_list_tracks','Read tracks and devices in the current Live Set','tracks',{}],['live_list_clips','Read Arrangement and Session clips on an explicitly selected track','clips',{}],['live_read_notes','Read MIDI notes on an explicitly selected track','notes',{clipId:{type:'integer',minimum:1}}],['live_create_test_variation','Copy the source loop to an empty Session slot on an explicitly selected track; change only the first note velocity; never launches playback','variation',{clipId:{type:'integer',minimum:1},velocityDelta:{type:'number',minimum:-20,maximum:20}}]];
tools.push(['live_change_note_pitches','Change only the pitches of existing notes in the current Set. Requires the current note fingerprint and original pitches; rejects overlapping destination notes and verifies read-back. Save original notes before editing.','pitches',{clipId:{type:'integer',minimum:1},expectedFingerprint:{type:'string',pattern:'^[0-9]+$'},changes:{type:'array',minItems:1,maxItems:128,items:{type:'object',properties:{noteId:{type:'integer',minimum:1},expectedPitch:{type:'integer',minimum:0,maximum:127},pitch:{type:'integer',minimum:0,maximum:127}},required:['noteId','expectedPitch','pitch'],additionalProperties:false}}}]);
tools.push(['live_read_arrangement_range','Read MIDI note occurrences in a song beat range, end exclusive. At constant 4/4, bar 75 starts at beat 296. Check loop warnings before editing.','range',{startBeat:beat,endBeat:beat}]);
tools.push(['live_transport','Seek, start or stop playback. Bounded preview requires recording and Arrangement loop off. preview ends automatically; its endBeat is exclusive. beat/endBeat ignored for play/stop.','transport',{action:{type:'string',enum:['seek','play','stop','preview']},beat:beat,endBeat:beat}]);
tools.push(['live_list_edit_history','Read local pitch edit journal; no Live changes.','history',{}]);
tools.push(['live_restore_pitch_edit','Restore a verified pitch edit when the bridge session and full clip fingerprint still match.','restore',{editId:{type:'string',pattern:'^[a-f0-9-]{36}$'}}]);

const ident={type:'integer',minimum:1},num={type:'number'},session={type:'string'};
tools.find(t=>t[2]==='clips')[3].trackId=ident;
tools.find(t=>t[2]==='range')[3].trackId=ident;
tools.push(['live_list_devices','List devices recursively including Rack chains on the selected track','devices',{trackId:ident}]);
tools.push(['live_read_parameters','Read Live-exposed device parameters, ranges, native values, display strings and automation state','parameters',{deviceId:ident}]);
tools.push(['live_read_mixer','Read volume/pan/send parameter IDs and values, mute/solo. Values use native API units, not dB.','mixer',{trackId:ident}]);
tools.push(['live_set_parameter','Set one enabled, unautomated parameter, including mixer volume/pan/send. Native API units, not dB. Requires session and previous value; stopped playback.','set_parameter',{parameterId:ident,value:num,expectedValue:num,expectedSession:session}]);
tools.push(['live_set_track','Set mute or solo on a normal/return track; stopped playback.','set_track',{trackId:ident,property:{type:'string',enum:['mute','solo']},value:{type:'integer',minimum:0,maximum:1},expectedValue:{type:'integer',minimum:0,maximum:1},expectedSession:session}]);
tools.push(['live_set_song','Change current tempo or time signature. Does not insert timeline automation or signature markers; stopped playback.','set_song',{property:{type:'string',enum:['tempo','signature_numerator','signature_denominator']},value:num,expectedValue:num,expectedSession:session}]);


const {browserRequest}=require('./browser-client.cjs');
tools.push(['live_browser_status','Read the optional Remote Script connection and target track device-chain fingerprints. Remote targetId is distinct from Max trackId.','browser_status',{}]);
tools.push(['live_search_plugins','Search installed plugin browser on demand. Returns exact item IDs and format/vendor paths. Does not load anything.','browser_search',{query:{type:'string'}}]);
tools.push(['live_insert_l2','Append the searched Waves L2 variant to one explicitly selected track. Read browser status first; requires target name, chain fingerprint and session. Rejects playback, frozen tracks and duplicates. Inspect after any timeout; never retry blindly.','browser_load',{itemId:{type:'string'},targetId:{type:'string'},expectedName:{type:'string'},expectedFingerprint:{type:'string'},expectedSession:{type:'string'}}]);


const clipNoteProperties={pitch:{type:'integer',minimum:0,maximum:127},start_time:beat,duration:{type:'number',exclusiveMinimum:0,maximum:256},velocity:{type:'number',minimum:0,maximum:127},mute:{type:'integer',minimum:0,maximum:1},probability:{type:'number',minimum:0,maximum:1},velocity_deviation:{type:'number',minimum:-127,maximum:127},release_velocity:{type:'number',minimum:0,maximum:127}};
tools.push(['live_create_clip','Create a MIDI clip in the first empty Session slot on an explicit MIDI track, write notes, and optionally copy it to Arrangement. destinationBeat is absolute quarter-note beats from song start (0-based), not a bar number. Leaves the Session source clip. Requires stopped playback and expectedSession. Rejects occupied Arrangement ranges. No playback or save. After errors/timeouts inspect both views before retry.','create_clip',{trackId:ident,length:{type:'number',exclusiveMinimum:0,maximum:256},destinationBeat:{type:'number',minimum:0,maximum:1576800},notes:{type:'array',minItems:0,maxItems:128,items:{type:'object',properties:clipNoteProperties,required:['pitch','start_time','duration'],additionalProperties:false}},expectedSession:session}]);
function requiredFields(op,properties){return Object.keys(properties).filter(k=>op!=='create_clip'||k!=='destinationBeat');}
function validateClipArgs(a){const t=tools.find(t=>t[2]==='create_clip');validate(a,{type:'object',properties:t[3],required:requiredFields(t[2],t[3])});if(a.destinationBeat!==undefined&&a.destinationBeat+a.length>1576800)throw Error('Destination exceeds timeline range');for(const n of a.notes)if(n.start_time>=a.length||n.start_time+n.duration>a.length)throw Error('Note exceeds clip length');}

const historyDir=path.join(__dirname,'edit-history');
function journalFile(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid edit ID');return path.join(historyDir,id+'.json');}
function writeJournal(j){fs.mkdirSync(historyDir,{recursive:true});const f=journalFile(j.editId);fs.writeFileSync(f+'.tmp',JSON.stringify(j,null,2));fs.renameSync(f+'.tmp',f);}
async function execute(op,a){
 if(op==='create_clip')validateClipArgs(a);
 const lock=path.join(__dirname,'bridge.lock');let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));}catch(e){
  if(e.code!=='EEXIST')throw e;
  const pid=Number(fs.readFileSync(lock,'utf8'));let dead=false;try{process.kill(pid,0);}catch(err){dead=err.code==='ESRCH';}
  if(!dead)throw Error('Another Live MCP client is busy; retry after it completes');
  fs.unlinkSync(lock);fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));
 }
 try{return await executeUnlocked(op,a);}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
async function executeUnlocked(op,a){
 if(op.startsWith('browser_')){
  if(op!=='browser_load')return browserRequest(op.slice(8),a);
  const directory=path.join(__dirname,'device-history');fs.mkdirSync(directory,{recursive:true});const id=crypto.randomUUID(),file=path.join(directory,id+'.json');const entry={id,date:new Date().toISOString(),state:'pending',request:a};fs.writeFileSync(file,JSON.stringify(entry,null,2));
  try{const r=await browserRequest('load',a);entry.state='verified';entry.result=r;fs.writeFileSync(file,JSON.stringify(entry,null,2));return {...r,operationId:id};}catch(e){entry.state='failed-or-uncertain';entry.error=e.message;fs.writeFileSync(file,JSON.stringify(entry,null,2));throw e;}
 }

 if(op==='history')return fs.existsSync(historyDir)?fs.readdirSync(historyDir).filter(x=>/^[a-f0-9-]{36}\.json$/.test(x)).map(x=>{const j=JSON.parse(fs.readFileSync(path.join(historyDir,x)));return {editId:j.editId,date:j.date,state:j.state,clipId:j.clipId,changedNoteCount:j.changes.length};}):[];
 if(op==='restore'){
  const j=JSON.parse(fs.readFileSync(journalFile(a.editId)));if(j.state!=='verified')throw Error('Only verified, unrestored edits can be restored');
  const status=await request('status');if(status.session!==j.session)throw Error('Bridge session changed; automatic restore unavailable');
  const changes=j.changes.map(ch=>({noteId:ch.noteId,expectedPitch:ch.pitch,pitch:ch.expectedPitch}));
  const r=await request('pitches',{clipId:j.clipId,expectedFingerprint:j.afterFingerprint,expectedSession:j.session,changes});
  j.state='restored';j.restoredAt=new Date().toISOString();writeJournal(j);return {...r,editId:j.editId};
 }
 if(op!=='pitches')return request(op,a);
 const status=await request('status'),before=await request('notes',{clipId:a.clipId,expectedSession:status.session});
 if(before.fingerprint!==a.expectedFingerprint)throw Error('Clip changed since read; read again');
 const j={editId:crypto.randomUUID(),date:new Date().toISOString(),state:'pending',session:status.session,hostTrackId:status.hostTrackId,hostTrackName:status.hostTrackName,trackId:before.trackId,clipId:a.clipId,before,changes:a.changes};writeJournal(j);
 try{const r=await request(op,{...a,expectedSession:status.session});j.state='verified';j.afterFingerprint=r.afterFingerprint;writeJournal(j);return {...r,editId:j.editId};}
 catch(e){j.state='failed-or-uncertain';j.error=e.message;writeJournal(j);throw e;}
}
function validate(v,s){if(s.type==='object'){if(!v||Array.isArray(v)||typeof v!=='object')throw Error('Expected object');for(const k of s.required||[])if(!(k in v))throw Error('Missing '+k);for(const k of Object.keys(v)){if(!(k in s.properties))throw Error('Unexpected '+k);validate(v[k],s.properties[k]);}}else if(s.type==='array'){if(!Array.isArray(v)||v.length<s.minItems||v.length>s.maxItems)throw Error('Invalid changes');for(const item of v)validate(item,s.items);}else if(s.type==='string'){if(typeof v!=='string'||(s.enum&&!s.enum.includes(v))||(s.pattern&&!new RegExp(s.pattern).test(v)))throw Error('Invalid fingerprint');}else if(typeof v!=='number'||!Number.isFinite(v)||(s.type==='integer'&&!Number.isInteger(v))||v<s.minimum||(s.exclusiveMinimum!==undefined&&v<=s.exclusiveMinimum)||(s.maximum!==undefined&&v>s.maximum))throw Error('Invalid number');}
async function rpc(m){if(m.method==='initialize')return {protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'codex-live-bridge',version:'0.6.0'},instructions:'Read tracks and clips again after switching Live Sets. Read and back up notes before writes. Never infer BFD drum names from General MIDI; verify the loaded keymap. One bridge controls the whole Set. Read tracks first and use explicit track IDs. Parameter values are native API units, not dB; inspect display/min/max. Writes require stopped playback.'};if(m.method==='ping')return {};if(m.method==='tools/list')return {tools:tools.map(([name,description,op,properties])=>({name,description,inputSchema:{type:'object',properties,required:requiredFields(op,properties),additionalProperties:false},annotations:{readOnlyHint:!['variation','pitches','transport','restore','set_parameter','set_track','set_song','browser_load','create_clip'].includes(op),destructiveHint:false,openWorldHint:false}}))};if(m.method==='tools/call'){const t=tools.find(t=>t[0]===m.params.name);if(!t)throw Error('Unknown tool');const a=m.params.arguments||{};validate(a,{type:'object',properties:t[3],required:requiredFields(t[2],t[3])});try{return {content:[{type:'text',text:JSON.stringify(await execute(t[2],a))}]};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}}throw Error('Unknown method');}
if(process.argv[2]==='--request'){execute(process.argv[3],JSON.parse(process.argv[4]||'{}')).then(r=>{console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e.message);process.exitCode=1;});}else{let queue=Promise.resolve();readline.createInterface({input:process.stdin}).on('line',line=>{queue=queue.then(async()=>{let m;try{m=JSON.parse(line);if(m.id===undefined)return;const result=await rpc(m);process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\n');}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m?.id??null,error:{code:-32602,message:e.message}})+'\n');}});});}
