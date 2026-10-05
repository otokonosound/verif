import { URL } from "node:url";

const OFFICIAL = {
  "service-public.fr":"Service-Public.fr","impots.gouv.fr":"Impots.gouv.fr","ameli.fr":"Assurance Maladie","laposte.fr":"La Poste","chronopost.fr":"Chronopost","ants.gouv.fr":"ANTS","amendes.gouv.fr":"ANTAI / Amendes.gouv.fr","cybermalveillance.gouv.fr":"Cybermalveillance.gouv.fr","gouv.fr":"Gouvernement français"
};
const BRAND_HINTS=[["impots","impots.gouv.fr"],["ameli","ameli.fr"],["la poste","laposte.fr"],["chronopost","chronopost.fr"],["antai","amendes.gouv.fr"],["service-public","service-public.fr"],["cybermalveillance","cybermalveillance.gouv.fr"]];
const PUBLIC_SUFFIXES=new Set(["co.uk","org.uk","ac.uk","com.au","co.jp"]);
function rootDomain(hostname){const h=hostname.toLowerCase().replace(/^www\./,"");const p=h.split(".");if(p.length<2)return h;const last2=p.slice(-2).join(".");return PUBLIC_SUFFIXES.has(last2)&&p.length>=3?p.slice(-3).join("."):last2}
function extractUrls(text){return [...text.matchAll(/https?:\/\/[^\s<>'"`]+/gi)].map(m=>m[0].replace(/[),.;!?]+$/,""))}
function inspectUrl(raw){try{const u=new URL(raw);const root=rootDomain(u.hostname);const official=OFFICIAL[root];const findings=[];if(u.protocol!=="https:")findings.push("Le lien n'utilise pas HTTPS.");if(u.hostname.includes("xn--"))findings.push("Le domaine utilise une représentation internationale potentiellement trompeuse.");if(u.username||u.password)findings.push("L'URL contient des informations avant le domaine.");if(/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname))findings.push("Le lien utilise directement une adresse IP plutôt qu'un domaine.");return{url:raw,host:u.hostname,rootDomain:root,official:official||null,findings}}catch{return{url:raw,host:null,rootDomain:null,official:null,findings:["Le lien ne peut pas être interprété comme une URL valide."]}}}
export function analyzeMessage(text){
 const urls=extractUrls(text).map(inspectUrl);const lower=text.toLowerCase();const reasons=[];let risk=0;
 if(urls.length){reasons.push(`${urls.length} lien${urls.length>1?"s":""} détecté${urls.length>1?"s":""}.`);risk+=1}
 if(/paiement|payez|virement|carte bancaire|frais|2[,.]?\d+\s*€/.test(lower)){reasons.push("Le contenu évoque un paiement ou une demande financière.");risk+=2}
 if(/urgent|immédiat|dans\s+\d+\s*(min|minute|h|heure|jour)|dernière chance|suspendu|bloqué/.test(lower)){reasons.push("Le contenu crée une pression temporelle ou une menace de blocage.");risk+=2}
 if(/mot de passe|code|identifiant|connexion|numéro de carte|cryptogramme|cvv/.test(lower)){reasons.push("Le contenu évoque des informations d'authentification ou bancaires.");risk+=2}
 const mismatch=BRAND_HINTS.find(([hint,domain])=>lower.includes(hint)&&urls.length&&!urls.some(u=>u.rootDomain===domain));
 if(mismatch){reasons.push(`Le message cite « ${mismatch[0]} » mais aucun lien ne correspond au domaine officiel ${mismatch[1]}.`);risk+=3}
 for(const u of urls)for(const f of u.findings){reasons.push(f);risk+=2}
 let verdict="ok",title="Aucun signal préoccupant détecté",confidence="faible";
 if(risk>=7){verdict="stop";title="N'agis pas tout de suite";confidence="élevée"}else if(risk>=4){verdict="caution";title="Prudence";confidence="moyenne"}else if(risk>=1){verdict="check";title="À vérifier";confidence="moyenne"}
 const summary=verdict==="stop"?"Plusieurs signaux compatibles avec une tentative de fraude ont été détectés.":verdict==="caution"?"Plusieurs éléments méritent une vérification indépendante.":verdict==="check"?"Un élément mérite une vérification avant d'agir.":"Aucun signal de risque évident n'a été identifié dans le contenu fourni.";
 const actions=verdict==="stop"?["N'utilise pas le lien reçu.","Ouvre toi-même le site ou l'application officielle.","Ne communique aucun code, mot de passe ou donnée bancaire."]:verdict==="caution"?["N'agis pas depuis le message.","Vérifie l'organisme par un canal indépendant."]:["Compare le contenu avec la source officielle avant d'agir."];
 return{verdict,title,summary,confidence,reasons,actions,urls,checkedAt:new Date().toISOString(),engine:"rules-v0.3"};
}


import { getAiSecondOpinion, mergeAiOpinion } from "./ai.mjs";

export async function analyzeMessageWithAI(text) {
  const deterministic = analyzeMessage(text);
  const ai = await getAiSecondOpinion(text, deterministic);
  return mergeAiOpinion(deterministic, ai);
}
