import { describe, expect, it } from "vitest";
import { analyzeText } from "./analyze";

const matrix = [
  ["Message neutre", "Bonjour, le rendez-vous de demain est confirmé à 18h.", "ok"],
  ["Lien HTTPS neutre", "Consultez le document sur https://example.com/document", "ok"],
  ["Service Public officiel", "Votre démarche est disponible sur https://www.service-public.fr/", "ok"],
  ["Ameli officiel", "Votre espace est accessible sur https://www.ameli.fr/", "ok"],
  ["Chronopost officiel", "Le suivi est disponible sur https://www.chronopost.fr/", "ok"],
  ["HTTPS absent", "Consultez http://example.com/document", "check"],
  ["Port inhabituel", "Consultez https://example.com:8443/document", "caution"],
  ["Identifiants dans URL", "Ouvrez https://user:pass@example.com/login", "caution"],
  ["IP directe", "Connectez-vous sur https://192.0.2.10/login", "caution"],
  ["Punycode", "Consultez https://xn--e1afmkfd.xn--p1ai/", "caution"],
  ["Redirection", "Vérifiez https://example.com/redirect?url=https://fake.example", "caution"],
  ["URL exécutable", "Téléchargez https://example.com/update.exe", "stop"],
  ["Pression seule", "Votre compte sera suspendu immédiatement.", "check"],
  ["CTA + pression", "Votre compte sera suspendu immédiatement. Cliquez ici https://example.com/", "caution"],
  ["Identifiants + pression", "Votre compte est suspendu. Confirmez votre mot de passe immédiatement https://example.com/", "stop"],
  ["Carte + code + urgence", "Votre carte sera bloquée dans 10 minutes. Saisissez votre code de sécurité https://example.com/", "stop"],
  ["Frais livraison", "Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis", "stop"],
  ["Remboursement lié", "Votre remboursement de 347 € est disponible. Cliquez pour confirmer vos coordonnées https://fake.example/remboursement", "stop"],
  ["APK", "Installez cette application APK pour recevoir votre remboursement https://fake.example/app.apk", "stop"],
  ["Lien raccourci simple", "Cliquez ici pour suivre votre colis https://bit.ly/abc123", "caution"],
  ["Domaine ressemblant", "Votre colis est bloqué. Payez 2,99 € immédiatement https://chronop0st.fr/paiement", "stop"],
  ["Domaine non officiel", "Votre compte Ameli est suspendu https://fake-ameli.example/login", "caution"],
  ["Messagerie grand public", "De : Ameli <ameli-securite@gmail.com> Votre compte est suspendu. Confirmez votre mot de passe https://fake.example/login", "stop"],
  ["Reply-To différent", "From: CAF <contact@caf.fr>\nReply-To: fraude@gmail.com\nInformation CAF", "check"],
  ["Return-Path différent", "From: CAF <contact@caf.fr>\nReturn-Path: <fraude@fake.example>\nInformation CAF", "check"],
  ["Sous-domaines nombreux", "Connectez-vous sur https://a.b.c.d.e.example.com/login", "caution"],
  ["Extension exécutable sans contexte", "Voici le fichier https://example.com/document.exe", "stop"],
  ["Montant seul", "Votre facture de 49,90 € est disponible dans votre espace client.", "check"],
  ["Paiement générique", "Merci d'effectuer un paiement via ce lien https://example.com", "check"]
] as const;

describe("VÉRIF v1 — matrice red-team étendue", () => {
  for (const [name, text, expected] of matrix) {
    it(`${expected.toUpperCase()} — ${name}`, () => {
      const result = analyzeText(text);
      expect(result.verdict).toBe(expected);
      expect(result.checkedAt).toBeTruthy();
      expect(result.engine).toBe("VÉRIF local");
    });
  }


  it("forces a strong verdict for an impersonated France Travail domain", () => {
    const result = analyzeText("France Travail : votre allocation est suspendue. Agissez immédiatement https://fake-france-travail.example/connexion");
    expect(result.verdict).toBe("stop");
  });

  it("forces a strong verdict for an impersonated PayPal domain", () => {
    const result = analyzeText("PayPal : votre compte est limité. Vérifiez votre carte bancaire maintenant https://fake-paypal.example/login");
    expect(result.verdict).toBe("stop");
  });

  it("keeps a direct IP alone at prudence", () => {
    const result = analyzeText("Connectez-vous sur https://192.0.2.10/login");
    expect(result.verdict).toBe("caution");
  });

  it("exposes actionable recommendations for a high-risk phishing case", () => {
    const result = analyzeText("Votre compte bancaire sera bloqué. Confirmez votre mot de passe et votre carte immédiatement https://fake.example/login");
    expect(result.verdict).toBe("stop");
    expect(result.recommendation).toBeTruthy();
    expect(result.recommendation?.steps.length).toBeGreaterThan(0);
    expect(result.incidentReport).toContain("VÉRIF — DOSSIER D’INCIDENT");
  });

  it("keeps official sender identity coherent", () => {
    const result = analyzeText("From: Ameli <contact@ameli.fr>\nVotre information est disponible.");
    expect(result.identity?.status).toBe("official");
    expect(result.verdict).toBe("ok");
  });

  it("detects a suspicious sender pretending to be an official organization", () => {
    const result = analyzeText("From: Service Public <contact@service-public-alert.example>\nVotre dossier est suspendu. Cliquez ici https://service-public-alert.example/login");
    expect(result.identity?.status).toBe("mismatch");
    expect(result.verdict).not.toBe("ok");
  });

  it("preserves official URL recognition with www", () => {
    const result = analyzeText("https://www.impots.gouv.fr/");
    expect(result.urls?.[0]?.official).toBe("impots.gouv.fr");
    expect(result.verdict).toBe("ok");
  });

  it("deduplicates repeated URLs", () => {
    const result = analyzeText("Lien https://example.com/a puis à nouveau https://example.com/a");
    expect(result.urls).toHaveLength(1);
  });

  it("does not execute or need a remote engine to analyze content", () => {
    const result = analyzeText("URGENT : cliquez https://fake.example/login");
    expect(result.engine).toBe("VÉRIF local");
  });
});
