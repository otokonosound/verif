export type Verdict = "ok"|"check"|"caution"|"stop";

export type Analysis = {
  verdict: Verdict;
  title: string;
  summary: string;
  reasons: string[];
  actions: string[];
  confidence: "faible"|"moyenne"|"élevée";
};

const suspiciousPatterns = [
  /payez|paiement|régulariser|confirmer.*compte|compte.*bloqu/i,
  /cliquez|connectez-vous|urg[ea]nt|dans\s+les?\s+\d+/i,
  /https?:\/\/[^\s]+/i
];

export function analyzeText(input:string):Analysis {
  const text=input.trim();
  if(!text){
    return {verdict:"check",title:"À vérifier",summary:"Ajoute un message, un lien ou un contenu à analyser.",reasons:[],actions:["Ajoute le contenu à vérifier."],confidence:"faible"};
  }

  const reasons:string[]=[];
  if(/https?:\/\/[^\s]+/i.test(text)) reasons.push("Un lien est présent dans le contenu.");
  if(/payez|paiement|2,?\d*\s*€|frais|virement/i.test(text)) reasons.push("Une demande financière est présente.");
  if(/urgent|immédiat|dans\s+\d+\s*(?:min|h|heure|jour)|dernière chance/i.test(text)) reasons.push("Le message pousse à agir rapidement.");
  if(/mot de passe|code|connexion|identifiant|sécurité/i.test(text)) reasons.push("Le message demande ou évoque des informations sensibles.");

  const score = suspiciousPatterns.reduce((n,p)=>n+(p.test(text)?1:0),0);

  if(score>=3){
    return {
      verdict:"stop",
      title:"N'agis pas tout de suite",
      summary:"Plusieurs signaux compatibles avec un message frauduleux ont été détectés.",
      reasons,
      actions:["N'utilise pas le lien reçu.","Vérifie directement depuis l'application ou le site officiel de l'organisme.","Ne communique aucun code ou mot de passe."],
      confidence:"élevée"
    };
  }
  if(score===2){
    return {
      verdict:"caution",
      title:"Prudence",
      summary:"Plusieurs éléments méritent une vérification indépendante.",
      reasons,
      actions:["Évite de cliquer immédiatement.","Vérifie l'identité de l'expéditeur par un autre canal."],
      confidence:"moyenne"
    };
  }
  if(score===1){
    return {
      verdict:"check",
      title:"À vérifier",
      summary:"Un élément mérite d'être vérifié avant d'agir.",
      reasons,
      actions:["Vérifie l'information depuis une source officielle ou connue."],
      confidence:"moyenne"
    };
  }
  return {
    verdict:"ok",
    title:"Aucun signal préoccupant détecté",
    summary:"Rien dans le texte fourni ne déclenche nos contrôles de base.",
    reasons:["Aucun signal de risque évident n'a été détecté."],
    actions:["Tu peux continuer, tout en gardant tes précautions habituelles."],
    confidence:"faible"
  };
}