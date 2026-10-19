# Hypercruise 0.8.25 - vrais mélanges de parcours

APK Android locale, fr.hypercruise.app, versionCode 34, modèle 13, profils routing-v13. Les cartes installées et préférences existantes restent utilisables.

## Sélection

- Le plus rapide : minimum de durée légale modélisée parmi les candidats évalués, référence de gain +0 €.
- Compromis : autre géométrie, même allure que le rapide ; économie d'au moins 5 % du total et 0,25 € ; marge +10 % plafonnée à 20 min (tolérance minimale 1 min).
- Éco : autre géométrie et coût inférieur à Compromis, marge +40 % plafonnée à 90 min (tolérance minimale 3 min). Les allures restent 80→80, 90→85, 100→95, 110→100, 120→105, 130→110. Les limitations inférieures restent prioritaires.
- Le supplément Éco permis pour gagner au moins 2 min est borné par le coût total (3 %, minimum 0,30 €, maximum 1 €) et le carburant (3 %, minimum 0,02 L, maximum 0,50 L). Il ne doit pas casser l'ordre des coûts ni les restrictions.
- Extremiling reste séparé, 70 maximum, sans autoroute. Les préférences autoroutes et péages sont indépendantes.
- Les cartes ne sont jamais remplies avec une copie du rapide. S'il manque un tracé distinct et utile, moins de trois offres sont affichées.

## Exploration des mélanges

mix-seeds.js projette les gares officielles sur le rapide, repère les sections payantes entre échangeurs et crée des variantes évitant temporairement le milieu d'une section. Le routeur calcule chaque trajet entier sur le réseau : aucun collage de géométries. Une combinaison peut éviter deux sections. Ces contraintes exploratoires ne sont pas présentées comme des fermetures réelles. D'autres candidats associent coût de temps et préférence de péage. Les pondérations exploratoires ne sont jamais ajoutées à la consommation physique ou au prix réel. Chaque géométrie retenue est rejouée intégralement aux deux allures et dédupliquée.

La recherche complète est bornée à 150 s, dépend du téléphone et ne prouve pas l'optimum global. Les géométries Pau–Valdurenque ne sont pas codées en dur. Le recalcul conserve la stratégie choisie, mais cherche sur une durée plus courte et ne garantit pas un arbitrage identique des corridors.

## Tarification

app/assets/toll-data.js : données régionales ASF classe 1 consultées le 19/10/2026, issues du fichier tarifaire officiel de VINCI et du référentiel gouvernemental des gares au 01/01/2025. 223 positions de détection, dont 105 positions tarifées, 274 couples tarifaires activés. Sources et licence : app/assets/vendor/Tarifs-SOURCES.txt.

app/assets/toll-cost.js : identification des gares le long de la géométrie réellement calculée, regroupement des voies d'une même gare, appariement des systèmes fermés, perception unique des barrières ouvertes et détection des péages non reconnus. Les approches des barrières et les tronçons marqués toll=yes ne sont pas utilisés comme une facturation au kilomètre. Les localisations gouvernementales peuvent différer des nœuds de barrière cartographiés ; un rapprochement borné est utilisé.

Réseaux/gares/relations non reconnus, classe hors 1 ou date d'expiration : montant inconnu, affiché « à confirmer ». Sans péage cartographié : zéro estimé, pas une certification de gratuité. Le 01/02/2027, les tarifs intégrés sont expirés jusqu'à actualisation. Actualiser plus tôt si le fournisseur change ses prix.

Les gains au bilan des nouveaux trajets utilisent le total seulement quand il est connu. Les anciens trajets conservent leur gain carburant historique ; ils ne sont pas recalculés rétroactivement. Un recalcul GPS conserve l'allure et les restrictions ; la référence de gains est invalidée pour éviter de comparer des départs différents. La recherche de recalcul est plus courte que la comparaison complète et ne garantit pas le même arbitrage des corridors.

## Construire

JDK 11+ avec jdk.compiler, Android SDK build-tools 35.0.0 et platforms/android-35 :

```bash
HYPER_SDK=/chemin/vers/sdk bash build.sh
```

Les clés privées ne sont pas dans cette archive. En leur absence, le script crée une clé de test : un APK ainsi recompilé ne pourra pas remplacer une installation signée avec la clé de l'application.

## Vérifications de la version 0.8.25

Depuis ce dossier :

```bash
node tests/mixed-routing-0825.cjs
node tests/ui-local-vm-test.js
node tests/reroute-089.cjs
node tests/reroute-ui-089.cjs
node tests/nav-camera-0815.cjs
node tests/nav-motion-088.cjs
node tests/speed-limit-0819.cjs
node tests/speed-limit-ui-0819.cjs
node tests/navigation-hud-0820.cjs
```

65 contrôles ciblés de coût et de sélection passent. Après construction :

```bash
java --module jdk.compiler/com.sun.tools.javac.Main --release 11 -classpath build/classes -d build/classes tests/ProfilePolicy0824.java tests/BenchmarkRouter0825.java
java -cp build/classes btools.router.ProfilePolicy0824 app/assets/routing
HC_GRAPH=/chemin/vers/cartes node tests/benchmark-0825.cjs
```

40 contrôles natifs d'allure et d'accès passent. Benchmark : 193 calculs dont 128 replays sur neuf cas exécutés (huit scénarios distincts, le retour prioritaire étant répété), sans erreur. Les données du test sont dans tests/benchmark-comparison-0825.json ; les géométries sélectionnées dans tests/fixtures/mixed25/. Le test natif utilise le même LocalRouter que l'APK, avec un transport JVM TSV remplaçant Android. Les profils véhicule sont identiques. La couverture de calcul installée est le Sud-Ouest, 40–45° N et 5° O–5° E. Les empreintes des RD5 sont dans LocalEngine.java.

Résultats Pau → Valdurenque : rapide 196,17 min / 17,841 L / 15,50 € de péage / 46,72 € ; Compromis 204,83 min / 16,126 L / 12,70 € / 40,92 € ; Éco 274,30 min / 13,205 L / 0 € / 23,11 €. Les trois géométries sont distinctes. Les tests ville et restrictions peuvent n'afficher que deux ou une carte si trois tracés utiles ne sont pas trouvés.

Les tests DOM/Android et GPS utilisent des doublures ou simulations. Aucun essai routier matériel de cette version. Les anciens tests restent à titre historique et peuvent porter des assertions propres à leur version. Le test toll-cost-0824.cjs attend encore les anciens doublons : utiliser mixed-routing-0825.cjs. Le style de carte, la caméra, le mouvement et la limitation affichée sont conservés.

## Provenance

Moteur BRouter sous GPL-3.0 : app/assets/vendor/BRouter-LICENSE.txt. Autres bibliothèques : licences dans app/assets/vendor. Données routières © contributeurs OpenStreetMap. Les données tarifaires viennent des exploitants ; les positions des gares viennent du ministère de la Transition écologique, sous Open Data Commons Attribution License.
