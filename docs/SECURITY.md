# Sécurité — VÉRIF

## Principes
- Ne jamais considérer un verdict comme une garantie absolue.
- Ne jamais exposer de secrets côté client.
- Valider la taille et le type des entrées serveur.
- Ne pas stocker le contenu utilisateur par défaut.
- Éviter les requêtes serveur arbitraires vers des URLs fournies par les utilisateurs afin de réduire les risques SSRF.
- Utiliser HTTPS en production.
- Ajouter rate limiting, CORS strict et en-têtes de sécurité au déploiement.

## Limite importante
L'analyse actuelle des domaines est déterministe et limitée à un registre initial. Elle ne remplace pas une réputation de domaine, un moteur anti-phishing commercial ou une vérification humaine.
