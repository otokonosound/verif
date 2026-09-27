# VÉRIF

**Un doute ? Vérifie avant d'agir.**

VÉRIF est une PWA mobile-first destinée à aider le grand public à analyser rapidement un message, un lien ou un contenu reçu avant d'agir.

## État du projet

La branche `dev/verif-v2` contient le socle produit et une première API serveur :

- React + TypeScript + Vite
- interface mobile-first et responsive PC
- PWA-ready (manifest + cache service worker)
- analyse locale explicable
- API Node sans dépendance serveur lourde
- inspection d'URL et registre initial de domaines officiels
- détection de discordance organisme/domaine
- verdicts `OK`, `À VÉRIFIER`, `PRUDENCE`, `STOP`
- raisons détectées et actions recommandées
- tests frontend + moteur serveur
- pipeline GitHub Actions

## Développement local

```bash
npm install
npm run dev
```

Dans un second terminal :

```bash
npm run api
```

API : `POST /api/analyze` avec `{ "text": "..." }`.

## Validation

```bash
npm test
npm run test:api
npm run build
```

## Architecture

```text
SMS / e-mail / URL / capture / partage smartphone
                ↓
        Extraction / OCR
                ↓
          Normalisation
                ↓
      Signaux déterministes
                ↓
  URL / domaine / sources officielles
                ↓
       Moteur de règles
                ↓
       IA contrôlée (V2+)
                ↓
    Verdict + preuves + action
```

### Sources et garde-fous

Les conseils de protection suivent notamment les recommandations publiques de Cybermalveillance.gouv.fr : ne pas agir depuis un lien douteux, vérifier directement auprès de l'organisme concerné et conserver les preuves en cas d'incident.

VÉRIF ne doit jamais transformer une analyse probabiliste en certitude. Le produit doit pouvoir répondre **« je ne sais pas »** et montrer pourquoi une vérification supplémentaire est nécessaire.

Le moteur actuel est un prototype : il ne constitue pas un service de cybersécurité et ne garantit jamais qu'un contenu est sûr.

## Suite

- OCR réel pour captures/photos ;
- vérification serveur des URL/redirections ;
- registre officiel versionné et maintenable ;
- réputation de domaine avec sources externes ;
- analyse IA structurée, après les contrôles déterministes ;
- corpus de tests et non-régression ;
- partage smartphone et deep-links ;
- rate limiting, observabilité et protection anti-abus ;
- politique de confidentialité et minimisation des données avant mise en production.
