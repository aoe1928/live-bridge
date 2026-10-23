// browser-client.cjs must reassemble replies the Remote Script splits into frames
// (macOS limits UDP datagrams to 9216 bytes, so big replies cannot arrive whole).
const test=require('node:test'),assert=require('node:assert'),dgram=require('node:dgram'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dist=path.resolve(__dirname,'../dist');
// The Remote Script owns UDP 17833 while Live runs; skip instead of hanging on a bind error.
function bindOrSkip(server,t){return new Promise(resolve=>{server.once('error',e=>{server.close();t.skip('UDP 17833 busy ('+e.code+'); stop Live or the Remote Script to run this test');resolve(false);});server.bind(17833,'127.0.0.1',()=>resolve(true));});}
test('frames from the remote script are reassembled in order',async(t)=>{
  const config=path.join(dist,'bridge-config.json');
  assert.ok(fs.existsSync(config),'run npm run build first');
  const token=JSON.parse(fs.readFileSync(config,'utf8')).token;
  const {browserRequest}=require(path.join(dist,'browser-client.cjs'));
  const server=dgram.createSocket('udp4');
  const big={matches:Array.from({length:150},(_,i)=>({name:'plugin '+i,uri:'query:'+'x'.repeat(120)}))};
  if(!await bindOrSkip(server,t))return;
  server.on('message',(data,remote)=>{
    const req=JSON.parse(data.toString('utf8'));
    assert.strictEqual(req.token,token);
    const text=JSON.stringify({id:req.id,result:big,error:null});
    const size=7000,parts=[];for(let i=0;i<text.length;i+=size)parts.push(text.slice(i,i+size));
    assert.ok(parts.length>1);
    // send out of order on purpose
    parts.map((part,frame)=>({id:req.id,frame,frames:parts.length,part})).reverse()
      .forEach(f=>server.send(Buffer.from(JSON.stringify(f)),remote.port,remote.address));
  });
  try{const r=await browserRequest('search',{query:'reverb'});assert.deepStrictEqual(r,big);}
  finally{server.close();}
});
test('a plain single-frame reply still works',async(t)=>{
  const token=JSON.parse(fs.readFileSync(path.join(dist,'bridge-config.json'),'utf8')).token;
  const {browserRequest}=require(path.join(dist,'browser-client.cjs'));
  const server=dgram.createSocket('udp4');
  if(!await bindOrSkip(server,t))return;
  server.on('message',(data,remote)=>{const req=JSON.parse(data.toString('utf8'));server.send(Buffer.from(JSON.stringify({id:req.id,result:{ok:1},error:null})),remote.port,remote.address);});
  try{assert.deepStrictEqual(await browserRequest('status'),{ok:1});}finally{server.close();}
});
