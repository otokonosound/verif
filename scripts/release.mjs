import {writeFileSync,readFileSync,mkdirSync,readdirSync,existsSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import JSZip from 'jszip';
const {version}=JSON.parse(readFileSync('package.json','utf8'));
let commit=process.env.GITHUB_SHA||'';
if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{commit='unknown'}}
writeFileSync('dist/version.json',JSON.stringify({version,commit})+'\n');

// Let the service worker precache the entry script and stylesheet of this exact build.
if(existsSync('dist/sw.js')&&existsSync('dist/index.html')){
  const html=readFileSync('dist/index.html','utf8');
  const assets=[...new Set([...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"?#]+)"/g)].map(m=>m[1]))];
  const sw=readFileSync('dist/sw.js','utf8');
  if(sw.includes('/*__PRECACHE__*/'))writeFileSync('dist/sw.js',sw.replace('/*__PRECACHE__*/',assets.map(a=>JSON.stringify(a)).join(',')));
}

// Text recognition runs entirely from this site: worker, engine and French language data are
// served next to the app (no third-party CDN) and kept by the service worker for offline use.
const tesseractVersion=JSON.parse(readFileSync('node_modules/tesseract.js/package.json','utf8')).version;
const ocrDir=`dist/ocr/${tesseractVersion}`;
mkdirSync(ocrDir,{recursive:true});
copyFileSync('node_modules/tesseract.js/dist/worker.min.js',`${ocrDir}/worker.min.js`);
for(const core of ['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-relaxedsimd-lstm.wasm.js'])copyFileSync(`node_modules/tesseract.js-core/${core}`,`${ocrDir}/${core}`);
copyFileSync('node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz',`${ocrDir}/fra.traineddata.gz`);

const zip=new JSZip();
for(const f of readdirSync('extension').filter(f=>/\.(?:js|html|css|json|png)$/.test(f)))zip.file(f,readFileSync('extension/'+f));
mkdirSync('dist/downloads',{recursive:true});
writeFileSync('dist/downloads/verif-extension.zip',await zip.generateAsync({type:'nodebuffer'}));
