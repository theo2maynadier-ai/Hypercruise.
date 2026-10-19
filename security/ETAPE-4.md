# Étape 4 : verrou de distribution et audit

- Ajout de `security/release-gate.py`, qui **bloque** une distribution lorsque des JS propriétaires multilignes lisibles ou des sources/clés privées apparaissent dans l'APK.
- L'audit vérifie la structure ZIP, la présence du DEX et calcule le SHA-256.
- Ce verrou est conservateur et ne prouve pas qu'une minification ou une obfuscation est sûre. Un fichier compact peut rester entièrement réversible.
- Aucune transformation des scripts propriétaires n'a été appliquée : il faut d'abord instrumenter les tests de l'interface WebView et les appels JavaScript/Java, puis appliquer une transformation vérifiée.
- Aucune compilation APK ni test sur téléphone n'a été effectué ici.

## Suite indispensable
1. Dans un environnement avec Android SDK 35, compiler `HYPER_HARDENED=1 ./build.sh`.
2. Transformer uniquement les JS propriétaires dans une **copie de staging**, en conservant les noms des APIs exposées, les imports, les licences et les fichiers vendor.
3. Exécuter les tests UI, routing et un essai réel sur Android.
4. Exécuter `python3 security/release-gate.py output/Hypercruise-0.8.25.apk` : un échec est normal tant que les JS sont lisibles.
5. Vérifier signature et manifeste avec les outils Android, puis analyser l'APK via JADX et Ghidra.
6. Ne distribuer **que** l'APK testé, jamais cette archive de sources.
