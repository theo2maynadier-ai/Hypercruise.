# Migration Hypercruise vers Claude Code

Cette branche part du code **0.8.25** (Android versionCode 34). Les documents décrivent le code cible **0.8.71 HARDENED** (versionCode 80, package `fr.hypercruise.app`). L'archive source 0.8.71 reste à importer.

- [Annotations techniques](Hypercruise-ANNOTATIONS-0.8.71.md)
- [Notes de livraison 0.8.71](Hypercruise-0.8.71-notes.md)
- [Historique documenté jusqu'à 0.8.60](HISTORIQUE-0.8.26-0.8.60.md)

Archive cible : `Hypercruise-0.8.71-sauvegarde-privee.zip` (121 000 216 octets, SHA-256 `589b160f1c3523181e871ab4739dc6b6ec98b0ecd021469f797a1da458861579`).

Une fois l'archive récupérée, vérifier le SHA-256, extraire dans un répertoire temporaire et contrôler `app/AndroidManifest.xml`. Intégrer le code sur cette branche après avoir sauvegardé les changements locaux, dont le correctif de lancement de R8 via `d8.jar` pour Build Tools 35 si le script importé en a besoin. Vérifier l'inventaire des sources, des données de péages et de zones et du mapping R8. Lancer les tests source, natifs et BRouter avec les RD5 fournis localement. Les fichiers de signature restent hors de Git et la signature se fait localement.

Le README de la 0.8.71 mentionne encore la 0.8.29 et `security/verify-release-config.py` attend la 0.8.57. Le manifeste indique la version cible.
