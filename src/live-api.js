autowatch = 1;
inlets = 1; outlets = 1;
var TOKEN = '__LIVE_BRIDGE_TOKEN__';
var ready = true, cache = {}, tasks = [];
var SESSION = String(new Date().getTime())+"-"+String(Math.random());
var preview = null;
function stopPreview(){if(preview){preview.cancel();preview=null;}}
function finiteBeat(x){if(typeof x!=="number"||!isFinite(x)||x<0)throw new Error("Invalid beat");return x;}
function refreshUI(op){try{var t=this.patcher.getnamed('track');if(t)t.message('set','Placed on: '+String(val(host(),'name')));if(op){var a=this.patcher.getnamed('activity'),d=new Date(),stamp=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);var names={status:'Connection checked',tracks:'Tracks read',clips:'Clips read',notes:'Notes read',range:'Range read',pitches:'Pitch edit requested',variation:'Test copy requested',transport:'Transport requested'};if(a)a.message('set',(names[op]||'Agent request')+'  '+stamp);}}catch(e){}}
function init() { ready = true;refreshUI(null); }
function api(path) { var a = new LiveAPI(null, path); if (!a.id) throw new Error('Missing object: '+path); return a; }
function val(a,k) { var v=a.get(k); return v.length===1?v[0]:v; }
function ids(a,k) { var v=a.get(k),r=[]; for(var i=0;i<v.length;i++)if(v[i]==='id'&&Number(v[i+1]))r.push(Number(v[++i]));return r; }
function byId(id) { if(!Number(id))throw new Error('Invalid id');return api('id '+Number(id)); }
function reply(id,result,error) { var s=encodeURIComponent(JSON.stringify({id:id,result:result,error:error})),size=500,total=Math.ceil(s.length/size);for(var i=0;i<total;i++)outlet(0,'/reply',String(id),i,total,s.slice(i*size,(i+1)*size)); }
function notes(c) { var raw=c.call('get_all_notes_extended'); if(raw instanceof Array && raw[0]==='dictionary')return JSON.parse(new Dict(raw[1]).stringify()).notes;if(raw instanceof Array)raw=raw.length===1?raw[0]:raw.join(' ');return JSON.parse(String(raw)).notes; }
function clipInfo(c) { return {id:Number(c.id),name:val(c,'name'),isMidi:Number(val(c,'is_midi_clip')),start:val(c,'start_time'),end:val(c,'end_time'),loopStart:val(c,'loop_start'),loopEnd:val(c,'loop_end'),startMarker:val(c,'start_marker'),endMarker:val(c,'end_marker'),looping:Number(val(c,'looping'))}; }

function allTracks(){var s=api('live_set');return ids(s,'tracks').concat(ids(s,'return_tracks'),ids(s,'master_track'));}
function track(id){if(allTracks().indexOf(Number(id))<0)throw new Error('Track is outside current Set');return byId(id);}
function host(){var a=api('this_device');for(var i=0;i<32;i++){a=byId(ids(a,'canonical_parent')[0]);if(allTracks().indexOf(Number(a.id))>=0)return a;}throw new Error('No host track');}
function clipTrack(id){var all=ids(api('live_set'),'tracks');for(var n=0;n<all.length;n++){var t=byId(all[n]),clips=ids(t,'arrangement_clips'),slots=ids(t,'clip_slots');for(var j=0;j<slots.length;j++){var slot=byId(slots[j]);if(Number(val(slot,'has_clip')))clips=clips.concat(ids(slot,'clip'));}if(clips.indexOf(Number(id))>=0)return t;}throw new Error('Clip is outside current Set');}
function checkClip(id){clipTrack(id);var c=byId(id);if(!Number(val(c,'is_midi_clip')))throw new Error('Not MIDI');return c;}
function belongs(a){for(var i=0;i<32;i++){if(allTracks().indexOf(Number(a.id))>=0)return; a=byId(ids(a,'canonical_parent')[0]);}throw new Error('Object is outside current Set');}
function parameter(id){var p=byId(id);belongs(p);if(String(p.type)!=='DeviceParameter')throw new Error('Not a device parameter');return p;}
function parameterInfo(p){var v=Number(val(p,'value'));return {id:Number(p.id),name:val(p,'name'),value:v,display:String(p.call('str_for_value',v)),min:Number(val(p,'min')),max:Number(val(p,'max')),quantized:Number(val(p,'is_quantized')),enabled:Number(val(p,'is_enabled')),automationState:Number(val(p,'automation_state'))};}
function devicesIn(container,out,depth){if(depth>16)throw new Error('Rack nesting too deep');var ds=ids(container,'devices');for(var i=0;i<ds.length;i++){var d=byId(ds[i]),entry={id:Number(d.id),name:val(d,'name'),className:val(d,'class_name'),parentId:Number(container.id),depth:depth};out.push(entry);if(Number(val(d,'can_have_chains'))){var cs=ids(d,'chains');for(var j=0;j<cs.length;j++)devicesIn(byId(cs[j]),out,depth+1);}}return out;}
function assertWrite(req){if(req.expectedSession!==SESSION)throw new Error('Read status again; expectedSession required');if(Number(val(api('live_set'),'is_playing')))throw new Error('Stop playback before editing');}
function changeScalar(a,key,value,expected,low,high,integer){if(typeof value!=='number'||!isFinite(value)||value<low||value>high||(integer&&value!==Math.floor(value)))throw new Error('Invalid value');var before=Number(val(a,key));if(typeof expected!=='number'||Math.abs(before-expected)>0.000001)throw new Error('Value changed; read again');a.set(key,value);return {before:before,requested:value};}
function delayedVerify(req,a,key,change){var task=new Task(function(){try{var after=Number(val(a,key));if(Math.abs(after-change.requested)>0.00001)throw new Error('Read-back differs; inspect current state');var r={before:change.before,after:after,verified:true,session:SESSION};cache[req.id]=r;reply(req.id,r);}catch(e){reply(req.id,null,String(e));}},this);tasks.push(task);task.schedule(150);}

function fingerprint(ns) {var sorted=ns.slice().sort(function(a,b){return a.note_id-b.note_id;}),s=JSON.stringify(sorted),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return String(h>>>0);}
// Creation is staged because Live applies clip and note changes asynchronously.
var clipRequests = {};
function validateNewClip(req) {
 if(typeof req.trackId!=='number'||req.trackId<1||req.trackId!==Math.floor(req.trackId))throw new Error('Invalid trackId');
 if(typeof req.length!=='number'||!isFinite(req.length)||req.length<=0||req.length>256)throw new Error('length must be > 0 and <= 256 beats');
 if(req.destinationBeat!==undefined){finiteBeat(req.destinationBeat);if(req.destinationBeat+req.length>1576800)throw new Error('Destination exceeds timeline range');}
 if(!(req.notes instanceof Array)||req.notes.length>128)throw new Error('Expected 0..128 notes');
 var bounds={pitch:[0,127],start_time:[0,req.length],duration:[0,req.length],velocity:[0,127],mute:[0,1],probability:[0,1],velocity_deviation:[-127,127],release_velocity:[0,127]};
 for(var i=0;i<req.notes.length;i++){
  var n=req.notes[i];if(!n||typeof n!=='object'||n instanceof Array)throw new Error('Invalid note');
  for(var k in n){var b=bounds[k];if(!b||typeof n[k]!=='number'||!isFinite(n[k])||n[k]<b[0]||n[k]>b[1])throw new Error('Invalid note '+k);}
  if(n.pitch!==Math.floor(n.pitch)||typeof n.start_time!=='number'||typeof n.duration!=='number'||n.duration<=0||n.start_time>=req.length||n.start_time+n.duration>req.length)throw new Error('Invalid note timing or pitch');
  if(n.mute!==undefined&&n.mute!==0&&n.mute!==1)throw new Error('mute must be 0 or 1');
 }
}
function createMidiClip(req) {
 if(clipRequests[req.id]){var previous=clipRequests[req.id];reply(req.id,previous.result||null,previous.error||null);return;}
 validateNewClip(req);assertWrite(req);
 var t=track(req.trackId),song=api('live_set');
 if(ids(song,'tracks').indexOf(Number(t.id))<0||!Number(val(t,'has_midi_input'))||Number(val(t,'is_foldable'))||Number(val(t,'is_frozen')))throw new Error('Target must be an unfrozen MIDI track');
 function guard(){assertWrite(req);track(req.trackId);if(Number(val(song,'record_mode'))||Number(val(song,'session_record')))throw new Error('Disable recording before creating clips');if(Number(val(t,'is_frozen')))throw new Error('Track became frozen');}
 function checkDestination(){if(req.destinationBeat===undefined)return;var clips=ids(t,'arrangement_clips');for(var i=0;i<clips.length;i++){var c=byId(clips[i]);if(Number(val(c,'start_time'))<req.destinationBeat+req.length&&Number(val(c,'end_time'))>req.destinationBeat)throw new Error('Destination overlaps an existing Arrangement clip');}}
 guard();checkDestination();
 var slots=ids(t,'clip_slots'),slot=null,index=-1;
 for(var i=0;i<slots.length;i++){var candidate=byId(slots[i]);if(!Number(val(candidate,'has_clip'))){slot=candidate;index=i;break;}}
 if(!slot)throw new Error('No empty Session clip slot');
 var record={error:'Clip creation pending; inspect before retry'},clip=null,beforeArrangement=null;
 clipRequests[req.id]=record;
 function fail(e){record.error=String(e)+'; partial creation may remain. Inspect track '+req.trackId+', Session slot '+index+(clip?', clip '+clip.id:'')+' and Arrangement before retry.';reply(req.id,null,record.error);}
 function later(fn){var task=new Task(function(){try{guard();fn();}catch(e){fail(e);}},this);tasks.push(task);task.schedule(200);}
 function verifyNotes(c){var read=notes(c);if(read.length!==req.notes.length)throw new Error('Note count verification failed');return read;}
 function done(arrangement){var result={session:SESSION,trackId:Number(t.id),createdClip:clipInfo(clip),sessionSlot:index,noteCount:req.notes.length,arrangementClip:arrangement?clipInfo(arrangement):null,destinationBeat:req.destinationBeat===undefined?null:req.destinationBeat,verified:true};record.error=null;record.result=result;cache[req.id]=result;reply(req.id,result);}
 try{slot.call('create_clip',req.length);}catch(e){fail(e);return;}
 later(function(){
  clip=byId(ids(slot,'clip')[0]);if(!Number(val(clip,'is_midi_clip'))||notes(clip).length)throw new Error('Expected newly created empty MIDI clip');
  clip.call('add_new_notes',JSON.stringify({notes:req.notes}));
  later(function(){
   verifyNotes(clip);if(req.destinationBeat===undefined){done(null);return;}
   checkDestination();beforeArrangement=ids(t,'arrangement_clips');
   t.call('duplicate_clip_to_arrangement','id '+clip.id,req.destinationBeat);
   later(function(){var current=ids(t,'arrangement_clips'),added=[];for(var i=0;i<current.length;i++)if(beforeArrangement.indexOf(current[i])<0)added.push(current[i]);if(added.length!==1)throw new Error('Arrangement creation verification failed');var placed=byId(added[0]);if(Math.abs(Number(val(placed,'start_time'))-req.destinationBeat)>0.00001||Math.abs(Number(val(placed,'end_time'))-req.destinationBeat-req.length)>0.00001)throw new Error('Arrangement position or length verification failed');verifyNotes(placed);done(placed);});
  });
 });
}

function anything() {
 if(messagename!=='/codex')return;
 var req;try {req=JSON.parse(String(arrayfromargs(arguments)[0]));if(req.token!==TOKEN)return;refreshUI(req.op);if(!ready)throw new Error('Live device is initializing');
 if(req.expectedSession && req.expectedSession!==SESSION)throw new Error('Live connection changed; read again');
 if(cache[req.id]){reply(req.id,cache[req.id]);return;}
 var result;
 if(req.op==='status'){var t=host(),song=api('live_set');result={hostTrackId:Number(t.id),hostTrackName:val(t,'name'),tempo:val(song,'tempo'),playing:val(song,'is_playing'),bridge:'0.6.0',scope:'project',session:SESSION,currentBeat:val(song,'current_song_time'),signatureNumerator:val(song,'signature_numerator'),signatureDenominator:val(song,'signature_denominator'),loop:val(song,'loop'),loopStart:val(song,'loop_start'),loopLength:val(song,'loop_length'),canUndo:val(song,'can_undo'),canRedo:val(song,'can_redo')};}
 else if(req.op==='transport'){
  var song=api('live_set');
  if(req.action==='seek'){song.set('current_song_time',finiteBeat(req.beat));}
  else if(req.action==='stop'){stopPreview();song.call('stop_playing');}
  else if(req.action==='play'){stopPreview();song.call('start_playing');}
  else if(req.action==='preview'){
   var start=finiteBeat(req.beat),end=finiteBeat(req.endBeat);if(end<=start||end-start>256)throw new Error('Preview length must be 0..256 beats');
   if(Number(val(song,'loop')))throw new Error('Disable Arrangement loop before bounded preview');
   if(Number(val(song,'record_mode'))||Number(val(song,'session_record')))throw new Error('Disable recording before preview');
   stopPreview();song.set('back_to_arranger',0);song.set('current_song_time',start);song.call('start_playing');
   var deadline=new Date().getTime()+300000;
   preview=new Task(function(){try{if(Number(val(song,'current_song_time'))>=end||new Date().getTime()>deadline){song.call('stop_playing');stopPreview();}}catch(e){stopPreview();}},this);preview.interval=50;preview.repeat();
  }else throw new Error('Unknown transport action');
  result={action:req.action,currentBeat:val(song,'current_song_time'),playing:val(song,'is_playing')};
 }
 else if(req.op==='range'){
  var start=finiteBeat(req.startBeat),end=finiteBeat(req.endBeat);if(end<=start||end-start>256)throw new Error('Range length must be 0..256 beats');
  var clips=ids(track(req.trackId),'arrangement_clips');result={session:SESSION,startBeat:start,endBeatExclusive:end,clips:[]};
  for(var i=0;i<clips.length;i++){
   var c=byId(clips[i]),info=clipInfo(c);if(!info.isMidi||info.end<=start||info.start>=end)continue;
   var ns=notes(c),events=[],lo=Math.max(start,info.start),hi=Math.min(end,info.end),len=info.loopEnd-info.loopStart;
   if(info.looping&&!(len>0))throw new Error('Invalid clip loop');
   for(var j=0;j<ns.length;j++){
    var n=ns[j],base=Number(info.start)+Number(n.start_time)-Number(info.startMarker);
    if(info.looping){
     if(n.start_time<info.loopStart||n.start_time>=info.loopEnd)continue;
     var first=Math.ceil((lo-base)/len),last=Math.ceil((hi-base)/len)-1;
     for(var k=first;k<=last;k++)events.push({songBeat:base+k*len,note:n,repetition:k});
    }else if(base>=lo&&base<hi)events.push({songBeat:base,note:n,repetition:0});
   }
   events.sort(function(a,b){return a.songBeat-b.songBeat||a.note.note_id-b.note.note_id;});
   result.clips.push({clip:info,fingerprint:fingerprint(ns),events:events,warning:info.looping?'Editing a note affects every repetition of this clip; split or copy before editing one occurrence.':null});
  }
 }
 else if(req.op==='tracks'){var list=allTracks(),returns=ids(api('live_set'),'return_tracks'),master=ids(api('live_set'),'master_track')[0];result=[];for(var i=0;i<list.length;i++){var t=byId(list[i]);result.push({id:Number(t.id),name:val(t,'name'),kind:list[i]===master?'master':returns.indexOf(list[i])>=0?'return':'track',devices:devicesIn(t,[],0)});}}
 else if(req.op==='devices'){result={session:SESSION,trackId:req.trackId,devices:devicesIn(track(req.trackId),[],0)};}
 else if(req.op==='parameters'){var d=byId(req.deviceId);belongs(d);var ps=ids(d,'parameters');result={session:SESSION,deviceId:req.deviceId,parameters:[]};for(var i=0;i<ps.length;i++)result.parameters.push(parameterInfo(byId(ps[i])));}
 else if(req.op==='mixer'){var t=track(req.trackId),m=byId(ids(t,'mixer_device')[0]),send=ids(m,'sends');result={session:SESSION,trackId:req.trackId,volume:parameterInfo(byId(ids(m,'volume')[0])),pan:parameterInfo(byId(ids(m,'panning')[0])),mute:Number(val(t,'mute')),solo:Number(val(t,'solo')),sends:[]};for(var i=0;i<send.length;i++)result.sends.push(parameterInfo(byId(send[i])));}
 else if(req.op==='set_parameter'){assertWrite(req);var p=parameter(req.parameterId),info=parameterInfo(p);if(!info.enabled||info.automationState!==0)throw new Error('Parameter disabled or automated');var ch=changeScalar(p,'value',req.value,req.expectedValue,info.min,info.max,info.quantized);delayedVerify(req,p,'value',ch);return;}
 else if(req.op==='set_track'){assertWrite(req);if(req.property!=='mute'&&req.property!=='solo')throw new Error('Unsupported track property');var t=track(req.trackId);if(ids(api('live_set'),'master_track').indexOf(Number(t.id))>=0)throw new Error('Master mute/solo is unsupported');var ch=changeScalar(t,req.property,req.value,req.expectedValue,0,1,true);delayedVerify(req,t,req.property,ch);return;}
 else if(req.op==='set_song'){assertWrite(req);var song=api('live_set'),bounds={tempo:[20,999,false],signature_numerator:[1,99,true],signature_denominator:[1,16,true]},b=bounds[req.property];if(!b)throw new Error('Unsupported song property');if(req.property==='signature_denominator'&&[1,2,4,8,16].indexOf(req.value)<0)throw new Error('Invalid denominator');if(req.property==='tempo'){var mp=api('live_set master_track mixer_device song_tempo');if(Number(val(mp,'automation_state'))!==0)throw new Error('Tempo is automated');}var ch=changeScalar(song,req.property,req.value,req.expectedValue,b[0],b[1],b[2]);delayedVerify(req,song,req.property,ch);return;}
 else if(req.op==='clips'){var t=track(req.trackId),a=ids(t,'arrangement_clips');result={trackId:Number(t.id),arrangement:[],session:[]};for(var i=0;i<a.length;i++)result.arrangement.push(clipInfo(byId(a[i])));var slots=ids(t,'clip_slots');for(var i=0;i<slots.length;i++){var s=byId(slots[i]);result.session.push({slot:i,slotId:Number(s.id),clip:Number(val(s,'has_clip'))?clipInfo(byId(ids(s,'clip')[0])):null});}}
 else if(req.op==='notes'){var c=checkClip(req.clipId),ns=notes(c);result={session:SESSION,trackId:Number(clipTrack(req.clipId).id),clip:clipInfo(c),notes:ns,fingerprint:fingerprint(ns)};}
 else if(req.op==='pitches'){
  if(Number(val(api('live_set'),'is_playing')))throw new Error('Stop playback before editing');
  var c=checkClip(req.clipId),before=notes(c),info=clipInfo(c);if(fingerprint(before)!==req.expectedFingerprint)throw new Error('Clip changed since read; read again');
  if(!req.changes||!req.changes.length||req.changes.length>128)throw new Error('Expected 1..128 note changes');
  var updated=[],expected=[],seen={};for(var i=0;i<before.length;i++)expected.push(JSON.parse(JSON.stringify(before[i])));
  for(var j=0;j<req.changes.length;j++){var ch=req.changes[j];if(seen[ch.noteId])throw new Error('Duplicate note id');seen[ch.noteId]=true;if(ch.pitch!==Math.floor(ch.pitch)||ch.pitch<0||ch.pitch>127)throw new Error('Invalid pitch');var found=false;for(var i=0;i<expected.length;i++)if(expected[i].note_id===ch.noteId){if(expected[i].pitch!==ch.expectedPitch)throw new Error('Unexpected source pitch');expected[i].pitch=ch.pitch;updated.push(expected[i]);found=true;break;}if(!found)throw new Error('Unknown note id');}
  for(var i=0;i<updated.length;i++)for(var j=0;j<expected.length;j++){var a=updated[i],b=expected[j];if(a.note_id!==b.note_id&&a.pitch===b.pitch&&a.start_time<b.start_time+b.duration-0.000001&&b.start_time<a.start_time+a.duration-0.000001)throw new Error('Target notes would overlap');}
  c.call('apply_note_modifications',JSON.stringify({notes:updated}));
  var verify=new Task(function(){try{var after=notes(c);if(fingerprint(after)!==fingerprint(expected))throw new Error('Read-back verification failed; inspect before further editing');var rr={clip:clipInfo(c),changedNoteCount:updated.length,verified:true,beforeFingerprint:fingerprint(before),afterFingerprint:fingerprint(after)};cache[req.id]=rr;reply(req.id,rr);}catch(e){reply(req.id,null,String(e));}},this);tasks.push(verify);verify.schedule(200);return;
 }
 else if(req.op==='create_clip'){createMidiClip(req);return;}
 else if(req.op==='variation'){
 if(Number(val(api('live_set'),'is_playing')))throw new Error('Stop playback before editing');
  var c=checkClip(req.clipId),ns=notes(c),info=clipInfo(c),start=Number(info.loopStart),end=Number(info.loopEnd);if(!(end>start&&end-start<=256))throw new Error('Unsupported loop length');
  var delta=Number(req.velocityDelta);if(!isFinite(delta)||Math.abs(delta)>20)throw new Error('velocityDelta must be -20..20');
  var copy=[];for(var i=0;i<ns.length;i++){var n=ns[i];if(n.start_time<start||n.start_time>=end)continue;var x={};for(var key in n)if(key!=='note_id')x[key]=n[key];x.start_time-=start;if(!copy.length)x.velocity=Math.max(1,Math.min(127,x.velocity+delta));copy.push(x);}if(!copy.length)throw new Error('No notes in source loop');
  var slots=ids(clipTrack(req.clipId),'clip_slots'),slot=null,slotIndex=-1;for(var i=0;i<slots.length;i++){var s=byId(slots[i]);if(!Number(val(s,'has_clip'))){slot=s;slotIndex=i;break;}}if(!slot)throw new Error('No empty session slot');
  slot.call('create_clip',end-start);
  var task=new Task(function(){try{var dest=byId(ids(slot,'clip')[0]);dest.set('name','Codex Test - '+String(info.name));dest.call('add_new_notes',JSON.stringify({notes:copy}));var done=new Task(function(){try{var read=notes(dest);if(read.length!==copy.length)throw new Error('Note count verification failed');var rr={sourceClipId:Number(c.id),createdClip:clipInfo(dest),sessionSlot:slotIndex,noteCount:read.length,firstNote:read[0],velocityDelta:delta};cache[req.id]=rr;reply(req.id,rr);}catch(e){reply(req.id,null,String(e));}},this);tasks.push(done);done.schedule(200);}catch(e){reply(req.id,null,String(e));}},this);tasks.push(task);task.schedule(200);return;
 }
 else throw new Error('Unknown operation');
 reply(req.id,result);
 }catch(e){reply(req?req.id:'unknown',null,String(e));}
}
