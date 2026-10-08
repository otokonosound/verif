import {afterEach,describe,it,expect,vi} from 'vitest';
import {analyzeLocal,analyzeIntelligently,__test} from './intelligence';
import {analyzeText} from './analyze';
import {mergeRemoteIntelligence} from './remote-intelligence';
import {networkHost,registeredDomain} from './domain';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
describe('hybrid regression and calibration',()=>{
  it.each(['Bonjour, rendez-vous demain à 15 heures.','Ne communiquez jamais votre code de vérification.','Ne partage jamais ton mot de passe.','Une carte cadeau est disponible dans notre catalogue.'])('avoids benign warning or mention: %s',text=>expect(analyzeLocal(text).verdict).not.toBe('stop'));
  it.each(['Installe AnyDesk et donne-moi le code affiché.','Achète des coupons Transcash et envoie-moi les codes.','Nos coordonnées bancaires ont changé. Utilise ce nouvel IBAN.'])('detects actionable fraud: %s',text=>expect(['caution','stop']).toContain(analyzeLocal(text).verdict));
  it('never suppresses malicious URL evidence with a negated sentence',()=>expect(analyzeLocal('Ne partage jamais ton code. https://ameli-remboursement.com/login').verdict).not.toBe('ok'));
  it('does not suppress a payment request disguised as prevention',()=>expect(analyzeLocal('Ne perdez pas de temps, payez immédiatement les frais par coupons Transcash.').verdict).toBe('stop'));
  it('recognizes nested official domains without trusting suffix spoofing',()=>{
    expect(analyzeText('https://login.mabanque.bnpparibas').urls?.[0].official).toBeTruthy();
    expect(analyzeText('https://ameli.fr.evil.com').urls?.[0].official).toBeNull();
  });
  it('uses public and private suffix boundaries',()=>{
    expect(registeredDomain('login.shop.co.uk')).toBe('shop.co.uk');
    expect(registeredDomain('person.github.io')).toBe('person.github.io');
  });
  it.each(['127.0.0.1','172.16.1.1','[::1]','router.local','localhost','evil.test'])('does not enrich private/reserved targets %s',host=>expect(networkHost(host)).toBe(false));
  it('does not count duplicate domain ages or outage findings as risk',()=>{
    const item={url:'https://new.com',host:'new.com',rdap:{ageDays:2}};
    expect(__test.researchRisk([item,item]).delta).toBe(3);
    expect(__test.researchRisk([{url:'https://a.com',host:'a.com',findings:['Domaine enregistré très récemment','Le domaine ne renvoie pas une adresse']}]).delta).toBe(0);
  });
  it('ignores Authentication-Results in message body',()=>expect(__test.parseAuthenticationResults('Subject: hi\n\nAuthentication-Results: attacker; spf=pass').spf).toBeNull());
  it('does not mistake a display name for Reply-To mismatch',()=>expect(analyzeText('From: Alice <alice@example.com>\nReply-To: Alice <alice@example.com>\nBonjour').reasons.join(' ')).not.toContain('Reply-To diffère'));
  it('stays offline when research is disabled',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('LanguageModel',undefined);
    const result=await analyzeIntelligently('https://ameli.fr',undefined,{web:false});
    expect(fetch).not.toHaveBeenCalled();expect(result.intelligence?.web.available).toBe(false);
  });
  it('retains deterministic STOP when AI says OK',()=>{
    const base=analyzeText('Ameli urgent payez 3 € https://ameli-remboursement.com');
    const result=__test.merge(base,'',{available:true,used:true,verdict:'ok'},null,__test.mailAuthEvidence(''));
    expect(result.verdict).toBe('stop');
  });
  it('AI alone cannot establish STOP or high confidence',()=>{
    const base=analyzeText('Bonjour');
    const result=__test.merge(base,'Bonjour',{available:true,used:true,verdict:'stop'},null,__test.mailAuthEvidence(''));
    expect(result.verdict).toBe('caution');expect(result.confidence).not.toBe('élevée');
  });
  it('releases model sessions on malformed output and errors',async()=>{
    const destroy=vi.fn();vi.stubGlobal('LanguageModel',{availability:async()=>'available',create:async()=>({prompt:async()=>{throw Error('failed')},destroy})});
    expect((await __test.localAiReview('Bonjour',analyzeText('Bonjour'))).used).toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('does not download a model automatically',async()=>{
    const create=vi.fn();vi.stubGlobal('LanguageModel',{availability:async()=>'downloadable',create});
    await __test.localAiReview('Bonjour',analyzeText('Bonjour'));expect(create).not.toHaveBeenCalled();
  });
  it('survives malformed remote arrays and preserves local floor',()=>{
    const local=analyzeLocal('Ameli urgent payez https://ameli-remboursement.com');
    expect(mergeRemoteIntelligence(local,{verdict:'ok',reasons:{},actions:null}).verdict).toBe(local.verdict);
  });
  it('reports no successful web research when every provider failed',()=>{
    const result=__test.merge(analyzeText('Bonjour'),'Bonjour',{available:false,used:false},{items:[{url:'https://a.com',host:'a.com'}]},__test.mailAuthEvidence(''));
    expect(result.intelligence?.mode).toBe('local');
  });
});
