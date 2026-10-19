# Hypercruise 0.8.25 - préparation d’une bêta renforcée

## État
- Source modifiée pour permettre `HYPER_HARDENED=1 ./build.sh` avec R8.
- **Aucun APK renforcé n’a été compilé ou validé dans cet environnement** (Android SDK/build-tools 35 absent).
- La signature générée par `build.sh` est locale. **Ne partagez jamais `signing/`** et sauvegardez la clé de production hors ligne.
- Ne distribuez pas cette archive de sources aux testeurs.

## Point critique restant
Les scripts `app/assets/*.js` sont fournis en clair dans l’APK et peuvent être extraits. R8 ne protège **pas** ces scripts. L'obfuscation JavaScript et des tests fonctionnels sont indispensables avant de parler de bêta hostile. Les protections locales restent contournables.

## Pour construire
Installer Android SDK avec platforms/android-35 et build-tools/35.0.0, définir `HYPER_SDK`, puis exécuter `HYPER_HARDENED=1 ./build.sh`. Tester ensuite toutes les fonctions, surtout l'interface WebView Native et les trois profils de routage. Conserver `build/r8-mapping.txt` privé pour déboguer les crashs.

## Validation obligatoire
1. Vérifier l'installation et la signature de l'APK.
2. Vérifier démarrage, GPS, imports RD5, Éco/Compromis/Rapide, reroutage et guidage.
3. Ouvrir l'APK avec JADX et inspecter `assets/` pour identifier les algorithmes visibles.
4. Examiner le comportement de R8 et les usages de réflexion avant toute distribution.
5. Supprimer des archives de livraison les sources, clés, journaux, fichiers de mapping et données de test privées.

## Deuxième passe (19 octobre 2026)
- Ajout de `security/beta-check.sh` : vérifie la syntaxe JS, le manifeste et la présence accidentelle de fichiers de clés privées avant compilation renforcée.
- Ajout de `security/audit-apk.py` : inventorie le code JS réellement extractible dans un APK construit.
- `build.sh` exécute les contrôles préalables lorsque `HYPER_HARDENED=1`.
- Aucun script JS n'a été obfusqué automatiquement : une transformation aveugle risquerait de casser la WebView et les ponts JS/Java.
- Les outils Android et un outil d'obfuscation JS testé manquent dans cet environnement : **pas d'APK durci produit**.
- **Ne pas partager cette archive** : elle contient le code source complet.

### Suite pour Work (environnement Android SDK)
1. Construire l'APK renforcé et corriger les erreurs R8 éventuelles.
2. Faire un inventaire des exports JS/globals et des appels WebView, puis minifier/obfusquer progressivement les scripts propriétaires dans une copie de build, en préservant les interfaces publiques et les licences tierces.
3. Exécuter les tests existants avant/après, et tester sur appareil réel.
4. Exécuter `python3 security/audit-apk.py output/Hypercruise-0.8.25.apk` et inspecter avec JADX.
5. Distribuer uniquement l'APK, jamais le ZIP des sources ni `signing/` ni `build/r8-mapping.txt`.
