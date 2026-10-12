import { plausibleNakedHost, registeredDomain } from './domain';
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

// `domain` is the reference domain shown to the user; `also` lists other domains owned by the same organisation.
type RegistryEntry={name:string;domain:string;aliases:string[];also?:string[]};

const REGISTRY:RegistryEntry[]=[
  {name:"Service-Public.fr",domain:"service-public.fr",aliases:["service public","service-public"]},
  {name:"impots.gouv.fr",domain:"impots.gouv.fr",aliases:["impots","impôt","impôts","dgfip","finances publiques"],also:["finances.gouv.fr"]},
  {name:"Ameli",domain:"ameli.fr",aliases:["ameli","assurance maladie","cpam","carte vitale"]},
  {name:"Mon Compte Formation",domain:"moncompteformation.gouv.fr",aliases:["mon compte formation","moncompteformation","cpf","compte personnel de formation"]},
  {name:"Crit’Air",domain:"certificat-air.gouv.fr",aliases:["crit'air","crit’air","critair","vignette crit"]},
  {name:"La Poste",domain:"laposte.fr",aliases:["la poste"]},
  {name:"Chronopost",domain:"chronopost.fr",aliases:["chronopost"]},
  {name:"Colissimo",domain:"laposte.fr",aliases:["colissimo"]},
  {name:"Mondial Relay",domain:"mondialrelay.fr",aliases:["mondial relay"]},
  {name:"DPD",domain:"dpd.fr",aliases:["dpd"],also:["dpd.com"]},
  {name:"DHL",domain:"dhl.com",aliases:["dhl"],also:["dhl.fr"]},
  {name:"UPS",domain:"ups.com",aliases:["ups"]},
  {name:"FedEx",domain:"fedex.com",aliases:["fedex"]},
  {name:"ANTS",domain:"ants.gouv.fr",aliases:["ants","agence nationale des titres sécurisés"]},
  {name:"ANTAI",domain:"antai.gouv.fr",aliases:["antai","amendes.gouv.fr","amende"],also:["amendes.gouv.fr","stationnement.gouv.fr"]},
  {name:"Cybermalveillance.gouv.fr",domain:"cybermalveillance.gouv.fr",aliases:["cybermalveillance"]},
  {name:"17Cyber",domain:"17cyber.gouv.fr",aliases:["17cyber"]},
  {name:"CAF",domain:"caf.fr",aliases:["caf","caisse d'allocations familiales"]},
  {name:"France Travail",domain:"francetravail.fr",aliases:["france travail","francetravail","pôle emploi","pole emploi"],also:["pole-emploi.fr"]},
  {name:"Urssaf",domain:"urssaf.fr",aliases:["urssaf"]},
  {name:"SNCF Connect",domain:"sncf-connect.com",aliases:["sncf connect","sncf"],also:["sncf.com","oui.sncf"]},
  {name:"Orange",domain:"orange.fr",aliases:["orange"],also:["orange.com"]},
  {name:"SFR",domain:"sfr.fr",aliases:["sfr"]},
  {name:"Free",domain:"free.fr",aliases:["free"]},
  {name:"Bouygues Telecom",domain:"bouyguestelecom.fr",aliases:["bouygues telecom","bouygues"]},
  {name:"EDF",domain:"edf.fr",aliases:["edf"]},
  {name:"Enedis",domain:"enedis.fr",aliases:["enedis","linky"]},
  {name:"GRDF",domain:"grdf.fr",aliases:["grdf","gazpar"]},
  {name:"Engie",domain:"engie.com",aliases:["engie"],also:["engie.fr"]},
  {name:"TotalEnergies",domain:"totalenergies.fr",aliases:["totalenergies","total energies"],also:["totalenergies.com"]},
  {name:"BNP Paribas",domain:"mabanque.bnpparibas",aliases:["bnp paribas","bnp"],also:["bnpparibas"]},
  {name:"Crédit Agricole",domain:"credit-agricole.fr",aliases:["credit agricole","crédit agricole"]},
  {name:"Société Générale",domain:"societegenerale.fr",aliases:["societe generale","société générale"],also:["sg.fr"]},
  {name:"La Banque Postale",domain:"labanquepostale.fr",aliases:["la banque postale"]},
  {name:"LCL",domain:"lcl.fr",aliases:["lcl"]},
  {name:"Boursobank",domain:"boursobank.com",aliases:["boursobank","boursorama"],also:["boursorama.com"]},
  {name:"Caisse d'Épargne",domain:"caisse-epargne.fr",aliases:["caisse d'epargne","caisse d’épargne"]},
  {name:"Carrefour",domain:"carrefour.fr",aliases:["carrefour"]},
  {name:"Amazon",domain:"amazon.fr",aliases:["amazon"],also:["amazon.com"]},
  {name:"PayPal",domain:"paypal.com",aliases:["paypal"],also:["paypal.fr"]},
  {name:"Netflix",domain:"netflix.com",aliases:["netflix"]},
  {name:"Microsoft",domain:"microsoft.com",aliases:["microsoft"],also:["live.com","office.com","microsoftonline.com","outlook.com"]},
  {name:"Apple",domain:"apple.com",aliases:["apple","icloud"],also:["icloud.com"]},
  {name:"Google",domain:"google.com",aliases:["google"],also:["google.fr","youtube.com"]},
  {name:"Meta",domain:"meta.com",aliases:["meta","facebook","instagram","whatsapp"],also:["facebook.com","instagram.com","whatsapp.com","messenger.com","fb.com"]},
  {name:"Leboncoin",domain:"leboncoin.fr",aliases:["leboncoin"]},
  {name:"Vinted",domain:"vinted.fr",aliases:["vinted"],also:["vinted.com"]},
  {name:"Doctolib",domain:"doctolib.fr",aliases:["doctolib"]},
  // gouv.fr is reserved to French public bodies: any host under it is an official site.
  // Kept last and without alias so the more specific entries above win.
  {name:"Site officiel de l’administration française (gouv.fr)",domain:"gouv.fr",aliases:[]}
];

// A request to hand over a code, including "pouvez-vous me le renvoyer" after receiving one "par erreur".
export const CODE_REQUEST=/(?:communique|transmets|envoie|partage|donne|renvoie|renvoyer|renvoyez|dicte|dictez|lis-moi|lisez-moi).{0,50}(?:code|otp)|(?:code|otp).{0,80}(?:communique|transmets|envoie|partage|donne|renvoie|renvoyer|renvoyez|transférer|transférez|dicte|dictez|lire)/i;
// A plain one-time-code notification ("Votre code est 123456"), with no link and no request to pass it on.
const OTP_NOTICE=/\b(?:code|otp)\b[^.\n]{0,40}?(?:est|:)\s*(?:[a-z]-)?\d{3}[\s-]?\d{1,5}\b|\b\d{4,8}\b[^.\n]{0,10}est votre code/i;
const SHORTENERS=/^(?:www\.)?(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|shorturl\.at|ow\.ly|is\.gd|goo\.gl|rb\.gy|rebrand\.ly)$/i;
const MULTI_LABEL_SUFFIXES=new Set(["co.uk","com.au","co.nz","co.jp","gouv.fr"]);
const FREE_MAIL=/^(?:gmail\.com|googlemail\.com|outlook\.com|outlook\.fr|hotmail\.com|hotmail\.fr|live\.com|live\.fr|msn\.com|yahoo\.fr|yahoo\.com|icloud\.com|me\.com|proton\.me|protonmail\.com|gmx\.fr|gmx\.com|aol\.com|laposte\.net|wanadoo\.fr|orange\.fr|sfr\.fr|neuf\.fr|free\.fr|bbox\.fr|numericable\.fr)$/i;
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
const EMAIL_ADDRESS=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Extensions that are also TLDs: a bare "archive.zip" in a message is a file name, not a link.
const FILE_LIKE_TLDS=new Set(["zip","mov","md","py","sh"]);
function nakedDomainIsLink(value:string){
  const host=value.split(/[/:]/)[0];
  if(!plausibleNakedHost(host))return false;
  if(value.length>host.length)return true; // a port or a path makes the intent explicit
  const labels=host.split(".");
  const tld=labels[labels.length-1];
  // "demain.Je" / "retour.Et": a missing space after a full stop, not a domain.
  if(/^[A-Z][a-z]/.test(tld))return false;
  if(labels.length===2&&FILE_LIKE_TLDS.has(tld.toLowerCase()))return false;
  return true;
}
function urlsIn(text:string){
  const direct=[...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>m[0].replace(/[),.;!?]+$/,""));
  // E-mail addresses are not links: "prenom.nom@domaine.fr" must not yield "prenom.nom" or "domaine.fr".
  const scrubbed=text.replace(/https?:\/\/[^\s<>"']+/gi," ").replace(EMAIL_ADDRESS," ");
  const www=[...scrubbed.matchAll(/(?<![\p{L}\p{N}._-])(?:www\.)[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s<>"']*)?/giu)].map(m=>"https://"+m[0].replace(/[),.;!?]+$/,""));
  const naked=[...scrubbed.matchAll(/(?<![@\p{L}\p{N}._\/-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:\/[^\s<>"']*)?/giu)]
    .map(m=>m[0].replace(/[),.;!?]+$/,""))
    .filter(v=>!v.toLowerCase().startsWith("www.")&&nakedDomainIsLink(v));
  return [...new Set([...direct,...www,...naked.map(v=>"https://"+v)].map(v=>v.replace(/&amp;/gi,"&")))];
}
function domainOf(u:string){try{return new URL(u).hostname.toLowerCase()}catch{return null}}
function domainsOf(e:RegistryEntry){return e.also?[e.domain,...e.also]:[e.domain]}
function hostIn(host:string|null|undefined,domain:string){if(!host)return false;const h=host.toLowerCase().replace(/\.$/,"");return h===domain||h.endsWith('.'+domain)}
function belongsTo(e:RegistryEntry,host:string|null|undefined){return domainsOf(e).some(d=>hostIn(host,d))}
// "ups.com-livraison.info" or "impots.gouv.fr.paiement.com": an official name used as decoration in another domain.
function embeddedOfficialDomain(host:string){
  const h=host.toLowerCase();
  return REGISTRY.flatMap(domainsOf).filter(d=>d.includes(".")).find(d=>!hostIn(h,d)&&new RegExp("(?:^|[.-])"+d.replace(/\./g,"\\.")+"(?:[.-]|$)").test(h))||null;
}
function officialFor(host:string){return REGISTRY.find(e=>belongsTo(e,host))?.name||null}
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
// "Écris-moi sur WhatsApp" names a channel, not the organisation the message claims to come from.
const CHANNEL_MENTION=/(?:sur|par|via|dans|en)\s+(?:whatsapp|telegram|signal|messenger|instagram|facebook|snapchat|tiktok)\b/giu;
function claimedEntry(text:string){
  const lower=text.toLowerCase().replace(CHANNEL_MENTION," ");
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
  const l=activeContent(text);
  // The most specific scams come first: their advice differs most from generic phishing.
  if(/(?:webcam|filmé|images? intimes?|sites? (?:pour adultes|porno))/.test(l)&&/(?:bitcoin|crypto|pay|€|euros?)/.test(l))return "sextortion";
  if(/(?:virus|infecté|piraté|cheval de troie|logiciel malveillant)/.test(l)&&/(?:appelez|contactez|composez|support|assistance|technicien)/.test(l))return "tech_support";
  if(/anydesk|teamviewer|rustdesk|quicksupport|prise en main à distance/.test(l))return "tech_support";
  if(/(?:nouveau numéro|changé de numéro|cassé mon (?:téléphone|portable)|perdu mon (?:téléphone|portable)|enregistre (?:ce|mon) (?:nouveau )?numéro)/.test(l))return "family_impersonation";
  if(/(?:placement|investi(?:r|ssez|ssement)|rendement|trading|crypto|forex)/.test(l)&&/(?:garanti|sans risque|%\s*(?:par|\/)\s*(?:mois|semaine|jour)|doubl)/.test(l))return "investment_scam";
  if(/(?:héritage|succession|testament|loterie|tirage au sort|vous avez gagné|tu as gagné|gagnant)/.test(l))return "advance_fee";
  if(/(?:recrut|emploi|mission|job|travail|tâches?)/.test(l)&&/(?:liker|likes?\b|noter|avis\b|à domicile|par jour|par heure)/.test(l))return "job_scam";
  if(/(?:service (?:fraude|sécurité)|conseiller|opération suspecte|paiement suspect)/.test(l)&&/code|annuler|bloquer|sécuriser/.test(l))return "fake_advisor";
  if(/nouveau rib|nouvel iban|changement de rib|changement d'iban|coordonnées bancaires ont changé/.test(l))return "transfer_fraud";
  if(/colis|livraison|chronopost|colissimo|la poste|mondial relay|dpd|ups|dhl|fedex|frais de livraison|douane/.test(l))return "delivery_phishing";
  if(/banque|carte bancaire|virement|iban|rib|cvv|cryptogramme|sécurité bancaire|crédit/.test(l))return "banking_fraud";
  if(/remboursement|remboursé|rembourser|trop[- ]perçu|indemnité/.test(l))return "refund_scam";
  if(/mot de passe|connexion|identifiant|compte|double authentification|code de sécurité|otp/.test(l))return "account_takeover";
  if(/télécharger|download|apk|installer|pièce jointe|fichier/.test(l))return "malware_download";
  if(/impôt|impots|amende|caf|ameli|france travail|urssaf|service[- ]public|administration|ants|cpf|crit.?air|vignette/.test(l))return "administrative_phishing";
  return "generic_phishing";
}

type Link={label:string;url:string};
const HELP={
  cyber17:{label:"Obtenir de l’aide sur 17Cyber",url:"https://17cyber.gouv.fr/"},
  cybermalveillance:{label:"Conseils de Cybermalveillance.gouv.fr",url:"https://www.cybermalveillance.gouv.fr/"}
};
export const REPORTING={
  sms:{label:"Transférer le SMS au 33700",url:"https://www.33700.fr/"},
  email:{label:"Signaler l’e-mail à Signal Spam",url:"https://www.signal-spam.fr/"},
  site:{label:"Signaler le site à Phishing Initiative",url:"https://phishing-initiative.fr/contrib/"},
  pharos:{label:"Signaler à PHAROS (police)",url:"https://www.internet-signalement.gouv.fr/"},
  infoEscroqueries:{label:"Info Escroqueries : 0 805 805 817 (gratuit)",url:"tel:+33805805817"},
  perceval:{label:"Déclarer un paiement frauduleux (Perceval)",url:"https://www.service-public.fr/particuliers/vosdroits/R46526"}
};

const SCENARIOS:Record<string,[string,"now"|"today"|"normal",string,string[],Link]> = {
  banking_fraud:["Fraude bancaire","now","Ne réponds pas au message. Contacte ta banque uniquement via son application ou son numéro officiel.",["N’utilise pas le lien reçu.","Contacte ta banque par un canal officiel (application, numéro au dos de ta carte).","Conserve le message et les preuves."],HELP.cyber17],
  fake_advisor:["Faux conseiller bancaire","now","Une vraie banque ne te demandera jamais un code reçu par SMS, ni de valider une opération pour « l’annuler ».",["Raccroche ou ne réponds plus, même si le numéro affiché semble être celui de ta banque.","Rappelle toi-même ta banque avec le numéro au dos de ta carte.","Ne communique aucun code, ne valide aucune opération dans ton application."],HELP.cyber17],
  transfer_fraud:["Fraude au changement de RIB","now","Avant tout virement vers un nouveau RIB, confirme le changement par téléphone avec un contact que tu connais déjà.",["N’effectue pas le virement depuis ce message.","Appelle le fournisseur ou la personne avec un numéro que tu avais déjà (pas celui du message).","Si un virement est déjà parti, contacte ta banque immédiatement pour tenter un rappel des fonds."],HELP.cyber17],
  delivery_phishing:["Faux colis","today","Vérifie la livraison directement depuis le site ou l’application officielle du transporteur.",["N’utilise pas le lien reçu.","Vérifie le suivi depuis le site officiel avec ton numéro de colis.","Ne paie aucun frais depuis le message."],HELP.cyber17],
  account_takeover:["Tentative de vol de compte","now","Ne communique aucun code. Accède directement au service concerné depuis son application ou son site officiel.",["Ne saisis aucun code ou mot de passe via le message.","Change le mot de passe depuis le site officiel si tu l’as communiqué.","Active la double authentification."],HELP.cyber17],
  refund_scam:["Faux remboursement","today","Vérifie tout remboursement depuis ton compte officiel avant toute action.",["Ne fournis aucune donnée bancaire depuis le message.","Contacte l’organisme via ses coordonnées officielles.","Conserve les preuves."],HELP.cyber17],
  malware_download:["Téléchargement suspect","now","N’ouvre pas le fichier et n’installe rien depuis ce message.",["N’ouvre pas le fichier.","Si une application a été installée, fais vérifier l’appareil.","Conserve l’URL et le message."],HELP.cyber17],
  administrative_phishing:["Fausse démarche administrative","today","Vérifie la démarche directement sur le site officiel de l’administration.",["N’utilise pas le lien reçu.","Tape toi-même l’adresse officielle (elle se termine par .gouv.fr pour l’État).","Ne communique aucun code ou mot de passe."],HELP.cybermalveillance],
  family_impersonation:["Faux proche (« nouveau numéro »)","now","Avant toute aide, appelle ton proche sur son ancien numéro ou demande-lui un détail que seul lui connaît.",["N’envoie pas d’argent et ne paie aucune facture pour lui.","Appelle la personne sur le numéro que tu connais, ou contacte un autre membre de la famille.","Ne réponds pas aux relances qui insistent sur l’urgence."],HELP.cybermalveillance],
  advance_fee:["Faux gain ou faux héritage","today","Un vrai gain ou héritage ne demande jamais de payer des frais à l’avance ni d’envoyer ses papiers à un inconnu.",["Ne réponds pas et ne paie aucun frais.","N’envoie ni pièce d’identité ni coordonnées bancaires.","Bloque l’expéditeur."],HELP.cybermalveillance],
  investment_scam:["Faux placement","now","Aucun placement n’est à la fois garanti et très rentable. Vérifie toujours l’intermédiaire sur les listes noires de l’AMF.",["N’investis pas et ne transfère pas de cryptomonnaie.","Vérifie l’intermédiaire sur le site de l’AMF (amf-france.org).","Si tu as déjà versé de l’argent, méfie-toi des offres de « récupération des fonds » : c’est une seconde arnaque."],{label:"Listes noires de l’AMF",url:"https://www.amf-france.org/fr/espace-epargnants/proteger-son-epargne/listes-noires-et-mises-en-garde"}],
  tech_support:["Faux support technique","now","Microsoft, Apple ou ta banque n’affichent jamais un numéro à appeler pour un virus. N’appelle pas et n’installe rien.",["N’appelle pas le numéro affiché et ne donne pas l’accès à ton appareil.","Ferme le navigateur (au besoin, redémarre l’appareil).","Si quelqu’un a pris la main sur l’appareil, déconnecte-le d’internet et change tes mots de passe depuis un autre appareil."],HELP.cyber17],
  job_scam:["Fausse offre d’emploi","today","Un employeur sérieux ne recrute pas par WhatsApp pour « liker » des vidéos, et ne te demande jamais d’avancer de l’argent.",["Ne réponds pas et n’envoie aucun document d’identité.","Ne verse jamais d’argent pour « débloquer » des gains.","Bloque et signale le contact dans la messagerie."],HELP.cybermalveillance],
  sextortion:["Chantage à la webcam","today","Ce type de message est envoyé en masse : dans l’immense majorité des cas, l’auteur n’a aucune vidéo. Ne paie pas.",["Ne paie pas et ne réponds pas.","Change le mot de passe cité dans le message s’il est réel, et active la double authentification.","Conserve le message et signale-le."],{label:"Que faire en cas de chantage (Cybermalveillance)",url:"https://www.cybermalveillance.gouv.fr/"}],
  generic_phishing:["Message suspect","today","Vérifie l’information indépendamment avant toute action.",["N’utilise pas le lien reçu si tu n’es pas certain de sa destination.","Contacte l’organisme par un canal officiel.","Conserve les preuves utiles."],HELP.cyber17]
};

function channelOf(text:string){
  if(/^\s*(?:from|de|expéditeur|objet|subject|to|à)\s*:/im.test(text)||/\b(?:e-?mail|courriel)\b/i.test(text))return "email";
  return "sms";
}

function recommendation(s:string,text="",ctx:{verdict?:Verdict;hasUrl?:boolean}={}){
  const v=SCENARIOS[s]||SCENARIOS.generic_phishing;
  const reports:Link[]=[];
  if(text){
    reports.push(channelOf(text)==="email"?REPORTING.email:REPORTING.sms);
    if(ctx.hasUrl)reports.push(REPORTING.site);
    if(ctx.verdict==="stop"||s==="sextortion"||s==="investment_scam")reports.push(REPORTING.pharos);
    if(ctx.verdict==="stop"||ctx.verdict==="caution")reports.push(REPORTING.infoEscroqueries);
  }
  return{scenario:s,label:v[0],urgency:v[1],summary:v[2],steps:v[3],preserveEvidence:true,channel:text?channelOf(text):undefined,reports,resource:v[4]};
}

export function recommendationFor(text:string,result:Pick<Analysis,"verdict"|"urls">){
  return recommendation(scenario(text),text,{verdict:result.verdict,hasUrl:Boolean(result.urls?.length)});
}

export function actionsFor(verdict:Verdict,hasUrl:boolean):string[]{
  const dontUse=hasUrl?"N’ouvre pas le lien reçu et ne réponds pas au message.":"Ne réponds pas au message et ne rappelle pas le numéro qu’il indique.";
  return verdict==="stop"?[dontUse,"Ouvre toi-même le site ou l’application officielle, ou contacte la personne par un moyen que tu connais déjà.","Ne communique aucun code, mot de passe ou donnée bancaire, et ne paie rien."]:verdict==="caution"?[dontUse,"Vérifie l’organisme ou la personne par un canal indépendant.","En cas de doute, ne paie rien et ne communique aucun code."]:verdict==="check"?["Vérifie l’information depuis la source officielle avant d’agir."]:["Si le message est inattendu, vérifie quand même la source officielle.","Ne communique jamais un code ou un mot de passe simplement parce qu’un message le demande."];
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
        const disguise=embeddedOfficialDomain(host);
        if(disguise)findings.push(`L’adresse commence comme « ${disguise} », mais le site réellement ouvert est « ${root} ».`);
      }catch{findings.push("Le lien n’a pas pu être interprété comme une URL valide.");}
    }
    return{url,host,rootDomain:root,official,findings};
  });

  let risk=0;
  const finance=/paiement|payez|payer|virement|carte bancaire|iban|rib|frais|(?:\b\d{1,6}(?:[.,]\d{1,2})?\s*(?:€|eur)(?!\w))|cvv|cryptogramme/i.test(lower);
  const urgency=/urgent|urgence|immédiat|immédiatement|dans\s+\d+\s*(?:min|minute|h|heure|jour)|dernière chance|dernier avertissement|suspendu|bloqué|sera clôturé|expir|coupée?s?\b|coupure|majorée?s?\b|majoration|poursuites|huissier|sous peine/i.test(lower);
  const otpNotice=OTP_NOTICE.test(lower)&&!foundUrls.length&&!CODE_REQUEST.test(lower)&&!/mot de passe|numéro de carte|cvv|cryptogramme|iban|virement|paiement/.test(lower);
  const credentials=!otpNotice&&/mot de passe|identifiant|connexion|code de sécurité|code de vérification|otp|double authentification|numéro de carte|cvv|cryptogramme/i.test(lower);
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
  if(CODE_REQUEST.test(lower)){reasons.push("Le message demande explicitement de transmettre un code de sécurité ou à usage unique.");risk+=4}
  if(cta){reasons.push("Le contenu incite à effectuer une action depuis le message.");risk+=1}
  if(download){reasons.push("Le contenu évoque un téléchargement, une installation ou un fichier.");risk+=1}
  if(phone&&/sms|message|code|clique/i.test(lower)){reasons.push("Le contenu ressemble à une sollicitation reçue par SMS ou message.");}

  for(const f of new Set(urlData.flatMap(u=>u.findings))){
    reasons.push(f);
    risk+=/site réellement ouvert/i.test(f)?4:/représentation internationale|informations avant|port réseau|caractères invisibles|exécutable|nombre inhabituellement|URL valide/i.test(f)?3:/adresse IP/i.test(f)?2:/Lien raccourci|redirection/i.test(f)?2:2;
  }

  const identity={claimedBrand:claimed?.name||null,officialDomain:claimed?.domain||null,sender:sender?.email||null,senderDomain:sender?.rootDomain||null,status:"unknown"};

  if(claimed&&sender?.rootDomain){
    // A public mailbox provider that the organisation also owns (outlook.com, icloud.com…) proves nothing.
    const ownMailbox=belongsTo(claimed,sender.domain)&&(sender.rootDomain===claimed.domain||!FREE_MAIL.test(sender.rootDomain));
    if(ownMailbox)identity.status="official";
    else{
      const sim=Math.max(...domainsOf(claimed).map(d=>similarity(sender.rootDomain!,d)));
      identity.status=sim>=0.72?"lookalike":"mismatch";
      reasons.push(identity.status==="lookalike"?"L’adresse de l’expéditeur ressemble au domaine officiel sans lui correspondre.":"L’expéditeur détecté ne correspond pas au domaine officiel attendu.");
      risk+=identity.status==="lookalike"?3:2;
    }
  }else if(claimed&&!sender){
    if(foundUrls.length===0&&!otpNotice&&/urgent|clique|confirme|payez|mot de passe|code/i.test(lower)){reasons.push("L’organisme cité ne peut pas être confirmé par une adresse d’expéditeur.");risk+=1}
  }

  if(sender&&FREE_MAIL.test(sender.rootDomain||"")&&claimed&&sender.rootDomain!==claimed.domain){
    reasons.push("L’expéditeur utilise une messagerie grand public alors qu’il se présente comme un organisme.");
    risk+=2;
  }

  if(claimed&&foundUrls.length&&!urlData.some(u=>belongsTo(claimed,u.host))){
    reasons.push("Le message cite un organisme mais aucun lien ne correspond à son domaine officiel.");
    risk+=4;
  }

  for(const u of urlData){
    if(u.rootDomain&&!u.official&&!SAFE_DOMAINS.has(u.rootDomain)){
      const near=REGISTRY.flatMap(domainsOf).filter(d=>d.length>=8).map(d=>({d,score:similarity(u.rootDomain!,d)})).sort((a,b)=>b.score-a.score)[0];
      if(near&&near.score>=0.72&&near.d!==u.rootDomain){
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
  const actions=actionsFor(verdict,foundUrls.length>0);
  const confidence=verdict==="stop"?"élevée":verdict==="ok"?"faible":"moyenne";
  const base:Analysis={verdict,title,summary,reasons:reasons.length?Array.from(new Set(reasons)):["Aucun signal de risque évident n’a été détecté."],actions,confidence,engine:"VÉRIF local",checkedAt,urls:urlData,identity:(sender||claimed)?identity:undefined,evidence:{risk,headers:{from:headers.from,replyTo:headers.replyTo,returnPath:headers.returnPath,receivedCount:headers.received},urlFindings:urlData.flatMap(u=>u.findings)}};
  if(verdict==="ok")return base;
  const rec=recommendationFor(text,{verdict,urls:urlData});
  return {...base,recommendation:rec,incidentReport:incidentReport({...base,recommendation:rec})};
}

export function refreshIncident<T extends Analysis>(result:T,text?:string):T{
  if(result.verdict==='ok')return {...result,recommendation:undefined,incidentReport:undefined};
  const rec=text?recommendationFor(text,result):result.recommendation||recommendation('generic_phishing');
  return {...result,recommendation:rec,incidentReport:incidentReport({...result,recommendation:rec})};
}

export function incidentReport(result:Analysis){
  const checkedAt=result.checkedAt||new Date().toISOString();
  return [
    "VÉRIF — DOSSIER D’INCIDENT","",
    "Date d’analyse : "+new Date(checkedAt).toLocaleString("fr-FR"),
    "Verdict : "+result.verdict.toUpperCase(),
    "Type d’arnaque probable : "+(result.recommendation?.label||"Non déterminé"),
    "","RÉSUMÉ",result.summary,
    "","SIGNAUX DÉTECTÉS",...result.reasons.map(r=>"- "+r),
    ...(result.identity?.sender?["","EXPÉDITEUR",result.identity.sender]:[]),
    ...(result.urls?.length?["","LIENS DÉTECTÉS (ne pas ouvrir)",...result.urls.map(u=>"- "+u.url.replace(/^http/i,"hxxp"))]:[]),
    "","À CONSERVER","- Le message ou la capture d’origine","- L’adresse ou le numéro de l’expéditeur","- Les preuves de paiement éventuelles"
  ].join("\n");
}
