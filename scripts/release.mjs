import {writeFileSync,readFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import JSZip from 'jszip';
const commit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
writeFileSync('dist/version.json',JSON.stringify({version:'2.1.0',commit})+'\n');
const zip=new JSZip();
for(const f of readdirSync('extension').filter(f=>/\.(?:js|html|css|json)$/.test(f)))zip.file(f,readFileSync('extension/'+f));
mkdirSync('dist/downloads',{recursive:true});
writeFileSync('dist/downloads/verif-extension.zip',await zip.generateAsync({type:'nodebuffer'}));
