# Étape 5 — pipeline de minification des ressources WebView

- Ajout de `security/obfuscate-assets.cjs` : utilise Terser pour transformer les scripts propriétaires dans `build/hardened-assets` sans toucher aux sources. Les bibliothèques vendor et leurs licences sont copiées intactes.
- `HYPER_HARDENED=1 ./build.sh` passe désormais le répertoire temporaire à AAPT2 puis exécute le contrôle d'APK après signature.
- Installer d'abord Terser dans `security/` avec `npm install --package-lock-only` puis `npm ci`. Garder le lockfile obtenu dans le projet pour les prochaines compilations.
- Cette étape ne prouve pas la sécurité du code : la minification n'empêche pas la rétro-ingénierie. Les noms publics et chaînes métiers restent potentiellement reconnaissables.
- Vérifications réalisées ici : syntaxe du script de transformation, syntaxe du build, contrôles statiques et test local du moteur.
- NON RÉALISÉ ici : installation Terser, transformation effective, tests sur le code transformé, compilation Android, audit JADX, test sur appareil.
- IMPORTANT : ne jamais transmettre cette archive de sources à un testeur. Distribuer uniquement un APK signé et validé.
