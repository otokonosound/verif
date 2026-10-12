import { getDomain, parse } from 'tldts';
export function registeredDomain(host:string){return getDomain(host,{allowPrivateDomains:true})||host;}
export function networkHost(host:string){
  const h=host.toLowerCase().replace(/\.$/,'');
  // Enrichment only sends public DNS names to fixed providers, never opens target URLs.
  return h.length<=253 && /^[a-z0-9.-]+$/.test(h) && !/^\d+(?:\.\d+)*$/.test(h)
    && !/(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(h)
    && Boolean(getDomain(h));
}
// A scheme-less "word.word" is only treated as a link when its suffix is a real (ICANN) TLD
// or a reserved documentation/test TLD. This keeps "prenom.nom", "facture.pdf" or
// "Madame.Merci" from being reported as links.
const RESERVED_TLD=/\.(?:example|test|invalid)$/;
export function plausibleNakedHost(host:string){
  const h=host.toLowerCase().replace(/\.$/,'');
  if(!/^[a-z0-9.-]+$/.test(h)||h.length>253)return false;
  if(RESERVED_TLD.test(h))return true;
  const info=parse(h);
  return Boolean(info.domain)&&info.isIcann===true;
}
