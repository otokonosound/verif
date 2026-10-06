const OFFICIAL = {
  "service-public.fr":"Service-Public.fr","impots.gouv.fr":"impots.gouv.fr","ameli.fr":"Ameli",
  "laposte.fr":"La Poste","chronopost.fr":"Chronopost","mondialrelay.fr":"Mondial Relay",
  "dpd.fr":"DPD","dhl.com":"DHL","ups.com":"UPS","fedex.com":"FedEx",
  "ants.gouv.fr":"ANTS","antai.gouv.fr":"ANTAI","cybermalveillance.gouv.fr":"Cybermalveillance.gouv.fr",
  "17cyber.gouv.fr":"17Cyber","caf.fr":"CAF","francetravail.fr":"France Travail","urssaf.fr":"Urssaf",
  "sncf-connect.com":"SNCF Connect","orange.fr":"Orange","sfr.fr":"SFR","free.fr":"Free",
  "bouyguestelecom.fr":"Bouygues Telecom","edf.fr":"EDF","engie.com":"Engie",
  "totalenergies.fr":"TotalEnergies","credit-agricole.fr":"Crédit Agricole",
  "societegenerale.fr":"Société Générale","labanquepostale.fr":"La Banque Postale",
  "lcl.fr":"LCL","boursobank.com":"Boursobank","caisse-epargne.fr":"Caisse d'Épargne",
  "carrefour.fr":"Carrefour","amazon.fr":"Amazon","paypal.com":"PayPal","netflix.com":"Netflix",
  "microsoft.com":"Microsoft","apple.com":"Apple","google.com":"Google","meta.com":"Meta",
  "leboncoin.fr":"Leboncoin","vinted.fr":"Vinted"
};
const ALIASES = Object.fromEntries(Object.entries(OFFICIAL).map(([d,n])=>[n.toLowerCase(),d]));
const SHORTENERS = new Set(["bit.ly","tinyurl.com","t.co","cutt.ly","shorturl.at","ow.ly","is.gd","goo.gl","rb.gy","rebrand.ly"]);
const EXEC = /\.(?:exe|msi|scr|bat|cmd|com|ps1|vbs|vbe|js|jse|hta|jar|apk|dmg|pkg)(?:$|[?#])/i;

function rootDomain(host) {
  const p = host.toLowerCase().replace(/^www\./,"").replace(/\.$/,"").split(".").filter(Boolean);
  if (p.length < 2) return p.join(".");
  const suffix = p.slice(-2).join(".");
  return ["co.uk","com.au","com.nz","com.jp","gouv.fr"].includes(suffix) && p.length >= 3 ? p.slice(-3).join(".") : suffix;
}
function levenshtein(a,b) {
  const row = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const cur=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur;}}
  return row[b.length];
}
function similarity(a,b){return 1-levenshtein(a,b)/Math.max(a.length,b.length,1);}
function official(host){ return OFFICIAL[host] || OFFICIAL[rootDomain(host)] || null; }

export function analyzePage({url="",title="",text=""}={}) {
  const reasons=[], all=(title+"\n"+text).toLowerCase();
  let risk=0, parsed=null;
  try { parsed=new URL(url); } catch {}
  const host=parsed?.hostname?.toLowerCase()||"";
  const root=host?rootDomain(host):"";
  const brand=Object.entries(OFFICIAL).find(([d,n])=>all.includes(n.toLowerCase()) || all.includes(d))?.[1] || null;

  if(parsed) {
    if(parsed.protocol !== "https:"){reasons.push("La page n'utilise pas HTTPS.");risk+=1;}
    if(/^(\d{1,3}\.){3}\d{1,3}$/.test(host)){reasons.push("Le site utilise directement une adresse IP.");risk+=2;}
    if(host.includes("xn--")){reasons.push("Le domaine utilise du punycode, potentiellement trompeur.");risk+=3;}
    if(SHORTENERS.has(host)){reasons.push("Le lien utilise un raccourcisseur.");risk+=2;}
    if(parsed.username || parsed.password){reasons.push("L'URL contient des informations avant le domaine.");risk+=3;}
    if(parsed.port && !["80","443"].includes(parsed.port)){reasons.push("Le site utilise un port inhabituel.");risk+=3;}
    if(EXEC.test(parsed.pathname)){reasons.push("L'URL pointe vers un fichier potentiellement exécutable.");risk+=6;}
    if(/[?&](redirect|url|target|dest|continue|next|return|redirect_uri)=/i.test(parsed.search)){reasons.push("L'URL contient un paramètre de redirection.");risk+=2;}
    if(host.split(".").length>=5){reasons.push("Le domaine comporte beaucoup de sous-domaines.");risk+=2;}
    if(brand) {
      const expected=Object.entries(OFFICIAL).find(([,n])=>n===brand)?.[0];
      if(expected && root!==expected){
        const score=similarity(root,expected);
        reasons.push(score>=0.72 ? "Le domaine ressemble au domaine officiel de la marque citée." : "La page cite une marque mais son domaine ne correspond pas au domaine officiel.");
        risk += score>=0.72 ? 3 : 4;
      }
    }
  }

  if(/mot de passe|identifiant|code de sécurité|code de vérification|otp|carte bancaire|cvv|cryptogramme/i.test(all)){reasons.push("La page demande ou évoque des données sensibles.");risk+=2;}
  if(/urgent|urgence|immédiat|immédiatement|dernière chance|dernier avertissement|compte.*(bloqué|suspendu)|expir/i.test(all)){reasons.push("Le contenu exerce une pression ou une menace.");risk+=2;}
  if(/paiement|payez|payer|virement|iban|rib|remboursement|frais de livraison/i.test(all)){reasons.push("Le contenu évoque un paiement, un remboursement ou des frais.");risk+=2;}
  if(/cliquez|clique|confirmez|connectez-vous|régularisez|mettez à jour/i.test(all)){reasons.push("La page incite à effectuer une action.");risk+=1;}

  if(official(host) && risk < 3 && !/urgent|mot de passe|code|carte bancaire|payez|paiement/i.test(all)) risk=0;

  const verdict=risk>=6?"stop":risk>=2?"caution":risk>=1?"check":"ok";
  const labels={ok:["Aucun signal évident","La page ne présente pas de signal de risque évident dans les éléments analysés."],check:["À vérifier","Un élément mérite une vérification avant d'agir."],caution:["Prudence","Plusieurs éléments méritent une vérification indépendante."],stop:["STOP","Plusieurs signaux forts sont compatibles avec une tentative de fraude."]};
  const actions=verdict==="stop"?["Ne saisis aucune donnée.","Ferme la page si tu n'en as pas besoin.","Accède au service depuis son site ou son application officielle."]:verdict==="caution"?["N'entre aucune donnée sensible.","Vérifie le domaine exact.","En cas de doute, ouvre toi-même le site officiel."]:verdict==="check"?["Vérifie le domaine et la source avant d'agir."]:["Tu peux continuer, mais garde les réflexes de prudence."];
  return {verdict,title:labels[verdict][0],summary:labels[verdict][1],reasons:[...new Set(reasons)],actions,risk,host,root,brand,official:official(host)};
}
if(typeof globalThis!=="undefined") globalThis.VERIF_ANALYZER={analyzePage};