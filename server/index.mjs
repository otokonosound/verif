import http from "node:http";
import { URL } from "node:url";
import { analyzeMessageWithAI } from "./verif-engine.mjs";

const port=Number(process.env.PORT||8787);const limit=Number(process.env.RATE_LIMIT||30);const windowMs=60_000;const buckets=new Map();
function allowed(ip){const now=Date.now();const b=buckets.get(ip)||{start:now,count:0};if(now-b.start>=windowMs){b.start=now;b.count=0}b.count++;buckets.set(ip,b);return b.count<=limit}
function headers(res){res.setHeader("Access-Control-Allow-Origin",process.env.CORS_ORIGIN||"*");res.setHeader("Access-Control-Allow-Headers","content-type");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("Cache-Control","no-store")}
const server=http.createServer(async(req,res)=>{headers(res);if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}const ip=(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").toString().split(",")[0].trim();if(!allowed(ip)){res.writeHead(429,{"content-type":"application/json; charset=utf-8","retry-after":"60"});return res.end(JSON.stringify({error:"rate_limited"}))}
 const url=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);
 if(req.method==="GET"&&url.pathname==="/api/health"){res.setHeader("content-type","application/json; charset=utf-8");return res.end(JSON.stringify({ok:true,service:"verif-api",version:"0.4.0"}))}
 if(req.method==="POST"&&url.pathname==="/api/analyze"){
  let body="";for await(const chunk of req){body+=chunk;if(body.length>100_000){res.writeHead(413,{"content-type":"application/json; charset=utf-8"});return res.end(JSON.stringify({error:"payload_too_large"}))}}
  try{const data=JSON.parse(body||"{}");if(typeof data.text!=="string"||!data.text.trim()){res.writeHead(400,{"content-type":"application/json; charset=utf-8"});return res.end(JSON.stringify({error:"text_required"}))}if(data.text.length>50_000){res.writeHead(413,{"content-type":"application/json; charset=utf-8"});return res.end(JSON.stringify({error:"text_too_large"}))}const result=await analyzeMessageWithAI(data.text);res.setHeader("content-type","application/json; charset=utf-8");return res.end(JSON.stringify(result))}catch{res.writeHead(400,{"content-type":"application/json; charset=utf-8"});return res.end(JSON.stringify({error:"invalid_json"}))}
 }
 res.writeHead(404,{"content-type":"application/json; charset=utf-8"});res.end(JSON.stringify({error:"not_found"}));
});
server.listen(port,()=>console.log(`VÉRIF API listening on :${port}`));
