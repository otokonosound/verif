# VÉRIF — Extension Chrome / Edge

Version 1.0.0 — Manifest V3.

## Installation
1. Télécharger l'archive de l'extension.
2. Décompresser le dossier.
3. Chrome/Edge → Extensions → activer **Mode développeur**.
4. **Charger l'extension non empaquetée** → sélectionner le dossier `extension`.
5. Épingler VÉRIF dans la barre d'outils.

## Utilisation
- Cliquer sur l'icône VÉRIF : analyse de la page active.
- Clic droit sur un lien → **VÉRIF — Vérifier ce lien**.
- Sélectionner du texte → **VÉRIF — Vérifier la sélection**.

L'analyse de page est locale au navigateur. L'extension ne transmet pas le contenu de la page à un serveur. Le bouton « Ouvrir VÉRIF » ouvre ensuite la PWA.

## Limites
Les pages internes du navigateur (chrome://, edge://, extensions, Chrome Web Store) ne permettent pas l'injection du script. Le bouton VÉRIF analyse alors uniquement l'URL disponible.

Cette version ne prétend pas bloquer les sites ni remplacer les protections natives du navigateur.