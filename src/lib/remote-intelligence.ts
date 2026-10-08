import type { IntelligentAnalysis } from "./intelligence";
import type { Verdict } from "./analyze";
import { refreshIncident } from './analyze';

const rank:Record<Verdict,number>={ok:0,check:1,caution:2,stop:3};

export function apiBase(){
  const value=String((import.meta as any).env?.VITE_VERIF_API_URL||"").trim();
  return value.replace(/\/$/,"");
}

export async function fetchRemoteIntelligence(text:string,signal?:AbortSignal):Promise<any|null>{
  const base=apiBase();
  if(!base||signal?.aborted)return null;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
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
  if(!remote||!Object.hasOwn(rank,remote.verdict))return local;
  const remoteVerdict=remote.verdict as Verdict;
  const finalVerdict=rank[remoteVerdict]>rank[local.verdict]?remoteVerdict:local.verdict;
  const reasons=[...new Set([...(local.reasons||[]),...(Array.isArray(remote.reasons)?remote.reasons:[]).filter((x:any)=>typeof x==='string').map((x:string)=>"Serveur Intelligence : "+x)])].slice(0,20);
  const actions=[...new Set([...(local.actions||[]),...(Array.isArray(remote.actions)?remote.actions:[]).filter((x:any)=>typeof x==='string')])].slice(0,10);
  const intelligence:any={
    ...(local.intelligence||{}),
    remote:{
      used:true,
      engine:remote.engine||"VÉRIF API",
      researchProvider:remote.research?.provider||null,
      aiUsed:Boolean(remote.ai)
    }
  };
  const remoteItems=Array.isArray(remote.research?.items)?remote.research.items.filter((i:any)=>i&&typeof i.host==='string'&&typeof i.url==='string').slice(0,4).map((i:any)=>({url:i.url,host:i.host,findings:Array.isArray(i.findings)?i.findings.filter((f:any)=>typeof f==='string'):[],dns:typeof i.dns?.resolved==='boolean'?{resolved:i.dns.resolved}:undefined,rdap:Number.isFinite(i.rdap?.ageDays)?{ageDays:i.rdap.ageDays}:undefined})):[];
  const searchResults=Array.isArray(remote.research?.searchResults)?remote.research.searchResults.filter((r:any)=>r&&typeof r.title==='string'&&typeof r.url==='string'&&/^https:\/\//.test(r.url)).slice(0,5):[];
  const web=local.intelligence?.web||{attempted:false,available:false,items:[]};
  intelligence.ai ||= {available:false,used:false};
  intelligence.web={...web,attempted:true,available:web.available||remoteItems.some((i:any)=>i.dns||i.rdap)||searchResults.length>0,items:[...web.items,...remoteItems],searchResults:searchResults.map((r:any)=>({...r,snippet:typeof r.snippet==='string'?r.snippet:''})),provider:typeof remote.research?.provider==='string'?remote.research.provider:web.provider};
  intelligence.mode=intelligence.ai.used?(intelligence.web.available?'local+ai+web':'local+ai'):(intelligence.web.available?'local+web':'local');
  return refreshIncident({
    ...local,
    verdict:finalVerdict,
    title:finalVerdict===local.verdict?local.title:(typeof remote.title==='string'?remote.title:'Prudence'),
    summary:finalVerdict===local.verdict?local.summary:(typeof remote.summary==='string'?remote.summary:'Des signaux supplémentaires nécessitent une vérification.'),
    reasons,
    actions,
    evidence:{...local.evidence,risk:Math.max(local.evidence?.risk||0,Number.isFinite(remote.evidence?.risk)?remote.evidence.risk:0)},
    incidentReport:undefined,
    confidence:rank[remoteVerdict]>rank[local.verdict]?'moyenne':local.confidence,
    engine:"VÉRIF Intelligence hybride",
    intelligence
  });
}
