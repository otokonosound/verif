# VÉRIF — Extension Chrome / Edge 2.1

Manifest V3. L’extension complète la PWA VÉRIF avec des preuves que le navigateur peut collecter directement sur la page visitée.

## Fonctions

- analyse de la page active ;
- clic droit sur un lien ;
- clic droit sur une sélection ;
- intégration Gmail Web et Outlook Web ;
- recherche DNS et RDAP ;
- âge du domaine ;
- analyse des destinations présentes dans la page active ;
- aucune ouverture automatique de lien suspect ;
- IA embarquée via `LanguageModel` lorsqu’elle est prise en charge par Chrome ;
- pont vers la PWA pour enrichir une vérification avec les renseignements collectés par l’extension.

## Installation développeur

1. Récupérer le dossier `extension/`.
2. Chrome/Edge → Extensions.
3. Activer **Mode développeur**.
4. **Charger l’extension non empaquetée**.
5. Sélectionner le dossier `extension`.
6. Épingler VÉRIF.

## Vie privée

L’analyse déterministe et l’IA embarquée restent locales. Les recherches DNS/RDAP sont activées volontairement et transmettent uniquement les domaines aux services concernés.

Les URL suspectes ne sont pas interrogées automatiquement. Le texte déjà affiché dans l’onglet est analysé localement.

## IA embarquée

L’extension utilise l’API `LanguageModel` uniquement si elle existe dans le navigateur. L’absence de cette API ne bloque aucune fonction déterministe ou de recherche.

L’IA est un second avis : elle peut renforcer un verdict, mais elle ne peut pas annuler seule un signal technique fort.

## Limites

Les pages internes du navigateur (`chrome://`, `edge://`, Chrome Web Store, etc.) ne permettent pas l’injection du content script.

Une recherche web peut être incomplète ou indisponible. Un domaine ancien ou résolu en DNS n’est pas une preuve de légitimité, et un domaine récent n’est pas une preuve suffisante de fraude.

VÉRIF n’est pas un antivirus et ne remplace pas les protections natives du navigateur.
