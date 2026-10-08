import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiServer} from './http.mjs';
import {analyzeLocal} from './core.mjs';
test('real HTTP API: startup, validation, local parity and research opt-in',async()=>{
  let options;
  const server=createApiServer({analyze:async(text,opts)=>{options=opts;return analyzeLocal(text)}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(base+'/api/health')).status,200);
    const send=body=>fetch(base+'/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await send(null)).status,400);
    assert.equal((await send({text:' '})).status,400);
    assert.equal((await send({text:'x'.repeat(50001)})).status,413);
    const text='Achète des coupons Transcash et envoie-moi les codes.';
    const result=await (await send({text})).json();
    assert.equal(result.verdict,analyzeLocal(text).verdict);assert.equal(options.research,false);
    await send({text,research:true});assert.equal(options.research,true);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
