import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
for(const dir of ['extension','server','public'])for(const file of readdirSync(dir).filter(f=>/\.(m?js)$/.test(f))){
  const r=spawnSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});if(r.status)process.exit(r.status);
}
const html=readFileSync('extension/popup.html','utf8');
for(const [,file] of html.matchAll(/<script src="([^"]+)"/g))new vm.Script(readFileSync(`extension/${file}`,'utf8'),{filename:file});
const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));
if(manifest.manifest_version!==3)throw new Error('Manifest V3 required');
const pwa=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
if(pwa.share_target?.method!=='POST'||!pwa.share_target?.params?.files?.length)throw new Error('File share target missing');
console.log('Runtime, classic popup scripts, manifests: OK');
