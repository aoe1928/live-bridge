// browser-client.cjs must reassemble replies the Remote Script splits into frames
// (macOS limits UDP datagrams to 9216 bytes, so big replies cannot arrive whole).
const test=require('node:test'),assert=require('node:assert'),dgram=require('node:dgram'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dist=path.resolve(__dirname,'../dist');
test('frames from the remote script are reassembled in order',async()=>{
  const config=path.join(dist,'bridge-config.json');
  assert.ok(fs.existsSync(config),'run npm run build first');
  const token=JSON.parse(fs.readFileSync(config,'utf8')).token;
  const {browserRequest}=require(path.join(dist,'browser-client.cjs'));
  const server=dgram.createSocket('udp4');
  const big={matches:Array.from({length:150},(_,i)=>({name:'plugin '+i,uri:'query:'+'x'.repeat(120)}))};
  await new Promise(r=>server.bind(17833,'127.0.0.1',r));
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
test('a plain single-frame reply still works',async()=>{
  const token=JSON.parse(fs.readFileSync(path.join(dist,'bridge-config.json'),'utf8')).token;
  const {browserRequest}=require(path.join(dist,'browser-client.cjs'));
  const server=dgram.createSocket('udp4');
  await new Promise(r=>server.bind(17833,'127.0.0.1',r));
  server.on('message',(data,remote)=>{const req=JSON.parse(data.toString('utf8'));server.send(Buffer.from(JSON.stringify({id:req.id,result:{ok:1},error:null})),remote.port,remote.address);});
  try{assert.deepStrictEqual(await browserRequest('status'),{ok:1});}finally{server.close();}
});
