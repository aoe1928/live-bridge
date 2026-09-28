// The MCP host plans and verifies. A desktop-capable agent executes one UI action.
// Never turn a successful key dispatch into a claim that Live moved a track.
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
function topology(s){return s.tracks.map(t=>[t.id,t.parentId,t.isGroup]);}
function fingerprint(s){return crypto.createHash('sha256').update(JSON.stringify([s.session,topology(s)])).digest('hex');}
function stopped(s){if(s.playing||s.recording)throw Error('Stop playback and recording before moving tracks');}
function platformAction(platform,direction){
 if(!['win32','darwin'].includes(platform))throw Error('Track movement supports Windows/macOS desktop agents only');
 return {platform,view:'Arrangement',modifier:platform==='darwin'?'Command':'Control',key:direction==='up'?'ArrowUp':'ArrowDown',pressCount:1,executor:'desktop_agent',requiresForegroundLive:true,requiresTrackHeaderFocus:true,validation:platform==='darwin'?'macOS hardware untested':'Windows Live 11 single/group shortcut tested'};
}
function planMove(s,a,platform=process.platform){
 const action=platformAction(platform,a.direction);stopped(s);
 if(a.expectedSession!==s.session||a.expectedOrderFingerprint!==fingerprint(s))throw Error('Session or track order changed; read track order again');
 if(!['up','down'].includes(a.direction))throw Error('Invalid direction');
 const tracks=s.tracks,seen=new Set(),stack=[],roots=[];
 for(const t of tracks){
  if(!Number.isInteger(t.id)||t.id<1||seen.has(t.id)||!Number.isInteger(t.parentId)||t.parentId<0||![0,1].includes(t.isGroup))throw Error('Invalid track topology');
  seen.add(t.id);
  while(stack.length&&stack.at(-1)!==t.parentId)stack.pop();
  if(t.parentId&&!stack.length)throw Error('Invalid or noncontiguous group topology');
  if(!t.parentId)roots.push({id:t.id,rows:[]});
  roots.at(-1).rows.push(t);
  if(t.isGroup)stack.push(t.id);
 }
 const index=roots.findIndex(b=>b.id===a.trackId),target=tracks.find(t=>t.id===a.trackId);
 if(!target)throw Error('Only normal/group tracks can move; Return/Master are unsupported');
 if(index<0)throw Error('Moving a group child is not supported in this release');
 const next=index+(a.direction==='up'?-1:1);
 if(next<0||next>=roots.length)throw Error('Track is already at this boundary');
 const block=roots[index],neighbor=roots[next];
 if(neighbor.rows[0].isGroup)throw Error('Moving across another group is not validated; use a different move');
 if(block.rows.slice(1).some(t=>t.isGroup))throw Error('Nested group movement is not validated');
 if(block.rows.some(t=>t.frozen)||neighbor.rows.some(t=>t.frozen))throw Error('Frozen track movement is not validated');
 [roots[index],roots[next]]=[roots[next],roots[index]];
 return {session:s.session,trackId:target.id,trackName:target.name,fromIndex:tracks.indexOf(target),neighborId:neighbor.id,neighborName:neighbor.rows[0].name,before:topology(s),after:topology({tracks:roots.flatMap(b=>b.rows)}),beforeFingerprint:fingerprint(s),action};
}
class MoveStore{
 constructor(directory,request,{platform=process.platform,now=()=>Date.now()}={}){this.directory=directory;this.request=request;this.platform=platform;this.now=now;}
 file(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid move ID');return path.join(this.directory,id+'.json');}
 save(j){fs.mkdirSync(this.directory,{recursive:true});const f=this.file(j.moveId);fs.writeFileSync(f+'.tmp',JSON.stringify(j,null,2),{mode:0o600});fs.renameSync(f+'.tmp',f);}
 load(id){return JSON.parse(fs.readFileSync(this.file(id),'utf8'));}
 async read(){const s=await this.request('track_order');return {...s,orderFingerprint:fingerprint(s),platform:this.platform,execution:'desktop_agent_required'};}
 async prepare(a){
  if(fs.existsSync(this.directory))for(const f of fs.readdirSync(this.directory).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f))){const j=JSON.parse(fs.readFileSync(path.join(this.directory,f)));if(['prepared','armed'].includes(j.state)&&j.expiresAt>this.now())throw Error('A track move is pending; verify it before preparing another');}
  const s=await this.request('track_order'),plan=planMove(s,a,this.platform),j={moveId:crypto.randomUUID(),state:'prepared',expiresAt:this.now()+120000,plan};this.save(j);
  return {moveId:j.moveId,state:j.state,verified:false,expiresAt:j.expiresAt,trackId:plan.trackId,trackName:plan.trackName,trackIndex:plan.fromIndex,neighborId:plan.neighborId,neighborName:plan.neighborName,next:'Use desktop tools on THIS computer to show Arrangement and single-click ONLY this track header, using fresh UI state. Do not press the move key yet. Then call live_arm_track_move. If desktop tools are unavailable, stop; preparation has not moved anything.'};
 }
 async arm(id){
  const j=this.load(id);if(j.state!=='prepared')throw Error('Move is not prepared; do not resend any key');
  if(this.now()>j.expiresAt)throw Error('Preparation expired; verify current state before preparing again');
  const s=await this.request('track_order');stopped(s);
  if(fingerprint(s)!==j.plan.beforeFingerprint)throw Error('Session/order/group membership changed');
  if(!s.arrangementVisible||s.selectedTrackId!==j.plan.trackId||s.selectedTrackIds.length!==1||s.selectedTrackIds[0]!==j.plan.trackId)throw Error('Select ONLY the target track header in Arrangement, then arm again');
  j.state='armed';j.expiresAt=this.now()+15000;this.save(j);
  return {moveId:id,state:'requires_ui_action',verified:false,expiresAt:j.expiresAt,action:j.plan.action,next:'Immediately inspect the Live window: correct single track header focused, playback/recording stopped, no modal or text editor. Send the specified chord ONCE, then call live_verify_track_move. Never retry a key after timeout/error. If deadline passes before dispatch, do not send it; verify first. This tool has not sent keys or moved the track.'};
 }
 async verify(id){
  const j=this.load(id);if(['verified','unchanged','conflict'].includes(j.state))return {...j.result,cached:true};
  const s=await this.request('track_order'),actual=topology(s),sameSession=s.session===j.plan.session;
  const matches=sameSession&&JSON.stringify(actual)===JSON.stringify(j.plan.after);
  const unchanged=sameSession&&JSON.stringify(actual)===JSON.stringify(j.plan.before);
  j.state=matches&&j.state==='armed'?'verified':unchanged?'unchanged':'conflict';
  j.result={moveId:id,state:j.state,verified:j.state==='verified',session:s.session,orderFingerprint:fingerprint(s),tracks:s.tracks,late:this.now()>j.expiresAt,playing:s.playing,recording:s.recording,next:j.state==='verified'?'Observed requested order and unchanged group membership. Read fresh order before another move.':'Stop. No automatic retry or undo. Inspect current order and UI before preparing another move.'};this.save(j);return j.result;
 }
}
module.exports={MoveStore,planMove,platformAction,fingerprint,topology};
