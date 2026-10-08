# VÉRIF Intelligence 2.1

## Objectif

Réduire à la fois les faux négatifs et les faux positifs en faisant converger plusieurs familles de preuves plutôt qu’en additionnant aveuglément des mots-clés.

## Pipeline

### 1. Analyse déterministe

Le moteur local extrait les URL, domaines, identité revendiquée, adresse expéditeur, Reply-To, Return-Path et signaux de contexte. Il détecte notamment les domaines ressemblants, punycode, IP directes, ports atypiques, redirections, exécutables, URL actives, demandes d’OTP, changements d’IBAN/RIB, prise en main à distance, paiements prépayés et scénarios d’ingénierie sociale.

### 2. Authentification e-mail

Si des en-têtes `Authentication-Results` sont présents, SPF, DKIM et DMARC deviennent des preuves indépendantes. Un échec est un indice déclaré ; des validations copiées ne prouvent pas l’identité et ne diminuent pas le risque.

### 3. Renseignements web

DNS et RDAP permettent de vérifier qu’un domaine existe et d’estimer son ancienneté. Un domaine créé depuis quelques jours est une preuve utile mais jamais suffisante à lui seul.

L’extension analyse la page déjà ouverte. Les recherches automatiques ne visitent plus les URL suspectes ni leurs redirections ; DNS/RDAP sont proposés sur demande.

### 4. IA embarquée

Quand le navigateur fournit `LanguageModel`, VÉRIF lui soumet le contenu et les preuves déjà collectées. Le modèle agit comme analyste secondaire : contradictions, ingénierie sociale, éléments manquants. Sa sortie est JSON et un avis mal formé est ignoré.

L’IA n’a pas le droit de faire passer un verdict vers un niveau moins prudent que celui imposé par les preuves techniques.

### 5. Serveur optionnel

Le serveur peut ajouter :

- DNS + RDAP ;
- recherche Brave Search avec clé serveur ;
- recherche SearXNG avec instance configurée ;
- second avis IA via le fournisseur configuré.

Les résultats génériques du Web ne sont pas considérés comme une preuve en eux-mêmes. Un signal de réputation n’augmente le risque que lorsqu’une source de sécurité reconnue mentionne explicitement le domaine cible.

## Résilience

Chaque couche est optionnelle. Si l’IA locale, RDAP, DNS, l’extension ou le serveur est indisponible, VÉRIF garde son moteur déterministe et indique le mode réellement utilisé.

## Compatibilité mobile

La PWA fonctionne sur Android pour le moteur local, OCR/QR, fichiers, partage et renseignements web compatibles avec le navigateur. L’IA intégrée de Chrome n’est pas supposée disponible sur Android : VÉRIF ne prétend donc pas l’utiliser quand l’API `LanguageModel` est absente.

## Philosophie de calibration

- une preuve forte vaut plus que plusieurs mots-clés faibles ;
- un domaine officiel n’annule pas automatiquement une demande de paiement ou de code ;
- une page officielle de connexion n’est pas considérée suspecte uniquement parce qu’elle contient un champ mot de passe ;
- les résultats de moteurs de recherche sont non fiables tant qu’ils ne sont pas corroborés ;
- `OK` signifie « aucun signal préoccupant établi avec les données disponibles », jamais « garanti sûr ».
