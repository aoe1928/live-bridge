const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function build(out=path.join(root,'dist')){
 fs.mkdirSync(out,{recursive:true});const cfgPath=path.join(out,'bridge-config.json');
 const cfg=fs.existsSync(cfgPath)?JSON.parse(fs.readFileSync(cfgPath,'utf8')):{token:crypto.randomBytes(32).toString('hex'),requestPort:17831,responsePort:17832};
 if(!/^[a-f0-9]{32,128}$/i.test(cfg.token)||cfg.requestPort!==17831||cfg.responsePort!==17832)throw Error('Invalid local configuration; fixed ports 17831/17832 required');
 fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2)+'\n',{mode:0o600});
 for(const name of ['server.cjs','browser-client.cjs','install-browser.cjs'])fs.copyFileSync(path.join(root,'src',name),path.join(out,name));
 fs.cpSync(path.join(root,'src/remote-script'),path.join(out,'remote-script'),{recursive:true});
 fs.copyFileSync(path.join(root,'assets/bridge-mascot.png'),path.join(out,'bridge-mascot.png'));
 fs.writeFileSync(path.join(out,'live-api.js'),fs.readFileSync(path.join(root,'src/live-api.js'),'utf8').replaceAll('__LIVE_BRIDGE_TOKEN__',cfg.token));
 const prompt=`Live BridgeをこのAIアプリから使えるようにMCP接続を設定してください。\nNode.js: ${process.execPath}\nMCPサーバー: ${path.join(out,'server.cjs')}\nSTDIO方式で、commandにNode.js、argsにサーバーの絶対パスを指定します。\n既存のableton_live登録が同じ場所なら再利用し、他のMCP設定は維持してください。\nMCPを再接続し、20ツール、live_status、live_list_tracksの応答を確認してください。\nL2挿入にはRemote Scriptも必要です。ブラウザー連携.mdに従い、live_browser_statusとlive_search_plugins（query: L2）で確認してください。\nトークンは表示・変更しないでください。今回は接続確認のみで、編集・再生・保存は行いません。`;
 fs.writeFileSync(path.join(out,'接続セットアップ用プロンプト.txt'),prompt+'\n');
 for(const kind of ['MIDI','Audio']){
 const doc=JSON.parse(fs.readFileSync(path.join(root,'device',kind+'.maxpat'),'utf8'));
 function visit(v){if(Array.isArray(v))return v.map(visit);if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=visit(v[k]);return v;}return typeof v==='string'?v.replaceAll('__SETUP_PROMPT__',prompt).replaceAll('__LIVE_BRIDGE_TOKEN__',cfg.token):v;}
 const body=Buffer.from(JSON.stringify(visit(doc),null,2)+'\0');const header=Buffer.from(JSON.parse(fs.readFileSync(path.join(root,'device',kind+'.header.json'))).base64,'base64');header.writeUInt32LE(body.length,28);
 fs.writeFileSync(path.join(out,'Live Bridge '+kind+'.amxd'),Buffer.concat([header,body]));
 }
 fs.copyFileSync(path.join(root,'docs/ブラウザー連携.md'),path.join(out,'ブラウザー連携.md'));
 return {out,deviceCount:2};
}
module.exports={build};if(require.main===module)console.log(build());
