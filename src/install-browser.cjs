// Usage: node install-browser.cjs "C:\path\to\Ableton\User Library"
const fs=require('node:fs'),path=require('node:path');
const userLibrary=process.argv[2];
if(!userLibrary||!path.isAbsolute(userLibrary)||!fs.statSync(userLibrary).isDirectory())throw Error('Specify the existing Ableton User Library absolute path');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'bridge-config.json'),'utf8'));
const dest=path.join(userLibrary,'Remote Scripts','LiveBridgeBrowser');
fs.mkdirSync(dest,{recursive:true});
for(const name of ['__init__.py','config.json']){
 const file=path.join(dest,name);
 if(fs.existsSync(file))fs.copyFileSync(file,file+'.backup-'+Date.now());
}
fs.copyFileSync(path.join(__dirname,'remote-script','LiveBridgeBrowser','__init__.py'),path.join(dest,'__init__.py'));
fs.writeFileSync(path.join(dest,'config.json'),JSON.stringify({port:17833,token:config.token},null,2));
console.log('Installed: '+dest+'\nRestart Live, then select LiveBridgeBrowser in a free Control Surface slot. Set Input/Output to None.');
