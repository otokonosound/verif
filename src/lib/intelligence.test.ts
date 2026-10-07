import { describe, expect, it } from "vitest";
import { __test } from "./intelligence";

describe("VÉRIF Intelligence",()=>{
  it("parses SPF DKIM DMARC",()=>{
    const r=__test.parseAuthenticationResults("Authentication-Results: mx.example; spf=pass smtp.mailfrom=a.fr; dkim=pass header.d=a.fr; dmarc=pass header.from=a.fr");
    expect(r).toEqual({spf:"pass",dkim:"pass",dmarc:"pass"});
  });

  it("raises risk on failed mail authentication",()=>{
    const r=__test.mailAuthEvidence("Authentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail");
    expect(r.delta).toBeGreaterThanOrEqual(6);
    expect(r.reasons.join(" ")).toMatch(/SPF/);
  });

  it("slightly rewards corroborated successful authentication",()=>{
    const r=__test.mailAuthEvidence("Authentication-Results: mx.example; spf=pass; dkim=pass; dmarc=pass");
    expect(r.delta).toBe(-1);
  });

  it("flags very young domains from web research",()=>{
    const r=__test.researchRisk([{url:"https://x.test",host:"x.test",findings:["Domaine enregistré très récemment (5 jours)."]}],null);
    expect(r.delta).toBeGreaterThanOrEqual(3);
  });

  it("flags cross-domain redirects against claimed official domain",()=>{
    const r=__test.researchRisk([{url:"https://ameli.fr",host:"ameli.fr",finalHost:"evil.test",findings:[]}],"ameli.fr");
    expect(r.delta).toBeGreaterThanOrEqual(3);
  });

  it("computes age in days",()=>{
    const d=new Date(Date.now()-10*86400000).toISOString();
    expect(__test.ageDays(d)).toBeGreaterThanOrEqual(9);
  });
});
