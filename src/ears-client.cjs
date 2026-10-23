// Talks to Ears capture devices (github: live-ears) over loopback UDP/OSC. Each Ears instance listens on
// 17840..17849 and replies to 17838 with the same /reply chunk envelope as the Live Bridge device.
const dgram=require('node:dgram'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'bridge-config.json'),'utf8'));
const BASE_PORT=17840,PORT_COUNT=10,REPLY_PORT=17838,PING_MS=700;
function oscStr(s){const b=Buffer.from(s+'\0');return Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);}
function decode(b){let p=0;function str(){const e=b.indexOf(0,p);if(e<0)throw Error('Invalid OSC');const v=b.toString('utf8',p,e);p=(e+4)&~3;return v;}const addr=str(),types=str(),args=[];for(const t of types.slice(1)){if(t==='s')args.push(str());else if(t==='i'){args.push(b.readInt32BE(p));p+=4;}else if(t==='f'){args.push(b.readFloatBE(p));p+=4;}else throw Error('Unsupported OSC');}return {addr,args};}
function open(){return new Promise((resolve,reject)=>{const sock=dgram.createSocket('udp4');sock.once('error',e=>reject(Error(e.code==='EADDRINUSE'?'Ears reply port 17838 is busy; another capture may be running':e.message)));sock.bind(REPLY_PORT,'127.0.0.1',()=>resolve(sock));});}
function send(sock,port,body){sock.send(Buffer.concat([oscStr('/ears'),oscStr(',s'),oscStr(JSON.stringify({token:config.token,...body}))]),port,'127.0.0.1');}
// Collect chunked /reply envelopes; calls onReply(id, {result,error}) once per completed id.
function collector(sock,onReply){const pending={};sock.on('message',(b,remote)=>{if(remote.address!=='127.0.0.1')return;try{const m=decode(b);if(m.addr!=='/reply')return;const [id,index,total,data]=m.args;const c=pending[id]=pending[id]||[];c[index]=data;if(c.filter(x=>x!==undefined).length===total){delete pending[id];onReply(id,JSON.parse(decodeURIComponent(c.join(''))));}}catch(e){}});}
async function list(){
 const sock=await open();const found=[],ids=new Set();
 collector(sock,(id,r)=>{if(ids.has(id)&&r.result)found.push(r.result);});
 for(let i=0;i<PORT_COUNT;i++){const id=crypto.randomUUID();ids.add(id);send(sock,BASE_PORT+i,{id,op:'ping'});}
 await new Promise(r=>setTimeout(r,PING_MS));sock.close();
 return found.sort((a,b)=>a.port-b.port);
}
function safeName(s){return String(s).normalize('NFC').replace(/[\/\\:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,' ').trim().slice(0,80)||'untitled';}
function stamp(){const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds());}
async function capture(a){
 const devices=await list();
 if(!devices.length)throw Error('No Ears device answered on UDP 17840-17849. Place the Ears audio effect (live-ears) at the top level of the track to capture.');
 let target;
 if(a.port!==undefined)target=devices.find(d=>d.port===a.port);
 else if(a.trackName)target=devices.find(d=>d.trackName===a.trackName)||devices.find(d=>d.trackName.toLowerCase()===String(a.trackName).toLowerCase());
 else if(devices.length===1)target=devices[0];
 if(!target)throw Error('Ears target not found. Available: '+devices.map(d=>d.port+'='+d.trackName).join(', '));
 if(target.state!=='idle')throw Error('Ears on '+target.trackName+' is busy ('+target.state+')');
 if(!target.playing)throw Error('Transport is stopped; start playback (live_transport) before capturing. Ears never starts or stops playback itself.');
 const dir=path.join(os.homedir(),'media/dtm',safeName(target.setName||'untitled'),'captures');fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,a.filename||(safeName(target.trackName).replace(/ /g,'_')+'_'+a.bars+'bars_'+stamp()+'.wav'));
 if(fs.existsSync(file))throw Error('File already exists: '+file);
 const beatsPerBar=target.signatureNumerator*4/target.signatureDenominator,expectMs=(a.bars+2)*beatsPerBar*60000/target.tempo;
 const sock=await open();const id=crypto.randomUUID();
 try{
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Ears did not finish within '+Math.round(expectMs/1000+20)+' s; check that playback kept running and that the bar boundary was reached')),expectMs+20000);
   collector(sock,(rid,r)=>{if(rid!==id)return;clearTimeout(timer);r.error?reject(Error(r.error)):resolve(r.result);});
   send(sock,target.port,{id,op:'capture',bars:a.bars,path:file});});
  let bytes=null;try{bytes=fs.statSync(file).size;}catch(e){}
  if(!bytes)throw Error('Ears reported success but no file at '+file);
  return {...result,bytes,trackId:target.trackId,setName:target.setName,analyze:'cd ~/dev/tools/edm-audio && .venv/bin/python tools/segment_analyze.py "'+file+'" --json'};
 }finally{sock.close();}
}
module.exports={list,capture,BASE_PORT,PORT_COUNT,REPLY_PORT};
if(require.main===module)(process.argv[2]==='capture'?capture(JSON.parse(process.argv[3]||'{}')):list()).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
