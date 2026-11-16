# Historique documenté jusqu'à Hypercruise 0.8.60

La 0.8.26 (code 35) active R8 release, Terser et l'obfuscation JS sélective. Le rapport annonce 205 assertions différentielles et 40 contrôles Java natifs réussis. Un test de recalcul a dépassé un délai de 50 s et est passé à 180 s. Le rapport confirme la présence du mapping privé dans la sauvegarde 0.8.26.

Livraisons intermédiaires retrouvées : voix française hors ligne (0.8.27), trafic visuel (0.8.28–0.8.29), intégration de données nationales de péage (0.8.38–0.8.40). Les versions, codes, chemins des générateurs et résultats intermédiaires restent à confirmer. La 0.8.40 constitue la base de la 0.8.49.

Les notes de livraison disponibles sont reproduites ci-dessous.

# Hypercruise 0.8.49 — intégration des corridors

22 octobre 2026. Base de production : 0.8.40. Laboratoire repris : généralisation 0848.
Version Android : 58. Même application, même clé de signature, mêmes cartes et profils de données.

## Livraison

Le planificateur de l’app utilise désormais la recherche adaptative, les contournements locaux raccordés sur des arêtes identiques et orientées, et la sélection conjointe Compromis/Éco. Chaque géométrie nouvelle est rejouée entièrement aux deux allures avant sélection. Les restrictions sont vérifiées sur les deux évaluations. Les prix inconnus restent inconnus, et le Rapide reste la durée minimale parmi les candidats évalués.

Budget de découverte : 30 s, enveloppe totale de planification : 45 s ; Extremiling conserve sa branche et son enveloppe antérieures. Ce ne sont pas des garanties de temps sur téléphone. Les recherches locales peuvent être composées. Les corridors gratuits et globaux restent disponibles selon le budget. Une seule route peut être affichée sur un petit trajet ; les cartes ne sont pas remplies par de simples variantes d’allure.

Trafic, recalcul en navigation, options indépendantes, péages et recherche de villes 0.8.40 conservés. Le Compromis porte explicitement son mode pour le recalcul. Aucun remplacement du profil physique ou des consommations par des valeurs du petit graphe théorique.

## Calculs réellement exécutés ici

Graphes BRouter téléchargés le 22 octobre, CRC/version contrôlés ; empreintes dans `evidence/corridors-0849/maps-pins.json`. Les graphes ont évolué depuis le laboratoire. Profil 306 et carburant à 1,75 €/L. Les montants sont des estimations carburant + péages du modèle, pas des mesures sur route. Temps serveur hors démarrage JVM et installation des cartes, sans trafic réel.

| Cas | Calcul source | Offres | Rapide | Compromis | Éco |
| --- | ---: | ---: | ---: | ---: | ---: |
| brive | 22.39 s | 3 | 76.69 € | 70.35 € | 29.52 € |
| arcachon | 5.38 s | 3 | 60.99 € | 45.82 € | 15.32 € |
| bayonne | 5.86 s | 3 | 22.59 € | 20.34 € | 8.67 € |
| tarbes | 3.43 s | 3 | 8.75 € | 6.83 € | 4.21 € |
| gueret | 19.70 s | 3 | 87.64 € | 75.56 € | 39.49 € |
| city | 1.18 s | 1 | 0.71 € | — | — |
| brive_no_tolls | 19.94 s | 2 | 29.05 € | — | 27.69 € |
| brive_no_highways | 16.18 s | 2 | 28.70 € | — | 27.69 € |
| tarbes_extreme | 2.91 s | 2 | 4.29 € | — | 3.83 € |

Le code JavaScript extrait de l’APK final a recalculé Pau–Brive en 21,73 s et Pau–Guéret en 21,70 s, avec des routes, durées, consommations et prix identiques aux sources. Pau–Brive : Compromis 70,35 €, Éco 29,52 €. Pau–Guéret : Compromis 75,56 €, Éco 39,49 €. Un recalcul natif Compromis vers Tarbes a aussi été exécuté avec une direction initiale.

## Vérifications

- 11 suites de régression source réussies : trafic, sélection, péages, limitations, caméra, mouvement, recalcul et voix. Les assertions anciennes du classement ont été adaptées au contrat 0848 : seuils +25 % / x2, absence de carte en double, ancrage Rapide même si son prix est inconnu. Le classement conjoint remplace les anciennes métadonnées du raccourci Éco.
- 5 suites mobiles sur les ressources protégées extraites de l’APK : recherche et sélection de Pau/Arcachon/Valdurenque, réponses tardives et secours, trois cartes et péages, interactions trafic/recalcul, gestion des cartes et voix. Réponses natives simulées dans le navigateur ; les calculs natifs ci-dessus sont séparés.
- 6 contrôles natifs des raccords exacts : refus des jonctions inversées, des simples proximités et des boucles.
- 40 contrôles natifs de politique/BRF et construction réflexive avant et après R8 : réussis. Signature d’origine, alignement, ZIP/DEX, manifeste, 21 scripts protégés et 190 empreintes de ressources vérifiés.
- Réexécution du laboratoire conservé : 3 464 contrôles de fenêtres, choix des parents, sélection conjointe, 504 graphes et 96 rejeux figés réussis.

## Protection et compilation

R8 release, Terser et obfuscation sélective conservés. Une anomalie de staging a été corrigée : les scripts protégés sont écrits par remplacement atomique, puis leurs empreintes sont comparées au rapport de transformation juste avant empaquetage. La validation de l’archive finale et de son intégrité a réussi.

Clé privée et mot de passe exclus de cette nouvelle archive. Pour reconstruire une mise à jour, remettre les deux fichiers `signing/hypercruise.p12` et `signing/password.txt` de la sauvegarde privée 0.8.25 d’origine. Aucune nouvelle clé n’a été générée.

`npm ci --ignore-scripts` dans `security`, puis `HYPER_SDK=/chemin/sdk bash build.sh` à la racine. JDK via `java --module jdk.compiler/com.sun.tools.javac.Main`, SDK Android 35/build-tools 35.0.0.

Pour les essais natifs : `python3 tests/corridors-0849/build.py --maps-dir /chemin/rd5`, puis `node tests/corridors-0849/plan.cjs brive`. `NO_TOLLS=1`, `NO_HIGHWAYS=1`, `EXTREME=1` et `REROUTE=1` activent les autres cas ; `HC_CHROME` sélectionne un navigateur installé pour les tests mobiles. Les cartes ne sont pas incluses dans l’archive.

## Limites et travail restant

Aucun lancement ni installation sur téléphone physique ou émulateur Android ici. Pas de garantie d’optimalité globale, ni de trois offres partout. Les recherches expirées sont ignorées, les candidats incomplets sont exclus ; les résultats peuvent changer selon le téléphone, les cartes et les données de trafic. La couverture des tarifs reste celle de la 0.8.40.

Cette étape intègre le moteur du laboratoire. Les huit demandes d’interface/navigation laissées en attente dans README-0840 restent à traiter : trafic sous le tracé, couverture de 5 km, contrôle du sens au recalcul, qualité des rues, seuils trafic, flèches, distinction des manœuvres et couleurs du compteur. Le cap est transmis au moteur mais ces points ne sont pas déclarés résolus par cette livraison.

SHA-256 APK : `0a681105280b03dda756309dcb4b91d99750a56961ac2f7d127fde9ab70d68d8`.

---

# Hypercruise 0.8.50 — durées sans plafond et tracés distincts

22 octobre 2026. À partir de 0.8.49. Android versionCode 59 ; même identifiant et même signature d’origine.

## Changement demandé

Suppression des seuils de durée +25 % pour Compromis et ×2 pour Éco, ainsi que du filtre +25 % sur les candidats intermédiaires. Le recalcul économique lié au trafic ne rejette plus une variante à cause d’un nombre fixe de minutes ou d’un pourcentage de durée. Aucun plafond de durée de trajet ne sert à classer les propositions.

Éco retient le candidat distinct le moins cher parmi les tracés complets évalués. Compromis compare le temps supplémentaire et l’économie par rapport aux deux offres réellement trouvées ; il cherche le point d’équilibre sur les candidats non dominés. Il n’impose ni une proportion d’autoroute 50/50 ni une limite de retard. Une variante plus lente et plus chère qu’Éco ne remplit pas artificiellement la carte centrale. Le seuil financier de 5 % est remplacé par 0,25 € ; les tarifs inconnus restent inconnus.

La distinction géographique s’applique aux trois cartes et à Extremiling : une différence de vitesse, de consommation, de nom ou de densité de points sur le même tracé ne suffit pas. Le Rapide reste affiché si un seul tracé utile existe.

Les recherches globales auparavant interrompues après 4,5 s disposent désormais de jusqu’à 18 s selon le budget restant. Les contournements locaux sont poursuivis tant que des fenêtres utiles et du budget sont disponibles, sans limite fixe de trois tentatives. Une borne technique garde l’app réactive : budget de découverte 90 s, enveloppe de planification 110 s, session native 150 s. Ce sont des protections d’exécution, pas des critères d’admissibilité de la durée des trajets. Aucun parcours infini, aucune garantie d’explorer toutes les routes.

Les anciens plans sauvegardés sont invalidés au changement de planificateur ; leurs points de départ et d’arrivée restent conservés. Appuyer sur Comparer recalcule avec 0.8.50.

## Pau–Brive recalculé avec le code extrait de l’APK

| Offre | Durée | Distance | Autoroute | Autres routes | Coût total estimé |
| --- | ---: | ---: | ---: | ---: | ---: |
| Le plus rapide | 3 h 43 | 395.3 km | 383.8 km | 11.5 km | 76.69 € |
| Compromis | 4 h 48 | 340.5 km | 147.7 km | 192.8 km | 49.03 € |
| Éco | 5 h 54 | 340.8 km | 10.2 km | 330.6 km | 28.87 € |

Le Compromis emprunte environ 148 km d’autoroute et 193 km d’autres routes, contre 329 km et 65 km en 0.8.49. Il dépasse l’ancien plafond +25 % : 4 h 48 contre 3 h 43. Il économise environ 27,66 € par rapport au Rapide et gagne environ 1 h 06 sur Éco.

Profil 306 inchangé, carburant 1,75 €/L, graphes RD5 du 22 octobre déjà contrôlés en CRC/version. Les montants incluent les péages connus et sont des estimations du modèle, pas des mesures de conduite. Les catégories OSM primary/secondary ne permettent pas d’appeler automatiquement toutes les autres routes « départementales ».

## Vérifications effectuées

- Pau–Brive natif puis JavaScript protégé extrait de l’APK : mêmes géométries, durées, consommations et péages. Trois tracés distincts.
- Calculs natifs supplémentaires : Pau–Arcachon, Bayonne, Tarbes, petit trajet urbain, Pau–Brive sans péage, Pau–Brive sans autoroute et Tarbes en Extremiling. Respect des options et absence de doublons vérifiés. Recalcul Compromis vers Tarbes exécuté avec cap initial.
- Tests ciblés source et APK : Compromis au-delà de +25 %, Éco au-delà de ×2, cas jusqu’à ×100, refus des mêmes coordonnées à vitesse différente, refus du même tracé rééchantillonné, dédoublonnage Extremiling, prix inconnu et refus d’un faux milieu dominé.
- 11 suites de régression : sélection, péages, trafic, recalcul, limitations, caméra, mouvement et voix. Les anciens tests qui attendaient le petit supplément de prix sur Éco ont été adaptés au nouveau choix du moins cher et aux durées sans plafond.
- 3 suites navigateur mobile sur les ressources protégées de l’APK : recherche de villes et sélection, trafic/recalcul/navigation, trois cartes et péages. Réponses natives simulées pour ces interactions ; les essais routiers natifs précédents sont séparés.
- R8 release, Terser et obfuscation sélective conservés. Signature d’origine, manifeste, DEX, alignement, archive, 21 scripts protégés et 190 empreintes d’intégrité contrôlés.

## Installation et sources

Installer `Hypercruise-0.8.50-HARDENED.apk` comme mise à jour, puis relancer Comparer. Aucun test d’installation ou de lancement sur appareil/émulateur Android n’a été effectué ici. Aucun changement de cartes, de profil physique ou de signature.

La sauvegarde contient sources, scripts, tests et preuves. La clé et son mot de passe n’y sont pas recopiés : réutiliser les fichiers `signing/hypercruise.p12` et `signing/password.txt` de la sauvegarde privée 0.8.25 d’origine pour reconstruire une mise à jour. `npm ci --ignore-scripts` dans security, puis `HYPER_SDK=/chemin/sdk bash build.sh` à la racine ; SDK 35/build-tools 35.0.0.

Cette livraison répond aux plafonds et doublons. Les autres demandes visuelles/navigation listées dans README-0840 restent distinctes et ne sont pas déclarées corrigées.

SHA-256 APK : `699e1046f0a121035dabe1fdd65b4ca4d04024aefe6967c0f65322f03c0a552d`.

---

# Hypercruise 0.8.51 — trafic sous les itinéraires

22 octobre 2026. Mise à jour ciblée de 0.8.50, version Android 60, même signature d’origine.

Le trafic rouge et jaune se trouve désormais sous les contours et les traits des itinéraires, sur la carte et pendant la navigation. Les couches publiques et TomTom sont placées avant la première couche de tracé réellement présente. Cet ordre est rétabli lors du dessin d’un itinéraire, de sa sélection, de l’actualisation du trafic, d’une désactivation/réactivation et du rechargement complet du style.

La cause était `raiseTraffic()` : après le dessin ou la promotion d’un tracé, elle remontait systématiquement le trafic au-dessus des lignes. La même méthode conserve ses points d’appel mais positionne maintenant les couches sous les tracés. Les couleurs et épaisseurs sont conservées.

Le moteur de calcul et la logique de sélection de la 0.8.50 sont conservés : pas de plafond +25 %/×2 et pas de doublon pour une simple différence de vitesse. Les trajets déjà sauvegardés restent utilisables.

## Vérifications

- Test dans Chromium avec le véritable rendu MapLibre, sur les sources puis sur les scripts protégés extraits de l’APK final.
- Deux sections superposées au tracé, rouge et jaune : lecture des pixels au centre de chaque ligne pour confirmer que la couleur visible est celle de l’itinéraire bleu.
- Six situations : trafic créé avant le tracé, trafic actualisé après le tracé, sélection et rafraîchissement TomTom, navigation inclinée à 45°, désactivation/réactivation en navigation, rechargement complet du style.
- Pour chacune, les six couches de trafic publiques/TomTom restent sous les contours et traits de tous les itinéraires. Les tuiles TomTom sont simulées vides pour ce contrôle d’ordre ; les pixels sont vérifiés sur les lignes GeoJSON rouge et jaune. Le fond et les mesures de trafic de ce test sont synthétiques.
- Suites de régression réussies : adaptateur cartographique, cycle de vie TomTom et géométrie/filtrage des sections publiques.
- R8 release, Terser et obfuscation sélective conservés ; signature d’origine, manifeste, DEX, alignement, ZIP, scripts protégés et 190 empreintes d’intégrité vérifiés. Aucune erreur JavaScript dans le test visuel.

## Fichiers et limites

Installer `Hypercruise-0.8.51-HARDENED.apk` comme mise à jour. L’installation et le lancement sur téléphone ou émulateur Android n’ont pas été testés ici.

La sauvegarde contient les sources, les tests et leurs résultats ; la clé privée et son mot de passe ne sont pas recopiés. Pour reconstruire une mise à jour, remettre les fichiers signing de la sauvegarde privée 0.8.25 d’origine. Compiler avec SDK Android 35/build-tools 35.0.0 et le script build.sh.

Le rayon de chargement de trafic de 5 km et les autres demandes de navigation ne sont pas inclus dans cette correction d’ordre d’affichage.

SHA-256 APK : `0a60e28f0f9b94a01dcb4204db5c2618ecb9c4f9c7057c6c379adf3bc4898779`.

---

# Hypercruise 0.8.52 — caméra libre et trafic visible sous le bleu

22 octobre 2026. Mise à jour de 0.8.51 ; Android versionCode 61, même signature d’origine.

## Caméra libre en navigation

Le suivi GPS se suspend dès le contact avec la carte, avant que les déplacements de caméra à chaque image ne puissent empêcher le glissement de démarrer. Déplacement, zoom, rotation et inclinaison restent ensuite manuels : la fin du pincement ne réactive plus automatiquement le suivi. Le GPS, la position du véhicule, l’enregistrement et le guidage continuent.

Le bouton Recentrer devient bleu pour signaler que la caméra est libre. Appuyer dessus rétablit la vue de guidage et son zoom automatique. Le bouton de cap reste également une action explicite permettant de reprendre le guidage dans l’orientation choisie. En vue libre, le zoom ne remplace plus l’inclinaison choisie par l’utilisateur.

## Jaune/rouge visible sous l’itinéraire bleu

Le centre de l’itinéraire reste bleu. Une bande colorée légèrement plus large apparaît sous son contour, aux endroits où les observations disponibles indiquent un ralentissement ou un bouchon. Elle dépasse sur les côtés et demeure visible sans recouvrir le bleu.

Cette bande suit la géométrie exacte du tracé sélectionné, découpée selon les observations alignées. Les routes voisines ne sont pas toutes épaissies. Les couches générales de trafic restent sous les itinéraires. Les données publiques, les observations de tuiles TomTom et les observations recueillies sur le corridor peuvent alimenter la présentation. Les observations expirées, le sens opposé et les sections non alignées sont écartés par le rapprochement géométrique existant ; cela n’est pas une preuve d’identification parfaite de chaque chaussée proche.

La bande est un affichage : elle ne change ni la géométrie du trajet, ni les estimations de temps/carburant, ni la sélection Rapide/Compromis/Éco. Le moteur 0.8.50 sans plafonds de durée et sans doublons de vitesse reste conservé. Les plans déjà enregistrés sont compatibles.

## Vérifications réalisées

- Tests navigateur avec le véritable rendu MapLibre et l’application, puis avec les scripts protégés extraits de l’APK final.
- Vrais événements de souris et événements tactiles CDP : glissement, molette, pincement, rotation à deux doigts, inclinaison à deux doigts, maintien de la vue pendant des positions GPS simulées régulières, puis reprise explicite via Recentrer. Rotation mesurée de plus de 18° dans le test final. Aucun recentrage automatique après les gestes.
- Navigation réelle de l’interface sur des réponses natives de routage simulées : trois cartes, trafic, demande manuelle de recalcul, guidage, interactions sur écran 360×640 et absence d’erreur JavaScript. Ce n’est pas un essai routier sur téléphone.
- Vérification des pixels : centre bleu et rouge/jaune visibles sur les côtés, en vue carte et en navigation inclinée. Sept situations : création initiale, actualisation après dessin, sélection/actualisation TomTom, navigation 3D, réactivation du trafic, rechargement complet du style, restauration de la bande.
- Le test visuel utilise des lignes rouges/jaunes synthétiques. Les tuiles TomTom sont simulées vides pour vérifier l’ordre des couches ; la conversion des ratios de vitesse en couleurs et le découpage de leurs géométries sont testés séparément.
- Tests de géométrie : portion alignée, rue parallèle éloignée, sens opposé, données expirées, ratios rouge/jaune et absence de bande pour le trafic fluide.
- Régressions : adaptateur cartographique, gestionnaires de navigation, contrôles TomTom et filtrage des sections publiques.
- APK signé avec la clé d’origine, R8 release, Terser et obfuscation sélective ; manifeste, DEX, alignement, ZIP, 22 scripts protégés et 191 empreintes d’intégrité vérifiés.

## Installation et sources

Installer `Hypercruise-0.8.52-HARDENED.apk` comme mise à jour. Installation et lancement sur téléphone physique ou émulateur Android non testés ici.

La sauvegarde contient sources, scripts, tests et résultats. Clé privée et mot de passe non recopiés : pour reconstruire une mise à jour, remettre les fichiers signing d’origine de la sauvegarde privée 0.8.25. SDK Android 35/build-tools 35.0.0 ; `npm ci --ignore-scripts` dans security, puis `HYPER_SDK=/chemin/sdk bash build.sh` à la racine.

Le rayon de couverture du trafic de 5 km reste une demande distincte ; cette version ne le déclare pas corrigé.

SHA-256 APK : `c4ea95fe13b21b47cfaca0a707ee3d20435974ccd20b71c6fe718c36557178ab`.

---

# Hypercruise 0.8.53

Android fr.hypercruise.app — versionCode 62. Certificat de signature conservé.

## Corrections

1. Le cap du recalcul vient du déplacement GPS réel ou d’un cap de déplacement Android suffisamment fiable, indépendamment de la direction dessinée sur l’ancien tracé. Les mesures imprécises, anciennes ou incohérentes sont écartées ; le dernier cap fiable expire au bout de 15 secondes. Le rapprochement au tracé tient compte du sens de déplacement. La conversion du cap dans le moteur utilise la latitude correcte. Les départs opposés sont pénalisés dans la recherche ; un demi-tour nécessaire reste possible. Cette pénalité ne gonfle pas artificiellement les litres ou le temps annoncé.
2. Les préférences de confort s’appliquent désormais aussi au mode Rapide. Desserte, zones de rencontre, mauvais revêtement et voies uniques à double sens sont davantage pénalisés. Les petites routes praticables restent accessibles, avec une pénalité réduite lorsque les données renseignent deux voies ou une limitation adaptée. Une route absente de la catégorie visuelle des grands axes peut donc être proposée. Les raccordements aux adresses restent possibles ; les chemins impropres restent exclus.
3. Le jaune/orange est réservé aux vitesses mesurées entre 35 % inclus et 50 % exclus de la vitesse fluide. En dessous de 35 %, ou en cas de fermeture, le trafic est rouge. Si la source ne précise pas l’intensité et fournit seulement une catégorie, seuls les bouchons sont affichés. Les vitesses brutes restent conservées pour les estimations : il s’agit d’un filtrage visuel.

Le centre bleu de l’itinéraire reste visible, avec la couleur du trafic sur ses bords. La caméra libre reste indépendante des mises à jour GPS ; le bouton de recentrage réactive le suivi.

Les profils routiers sont actualisés à l’installation dans un nouveau répertoire de politique. Les anciens résultats sont invalidés en conservant les adresses. Une seule nouvelle tentative de calcul de référence, bornée à 18 secondes, est autorisée si le premier court calcul expire. Les recherches de corridors globaux précèdent les fenêtres locales afin de préserver les possibilités de compromis mixtes. Aucun plafond de durée de trajet ni doublon de géométrie selon la vitesse n’est réintroduit.

## Vérifications

Tests automatisés : cap GPS et incertitude, arrêt, ancienneté, cap contradictoire avec le tracé, sens opposé, transmission effective au recalcul ; préférences routières BRF et accès ; seuils visuels de trafic et fermetures ; absence des anciens plafonds et doublons ; nouvelle tentative bornée et priorité des corridors globaux. Les tests natifs sur cartes RD5 réelles vérifient le départ dans les deux sens sur deux routes à double sens. Les politiques et la construction du modèle par réflexion sont vérifiées avant et après R8.

Tests navigateur sur les fichiers extraits de l’APK : rendu MapLibre du centre bleu et des bords colorés, actualisation du trafic, sélection, navigation inclinée, activation/désactivation et rechargement du style ; caméra libre avec déplacement, zoom, gestes tactiles, GPS continu et recentrage explicite. Les réponses Android sont simulées pour les tests d’interface. Le calcul natif utilise séparément le moteur Java de production et des cartes réelles dont CRC, version et SHA-256 ont été vérifiés.

Les recherches disposent d’un budget de calcul : certaines variantes peuvent expirer et seules les routes complètes trouvées sont affichées. Cela ne garantit pas l’optimum global. Les coûts, consommations et temps restent des estimations. La qualité des données cartographiques conditionne le repérage des rues étroites et de leur revêtement.

APK signé avec le certificat existant, ressources et intégrité vérifiées. Installation sur téléphone et essai GPS en voiture non réalisés ici.

La sauvegarde conserve sources, tests et preuves textuelles. Elle exclut les cartes RD5, les SDK, les dépendances installées, les captures de test et les secrets de signature. Réutiliser localement la clé privée existante pour compiler une mise à jour compatible.

## Pau–Brive : contrôle natif de cette reconstruction

Budget observé : 84.3 s. Plusieurs variantes ont expiré ; tableau limité aux résultats complets trouvés.

| Choix | Distance | Temps estimé | Autoroute | Autres routes | Coût estimé |
|---|---:|---:|---:|---:|---:|
| Éco | 339.7 km | 5 h 53 | 10.2 km | 329.5 km | 28.86 € |
| Compromis | 400.4 km | 5 h 6 | 275.7 km | 124.8 km | 63.04 € |
| Rapide | 395.1 km | 3 h 42 | 383.8 km | 11.3 km | 76.67 € |

---

# Hypercruise 0.8.54 — flèches blanches de navigation

APK Android fr.hypercruise.app, versionCode 63. Même certificat de signature que les versions précédentes.

Les prochains virages portent maintenant une flèche blanche avec un contour bleu foncé fin. Le corps de la flèche suit la géométrie réelle du tracé projeté à l’écran, y compris en perspective 3D et lors des rotations de carte.

La pointe conserve une taille de 12 pixels CSS au dézoom. Lorsque le virage devient trop petit pour afficher un corps lisible, la pointe seule conserve l’indication de sens. Il n’y a pas de seuil de zoom masquant arbitrairement les flèches. Les repères proches sont espacés automatiquement, avec au plus trois flèches simultanées. Les portions droites gardent une indication de direction lorsqu’aucune manœuvre n’est visible.

Les repères suivent l’avancement et le nouveau trajet après recalcul ; ils disparaissent à l’arrivée et à l’arrêt de la navigation. Le calque laisse passer les gestes de carte. Les marqueurs restent au-dessus des flèches.

Il s’agit d’une modification de présentation. Le moteur de calcul, les profils routiers, les estimations, les tarifs et les seuils de trafic sont ceux de la version 0.8.53. Les trajets précédemment sauvegardés restent compatibles.

## Vérifications

- Tests de géométrie, sens de sortie de virage, pointe de taille constante à quatre échelles, suppression des chevauchements, limites d’écran, arrivée, trajet vide et portion droite.
- Rendu réel MapLibre/SVG aux zooms 6, 8, 12, 14, 16 et 17, inclinaison à 55°, rotation, pixels blancs présents et taille minimale ; rechargement du style, arrivée, arrêt et nouveau tracé.
- Tests sur les fichiers extraits de l’APK signé : flèches effectivement créées par l’application en navigation ; caméra libre, déplacement, zoom, rotation et inclinaison tactiles, mises à jour GPS et recentrage explicite. Les réponses natives Android sont simulées pour ces tests d’interface.
- Vérifications de non-régression : position/caméra, trafic sous le bleu, seuils visuels du trafic, absence des anciens plafonds et des doublons de géométrie selon la vitesse.
- APK signé ; 23 fichiers JavaScript de premier niveau et 192 ressources protégées par les contrôles d’intégrité.

Installation sur téléphone et essai en voiture non réalisés ici. Les captures de tests restent internes et ne font pas partie de la sauvegarde.

La sauvegarde contient les sources et les tests, sans cartes, SDK, dépendances installées, sorties de compilation ou secrets de signature. La clé de signature privée existante est nécessaire pour reconstruire une mise à jour compatible.

---

# Hypercruise 0.8.55 — flèches minimalistes

Android fr.hypercruise.app, versionCode 64. Certificat de signature conservé.

Les indications sur le tracé sont redessinées en un trait blanc de 2,8 pixels CSS, avec pointe ouverte, terminaisons et coudes arrondis. Les pointes triangulaires pleines et le cerclage bleu foncé sont supprimés. Le corps des flèches est plus court.

Au maximum deux indications sont visibles, davantage espacées. En navigation rapprochée, seul le trait blanc est dessiné. À fort dézoom, un support du même bleu que l’itinéraire maintient le contraste du repère ; il disparaît progressivement lorsqu’on zoome. La pointe garde une taille stable à l’écran.

Les indications suivent toujours les virages, la rotation, l’inclinaison 3D, la progression et le nouveau tracé après recalcul. Elles laissent passer les gestes de carte et s’effacent à l’arrivée ou à l’arrêt de la navigation.

Modification de présentation uniquement : moteur, trajets sauvegardés, estimations et seuils de trafic conservés.

## Vérification

Tests de géométrie et de direction, absence de pointe fermée, coude arrondi, espacement, taille stable, sortie d’écran, arrivée et portion droite. Rendu MapLibre/SVG aux zooms 6, 8, 12, 14, 16 et 17, avec rotation et perspective 3D ; vérification des pixels blancs, du trait fin sans remplissage et de l’absence de contour en vue rapprochée. Rechargement du style, arrêt et nouveau tracé vérifiés.

Vérifications sur les fichiers extraits de l’APK signé : rendu minimaliste et navigation réelle de l’interface avec GPS simulé, caméra libre, gestes et recentrage. APK signé et intégrité des ressources contrôlée. Installation sur téléphone et essai en voiture non réalisés ici.

Sauvegarde des sources et tests sans SDK, cartes, dépendances installées, captures de test ou secrets de signature. La clé privée existante reste nécessaire pour compiler une mise à jour compatible.

---

# Hypercruise 0.8.56 — flèche de manœuvre pleine

APK Android fr.hypercruise.app, versionCode 65. Même certificat de signature.

La référence visuelle fournie est reprise sous forme d’une flèche blanche pleine et large : corps continu de 7 pixels CSS, pointe intégrée compacte et liseré sombre fin de 1,1 pixel. Le corps, la pointe et leur contour forment un seul polygone, sans raccord visible entre la tige et la tête. Les angles du tracé sont adoucis et le départ de la flèche est arrondi.

Une seule manœuvre est mise en évidence à la fois. La flèche suit la géométrie réelle de l’itinéraire projetée sur la carte, avec rotation et perspective 3D. Sa pointe garde une taille fixe à l’écran. Lorsque le tracé devient trop petit au dézoom, une pointe pleine compacte conserve l’indication.

Sur un rond-point, la portion de sortie est repérée à partir de la courbure du tracé et la flèche couvre la fin de l’anneau puis la sortie. Cette analyse est une aide d’affichage ; elle ne modifie ni la géométrie de l’itinéraire, ni les instructions, ni le numéro de sortie annoncé.

La flèche suit l’avancement et les recalculs, disparaît à l’arrivée et à l’arrêt de la navigation, et laisse passer les gestes de carte. Moteur de routage, estimations et trafic conservés.

## Vérifications

- Tests de forme pleine, largeur, sens, manœuvre unique, pointe compacte et taille stable à quatre échelles ; positions hors écran, arrivée et rond-point à plusieurs sorties.
- Rendu MapLibre/SVG aux zooms 6, 8, 12, 14, 16 et 17, inclinaison 3D, rotation, pixels blancs, polygone fermé et liseré fin. Rechargement du style, arrêt et nouveau tracé vérifiés. Inspection du rendu sur virage et rond-point.
- Tests sur les fichiers extraits de l’APK signé : création effective de la flèche en navigation, caméra libre, déplacement, zoom, rotation et inclinaison tactiles, mises à jour GPS et recentrage explicite.
- Signature existante et contrôles d’intégrité vérifiés.

Les tests d’interface simulent les réponses Android et le GPS. L’installation sur téléphone et l’essai en voiture restent à réaliser. Les captures de test restent internes.

Sauvegarde des sources et tests sans SDK, cartes, dépendances installées, sorties de compilation, captures ni secrets de signature. Réutiliser localement la clé privée existante pour reconstruire une mise à jour compatible.

---

# Hypercruise 0.8.57

## Directions cohérentes
Les consignes de virage ordinaires sont maintenant classées à partir de l’angle fourni par le moteur. À défaut, notamment pour un trajet enregistré avant cette version, l’application mesure la géométrie à proximité de l’intersection.

- Moins de 18° : continuer tout droit.
- De 18° à moins de 45° : légèrement à gauche ou à droite.
- De 45° à moins de 125° : tourner à gauche ou à droite.
- De 125° à moins de 165° : franchement à gauche ou à droite.
- À partir de 165° : demi-tour.

Les bifurcations, sorties, insertions et ronds-points conservent leurs indications propres : une bifurcation à faible angle peut nécessiter un choix de voie. Le texte, l’icône du bandeau et la voix utilisent la même catégorie. Les flèches blanches sur la carte ne signalent plus un virage ordinaire devenu « tout droit ». Les seuils sont des heuristiques et restent à vérifier sur route, notamment dans les intersections complexes.

## Cercle de vitesse
Un anneau fin entoure le compteur, avec des chiffres sombres et une indication compacte « Conseil » en Éco et Compromis.

- Vert : vitesse inférieure ou égale au conseil du mode, sans dépasser la limite cartographiée.
- Orange : conseil dépassé ou limitation dépassée de 5 km/h au maximum. Le dépassement de la limite est explicitement indiqué.
- Rouge : vitesse strictement supérieure à la limite cartographiée + 5 km/h.

En Rapide, le seuil vert correspond à la limitation stricte. Sur une route limitée à 130 km/h, les conseils sont 110 en Éco, 120 en Compromis et 130 en Rapide. À 135 km/h l’anneau est orange ; au-delà il est rouge. Ce seuil de couleur ne constitue pas une tolérance autorisée.

Le conseil Compromis est intermédiaire entre Éco et Rapide, arrondi par pas de 5 km/h. Le mode Éco respecte aussi les plafonds de confort connus des rues étroites, revêtements dégradés et ronds-points. Ces conseils d’affichage sont indicatifs : ils ne recalculent pas les prévisions de durée et de consommation du trajet.

Le compteur redevient neutre si la limitation exploitable manque, si le GPS est trop ancien ou imprécis, ou si la position ne correspond pas suffisamment à la route. Les limitations sont issues des données cartographiques ; la signalisation réelle fait référence.

## Validation
Tests automatisés de la classification des angles, des anciennes géométries, des voix et des consignes, des conseils par mode et des limites exactes de couleur. Tests dans le navigateur sur les ressources de l’APK, avec intégrité imposée, sur écrans de 393 × 852 et 360 × 640. Régression de la caméra libre, du trafic et du recalcul volontaire. Réponses du moteur Android simulées avec des trajets capturés pour les essais navigateur.

APK signé avec le certificat existant, paquet fr.hypercruise.app, code de version 66. Essai réel sur téléphone et validation en circulation non effectués. Aucun secret de signature ni capture de test n’est inclus dans la sauvegarde.

---

# Hypercruise 0.8.58 — péages, portions gratuites et zones de danger

## Ce qui change

Les tarifs de classe 1 existants sont mieux raccordés aux gares physiques : 1 150 des 1 266 emplacements du référentiel sont maintenant raccordés, contre 835 auparavant. La base comprend 18 935 couples entrée/sortie tarifés, contre 18 883. Les correspondances ont été normalisées à partir des libellés publiés ; les tarifs en contradiction ou les correspondances ambiguës ne sont pas inventés.

Des paiements fixes ont été intégrés ou corrigés sur les systèmes ouverts APRR/AREA, l’Autoroute Blanche ATMB et la barrière de Rônai (A88). Les matrices ALIAE et ADELAC complètent les couples exploitables. Un franchissement natif ne peut plus cumuler par erreur la barrière principale et une bretelle voisine. Si les deux restent trop difficiles à distinguer, le coût est indiqué à confirmer.

Un bouton « Péages et portions gratuites » présente les paiements identifiés, leurs sources, leur total lorsqu’il est exploitable et les portions rapides du parcours. Il est accessible avant le départ et dans les options de navigation. Les paiements partiels ne sont pas présentés comme un total complet.

## Portions gratuites : utilisation et limites

Le moteur garde l’accès à toutes les portions d’autoroute et voies rapides sans péage de son graphe installé, y compris avec « éviter les péages ». L’option « éviter les autoroutes » reste distincte. Les kilomètres d’autoroute sans péage cartographié apparaissent dans les résultats et le détail des portions rapides.

Il ne s’agit pas d’un nouvel inventaire national exhaustif, certifié et géométrique des portions gratuites. La classification repose sur les données OSM du graphe BRouter installé. Les tentatives de récupération d’un nouvel extrait national Overpass n’ont pas abouti ; aucune donnée manquante n’a été fabriquée. Les portiques de flux libre fournis par le moteur sont désormais considérés comme des passages payants dans l’analyse du trajet, même lorsqu’il manque le marquage de la voie précédente.

## Zones de danger en navigation

La publication du ministère de l’Intérieur du 30 décembre 2025 a été importée : 3 309 enregistrements de radars fixes, incluant différents types de contrôle. Les coordonnées sont rapprochées du tracé du trajet pour construire des zones étendues. L’application affiche « Zone de danger · Contrôles possibles », puis une distance jusqu’au début ou jusqu’à la fin de la zone. Elle ne présente ni un point exact sur la carte ni un compte à rebours jusqu’à un appareil.

Les zones ont une longueur de base de 4 km sur autoroute, 2 km sur les autres routes et 500 m en secteur résidentiel connu, puis leurs limites sont arrondies et les zones qui se chevauchent sont fusionnées. Ces choix sont des paramètres de présentation, pas des périmètres officiellement publiés ou une certification réglementaire. La proximité du tracé est vérifiée à 30 m ; les routes parallèles ou superposées restent une source possible d’erreur.

L’alerte disparaît à la sortie de la zone, à l’arrivée, à l’arrêt de la navigation, hors du tracé, si le GPS est trop ancien ou imprécis, ou lorsque l’option est désactivée. La préférence est conservée. Tout fonctionne localement, sans appel à une base de radars pendant le trajet.

La base publique utilisée ne fournit pas le sens de contrôle et n’est pas un recensement de tous les contrôles mobiles. Une alerte peut donc concerner l’autre sens ou ne pas signaler un contrôle récent. La vitesse indiquée dans cette base ne remplace pas la limitation utilisée par le compteur.

## Ce qui reste incomplet

La demande de connaître exactement tous les tarifs de chaque tronçon français n’est pas entièrement satisfaite. Les 116 emplacements encore non raccordés sont listés dans `tools/tolls/audit-0858.json`. Ce nombre n’est pas un taux de couverture des trajets : une gare raccordée ne garantit pas que tous ses couples et toutes les interconnexions sont exploitables.

Les tarifs horaires A86/A355 sont conservés parmi les sources, mais ne sont pas calculés automatiquement sans une règle vérifiée de sélection de la plage et du passage. Des configurations de flux libre A13/A14/A79 et certaines interconnexions peuvent encore afficher « péages à confirmer ». Les classes autres que 1 ne sont pas tarifées automatiquement. Les abonnements, remises, tarifs spéciaux et modifications postérieures aux publications ne sont pas couverts. Un tarif inconnu reste inconnu, jamais zéro.

## Sources

- Ministère de l’Intérieur, radars fixes, Licence Ouverte 2.0 : https://www.data.gouv.fr/datasets/liste-des-radars-fixes-en-france
- Avertisseurs et zones de danger : https://www.securite-routiere.gouv.fr/radars/radars-et-sanctions/avertisseurs-de-controle-radar
- Gares de péage : https://www.data.gouv.fr/datasets/gares-de-peage-du-reseau-routier-national-concede
- VINCI, tarifs publiés : https://www.vinci-autoroutes.com/fr/conseils/autoroute-mode-demploi/tarifs-peage-vinci-autoroutes/
- APRR/AREA : https://voyage.aprr.fr/tarifs-de-peage
- Systèmes ouverts APRR/AREA 2026 : https://voyage.aprr.fr/sites/default/files/2026-02/2026-%20Syst%C3%A8mes%20Ouverts%20APRR-AREA.pdf
- ATMB, tarifs véhicules légers applicables au 1er février 2026 : https://www.atmb.com/telepeage-tarifs/tarifs-peage-autoroute-blanche-a40-vehicules-legers/
- ADELAC : https://www.a41-adelac.com/sites/adelac/files/2026-02/TARIFS_2026.pdf
- ALIAE : https://www.aliae.com/files/live/sites/aliae/files/Documents/TARIFS_ALIAE-2026.pdf
- Sanef : https://www.autoroutes.sanef.com/fr/tarifs-peage
- Arrêté du 28 janvier 2026 pour les réseaux indépendants : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053417592

Les fichiers sources, leur provenance, les empreintes et les scripts d’import sont dans la sauvegarde. Les anciennes fonctions de calcul de carburant, de compromis, de caméra libre, de trafic et de guidage gradué restent présentes.

## Vérification

Tests automatisés sur les données importées, les zones et leur fusion, les états GPS, les paiements proches d’une bretelle, les sources et les tarifs déjà vérifiés (Pau–Bayonne, Pau–Langon, Valdurenque–Pau, Cofiroute, Lyon–Grenoble, Millau et portions rapides gratuites). Tests dans le navigateur sur les ressources intégrées à l’APK, avec intégrité imposée, à 360 × 640 et 393 × 852 : ouverture des détails, alerte en navigation, désactivation, GPS périmé/hors tracé, régressions de caméra libre, compteur et trafic. Les réponses Android sont simulées à partir de trajets capturés dans ces essais navigateur.

APK signé avec le certificat existant, paquet `fr.hypercruise.app`, version 0.8.58, code 67. Aucun essai réel sur téléphone ou en circulation n’a été effectué. La sauvegarde ne contient aucun secret de signature ni capture de test.

---

# Hypercruise 0.8.59 — couverture nationale des alertes approximatives

Les 116 emplacements non raccordés de la version précédente concernent les péages. Ils ne sont pas des emplacements de radars exclus. Les tarifs et leur couverture restent ceux de la version 0.8.58.

## Modification

Le rapprochement des emplacements publiés avec le tracé accepte maintenant une distance latérale maximale de 250 m, contre 30 m auparavant. Le filtre géographique est élargi dans les deux axes, y compris pour les coordonnées négatives et les territoires ultramarins présents dans la source. Les segments géométriques très longs ne sont plus ignorés à cause du nombre de cellules à examiner.

L’alerte indique « Localisation approximative » lorsque l’emplacement est à plus de 30 m du tracé, ou lorsque l’arrondi numérique des coordonnées publiées dépasse cette valeur. Les décimales de la source servent uniquement à signaler une précision possiblement faible : elles ne constituent pas une garantie d’exactitude du relevé. Certaines coordonnées sont particulièrement peu détaillées ; la tolérance reste plafonnée à 250 m pour éviter des alertes à plusieurs kilomètres d’une route.

Le choix correspond à un avertissement de proximité. Une route parallèle ou superposée peut donc déclencher l’alerte approximative. Le texte ne certifie ni le sens du contrôle ni que l’appareil se trouve sur la chaussée suivie. Aucun emplacement supplémentaire n’est inventé.

Les zones restent étendues : base de 4 km sur autoroute, 2 km sur les autres routes et 500 m en secteur résidentiel connu, arrondi des limites et fusion des zones proches. La distance affichée concerne le début ou la fin de la zone et non l’appareil. Les conditions de qualité GPS restent strictes ; l’élargissement concerne les emplacements publiés, pas le GPS du conducteur.

## Étendue de la source

Publication ministérielle du 30 décembre 2025, 3 309 enregistrements conservés. Répartition par grandes enveloppes géographiques :

| Territoire | Enregistrements |
|---|---:|
| Métropole, Corse comprise | 3 206 |
| Guadeloupe | 30 |
| Martinique | 41 |
| Guyane | 8 |
| Réunion | 24 |

21 des points métropolitains se trouvent dans l’enveloppe de la Corse. La publication importée ne comporte aucun point à Mayotte. L’absence de point ne signifie pas l’absence de contrôle.

Il n’y a aucun filtre limitant les alertes à quelques régions métropolitaines. Tous les points de la source peuvent produire une zone. Cela ne prouve pas l’exhaustivité des radars actuellement en service, et ne couvre pas tous les contrôles mobiles ou les installations plus récentes que la publication.

Source et licence : https://www.data.gouv.fr/datasets/liste-des-radars-fixes-en-france — Ministère de l’Intérieur, Licence Ouverte 2.0. La recherche de publication plus récente n’a pas permis de remplacer cette édition. La carte officielle consultable est https://radars.securite-routiere.gouv.fr/.

## Validation

- Les 3 309 enregistrements ont chacun été essayés avec un tracé synthétique décalé de 120 m : tous produisent une zone. Ce test valide le rapprochement spatial, pas l’état réel des routes ou l’exhaustivité des radars.
- Vérification des distances 0, 29, 31, 120, 249, 251 et 600 m dans sept localisations couvrant le nord, le sud, la Corse et les quatre territoires ultramarins présents.
- Vérification des coordonnées arrondies, des longues géométries, des caches, de l’absence d’alerte sans point source, des positions GPS périmées ou hors trajet.
- Essais navigateur sur les ressources de l’APK à 360 × 640 et 393 × 852 : mention approximative, distance restante, option d’activation, détails des péages et régressions du compteur, de la caméra et du trafic. Les réponses Android de ces essais sont simulées à partir de trajets capturés.

APK signé avec le certificat existant : paquet `fr.hypercruise.app`, version 0.8.59, code 68. Aucun essai réel sur téléphone ou en circulation effectué. Aucun secret de signature ni capture de test dans la sauvegarde.

---

# Hypercruise 0.8.60

Version Android 69 — 23 octobre 2026. Mise à jour signée avec le certificat habituel.

## Ce qui change

- Bulles de zones de danger sur la carte du trajet sélectionné, avant le départ et pendant la navigation. Une icône caméra et le libellé « Zone » ; toucher la bulle affiche l’étendue ou la distance restante. Le popup de navigation reste présent. Le réglage de désactivation masque les deux affichages.
- Les bulles désignent une portion de trajet large, calculée à partir des données publiques déjà intégrées. Elles ne désignent pas le point exact de l’appareil. Les zones passées disparaissent ; les bulles se décalent entre positions possibles dans la même zone pour éviter panneaux, boutons et chevauchements.
- Le moteur recherche des parcours différents : plusieurs contournements de sections payantes, recherche de variantes natives en ville et évitements de segments intérieurs si nécessaire. Chaque géométrie est vérifiée et évaluée par le moteur natif.
- Les triplets utiles Éco / Compromis / Rapide restent privilégiés selon le coût total et la durée. Lorsque ces gains n’existent pas, des chemins supplémentaires sont présentés en gris sous « Variante », avec leur surcoût ou leur tarif à confirmer. Un prix incomplet ne supprime plus toutes les autres routes. Aucun trajet identique n’est dupliqué pour remplir une carte avec une autre vitesse.
- Le panneau de saisie est centré horizontalement sur mobile et placé sous les boutons Menu / Mon bilan ; il ne les recouvre plus lorsque le clavier est utilisé. Les suggestions tiennent compte de la hauteur visible et le formulaire se compacte lorsque l’espace est faible.
- Correction du demi-échangeur nord de Biarritz : péage ouvert de 1,20 € classe 1, plutôt qu’une entrée isolée d’un réseau fermé. Cela rétablit le prix complet de la référence Pau–Biarritz et permet sa comparaison financière avec les variantes. Les tarifs inconnus sur d’autres tronçons restent affichés à confirmer.
- Les anciens calculs sauvegardés sont invalidés lors de cette mise à jour ; le départ et la destination sont conservés pour recalculer avec le nouveau moteur.

## Résultat observé avec le moteur réel

Départ : rue Ronsard à Pau (43.318243, -0.356383). Arrivée : centre de Biarritz (43.4833, -1.5586). Données RD5 officielles BRouter téléchargées pour le test. Profil 306 1.9 TD par défaut, carburant 1,75 €/L, sans trafic. Résultats estimés, non mesurés en conduite. Les trois géométries sont différentes.

| Parcours | Durée | Distance | Autoroute | Péages | Carburant + péages |
| --- | --- | --- | --- | --- | --- |
| Éco | 2 h 31 | 115.5 km | 0.0 km | 0.00 € | 9.56 € |
| Compromis | 2 h 00 | 128.0 km | 67.2 km | 5.20 € | 18.17 € |
| Rapide | 1 h 15 | 121.4 km | 114.6 km | 10.90 € | 24.48 € |

Le choix mixte économise environ 6,31 € sur le coût total estimé, avec environ 45 minutes supplémentaires face au rapide. Aucun plafond artificiel de durée n’a été réintroduit. La recherche est bornée en temps de calcul, sans garantie d’optimalité mondiale.

Sur rue Ronsard → centre de Pau, le moteur produit trois chemins différents : référence de 4,524 km / environ 15 min, variantes de 4,547 km / environ 16 min et 4,665 km / environ 21 min. Les deux variantes coûtent davantage dans ce cas et sont grises, sans promesse de gain Éco. Le mode sans péage Pau–Biarritz conserve trois parcours dont les péages sont vérifiés à zéro.

## Validation

- Exécution du vrai moteur Java/BRouter sur Pau–Biarritz, Pau urbain et Pau–Biarritz sans péage ; contrôles de légalité, fuel, géométries distinctes et cohérence de la référence.
- Régression du triplet utile Pau–Brive sur un calcul natif enregistré antérieurement ; tests de sélection sans plafond de durée, prix inconnu et rejet des duplications de vitesse.
- Régressions de tarification nationale (67 vérifications), franchissements de péages, zones de danger nationales, consignes de navigation, anneau de vitesse et flèches.
- Navigateur avec les fichiers de l’APK final : intégrité des ressources, calcul simulé avec réponses natives enregistrées, bulles avant départ et en navigation, désactivation, popup, panneau à 360 / 393 / 709 px, caméra libre, gestes tactiles et suivi GPS simulé.
- Compilation Android avec protection des ressources, signature, contrôles de version et d’intégrité. Pas de test physique sur téléphone effectué dans cette session.

Les trois options sont recherchées, mais un réseau n’offrant réellement qu’un seul chemin légal ne peut pas fournir trois trajets distincts. La couverture des zones reprend les 3 309 positions publiques de la version précédente ; elle ne garantit ni tous les contrôles mobiles ni une donnée exhaustive ou instantanée.

## Sources de la correction et du test

- Grille ASF classe 1 au 1er février 2026, page 5, A63 : https://public-content.vinci-autoroutes.com/PDF/Tarifs-peage-asf/ASF-tarifs-2026-non-mailles-C1.pdf
- Données routières BRouter / OpenStreetMap : https://brouter.de/brouter/segments4/W5_N40.rd5
- Géocodage rue Ronsard, Pau : https://api-adresse.data.gouv.fr/search/?q=Rue%20Ronsard%20Pau&limit=1

Le ZIP contient les sources et les résultats de vérification, sans clé de signature ni secret. Les fichiers RD5 et les dépendances de compilation lourdes ne sont pas inclus.