# Hypercruise 0.8.25 : procédure de compilation renforcée

Cette archive contient les **sources** et n'est **pas** une version à distribuer aux testeurs.

## Pré-requis
- JDK 17 ou compatible avec la compilation Java 11 utilisée par le projet
- Android SDK Platform 35 et Android Build Tools 35.0.0
- Node.js et npm, accès à registry.npmjs.org pour installer Terser 5.36.0
- Bash et Python 3

## Commandes Linux/macOS
```bash
export HYPER_SDK="$HOME/Android/Sdk"  # adapter au chemin réel
cd security
npm install --ignore-scripts --no-audit --no-fund
cd ..
bash security/check-build-env.sh
HYPER_HARDENED=1 bash build.sh
```

## Validation avant toute distribution
1. Vérifier les tests fonctionnels sur les trois itinéraires et le mode Extremiling.
2. Installer et tester l'APK sur un vrai Android, notamment la navigation hors ligne.
3. Analyser les assets et le DEX avec JADX et les scripts security/verify-apk-assets.py et security/release-gate.py.
4. Ne jamais distribuer le dossier `signing/`, `build/`, les sources, le mapping R8 ou les fichiers de configuration secrets.
5. Conserver la clé de signature privée de manière sûre : perdre cette clé peut empêcher les mises à jour compatibles.

## Limites
Terser minifie et masque certains identifiants, mais ne rend pas un moteur JavaScript inviolable. Les vérifications automatisées ne prouvent pas la sécurité face à un adversaire expérimenté. Le moteur reste embarqué dans l'APK.
