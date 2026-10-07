const SEARCH_TIMEOUT=Number(process.env.SEARCH_TIMEOUT_MS||5000);
const TRUSTED_SECURITY_SOURCES=new Set([
  "cybermalveillance.gouv.fr","cert.ssi.gouv.fr","17cyber.gouv.fr",
  "urlscan.io","virustotal.com","phishtank.org","openphish.com",
  "microsoft.com","google.com","cloudflare.com","malwarebytes.com",
  "proofpoint.com","sophos.com","trendmicro.com","kaspersky.com",
  "eset.com","bitdefender.com"
]);

function rootDomain(host){
  const p=String(host||"").toLowerCase().replace(/^www\./,"").split(".").filter(Boolean);
  return p.length>=2?p.slice(-2).join("."):p.join(".");
}
function resultHost(url){try{return new URL(url).hostname.toLowerCase()}catch{return""}}
function trustedSearchEvidence(result,targetHost){
  const source=rootDomain(resultHost(result?.url));
  if(!TRUSTED_SECURITY_SOURCES.has(source))return false;
  const needle=String(targetHost||"").toLowerCase();
  if(!needle)return false;
  const corpus=(String(result?.title||"")+" "+String(result?.snippet||"")+" "+String(result?.url||"")).toLowerCase();
  if(!corpus.includes(needle))return false;
  return /phishing|hameçonnage|malveillant|malicious|arnaque|fraud|scam|malware|dangerous|unsafe|compromis|compromised|blacklist|blocklist/.test(corpus);
}

function withTimeout(ms){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return{signal:controller.signal,done:()=>clearTimeout(timer)};
}

function ageDays(value){
  const t=Date.parse(value||"");
  return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null;
}

async function dns(host){
  const t=withTimeout(3500);
  try{
    const r=await fetch("https://dns.google/resolve?name="+encodeURIComponent(host)+"&type=A",{headers:{Accept:"application/dns-json"},signal:t.signal});
    if(!r.ok)return null;
    const j=await r.json();
    const answers=(j.Answer||[]).map(x=>String(x.data||"")).filter(Boolean).slice(0,8);
    return{resolved:answers.length>0,answers};
  }catch{return null}finally{t.done()}
}

async function rdap(host){
  const t=withTimeout(4500);
  try{
    const r=await fetch("https://rdap.org/domain/"+encodeURIComponent(host),{headers:{Accept:"application/rdap+json, application/json"},signal:t.signal});
    if(!r.ok)return null;
    const j=await r.json();
    const reg=(Array.isArray(j.events)?j.events:[]).find(e=>/registration/i.test(e.eventAction||""));
    const registeredAt=typeof reg?.eventDate==="string"?reg.eventDate:null;
    const registrar=(Array.isArray(j.entities)?j.entities:[]).map(e=>e.vcardArray?.[1]?.find(v=>v?.[0]==="fn")?.[3]).find(Boolean)||null;
    return{registeredAt,ageDays:ageDays(registeredAt),registrar,status:Array.isArray(j.status)?j.status.slice(0,8):[]};
  }catch{return null}finally{t.done()}
}

async function searchSearx(query){
  const base=(process.env.SEARXNG_URL||"").replace(/\/$/,"");
  if(!base)return null;
  const t=withTimeout(SEARCH_TIMEOUT);
  try{
    const r=await fetch(base+"/search?q="+encodeURIComponent(query)+"&format=json&language=fr-FR&safesearch=1",{headers:{Accept:"application/json","User-Agent":"VERIF/2.0 security-research"},signal:t.signal});
    if(!r.ok)return null;
    const j=await r.json();
    return{provider:"SearXNG",results:(j.results||[]).slice(0,5).map(x=>({title:String(x.title||"").slice(0,180),url:String(x.url||""),snippet:String(x.content||"").slice(0,400)}))};
  }catch{return null}finally{t.done()}
}

async function searchBrave(query){
  const key=process.env.BRAVE_SEARCH_API_KEY;
  if(!key)return null;
  const t=withTimeout(SEARCH_TIMEOUT);
  try{
    const r=await fetch("https://api.search.brave.com/res/v1/web/search?q="+encodeURIComponent(query)+"&count=5&search_lang=fr",{headers:{"X-Subscription-Token":key,Accept:"application/json"},signal:t.signal});
    if(!r.ok)return null;
    const j=await r.json();
    return{provider:"Brave Search",results:(j.web?.results||[]).slice(0,5).map(x=>({title:String(x.title||"").slice(0,180),url:String(x.url||""),snippet:String(x.description||"").slice(0,400)}))};
  }catch{return null}finally{t.done()}
}

async function webSearch(query){
  return await searchBrave(query) || await searchSearx(query);
}

export async function researchMessage(text,analysis){
  const items=[];
  for(const u of (analysis.urls||[]).slice(0,4)){
    const host=u.host||u.rootDomain;
    if(!host)continue;
    const [dnsInfo,rdapInfo]=await Promise.all([dns(host),rdap(host)]);
    const findings=[];
    if(dnsInfo&&!dnsInfo.resolved)findings.push("Le domaine ne résout pas vers une adresse IPv4.");
    if(rdapInfo?.ageDays!==null&&rdapInfo?.ageDays!==undefined){
      if(rdapInfo.ageDays<30)findings.push(`Domaine enregistré très récemment (${rdapInfo.ageDays} jours).`);
      else if(rdapInfo.ageDays<90)findings.push(`Domaine récent (${rdapInfo.ageDays} jours).`);
    }
    items.push({url:u.url,host,dns:dnsInfo,rdap:rdapInfo,findings});
  }

  const suspiciousHost=items.find(x=>!analysis.urls?.find(u=>u.host===x.host)?.official)?.host||items[0]?.host||null;
  const brand=analysis.identity?.claimedBrand||"";
  const query=suspiciousHost?[`"${suspiciousHost}"`,brand,"sécurité"].filter(Boolean).join(" "):null;
  const search=query?await webSearch(query):null;

  return{
    provider:search?.provider||"DNS + RDAP",
    items,
    searchResults:search?.results||[],
    searchedAt:new Date().toISOString()
  };
}

export function applyResearchEvidence(analysis,research){
  let delta=0;
  const reasons=[];
  for(const item of research?.items||[]){
    for(const finding of item.findings||[]){
      reasons.push("Recherche web : "+finding);
      if(/très récemment/i.test(finding))delta+=3;
      else if(/Domaine récent/i.test(finding))delta+=1;
      else if(/ne résout pas/i.test(finding))delta+=1;
    }
  }

  const targetHost=(research?.items||[])[0]?.host||null;
  const trustedHits=(research?.searchResults||[]).filter(x=>trustedSearchEvidence(x,targetHost));
  if(trustedHits.length){
    const sources=[...new Set(trustedHits.map(x=>rootDomain(resultHost(x.url))).filter(Boolean))];
    reasons.push("Recherche web : une source de sécurité reconnue signale explicitement ce domaine comme suspect ou malveillant"+(sources.length?" ("+sources.join(", ")+").":"."));
    delta+=trustedHits.length>=2?4:3;
  }

  if(!delta)return{...analysis,research};
  const risk=Math.max(0,(analysis.evidence?.risk||0)+delta);
  const rank={ok:0,check:1,caution:2,stop:3};
  let verdict=analysis.verdict;
  if(risk>=8)verdict="stop";else if(risk>=4&&rank[verdict]<2)verdict="caution";else if(risk>=1&&rank[verdict]<1)verdict="check";
  return{
    ...analysis,
    verdict,
    title:verdict==="stop"?"N'agis pas tout de suite":verdict==="caution"?"Prudence":verdict==="check"?"À vérifier":analysis.title,
    summary:verdict!==analysis.verdict?"La recherche web a apporté des signaux supplémentaires qui renforcent le niveau de prudence.":analysis.summary,
    reasons:[...new Set([...(analysis.reasons||[]),...reasons])].slice(0,18),
    evidence:{...(analysis.evidence||{}),risk},
    research
  };
}

export const __test={ageDays,applyResearchEvidence,trustedSearchEvidence};
