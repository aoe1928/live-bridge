const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {build}=require('./build.cjs');
function writeBackedUp(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file))fs.copyFileSync(file,file+'.backup-'+Date.now());fs.writeFileSync(file,text);}
function setup({userLibrary,configureClients=false,out=path.resolve(__dirname,'../dist'),home=os.homedir()}){
 if(!userLibrary||!path.isAbsolute(userLibrary)||!fs.existsSync(userLibrary)||!fs.statSync(userLibrary).isDirectory())throw Error('Specify the existing Live User Library with --user-library "absolute path"');
 build(out);
 const locations={Audio:'Audio Effects/Max Audio Effect/Live Bridge',MIDI:'MIDI Effects/Max MIDI Effect/Live Bridge'};
 for(const [kind,folder] of Object.entries(locations)){const dest=path.join(userLibrary,'Presets',folder,'Live Bridge '+kind+'.amxd');fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest))fs.copyFileSync(dest,dest+'.backup-'+Date.now());fs.copyFileSync(path.join(out,'Live Bridge '+kind+'.amxd'),dest);}
 cp.execFileSync(process.execPath,[path.join(out,'install-browser.cjs'),userLibrary],{stdio:'pipe'});
 const entry={command:process.execPath,args:[path.join(out,'server.cjs')]};
 fs.writeFileSync(path.join(out,'mcp-settings.json'),JSON.stringify({mcpServers:{ableton_live:entry}},null,2));
 if(configureClients){
  const codex=path.join(home,'.codex/config.toml');let text=fs.existsSync(codex)?fs.readFileSync(codex,'utf8'):'';
  const block=/\[mcp_servers\.ableton_live\][\s\S]*?(?=\n\[|$)/;
  const fields='command = '+JSON.stringify(entry.command)+'\nargs = '+JSON.stringify(entry.args)+'\n';
  if(block.test(text))text=text.replace(block,old=>{if(/^url\s*=/m.test(old))throw Error('Existing ableton_live uses HTTP; inspect settings before replacing');for(const key of ['command','args'])old=old.replace(new RegExp('^'+key+'\\s*=.*\\r?\\n?','m'),'');return old.trimEnd()+'\n'+fields;});else text+='\n[mcp_servers.ableton_live]\n'+fields;
  writeBackedUp(codex,text);
  const ag=path.join(home,'.gemini/config/mcp_config.json'),doc=fs.existsSync(ag)?JSON.parse(fs.readFileSync(ag,'utf8')):{};doc.mcpServers=doc.mcpServers||{};doc.mcpServers.ableton_live={...(doc.mcpServers.ableton_live||{}),...entry};delete doc.mcpServers.ableton_live.url;writeBackedUp(ag,JSON.stringify(doc,null,2)+'\n');
 }
 return {devicesInstalled:true,remoteScriptInstalled:true,clientsConfigured:configureClients,server:path.join(out,'server.cjs'),next:'Restart Live; select LiveBridgeBrowser in a free Control Surface slot (Input/Output None); reconnect MCP. Load exactly one Live Bridge device.'};
}
module.exports={setup};
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--user-library');if(args.includes('--help'))console.log('node scripts/setup.cjs --user-library "existing absolute User Library path" [--configure-clients]');else{try{console.log(setup({userLibrary:i>=0?args[i+1]:undefined,configureClients:args.includes('--configure-clients')}));}catch(e){console.error(e.message);process.exitCode=1;}}}
