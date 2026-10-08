import { registeredDomain } from './domain';
import { activeContent } from './context';
export type Verdict = "ok"|"check"|"caution"|"stop";

export type Analysis = {
  verdict: Verdict;
  title: string;
  summary: string;
  reasons: string[];
  actions: string[];
  confidence: "faible"|"moyenne"|"élevée";
  engine?: string;
  checkedAt?: string;
  urls?: Array<{url:string;host:string|null;rootDomain:string|null;official:string|null;findings:string[]}>;
  identity?: {claimedBrand:string|null;officialDomain:string|null;sender:string|null;senderDomain:string|null;status:string};
  evidence?: {risk:number;headers?:{from:string|null;replyTo:string|null;returnPath:string|null;receivedCount:number};urlFindings?:string[]};
  recommendation?: {scenario:string;label:string;urgency:"now"|"today"|"normal";summary:string;steps:string[];preserveEvidence:boolean;channel?:string;reports?:Array<{label:string;url:string}>;resource?:{label:string;url:string}};
  incidentReport?: string;
};

type RegistryEntry={name:string;domain:string;aliases:string[]};

const REGISTRY:RegistryEntry[]=[
  {name:"Service-Public.fr",domain:"service-public.fr",aliases:["service public","service-public"]},
  {name:"impots.gouv.fr",domain:"impots.gouv.fr",aliases:["impots","impôt","impôts","dgfip","finances publiques"]},
  {name:"Ameli",domain:"ameli.fr",aliases:["ameli","assurance maladie","cpam"]},
  {name:"La Poste",domain:"laposte.fr",aliases:["la poste"]},
  {name:"Chronopost",domain:"chronopost.fr",aliases:["chronopost"]},
  {name:"Colissimo",domain:"laposte.fr",aliases:["colissimo"]},
  {name:"Mondial Relay",domain:"mondialrelay.fr",aliases:["mondial relay"]},
  {name:"DPD",domain:"dpd.fr",aliases:["dpd"]},
  {name:"DHL",domain:"dhl.com",aliases:["dhl"]},
  {name:"UPS",domain:"ups.com",aliases:["ups"]},
  {name:"FedEx",domain:"fedex.com",aliases:["fedex"]},
  {name:"ANTS",domain:"ants.gouv.fr",aliases:["ants","agence nationale des titres sécurisés"]},
  {name:"ANTAI",domain:"antai.gouv.fr",aliases:["antai","amendes.gouv.fr","amende"]},
  {name:"Cybermalveillance.gouv.fr",domain:"cybermalveillance.gouv.fr",aliases:["cybermalveillance"]},
  {name:"17Cyber",domain:"17cyber.gouv.fr",aliases:["17cyber"]},
  {name:"CAF",domain:"caf.fr",aliases:["caf","caisse d'allocations familiales"]},
  {name:"France Travail",domain:"francetravail.fr",aliases:["france travail","francetravail","pôle emploi","pole emploi"]},
  {name:"Urssaf",domain:"urssaf.fr",aliases:["urssaf"]},
  {name:"SNCF Connect",domain:"sncf-connect.com",aliases:["sncf connect","sncf"]},
  {name:"Orange",domain:"orange.fr",aliases:["orange"]},
  {name:"SFR",domain:"sfr.fr",aliases:["sfr"]},
  {name:"Free",domain:"free.fr",aliases:["free"]},
  {name:"Bouygues Telecom",domain:"bouyguestelecom.fr",aliases:["bouygues telecom","bouygues"]},
  {name:"EDF",domain:"edf.fr",aliases:["edf"]},
  {name:"Engie",domain:"engie.com",aliases:["engie"]},
  {name:"TotalEnergies",domain:"totalenergies.fr",aliases:["totalenergies","total energies"]},
  {name:"BNP Paribas",domain:"mabanque.bnpparibas",aliases:["bnp paribas","bnp"]},
  {name:"Crédit Agricole",domain:"credit-agricole.fr",aliases:["credit agricole","crédit agricole"]},
  {name:"Société Générale",domain:"societegenerale.fr",aliases:["societe generale","société générale"]},
  {name:"La Banque Postale",domain:"labanquepostale.fr",aliases:["la banque postale"]},
  {name:"LCL",domain:"lcl.fr",aliases:["lcl"]},
  {name:"Boursobank",domain:"boursobank.com",aliases:["boursobank","boursorama"]},
  {name:"Caisse d'Épargne",domain:"caisse-epargne.fr",aliases:["caisse d'epargne","caisse d’épargne"]},
  {name:"Carrefour",domain:"carrefour.fr",aliases:["carrefour"]},
  {name:"Amazon",domain:"amazon.fr",aliases:["amazon"]},
  {name:"PayPal",domain:"paypal.com",aliases:["paypal"]},
  {name:"Netflix",domain:"netflix.com",aliases:["netflix"]},
  {name:"Microsoft",domain:"microsoft.com",aliases:["microsoft"]},
  {name:"Apple",domain:"apple.com",aliases:["apple","icloud"]},
  {name:"Google",domain:"google.com",aliases:["google"]},
  {name:"Meta",domain:"meta.com",aliases:["meta","facebook","instagram","whatsapp"]},
  {name:"Leboncoin",domain:"leboncoin.fr",aliases:["leboncoin"]},
  {name:"Vinted",domain:"vinted.fr",aliases:["vinted"]}
];

const SHORTENERS=/^(?:www\.)?(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|shorturl\.at|ow\.ly|is\.gd|goo\.gl|rb\.gy|rebrand\.ly)$/i;
const MULTI_LABEL_SUFFIXES=new Set(["co.uk","com.au","co.nz","co.jp","gouv.fr"]);
const FREE_MAIL=/^(?:gmail\.com|outlook\.com|hotmail\.com|live\.com|yahoo\.fr|yahoo\.com|orange\.fr|sfr\.fr|free\.fr)$/i;
const SAFE_DOMAINS=new Set(["example.com","example.org","example.net"]);
const EXEC_EXT=/\.(?:exe|msi|scr|bat|cmd|com|ps1|vbs|vbe|js|jse|hta|jar|apk|dmg|pkg)(?:$|[?#])/i;
const AMBIGUOUS_ALIASES=new Set(["free","orange","meta","apple","google","amazon"]);

function rootDomain(host:string){
  const h=host.toLowerCase().replace(/^www\./,"").replace(/\.$/,"");
  const p=h.split(".").filter(Boolean);
  if(p.length<2)return h;
  const suffix=p.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(suffix)&&p.length>=3?p.slice(-3).join("."):registeredDomain(h);
}
function urlsIn(text:string){
  const direct=[...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>m[0].replace(/[),.;!?]+$/,""));
  const scrubbed=text.replace(/https?:\/\/[^\s<>"']+/gi," ");
  const www=[...scrubbed.matchAll(/(?:www\.)[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s<>"']*)?/gi)].map(m=>"https://"+m[0].replace(/[),.;!?]+$/,""));
  const naked=[...scrubbed.matchAll(/(?<![@\p{L}\p{N}])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:\/[^\s<>"']*)?/giu)]
    .map(m=>m[0].replace(/[),.;!?]+$/,""))
    .filter(v=>!v.toLowerCase().startsWith("www."));
  return [...new Set([...direct,...www,...naked.map(v=>"https://"+v)].map(v=>v.replace(/&amp;/gi,"&")))];
}
function domainOf(u:string){try{return new URL(u).hostname.toLowerCase()}catch{return null}}
function officialFor(host:string){const h=host.toLowerCase().replace(/\.$/,"");return REGISTRY.find(e=>e.domain===h||h.endsWith('.'+e.domain))?.name||null}
function entryForName(name:string){const n=name.toLowerCase();return REGISTRY.find(e=>e.name.toLowerCase()===n)||null}
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
  for(const line of text.split(/\r?\n/)){
    const f=line.match(/^\s*(From|De|Expéditeur)\s*:\s*(.+)$/i);if(f)out.from=f[2].trim();
    const r=line.match(/^\s*(Reply-To|Répondre à)\s*:\s*(.+)$/i);if(r)out.replyTo=r[2].trim();
    const p=line.match(/^\s*Return-Path\s*:\s*(.+)$/i);if(p)out.returnPath=p[1].trim();
    if(/^\s*Received\s*:/i.test(line))out.received++;
  }
  return out;
}
function claimedEntry(text:string){
  const lower=text.toLowerCase();
  const brandContext=/compte|espace client|facture|abonnement|support|sécurité|connexion|paiement|service|application|client|livraison|commande|banque|assurance/i.test(lower);
  const escapeRegex=(value:string)=>value.replace(/[.*+?^$()|[\]{}]/g,"\\$&");
  const scored: Array<{e:RegistryEntry;score:number}> = [];
  for(const e of REGISTRY){
    for(const alias of e.aliases){
      const re=new RegExp("(?<![\\p{L}\\p{N}])"+escapeRegex(alias)+"(?![\\p{L}\\p{N}])","iu");
      if(!re.test(lower))continue;
      if(AMBIGUOUS_ALIASES.has(alias.toLowerCase())&&!brandContext&&!lower.includes(alias.toLowerCase()+"."))continue;
      const score=alias.length+(alias.includes(" ")?4:0)+(lower.includes(e.domain)?8:0);
      scored.push({e,score});
    }
  }
  scored.sort((a,b)=>b.score-a.score);
  return scored[0]?.e||null;
}
function scenario(text:string){
  const l=text.toLowerCase();
  if(/colis|livraison|chronopost|colissimo|la poste|mondial relay|dpd|ups|dhl|fedex|frais de livraison/.test(l))return "delivery_phishing";
  if(/banque|carte bancaire|virement|iban|rib|cvv|cryptogramme|sécurité bancaire|crédit/.test(l))return "banking_fraud";
  if(/remboursement|remboursé|rembourser|trop[- ]perçu|indemnité/.test(l))return "refund_scam";
  if(/mot de passe|connexion|identifiant|compte|double authentification|code de sécurité|otp/.test(l))return "account_takeover";
  if(/télécharger|download|apk|installer|pièce jointe|fichier/.test(l))return "malware_download";
  if(/impôt|impots|amende|caf|ameli|france travail|urssaf|service[- ]public|administration|ants/.test(l))return "administrative_phishing";
  return "generic_phishing";
}
function recommendation(s:string){
  const map:Record<string,[string,"now"|"today"|"normal",string,string[],string]> = {
    banking_fraud:["Fraude bancaire","now","Ne réponds pas au message. Contacte ta banque uniquement via son application ou son numéro officiel.",["N’utilise pas le lien reçu.","Contacte ta banque par un canal officiel.","Conserve le message et les preuves."],"https://www.cybermalveillance.gouv.fr/"],
    delivery_phishing:["Fausse livraison","today","Vérifie la livraison directement depuis le site ou l’application officielle du transporteur.",["N’utilise pas le lien reçu.","Vérifie le suivi depuis le site officiel.","Ne paie aucun frais depuis le message."],"https://17cyber.gouv.fr/"],
    account_takeover:["Tentative de prise de compte","now","Ne communique aucun code. Accède directement au service concerné depuis son application ou son site officiel.",["Ne saisis aucun code ou mot de passe via le message.","Change le mot de passe depuis le site officiel si tu l’as communiqué.","Active la double authentification."],"https://17cyber.gouv.fr/"],
    refund_scam:["Faux remboursement","today","Vérifie tout remboursement depuis ton compte officiel avant toute action.",["Ne fournis aucune donnée bancaire depuis le message.","Contacte l’organisme via ses coordonnées officielles.","Conserve les preuves."],"https://17cyber.gouv.fr/"],
    malware_download:["Téléchargement suspect","now","N’ouvre pas le fichier et n’installe rien depuis ce message.",["N’ouvre pas le fichier.","Si une application a été installée, fais vérifier l’appareil.","Conserve l’URL et le message."],"https://17cyber.gouv.fr/"],
    administrative_phishing:["Hameçonnage administratif","today","Vérifie la démarche directement sur le site officiel de l’administration.",["N’utilise pas le lien reçu.","Tape toi-même l’adresse officielle.","Ne communique aucun code ou mot de passe."],"https://www.cybermalveillance.gouv.fr/"],
    generic_phishing:["Message suspect","today","Vérifie l’information indépendamment avant toute action.",["N’utilise pas le lien reçu si tu n’es pas certain de sa destination.","Contacte l’organisme par un canal officiel.","Conserve les preuves utiles."],"https://17cyber.gouv.fr/"]
  };
  const v=map[s]||map.generic_phishing;
  return{scenario:s,label:v[0],urgency:v[1],summary:v[2],steps:v[3],preserveEvidence:true,resource:{label:"Obtenir de l’aide sur 17Cyber",url:v[4]}};
}

export function analyzeText(input:string):Analysis{
  const text=input.trim(),lower=activeContent(text),checkedAt=new Date().toISOString();
  if(!text)return{verdict:"check",title:"À vérifier",summary:"Ajoute un message, un lien ou un contenu à analyser.",reasons:[],actions:["Ajoute le contenu à vérifier."],confidence:"faible",engine:"VÉRIF local",checkedAt};

  const reasons:string[]=[];
  const foundUrls=urlsIn(text);
  const sender=senderFrom(text);
  const headers=headersFrom(text);
  const claimed=claimedEntry(text);

  const urlData=foundUrls.map(url=>{
    const host=domainOf(url),root=host?rootDomain(host):null,official=host?officialFor(host):null,findings:string[]=[];
    if(host){
      try{
        const u=new URL(url);
        if(u.protocol!=="https:")findings.push("Le lien n’utilise pas HTTPS.");
        if(SHORTENERS.test(host))findings.push("Lien raccourci : la destination réelle est masquée.");
        if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))findings.push("Le lien utilise directement une adresse IP.");
        if(host.includes("xn--"))findings.push("Le domaine utilise une représentation internationale potentiellement trompeuse.");
        if(/[\u200B-\u200D\u2060\uFEFF]/.test(url))findings.push("L’URL contient des caractères invisibles.");
        if(u.username||u.password)findings.push("L’URL contient des informations avant le domaine.");
        if(u.port&&u.port!=="80"&&u.port!=="443")findings.push("Le lien utilise un port réseau inhabituel.");
        if(/[?&](redirect|url|target|dest|continue|next|return|redirect_uri)=/i.test(u.search))findings.push("Le lien contient un paramètre de redirection.");
        if(EXEC_EXT.test(u.pathname))findings.push("Le lien pointe vers un fichier ou paquet potentiellement exécutable.");
        if(u.hostname.split(".").length>=5)findings.push("Le domaine comporte un nombre inhabituellement élevé de sous-domaines.");
      }catch{findings.push("Le lien n’a pas pu être interprété comme une URL valide.");}
    }
    return{url,host,rootDomain:root,official,findings};
  });

  let risk=0;
  const finance=/paiement|payez|payer|virement|carte bancaire|iban|rib|frais|(?:\b\d{1,6}(?:[.,]\d{1,2})?\s*(?:€|eur)(?!\w))|cvv|cryptogramme/i.test(lower);
  const urgency=/urgent|urgence|immédiat|immédiatement|dans\s+\d+\s*(?:min|minute|h|heure|jour)|dernière chance|dernier avertissement|suspendu|bloqué|sera clôturé|expir/i.test(lower);
  const credentials=/mot de passe|identifiant|connexion|code de sécurité|code de vérification|otp|double authentification|numéro de carte|cvv|cryptogramme/i.test(lower);
  const cta=/cliquez|clique|connectez-vous|ouvrez le lien|confirmez|régularisez|payez|mettez à jour|vérifiez votre compte|consultez le lien/i.test(lower);
  const delivery=/colis|livraison|chronopost|colissimo|la poste|mondial relay|dpd|ups|dhl|fedex|frais de livraison/i.test(lower);
  const admin=/impôt|impots|amende|caf|ameli|france travail|urssaf|service[- ]public|administration|ants/i.test(lower);
  const download=/télécharg(?:er|ez|ement)|telecharg(?:er|ez|ement)|download|apk|install(?:er|ez|ation)|pièce jointe|fichier/i.test(lower);
  const refund=/remboursement|remboursé|rembourser|trop[- ]perçu|indemnité/i.test(lower);
  const phone=/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/.test(text);

  if(/(?:javascript\s*:|data\s*:\s*text\/html)/i.test(text)){reasons.push("Le contenu contient un schéma d’URL pouvant exécuter ou embarquer du contenu actif.");risk+=5}
  if(/\bintent:\/\//i.test(text)){reasons.push("Le contenu contient un lien profond Android qui peut ouvrir directement une application.");risk+=2}
  if(finance){reasons.push("Le contenu évoque un paiement, des frais ou des données bancaires.");risk+=2}
  if(urgency){reasons.push("Le contenu crée une pression temporelle ou une menace de blocage.");risk+=2}
  if(credentials){reasons.push("Le contenu demande ou évoque des informations d’authentification ou de sécurité.");risk+=2}
  if(/(?:communique|transmets|envoie|partage|donne).{0,50}(?:code|otp)|(?:code|otp).{0,50}(?:communique|transmets|envoie|partage|donne)/i.test(lower)){reasons.push("Le message demande explicitement de transmettre un code de sécurité ou à usage unique.");risk+=4}
  if(cta){reasons.push("Le contenu incite à effectuer une action depuis le message.");risk+=1}
  if(download){reasons.push("Le contenu évoque un téléchargement, une installation ou un fichier.");risk+=1}
  if(phone&&/sms|message|code|clique/i.test(lower)){reasons.push("Le contenu ressemble à une sollicitation reçue par SMS ou message.");}

  for(const f of new Set(urlData.flatMap(u=>u.findings))){
    reasons.push(f);
    risk+=/représentation internationale|informations avant|port réseau|caractères invisibles|exécutable|nombre inhabituellement|URL valide/i.test(f)?3:/adresse IP/i.test(f)?2:/Lien raccourci|redirection/i.test(f)?2:2;
  }

  const identity={claimedBrand:claimed?.name||null,officialDomain:claimed?.domain||null,sender:sender?.email||null,senderDomain:sender?.rootDomain||null,status:"unknown"};

  if(claimed&&sender?.rootDomain){
    if(sender.rootDomain===claimed.domain)identity.status="official";
    else{
      const sim=similarity(sender.rootDomain,claimed.domain);
      identity.status=sim>=0.72?"lookalike":"mismatch";
      reasons.push(identity.status==="lookalike"?"L’adresse de l’expéditeur ressemble au domaine officiel sans lui correspondre.":"L’expéditeur détecté ne correspond pas au domaine officiel attendu.");
      risk+=identity.status==="lookalike"?3:2;
    }
  }else if(claimed&&!sender){
    if(foundUrls.length===0&&/urgent|clique|confirme|payez|mot de passe|code/i.test(lower)){reasons.push("L’organisme cité ne peut pas être confirmé par une adresse d’expéditeur.");risk+=1}
  }

  if(sender&&FREE_MAIL.test(sender.rootDomain||"")&&claimed&&sender.rootDomain!==claimed.domain){
    reasons.push("L’expéditeur utilise une messagerie grand public alors qu’il se présente comme un organisme.");
    risk+=2;
  }

  if(claimed&&foundUrls.length&&!urlData.some(u=>u.rootDomain===claimed.domain)){
    reasons.push("Le message cite un organisme mais aucun lien ne correspond à son domaine officiel.");
    risk+=4;
  }

  for(const u of urlData){
    if(u.rootDomain&&!u.official&&!SAFE_DOMAINS.has(u.rootDomain)){
      const near=REGISTRY.filter(e=>e.domain.length>=8).map(e=>({e,score:similarity(u.rootDomain!,e.domain)})).sort((a,b)=>b.score-a.score)[0];
      if(near&&near.score>=0.72&&near.e.domain!==u.rootDomain){
        reasons.push("Le domaine du lien ressemble à un domaine officiel sans lui correspondre.");
        risk+=3;
      }
    }
  }

  if(headers.replyTo&&sender?.email&&(headers.replyTo.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||headers.replyTo).toLowerCase()!==sender.email.toLowerCase()){
    reasons.push("Le champ Reply-To diffère de l’expéditeur détecté.");
    risk+=2;
  }
  if(headers.returnPath&&sender?.domain&&headers.returnPath.toLowerCase().includes("@")){
    const rp=headers.returnPath.match(/@([a-z0-9.-]+)/i)?.[1]?.toLowerCase();
    if(rp&&rootDomain(rp)!==sender.rootDomain){reasons.push("Le Return-Path ne correspond pas au domaine de l’expéditeur.");risk+=2}
  }
  for(const m of text.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"'<>\s]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)){
    const href=m[1],visible=m[2].replace(/<[^>]+>/g," ").trim();
    const visibleUrl=urlsIn(visible)[0];
    if(visibleUrl){
      const hrefHost=domainOf(href),visibleHost=domainOf(visibleUrl);
      if(hrefHost&&visibleHost&&rootDomain(hrefHost)!==rootDomain(visibleHost)){
        reasons.push("Le texte affiché d’un lien ne correspond pas à sa destination réelle.");
        risk+=6;
      }
    }
  }


  if(foundUrls.length&&finance&&urgency)risk+=2;
  if(foundUrls.length&&credentials&&urgency)risk+=2;
  if(foundUrls.length&&(delivery||admin)&&(finance||credentials))risk+=2;
  if(download&&foundUrls.length)risk+=3;
  if(foundUrls.length&&urlData.some(u=>u.findings.some(f=>/redirection/i.test(f))))risk+=2;
  if(foundUrls.length&&refund&&cta){risk+=5;reasons.push("Le message associe un remboursement à une action via un lien.");}
  if(urlData.some(u=>u.findings.some(f=>/exécutable/i.test(f)))&&download)risk+=2;

  const hasOfficialUrl=foundUrls.length>0&&urlData.every(u=>u.official);
  const hasDangerousUrl=urlData.some(u=>u.findings.some(f=>!/Domaine officiel reconnu/i.test(f)));
  if(hasOfficialUrl&&!urgency&&!credentials&&!finance&&!cta&&!download&&!refund&&!hasDangerousUrl)risk=0;

  const verdict:Verdict=risk>=6?"stop":risk>=3?"caution":risk>=1?"check":"ok";
  const title=verdict==="stop"?"N’agis pas tout de suite":verdict==="caution"?"Prudence":verdict==="check"?"À vérifier":"Aucun signal évident détecté";
  const summary=verdict==="stop"?"Plusieurs signaux forts sont compatibles avec une tentative de fraude.":verdict==="caution"?"Plusieurs éléments méritent une vérification indépendante.":verdict==="check"?"Un élément mérite une vérification avant d’agir.":"Aucun signal évident de fraude n’a été détecté dans le contenu fourni.";
  const actions=verdict==="stop"?["N’utilise pas le lien reçu.","Ouvre toi-même le site ou l’application officielle.","Ne communique aucun code, mot de passe ou donnée bancaire."]:verdict==="caution"?["N’agis pas depuis le message.","Vérifie l’organisme par un canal indépendant.","En cas de doute, ne paie rien et ne communique aucun code."]:verdict==="check"?["Vérifie l’information depuis la source officielle avant d’agir."]:["Si le message est inattendu, vérifie quand même la source officielle.","Ne communique jamais un code ou un mot de passe simplement parce qu’un message le demande."];
  const confidence=verdict==="stop"?"élevée":verdict==="ok"?"faible":"moyenne";
  const base:Analysis={verdict,title,summary,reasons:reasons.length?Array.from(new Set(reasons)):["Aucun signal de risque évident n’a été détecté."],actions,confidence,engine:"VÉRIF local",checkedAt,urls:urlData,identity:(sender||claimed)?identity:undefined,evidence:{risk,headers:{from:headers.from,replyTo:headers.replyTo,returnPath:headers.returnPath,receivedCount:headers.received},urlFindings:urlData.flatMap(u=>u.findings)}};
  if(verdict==="ok")return base;
  const rec=recommendation(scenario(text));
  const incidentReport=["VÉRIF — DOSSIER D’INCIDENT","","Date d’analyse : "+checkedAt,"Verdict : "+verdict.toUpperCase(),"Scénario : "+rec.label,"Score de risque : "+risk,"","RÉSUMÉ",summary,"","SIGNAUX",...base.reasons.map(r=>"- "+r),...(sender?["","EXPÉDITEUR",sender.email]:[]),...(foundUrls.length?["","LIENS DÉTECTÉS",...foundUrls]:[])].join("\n");
  return {...base,recommendation:rec,incidentReport};
}

export function refreshIncident<T extends Analysis>(result:T):T{
  if(result.verdict==='ok')return result;
  const rec=result.recommendation||recommendation('generic_phishing');
  return {...result,recommendation:rec,incidentReport:["VÉRIF — DOSSIER D’INCIDENT",`Date : ${result.checkedAt||new Date().toISOString()}`,`Verdict : ${result.verdict.toUpperCase()}`,`Score de risque : ${result.evidence?.risk??0}`,"",result.summary,"",...result.reasons.map(r=>'- '+r)].join('\n')};
}
