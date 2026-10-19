# Hypercruise 0.8.25 : compilation beta

Ce ZIP contient les **sources privées**, à ne pas distribuer. L'APK est produit uniquement après une compilation réussie.

## Préparation locale

```bash
python3 security/preflight.py
```

## Compilation sur machine avec Docker et Internet

```bash
bash compile-docker.sh
```

Le premier lancement génère une clé de signature dans `signing/`. **Sauvegarder hors ligne les deux fichiers** `signing/hypercruise.p12` et `signing/password.txt` : leur perte empêche de mettre à jour les APK déjà distribués avec la même identité.

Le script lance les vérifications R8, la transformation JavaScript, les tests de l'API transformée, la signature et le contrôle statique de l'APK. Ne distribuer que `output/Hypercruise-0.8.25.apk` si le processus réussit, après essai sur un appareil Android.

## Limites

L'obfuscation et la minification ne rendent pas inviolable un moteur entièrement embarqué. Une analyse dynamique ou la reconstitution du comportement restent possibles. Le build exige le SDK Android et les outils de compilation ; si ceux-ci sont absents et que les téléchargements sont bloqués, aucun code source ne peut remplacer ces binaires.
