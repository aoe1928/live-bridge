const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const id={type:'integer',minimum:1},num={type:'number'},bit={type:'integer',minimum:0,maximum:1};
const text={type:'string'},name={type:'string',minLength:1,maxLength:128,pattern:'^[^\\x00-\\x1f\\x7f]*\\S[^\\x00-\\x1f\\x7f]*$'};
const guard={expectedSession:{type:'string',minLength:1}},finger={...guard,expectedFingerprint:{type:'string',pattern:'^[0-9]+$'}};
const arr=(items,min=0,max=128)=>({type:'array',items,minItems:min,maxItems:max});
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const scalar={anyOf:[num,text]},color={type:'integer',minimum:0,maximum:69};
const beat={type:'number',minimum:0,maximum:1576800};
const note={pitch:{type:'integer',minimum:0,maximum:127},start_time:beat,duration:{type:'number',exclusiveMinimum:0,maximum:1576800},velocity:{type:'number',minimum:0,maximum:127},mute:bit,probability:{type:'number',minimum:0,maximum:1},velocity_deviation:{type:'number',minimum:-127,maximum:127},release_velocity:{type:'number',minimum:0,maximum:127}};
const topology={...guard,trackId:id,expectedName:text,expectedTrackIds:arr(id,0,4096),expectedReturnTrackIds:arr(id,0,4096)};
const snapshotId={type:'string',pattern:'^[a-f0-9-]{36}$'},tools=[];
function add(tool,description,op,properties,required,readOnly=false){tools.push([tool,description,op,properties,required||Object.keys(properties),readOnly]);}
add('live_batch_set','Set up to 128 mixer/appearance values across tracks. Read mixers/tracks first. Native parameter units, NOT dB. send uses returnTrackId (not send index). Each item needs expectedValue. All items preflight before any write; runtime failure may leave partial changes, reported in error. Frozen/automated/disabled parameters rejected.', 'x_batch', {...guard,changes:arr(obj({trackId:id,property:{type:'string',enum:['volume','pan','send','mute','solo','name','colorIndex']},returnTrackId:id,value:scalar,expectedValue:scalar},['trackId','property','value','expectedValue']),1)});
add('live_read_routing','Read routing identifiers and available choices. Refresh after changing a routing type because available channels change. Master routing is not exposed.','x_routing_read',{trackId:id},null,true);
add('live_set_routing','Set one available input/output routing type or channel by identifier from live_read_routing. Requires current identifier and stopped transport. Type changes may reset the channel; response includes refreshed routing.','x_routing_set',{...guard,trackId:id,property:{type:'string',enum:['input_routing_type','input_routing_channel','output_routing_type','output_routing_channel']},identifier:text,expectedIdentifier:text});
add('live_duplicate_track','Duplicate one normal non-group track with its clips/devices after itself. Read status/tracks first. Return/Master/group and tracks containing Live Bridge are excluded. No playback or save. Inspect after timeout.','x_track_duplicate',topology);
add('live_delete_track','Delete an explicitly requested normal or Return track including its contents; destructive. Read status/tracks first. Master, groups, last normal track, and Live Bridge host are protected. No automatic undo.','x_track_delete',topology);
add('live_update_notes','Modify MIDI pitch, velocity, duration, timing, mute or probability by noteId, preserving untouched notes and expression fields. Read notes first; fingerprint required. Loop edits affect every repetition.','x_notes_update',{...finger,clipId:id,changes:arr(obj({noteId:id,...note},['noteId']),1)});
add('live_add_notes','Add MIDI notes to an existing clip, preserving existing notes. Read notes first; timing uses absolute clip beats. Overlaps of the same pitch rejected.','x_notes_add',{...finger,clipId:id,notes:arr(obj(note,['pitch','start_time','duration']),1)});
add('live_delete_notes','Delete only the specified MIDI note IDs; preserves all other notes. Read and back up notes first. Loop edits affect all repetitions.','x_notes_delete',{...finger,clipId:id,noteIds:arr(id,1)});
add('live_read_clip_settings','Read clip name, color, loop, markers and mute plus fingerprint. Includes whether timing uses beats or seconds for unwarped audio.','x_clip_read',{clipId:id},null,true);
add('live_set_clip_settings','Change clip name/color/loop boundaries/markers/mute. Read settings first. Loop changes affect every repetition; unwarped audio uses seconds and cannot enable looping. No clip movement.','x_clip_set',{...finger,clipId:id,settings:obj({name,colorIndex:color,loopStart:beat,loopEnd:beat,startMarker:beat,endMarker:beat,looping:bit,muted:bit},[])});
add('live_list_scenes','Read Session scenes and slot clip identities with fingerprint.','x_scenes_read',{},null,true);
add('live_manage_scene','Create at end, duplicate, delete, or update a Session scene name/color. Delete also deletes its Session clips. Read scenes first. sceneId required except create; name/colorIndex only for create/update. Does not launch or record.','x_scene',{...finger,action:{type:'string',enum:['create','duplicate','delete','update']},sceneId:id,name,colorIndex:color},[...Object.keys(finger),'action']);
add('live_list_locators','Read Arrangement locator IDs, names, beat positions and fingerprint.','x_locators_read',{},null,true);
add('live_manage_locator','Create an Arrangement locator at beat, rename or delete it. Read locators first. create requires beat/name; rename requires locatorId/name; delete requires locatorId. Existing position is never toggled during create. Temporarily seeks while stopped, then restores position if unchanged.','x_locator',{...finger,action:{type:'string',enum:['create','rename','delete']},locatorId:id,beat,name},[...Object.keys(finger),'action']);
add('live_read_mix_state','Read selected tracks volume/pan/sends/mute/solo and all Live-exposed device parameters with IDs, native values, automation status and fingerprint. No plugin binary state.','x_mix_read',{trackIds:arr(id,1,64)},null,true);
add('live_save_mix_snapshot','Save a local named mix snapshot for explicit track IDs, including exposed plugin parameters. Does not save the Live Set. Returns snapshotId.','snapshot_save',{name,trackIds:arr(id,1,64)});
add('live_list_mix_snapshots','List local mix snapshots. No Live changes.','snapshot_list',{},null,true);
add('live_read_mix_snapshot','Read one saved local mix snapshot. Historical values, not current Live state.','snapshot_read',{snapshotId},null,true);
add('live_compare_mix_snapshot','Compare saved mixer/device parameter values with current values on the same session and IDs. Returns currentFingerprint for restore. No writes.','snapshot_compare',{snapshotId},null,true);
add('live_restore_mix_snapshot','Restore saved mixer and exposed plugin values. First compare; pass currentFingerprint as expectedFingerprint. Same bridge session/track/parameter topology required. Changed automated/disabled values rejected; partial failures reported, no blind retry.','snapshot_restore',{snapshotId,...finger});
const readOnly=new Set(tools.filter(t=>t[5]).map(t=>t[2]));
function snapshotFile(dir,id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid snapshot ID');return path.join(dir,id+'.json');}
function mixValues(state){return state.tracks.flatMap(t=>[...(t.parameters||[]).map(p=>({key:'parameter:'+p.id,trackId:t.id,value:p.value})),...['mute','solo'].filter(k=>t[k]!==null).map(k=>({key:t.id+':'+k,trackId:t.id,value:t[k]}))]);}
function compare(saved,current){
 if(saved.session!==current.session)throw Error('Snapshot belongs to another bridge session; automatic restore unavailable');
 if(saved.topology!==current.topology)throw Error('Track/device/send/parameter topology changed; snapshot cannot be restored');
 const old=mixValues(saved),now=new Map(mixValues(current).map(p=>[p.key,p]));
 return old.filter(p=>Math.abs(p.value-now.get(p.key).value)>0.00001).map(p=>({...p,savedValue:p.value,currentValue:now.get(p.key).value}));
}
async function executeProduction(op,a,request,base){
 const dir=path.join(base,'mix-snapshots');
 const load=id=>JSON.parse(fs.readFileSync(snapshotFile(dir,id),'utf8'));
 if(op==='snapshot_list')return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).map(f=>{const j=load(f.slice(0,-5));return {snapshotId:j.snapshotId,name:j.name,date:j.date,session:j.state.session,trackIds:j.trackIds};}):[];
 if(op==='snapshot_read')return load(a.snapshotId);
 if(op==='snapshot_save'){
  const state=await request('x_mix_read',{trackIds:a.trackIds});
  const j={snapshotId:crypto.randomUUID(),name:a.name,date:new Date().toISOString(),trackIds:a.trackIds,state};fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(snapshotFile(dir,j.snapshotId),JSON.stringify(j,null,2),{flag:'wx',mode:0o600});return {snapshotId:j.snapshotId,name:j.name,trackCount:state.tracks.length,session:state.session};
 }
 if(op==='snapshot_compare'||op==='snapshot_restore'){
  const j=load(a.snapshotId),current=await request('x_mix_read',{trackIds:j.trackIds}),changes=compare(j.state,current);
  if(op==='snapshot_compare')return {snapshotId:a.snapshotId,session:current.session,currentFingerprint:current.fingerprint,changes};
  if(a.expectedSession!==current.session||a.expectedFingerprint!==current.fingerprint)throw Error('Mix changed since comparison; compare again');
  const values=changes.map(ch=>{const [kind,property]=ch.key.split(':');return kind==='parameter'?{id:Number(property),property:'value',value:ch.savedValue}:{id:Number(kind),property,value:ch.savedValue};});
  return journal('x_mix_restore',{expectedSession:a.expectedSession,expectedFingerprint:a.expectedFingerprint,trackIds:j.trackIds,expectedTopologyFingerprint:current.topologyFingerprint,values},current);
 }
 if(readOnly.has(op))return request(op,a);
 return journal(op,a);
 async function journal(operation,args,before){
  const history=path.join(base,'production-history');fs.mkdirSync(history,{recursive:true});const operationId=crypto.randomUUID(),file=path.join(history,operationId+'.json');const entry={operationId,date:new Date().toISOString(),operation,request:args,before,state:'pending'};
  fs.writeFileSync(file,JSON.stringify(entry,null,2));
  try{const result=await request(operation,args);entry.state='verified';entry.result=result;fs.writeFileSync(file,JSON.stringify(entry,null,2));return {...result,operationId};}
  catch(e){entry.state='failed-or-uncertain';entry.error=e.message;fs.writeFileSync(file,JSON.stringify(entry,null,2));throw Error(e.message+'; operationId '+operationId);}
 }
}
module.exports={tools,readOnly,executeProduction,compare};
