// Suppress only standalone prevention advice. Mixed clauses remain analyzable.
export function activeContent(text:string){
  return text.toLowerCase().split(/(?<=[.!?])\s+|\n/).filter(sentence=>{
    if(/[,;:]|\b(?:mais|puis|ensuite|but|then)\b/.test(sentence))return true;
    return !/^\s*(?:ne\s+(?:communiqu\w*|partag\w*|transmett\w*|donn\w*|envoy\w*)\s+(?:jamais|pas)|never\s+(?:share|send|give))\s+(?:votre|vos|ton|tes|un|your)\s+(?:code|mot de passe|password|otp)[\p{L}\p{N}\s’'-]*[.!?]?$/iu.test(sentence);
  }).join('\n');
}
