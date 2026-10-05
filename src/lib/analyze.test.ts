import { describe,expect,it } from "vitest";
import { analyzeText } from "./analyze";

const cases = [
  ["Bonjour, rendez-vous confirmé demain à 18h.", "ok"],
  ["Voici le compte rendu : https://example.com/document", "ok"],
  ["Retrouvez votre démarche sur https://www.service-public.fr/", "ok"],
  ["Votre colis arrive demain. Suivez-le sur https://www.chronopost.fr/", "ok"],
  ["Votre remboursement est disponible dans votre espace client.", "ok"],
  ["Merci d'effectuer un paiement via ce lien https://example.com", "check"],
  ["Votre facture de 49,90 € est disponible. Consultez-la dans votre espace client.", "check"],
  ["Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis", "stop"],
  ["Votre compte est suspendu. Confirmez votre mot de passe et votre code immédiatement https://fake-login.example", "stop"],
  ["Votre remboursement de 347 € est disponible. Cliquez ici pour confirmer vos coordonnées https://fake.example/remboursement", "stop"],
  ["ALERTE : votre carte sera bloquée dans 10 minutes. Payez 1,99 € https://fake.example", "stop"],
  ["Votre colis est bloqué. Payez 2,99 € immédiatement https://chronop0st.fr/paiment", "stop"],
  ["Cliquez ici pour suivre votre colis https://bit.ly/abc123", "caution"],
  ["Connectez-vous immédiatement https://192.0.2.10/login pour éviter le blocage.", "stop"],
  ["Votre compte doit être vérifié https://example.com/redirect?url=https://fake.example", "caution"],
  ["Installez cette application APK pour recevoir votre remboursement https://fake.example/app.apk", "stop"],
  ["Votre dossier administratif est disponible : https://www.impots.gouv.fr/", "ok"],
  ["Votre espace Ameli est accessible ici : https://www.ameli.fr/", "ok"],
  ["Votre colis arrive demain. Le suivi est disponible sur notre site.", "ok"],
  ["Une opération bancaire est disponible dans votre application.", "ok"],
] as const;

describe("VÉRIF local analyzer — red team", () => {
  for (const [text, expected] of cases) {
    it(`${expected.toUpperCase()} — ${text.slice(0, 65)}`, () => {
      expect(analyzeText(text).verdict).toBe(expected);
    });
  }

  it("detects a lookalike domain", () => {
    const r = analyzeText("Votre colis est bloqué. Payez 2,99 € immédiatement https://chronop0st.fr/paiment");
    expect(r.verdict).toBe("stop");
    expect(r.reasons.some(x => x.toLowerCase().includes("domaine"))).toBe(true);
  });

  it("detects sender/domain mismatch", () => {
    const r = analyzeText("From: service@chronopost-secure.fr\nVotre colis est bloqué. https://chronopost-secure.fr/payer");
    expect(r.identity?.status).toBe("mismatch");
    expect(r.verdict).not.toBe("ok");
  });

  it("does not treat a normal payment mention as fraud", () => {
    const r = analyzeText("Votre facture de 49,90 € est disponible dans votre espace client.");
    expect(r.verdict).toBe("ok");
  });

  it("forces STOP for a linked refund confirmation request", () => {
    const r = analyzeText("Votre remboursement de 347 € est disponible. Cliquez ici pour confirmer vos coordonnées https://fake.example/remboursement");
    expect(r.verdict).toBe("stop");
    expect(r.evidence?.risk).toBeGreaterThanOrEqual(6);
  });

  it("recognizes official domains", () => {
    const r = analyzeText("Retrouvez votre démarche sur https://www.service-public.fr/");
    expect(r.urls?.[0]?.official).toBe("Service-Public.fr");
    expect(r.verdict).toBe("ok");
  });
});
