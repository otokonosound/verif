# Écosystème VÉRIF

VÉRIF est organisé en trois briques complémentaires.

## 1. VÉRIF Web / PWA

- analyse de texte, SMS et e-mails ;
- URL et domaines ;
- captures/photos avec OCR local ;
- QR codes ;
- PDF, DOCX, XLSX, TXT et ZIP ;
- détection d'exécutables ;
- historique local ;
- recommandations et dossier d'incident ;
- fonctionnement local-first ;
- installation comme PWA.

Adresse publique : https://otokonosound.github.io/verif/

## 2. Extension navigateur

Dossier `extension/`.

Compatible Chrome et Edge avec Manifest V3 :
- analyse de la page active ;
- clic droit sur un lien ;
- clic droit sur une sélection ;
- analyse locale ;
- accès direct à VÉRIF pour une analyse approfondie.

Installation : voir `extension/README.md`.

## 3. Moteur

`src/lib/analyze.ts` contient le moteur principal de l'application web.
`extension/analyzer.js` est un moteur autonome pour l'extension.

## Verdicts

- 🟢 **OK** : aucun signal évident détecté ;
- 🟡 **À VÉRIFIER** : un élément mérite une vérification ;
- 🟠 **PRUDENCE** : plusieurs signaux justifient de ne pas agir depuis le contenu ;
- 🔴 **STOP** : plusieurs signaux forts sont compatibles avec une fraude.

Un verdict n'est jamais une garantie absolue de sécurité.

## Validation automatisée

La CI vérifie les tests du moteur web, l'extension, le moteur serveur, le build Vite et le manifeste Manifest V3.

## Développement

```bash
npm install
npm test
npm run test:extension
npm run test:api
npm run build
```

## Confidentialité

L'analyse de l'extension est locale au navigateur. L'application web privilégie le traitement local. Voir `docs/PRIVACY.md`.

## Sécurité

Voir `docs/SECURITY.md`.

VÉRIF est un outil d'aide à la décision et ne remplace ni les protections natives du navigateur, ni une banque, ni une administration, ni un professionnel de la cybersécurité.