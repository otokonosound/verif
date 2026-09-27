# VÉRIF

**Un doute ? Vérifie avant d'agir.**

VÉRIF est une PWA mobile-first destinée à aider le grand public à analyser rapidement un message, un lien ou un contenu reçu avant d'agir.

## État du projet

La branche `dev/verif-v2` contient le socle V2 :

- React + TypeScript + Vite
- interface mobile-first et responsive PC
- PWA-ready (manifest + cache service worker)
- analyse locale explicable
- verdicts `OK`, `À VÉRIFIER`, `PRUDENCE`, `STOP`
- raisons détectées et actions recommandées
- historique local de session
- tests unitaires du moteur de verdict
- pipeline GitHub Actions pour vérifier build et tests

## Développement local

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build
```

## Architecture prévue pour V2+

```text
Entrée utilisateur
  ├─ texte / SMS / e-mail
  ├─ URL
  ├─ capture / photo
  └─ partage depuis smartphone
          ↓
Extraction / OCR
          ↓
Normalisation
          ↓
Analyse des signaux
          ↓
Vérification URL / domaine / source
          ↓
Moteur de règles explicable
          ↓
Analyse IA contrôlée
          ↓
Verdict + preuves + action sûre
```

### Principe important

VÉRIF ne doit jamais transformer une analyse probabiliste en certitude. Le produit doit pouvoir répondre **« je ne sais pas »** et montrer pourquoi une vérification supplémentaire est nécessaire.

Le moteur actuel est volontairement local et heuristique. Il ne constitue pas un service de cybersécurité et ne garantit jamais qu'un contenu est sûr.

## Prochaine brique produit

La prochaine étape technique est de brancher :

1. OCR réel pour les captures/photos ;
2. analyse réelle des URL et redirections ;
3. registre de domaines officiels et sources fiables ;
4. backend sécurisé ;
5. moteur de règles versionné ;
6. analyse IA avec sorties structurées et garde-fous ;
7. tests de non-régression sur un corpus de messages légitimes et frauduleux ;
8. partage smartphone et deep-links ;
9. observabilité et protection anti-abus.
