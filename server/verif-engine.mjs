import { URL } from "node:url";

const OFFICIAL = {
  "service-public.fr": "Service-Public.fr",
  "impots.gouv.fr": "Impots.gouv.fr",
  "ameli.fr": "Assurance Maladie",
  "laposte.fr": "La Poste",
  "chronopost.fr": "Chronopost",
  "ants.gouv.fr": "ANTS",
  "amendes.gouv.fr": "ANTAI / Amendes.gouv.fr",
  "cybermalveillance.gouv.fr": "Cybermalveillance.gouv.fr"
};

const BRAND_HINTS = [
  ["impots", "impots.gouv.fr"], ["ameli", "ameli.fr"], ["la poste", "laposte.fr"],
  ["chronopost", "chronopost.fr"], ["antai", "amendes.gouv.fr"], ["service-public", "service-public.fr"]
];

function rootDomain(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  const parts = h.split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : h;
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s<>'"`]+/gi)].map(m => m[0].replace(/[),.;!?]+$/, ""));
}

function inspectUrl(raw) {
  try {
    const u = new URL(raw);
    const root = rootDomain(u.hostname);
    const official = OFFICIAL[root];
    const findings = [];
    if (u.protocol !== "https:") findings.push("Le lien n'utilise pas HTTPS.");
    if (u.hostname.includes("xn--")) findings.push("Le domaine utilise une représentation internationale potentiellement trompeuse.");
    if (u.username || u.password) findings.push("L'URL contient des informations avant le domaine.");
    return { url: raw, host: u.hostname, rootDomain: root, official: official || null, findings };
  } catch {
    return { url: raw, host: null, rootDomain: null, official: null, findings: ["Le lien ne peut pas être interprété comme une URL valide."] };
  }
}

export function analyzeMessage(text) {
  const urls = extractUrls(text).map(inspectUrl);
  const lower = text.toLowerCase();
  const reasons = [];
  let risk = 0;
  if (urls.length) { reasons.push(`${urls.length} lien${urls.length > 1 ? "s" : ""} détecté${urls.length > 1 ? "s" : ""}.`); risk += 1; }
  if (/paiement|payez|virement|carte bancaire|frais|2[,.]?\d+\s*€/.test(lower)) { reasons.push("Le contenu évoque un paiement ou une demande financière."); risk += 2; }
  if (/urgent|immédiat|dans\s+\d+\s*(min|minute|h|heure|jour)|dernière chance|suspendu|bloqué/.test(lower)) { reasons.push("Le contenu crée une pression temporelle ou une menace de blocage."); risk += 2; }
  if (/mot de passe|code|identifiant|connexion|numéro de carte|cryptogramme|cvv/.test(lower)) { reasons.push("Le contenu évoque des informations d'authentification ou bancaires."); risk += 2; }

  const brandMismatch = BRAND_HINTS.find(([hint, domain]) => lower.includes(hint) && urls.length && !urls.some(u => u.rootDomain === domain));
  if (brandMismatch) { reasons.push(`Le message cite « ${brandMismatch[0]} » mais aucun lien ne correspond au domaine officiel ${brandMismatch[1]}.`); risk += 3; }
  for (const u of urls) for (const f of u.findings) { reasons.push(f); risk += 2; }

  let verdict = "ok", title = "Aucun signal préoccupant détecté", confidence = "faible";
  if (risk >= 7) { verdict = "stop"; title = "N'agis pas tout de suite"; confidence = "élevée"; }
  else if (risk >= 4) { verdict = "caution"; title = "Prudence"; confidence = "moyenne"; }
  else if (risk >= 1) { verdict = "check"; title = "À vérifier"; confidence = "moyenne"; }

  const actions = verdict === "stop"
    ? ["N'utilise pas le lien reçu.", "Ouvre toi-même le site ou l'application officielle.", "Ne communique aucun code, mot de passe ou donnée bancaire."]
    : verdict === "caution"
      ? ["N'agis pas depuis le message.", "Vérifie l'organisme par un canal indépendant."]
      : ["Compare le contenu avec la source officielle avant d'agir."];

  return { verdict, title, confidence, reasons, actions, urls, checkedAt: new Date().toISOString(), engine: "rules-v0.2" };
}
