# Corrections de la chaîne de compilation

- `HC.costBreakdown` est exportée dans `app/assets/core.js`. L’ancienne erreur doit être reproduite dans son environnement exact ; aucune suppression de fonction constatée.
- Le benchmark `tests/benchmark-0825.cjs` retourne maintenant un code de sortie non nul quand un scénario échoue.
- Le workflow teste les exports du moteur et les 65 assertions du test de routage avant la compilation.
- La compilation cloud exige une **clé de signature persistante**, fournie par les secrets GitHub `HYPER_KEYSTORE_B64` et `HYPER_KEYSTORE_PASSWORD`. Aucune clé privée n'est incluse dans cette archive.
- Pour une toute première bêta, créer une clé PKCS12 une seule fois, la conserver hors du dépôt et configurer les deux secrets. Pour une mise à jour d'une application déjà installée, réutiliser impérativement sa clé d'origine.
- La compilation réelle reste non vérifiée dans cet environnement sans SDK Android ni Terser. Les tests Android sur appareil et l'audit de décompilation restent à faire.
