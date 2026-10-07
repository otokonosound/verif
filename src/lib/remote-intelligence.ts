import type { IntelligentAnalysis } from "./intelligence";
import type { Verdict } from "./analyze";

const rank:Record<Verdict,number>={ok:0,check:1,caution:2,stop:3};

export function apiBase(){
  const value=String((import.meta as any).env?.VITE_VERIF_API_URL||"").trim();
  return value.replace(/\/$/,"");
}

export async function fetchRemoteIntelligence(text:string,signal?:AbortSignal):Promise<any|null>{
  const base=apiBase();
  if(!base)return null;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  const abort=()=>controller.abort();
  signal?.addEventListener("abort",abort,{once:true});
  try{
    const response=await fetch(base+"/api/analyze",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,research:true}),
      signal:controller.signal
    });
    if(!response.ok)return null;
    const data=await response.json();
    if(!data||!["ok","check","caution","stop"].includes(data.verdict))return null;
    return data;
  }catch{return null}finally{
    clearTimeout(timeout);
    signal?.removeEventListener("abort",abort);
  }
}

export function mergeRemoteIntelligence(local:IntelligentAnalysis,remote:any):IntelligentAnalysis{
  if(!remote)return local;
  const remoteVerdict=remote.verdict as Verdict;
  const finalVerdict=rank[remoteVerdict]>rank[local.verdict]?remoteVerdict:local.verdict;
  const reasons=[...new Set([...(local.reasons||[]),...(remote.reasons||[]).map((x:string)=>"Serveur Intelligence : "+x)])].slice(0,20);
  const actions=[...new Set([...(local.actions||[]),...(remote.actions||[])])].slice(0,10);
  const intelligence:any={
    ...(local.intelligence||{}),
    remote:{
      used:true,
      engine:remote.engine||"VÉRIF API",
      researchProvider:remote.research?.provider||null,
      aiUsed:Boolean(remote.ai)
    }
  };
  return{
    ...local,
    verdict:finalVerdict,
    title:finalVerdict===local.verdict?local.title:(remote.title||local.title),
    summary:finalVerdict===local.verdict?local.summary:(remote.summary||local.summary),
    reasons,
    actions,
    confidence:rank[remoteVerdict]>rank[local.verdict]?(remote.confidence||local.confidence):local.confidence,
    engine:"VÉRIF Intelligence hybride",
    intelligence
  };
}
