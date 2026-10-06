# VÉRIF 2.0 — version finale

VÉRIF 2.0 consolide le socle initial et les extensions fonctionnelles V3/V4 en un seul produit cohérent.

## V1 — socle

- PWA mobile-first.
- Analyse locale de SMS, e-mails, texte et URL.
- Verdicts OK / À VÉRIFIER / PRUDENCE / STOP.
- Explication des signaux détectés.
- OCR local pour captures/photos.
- QR code local.
- PDF, DOCX, XLSX, TXT, ZIP.
- Inspection des exécutables sans exécution.
- Historique local.
- Recommandations contextualisées.
- Dossier d'incident.
- Confidentialité local-first.
- Fonctionnement hors ligne de base.

## V2 — extension navigateur

Extension Chrome/Edge Manifest V3.

- Analyse de la page active.
- Analyse d'un lien par clic droit.
- Analyse d'une sélection par clic droit.
- Analyse locale dans l'extension.
- Détection HTTPS/HTTP, IP, raccourcisseurs, punycode, ports, redirections, domaines ressemblants, données sensibles, urgence, paiement et exécutables.
- Ouverture directe vers VÉRIF pour une analyse approfondie.

## V3 — partage et accès direct

VÉRIF devient une cible de partage mobile.

- Réception de texte depuis SMS, messagerie et e-mail.
- Réception d'URL partagées.
- Réception de fichiers depuis le menu Partager Android.
- Transmission locale au moteur VÉRIF.
- Aucun envoi automatique vers un serveur.
- Traitement des fichiers partagés jusqu'à 12 Mo directement dans le service worker ; les fichiers plus volumineux sont signalés et peuvent être importés manuellement.

Le support de partage nécessite que la PWA soit installée sur l'appareil.

## V4 — Gmail et Outlook

L'extension ajoute une intégration directe avec les webmails :

- Gmail Web.
- Outlook Web / Outlook Office.
- Bouton VÉRIF directement dans l'interface du webmail.
- Extraction locale du contenu visible du message.
- Ouverture de VÉRIF avec le contenu et l'URL du message.
- Le bouton ne transmet pas le message à un service tiers.

Cette intégration fonctionne sans OAuth : elle exploite le contenu déjà affiché dans le navigateur.

## Principe de sécurité

VÉRIF ne promet jamais qu'un contenu est absolument sûr. Le verdict indique le niveau de signaux détectés et les actions recommandées.

Le moteur local reste déterministe et explicable. L'extension ne nécessite pas de serveur distant pour son analyse.

## Validation de livraison

Une version 2.0 n'est considérée comme livrée qu'après :

1. tests du moteur web ;
2. tests du moteur serveur ;
3. tests de l'extension ;
4. validation Manifest V3 ;
5. build de production ;
6. déploiement GitHub Pages réussi.

## Accès

Application : https://otokonosound.github.io/verif/

Dépôt : https://github.com/otokonosound/verif
