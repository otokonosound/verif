// Suppress only standalone prevention advice. Mixed clauses remain analyzable.
const PREVENTION=[
  // "Ne communiquez jamais votre code." / "Never share your password."
  /^\s*(?:ne\s+(?:communiqu\w*|partag\w*|transmett\w*|donn\w*|envoy\w*)\s+(?:jamais|pas)|never\s+(?:share|send|give))\s+(?:votre|vos|ton|tes|un|your)\s+(?:code|mot de passe|password|otp)[\p{L}\p{N}\s’'-]*[.!?]?$/iu,
  // "Ne le communiquez à personne." / "Ne le partagez pas." / "Ne communiquez ce code à personne."
  /^\s*ne\s+(?:l['’]\s*|le\s+|la\s+|les\s+)?(?:communiqu\w*|partag\w*|transmett\w*|donn\w*|divulgu\w*|envoy\w*)\s+(?:(?:jamais|pas)\s+)?(?:ce code\s+|votre code\s+|ton code\s+|ce mot de passe\s+)?(?:à personne|avec personne|jamais|pas)(?:\s+(?:à personne|avec personne))?(?:\s+(?:même|y compris)\s+(?:à|au|aux)\s+[\p{L}\s’'-]{1,40})?\s*[.!?]?$/iu,
  // "Ce code est personnel et confidentiel." / "Il est valable 10 minutes."
  /^\s*(?:ce code|il|le code)\s+est\s+(?:strictement\s+)?(?:personnel|confidentiel|valable|valide)[\p{L}\p{N}\s’'-]*[.!?]?$/iu,
  // "X ne vous demandera jamais ce code."
  /^\s*[\p{L}\p{N}\s’'.-]{0,40}\bne\s+(?:vous|te)\s+(?:demandera|demande|réclamera)\s+jamais\s+(?:ce|votre|ton|de)\s+[\p{L}\s’'-]{0,40}[.!?]?$/iu
];
export function activeContent(text:string){
  return text.toLowerCase().split(/(?<=[.!?])\s+|\n/).filter(sentence=>{
    const separated=/[,;:]|\b(?:mais|puis|ensuite|but|then)\b/.test(sentence);
    // A clause such as ", même à un conseiller" keeps prevention advice self-contained.
    if(separated&&!/^\s*ne\s+(?:l['’]\s*|le\s+|la\s+|les\s+)?\w+\s+(?:à|avec)\s+personne,\s*(?:même|y compris)\s+[\p{L}\s’'-]{1,40}[.!?]?$/iu.test(sentence))return true;
    return !PREVENTION.some(re=>re.test(sentence.replace(/,\s*(?=même|y compris)/u," ")));
  }).join('\n');
}
