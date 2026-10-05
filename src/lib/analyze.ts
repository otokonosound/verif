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
  recommendation?: {scenario:string;label:string;urgency:"now"|"today"|"normal";summary:string;steps:string[];preserveEvidence:boolean;reports?:Array<{label:string;url:string}>;resource?:{label:string;url:string}};
  incidentReport?: string;
};

const OFFICIAL:Record<string,string> = {
  "service-public.fr":"Service-Public.fr","impots.gouv.fr":"impots.gouv.fr","ameli.fr":"ameli.fr",
  "laposte.fr":"La Poste","chronopost.fr":"Chronopost","ants.gouv.fr":"ANTS","amendes.gouv.fr":"ANTAI",
  "cybermalveillance.gouv.fr":"Cybermalveillance.gouv.fr","gouv.fr":"Gouvernement","caf.fr":"CAF",
  "francetravail.fr":"France Travail","urssaf.fr":"Urssaf","sncf-connect.com":"SNCF Connect",
  "orange.fr":"Orange","sfr.fr":"SFR","free.fr":"Free","bouyguestelecom.fr":"Bouygues Telecom"
};

function rootDomain(host:string){const h=host.toLowerCase().replace(/^www\./,"");const p=h.split(".");return p.length>2?p.slice(-2).join("."):h}
function urlsIn(text:string){return [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>m[0].replace(/[),.;!?]+$/,""))}
function domainOf(u:string){try{return new URL(u).hostname.toLowerCase()}catch{return null}}
function officialFor(host:string){if(!host)return null;const root=rootDomain(host);return OFFICIAL[root]||Object.keys(OFFICIAL).find(d=>host===d||host.endsWith("."+d))||null}
function scenario(text:string, riskyUrl:boolean){
  if(/colis|livraison|chronopost|laposte|mondial relay|dpd|ups|dhl/i.test(text)) return "delivery_phishing";
  if(/banque|carte bancaire|virement|iban|sécurité bancaire|crédit/i.test(text)) return "banking_fraud";
  if(/remboursement|rembours|trop[- ]perçu|indemnité/i.test(text)) return "refund_scam";
  if(/mot de passe|connexion|identifiant|compte|double authentification|code de sécurité/i.test(text)) return "account_takeover";
  if(/télécharger|download|apk|fichier|installer/i.test(text)||riskyUrl) return "malware_download";
  if(/impôt|amende|caf|urssaf|france travail|service[- ]public|administration/i.test(text)) return "administrative_phishing";
  return "generic_phishing";
}
function recommendation(s:string){
  const map:any={
    banking_fraud:["Fraude bancaire","now","Ne réponds pas au message. Contacte ta banque uniquement via son application ou son numéro officiel.",["Bloque toute nouvelle opération suspecte.","Contacte ta banque par un canal officiel.","Conserve le message et les preuves."],"https://www.cybermalveillance.gouv.fr/"],
    delivery_phishing:["Fausse livraison","today","Vérifie la livraison directement depuis le site ou l’application officielle du transporteur.",["N’utilise pas le lien reçu.","Vérifie le suivi depuis le site officiel.","Ne paie aucun frais depuis le message."],"https://www.cybermalveillance.gouv.fr/"],
    account_takeover:["Tentative de prise de compte","now","Ne communique aucun code. Accède directement au service concerné depuis son application ou son site officiel.",["Change le mot de passe si tu as fourni des informations.","Active la double authentification.","Vérifie les sessions et appareils connectés."],"https://17cyber.gouv.fr/"],
    refund_scam:["Faux remboursement","today","Vérifie tout remboursement depuis ton compte officiel avant toute action.",["Ne fournis aucune donnée bancaire depuis le message.","Contacte l’organisme via ses coordonnées officielles.","Conserve les preuves."],"https://17cyber.gouv.fr/"],
    malware_download:["Téléchargement suspect","now","N’ouvre pas le fichier et n’installe rien depuis ce message.",["Supprime ou isole le fichier suspect.","Si une application a été installée, fais vérifier l’appareil.","Conserve l’URL et le message."],"https://17cyber.gouv.fr/"],
    administrative_phishing:["Hameçonnage administratif","today","Vérifie la démarche directement sur le site officiel de l’administration.",["N’utilise pas le lien reçu.","Tape toi-même l’adresse officielle.","Ne communique aucun code ou mot de passe."],"https://www.cybermalveillance.gouv.fr/"],
    generic_phishing:["Message suspect","today","Vérifie l’information indépendamment avant toute action.",["N’utilise pas le lien reçu.","Contacte l’organisme par un canal officiel.","Conserve les preuves utiles."],"https://17cyber.gouv.fr/"]
  };
  const v=map[s]||map.generic_phishing;
  return {scenario:s,label:v[0],urgency:v[1],summary:v[2],steps:v[3],preserveEvidence:true,resource:{label:"Obtenir de l’aide sur 17Cyber",url:v[4]}};
}

export function analyzeText(input:string):Analysis {
  const text=input.trim();
  const checkedAt=new Date().toISOString();
  if(!text) return {verdict:"check",title:"À vérifier",summary:"Ajoute un message, un lien ou un contenu à analyser.",reasons:[],actions:["Ajoute le contenu à vérifier."],confidence:"faible",engine:"VÉRIF local",checkedAt};

  const reasons:string[]=[];
  const foundUrls=urlsIn(text);
  const urlData=foundUrls.map(url=>{const host=domainOf(url);const official=officialFor(host||"");const findings:string[]=[];if(official) findings.push("Domaine officiel reconnu : "+official);else if(host) findings.push("Domaine non reconnu comme organisme officiel.");if(host&&/^xn--|[0-9]{2,}(?:\.[0-9]+){2}/.test(host)) findings.push("Domaine techniquement inhabituel.");if(host&&/bit\.ly|tinyurl\.com|t\.co|cutt\.ly|shorturl/i.test(host)) findings.push("Lien raccourci : la destination réelle est masquée.");return {url,host,rootDomain:host?rootDomain(host):null,official,findings}});
  if(foundUrls.length) reasons.push("Un ou plusieurs liens sont présents.");
  if(/payez|paiement|régulariser|frais|virement|carte bancaire|iban|remboursement/i.test(text)) reasons.push("Une demande financière est présente.");
  if(/urgent|immédiat|dans\s+\d+\s*(?:min|h|heure|jour)|dernière chance|dernier avertissement/i.test(text)) reasons.push("Le message pousse à agir rapidement.");
  if(/mot de passe|code|connexion|identifiant|code de sécurité|double authentification/i.test(text)) reasons.push("Le message évoque des informations sensibles ou un accès au compte.");
  if(/cliquez|connectez-vous|ouvrez le lien|confirmez/i.test(text)) reasons.push("Le message incite à effectuer une action via le contenu reçu.");
  const suspiciousUrl=urlData.some(u=>u.findings.some(f=>/raccourci|inhabituel|non reconnu/i.test(f)));
  const officialUrl=urlData.some(u=>!!u.official);
  let score=reasons.length;
  if(suspiciousUrl) score+=2;
  if(officialUrl) score=Math.max(0,score-1);

  const verdict:Verdict=score>=4?"stop":score>=2?"caution":score===1?"check":"ok";
  const scenarioName=scenario(text,suspiciousUrl);
  const rec=recommendation(scenarioName);
  if(verdict==="ok") return {verdict,title:"Aucun signal évident détecté",summary:"Le moteur local n’a trouvé aucun signal évident de fraude dans le contenu fourni.",reasons:["Aucun signal de risque évident n’a été détecté."],actions:["Si le message est inattendu, vérifie quand même l’organisme depuis son site ou son application officielle.","Ne communique jamais un code ou un mot de passe simplement parce qu’un message le demande."],confidence:"faible",engine:"VÉRIF local",checkedAt,urls:urlData,evidence:{risk:0,urlFindings:urlData.flatMap(u=>u.findings)}};
  const incidentReport=["VÉRIF — DOSSIER D’INCIDENT","", "Date d’analyse : "+checkedAt,"Verdict : "+verdict.toUpperCase(),"Scénario : "+rec.label,"","RÉSUMÉ", "Analyse locale VÉRIF.", "","SIGNAUX",...reasons.map(r=>"- "+r),...(foundUrls.length?["","URL",...foundUrls]:[])].join("\n");
  return {verdict,title:verdict==="stop"?"N’agis pas tout de suite":verdict==="caution"?"Prudence":"À vérifier",summary:verdict==="stop"?"Plusieurs signaux compatibles avec une tentative de fraude ont été détectés.":verdict==="caution"?"Plusieurs éléments méritent une vérification indépendante.":"Un élément mérite d’être vérifié avant d’agir.",reasons,actions:[...rec.steps.slice(0,2),"Ne communique aucun code, mot de passe ou donnée bancaire via le message reçu."],confidence:verdict==="stop"?"élevée":verdict==="caution"?"moyenne":"moyenne",engine:"VÉRIF local",checkedAt,urls:urlData,evidence:{risk:Math.min(100,score*20),urlFindings:urlData.flatMap(u=>u.findings)},recommendation:rec,incidentReport};
}