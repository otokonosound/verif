import { describe, expect, it } from "vitest";
import { analyzeLocal } from "./intelligence";
import { analyzeText } from "./analyze";

// Everyday French scams: each must at least reach PRUDENCE.
const scams: Array<[string, string]> = [
 ["colis", "Chronopost: Votre colis est en attente de livraison. Veuillez confirmer le paiement des frais (1,99€) sur: https://chronopost-suivi-colis.com/fr"],
 ["colis2", "La Poste: votre colis n'a pas pu etre livre, reprogrammez la livraison: laposte-redirection.info/xG7"],
 ["hi-mum", "Coucou maman c'est moi, j'ai cassé mon téléphone, c'est mon nouveau numéro. Tu peux m'écrire sur WhatsApp ? J'ai besoin que tu m'aides pour payer une facture urgente aujourd'hui."],
 ["hi-mum2", "Salut papa, j'ai perdu mon téléphone, enregistre ce nouveau numéro. Peux-tu me faire un virement de 850€ ? Je te rembourse demain, c'est urgent."],
 ["cpf", "Votre solde CPF de 1500€ expire le 31/12. Utilisez vos droits avant leur suppression sur moncompteformation-droits.fr"],
 ["ameli-vitale", "Assurance Maladie: Votre carte Vitale expire. Commandez votre nouvelle carte vitale avant le 15/11 pour conserver vos droits: https://ameli-renouvellement.fr"],
 ["antai", "ANTAI: Vous avez une amende impayée de 35€. Sans régularisation sous 48h elle sera majorée à 375€. Payez sur https://antai-gouv.info"],
 ["impots-remb", "impots.gouv: Vous etes eligible a un remboursement de 289,30€. Veuillez remplir le formulaire: https://remboursement-impots-fr.com"],
 ["conseiller-banque", "Bonjour, ici le service fraude de votre banque. Une opération suspecte de 1200€ a été détectée. Pour l'annuler, communiquez-moi le code que vous allez recevoir par SMS."],
 ["netflix", "Netflix: votre abonnement est suspendu, votre paiement a été refusé. Mettez à jour vos informations: https://netflix-billing-update.com/login"],
 ["crit-air", "Votre vignette Crit'Air doit être renouvelée avant le 30/10 sous peine d'amende de 135€. Commandez-la ici: https://certificat-critair-gouv.com"],
 ["job", "Bonjour, nous recrutons pour une mission à domicile : liker des vidéos YouTube, 50 à 300€ par jour. Contactez-nous sur WhatsApp +33612345678"],
 ["sextortion", "J'ai piraté votre ordinateur et je vous ai filmé via votre webcam. Envoyez 1500€ en Bitcoin à cette adresse wallet : bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh sinon j'envoie la vidéo à tous vos contacts sous 48 heures."],
 ["giftcard", "Bonjour, c'est le directeur. Je suis en réunion, peux-tu m'acheter 5 cartes cadeaux Google Play de 100€ et m'envoyer les codes ? C'est confidentiel."],
 ["lbc", "Bonjour, je suis intéressé par votre article sur Leboncoin. J'ai effectué le paiement, pour recevoir l'argent cliquez sur ce lien et entrez votre carte bancaire : https://leboncoin-paiement-securise.com/r/8823"],
 ["tech-support", "ALERTE MICROSOFT : Votre ordinateur est infecté par un virus. Ne l'éteignez pas. Appelez immédiatement le support technique au 09 70 12 34 56."],
 ["edf", "EDF : un remboursement de 147,85€ est en attente sur votre compte. Cliquez ici pour le recevoir : http://edf-remboursement.net/client"],
 ["caf", "CAF: suite a une erreur de calcul, vous avez droit à une aide de 320€. Validez votre dossier: caf-aides-fr.com"],
 ["sms-code", "Votre code de vérification WhatsApp est 482-913. Ne le partagez pas. -- Bonjour, je vous ai envoyé ce code par erreur, pouvez-vous me le renvoyer svp ?"],
 ["inheritance", "Cher ami, je suis avocat et je vous contacte au sujet d'un héritage de 4,5 millions d'euros laissé par un client décédé portant votre nom. Merci de me répondre pour les formalités."],
 ["lottery", "Félicitations ! Vous avez gagné un iPhone 16. Réglez seulement les frais de port de 2€ pour le recevoir : https://gagnant-iphone.shop"],
 ["investment", "Placement garanti 12% par mois sur la crypto, sans risque. Investissez 250€ et gagnez 3000€ en un mois. Rejoins notre groupe Telegram."],
 ["mail-phish", "De : Service Client PayPal <service@paypal-securite.com>\nObjet : Votre compte est limité\nNous avons détecté une activité inhabituelle. Connectez-vous dans les 24 heures pour éviter la suspension : https://paypal-securite.com/verify"],
 ["mail-freemail", "From: Crédit Agricole <conseiller.creditagricole@gmail.com>\nVotre carte est bloquée. Merci de confirmer vos identifiants."],
 ["ma-prime", "Bonne nouvelle : vous êtes éligible à MaPrimeRénov' pour l'isolation à 1€. Un technicien passera demain, confirmez votre RDV en répondant OUI."],
 ["police", "Gendarmerie nationale: une procédure judiciaire est ouverte contre vous. Vous devez régler une amende de 500€ sous 24h pour éviter un mandat d'arrêt."],
 ["anydesk", "Bonjour, ici le service technique de votre banque. Pour sécuriser votre compte, installez l'application AnyDesk et donnez-moi le code affiché."],
 ["bit.ly", "Votre colis est retenu en douane. Payez les frais de 2,99€ : https://bit.ly/3xYz12"],
 ["rib", "Bonjour, suite à un changement de banque, voici notre nouveau RIB pour le règlement de la facture n°2024-118. Merci d'effectuer le virement dès aujourd'hui."],
 ["ants", "ANTS: Votre demande de permis est incomplete. Finalisez-la en reglant 12€ de frais: https://ants-permis-dossier.com"],
 ["vinted", "Vinted: Votre article a été vendu ! Pour recevoir votre argent, confirmez vos coordonnées bancaires ici: https://vinted-fr-paiement.com"],
 ["mutuelle", "Votre mutuelle: votre dossier de remboursement est bloqué. Merci de mettre à jour votre RIB sous 48h : http://mutuelle-remb.fr"],
 ["linky", "Enedis : votre compteur Linky doit être remplacé, une pénalité de 90€ sera appliquée. Prenez RDV en payant les frais : https://enedis-rdv.com"],
 ["romance", "Mon amour, je suis bloqué à l'aéroport de Lagos, ma carte ne fonctionne plus. Peux-tu m'envoyer 600€ par Western Union ? Je te rembourse dès mon retour."],
 ["account-insta", "Instagram: votre compte sera supprimé pour violation des droits d'auteur. Faites appel ici sous 24h: https://instagram-copyright-appeal.com"],
 ["fake-call", "Votre ligne sera coupée aujourd'hui pour facture impayée. Rappelez le 0899 23 45 67 pour éviter la coupure."],
 ["ups-unicode", "UPS: votre colis nécessite une confirmation d'adresse: https://ups.com-delivery.track-parcel.info/fr"],
 ["douane", "DOUANE: Votre colis est bloqué. Des taxes de 4,50 EUR sont dues. Réglez via: dgddi-taxes.com"],
 ["apk", "Votre application bancaire doit être mise à jour. Téléchargez la nouvelle version ici : https://maj-banque.com/app.apk"]
];

// Ordinary messages: none may reach PRUDENCE or STOP.
const legit: Array<[string, string]> = [
 ["otp", "Votre code de connexion Ameli est 548211. Il est valable 10 minutes. Ne le communiquez à personne."],
 ["rdv", "Rappel : votre rendez-vous chez le Dr Martin est demain à 14h30. Pour annuler, appelez le cabinet."],
 ["friend", "Salut ! On se retrouve à 20h au resto ce soir ? Dis-moi si t'es dispo."],
 ["colis-ok", "Chronopost : votre colis XY123456789FR sera livré demain entre 9h et 13h. Suivi : https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLV=XY123456789FR"],
 ["ameli-mail", "De : Assurance Maladie <ne-pas-repondre@assurance-maladie.ameli.fr>\nUn nouveau document est disponible dans votre compte ameli. Connectez-vous sur ameli.fr pour le consulter."],
 ["boss", "Bonjour à tous, la réunion d'équipe est décalée à jeudi 10h. Merci de mettre à jour vos agendas."],
 ["news", "Découvrez notre nouvelle collection automne sur https://www.zara.com/fr/"],
 ["link-gouv", "https://www.service-public.fr/particuliers/vosdroits/F1234"],
 ["sncf", "SNCF Connect : votre e-billet pour Paris - Lyon du 14/11 est disponible dans l'application. Bon voyage !"],
 ["bank-notif", "LCL : un virement de 1 200,00 € a été reçu sur votre compte courant."],
 ["school", "L'école sera fermée vendredi pour la journée pédagogique. Merci de prévoir un mode de garde."],
 ["github", "https://github.com/otokonosound/verif"],
 ["amazon-ok", "Amazon.fr : votre commande n°405-1234567-1234567 a été expédiée. Suivez votre colis sur https://www.amazon.fr/gp/your-account/orders"],
 ["family", "Maman, je rentre vers 19h, je passe acheter du pain."],
 ["impots-ok", "Votre avis d'impôt sur le revenu est disponible dans votre espace particulier sur impots.gouv.fr."],
 ["doctolib", "Doctolib : RDV confirmé le 12/11 à 9h00 avec Dr Durand. Gérez vos rendez-vous sur https://www.doctolib.fr"],
 ["voisin", "Bonjour, c'est votre voisin du 3e, j'ai récupéré votre colis, passez quand vous voulez."],
 ["facture-free", "Free : votre facture de 29,99€ est disponible dans votre Espace Abonné. Elle sera prélevée le 05/11."],
 ["wikipedia", "https://fr.wikipedia.org/wiki/Hame%C3%A7onnage"],
 ["youtube", "Regarde cette vidéo trop drôle https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
]
const ordinary: string[] = [
"Joyeux anniversaire ! Félicitations pour tes 30 ans, on fête ça samedi ?",
"Mon téléphone est cassé, je t'appelle avec celui de Paul ce soir.",
"Nous recrutons un développeur web en CDI à Lyon. Envoyez votre CV à rh@entreprise.fr",
"Mon PC est infecté par un virus, tu peux passer m'aider ? Appelle-moi.",
"Félicitations, vous avez gagné 50 points de fidélité sur votre carte Carrefour !",
"Le Livret A rapporte 3% par an depuis février.",
"Bonjour, voici mon nouveau numéro pro, pense à l'enregistrer. Bonne journée !",
"Votre code de vérification Google est G-482913.",
"123456 est votre code de connexion Instagram. Ne le partagez pas.",
"Votre colis Mondial Relay est disponible en Point Relais jusqu'au 20/10.",
"Rappel : la facture EDF de 82,40 € sera prélevée le 10/11.",
"La réunion parents-profs aura lieu à 18h. Merci de confirmer votre présence.",
"Ton virement de 20€ pour le resto est bien arrivé, merci !",
"Ta mission si tu l'acceptes : ramener des croissants demain matin 😄",
"Super vidéo de toi au mariage, je l'envoie à la famille !",
"Votre code de sécurité est 4821. Ce code est personnel et confidentiel.",
"Vous avez été sélectionné pour participer à notre enquête de satisfaction. Merci de répondre au questionnaire en ligne dans votre espace client.",
];

describe("arnaques courantes", () => {
  it.each(scams)("%s", (_name, text) => expect(["caution", "stop"]).toContain(analyzeLocal(text).verdict));
});
describe("messages ordinaires", () => {
  it.each(legit)("%s", (_name, text) => expect(["ok", "check"]).toContain(analyzeLocal(text).verdict));
  it.each(ordinary)("%s", text => expect(["ok", "check"]).toContain(analyzeLocal(text).verdict));
});

describe("conseils et signalement adaptés", () => {
  const scenarioOf = (text: string) => analyzeLocal(text).recommendation?.scenario;
  it("faux proche", () => expect(scenarioOf(scams.find(([n]) => n === "hi-mum")![1])).toBe("family_impersonation"));
  it("faux conseiller", () => expect(scenarioOf(scams.find(([n]) => n === "conseiller-banque")![1])).toBe("fake_advisor"));
  it("faux support", () => expect(scenarioOf(scams.find(([n]) => n === "tech-support")![1])).toBe("tech_support"));
  it("faux placement", () => expect(scenarioOf(scams.find(([n]) => n === "investment")![1])).toBe("investment_scam"));
  it("chantage", () => expect(scenarioOf(scams.find(([n]) => n === "sextortion")![1])).toBe("sextortion"));
  it("un SMS se signale au 33700 et son lien à Phishing Initiative", () => {
    const labels = analyzeLocal(scams[0][1]).recommendation!.reports!.map(r => r.label).join(" ");
    expect(labels).toContain("33700");
    expect(labels).toContain("Phishing Initiative");
    expect(labels).toContain("0 805 805 817");
  });
  it("un e-mail se signale à Signal Spam", () => {
    const labels = analyzeLocal(scams.find(([n]) => n === "mail-phish")![1]).recommendation!.reports!.map(r => r.label).join(" ");
    expect(labels).toContain("Signal Spam");
  });
  it("sans lien, le conseil ne parle pas d’un lien", () => {
    const actions = analyzeLocal(scams.find(([n]) => n === "hi-mum")![1]).actions.join(" ");
    expect(actions).not.toMatch(/lien/);
  });
  it("une adresse déguisée nomme le vrai site", () => {
    const findings = analyzeText("https://impots.gouv.fr.remboursement-dgfip.com/login").urls![0].findings.join(" ");
    expect(findings).toContain("remboursement-dgfip.com");
  });
  it("un vrai sous-domaine officiel n’est pas pris pour un déguisement", () => {
    expect(analyzeText("https://www.impots.gouv.fr/accueil").urls![0].findings).toEqual([]);
  });
  it("le dossier d’incident neutralise les liens", () => {
    expect(analyzeLocal(scams[0][1]).incidentReport).toContain("hxxps://chronopost-suivi-colis.com");
  });
});
