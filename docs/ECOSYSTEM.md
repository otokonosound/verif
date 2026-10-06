# VÉRIF — Version 1.0.0

## Livraison

La version 1.0.0 regroupe :
- l'application Web/PWA ;
- le moteur local ;
- l'inspection de fichiers ;
- OCR et QR ;
- l'API serveur optionnelle ;
- l'extension Chrome/Edge Manifest V3 ;
- les tests de non-régression ;
- la CI et le déploiement GitHub Pages ;
- la documentation de confidentialité et sécurité.

## Règle de livraison

Une version n'est considérée comme livrable que si les suites frontend, extension et serveur sont vertes, le build est vert, le manifeste est valide et le déploiement Pages est vert.

## Limites assumées

VÉRIF ne promet pas de détecter toutes les fraudes. Le produit affiche des signaux et des recommandations, avec une logique prudente lorsque les preuves sont insuffisantes.

L'extension ne bloque pas automatiquement les sites et ne remplace pas les protections natives du navigateur.

## Installation rapide

### Web/PWA

Ouvrir l'application puis utiliser l'option d'installation proposée par le navigateur.

### Chrome / Edge

1. Télécharger l'archive de l'extension.
2. Décompresser l'archive.
3. Ouvrir la page des extensions.
4. Activer le mode développeur.
5. Choisir « Charger l'extension non empaquetée ».
6. Sélectionner le dossier `extension`.

## Philosophie

**Je colle → je vérifie → je comprends → je sais quoi faire.**