import http from 'node:http';
import { analyzeMessageWithAI } from './verif-engine.mjs';
export function createApiServer({analyze=analyzeMessageWithAI,limit=30}={}){
  const buckets=new Map();
  return http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':process.env.CORS_ORIGIN||'http://localhost:5173','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(data));};
    if(req.method==='OPTIONS')return send(204,{});
    const now=Date.now();
    for(const [key,value] of buckets)if(now-value.start>60000)buckets.delete(key);
    const ip=req.socket.remoteAddress||'unknown';
    const bucket=buckets.get(ip)||{start:now,count:0};bucket.count++;buckets.set(ip,bucket);
    if(bucket.count>limit)return send(429,{error:'rate_limited'});
    const path=new URL(req.url||'/','http://localhost').pathname;
    if(req.method==='GET'&&path==='/api/health')return send(200,{ok:true,service:'verif-api',version:'2.1.0'});
    if(req.method==='GET'&&path==='/api/capabilities')return send(200,{ok:true,ai:Boolean(process.env.HF_TOKEN),webSearch:process.env.BRAVE_SEARCH_API_KEY?'brave':process.env.SEARXNG_URL?'searxng':'dns+rdap',research:true});
    if(req.method!=='POST'||path!=='/api/analyze')return send(404,{error:'not_found'});
    let data;
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>100000)return send(413,{error:'payload_too_large'});chunks.push(chunk)}
      data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }catch{return send(400,{error:'invalid_json'})}
    if(!data||typeof data.text!=='string'||!data.text.trim())return send(400,{error:'text_required'});
    if(data.text.length>50000)return send(413,{error:'text_too_large'});
    try{return send(200,await analyze(data.text,{research:data.research===true}))}
    catch{return send(503,{error:'analysis_unavailable'})}
  });
}
