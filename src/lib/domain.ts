import { getDomain } from 'tldts';
export function registeredDomain(host:string){return getDomain(host,{allowPrivateDomains:true})||host;}
export function networkHost(host:string){
  const h=host.toLowerCase().replace(/\.$/,'');
  // Enrichment only sends public DNS names to fixed providers, never opens target URLs.
  return h.length<=253 && /^[a-z0-9.-]+$/.test(h) && !/^\d+(?:\.\d+)*$/.test(h)
    && !/(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(h)
    && Boolean(getDomain(h));
}
