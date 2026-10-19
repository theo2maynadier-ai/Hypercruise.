# Hypercruise 0.8.23 — comparatif du moteur

Comparaison avec 0.8.22 sur le même graphe routier RD5 du 13 octobre 2026, Peugeot 3061.9TD, masse 1300 kg et référence 3,5 L/100 à 75 km/h. Ce sont des estimations, sans trafic en direct ni mesure de consommation sur la voiture. Les mêmes points de départ et d’arrivée sont utilisés pour chaque paire.

Le routeur Java de l’APK et les vrais planificateurs JavaScript ont été exécutés sur ordinateur. Le transport Android a été remplacé par un pont de test ; ces résultats ne constituent pas un essai sur téléphone.

## Éco : carburant total et proportion d’axes principaux

| Trajet | Ancien, L | Nouveau, L | Variation | Axes principaux, ancien → nouveau | Durée, ancien → nouveau |
|---|---:|---:|---:|---:|---:|
| Pau, traversée urbaine | 0,572 | 0,593 | 3,7 % | 74,4 → 86,5 % | 27,0 → 26,2 min |
| Castres → Valdurenque | 0,587 | 0,637 | 8,6 % | 67,6 → 94,0 % | 17,7 → 17,9 min |
| Toulouse, traversée | 0,734 | 0,734 | 0,0 % | 96,1 → 96,1 % | 25,1 → 25,1 min |
| Pau → Bayonne | 4,144 | 4,144 | 0,0 % | 98,9 → 98,9 % | 114,0 → 114,0 min |
| Valdurenque → Pau | 11,164 | 11,195 | 0,3 % | 94,9 → 99,3 % | 294,2 → 265,7 min |
| Pau → Bayonne, sans voie rapide | 4,770 | 4,784 | 0,3 % | 93,4 → 98,9 % | 143,8 → 136,2 min |
| Contrôle Extremiling | 0,552 | 0,551 | -0,2 % | 67,6 → 74,7 % | 17,9 → 16,4 min |

Les axes principaux sont ici les classes motorway, trunk, primary, secondary et tertiary, bretelles incluses. Les pourcentages incluent les accès de départ/arrivée. L’amélioration du confort peut augmenter légèrement le carburant estimé : par exemple+8,5 % environ sur le court trajet Castres–Valdurenque ; elle ne représente pas une économie gratuite.

## Compromis : comparaison avec l’ancienne option intermédiaire

L’ancienne option pouvait porter le nom «Alternative». Elle est identifiée ci-dessous comme ancienne option intermédiaire ; ce n’était pas toujours un compromis temps/carburant utile. Le nouveau Compromis peut rouler jusqu’à 85 km/h, contre75 pour Éco, sous les limites et plafonds de conduite du modèle.

| Trajet | Ancienne option : L / min | Nouveau Compromis : L / min |
|---|---:|---:|
| Pau, traversée urbaine | 0,638 L / 30,7 min | non proposé : gain utile insuffisant |
| Castres → Valdurenque | 0,594 L / 19,9 min | non proposé : gain utile insuffisant |
| Toulouse, traversée | 0,823 L / 39,8 min | 0,822 L / 21,8 min |
| Pau → Bayonne | 4,771 L / 144,7 min | 4,686 L / 102,5 min |
| Valdurenque → Pau | 11,822 L / 296,5 min | 12,371 L / 241,2 min |
| Pau → Bayonne, sans voie rapide | 4,788 L / 156,3 min | 4,890 L / 135,2 min |

## Le plus rapide

La recherche rapide utilise un coût fondé sur les secondes du modèle physique : le carburant n’entre pas dans ce coût. Le choix final minimise cette durée parmi les candidats compatibles avec la préférence pour les axes principaux et les exclusions actives. Ce n’est pas une garantie de minimum global sur toutes les routes : le budget de recherche et le graphe restent bornés. Les limitations numériques connues, les classes de voie, les virages, l’accélération, les montées et les attentes cartographiées interviennent dans la durée. Une limite absente n’est pas devinée comme une réglementation certaine.

| Trajet | Ancienne référence affichée, min | Le plus rapide, min |
|---|---:|---:|
| Pau, traversée urbaine | 23,1 | 22,8 |
| Castres → Valdurenque | non affichée | 17,9 |
| Toulouse, traversée | 23,1 | 21,3 |
| Pau → Bayonne | 80,7 | 79,4 |
| Valdurenque → Pau | 204,3 | 196,7 |
| Pau → Bayonne, sans voie rapide | non affichée | 134,3 |
| Contrôle Extremiling | non affichée | 16,1 |

## Contrôles

- Sept paires de calculs complets, dont sans voie rapide/sans péage et Extremiling. Les voies interdites et les chemins ont été contrôlés sur les sorties.
- Les anciennes géométries Éco/intermédiaires ont aussi été rejouées avec le nouveau modèle : on distingue ainsi les effets de vitesse et les changements de corridor.
- Les préférences de classes sont séparées des litres : elles n’augmentent pas artificiellement le carburant affiché.
- L’Éco choisit un candidat favorisant les axes principaux sans dépasser 10 %+0,03 L de la consommation minimale parmi les candidats évalués. Les premiers et derniers 500 m au plus sont exemptés du filtre de part de voies locales.
- Compromis doit gagner au moins 30 s sur Éco et conserver une économie estimée utile face au rapide ; sinon il est omis. Un parcours commun à deux allures différentes est signalé.
- Les hypothèses initiales d’Extremiling sont conservées sur les petites voies ; la géométrie choisie peut changer avec le nouveau vivier de candidats.
- Vitesses provisoires en mode normal :35 km/h sur unclassified,20 sur service et30 sur une voie totale à double sens, au lieu de50/30/55 auparavant. Des données manquantes ne permettent pas d’identifier toutes les rues réellement étroites.
- Pas de coût de péage chiffré : les gains en euros concernent uniquement le carburant.

## Sources techniques consultées

- BRouter, profil automobile : https://github.com/abrensch/brouter/blob/master/misc/profiles2/car-vario.brf
- Schéma des classes routières OpenMapTiles : https://github.com/openmaptiles/openmaptiles/blob/master/layers/transportation/transportation.yaml

## Installation

Installer l’APK 0.8.23 par-dessus la version actuelle puis relancer Comparer. Le modèle 11 invalide les anciens plans et copie les nouveaux profils dans un répertoire distinct ; les fichiers de cartes restent utilisables.
