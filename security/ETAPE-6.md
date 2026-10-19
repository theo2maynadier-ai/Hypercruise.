# Étape 6 : vérification bloquante des assets transformés

Le build renforcé appelle désormais `verify-staged-assets.cjs` après Terser et avant la compilation Android.
Il vérifie la présence, la syntaxe, la différence binaire et la réduction de taille de chaque JS propriétaire à la racine de `app/assets` et produit `build/staged-assets-report.json` avec les empreintes SHA-256.

## Limites importantes

- Réduction de taille et minification ne sont **pas** une obfuscation robuste contre un spécialiste.
- Les tests de syntaxe ne prouvent pas l'équivalence fonctionnelle ; il faut exécuter les tests du moteur et des tests Android sur l'APK final.
- Les fichiers JS du répertoire vendor sont exclus intentionnellement.
- Cette étape n'a **pas** produit d'APK : Terser 5.36.0 n'est pas disponible hors ligne et le SDK Android n'est pas installé.
- Ne partagez jamais cette archive de sources avec des testeurs.

## Sur un environnement équipé

```
cd security
npm install --ignore-scripts
cd ..
HYPER_SDK=/chemin/vers/android-sdk HYPER_HARDENED=1 bash build.sh
```

Le contrôle est bloquant, mais il ne remplace ni l'audit JADX ni les tests de navigation.
