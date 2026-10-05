import { describe,expect,it } from "vitest";
import { analyzeText } from "./analyze";

describe("analyzeText",()=>{
  it("flags an urgent payment link as stop",()=>{
    const r=analyzeText("Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis");
    expect(r.verdict).toBe("stop");
  });
  it("does not treat an ordinary HTTPS link as fraud",()=>{
    const r=analyzeText("Voici le compte rendu de la réunion : https://example.com/document");
    expect(r.verdict).toBe("ok");
  });
  it("recognizes an official domain without penalizing it",()=>{
    const r=analyzeText("Retrouvez votre démarche sur https://www.service-public.fr/");
    expect(r.verdict).toBe("ok");
    expect(r.urls?.[0].official).toBe("Service-Public.fr");
  });
  it("flags a suspicious lookalike delivery domain",()=>{
    const r=analyzeText("Votre colis est bloqué. Payez 2,99 € immédiatement https://chronopost-secure.example/paiment");
    expect(["stop","caution"]).toContain(r.verdict);
    expect(r.reasons.some(x=>x.toLowerCase().includes("domaine"))).toBe(true);
  });
  it("flags an account takeover attempt",()=>{
    const r=analyzeText("Votre compte est suspendu. Confirmez votre mot de passe et votre code immédiatement https://fake-login.example");
    expect(["stop","caution"]).toContain(r.verdict);
  });
  it("flags a payment request without pretending certainty",()=>{
    const r=analyzeText("Merci d'effectuer un paiement via ce lien https://example.com");
    expect(["caution","check"]).toContain(r.verdict);
  });
  it("does not overstate a normal sentence",()=>{
    const r=analyzeText("Bonjour, rendez-vous confirmé demain à 18h.");
    expect(r.verdict).toBe("ok");
  });
});