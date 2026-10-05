import { describe,expect,it } from "vitest";
import { analyzeText } from "./analyze";

const cases=[
  ["Bonjour, rendez-vous confirmé demain à 18h.","ok"],
  ["Voici le compte rendu : https://example.com/document","ok"],
  ["Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis","stop"],
  ["Votre compte est suspendu. Confirmez votre mot de passe et votre code immédiatement https://fake-login.example","stop"],
  ["Votre remboursement de 347 € est disponible. Cliquez ici pour confirmer vos coordonnées https://fake.example/remboursement","stop"],
  ["Installez cette application APK pour recevoir votre remboursement https://fake.example/app.apk","caution"],
  ["Retrouvez votre démarche sur https://www.service-public.fr/","ok"],
  ["Votre colis arrive demain. Suivez-le sur https://www.chronopost.fr/","ok"],
  ["Merci d'effectuer un paiement via ce lien https://example.com","check"],
  ["ALERTE : votre carte sera bloquée dans 10 minutes. Payez 1,99 € https://fake.example","stop"]
] as const;

describe("VÉRIF local analyzer",()=>{
  for(const [text,expected] of cases){
    it(`${expected.toUpperCase()} — ${text.slice(0,55)}`,()=>{
      expect(analyzeText(text).verdict).toBe(expected);
    });
  }

  it("detects a lookalike domain",()=>{
    const r=analyzeText("Votre colis est bloqué. Payez 2,99 € immédiatement https://chronop0st.fr/paiment");
    expect(r.verdict).toBe("stop");
    expect(r.reasons.some(x=>x.toLowerCase().includes("domaine"))).toBe(true);
  });

  it("detects sender/domain mismatch",()=>{
    const r=analyzeText("From: service@chronopost-secure.fr\nVotre colis est bloqué. https://chronopost-secure.fr/payer");
    expect(r.identity?.status).toBe("mismatch");
    expect(r.verdict).not.toBe("ok");
  });
});