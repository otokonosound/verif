# VÉRIF 2.1 — Intelligence

**Un doute ? Vérifie avant d’agir.**

VÉRIF est une PWA mobile-first et une extension Chrome/Edge qui analyse des SMS, e-mails, URL, QR codes, captures et documents avant que l’utilisateur n’agisse.

La version 2.1 remplace le simple score heuristique par une architecture **multi-preuves** : moteur déterministe, authentification e-mail, renseignements DNS/RDAP, recherche web via l’extension, IA embarquée lorsqu’elle est disponible, et moteur serveur optionnel.

Application publique : https://otokonosound.github.io/verif/

## Architecture de décision

VÉRIF n’autorise pas un modèle d’IA à décider seul.

1. **Moteur déterministe local** : URL, domaines ressemblants, redirections, punycode, ports, exécutables, identité de l’expéditeur, Reply-To/Return-Path, urgence, paiement, OTP, RIB/IBAN, prise en main à distance, coupons prépayés, crypto, marketplaces et autres scénarios à fort signal.
2. **Authentification e-mail** : exploitation des résultats SPF, DKIM et DMARC lorsqu’ils sont présents dans le contenu fourni.
3. **Renseignements web** : DNS, RDAP et âge du domaine. La recherche est facultative et ne visite jamais automatiquement le lien suspect. L’extension analyse le contenu déjà visible dans l’onglet.
4. **IA embarquée** : le Prompt API / LanguageModel du navigateur est utilisé comme second avis local quand il est disponible. Il peut renforcer un verdict mais ne peut pas annuler une preuve technique forte.
5. **Moteur serveur optionnel** : DNS/RDAP, recherche Brave ou SearXNG si configurée, puis second avis IA optionnel. Les résultats de recherche ne renforcent le risque que lorsqu’une source de sécurité reconnue corrobore explicitement le domaine.

## Verdicts

- 🟢 **OK** : aucun signal préoccupant n’a été établi avec les données disponibles.
- 🟡 **À VÉRIFIER** : une preuve faible ou incomplète nécessite une vérification indépendante.
- 🟠 **PRUDENCE** : plusieurs éléments justifient de ne pas agir directement depuis le contenu.
- 🔴 **STOP** : des preuves fortes ou plusieurs sources convergentes sont compatibles avec une fraude.

**OK n’est jamais une garantie absolue de sécurité.**

## PWA

- texte, SMS et e-mails ;
- URL et domaines, y compris domaines sans protocole ;
- OCR local des images ;
- QR codes ;
- PDF, DOCX, XLSX, TXT et ZIP ;
- inspection d’exécutables sans exécution ;
- Web Share Target Android ;
- historique local ;
- recommandations et dossier d’incident ;
- mode hors ligne pour les fonctions locales.

## Extension Chrome / Edge

Dossier `extension/`, Manifest V3.

- analyse de la page active ;
- clic droit sur un lien ou une sélection ;
- intégration Gmail Web et Outlook Web ;
- recherche DNS + RDAP ;
- contrôle des redirections et de la destination finale ;
- lecture limitée du HTML distant sans exécuter ses scripts ;
- IA embarquée locale quand `LanguageModel` est disponible ;
- pont vers la PWA VÉRIF pour enrichir une vérification.

Voir `extension/README.md`.

## IA embarquée et compatibilité

L’IA locale est **optionnelle** et détectée à l’exécution. Sur les navigateurs/appareils qui ne proposent pas `LanguageModel`, VÉRIF continue avec le moteur déterministe et les preuves web disponibles.

Sur Android, il ne faut pas supposer que le modèle intégré de Chrome est disponible : VÉRIF reste donc fonctionnel sans lui. Un serveur VÉRIF peut être configuré pour fournir un second avis IA distant si nécessaire.

## Serveur optionnel

Le dossier `server/` fournit une API sans framework :

- `POST /api/analyze`
- `GET /api/health`
- `GET /api/capabilities`

Variables optionnelles : `HF_TOKEN`, `HF_MODEL`, `BRAVE_SEARCH_API_KEY`, `SEARXNG_URL`, `VITE_VERIF_API_URL`. Sans moteur de recherche configuré, le serveur conserve DNS + RDAP.

Aucun secret ne doit être placé dans le code client.

## Tests

```bash
npm install
npm test
npm run test:extension
npm run test:api
npm run build
```

La CI contrôle également la syntaxe des scripts d’extension/recherche, Manifest V3, le Web Share Target, Gmail/Outlook et le pont VÉRIF Intelligence.

## Confidentialité et sécurité

- [Architecture Intelligence](docs/INTELLIGENCE.md)
- [Confidentialité](docs/PRIVACY.md)
- [Sécurité](docs/SECURITY.md)
- [Spécification V2](docs/V2-FINAL.md)

VÉRIF est un outil d’aide à la décision. Il ne remplace pas les protections natives du navigateur, les canaux officiels d’une banque/administration ou l’analyse d’un professionnel de la cybersécurité.

## Validation de l’intégration

Voir [le rapport et les limites de validation](docs/INTELLIGENCE-VALIDATION.md). Le build produit une [extension installable](https://otokonosound.github.io/verif/downloads/verif-extension.zip). La recherche web complète nécessite une API configurée ; GitHub Pages seul ne l’exécute pas.
