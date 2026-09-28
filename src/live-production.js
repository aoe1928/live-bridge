// Concatenated into the frozen live-api.js by build.cjs (Max ES5 runtime).
var productionRequests = {};
function xHash(value){var s=JSON.stringify(value),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return String(h>>>0);}
function xSame(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function xEqual(a,b){return typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<0.00001:a===b;}
function xCopy(a){return JSON.parse(JSON.stringify(a));}
function xGuard(req){assertWrite(req);var s=api('live_set');if(Number(val(s,'record_mode'))||Number(val(s,'session_record')))throw new Error('Disable recording before editing');}
function xNumber(v,lo,hi,integer){if(typeof v!=='number'||!isFinite(v)||v<lo||v>hi||(integer&&Math.floor(v)!==v))throw new Error('Invalid numeric value');return v;}
function xName(v){if(typeof v!=='string'||!v.replace(/\s/g,'').length||v.length>128||/[\x00-\x1f\x7f]/.test(v))throw new Error('Invalid name');return v;}
function xList(v,min,max){if(!(v instanceof Array)||v.length<min||v.length>max)throw new Error('Invalid list length');return v;}
function xUnique(v){var seen={};for(var i=0;i<v.length;i++){xNumber(v[i],1,2147483647,true);if(seen[v[i]])throw new Error('Duplicate ID');seen[v[i]]=true;}return v;}
function xTrack(id){var t=track(id);if(Number(val(t,'is_frozen')))throw new Error('Track is frozen');return t;}
function xFinish(req,r){r.session=SESSION;r.verified=true;productionRequests[req.id]={result:r};cache[req.id]=r;reply(req.id,r);}
function xFail(req,e){var error=String(e)+'; operation may be partially applied. Read current state before any retry; no automatic undo.';productionRequests[req.id]={error:error};reply(req.id,null,error);}
function xLater(req,fn){var task=new Task(function(){try{if(req.expectedSession!==SESSION)throw new Error('Session changed during operation');fn();}catch(e){xFail(req,e);}},this);tasks.push(task);task.schedule(200);}
function xFingerprint(state,expected){if(state.fingerprint!==expected)throw new Error('State changed; read again');}
function xDict(raw){if(Array.isArray(raw)&&raw[0]==='dictionary')return JSON.parse(new Dict(raw[1]).stringify());if(Array.isArray(raw))raw=raw.length===1?raw[0]:raw.join(' ');if(typeof raw==='object')return raw;return JSON.parse(String(raw));}

function xBinding(t,key,value,expected){
 var current=val(t,key);if(!xEqual(current,expected))throw new Error('Value changed for '+key+' on '+t.id+'; read again');
 if(key==='value'){var info=parameterInfo(t);if(!info.enabled||info.automationState!==0)throw new Error('Parameter disabled or automated');xNumber(value,info.min,info.max,info.quantized);}
 else if(key==='name')xName(value);
 else if(key==='color_index')xNumber(value,0,69,true);
 else xNumber(value,0,1,true);
 return {object:t,id:Number(t.id),key:key,before:current,value:value};
}
function xApply(req,bindings,extraVerify){
 var seen={};for(var i=0;i<bindings.length;i++){var key=bindings[i].id+':'+bindings[i].key;if(seen[key])throw new Error('Duplicate write target');seen[key]=true;}
 var applied=[];
 try{for(var j=0;j<bindings.length;j++){xGuard(req);var b=bindings[j];if(!xEqual(val(b.object,b.key),b.before))throw new Error('Value changed during batch');b.object.set(b.key,b.value);applied.push({id:b.id,property:b.key,before:b.before,requested:b.value});}}
 catch(e){throw new Error(String(e)+'; completed writes: '+JSON.stringify(applied));}
 xLater(req,function(){for(var i=0;i<bindings.length;i++){var b=bindings[i];if(!xEqual(val(b.object,b.key),b.value))throw new Error('Read-back differs at '+b.id+':'+b.key);}if(extraVerify)extraVerify();xFinish(req,{changes:applied});});
}
function xBatch(req){
 xGuard(req);xList(req.changes,1,128);var bindings=[],song=api('live_set'),returns=ids(song,'return_tracks'),master=ids(song,'master_track')[0];
 for(var i=0;i<req.changes.length;i++){
  var ch=req.changes[i],t=xTrack(ch.trackId),property=ch.property,p;
  if(['volume','pan','send'].indexOf(property)>=0){var m=byId(ids(t,'mixer_device')[0]);
   if(property==='send'){var n=returns.indexOf(ch.returnTrackId);if(n<0)throw new Error('Return track no longer exists');var sends=ids(m,'sends');if(!sends[n])throw new Error('Send unavailable');p=byId(sends[n]);}
   else p=byId(ids(m,property==='pan'?'panning':'volume')[0]);
   bindings.push(xBinding(p,'value',ch.value,ch.expectedValue));
  }else{if(['name','colorIndex','mute','solo'].indexOf(property)<0)throw new Error('Unsupported property');if(Number(t.id)===master&&(property==='mute'||property==='solo'))throw new Error('Master mute/solo unsupported');bindings.push(xBinding(t,property==='colorIndex'?'color_index':property,ch.value,ch.expectedValue));}
 }
 xApply(req,bindings,function(){if(!xSame(returns,ids(song,'return_tracks')))throw new Error('Return order changed during batch');});
}
function xRouting(id){
 var t=track(id),song=api('live_set'),master=ids(song,'master_track')[0],normal=ids(song,'tracks').indexOf(id)>=0,result={session:SESSION,trackId:id,routes:{}};
 if(id===master)throw new Error('Master routing is not exposed by this API');
 var keys=normal&&!Number(val(t,'is_foldable'))?['input_routing_type','input_routing_channel','output_routing_type','output_routing_channel']:['output_routing_type','output_routing_channel'];
 for(var i=0;i<keys.length;i++){var k=keys[i],available='available_'+k+'s',current=xDict(t.get(k)),options=xDict(t.get(available));result.routes[k]={current:current,available:options[available]||[]};}
 return result;
}
function xSetRouting(req){
 xGuard(req);var t=xTrack(req.trackId),before=xRouting(req.trackId),route=before.routes[req.property];
 if(!route)throw new Error('Routing property unavailable');if(route.current.identifier!==req.expectedIdentifier)throw new Error('Routing changed; read again');
 var choice=null;for(var i=0;i<route.available.length;i++)if(route.available[i].identifier===req.identifier)choice=route.available[i];if(!choice)throw new Error('Routing choice unavailable');
 // LOM dictionary properties accept serialized dictionary values.
 t.set(req.property,JSON.stringify(choice));
 xLater(req,function(){var after=xRouting(req.trackId);if(after.routes[req.property].current.identifier!==req.identifier)throw new Error('Routing read-back differs');xFinish(req,{before:before,after:after});});
}
function xTrackStructure(req){
 xGuard(req);var song=api('live_set'),normal=ids(song,'tracks'),returns=ids(song,'return_tracks'),t=xTrack(req.trackId),isReturn=returns.indexOf(req.trackId)>=0,index=isReturn?returns.indexOf(req.trackId):normal.indexOf(req.trackId);
 if(index<0)throw new Error('Master cannot be duplicated or deleted');
 if(!xSame(normal,req.expectedTrackIds)||!xSame(returns,req.expectedReturnTrackIds)||val(t,'name')!==req.expectedName)throw new Error('Tracks changed; read status/tracks again');
 if(Number(val(t,'is_foldable')))throw new Error('Group track structure changes are not supported');
 if(Number(host().id)===req.trackId)throw new Error('Cannot duplicate/delete the Live Bridge host');
 var ds=devicesIn(t,[],0);for(var d=0;d<ds.length;d++)if(/live bridge/i.test(ds[d].name))throw new Error('Track contains a Live Bridge device');
 var duplicate=req.op==='x_track_duplicate';if(duplicate&&isReturn)throw new Error('Return duplication is not exposed by Song API');
 if(!duplicate&&!isReturn&&normal.length<=1)throw new Error('Cannot delete the last normal track');
 var parents=[];for(var i=0;i<normal.length;i++)parents.push(ids(byId(normal[i]),'group_track')[0]||0);
 var before={trackIds:normal,returnTrackIds:returns,trackId:req.trackId,name:val(t,'name'),devices:ds,arrangementClipIds:ids(t,'arrangement_clips')};
 song.call(duplicate?'duplicate_track':isReturn?'delete_return_track':'delete_track',index);
 xLater(req,function(){var after=ids(song,'tracks'),afterReturns=ids(song,'return_tracks'),list=isReturn?afterReturns:after,original=isReturn?returns:normal,expected=original.slice(),newId=null;
  if(duplicate){if(list.length!==original.length+1)throw new Error('Duplicate count differs');newId=list[index+1];if(original.indexOf(newId)>=0)throw new Error('New track identity missing');expected.splice(index+1,0,newId);if((ids(byId(newId),'group_track')[0]||0)!==parents[index])throw new Error('Duplicate group differs');}
  else expected.splice(index,1);
  if(!xSame(list,expected)||!xSame(isReturn?after:afterReturns,isReturn?normal:returns))throw new Error('Track order verification failed');
  for(var j=0;j<normal.length;j++)if(duplicate||normal[j]!==req.trackId)if((ids(byId(normal[j]),'group_track')[0]||0)!==parents[j])throw new Error('Existing group membership changed');
  xFinish(req,{before:before,trackId:duplicate?newId:req.trackId,action:duplicate?'duplicate':'delete',trackIds:after,returnTrackIds:afterReturns});
 });
}

function xNoteValidate(n){
 var ranges={pitch:[0,127,true],start_time:[0,1576800,false],duration:[0.0000001,1576800,false],velocity:[0,127,false],mute:[0,1,true],probability:[0,1,false],velocity_deviation:[-127,127,false],release_velocity:[0,127,false]};
 for(var k in ranges)if(n[k]!==undefined)xNumber(n[k],ranges[k][0],ranges[k][1],ranges[k][2]);
 if(n.pitch===undefined||n.start_time===undefined||n.duration===undefined)throw new Error('Incomplete note');
}
function xNoteMatches(a,b){for(var k in b)if(k!=='note_id'&&!xEqual(k==='mute'?Number(a[k]):a[k],k==='mute'?Number(b[k]):b[k]))return false;return true;}
function xNotes(req){
 xGuard(req);var c=checkClip(req.clipId);xTrack(Number(clipTrack(req.clipId).id));var before=notes(c);if(fingerprint(before)!==req.expectedFingerprint)throw new Error('Notes changed; read again');
 var expected=xCopy(before),changed=[],newNotes=[],remove=[],seen={},i,j;
 if(req.op==='x_notes_update'){
  xList(req.changes,1,128);
  for(i=0;i<req.changes.length;i++){var ch=req.changes[i];if(seen[ch.noteId])throw new Error('Duplicate note ID');seen[ch.noteId]=true;var found=null;for(j=0;j<expected.length;j++)if(expected[j].note_id===ch.noteId)found=expected[j];if(!found)throw new Error('Unknown note ID');var edits=0;
   for(var k in ch)if(k!=='noteId'){if(['pitch','start_time','duration','velocity','mute','probability','velocity_deviation','release_velocity'].indexOf(k)<0)throw new Error('Unsupported note field');found[k]=ch[k];edits++;}if(!edits)throw new Error('Empty note update');xNoteValidate(found);changed.push(found);
  }
 }else if(req.op==='x_notes_add'){
  xList(req.notes,1,128);for(i=0;i<req.notes.length;i++){var n=xCopy(req.notes[i]);xNoteValidate(n);if(n.note_id!==undefined)throw new Error('New notes cannot specify ID');newNotes.push(n);}expected=expected.concat(newNotes);changed=newNotes;
 }else{remove=xUnique(xList(req.noteIds,1,128));for(i=0;i<remove.length;i++){var exists=false;for(j=0;j<before.length;j++)if(before[j].note_id===remove[i])exists=true;if(!exists)throw new Error('Unknown note ID');}expected=expected.filter(function(n){return remove.indexOf(n.note_id)<0;});}
 for(i=0;i<changed.length;i++)for(j=0;j<expected.length;j++){var a=changed[i],b=expected[j];if(a!==b&&!(a.note_id!==undefined&&a.note_id===b.note_id)&&a.pitch===b.pitch&&a.start_time<b.start_time+b.duration-0.000001&&b.start_time<a.start_time+a.duration-0.000001)throw new Error('Changed notes overlap same pitch');}
 if(req.op==='x_notes_update')c.call('apply_note_modifications',JSON.stringify({notes:changed}));
 else if(req.op==='x_notes_add')c.call('add_new_notes',JSON.stringify({notes:newNotes}));
 else c.call('remove_notes_by_id',JSON.stringify({note_ids:remove}));
 xLater(req,function(){var after=notes(c),oldIds=before.map(function(n){return n.note_id;}),added=[];
  if(after.length!==expected.length)throw new Error('Note count differs');
  for(var i=0;i<expected.length-newNotes.length;i++){var n=expected[i],found=null;for(var j=0;j<after.length;j++)if(after[j].note_id===n.note_id)found=after[j];if(!found||!xNoteMatches(found,n))throw new Error('Note value/identity read-back differs');}
  for(var j=0;j<after.length;j++)if(oldIds.indexOf(after[j].note_id)<0)added.push(after[j]);
  if(added.length!==newNotes.length)throw new Error('Unexpected new note IDs');
  for(var i=0;i<newNotes.length;i++){var match=-1;for(var j=0;j<added.length;j++)if(xNoteMatches(added[j],newNotes[i])){match=j;break;}if(match<0)throw new Error('Added note differs');added.splice(match,1);}
  xFinish(req,{clipId:req.clipId,beforeNotes:before,noteCount:after.length,afterFingerprint:fingerprint(after)});
 });
}

function xClip(id){clipTrack(id);var c=byId(id),midi=Number(val(c,'is_midi_clip')),s={session:SESSION,clipId:id,name:val(c,'name'),colorIndex:Number(val(c,'color_index')),loopStart:Number(val(c,'loop_start')),loopEnd:Number(val(c,'loop_end')),startMarker:Number(val(c,'start_marker')),endMarker:Number(val(c,'end_marker')),looping:Number(val(c,'looping')),muted:Number(val(c,'muted')),isMidi:midi,timingUnit:midi||Number(val(c,'warping'))?'beats':'seconds'};s.fingerprint=xHash(s);return s;}
function xClipSet(req){
 xGuard(req);xTrack(Number(clipTrack(req.clipId).id));var c=byId(req.clipId),before=xClip(req.clipId),desired=xCopy(before),map={name:'name',colorIndex:'color_index',loopStart:'loop_start',loopEnd:'loop_end',startMarker:'start_marker',endMarker:'end_marker',looping:'looping',muted:'muted'},count=0;
 xFingerprint(before,req.expectedFingerprint);
 for(var k in req.settings){if(!map[k])throw new Error('Unsupported clip property');count++;var v=req.settings[k];if(k==='name')xName(v);else if(k==='colorIndex')xNumber(v,0,69,true);else if(k==='looping'||k==='muted')xNumber(v,0,1,true);else xNumber(v,0,1576800,false);desired[k]=v;}
 if(!count)throw new Error('No clip settings');if(desired.loopStart>=desired.loopEnd||desired.startMarker>=desired.endMarker)throw new Error('Invalid loop/marker range');if(desired.timingUnit==='seconds'&&desired.looping)throw new Error('Unwarped audio cannot loop');
 function range(low,high){var keys=desired[low]>=before[high]?[high,low]:[low,high];for(var i=0;i<keys.length;i++)if(req.settings[keys[i]]!==undefined)c.set(map[keys[i]],desired[keys[i]]);}
 range('loopStart','loopEnd');range('startMarker','endMarker');for(var k in req.settings)if(['loopStart','loopEnd','startMarker','endMarker'].indexOf(k)<0)c.set(map[k],desired[k]);
 xLater(req,function(){var after=xClip(req.clipId);for(var k in map)if(!xEqual(after[k],desired[k]))throw new Error('Clip read-back differs at '+k);xFinish(req,{before:before,after:after});});
}

function xScenes(){var list=ids(api('live_set'),'scenes'),rows=[];for(var i=0;i<list.length;i++){var s=byId(list[i]),slots=ids(s,'clip_slots'),clips=[];for(var j=0;j<slots.length;j++)clips.push(ids(byId(slots[j]),'clip')[0]||0);rows.push({id:list[i],name:val(s,'name'),colorIndex:Number(val(s,'color_index')),clipIds:clips});}return {session:SESSION,scenes:rows,fingerprint:xHash(rows)};}
function xScene(req){
 xGuard(req);var before=xScenes();xFingerprint(before,req.expectedFingerprint);var rows=before.scenes,list=rows.map(function(s){return s.id;}),index=list.indexOf(req.sceneId),song=api('live_set'),action=req.action;
 if(['create','duplicate','delete','update'].indexOf(action)<0)throw new Error('Invalid scene action');
 if(action!=='create'&&index<0)throw new Error('Scene not in Set');if(action==='create'&&req.sceneId!==undefined)throw new Error('create does not take sceneId');
 if((action==='delete'||action==='duplicate')&&(req.name!==undefined||req.colorIndex!==undefined))throw new Error('name/color only supported on create/update');
 if(req.name!==undefined)xName(req.name);if(req.colorIndex!==undefined)xNumber(req.colorIndex,0,69,true);
 if(action==='delete'&&list.length<=1)throw new Error('Cannot delete last scene');
 if(action==='update'&&req.name===undefined&&req.colorIndex===undefined)throw new Error('No scene settings');
 if(action==='update'){var s=byId(req.sceneId);if(req.name!==undefined)s.set('name',req.name);if(req.colorIndex!==undefined)s.set('color_index',req.colorIndex);}
 else song.call(action==='create'?'create_scene':action==='delete'?'delete_scene':'duplicate_scene',action==='create'?-1:index);
 xLater(req,function(){var after=xScenes(),actual=after.scenes.map(function(s){return s.id;}),expected=list.slice(),newId=req.sceneId;
  if(action==='create'||action==='duplicate'){var at=action==='create'?list.length:index+1;newId=actual[at];if(list.indexOf(newId)>=0||!newId)throw new Error('Missing new scene ID');expected.splice(at,0,newId);}
  if(action==='delete')expected.splice(index,1);if(!xSame(expected,actual))throw new Error('Scene order differs');
  for(var i=0;i<rows.length;i++)if(action!=='delete'||rows[i].id!==req.sceneId){var found=after.scenes.filter(function(s){return s.id===rows[i].id;})[0];if(!xSame(found.clipIds,rows[i].clipIds))throw new Error('Existing scene clips changed');}
  if(action==='create'&&(req.name!==undefined||req.colorIndex!==undefined)){xGuard(req);var s=byId(newId);if(req.name!==undefined)s.set('name',req.name);if(req.colorIndex!==undefined)s.set('color_index',req.colorIndex);xLater(req,done);}else done();
  function done(){var final=xScenes();if(action==='create'||action==='update'){var s=byId(newId);if(req.name!==undefined&&val(s,'name')!==req.name||req.colorIndex!==undefined&&Number(val(s,'color_index'))!==req.colorIndex)throw new Error('Scene settings differ');}xFinish(req,{before:before,after:final,sceneId:newId,action:action});}
 });
}
function xLocators(){var list=ids(api('live_set'),'cue_points'),rows=[];for(var i=0;i<list.length;i++){var c=byId(list[i]);rows.push({id:list[i],name:val(c,'name'),beat:Number(val(c,'time'))});}return {session:SESSION,locators:rows,fingerprint:xHash(rows)};}
function xLocator(req){
 xGuard(req);var before=xLocators();xFingerprint(before,req.expectedFingerprint);var action=req.action,song=api('live_set'),oldBeat=Number(val(song,'current_song_time')),target=null;
 for(var i=0;i<before.locators.length;i++)if(before.locators[i].id===req.locatorId)target=before.locators[i];
 if(['create','rename','delete'].indexOf(action)<0)throw new Error('Invalid locator action');
 if(action!=='create'&&!target)throw new Error('Locator not in Set');
 if(action==='create'){if(req.locatorId!==undefined)throw new Error('create does not take locatorId');xNumber(req.beat,0,1576800,false);xName(req.name);for(var i=0;i<before.locators.length;i++)if(Math.abs(before.locators[i].beat-req.beat)<0.00001)throw new Error('Locator already exists at beat');}
 else if(req.beat!==undefined)throw new Error('Locator time is read-only; create a new locator then delete the old one');
 if(action==='rename')xName(req.name);if(action==='delete'&&req.name!==undefined)throw new Error('delete does not take name');
 if(action==='rename'){byId(req.locatorId).set('name',req.name);xLater(req,function(){var after=xLocators();if(val(byId(req.locatorId),'name')!==req.name)throw new Error('Locator name differs');xFinish(req,{before:before,after:after});});return;}
 var at=action==='create'?req.beat:target.beat;
 function restorePosition(){if(Math.abs(Number(val(song,'current_song_time'))-at)<0.00001&&!Number(val(song,'is_playing')))song.set('current_song_time',oldBeat);}
 song.set('current_song_time',at);
 xLater(req,function(){try{xGuard(req);xFingerprint(xLocators(),req.expectedFingerprint);if(Math.abs(Number(val(song,'current_song_time'))-at)>0.00001)throw new Error('Playhead changed before locator operation');song.call('set_or_delete_cue');}catch(e){restorePosition();throw e;}
  xLater(req,function(){try{
   var after=xLocators(),remaining=after.locators.filter(function(c){return before.locators.map(function(b){return b.id;}).indexOf(c.id)<0;}),newId=null;
   if(action==='create'){if(after.locators.length!==before.locators.length+1||remaining.length!==1||Math.abs(remaining[0].beat-at)>0.00001)throw new Error('Locator creation differs');newId=remaining[0].id;xGuard(req);byId(newId).set('name',req.name);}
   else if(after.locators.length!==before.locators.length-1||after.locators.some(function(c){return c.id===req.locatorId;}))throw new Error('Locator deletion differs');
   for(var i=0;i<before.locators.length;i++)if(action==='create'||before.locators[i].id!==req.locatorId){var original=before.locators[i],found=after.locators.filter(function(c){return c.id===original.id;})[0];if(!xSame(found,original))throw new Error('Other locator changed');}
   xLater(req,function(){if(newId&&val(byId(newId),'name')!==req.name)throw new Error('Locator name differs');xFinish(req,{before:before,after:xLocators(),locatorId:newId||req.locatorId});});
  }finally{restorePosition();}});
 });
}

function xMix(trackIds){
 xUnique(xList(trackIds,1,64));var rows=[],song=api('live_set'),returns=ids(song,'return_tracks'),master=ids(song,'master_track')[0],topology=[];
 for(var i=0;i<trackIds.length;i++){
  var t=track(trackIds[i]),m=byId(ids(t,'mixer_device')[0]),ps=[],seen={},devices=devicesIn(t,[],0),sends=ids(m,'sends');
  function push(pid,role,deviceId){if(seen[pid])return;seen[pid]=true;var p=parameterInfo(byId(pid));p.role=role;p.deviceId=deviceId||0;ps.push(p);}
  push(ids(m,'volume')[0],'volume');push(ids(m,'panning')[0],'pan');for(var j=0;j<sends.length;j++)push(sends[j],'send:'+returns[j]);
  for(var j=0;j<devices.length;j++){var pars=ids(byId(devices[j].id),'parameters');for(var k=0;k<pars.length;k++)push(pars[k],'device',devices[j].id);}
  rows.push({id:Number(t.id),name:val(t,'name'),mute:Number(t.id)===master?null:Number(val(t,'mute')),solo:Number(t.id)===master?null:Number(val(t,'solo')),parameters:ps});
  topology.push([Number(t.id),devices.map(function(d){return [d.id,d.parentId,d.className];}),ps.map(function(p){return [p.id,p.role,p.deviceId,p.min,p.max,p.quantized];})]);
 }
 return {session:SESSION,tracks:rows,topology:JSON.stringify([returns,topology]),topologyFingerprint:xHash([returns,topology]),fingerprint:xHash([SESSION,rows,topology])};
}
function xMixRestore(req){
 xGuard(req);var current=xMix(req.trackIds);xFingerprint(current,req.expectedFingerprint);if(current.topologyFingerprint!==req.expectedTopologyFingerprint)throw new Error('Mix topology changed');
 var bindings=[],lookup={},tracks={};for(var i=0;i<current.tracks.length;i++){var t=current.tracks[i];xTrack(t.id);tracks[t.id]=t;for(var j=0;j<t.parameters.length;j++)lookup[t.parameters[j].id]=t.parameters[j];}
 xList(req.values,0,4096);
 for(var i=0;i<req.values.length;i++){var ch=req.values[i];if(ch.property==='value'){var p=lookup[ch.id];if(!p)throw new Error('Parameter outside snapshot tracks');bindings.push(xBinding(byId(ch.id),'value',ch.value,p.value));}
  else{var t=tracks[ch.id];if(!t||['mute','solo'].indexOf(ch.property)<0||t[ch.property]===null)throw new Error('Invalid snapshot track value');bindings.push(xBinding(track(ch.id),ch.property,ch.value,t[ch.property]));}}
 var desired=xCopy(current.tracks);
 for(var i=0;i<req.values.length;i++){var ch=req.values[i];for(var j=0;j<desired.length;j++){if(ch.property==='value'){for(var k=0;k<desired[j].parameters.length;k++)if(desired[j].parameters[k].id===ch.id)desired[j].parameters[k].value=ch.value;}else if(desired[j].id===ch.id)desired[j][ch.property]=ch.value;}}
 xApply(req,bindings,function(){var after=xMix(req.trackIds);if(after.topology!==current.topology)throw new Error('Mix topology changed during restore');for(var i=0;i<desired.length;i++){var a=after.tracks[i],b=desired[i];if(a.mute!==b.mute||a.solo!==b.solo)throw new Error('Other mixer switches changed during restore');for(var j=0;j<b.parameters.length;j++)if(!xEqual(a.parameters[j].value,b.parameters[j].value))throw new Error('Other parameter changed during restore');}});
}
function extendedDispatch(req){
 var read={x_routing_read:function(){return xRouting(req.trackId);},x_clip_read:function(){return xClip(req.clipId);},x_scenes_read:xScenes,x_locators_read:xLocators,x_mix_read:function(){return xMix(req.trackIds);}};
 if(read[req.op]){reply(req.id,read[req.op]());return true;}
 var write={x_batch:xBatch,x_routing_set:xSetRouting,x_track_duplicate:xTrackStructure,x_track_delete:xTrackStructure,x_notes_update:xNotes,x_notes_add:xNotes,x_notes_delete:xNotes,x_clip_set:xClipSet,x_scene:xScene,x_locator:xLocator,x_mix_restore:xMixRestore};
 if(!write[req.op])return false;
 if(productionRequests[req.id]){var old=productionRequests[req.id];reply(req.id,old.result||null,old.error||null);return true;}
 productionRequests[req.id]={error:'Operation pending; inspect current state before retry'};
 try{write[req.op](req);}catch(e){xFail(req,e);}return true;
}
