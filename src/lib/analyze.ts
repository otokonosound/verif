export type Verdict = "ok"|"check"|"caution"|"stop";

export type Analysis = {
  verdict: Verdict; title: string; summary: string; reasons: string[]; actions: string[];
  confidence: "faible"|"moyenne"|"élevée"; engine?: string; checkedAt?: string;
  urls?: Array<{url:string;host:string|null;rootDomain:string|null;official:string|null;findings:string[]}>;
  identity?: {claimedBrand:string|null;officialDomain:string|null;sender:string|null;senderDomain:string|null;status:string};
  evidence?: {risk:number;headers?:{from:string|null;replyTo:string|null;returnPath:string|null;receivedCount:number};urlFindings?:string[]};
  recommendation?: {scenario:string;label:string;urgency:"now"|"today"|"normal";summary:string;steps:string[];preserveEvidence:boolean;reports?:Array<{label:string;url:string}>;resource?:{label:string;url:string}};
  incidentReport?: string;
};

const OFFICIAL:Record<string,string> = {
  "service-public.fr":"Service-Public.fr","impots.gouv.fr":"impots.gouv.fr","ameli.fr":"Ameli","laposte.fr":"La Poste",
  "chronopost.fr":"Chronopost","ants.gouv.fr":"ANTS","amendes.gouv.fr":"ANTAI","cybermalveillance.gouv.fr":"Cybermalveillance.gouv.fr",
  "gouv.fr":"Gouvernement","caf.fr":"CAF","francetravail.fr":"France Travail","urssaf.fr":"Urssaf","sncf-connect.com":"SNCF Connect",
  "orange.fr":"Orange","sfr.fr":"SFR","free.fr":"Free","bouyguestelecom.fr":"Bouygues Telecom"
};
const SHORTENERS=/^(?:www\.)?(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|shorturl\.at|ow\.ly|is\.gd|goo\.gl)$/i;
const MULTI_LABEL_SUFFIXES=new Set(["co.uk","com.au","co.nz","co.jp","gouv.fr"]);

function rootDomain(host:string){
  const h=host.toLowerCase().replace(/^www\./,"");
  const p=h.split(".");
  if(p.length<2)return h;
  const suffix=p.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(suffix)&&p.length>=3?p.slice(-3).join("."):suffix;
}
function urlsIn(text:string){
  const direct=[...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>m[0].replace(/[),.;!?]+$/,""));
  const bare=[...text.matchAll(/(?:www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']+)?/gi)].map(m=>"https://"+m[0].replace(/[),.;!?]+$/,""));
  return [...new Set([...direct,...bare])];
}
function domainOf(u:string){try{return new URL(u).hostname.toLowerCase()}catch{return null}}
function officialFor(host:string){return host?OFFICIAL[rootDomain(host)]||null:null}
function similarity(a:string,b:string){
  const s=a.toLowerCase(),t=b.toLowerCase();
  const row=Array.from({length:t.length+1},(_,i)=>i);
  for(let i=1;i<=s.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=t.length;j++){const cur=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(s[i-1]===t[j-1]?0:1));prev=cur}}
  return 1-row[t.length]/Math.max(s.length,t.length,1);
}
function senderFrom(text:string){
  const m=text.match(/(?:from|de|expéditeur|sender)\s*:\s*(?:[^<\n]*<)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?:>)?/i)||text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if(!m)return null;
  const email=m[1]||m[0],domain=email.split("@")[1]?.toLowerCase()||null;
  return{email,domain,rootDomain:domain?rootDomain(domain):null};
}
function headersFrom(text:string){
  const out={from:null as string|null,replyTo:null as string|null,returnPath:null as string|null,received:0};
  for(const line of text.split(/\r?\n/)){const f=line.match(/^\s*(From|De|Expéditeur)\s*:\s*(.+)$/i);if(f)out.from=f[2].trim();const r=line.match(/^\s*(Reply-To|Répondre à)\s*:\s*(.+)$/i);if(r)out.replyTo=r[2].trim();const p=line.match(/^\s*Return-Path\s*:\s*(.+)$/i);if(p)out.returnPath=p[1].trim();if(/^\s*Received\s*:/i.test(line))out.received++}
  return out;
}
function scenario(text:string){
  if(/colis|livraison|chronopost|la poste|mondial relay|dpd|ups|dhl|frais de livraison/i.test(text))return "delivery_phishing";
  if(/banque|carte bancaire|virement|iban|rib|cvv|cryptogramme|sécurité bancaire|crédit/i.test(text))return "banking_fraud";
  if(/remboursement|remboursé|rembourser|trop[- ]perçu|indemnité/i.test(text))return "refund_scam";
  if(/mot de passe|connexion|identifiant|compte|double authentification|code de sécurité|otp/i.test(text))return "account_takeover";
  if(/télécharger|download|apk|fichier|installer/i.test(text))return "malware_download";
  if(/impôt|impots|amende|caf|urssaf|france travail|service[- ]public|administration/i.test(text))return "administrative_phishing";
  return "generic_phishing";
}
function recommendation(s:string){
  const map:any={banking_fraud:["Fraude bancaire","now","Ne réponds pas au message. Contacte ta banque uniquement via son application ou son numéro officiel.",["N’utilise pas le lien reçu.","Contacte ta banque par un canal officiel.","Conserve le message et les preuves."],"https://www.cybermalveillance.gouv.fr/"],delivery_phishing:["Fausse livraison","today","Vérifie la livraison directement depuis le site ou l’application officielle du transporteur.",["N’utilise pas le lien reçu.","Vérifie le suivi depuis le site officiel.","Ne paie aucun frais depuis le message."],"https://17cyber.gouv.fr/"],account_takeover:["Tentative de prise de compte","now","Ne communique aucun code. Accède directement au service concerné depuis son application ou son site officiel.",["Ne saisis aucun code ou mot de passe via le message.","Change le mot de passe depuis le site officiel si tu l’as communiqué.","Active la double authentification."],"https://17cyber.gouv.fr/"],refund_scam:["Faux remboursement","today","Vérifie tout remboursement depuis ton compte officiel avant toute action.",["Ne fournis aucune donnée bancaire depuis le message.","Contacte l’organisme via ses coordonnées officielles.","Conserve les preuves."],"https://17cyber.gouv.fr/"],malware_download:["Téléchargement suspect","now","N’ouvre pas le fichier et n’installe rien depuis ce message.",["N’ouvre pas le fichier.","Si une application a été installée, fais vérifier l’appareil.","Conserve l’URL et le message."],"https://17cyber.gouv.fr/"],administrative_phishing:["Hameçonnage administratif","today","Vérifie la démarche directement sur le site officiel de l’administration.",["N’utilise pas le lien reçu.","Tape toi-même l’adresse officielle.","Ne communique aucun code ou mot de passe."],"https://www.cybermalveillance.gouv.fr/"],generic_phishing:["Message suspect","today","Vérifie l’information indépendamment avant toute action.",["N’utilise pas le lien reçu si tu n’es pas certain de sa destination.","Contacte l’organisme par un canal officiel.","Conserve les preuves utiles."],"https://17cyber.gouv.fr/"]};
  const v=map[s]||map.generic_phishing;
  return{scenario:s,label:v[0],urgency:v[1],summary:v[2],steps:v[3],preserveEvidence:true,resource:{label:"Obtenir de l’aide sur 17Cyber",url:v[4]}};
}

export function analyzeText(input:string):Analysis{
  const text=input.trim(),lower=text.toLowerCase(),checkedAt=new Date().toISOString();
  if(!text)return{verdict:"check",title:"À vérifier",summary:"Ajoute un message, un lien ou un contenu à analyser.",reasons:[],actions:["Ajoute le contenu à vérifier."],confidence:"faible",engine:"VÉRIF local",checkedAt};
  const reasons:string[]=[],foundUrls=urlsIn(text),sender=senderFrom(text),headers=headersFrom(text);
  const urlData=foundUrls.map(url=>{
    const host=domainOf(url),root=host?rootDomain(host):null,official=officialFor(host||""),findings:string[]=[];
    if(host){
      if(official)findings.push("Domaine officiel reconnu : "+official);
      try{
        const u=new URL(url);
        if(u.protocol!=="https:")findings.push("Le lien n’utilise pas HTTPS.");
        if(SHORTENERS.test(host))findings.push("Lien raccourci : la destination réelle est masquée.");
        if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))findings.push("Le lien utilise directement une adresse IP.");
        if(host.includes("xn--"))findings.push("Le domaine utilise une représentation internationale potentiellement trompeuse.");
        if(u.username||u.password)findings.push("L’URL contient des informations avant le domaine.");
        if(u.port&&u.port!=="80"&&u.port!=="443")findings.push("Le lien utilise un port réseau inhabituel.");
        if(/[?&](redirect|url|target|dest|continue|next)=/i.test(u.search))findings.push("Le lien contient un paramètre de redirection.");
      }catch{}
    }
    return{url,host,rootDomain:root,official,findings};
  });

  let risk=0;
  const finance=/paiement|payez|payer|virement|carte bancaire|iban|rib|frais|\b\d+[,.]?\d+\s*€|cvv|cryptogramme/i.test(lower);
  const urgency=/urgent|immédiat|immédiatement|dans\s+\d+\s*(?:min|minute|h|heure|jour)|dernière chance|dernier avertissement|suspendu|bloqué|sera clôturé/i.test(lower);
  const credentials=/mot de passe|identifiant|connexion|code de sécurité|code de vérification|otp|double authentification|numéro de carte|cvv|cryptogramme/i.test(lower);
  const cta=/cliquez|clique|connectez-vous|ouvrez le lien|confirmez|régularisez|payez|mettez à jour|vérifiez votre compte/i.test(lower);
  const delivery=/colis|livraison|chronopost|la poste|mondial relay|dpd|ups|dhl|frais de livraison/i.test(lower);
  const admin=/impôt|impots|amende|caf|ameli|france travail|urssaf|service[- ]public|administration/i.test(lower);
  const download=/télécharger|download|apk|installer|fichier/i.test(lower);
  const refund=/remboursement|remboursé|rembourser|trop[- ]perçu|indemnité/i.test(lower);

  if(finance){reasons.push("Le contenu évoque un paiement, des frais ou des données bancaires.");risk+=2}
  if(urgency){reasons.push("Le contenu crée une pression temporelle ou une menace de blocage.");risk+=2}
  if(credentials){reasons.push("Le contenu demande ou évoque des informations d’authentification ou de sécurité.");risk+=2}
  if(cta){reasons.push("Le contenu incite à effectuer une action depuis le message.");risk+=1}

  for(const f of urlData.flatMap(u=>u.findings).filter(f=>!/Domaine officiel reconnu/i.test(f))){
    reasons.push(f);
    risk+=/Lien raccourci|redirection/i.test(f)?2:/adresse IP|représentation internationale|informations avant|port réseau/i.test(f)?3:2;
  }

  const claimed=(Object.entries(OFFICIAL) as Array<[string,string]>).find(([domain,name])=>[name,domain,domain.split(".")[0]].some(a=>lower.includes(a.toLowerCase())));
  const identity={claimedBrand:claimed?.[1]||null,officialDomain:claimed?.[0]||null,sender:sender?.email||null,senderDomain:sender?.rootDomain||null,status:"unknown"};
  if(claimed&&sender?.rootDomain){
    if(sender.rootDomain===claimed[0])identity.status="official";
    else{
      const sim=similarity(sender.rootDomain,claimed[0]);
      identity.status=sim>=0.72?"lookalike":"mismatch";
      reasons.push("L’expéditeur détecté ne correspond pas au domaine officiel attendu.");
      risk+=identity.status==="lookalike"?3:2;
    }
  }else if(claimed&&!sender){
    reasons.push("L’organisme cité ne peut pas être confirmé par une adresse d’expéditeur.");
    risk+=1;
  }

  if(claimed&&foundUrls.length&&!urlData.some(u=>u.rootDomain===claimed[0])){
    reasons.push("Le message cite un organisme mais aucun lien ne correspond à son domaine officiel.");
    risk+=3;
  }
  for(const u of urlData){
    if(u.rootDomain&&!u.official){
      const near=Object.keys(OFFICIAL).filter(d=>d.length>=8).map(d=>({d,score:similarity(u.rootDomain!,d)})).sort((a,b)=>b.score-a.score)[0];
      if(near&&near.score>=0.72){
        reasons.push("Le domaine du lien ressemble à un domaine officiel sans lui correspondre.");
        risk+=3;
      }
    }
  }

  if(headers.replyTo&&sender?.email&&headers.replyTo.toLowerCase()!==sender.email.toLowerCase()){
    reasons.push("Le champ Reply-To diffère de l’expéditeur détecté.");
    risk+=2;
  }

  if(foundUrls.length&&finance&&urgency)risk+=2;
  if(foundUrls.length&&credentials&&urgency)risk+=2;
  if(foundUrls.length&&(delivery||admin)&&(finance||credentials||cta))risk+=2;
  if(download&&foundUrls.length)risk+=3;
  if(foundUrls.length&&urlData.some(u=>u.findings.some(f=>/redirection/i.test(f))))risk+=2;
  if(foundUrls.length&&refund&&cta){risk+=5; reasons.push("Le message associe un remboursement à une action via un lien.");}

  const hasOfficialUrl=foundUrls.length>0&&urlData.every(u=>u.official);
  if(hasOfficialUrl&&!urgency&&!credentials&&!urlData.some(u=>u.findings.some(f=>!/Domaine officiel reconnu/i.test(f)))){
    risk=Math.max(0,risk-2);
  }

  const verdict:Verdict=risk>=6?"stop":risk>=3?"caution":risk>=1?"check":"ok";
  const rec=recommendation(scenario(text));
  const title=verdict==="stop"?"N’agis pas tout de suite":verdict==="caution"?"Prudence":verdict==="check"?"À vérifier":"Aucun signal évident détecté";
  const summary=verdict==="stop"?"Plusieurs signaux forts sont compatibles avec une tentative de fraude.":verdict==="caution"?"Plusieurs éléments méritent une vérification indépendante.":verdict==="check"?"Un élément mérite une vérification avant d’agir.":"Aucun signal évident de fraude n’a été détecté dans le contenu fourni.";
  const actions=verdict==="stop"?["N’utilise pas le lien reçu.","Ouvre toi-même le site ou l’application officielle.","Ne communique aucun code, mot de passe ou donnée bancaire."]:verdict==="caution"?["N’agis pas depuis le message.","Vérifie l’organisme par un canal indépendant."]:verdict==="check"?["Vérifie l’information depuis la source officielle avant d’agir."]:["Si le message est inattendu, vérifie quand même la source officielle.","Ne communique jamais un code ou un mot de passe simplement parce qu’un message le demande."];
  const base:any={verdict,title,summary,reasons:reasons.length?reasons:["Aucun signal de risque évident n’a été détecté."],actions,confidence:verdict==="stop"?"élevée":verdict==="ok"?"faible":"moyenne",engine:"VÉRIF local",checkedAt,urls:urlData,identity:(sender||claimed)?identity:undefined,evidence:{risk,headers:{from:headers.from,replyTo:headers.replyTo,returnPath:headers.returnPath,receivedCount:headers.received},urlFindings:urlData.flatMap(u=>u.findings)}};
  if(verdict==="ok")return base;
  const incidentReport=["VÉRIF — DOSSIER D’INCIDENT","","Date d’analyse : "+checkedAt,"Verdict : "+verdict.toUpperCase(),"Scénario : "+rec.label,"","RÉSUMÉ",summary,"","SIGNAUX",...base.reasons.map((r:string)=>"- "+r),...(foundUrls.length?["","URL",...foundUrls]:[])].join("\n");
  return {...base,recommendation:rec,incidentReport};
}