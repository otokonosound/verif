import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const code=fs.readFileSync(new URL("../research.js",import.meta.url),"utf8");
const now=Date.now();
const mockFetch=async url=>{
  const s=String(url);
  if(s.startsWith("https://dns.google/resolve")) return {
    ok:true,
    async json(){return {Answer:[{data:"203.0.113.10"}]}}
  };
  if(s.startsWith("https://rdap.org/domain/")) return {
    ok:true,
    async json(){return {events:[{eventAction:"registration",eventDate:new Date(now-5*86400000).toISOString()}],entities:[],status:["active"]}}
  };
  return {
    ok:true,status:200,url:"https://evil.example/login",
    headers:{get(name){return name.toLowerCase()==="content-type"?"text/html":null}},
    body:null,
    async text(){return "<html><title>Connexion</title><body>Mot de passe urgent</body></html>"}
  };
};
const context={
  self:{},
  fetch:mockFetch,
  URL,
  TextDecoder,
  AbortController,
  setTimeout,
  clearTimeout,
  Date,
  console
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../core.js',import.meta.url),'utf8'),context);
vm.runInContext(code,context);
const R=context.self.VERIF_RESEARCHER;
assert.ok(R,"researcher exposed");
assert.ok(R.ageDays(new Date(now-10*86400000).toISOString())>=9);

const invalid=await R.inspectPage("pas une url");
assert.equal(invalid.host,null);
assert.match(invalid.findings[0],/invalide/i);

const result=await R.inspectPage("https://young-domain.com/login");
assert.equal(result.dns.resolved,true);
assert.ok(result.rdap.ageDays<=6);
assert.match(result.findings.join(" "),/très récemment/i);
assert.equal(result.finalUrl,undefined,'does not open target links');
const privateResult=await R.inspectPage('http://172.16.1.1');
assert.equal(privateResult.dns,undefined);
console.log("VÉRIF extension research: tests passés.");
