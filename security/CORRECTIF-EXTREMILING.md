# Correctif Extremiling 0.8.25

Le test `tests/local-test.js` échouait sur un itinéraire contenant `motorroad=yes`.
La validation de `app/assets/local-planner.js` ne vérifiait que `roadClass === 'motorway'`, alors que l'analyse des segments classe également les routes `trunk` et `motorroad=yes` comme voies rapides.

La validation vérifie maintenant `expressway` si `noHighways` est activé, ainsi que les péages si `noTolls` est activé. La logique de consommation et la sélection des itinéraires restent inchangées.

Tests exécutés : `node tests/local-test.js` et `bash security/beta-check.sh`, réussis.
Aucun APK n'a été compilé ni audité contre la rétro-ingénierie.
