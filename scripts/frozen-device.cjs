// Max collective chunks use big-endian lengths; the outer AMXD header uses LE.
// Layout verified against a device frozen by the installed Max 8 editor.
const assert=require('node:assert/strict');
function u32(value){const b=Buffer.alloc(4);b.writeUInt32BE(value);return b;}
function chunk(tag,data){return Buffer.concat([Buffer.from(tag,'ascii'),u32(data.length+8),data]);}
function string(value){const b=Buffer.from(value+'\0','utf8');return Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);}
function pack(header,files){
 let offset=16;const entries=[];
 for(const [i,file] of files.entries()){
  if(!/^[^/\\]+$/.test(file.name)||file.type.length!==4)throw Error('Invalid collective entry');
  entries.push(chunk('dire',Buffer.concat([chunk('type',Buffer.from(file.type)),chunk('fnam',string(file.name)),chunk('sz32',u32(file.data.length)),chunk('of32',u32(offset)),chunk('vers',u32(0)),chunk('flag',u32(i===0?17:0)),chunk('mdat',u32(0))])));offset+=file.data.length;
 }
 const collective=Buffer.concat([Buffer.from('mx@c'),u32(16),u32(0),u32(offset),...files.map(f=>f.data),chunk('dlst',Buffer.concat(entries))]);
 const outer=Buffer.from(header);assert.equal(outer.length,32);outer.writeUInt32LE(7,20);outer.writeUInt32LE(collective.length,28);return Buffer.concat([outer,collective]);
}
function unpack(b){
 assert.equal(b.toString('ascii',32,36),'mx@c');assert.equal(b.readUInt32LE(28),b.length-32);
 const dir=32+b.readUInt32BE(44);assert.equal(b.toString('ascii',dir,dir+4),'dlst');assert.equal(dir+b.readUInt32BE(dir+4),b.length);const files=[];
 for(let p=dir+8;p<b.length;){assert.equal(b.toString('ascii',p,p+4),'dire');const end=p+b.readUInt32BE(p+4);const fields={};for(let q=p+8;q<end;){const length=b.readUInt32BE(q+4);assert(length>=8&&q+length<=end);fields[b.toString('ascii',q,q+4)]=b.subarray(q+8,q+length);q+=length;}
 const start=32+fields.of32.readUInt32BE(0),size=fields.sz32.readUInt32BE(0);assert(start>=48&&start+size<=dir);files.push({name:fields.fnam.toString('utf8').replace(/\0+$/,''),type:fields.type.toString('ascii'),data:b.subarray(start,start+size)});p=end;}
 return files;
}
module.exports={pack,unpack};
