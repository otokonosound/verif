# Politique de confidentialité technique — VÉRIF 2.1

VÉRIF applique un principe de minimisation : utiliser d’abord les traitements locaux et ne contacter le réseau que pour les vérifications qui nécessitent une donnée externe.

## Traitements locaux

- le moteur déterministe s’exécute dans le navigateur ;
- l’OCR des images est exécuté côté client ;
- les QR codes sont décodés localement ;
- les fichiers pris en charge sont lus localement et ne sont jamais exécutés ;
- l’IA embarquée, quand le navigateur expose `LanguageModel`, s’exécute sur l’appareil ;
- l’historique de l’interface est conservé dans le stockage local du navigateur.

## Recherche web

Lorsqu’une vérification contient une URL ou un domaine, VÉRIF Intelligence peut interroger des sources externes pour obtenir des preuves supplémentaires : résolution DNS, données RDAP/âge du domaine et, avec l’extension, destination HTTP réelle et contenu HTML limité.

Ces requêtes révèlent nécessairement le domaine ou l’URL recherchée au service interrogé. L’extension effectue ses requêtes sans cookies du site cible, avec les identifiants omis et sans référent HTTP.

## Moteur serveur optionnel

Si `VITE_VERIF_API_URL` est configuré, la PWA peut envoyer le contenu analysé au serveur VÉRIF afin d’obtenir un enrichissement web et/ou un second avis IA. Le serveur peut lui-même utiliser les fournisseurs configurés par l’administrateur, par exemple Hugging Face, Brave Search ou une instance SearXNG.

Le déploiement public doit documenter clairement quels fournisseurs sont activés. Aucun secret fournisseur ne doit être exposé dans le navigateur.

## Conservation

Le code fourni ne persiste pas le contenu des analyses côté serveur. Les opérateurs d’un déploiement doivent aussi désactiver la journalisation des corps de requête et définir une politique de rétention adaptée.

## Données sensibles

VÉRIF est conçu pour analyser des messages suspects, mais l’utilisateur doit éviter de transmettre volontairement des mots de passe, codes OTP, numéros de carte complets ou autres secrets. Le dossier d’incident n’est copié ou partagé que sur action explicite.

## Commercialisation / RGPD

Avant une commercialisation, cette politique technique doit être complétée avec l’identité de l’éditeur, les finalités et bases légales, les sous-traitants réellement activés, les durées de conservation, les droits des personnes et les coordonnées de contact.

Ce document décrit l’architecture technique et ne constitue pas un avis juridique.
