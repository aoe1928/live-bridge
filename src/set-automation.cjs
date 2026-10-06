// Lossless, offline Arrangement envelope editing. No Live transport or network calls.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const MAX=128*1024*1024;
function fail(message){throw Error(message);}
function decode(s){return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,v)=>v[0]==='#'?String.fromCodePoint(v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v]));}
function escape(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// Parse offsets only, never reserialize the Set. Unknown tags/attributes are retained.
function parse(xml){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail('DTD/entities are not accepted');
 const root={name:'#document',children:[]},stack=[root],nodes=[];
 const re=/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[A-Za-z_][\w:.-]*(?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/?>/g;
 let m,last=0;
 while((m=re.exec(xml))){
  if(xml.slice(last,m.index).includes('<'))fail('Unsupported or malformed XML');last=re.lastIndex;
  const token=m[0];if(token.startsWith('<!')||token.startsWith('<?'))continue;
  if(token.startsWith('</')){const n=stack.pop();if(!n||n===root||n.name!==token.slice(2,-1).trim())fail('Mismatched XML');n.close=m.index;n.end=re.lastIndex;continue;}
  const name=/^<([\w:.-]+)/.exec(token)[1],attrs=Object.create(null);
  for(const a of token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){if(Object.hasOwn(attrs,a[1]))fail('Duplicate attribute');attrs[a[1]]=decode(a[2]??a[3]);}
  const n={name,attrs,start:m.index,openEnd:re.lastIndex,parent:stack.at(-1),children:[]};n.parent.children.push(n);nodes.push(n);
  if(token.endsWith('/>')){n.close=n.openEnd;n.end=n.openEnd;n.selfClosing=true;}else stack.push(n);
 }
 if(stack.length!==1||xml.slice(last).includes('<')||root.children.length!==1)fail('Incomplete XML');
 return {root:root.children[0],nodes};
}
function child(n,name){const found=n?.children.filter(c=>c.name===name)||[];if(found.length>1)fail('Ambiguous '+name);return found[0];}
function at(n,...names){for(const name of names)n=child(n,name);return n;}
function raw(doc,n){return doc.xml.slice(n.start,n.end);}
function requireNode(n,message){if(!n)fail(message);return n;}
function inside(n,parent){for(let p=n;p;p=p.parent)if(p===parent)return true;return false;}
function relative(n,parent){const parts=[];for(let p=n;p&&p!==parent;p=p.parent)parts.unshift(p.name+(p.attrs.Id!==undefined?'['+p.attrs.Id+']':''));return parts.join('/');}
function load(file,expected){
 if(!path.isAbsolute(file)||path.extname(file).toLowerCase()!=='.als')fail('Use an absolute .als path');
 if(fs.statSync(file).size>MAX)fail('Compressed Set exceeds 128 MiB');
 const bytes=fs.readFileSync(file),sha=hash(bytes);if(expected&&sha!==expected)fail('Set changed since read; read again');
 const buffer=zlib.gunzipSync(bytes,{maxOutputLength:MAX}),xml=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
 if(!Buffer.from(xml,'utf8').equals(buffer))fail('Noncanonical UTF-8 is unsupported');
 const parsed=parse(xml),r=parsed.root;
 if(r.name!=='Ableton'||!String(r.attrs.MinorVersion||'').startsWith('11.'))fail('Only inspected Live 11 XML schema is enabled; Live 12 is not verified');
 const song=requireNode(child(r,'LiveSet'),'Missing LiveSet'),tracksNode=requireNode(child(song,'Tracks'),'Missing tracks');
 const tracks=[...tracksNode.children,child(song,'MasterTrack')].filter(Boolean).filter(n=>['AudioTrack','MidiTrack','GroupTrack','ReturnTrack','MasterTrack'].includes(n.name));
 const doc={file,bytes,sha,xml,...parsed,tracks};
 doc.rows=tracks.map(t=>{
  const key=t.name==='MasterTrack'?'master':t.name+':'+t.attrs.Id;
  const envs=requireNode(at(t,'AutomationEnvelopes','Envelopes'),'Unsupported track envelope layout: '+key);
  const envelopes=envs.children.filter(n=>n.name==='AutomationEnvelope');
  const parameters=parsed.nodes.filter(n=>n.name==='AutomationTarget'&&inside(n,t)&&!inside(n,envs)&&!relative(n,t).includes('Clip'));
  return {key,node:t,envs,envelopes,parameters,name:at(t,'Name','EffectiveName')?.attrs.Value||key};
 });
 if(new Set(doc.rows.map(r=>r.key)).size!==doc.rows.length)fail('Duplicate track identity');
 return doc;
}
function target(doc,trackKey,targetId){
 const row=requireNode(doc.rows.find(r=>r.key===trackKey),'Unknown file trackKey');
 const ps=row.parameters.filter(p=>p.attrs.Id===targetId);if(ps.length!==1)fail('Missing or ambiguous automation target');
 const param=ps[0].parent;
 const es=row.envelopes.filter(e=>at(e,'EnvelopeTarget','PointeeId')?.attrs.Value===targetId);if(es.length>1)fail('Duplicate target envelopes');
 return {row,param,envelope:es[0],tempo:row.key==='master'&&relative(param,row.node)==='DeviceChain/Mixer/Tempo'};
}
function events(doc,envelope){
 if(!envelope)return [];
 const n=requireNode(at(envelope,'Automation','Events'),'Unsupported event container');
 return n.children.map(e=>({id:e.attrs.Id,type:e.name,attributes:{...e.attrs},xml:raw(doc,e)}));
}
function structural(doc){let s=doc.xml;for(const row of [...doc.rows].sort((a,b)=>b.envs.start-a.envs.start))s=s.slice(0,row.envs.start)+'<BRIDGE_ENVELOPES/>'+s.slice(row.envs.end);return hash(s);}
function paginate(items,a){const offset=a.offset??0,limit=a.limit??100;if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>200)fail('Invalid pagination');return {items:items.slice(offset,offset+limit),total:items.length,nextOffset:offset+limit<items.length?offset+limit:null};}
function read(a){
 const d=load(a.sourcePath,a.expectedFileSha256);
 const base={fileSha256:d.sha,creator:d.root.attrs.Creator,source:'saved-set-only',liveApplied:false,valueDomain:'saved-set-xml',valueWarning:'File values can differ from Live API values. Mixer Volume uses linear gain (1 = 0 dB), not the API normalized fader. Verify file-domain bounds per parameter.'};
 if(a.trackKey!==undefined||a.targetId!==undefined){
  const t=target(d,a.trackKey,a.targetId);
  return {...base,trackKey:t.row.key,targetId:a.targetId,parameterPath:relative(t.param,t.row.node),tempo:t.tempo,
   exists:!!t.envelope,envelopeSha256:t.envelope?hash(raw(d,t.envelope)):null,events:paginate(events(d,t.envelope),a)};
 }
 const targets=d.rows.flatMap(r=>r.parameters.map(p=>({trackKey:r.key,trackName:r.name,targetId:p.attrs.Id,parameterPath:relative(p.parent,r.node),manualValue:child(p.parent,'Manual')?.attrs.Value,
  hasEnvelope:r.envelopes.some(e=>at(e,'EnvelopeTarget','PointeeId')?.attrs.Value===p.attrs.Id)})));
 return {...base,targets:paginate(targets,a)};
}
function snapshotPath(base,id){if(!/^[a-f0-9-]{36}$/.test(id))fail('Invalid snapshotId');return path.join(base,'set-automation-snapshots',id+'.als');}
function saveSnapshot(d,base){const id=crypto.randomUUID(),file=snapshotPath(base,id);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,d.bytes,{flag:'wx',mode:0o600});return {snapshotId:id,snapshotSha256:d.sha};}
function snapshot(a,base){const d=load(a.sourcePath,a.expectedFileSha256);return {...saveSnapshot(d,base),source:'saved-set-only',trackCount:d.rows.length,liveApplied:false};}
function output(source,file,bytes,expectedSource){
 if(!path.isAbsolute(file)||path.extname(file).toLowerCase()!=='.als')fail('Output must be an absolute .als path');
 // Keep the project directory so relative media references retain their meaning.
 if(fs.realpathSync(path.dirname(source))!==fs.realpathSync(path.dirname(file)))fail('Output must be beside the source Set to preserve relative media paths');
 if(hash(fs.readFileSync(source))!==expectedSource)fail('Source changed during operation');
 let fd;try{fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{if(fd!==undefined)fs.closeSync(fd);}
 if(!fs.readFileSync(file).equals(bytes))fail('Output verification failed; inspect output before retry');
 return {outputPath:file,fileSha256:hash(bytes),verified:true,verification:'file-bytes-and-XML-only',liveApplied:false};
}
function finite(n){if(typeof n!=='number'||!Number.isFinite(n))fail('Finite number required');return n;}
function replaceAttributes(text,attrs){for(const [key,value] of Object.entries(attrs)){
 const re=new RegExp('(\\s'+key+'\\s*=\\s*)(["\\\'])([\\s\\S]*?)\\2');
 if(!re.test(text))fail('Missing event attribute '+key);
 text=text.replace(re,(_,prefix,quote)=>prefix+quote+escape(value)+quote);
 }return text;}
function edit(a,base){
 const d=load(a.sourcePath,a.expectedFileSha256),t=target(d,a.trackKey,a.targetId);
 let minimum=finite(a.minValue),maximum=finite(a.maxValue);if(minimum>=maximum)fail('Invalid saved-file parameter bounds');
 if(t.tempo){minimum=Math.max(20,minimum);maximum=Math.min(999,maximum);if(minimum>=maximum)fail('Tempo bounds must fall within 20..999 BPM');}
 if(t.envelope&&at(t.envelope,'Automation','AutomationTransformViewState','IsTransformPending')?.attrs.Value==='true')fail('Pending automation transform; resolve it in Live before offline editing');
 const old=events(d,t.envelope),seen=new Set(),changes=a.updates||[],deletions=a.deleteEventIds||[],additions=a.points||[];
 if(changes.length+deletions.length+additions.length<1||changes.length+deletions.length+additions.length>1024)fail('Use 1..1024 changes');
 if(old.some(e=>!/^\d+$/.test(e.id)||!Number.isSafeInteger(Number(e.id))||!Number.isFinite(Number(e.attributes.Time))||!Number.isFinite(Number(e.attributes.Value))))fail('Invalid stored event identity/time/value');
 if(old.some(e=>e.type!=='FloatEvent'))fail('Only continuous FloatEvent envelopes can be edited; other types can be read/restored');
 const eventMap=new Map(old.map(e=>[e.id,{...e,attributes:{...e.attributes}}]));if(eventMap.size!==old.length)fail('Duplicate event ID');
 const check=(time,value,allowNegative=false)=>{finite(time);finite(value);if((!allowNegative&&time<0)||time>1576800||value<minimum||value>maximum)fail('Event outside time/native value bounds');};
 for(const u of changes){if(seen.has(u.eventId)||!eventMap.has(u.eventId))fail('Duplicate/missing event update');seen.add(u.eventId);const e=eventMap.get(u.eventId);if(u.time===undefined&&u.value===undefined)fail('Empty update');
 const time=u.time??Number(e.attributes.Time),value=u.value??Number(e.attributes.Value);check(time,value,u.time===undefined);
 const attrs={};if(u.time!==undefined)attrs.Time=String(time);if(u.value!==undefined)attrs.Value=String(value);
 e.xml=replaceAttributes(e.xml,attrs);Object.assign(e.attributes,attrs);
 }
 for(const id of deletions){if(seen.has(id)||!eventMap.has(id))fail('Duplicate/missing event deletion');seen.add(id);if(Number(eventMap.get(id).attributes.Time)<0)fail('Do not delete the initial sentinel event');eventMap.delete(id);}
 let nextId=old.reduce((m,e)=>Math.max(m,Number(e.id)),-1);if(!Number.isSafeInteger(nextId))fail('Invalid event IDs');
 if(!t.envelope){const manual=Number(child(t.param,'Manual')?.attrs.Value);check(0,manual);eventMap.set('0',{id:'0',type:'FloatEvent',attributes:{Id:'0',Time:'-63072000',Value:String(manual)},xml:'<FloatEvent Id="0" Time="-63072000" Value="'+manual+'" />'});nextId=0;}
 for(const point of additions){check(point.time,point.value);if(nextId>=Number.MAX_SAFE_INTEGER)fail('Event ID overflow');const id=String(++nextId);eventMap.set(id,{id,type:'FloatEvent',attributes:{Id:id,Time:String(point.time),Value:String(point.value)},xml:'<FloatEvent Id="'+id+'" Time="'+point.time+'" Value="'+point.value+'" />'});}
 const ordered=[...eventMap.values()].sort((x,y)=>Number(x.attributes.Time)-Number(y.attributes.Time));
 // Existing equal-time points (step edges) keep their stable order; newly introduced collisions fail.
 for(const added of additions)if(ordered.filter(e=>Number(e.attributes.Time)===added.time).length>1)fail('New point collides with an existing time; update the existing event instead');
 for(const u of changes.filter(u=>u.time!==undefined))if(ordered.filter(e=>Number(e.attributes.Time)===u.time).length>1)fail('Moved point collides with an existing time');
 const body='\n'+ordered.map(e=>e.xml).join('\n')+'\n';let xml;
 if(t.envelope){const n=at(t.envelope,'Automation','Events');const replacement=n.selfClosing?raw(d,n).replace(/\/\s*>$/, '>')+body+'</Events>':d.xml.slice(n.start,n.openEnd)+body+d.xml.slice(n.close,n.end);xml=d.xml.slice(0,n.start)+replacement+d.xml.slice(n.end);}
 else{const maxId=t.row.envelopes.reduce((m,e)=>Math.max(m,Number(e.attrs.Id)),-1);if(!Number.isSafeInteger(maxId))fail('Invalid envelope IDs');
 const envelope='<AutomationEnvelope Id="'+(maxId+1)+'"><EnvelopeTarget><PointeeId Value="'+escape(a.targetId)+'" /></EnvelopeTarget><Automation><Events>'+body+'</Events><AutomationTransformViewState><IsTransformPending Value="false" /><TimeAndValueTransforms /></AutomationTransformViewState></Automation></AutomationEnvelope>';
 const n=t.row.envs,replacement=n.selfClosing?raw(d,n).replace(/\/\s*>$/, '>')+envelope+'</Envelopes>':d.xml.slice(n.start,n.close)+envelope+d.xml.slice(n.close,n.end);xml=d.xml.slice(0,n.start)+replacement+d.xml.slice(n.end);}
 parse(xml);
 const snap=saveSnapshot(d,base),bytes=zlib.gzipSync(Buffer.from(xml));
 const result=output(a.sourcePath,a.outputPath,bytes,d.sha),after=load(a.outputPath,result.fileSha256);
 if(structural(d)!==structural(after))fail('Non-envelope content changed; inspect output');
 const resultEvents=events(after,target(after,a.trackKey,a.targetId).envelope);
 if(JSON.stringify(resultEvents.map(e=>e.attributes))!==JSON.stringify(ordered.map(e=>e.attributes)))fail('Point readback failed');
 return {...result,...snap,eventCount:ordered.length,warning:'Saved Set copy only. Open it in Live separately; This output has not been opened or played by this tool. Existing curve attributes are preserved; new points use default interpolation.'};
}
function restore(a,base){
 const d=load(a.sourcePath,a.expectedFileSha256),s=load(snapshotPath(base,a.snapshotId),a.snapshotSha256);
 if(structural(d)!==structural(s))fail('Non-envelope content differs from snapshot; refusing to roll back unrelated changes');
 // Exact original compressed bytes, including every envelope point, curve attribute and unknown field.
 return {...output(a.sourcePath,a.outputPath,s.bytes,d.sha),restoredSnapshotId:a.snapshotId,exactOriginalFile:true};
}
function execute(op,a,base){if(op==='set_automation_read')return read(a);if(op==='set_automation_snapshot')return snapshot(a,base);if(op==='set_automation_edit')return edit(a,base);if(op==='set_automation_restore')return restore(a,base);fail('Unknown saved-Set operation');}
module.exports={execute,load,parse,structural};
