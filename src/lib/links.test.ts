import { describe, expect, it } from "vitest";
import { analyzeText } from "./analyze";
import { plausibleNakedHost } from "./domain";

const urls = (text: string) => (analyzeText(text).urls || []).map(u => u.url);

describe("link extraction", () => {
  it.each([
    "From: Ameli <service.client@ameli.fr>\nBonjour, votre attestation est disponible dans votre compte ameli.",
    "De : jean.dupont@gmail.com\nSalut, on se voit demain ?",
    "Bonjour Madame.Merci pour votre retour.Cordialement",
    "Tu trouveras le compte rendu dans rapport.pdf et la facture dans facture.docx",
    "M.Dupont vous attend à 14h.Tel 01 02 03 04 05",
    "Je passe demain.Je te rappelle ensuite.Et merci encore",
    "Le dossier est dans archive.zip",
    "Mise à jour vers la version 2.1.0, prix 12.50 euros"
  ])("does not invent a link in: %s", text => expect(urls(text)).toEqual([]));

  it("does not downgrade a legitimate mail because of its sender address", () => {
    const r = analyzeText("From: Ameli <service.client@ameli.fr>\nBonjour, votre attestation est disponible dans votre compte ameli.");
    expect(r.identity?.status).toBe("official");
    expect(r.verdict).toBe("ok");
  });

  it("still detects scheme-less domains with a real TLD", () => {
    expect(urls("Vos droits expirent. Rendez-vous sur mon-compte-formation.info pour les conserver")).toEqual(["https://mon-compte-formation.info"]);
    expect(urls("Suivi : colis-suivi.com/track?id=4")).toEqual(["https://colis-suivi.com/track?id=4"]);
    expect(urls("voir www.exemple-site.fr/page")).toEqual(["https://www.exemple-site.fr/page"]);
  });

  it("keeps explicit links even when they look like files", () => {
    expect(urls("https://facture.zip/ouvrir")).toEqual(["https://facture.zip/ouvrir"]);
  });

  it("validates scheme-less hosts against real suffixes", () => {
    expect(plausibleNakedHost("ameli-remboursement.com")).toBe(true);
    expect(plausibleNakedHost("fake-login.example")).toBe(true);
    expect(plausibleNakedHost("prenom.nom")).toBe(false);
    expect(plausibleNakedHost("rapport.pdf")).toBe(false);
  });
});

describe("official registry", () => {
  it("accepts the other domains owned by the same organisation", () => {
    for (const text of [
      "Votre compte Facebook : consultez vos paramètres sur https://www.facebook.com/settings",
      "Votre commande Amazon est expédiée : https://www.amazon.com/gp/css/order-history",
      "Votre amende est consultable sur https://www.amendes.gouv.fr/",
      "Votre compte Microsoft : https://login.live.com/"
    ]) {
      const r = analyzeText(text);
      expect(r.urls?.[0]?.official).toBeTruthy();
      expect(r.reasons.join(" ")).not.toContain("aucun lien ne correspond");
      expect(r.reasons.join(" ")).not.toContain("ressemble à un domaine officiel");
    }
  });

  it("treats any gouv.fr host as an official site", () => {
    expect(analyzeText("https://www.demarches.interieur.gouv.fr/").urls?.[0]?.official).toBeTruthy();
    expect(analyzeText("https://gouv.fr.evil.com/").urls?.[0]?.official).toBeNull();
  });

  it("does not trust a public mailbox owned by the claimed brand", () => {
    const r = analyzeText("From: Microsoft <securite-compte@outlook.com>\nVotre compte Microsoft est suspendu. Confirmez votre mot de passe.");
    expect(r.identity?.status).not.toBe("official");
    expect(r.verdict).not.toBe("ok");
  });

  it("still flags a brand whose link points elsewhere", () => {
    const r = analyzeText("Votre compte Facebook est suspendu : https://facebook-securite.example/login");
    expect(r.reasons.join(" ")).toContain("aucun lien ne correspond");
    expect(r.verdict).toBe("stop");
  });
});
