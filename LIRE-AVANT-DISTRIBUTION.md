# Hypercruise : compilation bêta renforcée

Ce projet contient les **sources privées**. Ne jamais partager cette archive avec des testeurs.

## Compilation sans installer le SDK sur votre ordinateur
1. Créer un dépôt GitHub **privé** et y envoyer le contenu de ce dossier (pas les anciens ZIP).
2. Dans GitHub, ouvrir Actions > Hypercruise protected beta APK > Run workflow.
3. Si toutes les étapes réussissent, télécharger l’artefact APK dans le résultat du workflow.
4. Tester sur un appareil réel : calcul Éco/Compromis/Rapide, Extremiling, hors ligne, navigation et relance.
5. Distribuer **uniquement l’APK**, jamais le dépôt, les fichiers de signature ou les rapports internes.

## Limites importantes
- Ce workflow n’a pas été exécuté ici, faute de réseau et de SDK Android. La compilation n’est **pas certifiée**.
- La clé de signature est créée sur l’agent temporaire et perdue après le job : cet APK est destiné à un essai isolé, **pas à une série de mises à jour**. Pour des mises à jour compatibles, configurer une clé persistante protégée par secrets GitHub ou un service de signature.
- Le contrôle de taille/minification JS peut échouer sur certains fichiers : corriger les règles au cas par cas sans désactiver les contrôles.
- Un test ancien `tests/main-axes-0823.cjs` échoue actuellement sur `HC.costBreakdown is not a function`. Il faut corriger le harnais ou la régression avant de déclarer la suite de tests verte.
- Le moteur reste dans l’APK : le reverse engineering reste possible.
- Ne jamais rendre public le dépôt, ni les logs contenant des données sensibles.
