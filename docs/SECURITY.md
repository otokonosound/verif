# Sécurité — VÉRIF 2.1

## Principes de décision

- aucun verdict n’est une garantie absolue ;
- l’IA n’est jamais l’unique moteur de décision ;
- un second avis IA peut renforcer un niveau de prudence mais ne peut pas annuler seul une preuve technique forte ;
- les preuves indépendantes sont privilégiées : identité, domaine, authentification e-mail, DNS/RDAP, redirections et sources de sécurité reconnues ;
- une simple occurrence de mots alarmants dans un résultat web ne suffit pas à déclarer un domaine malveillant.

## PWA

- analyse locale prioritaire ;
- fichiers inspectés sans exécution ;
- limites de taille sur les entrées ;
- aucun secret fournisseur dans le bundle client ;
- les fonctions locales continuent de fonctionner si les services externes sont indisponibles.

## Extension

- Manifest V3 ;
- requêtes réseau avec `credentials: omit` et `referrerPolicy: no-referrer` ;
- le HTML distant est lu en quantité limitée et ses scripts ne sont pas exécutés par VÉRIF ;
- les adresses locales/privées sont ignorées par le moteur de recherche réseau pour éviter les accès internes ;
- les redirections et la destination finale sont exposées comme preuves ;
- les pages internes du navigateur restent hors portée des content scripts.

## Serveur

- limitation de taille des requêtes ;
- rate limiting ;
- `Cache-Control: no-store` ;
- en-têtes `X-Content-Type-Options` et `Referrer-Policy` ;
- pas de récupération arbitraire d’URL utilisateur côté serveur : l’enrichissement serveur actuel repose sur DNS, RDAP et moteurs de recherche configurés, ce qui réduit le risque SSRF ;
- CORS doit être restreint au domaine de production ;
- les tokens Hugging Face / Brave et autres secrets restent uniquement côté serveur.

## Recherche web

Les résultats de recherche sont considérés comme des données non fiables. Une hausse de risque basée sur la recherche générique n’est appliquée que si une source de sécurité reconnue mentionne explicitement le domaine cible dans un contexte de phishing, fraude ou malware.

## IA et prompt injection

Les prompts système indiquent explicitement que le message analysé et les résultats web sont des preuves non fiables, jamais des instructions. Le modèle doit produire un JSON contraint. Une réponse invalide est ignorée.

## Déploiement

En production : HTTPS obligatoire, CORS strict, surveillance des dépendances, rotation des secrets, absence de journalisation des contenus sensibles et revue régulière des registres officiels / sources de réputation.
