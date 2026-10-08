import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('popup loads classic scripts and displays shared engine result offline',async()=>{
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,checked:false,textContent:'',innerHTML:''});return elements.get(id)};
  let networkCalls=0;
  const context={document:{getElementById:element},URL,AbortController,setTimeout,clearTimeout,console,
    chrome:{tabs:{query:async()=>[{id:1,url:'https://ameli-remboursement.com'}],sendMessage:async()=>({text:'Ameli urgent payez 3 €',url:'https://ameli-remboursement.com'})},runtime:{sendMessage:async()=>{networkCalls++}}}};
  vm.createContext(context);
  const html=fs.readFileSync(new URL('../popup.html',import.meta.url),'utf8');
  for(const [,file] of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
  await context.scan();
  assert.match(element('badge').innerHTML,/STOP/);assert.equal(element('result').hidden,false);assert.equal(networkCalls,0);
});
test('extension AI destroys failed sessions',async()=>{
  let destroyed=0;
  const context={AbortController,setTimeout,clearTimeout,LanguageModel:{availability:async()=>'available',create:async()=>({prompt:async()=>{throw Error('failed')},destroy:()=>destroyed++})}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../local-ai.js',import.meta.url),'utf8'),context);
  const result=await context.VERIF_LOCAL_AI.review({},{});
  assert.equal(result.used,false);assert.equal(destroyed,1);
});
