(function(global){
  const MAX_URLS=4;
  const PRIVATE_HOST=/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd|fe80)/i;

  function ageDays(value){
    const t=Date.parse(value||"");
    return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null;
  }
  function timeout(ms){const c=new AbortController();const id=setTimeout(()=>c.abort(),ms);return{signal:c.signal,clear:()=>clearTimeout(id)}}
  function stripHtml(html){
    return String(html||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  }
  async function dns(host){
    const t=timeout(3500);
    try{
      const r=await fetch("https://dns.google/resolve?name="+encodeURIComponent(host)+"&type=A",{headers:{Accept:"application/dns-json"},cache:"no-store",credentials:"omit",signal:t.signal});
      if(!r.ok)return null;
      const j=await r.json();const answers=(j.Answer||[]).map(x=>String(x.data||"")).filter(Boolean).slice(0,8);
      return{resolved:answers.length>0,answers};
    }catch{return null}finally{t.clear()}
  }
  async function rdap(host){
    const t=timeout(4500);
    try{
      const r=await fetch("https://rdap.org/domain/"+encodeURIComponent(host),{headers:{Accept:"application/rdap+json, application/json"},cache:"no-store",credentials:"omit",signal:t.signal});
      if(!r.ok)return null;
      const j=await r.json();const events=Array.isArray(j.events)?j.events:[];
      const reg=events.find(e=>/registration/i.test(e.eventAction||""));
      const registeredAt=typeof reg?.eventDate==="string"?reg.eventDate:null;
      const registrar=(Array.isArray(j.entities)?j.entities:[]).map(e=>e.vcardArray?.[1]?.find(v=>v?.[0]==="fn")?.[3]).find(Boolean)||null;
      return{registeredAt,ageDays:ageDays(registeredAt),registrar,status:Array.isArray(j.status)?j.status.slice(0,8):[]};
    }catch{return null}finally{t.clear()}
  }
  async function inspectPage(raw){
    let u;try{u=new URL(raw)}catch{return{url:raw,host:null,findings:["URL invalide."],sources:[]}}
    const host=u.hostname.toLowerCase(),findings=[],sources=[];
    if(!/^https?:$/.test(u.protocol))return{url:raw,host,findings:["Protocole non HTTP(S)."],sources};
    if(PRIVATE_HOST.test(host)||/^\d+\.\d+\.\d+\.\d+$/.test(host)&&PRIVATE_HOST.test(host))return{url:raw,host,findings:["Adresse locale ou privée : recherche réseau ignorée."],sources};

    const [dnsInfo,rdapInfo]=await Promise.all([dns(host),rdap(host)]);
    if(dnsInfo){sources.push("Google DNS");if(!dnsInfo.resolved)findings.push("Le domaine ne résout pas vers une adresse IPv4 publique.")}
    if(rdapInfo){
      sources.push("RDAP");
      if(rdapInfo.ageDays!==null&&rdapInfo.ageDays<30)findings.push("Domaine enregistré très récemment ("+rdapInfo.ageDays+" jours).");
      else if(rdapInfo.ageDays!==null&&rdapInfo.ageDays<90)findings.push("Domaine récent ("+rdapInfo.ageDays+" jours).");
    }

    let finalUrl=null,finalHost=null,status=null,title=null;
    const t=timeout(6000);
    try{
      const r=await fetch(raw,{method:"GET",redirect:"follow",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",headers:{"Accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"},signal:t.signal});
      status=r.status;finalUrl=r.url||raw;try{finalHost=new URL(finalUrl).hostname.toLowerCase()}catch{}
      sources.push("HTTP direct");
      if(finalHost&&finalHost!==host)findings.push("Le lien redirige vers un autre domaine : "+finalHost+".");
      const type=(r.headers.get("content-type")||"").toLowerCase();
      if(type.includes("text/html")){
        const reader=r.body?.getReader();let total=0,rawText="";
        if(reader){
          const dec=new TextDecoder();
          while(total<65536){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;rawText+=dec.decode(value,{stream:true})}
          try{await reader.cancel()}catch{}
        }else rawText=(await r.text()).slice(0,65536);
        title=(rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+/g," ").trim().slice(0,180)||null;
        const visible=stripHtml(rawText).slice(0,4000).toLowerCase();
        if(/mot de passe|password|code de sécurité|cvv|cryptogramme|numéro de carte/.test(visible))findings.push("La page visible demande ou évoque des informations sensibles.");
        if(/urgent|immédiat|suspendu|bloqué|dernière chance|expir/.test(visible))findings.push("La page visible utilise un langage de pression ou d’urgence.");
      }
    }catch{findings.push("La page n’a pas pu être interrogée directement.")}finally{t.clear()}

    return{url:raw,host,finalUrl,finalHost,status,title,dns:dnsInfo||undefined,rdap:rdapInfo||undefined,findings:[...new Set(findings)],sources};
  }

  async function research(payload){
    const urls=[...new Set(Array.isArray(payload?.urls)?payload.urls:[])].slice(0,MAX_URLS);
    const items=await Promise.all(urls.map(inspectPage));
    const official=String(payload?.officialDomain||"").toLowerCase();
    for(const item of items){
      if(official&&item.finalHost&&item.finalHost!==official&&!item.finalHost.endsWith("."+official)){
        item.findings=item.findings||[];
        item.findings.push("La destination finale ne correspond pas au domaine officiel attendu "+official+".");
      }
    }
    return{provider:"Extension VÉRIF · DNS + RDAP + HTTP",items,searchedAt:new Date().toISOString()};
  }

  global.VERIF_RESEARCHER={research,inspectPage,ageDays};
})(self);
