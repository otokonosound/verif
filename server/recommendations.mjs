const REPORTING = {
  sms: { label: "Signaler le SMS au 33700", url: "https://www.33700.fr/accueil/sms/" },
  email: { label: "Signaler l'e-mail à Signal Spam", url: "https://www.signal-spam.fr/" },
  site: { label: "Signaler le site à Phishing Initiative", url: "https://www.phishing-initiative.fr.phishing-initiative.fr/contrib/?lang=fr" },
  authorities: { label: "Signaler aux autorités via PHAROS", url: "https://www.internet-signalement.gouv.fr/" }
};

const SCENARIOS = {
  banking_fraud: {
    label: "Fraude bancaire",
    urgency: "now",
    summary: "Le message cherche probablement à obtenir ou faire utiliser des données ou moyens de paiement.",
    steps: [
      "N'utilise pas le lien ou le numéro indiqué dans le message.",
      "Si tu as transmis des données bancaires ou constaté un débit, contacte immédiatement ta banque via son application ou ses coordonnées officielles.",
      "Conserve le message, l'URL, les captures et les preuves de paiement."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  delivery_phishing: {
    label: "Faux colis / livraison",
    urgency: "today",
    summary: "Le message ressemble à une tentative de faux colis, de frais de livraison ou de mise à jour de livraison.",
    steps: [
      "Ne paie aucun frais depuis le lien reçu.",
      "Vérifie directement le suivi depuis le site ou l'application officielle du transporteur.",
      "Si tu as cliqué, vérifie le domaine affiché et ne saisis aucune donnée si l'adresse ne correspond pas exactement au service attendu."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  administrative_phishing: {
    label: "Fausse démarche administrative",
    urgency: "today",
    summary: "Le message se présente comme une administration ou un organisme public et cherche à provoquer une action.",
    steps: [
      "N'utilise pas le lien reçu pour te connecter ou payer.",
      "Ouvre toi-même le site officiel de l'organisme et vérifie la situation depuis ton espace.",
      "Conserve le message et ses liens si tu dois le signaler."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  account_takeover: {
    label: "Risque de compromission de compte",
    urgency: "now",
    summary: "Le message cherche probablement à récupérer des identifiants, un mot de passe ou un code de sécurité.",
    steps: [
      "N'entre aucun identifiant ou code depuis le lien reçu.",
      "Si tu as transmis un mot de passe, change-le immédiatement depuis le site ou l'application officielle, ainsi que partout où il était réutilisé.",
      "Active la double authentification et vérifie les sessions ou appareils connectés si le service le permet."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  refund_scam: {
    label: "Faux remboursement",
    urgency: "today",
    summary: "Le message promet un remboursement tout en pouvant chercher à récupérer des informations sensibles ou un paiement.",
    steps: [
      "Ne fournis pas de coordonnées bancaires depuis le message.",
      "Connecte-toi toi-même au site ou à l'application officielle et vérifie si un remboursement existe réellement.",
      "Si tu as transmis des données bancaires, contacte immédiatement ta banque via son canal officiel."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  malware_download: {
    label: "Risque de téléchargement malveillant",
    urgency: "now",
    summary: "Le contenu peut chercher à te faire télécharger ou installer un fichier ou une application.",
    steps: [
      "N'ouvre pas le fichier et n'installe pas l'application proposée.",
      "Si une application suspecte a été installée, évite de l'utiliser et fais vérifier l'appareil.",
      "Conserve les preuves et demande de l'aide via 17Cyber si le comportement de l'appareil est anormal."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  },
  generic_phishing: {
    label: "Tentative d'hameçonnage",
    urgency: "today",
    summary: "Le message présente des signaux compatibles avec une tentative d'hameçonnage.",
    steps: [
      "N'agis pas depuis le message reçu.",
      "Vérifie l'organisme ou le service directement depuis son site ou son application officielle.",
      "Conserve le message et les éléments utiles si tu dois le signaler."
    ],
    resource: { label: "Obtenir de l'aide avec 17Cyber", url: "https://17cyber.gouv.fr/" }
  }
};

function detectChannel(text) {
  const lower = String(text || "").toLowerCase();
  if (/\b(?:sms|mms|texto|message reçu|33700)\b/i.test(lower) || /\b(?:06|07|\+33\s?6|\+33\s?7)[0-9 .-]{8,}/i.test(lower)) return "sms";
  if (/\b(?:e-?mail|email|courriel|expéditeur|reply-to|from|de\s*:)/i.test(lower)) return "email";
  if (/https?:\/\//i.test(lower)) return "site";
  return "email";
}

function has(text, pattern) {
  return pattern.test(text);
}

export function inferScenario(text, analysis = {}) {
  const lower = String(text || "").toLowerCase();
  const intent = analysis.intent || "generic";
  const urls = analysis.urls || [];
  const urlText = urls.map((u) => u.url || "").join(" ").toLowerCase();

  if (
    has(lower, /télécharg|download|installer|installation|application|apk|fichier .{0,20}(ouvrir|exécuter)/i) ||
    /\.apk(?:[/?#]|$)/i.test(urlText)
  ) return "malware_download";

  if (
    has(lower, /remboursement|remboursé|rembourser|trop[- ]perçu|créditer votre compte/i) &&
    has(lower, /carte|iban|rib|coordonnées bancaires|paiement|frais|virement|cliquer|lien|connexion/i)
  ) return "refund_scam";

  if (
    intent === "delivery" ||
    has(lower, /colis|livraison|chronopost|la poste|mondial relay|dhl|ups|dpd|frais de livraison|adresse de livraison/i)
  ) return "delivery_phishing";

  if (
    intent === "credentials" ||
    has(lower, /mot de passe|identifiant|connexion|code de sécurité|otp|double authentification|compte .* (bloqué|suspendu)|session/i)
  ) return "account_takeover";

  if (
    intent === "finance" ||
    has(lower, /carte bancaire|numéro de carte|cvv|cryptogramme|iban|rib|virement|paiement|frais|banque|conseiller bancaire/i)
  ) return "banking_fraud";

  if (
    intent === "administrative" ||
    has(lower, /impôt|impots|amende|antai|caf|ameli|france travail|urssaf|administration|service[- ]public|avis de paiement|dossier administratif/i)
  ) return "administrative_phishing";

  if (analysis.verdict && analysis.verdict !== "ok") return "generic_phishing";
  return null;
}

export function buildRecommendation(text, analysis = {}) {
  const scenario = inferScenario(text, analysis);
  if (!scenario) return null;

  const base = SCENARIOS[scenario];
  const channel = detectChannel(text);
  const reports = [];
  if (channel === "sms") reports.push(REPORTING.sms);
  if (channel === "email") reports.push(REPORTING.email);
  if (analysis.urls?.length) reports.push(REPORTING.site);
  if (analysis.verdict === "stop" || scenario === "banking_fraud") reports.push(REPORTING.authorities);
  const steps = [...base.steps];

  if (analysis.identity?.status === "lookalike" || analysis.identity?.status === "mismatch") {
    steps.unshift("L'identité annoncée ne correspond pas aux éléments détectés : ne fais pas confiance au message pour contacter l'organisme.");
  }

  if ((analysis.evidence?.risk ?? 0) >= 7) {
    steps.unshift("Priorité immédiate : ne poursuis aucune action depuis ce message.");
  }

  return {
    scenario,
    label: base.label,
    urgency: base.urgency,
    summary: base.summary,
    steps: [...new Set(steps)],
    preserveEvidence: true,
    channel,
    reports: reports.filter((item, index, all) => all.findIndex(x => x.url === item.url) === index),
    resource: base.resource
  };
}

export function buildIncidentReport(text, analysis = {}, incident = "none") {
  const recommendation = analysis.recommendation || {};
  const incidentLabels = {
    none: "Aucune action déclarée",
    clicked: "Lien ouvert",
    info: "Informations transmises",
    paid: "Paiement effectué"
  };
  const lines = [
    "VÉRIF — DOSSIER D'INCIDENT",
    "",
    "Date d'analyse : " + (analysis.checkedAt || new Date().toISOString()),
    "Verdict : " + String(analysis.verdict || "inconnu").toUpperCase(),
    "Scénario : " + (recommendation.label || "Non déterminé"),
    "Situation déclarée : " + (incidentLabels[incident] || incident),
    "Score de risque : " + (analysis.evidence?.risk ?? "non calculé"),
    "",
    "RÉSUMÉ",
    analysis.summary || "Aucun résumé disponible.",
    "",
    "EXPÉDITEUR",
    analysis.identity?.sender || analysis.evidence?.sender || "Non détecté",
    "Domaine expéditeur : " + (analysis.identity?.senderDomain || analysis.evidence?.senderDomain || "Non détecté"),
    "Domaine officiel attendu : " + (analysis.identity?.officialDomain || analysis.evidence?.officialDomain || "Non déterminé"),
    "",
    "LIENS DÉTECTÉS",
    ...(analysis.evidence?.urls?.length ? analysis.evidence.urls.map((url) => "- " + url) : ["- Aucun"]),
    "",
    "SIGNAUX",
    ...(analysis.reasons?.length ? analysis.reasons.map((reason) => "- " + reason) : ["- Aucun"]),
    "",
    "PREUVES TECHNIQUES",
    "Reply-To : " + (analysis.evidence?.headers?.replyTo || "Non détecté"),
    "Return-Path : " + (analysis.evidence?.headers?.returnPath || "Non détecté"),
    "Received : " + (analysis.evidence?.headers?.receivedCount ?? 0) + " en-tête(s)",
    "",
    "À CONSERVER",
    "- Message ou capture originale",
    "- URL complète",
    "- Adresse de l'expéditeur",
    "- Captures d'écran",
    "- Preuves de paiement si concerné"
  ];
  return lines.join("\n");
}
