# Hypercruise — dossier de passation et annotations techniques

**Point de départ : 0.8.71 HARDENED, code Android 80, modèle physique 13.** Ce fichier s'adresse à la personne ou à l'agent qui reprend le projet. Il explique les décisions et les pièges que le code seul ne raconte pas. Il n'implique aucune modification du code ou de l'APK. Les chemins techniques ci-dessous sont relatifs à la racine du ZIP décompressé. En cas de désaccord, vérifier l'implémentation active et le test de la version correspondante.

## 1. À conserver avant de quitter ChatGPT

Télécharger les fichiers sur le PC et faire une seconde copie sous son contrôle. Les liens servent à récupérer les fichiers maintenant ; la passation doit fonctionner ensuite avec les copies locales.

| Fichier | Usage |
|---|---|
| [Hypercruise-0.8.71-sauvegarde-privee.zip](https://chatgpt.com/library?file_id=libfile_211ba82acdbc8191880519f42c753664&account_id=personal) | Source à ouvrir dans Claude Code : application, moteur, profils, tests, résultats et scripts. |
| [Hypercruise-0.8.71-HARDENED.apk](https://chatgpt.com/library?file_id=libfile_dfe0723db22c81919802465244175c8f&account_id=personal) | Version distribuée, référence fonctionnelle et de signature. |
| [Hypercruise-0.8.71-notes.md](https://chatgpt.com/library?file_id=libfile_4a121cd9d6e081919cbf294ec1f9ddda&account_id=personal) | Notes de la dernière livraison ; ce dossier ajoute le contexte de reprise. |
| Ancienne sauvegarde privée de signature 0.8.25 (à conserver à part) | Copie historique contenant les éléments de la clé d’origine. Ce n’est pas le code à reprendre. Le lien de cette archive privée n’est pas inclus dans ce fichier à transmettre. |

Le ZIP 0.8.71 ne contient pas la clé privée de production. L'ancienne sauvegarde contient, sous un dossier `signing/`, le fichier `hypercruise.p12` et le fichier `password.txt`. Les récupérer et conserver hors du projet courant, en stockage privé (idéalement chiffré), avec une sauvegarde dont on vérifie qu'elle est récupérable. Ne rendre ces fichiers disponibles à la racine du build que pour une signature locale maîtrisée. Ne jamais les afficher dans un prompt, des logs ou une capture d'écran. Ne pas créer une nouvelle clé pour remplacer l'ancienne : elle ne permettrait pas de mettre à jour l'application déjà installée sous le même package.

Empreintes publiques de référence :

- ZIP source, **121 000 216 octets**, SHA-256 `589b160f1c3523181e871ab4739dc6b6ec98b0ecd021469f797a1da458861579`.
- APK, **6 337 791 octets**, SHA-256 `b9f47fccc87d4c091730d8a8e1ed0aeb3114ce012574c775a77f93dce1f0c50f`.
- Certificat Android historique, SHA-256 `671d425a9af88f3ebba6b04b0e9225c02e2fded9704a22e3f6990c49d4d3d929`. C'est l'empreinte d'un certificat public, pas un secret. Un nouveau build peut avoir un autre hash APK ; le certificat d'une mise à jour distribuée doit rester le même.

**Démarrage conseillé dans Claude Code.** Décompresser le ZIP 0.8.71, garder une copie intacte, ouvrir la racine du projet, et mettre ce Markdown à la racine. Un `CLAUDE.md` court peut y renvoyer ; inutile de recopier toute cette documentation dans le contexte de chaque session. Git local ou dépôt privé au choix. Faire un point de sauvegarde de la version importée ; ignorer `signing/`, `build/`, `output/`, `node_modules/`, SDK, APK et cartes téléchargées. Ne pas ignorer les données routières, bibliothèques, licences et fixtures déjà versionnées par principe : certaines sont nécessaires à la reproduction.

Premier prompt prêt à coller :

> Tu reprends Hypercruise Android 0.8.71. Lis Hypercruise-ANNOTATIONS-0.8.71.md, le manifest, build.sh et les tests récents. Vérifie l'état de référence avec des tests sans clé, puis indique exactement ce qui manque pour reproduire l'APK. Ne réécris pas l'application et ne modifie pas la release signée pendant cette prise en main. Pour chaque changement à venir, isole le périmètre, garde les comportements non concernés, donne une preuve avant/après et produis un APK seulement si la chaîne correspondante a été vérifiée. N'accède pas à la clé de production ; je gère la signature historique séparément.

## 2. Vision produit et règles que les tests doivent protéger

Hypercruise est un GPS Android orienté économies de **carburant + péages**, avec calcul routier local et guidage visuel/vocal. Les litres, durées et gains restent des **estimations**. L'objectif est une app utilisable au quotidien : une économie théorique ne justifie pas systématiquement des rues étroites ou une navigation pénible.

| Présentation | Sens réel |
|---|---|
| Le plus rapide | Référence choisie selon la durée à l'allure de référence, parmi les itinéraires découverts et compatibles avec les préférences. |
| Éco | Coût complet estimé le plus bas parmi les candidats admissibles, tracé différent, au moins 0,25 € d'économie vs Rapide. Aucun plafond de durée du voyage. |
| Compromis | Chemin plus rapide qu'Éco avec une économie sur Rapide. Cherche un vrai milieu : par exemple une autoroute gratuite ou un bout d'autoroute payante et le reste par les grands axes. Préférence souple pour environ la moitié des péages de Rapide ; aucun montant fictif. |
| Variante | Alternative géométrique honnête quand il manque un vrai profil Éco ou Compromis. Ne jamais vendre une variante grise comme un gain certifié ou un « Équilibré » inexistant. |
| Extremiling | Optimisation distincte, priorité à la sobriété : peut conserver Éco si aucune amélioration vérifiée. Ne doit pas dégrader Éco. Sa conduite à 70 km/h sur route ordinaire n'est pas une interdiction globale de l'autoroute. |

- Trois chemins utiles quand c'est possible, aussi en ville. Aucun doublon uniquement pour une vitesse différente. Aucune obligation de fabriquer trois options quand le réseau, le budget de recherche ou les prix connus ne le permettent pas.
- Sans péage, sans autoroute et « Forcer au maximum les gros axes » sont des réglages indépendants. Éco n'implique pas automatiquement les deux interdictions. Un grand axe gratuit peut être excellent en Éco ou Compromis. Une voie rapide de classe `trunk` reste distincte d'une autoroute pour le filtre.
- Un péage non tarifé, une limitation incertaine ou une observation de trafic absente doit rester inconnu, jamais devenir un zéro ou un chiffre assuré. Les enveloppes de coût ne sont pas des tarifs.
- Éviter les petites routes **quand il existe une alternative**. Ne pas interdire la dernière rue qui donne accès au départ ou à la destination.
- En navigation, préserver l'intention de la personne : caméra libre jusqu'au recentrage explicite ; après une erreur de route, garder le profil choisi ; ne pas ordonner un demi-tour juste parce qu'un fix GPS a sauté de chaussée.
- Une réfection d'icônes ne doit pas changer les règles de vitesse, le tracé, les pops radar ou l'algorithme de recalcul. Le logo principal est déjà validé.

## 3. Plan du code

| Emplacement | Rôle et raison d'y aller |
|---|---|
| `app/AndroidManifest.xml`, `app/res/` | Identité Android, versions, permissions, ressources natives. |
| `app/src/fr/hypercruise/MainActivity.java` | WebView Android, pont avec les assets, GPS, état et intégrations natives. Préserver le contrat JS↔Java. |
| `LocalEngine.java`, `LocalRouter.java`, `LocalSplice.java` dans le même dossier | Sessions et budget de jobs, paramètres Java, accès au moteur BRouter, calculs locaux et jonctions vérifiées. |
| `MapStore.java`, `PlaceSearch.java`, `GuidanceAudio.java` | Cartes RD5, recherche de lieux et audio natif. Une carte de routage installée et un fond de carte affiché sont deux sujets différents. |
| `app/engine-src/btools/router/` | BRouter embarqué. `RoutingEngine` explore puis rejoue le guide ; `KinematicPath`, `KinematicModel`, `ThermalGeometry`, `ThermalCurvePlan` portent l'état, le calcul physique et le freinage. |
| `app/assets/routing/` | Profils de production `hypercruise-306-thermal.brf` et `hypercruise-reference-temps.brf`, plus dictionnaire des tags. Ne pas prendre un vieux BRF homonyme pour profil actif. |
| `app/assets/local-planner.js` | Recherche des candidats, reprises, fenêtres de contournement, validation, rejeux, conversation avec les jobs natifs. |
| `route-selector.js`, `main-axes.js`, `mix-seeds.js` | Rôles des cartes, filtre grands axes et recherche sur des sections de péage. Dans le sélecteur, le second bloc d'installation remplace le sélecteur standard historique : raison pour laquelle un ancien plafond reste visible dans le fichier sans s'appliquer au mode courant. |
| `core.js`, `extreme-optimizer.js`, `compromise-options.js` | Profil, géométrie, consommation/coûts, comparaison ; optimisation Extremiling ; recommandation et exploration des Compromis. `core.js` contient aussi un chemin JS historique : le résultat natif utilise `route.nativeFuel`. |
| `toll-cost.js`, `toll-data.js`, `toll-rules.js`, `toll-report.js` | Détection des passages, provenance et grilles, tarification, présentation. Une station dessinée proche de la route ne prouve pas qu'elle est traversée. |
| `traffic-engine.js`, `route-traffic.js`, `traffic*.js` | Observations partielles, association au sens/tracé, calcul du surcoût, affichage. Données actuelles ≠ prévision de trafic futur. |
| `app.js`, `chrome.js`, `index.html`, `style.css`, `design.css` | États UI, comparaison, cache, navigation, tiroirs, réglages, arrivée et bilan. `chrome.js` enrichit certaines fonctions définies dans `app.js` : lire les deux avant une modification. |
| `nav-policy.js`, `speed-limit.js`, `guidance-voice.js`, `reroute-policy.js`, `reroute.js` | Classification des manœuvres, limitation/conseil, voix, intention et protection contre les recalculs erratiques. |
| `nav-arrows.js`, `nav-camera.js`, `nav-motion.js`, `map-adapter.js`, `hyper-map-style.js`, `appearance.js`, `icons.js` | Rendu cartographique, flèches sur le tracé, suivi caméra, styles et icônes. Les pictos de manœuvre ne sont pas tous dans `icons.js`. |
| `danger-data.js`, `danger-zones.js`, `danger-map.js` | Zones radar et badges avant/pendant guidage ; distinguer données de la zone et emplacement de son rendu. |
| `build.sh`, `security/`, `tests/`, `evidence/` | Fabrication et protections, tests exécutables, traces et fixtures. Plusieurs README et tests historiques s'appliquent à d'anciennes versions. Le README racine décrit encore la 0.8.29 ; `security/verify-release-config.py` attend encore 0.8.57/code 66. Ne pas faire revenir le manifest en arrière pour satisfaire ce test. |

## 4. Modèle de calcul Éco : référence pour une reprise d'ingénierie

Notations : mètres, secondes, kg, vitesses en m/s sauf indication contraire. Le code estime une conduite à partir de l'itinéraire : aucune mesure directe de débit carburant du véhicule.

### 4.1 Calibration et cinématique

Entrées : masse du trajet m, masse de calibration m_cal, consommation B en L/100 km à 75 km/h sur le plat, prix p. Réglages initiaux : 1300 kg, 1300 kg, 3,5 L/100 km, 1,75 €/L. Rendement constant calibré dans `LocalEngine.begin` :

```text
v_ref = 75 / 3.6 ; E_L = 36e6 J/L ; g = 9.81
Crr = 0.012 ; k_air_ref = 0.39 ; P_aux = 700 W
eta = 100000 * (m_cal*g*Crr + k_air_ref*v_ref² + P_aux/v_ref) / (B*E_L)
F_roll = m*g*Crr
```

Par défaut eta est proche de 0,2825. Distinguer m de m_cal. Modèle simple : rendement constant, puissance aux roues 58 kW, accélération plafonnée à 0,45 m/s², freinage anticipé 0,5 m/s², accélération latérale de confort 1,5 m/s², ralenti 0,7 L/h. Pas de courbe couple/régime, de rapports de boîte, de mesure OBD, de récupération électrique ni de vent mesuré.

La vitesse effective est le minimum du plafond global (130), de la limite directionnelle ou de classe disponible, de la cible de politique et des plafonds de qualité, zone et surface ; vitesse nulle pour un accès interdit. En Éco, pour une limite V en km/h, la cible est 110 si V>120, 105 si V>110, 100 si V>100, 95 si V>90, 85 si V>80, V sinon. Conditions testées dans cet ordre : 130→110, 110→100, 90→85, 80→80, 50→50. La cible n'est ni la vitesse réelle sur toute l'arête, ni une valeur de panneau. En simulation, les plafonds fonctionnels incluent 25 au rond-point, 20 en zone de rencontre et 30 sur voie étroite à double sens connue. Le profil Rapide prend la limite de référence avant plafonds locaux ; 130 n'est pas une vitesse fixe de simulation.

Pour deux longueurs adjacentes d1, d2 et un angle défléchi θ en radians :

```text
R = ((d1+d2)/2) / (2*sin(min(pi,abs(theta))/2))
v_curve = min(v_max, sqrt(1.5*R))     # presque droit => v_max
v_allow[i] = min(v_allow[i], sqrt(v_allow[i+1]² + 2*0.5*d[i]))
```

La seconde formule est une passe arrière de freinage : on ne simule pas une pleine accélération juste avant de freiner artificiellement au point du virage. Lors du rejeu détaillé, `ThermalCurvePlan` prépare l'enveloppe sur tout le guide ; la recherche initiale dispose d'informations plus locales.

Pour une section de longueur d et de variation brute dh, utiliser un filtre spatial du premier ordre. Le lag ell = altitude brute moins filtrée est transmis entre les sections :

```text
alpha = 1 - exp(-d/40)
ell_next = (1-alpha)*ell + alpha*dh*40/d
dh_filtered = dh + ell - ell_next
F_grade = m*g*dh_filtered/d
k_air = 0.39 * (1 + 0.0035*(20 - temperature) - 0.0001375*(altitude - 100))
```

En natif, l'altitude et les variations signées participent à la dynamique. Le D+ affiché BRouter et le D+ modélisé sont des diagnostics distincts. N'appliquer aucun surcoût global « D+ × masse » en plus de la force de pente : ce serait un double comptage.

La simulation avance par sous-pas dx de 20 m au plus (un petit pas qui commence et finit à l'arrêt peut être subdivisé). Soient v la vitesse d'entrée et u la vitesse de sortie :

```text
F0 = F_roll + k_air*v² + F_grade
a = min(0.45, (58000/max(v,1) - F0)/m)
u_raw = min(v_lim, sqrt(max(0, v² + 2*a*dx)))
```

Si maintenir v_lim demande plus de 58 kW, chercher par dichotomie la vitesse d'équilibre v_P qui vérifie `(F_roll+k_air*v_P²+F_grade)*v_P=58000`. En accélération, borner u par v_P. En arrivant avec davantage d'élan, ne pas appliquer une chute instantanée à v_P : l'évolution se fait sur la distance réellement parcourue. L'enveloppe de freinage peut aussi imposer `u ≤ sqrt(v_sortie²+2*0.5*d_restant)`.

```text
dt = 2*dx/(v+u)
W = max(0, [F_roll + k_air*(v²+u²)/2 + F_grade]*dx + m*(u²-v²)/2)
dL = max((W + P_aux*dt)/(eta*E_L), (0.7/3600)*dt)
T_phys = somme(dt) + somme(attentes)
L_phys = somme(dL) + (0.7/3600)*somme(attentes)
```

Un feu ajoute 15 s d'attente modélisée, un stop 2 s. Les nœuds de feu à 15 m ou moins peuvent être fusionnés ; les virages marqués et les arrêts séparent les événements. Le profil peut simuler 10 s et un arrêt lors d'une transition local/principal, et 2 s sur certains changements de classe de bretelle. Un ralentissement agit aussi sur l'énergie cinétique, donc sur la prochaine relance. La descente peut réduire le travail de traction, jamais créditer du carburant. Les résultats natifs sont sérialisés en énergie puis convertis en litres via `total-energy / 36e6`.

### 4.2 Chercher des candidats n'est pas les classer

La priorité de file du moteur est `G + floor(H * distance_restante_vol_oiseau)`. G cumule les coûts et les règles de graphe. D est la distance initiale à vol d'oiseau en km ; définir `clip(x)=max(0,min(1,x))`.

```text
long = clip((D-300)/200)
lambda = 3 + 10*long                         # L équivalents par heure
H_eco = (4 + 11*clip((D-35)/100) + 20*long)*(0.7+lambda)/3.7
c0 = (0.7/3600)/(130/3.6)
score thermique de section ~= floor(
    (L + lambda*T/3600 + preference_L_km*d/1000)/c0
    + d*costfactor_profil + 0.5
)
```

Les coûts de nœud, de transition, de tracé déjà utilisé et les exclusions peuvent s'ajouter. Le score Rapide prend le temps comme coût physique normalisé par `1/v_max`, avec préférences routières en s/km. Exemples de préférences thermiques normales : service 0,14 L/km, zone de rencontre 0,12, résidentiel 0,035, `unclassified` 0,004 ou 0,012 ; étroitesse +0,08, revêtement dégradé +0,04. Certaines recherches ajoutent 0,03 ou 0,08 L/km marqués payants et changent le poids du temps. Ces nombres sont des **préférences artificielles** et ne doivent être ajoutés ni au réservoir ni au montant des péages. Les deux profils BRF donnent les valeurs exactes des autres branches, dont la version renforcée grands axes.

Séquence `HCLocalPlanner.plan` : obtenir un guide Rapide, rechercher un thermique Éco, puis selon le budget lancer Compromis pondérés, Rapide sans péage, contournements de sections payantes, raccordements locaux, alternatives en ville et déviations trafic si disponibles. Les essais dépendent de ce qui a déjà été trouvé, du temps de calcul et des options. Pour les graines de péage, rapprocher des gares connues du tracé ; considérer des couples espacés de 2–60 km ayant un prix positif et un milieu autoroutier marqué payant ; essayer en priorité des montants élevés et garder des points espacés de plus de 5 km. L'exclusion de 150 m au point intermédiaire sert à découvrir un tracé réel. Les fenêtres de recherche locale autour de tronçons payants dimensionnent et raccordent la portion à remplacer ; `LocalSplice` travaille avec des jonctions du graphe, pas des droites dessinées.

Le plan courant dispose d'environ 110 s de budget global normal, 150 s pour Extremiling, avec budgets par recherche, une fenêtre de découverte et une réserve de rejeu. Le calcul peut finir plus tôt. Ces bornes s'appliquent au **temps CPU attendu**, pas à la durée autorisée du voyage. L'heuristique et le budget rendent impossible une garantie d'optimum global.

Dédupliquer les géométries. Pour chaque guide conservé, rejouer **le même tracé physique** en mode Éco et en mode Rapide ; supprimer les préférences du calcul physique, vérifier l'identité exacte de la géométrie et n'accepter que les paires complètes. Un itinéraire découvert par un job Compromis peut finir Éco. Les noms des jobs ne définissent pas le rôle final.

### 4.3 Trafic, prix et attribution du rôle

Le trafic est un correctif facultatif et partiel. Le code rapproche les observations du tracé et de son sens. Par section : t0 temps de base, d longueur en mètres, V=3,6*d/t0. Si tau est l'âge de l'observation au passage prévu en secondes :

```text
w = confiance * (exp(-max(0,tau-300)/1000) si tau<3600, sinon 0)
V_traffic = max(2, V - w*max(0,V - V_obs))
dT = max(0, 3.6*d/V_traffic - t0)
n = d/1000 * w * r
dL = taux_ralenti*dT/3600 + 0.5*m*(min(V,35)/3.6)^2*n/max(1,eta_JS*E_L)
```

r vaut 1,5 / 0,5 / 0,15 / 0 relance/km selon le rapport de vitesse observée à fluide (<0,25 ; <0,50 ; <0,75 ; sinon). Une fermeture suffisamment fiable et proche est marquée à part et écarte le candidat du classement. Ce n'est pas une prévision. Lire `traffic-engine.js` pour l'appariement et les garde-fous.

```text
L_total(R) = L_phys(R) + somme(dL_trafic)
T_total(R) = T_phys(R) + somme(dT_trafic)
Prix_total(R) = prix_litre * L_total(R) + somme(tarifs_en_centimes)/100
Gain(R) = Prix_total(Rapide) - Prix_total(R)
```

Péages : utiliser le montant de la barrière réellement franchie ou celui de la paire entrée-sortie du tracé ; cas spécifiques pour horaires/flux libre/transitions entre réseaux lorsque tarifés. Ne pas chercher un « prix minimal » dans une matrice de gares si cela suppose de sortir à un endroit où l'utilisateur ne passe pas. Si le coût complet d'un des trajets manque, ne pas afficher de gain certifié. Une section sans péage cartographié n'est pas une promesse de couverture nationale exhaustive.

Filtres avant comparaison :

1. Options de péage/autoroute, accès, tracé et données cohérents, pas de fermeture à venir pertinente. Le JS rejette notamment ferry, accès privé signalé et plus de 50 m de chemins incompatibles ; le profil filtre aussi les voies au niveau natif.
2. Avec gros axes forcés, ignorer aux extrémités `min(900 m,0.15*longueur)`. Mesurer les kilomètres pondérés : mauvais chemin 8, étroit 6, service 8, résidentiel/zone de rencontre 4, `unclassified` 1 si traversante ou limite connue ≥50, 3 sinon, autres 0. Priorité au premier cas correspondant. Garder `score <= meilleur + max(0.5,0.1*meilleur)`. Les BRF renforcent aussi la préférence pendant la découverte.
3. Filtre confort standard : ignorer `a=min(500 m,0.15*longueur)` de chaque côté, puis diviser les mètres locaux ou étroits restants par `max(1,longueur-2a)`. Sont locaux les segments hors motorway/trunk/primary/secondary/tertiary, ou étroits quelle que soit la classe. Garder au plus `max(0.10, min(part_locale)+0.05)` ; conserver également l'ancre Rapide issue du pool compatible.
4. Géométries distinctes : rejeter les coordonnées identiques à la tolérance de `1e-7` degré. Échantillonner les deux tracés (jusqu'à 700 points, pas cible 350 m). Avec K le plus court en km, s le minimum des deux recouvrements, divergence `K*(1-s)`. Premier test au rayon de 100 m : `s<0.90` et divergence `> max(0.4,min(6,0.04*K))`. Sinon test à 25 m si K<15 km, 60 m sinon : `s<0.98` et divergence `> max(K<15 ? 0.10 : 0.8, min(3,0.025*K))`.
5. Référence Rapide par temps à l'allure Rapide, départage par prix connu puis nom. Éco : tracé suffisamment différent, durée positive, prix connu, économie d'au moins 0,25 € sur Rapide. Trier Éco par prix, puis durée, puis nom. Si le coût Rapide est inconnu, ne pas annoncer d'Éco avec un gain non vérifiable. Compléter au besoin avec une variante grise et distincte.

Exemple : 10 L sans péage à 1,80 €/L font 18 € ; 8 L + 6 € de péage font 20,40 €. Le premier peut être Éco en consommant plus de carburant. Un gain estimé peut aussi venir de l'allure, même si la carte dédiée au mode Éco exige un tracé différent.

## 5. Pourquoi les derniers changements existent

### 0.8.67 — préserver Compromis après une erreur de route

Bug : après une sortie ratée, le recalcul pouvait récupérer les exclusions temporaires et un poids de temps nul créés pour découvrir le trajet initial. Cela donnait une déviation de type Éco qui perdait du temps et du confort. Correctif : `reroute-policy.js` nettoie les exclusions, garde l'intention Compromis et prend 8 L équivalents/h par défaut. Depuis 0.8.70, les choix explicitement typés `compromise_choice` ou `navigation_choice` peuvent conserver leur poids 4, 8 ou 12.

Quand les conditions le permettent, le moteur essaie un nouveau chemin rejoignant le **corridor restant** : même destination à 100 m près, suffisamment de route restante (2,5 km), position assez proche du corridor vers l'avant (3 km), progression après la déviation ; ancres suffisamment espacées et en nombre borné. Sinon il cherche un Compromis neuf. Le cap initial de la voiture s'applique seulement à la première partie du recalcul multi-ancre. Ne pas forcer ce même cap à chaque point de passage.

### 0.8.68 — grands axes sans condamner les départs et arrivées

Ajout du réglage exact « Forcer au maximum les gros axes », désactivé par défaut. Il agit en recherche native ET au choix final, sans transformer le modèle de carburant. Idée d'origine : éviter des petits chemins évitables autour d'Orthez sans perdre la philosophie des modes. Le test Orthez montrait notamment l'élimination d'une variante contenant 276 m de résidentiel évitable ; il ne prouve pas que tout trajet historique y passait par les petites routes.

### 0.8.69 — Extremiling doit battre ou conserver Éco

Ancien symptôme : Extremiling pouvait coûter plus cher **et** être plus lent qu'Éco. Depuis 0.8.66, utiliser Éco comme référence de secours, puis évaluer des allures adaptatives et des corridors différents. La .69 diversifie jusqu'à six graines, préserve les corridors Éco explorés et peut chercher des intermédiaires de péages si le budget le permet. Le plan final ne retient pas un candidat avec un coût **ou** un carburant supérieur à Éco. Il faut une économie significative (>0,005 €) ou un temps meilleur à coût équivalent selon les gardes du module ; à défaut reprendre le tracé Éco avec le diagnostic d'allure correspondant. Sur autoroute/voie rapide, l'allure adaptative peut appliquer la cible Éco plutôt que 70.

Exemple de banc .69 sur Pau–Biarritz : environ 5,080 L / 8,89 € / 2 h 41 min 47 s en Extremiling, vs 5,462 L / 9,56 € / 2 h 30 min 44 s en Éco. Résultat simulé sur une fixture ; ce n'est ni un relevé de réservoir ni une preuve de gain sur l'ancienne version d'Extremiling.

### 0.8.70–0.8.71 — choix Compromis et absence de vrai milieu

La .70 ajoute le tiroir avec choix de compromis, montants et écarts vs Rapide. Le retour utilisateur montrait environ 0,50 € de péage avec +77 min, 1,70 € avec +68 min pourtant marqué « Équilibré », puis 13,80 € avec +9 min. Le souci n'était pas seulement le libellé : la recherche supplémentaire changeait surtout des poids globaux et ne savait pas toujours récupérer un vrai mélange.

Dans la .71 :

- Candidats distincts, légaux, confortables selon les filtres, coût connu au moins 0,25 € au-dessus d'Éco et au moins 0,25 € sous Rapide ; durée plus courte qu'Éco, et pas plus d'une seconde plus rapide que la référence. Supprimer les alternatives dominées en temps et coût (au moins un des deux strictement pire).
- Normaliser `t=(T-T_R)/max(1,T_E-T_R)` et `c=(C-C_E)/max(0.01,C_R-C_E)`, bornés en bas à 0. Un Équilibré exige `t<0.75` et `c<0.75`. Si Rapide paie un péage, exiger en plus `0.25 < péage/péage_R < 0.75` ; sinon `0.25<c<0.75`. Le milieu payant est classé par `max(t,c)+0.10*(t+c)+0.55*abs(ratio_péage-0.5)`. Vérifier dans le module les scores des autres cibles ; les ratios ne génèrent jamais de tarifs.
- Sans milieu qualifié : pas de badge « Recommandé », présenter « Proche d'Éco », « Proche du Rapide » ou « Autre variante », et un accès à la recherche. Une unique variante proche de Rapide reçoit le poids 12, pas 4 parce qu'elle se trouve en premier.
- Recherche supplémentaire bornée à 90 s : guide Rapide, recherches évitant des portions payantes, jusqu'à six raccordements locaux, nouveaux contournements et recherches entières pondérées si le temps le permet. Le parent d'une recherche locale est le guide de référence ou un descendant produit par découpe locale, pas un guide global issu de la recherche payante : le banc Pau→Valdurenque avait perdu le milieu à 9,10 € sans cette distinction.
- Trois cartes principales restent lisibles ; les choix Compromis se déplient sous leur carte. En arrière-plan, promouvoir un vrai Compromis nouvellement trouvé sans changer une sélection Éco/Rapide ni fermer le tiroir. Ne pas écraser un choix explicite. Rejeter les réponses obsolètes après nouveau trajet, préférences changées ou départ en navigation. Le choix et son intention sont persistés ; oublier les comparaisons de l'ancien départ après recalcul.

Ne pas implémenter un compromis par un faux « -50 % » appliqué au tarif. Si les seuls itinéraires découverts sont proches des deux extrêmes, il vaut mieux rendre le manque visible et continuer à chercher des sorties intermédiaires.

## 6. Cas concrets et préférences à préserver

| Cas ou fonction | Résultat attendu et raison |
|---|---|
| Pau, rue Ronsard → Biarritz | Tester distinctement Rapide autoroutier, un mélange et un Éco quand les candidats le permettent. Cas où un ancien calcul n'affichait qu'une route. Ne pas imposer un trio artificiel. Tester avec et sans péage séparément. |
| Pau ↔ Valdurenque, Gers/Tarn | Comparer dans les deux sens ; plusieurs chemins qui paraissent équivalents sur la carte diffèrent par péages et durée. C'est le banc principal de la .71 pour la récupération d'un milieu et l'effet gros axes. |
| A64 Tarbes Est → Tournay | Gratuité confirmée par l'utilisateur sur cette portion ; ne pas l'étendre par erreur à Tarbes Ouest. En comparant Pau→Valdurenque, vérifier le point exact d'entrée/sortie du tracé réellement pris. Une portion gratuite ne garantit pas que le chemin entier sera retenu : il peut perdre sur l'ensemble du trajet ou ne pas avoir été découvert. |
| Pau → Brive-la-Gaillarde | Préserver l'idée d'un vrai mix quand il existe. Cas de référence produit déjà jugé utile, pas un budget ou un temps à reproduire indépendamment des cartes/prix. |
| Petite route près d'Orthez | Gros axes activé : favoriser un axe de transit, tout en permettant l'accès aux adresses. Une départementale n'est pas forcément mal classée et la couleur sur le fond de carte ne fait pas foi. |
| Trafic visible en navigation | Jaune/rouge sous le tracé principal, mais couleur perceptible autour du bleu. Éviter de peindre toutes les rues jaunes pour de légers ralentissements. Réglage dans Paramètres, pas de bouton carte dédié. |
| Planificateur et tiroir | Le repli automatique après calcul laisse voir la carte ; poignée réellement interactive. Le panneau d'adresses ne doit pas masquer les petits raccourcis dont Mon bilan. |
| Navigation, carte et flèches | Mouvements libres de la carte ; recentrer via action explicite. Flèches blanches dessinées le long du tracé, lisibles sur la courbe et en dézoom, y compris en mode nuit. Ne pas confondre ces flèches, le pointeur GPS et l'icône de manœuvre du bandeau. |
| Angles de guidage | `nav-policy.js` : angle absolu <18° tout droit ; <45° léger ; <125° droite/gauche ; <165° franc ; sinon demi-tour. Angle natif si présent, sinon géométrie locale ; garder les catégories spécifiques de rond-point et bretelle. Le numéro de sortie est montré s'il est connu. |
| Vitesse | Vitesse GPS colorée si fix et correspondance routière fiables. Rouge seulement si v>limite+5 ; orange si v>conseil ou limite dépassée avec v≤limite+5 ; vert sinon. En Rapide le conseil = limite ; en Compromis, moyenne Éco/légale arrondie à 5 vers le bas et bornée. Ne pas présenter orange comme une autorisation de dépasser. Si la limitation manque ou est ambiguë, rester neutre. Le conseil de guidage et l'allure de simulation d'un Compromis sont deux choses distinctes. |
| Jour/nuit | Paramètre permanent jour, permanent nuit ou automatique avec lever/coucher astronomique (seuil solaire −0,833°) ; comportement tunnel à conserver. Tracé de nuit bleu clair/cyan, sans recharger tout le style à chaque changement. Vérifier contrastes et overlays en jour/nuit. |
| Zones radar | Zones larges avec pictogramme et limite connue si disponible ; repères sur le tracé et annonce « Zone radar » à l'approche. La base embarquée historique comptait 3 309 entrées publiques (déc. 2025). Ne pas convertir un centre de zone en coordonnées « exactes » du radar et ne pas prétendre exhaustivité. |
| Arrivée et bilan | Arrivée près de la fin du tracé, retour accueil après 2,2 s ; comptabiliser une seule fois l'économie estimée quand éligible. Une démo, un abandon ou un prix incomplet ne doivent pas générer de faux gain. Vérifier la garde de persistance dans `chrome.js` séparément du simple affichage « Arrivée » dans `app.js`. |

## 7. Compilation, cartes, signature et sécurité

Linux x86-64 ayant servi au build : JDK 17, Node/npm, Python 3, outils zip/unzip ; SDK Android plateforme 35 et Build Tools 35.0.0. Java est compilé en bytecode cible 11, l'application vise Android API 35 avec minimum API 28 (Android 9). Ne pas supposer qu'il existe une tâche Gradle : le script de référence est `build.sh`.

```bash
# À la racine du projet. Utiliser un chemin local choisi pour le SDK.
export HYPER_SDK="$PWD/.toolchain/android-sdk"
bash security/install-tools.sh
# Les tests JS ci-dessous peuvent être lancés sans clé et, pour la plupart, sans SDK.
# Build de distribution : exécuter seulement avec l'ancien certificat et la clé
# disponible localement dans le dossier attendu par le script.
bash build.sh
```

L'installateur récupère plateforme et Build Tools, contrôle les hashes prévus, et installe les dépendances Node verrouillées. Si les téléchargements échouent, traiter l'environnement ou installer les mêmes outils de façon vérifiée. `build.sh` fixe **lui-même** les options HARDENED/R8/clé. Réexécuter avec une variable mise à zéro ne suffit pas à faire un build de développement. Il refuse la release en l'absence des fichiers requis et n'en génère pas. Ne pas demander à Claude de modifier les protections pour réussir la première compilation. Si un APK jetable est indispensable sans clé, créer un **profil de développement séparé** avec identité et clé de test séparées ; c'est un travail à part, non fourni tel quel dans la sauvegarde. L'APK livré peut servir de référence installable.

Le build distribué transforme les assets JS propriétaires avec Terser 5.36.0 ; javascript-obfuscator 4.1.1 en profil sélectif pour `toll-cost.js`, `toll-rules.js`, `route-selector.js`. R8 en release pour Java ; garder les règles pour le bridge JS, la réflexion et le constructeur de modèle BRouter. AAPT2 produit les ressources, le script ajoute ensuite le jeu d'assets contrôlé une seule fois, aligne, signe et contrôle l'APK final. Ne pas réintroduire des assets à la fois via AAPT2 -A et via le packaging manuel. Ne pas lancer deux builds simultanément dans la même racine (staging et répertoires communs). Ne jamais éditer l'APK comme source.

Pour la .71 : **34 JS transformés** ; **203 ressources contrôlées par SHA-256**, 0 rejet au test d'intégrité final ; certificat Android historique RSA 3072 et signature v3 vérifiée. Manifest : pas de debug, pas de backup Android, pas de trafic HTTP clair ; WebView : debug coupé, accès fichier et contenu limité, contenu mixte désactivé. Contrôle du certificat et des assets au démarrage. Ce durcissement n'est pas une promesse d'inviolabilité. Un document de compilation historique ne prévaut pas sur le script actif.

Vérification de l'APK :

```bash
APK=output/Hypercruise-0.8.71-HARDENED.apk
"$HYPER_SDK/build-tools/35.0.0/apksigner" verify --verbose --print-certs "$APK"
"$HYPER_SDK/build-tools/35.0.0/aapt" dump badging "$APK"
python3 security/verify-integrity-apk.py "$APK"
```

Vérifier package `fr.hypercruise.app`, certificat, versionName/versionCode et contrôles verts. Pour une prochaine release issue de cette base, utiliser un code strictement supérieur (p. ex. **0.8.72/code 81** si aucune version intermédiaire n'a été distribuée). Aligner manifest, sortie de build, profil de release, versions affichées dans `index.html` et version de cache de planification dans `app.js` selon le changement. **Ne pas incrémenter `HC.VERSION=13` pour une simple retouche UI**. Le dossier natif `routing-policy-0868` contient les profils copiant les fichiers seulement s'ils sont absents. Si on change réellement les BRF, prévoir la migration/invalidation du cache des profils. Préserver les images, notamment `app/assets/mascot.png` et `app/res/drawable-nodpi-v4/mascot.png` ; un ancien emballage les avait perdues en excluant tous les PNG.

Les cartes RD5 sont distinctes du ZIP source et de l'APK. L'app les installe/importe via `MapStore`. Pour les bancs Sud-Ouest, obtenir les dalles `W5_N40.rd5` et `E0_N40.rd5` depuis `https://brouter.de/brouter/segments4/` ou réutiliser des copies locales vérifiées. Les versions de dalles et des grilles tarifaires influencent les résultats : conserver les dates ou hashes avec les résultats, comparer avant/après sur la même base, et ne pas casser les tests parce qu'une donnée externe a bougé. Pour le téléphone, donner priorité à l'installateur intégré et vérifier la présence des cartes avant de conclure que le moteur est lent ou cassé.

## 8. Vérifier une reprise, par ordre de difficulté

Exécuter depuis **la racine décompressée**, pas depuis le dossier parent. Plusieurs tests utilisent des fixtures sous `evidence/` et des chemins relatifs ; ne pas déplacer leurs fichiers isolément.

### 8.1 Tests JS rapides sans signature ni réseau

```bash
set -e
for test in compromise-missing-middle-0871 compromise-0871 \
            reroute-policy-0867 reroute-contract-0867 \
            main-axes-0868 extremiling-0869; do
  node "tests/${test}.cjs" app/assets
done
```

Pour vérifier aussi les scripts **réellement embarqués et transformés**, extraire l'APK de référence dans un dossier dédié avec `python3 security/extract-apk-assets.py "$APK" build/apk-assets-reference`, puis remplacer `app/assets` par `build/apk-assets-reference` dans cette boucle. Les tests unitaires ne requièrent ni la clé, ni un téléphone, ni les cartes RD5. Pour apparence/vitesse de cette génération, regarder `tests/appearance-speed-0865.cjs` ; les tests antérieurs à la lecture directionnelle des limitations n'ont pas tous les bons attendus.

Ces six suites ont été relancées avec succès sur les sources récupérées lors de la rédaction de cette passation. Les bancs UI, JVM et APK mentionnés ensuite sont les vérifications historiques de la livraison, pas des essais nouvellement relancés pour cette documentation.

### 8.2 Aperçu UI

Le banc `tests/compromise-browser-0871.cjs` exige un module Node Playwright résolvable et un Chromium utilisable. Installer ces dépendances dans un espace de dev si nécessaire ; la dépendance navigateur n'est pas le SDK Android. Puis lancer :

```bash
node tests/compromise-browser-0871.cjs app/assets
# Pour les assets de l'APK .71, avec BuildIntegrity.java correspondant :
CHECK_PINS=1 node tests/compromise-browser-0871.cjs build/apk-assets-reference
```

Si Playwright ne trouve pas le navigateur, installer son Chromium compatible ou donner le chemin d'un binaire fonctionnel via `HC_CHROME`. Les appels Android y sont simulés : ce test couvre l'UI en conditions contrôlées. Il a couvert les petites largeurs, le clavier, le jour/nuit, la persistance, la recherche en arrière-plan et l'arrêt des réponses obsolètes. Les montants injectés dans le scénario de capture ne sont pas des résultats de calcul routier.

À propos des fixtures : attendre une condition d'état ou de taille réelle plutôt qu'une animation de durée supposée. Dans un test de recalcul qui attend plusieurs secondes, rafraîchir l'heure de la position fictive pour ne pas déclencher le rejet normal d'un GPS ancien. Si un repère radar est caché sous un panneau, contrôler son occlusion sur la carte avant de diagnostiquer un problème de base de données.

### 8.3 Moteur JVM avec vraies cartes RD5

```bash
python3 tests/corridors-0849/build.py --maps-dir /chemin/absolu/vers/rd5
SIMULATE_SINGLE_FAILURE=1 node tests/native-missing-middle-0871.cjs
REVERSE=1 SIMULATE_SINGLE_FAILURE=1 node tests/native-missing-middle-0871.cjs
FORCE_AXES=1 SIMULATE_SINGLE_FAILURE=1 node tests/native-missing-middle-0871.cjs
# Facultatif : ASSETS_DIR=build/apk-assets-reference pour les JS de l'APK.
```

Le script Python prépare les classes JVM et les données sous `build/session-0849`. L'échec simulé concerne seulement les jobs supplémentaires **single / compromise** sur l'ensemble du trajet ; le guide Rapide, les contournements, les découpes locales et les rejeux tournent réellement. Le sens aller normal réemploie une fixture de comparaison initiale de la .70 ; le retour et gros axes reconstruisent leur comparaison initiale. Pour analyser le résultat, vérifier le code retour **et** le résumé PASS de chaque scénario. Faire les gros bancs un par un. Si une géométrie est restaurée depuis JSON, retirer ses caches internes sérialisés (clés préfixées par `_`) avant les calculs de recouvrement.

| Banc .71 sur les assets livrés | Résultat consigné |
|---|---|
| Pau → Valdurenque, référence à 15,50 € de péages | Milieu à 9,10 € de péages, total estimé 39,50 €, 13 661 s (3 h 47 min 41 s), 5 choix. |
| Valdurenque → Pau, référence à 15,50 € | Milieu à 7,80 €, total estimé 36,83 €, 14 406 s (4 h 00 min 06 s), 6 choix. |
| Pau → Valdurenque, gros axes forcés | Aucun milieu admissible sur ce banc, une variante conservée ; absence de faux « Équilibré » = résultat attendu. |

Ce sont des **résultats de banc historique**, pas des temps promis sur la route, ni des assertions à reprendre hors de la même date de tarifs/cartes. Les logs de référence portent un suffixe `-apk-0871.log`. Priorité à `missing-middle-apk-0871.log`, `compromise-apk-0871.log`, `browser-apk-0871.log`, `native-partial-apk-0871.log`, `native-reverse-partial-apk-0871.log`, `native-axes-partial-apk-0871.log`, `integrity-0871.log` et `signature-0871.log`. Les autres fichiers et essais historiques ne remplacent pas la dernière série validée. Lors de la livraison .71 : 15 contrôles du milieu manquant, 39 contrôles Compromis, 30 contrôles de politique de recalcul, 17 gros axes, 25 Extremiling, plus contrat de recalcul, navigateur, moteur JVM et vérifications APK.

### 8.4 Téléphone

Aucun essai sur téléphone physique n'a établi la validation de cette dernière livraison. Le dernier kilomètre doit être vérifié sur Android : installation/mise à jour avec l'APK et les bonnes cartes, lancement, calcul, GPS rapproché et déviations, retour au bon cap, caméra libre, changement jour/nuit, dépliants, voix, arrivée et crédit unique. Consigner version, sens du trajet, réglages, prix au litre, dalles, état du trafic et points réels d'entrée/sortie. « Le script a réussi » ne signifie pas « le GPS roule correctement sur le terrain ».

## 9. Dernier chantier ouvert : les icônes, pas encore intégrées

L'utilisateur a demandé une **planche d'essais dans le chat**, pour itérer visuellement avant d'implémenter. La V1 comportait 36 pictos. La V2 a réduit l'épaisseur et simplifié rond-point, radar et bilan ; elle distingue Extremiling d'Éco par une goutte. Les virages serrés **04 et 09** restaient peu convaincants : les redessiner en miroirs, avec une entrée qui part dans le même sens que les autres flèches, puis se replie clairement. **Aucune de ces planches n'est dans le code 0.8.71.** Si tu veux conserver le rendu exact de la V2, télécharger son image depuis le fil avant de perdre l'accès. La [planche V1](https://chatgpt.com/library?file_id=libfile_bd4bf20539e481919d0c3df1e2f9dde4&account_id=personal) est un repère, pas la V2.

- Garder le logo/mascotte principal intact et les couleurs existantes. Esprit sobre : même poids optique, arrondis réguliers, beaucoup moins de détails que du clipart, lisibilité à 24 px.
- Guidage : différencier « tout droit », léger, angle droit et virage serré sans dépendre du texte. Rond-point : un seul arc fléché, avec numéro au centre lisible. Sortie de voie rapide : branche visuellement distincte d'un virage ordinaire.
- Carte : flèche blanche intégrée à la courbure du trait, visible de jour et en nuit sur le cyan, sans longue queue maigre et tête détachée. Préserver la position, l'orientation, la profondeur des couches trafic et le comportement au dézoom.
- Quand le dessin est validé, produire des SVG cohérents plutôt que découper la planche PNG. Comparer en conditions réelles de taille et de contraste ; tester des cartes étroites et les thèmes. Modifier les chemins visuels du bandeau, des commandes ou de la carte selon leur module ; conserver leurs contrats et la classification des angles.

## 10. Dettes connues et façons de continuer

| Sujet | Point de reprise et critère utile |
|---|---|
| Recherche de candidats | Un itinéraire peu coûteux peut manquer parce que le score de découverte et le classement final diffèrent. Mesurer candidats explorés, rejoués, admissibles, doublons, et causes de rejet. Améliorer la diversité ou les points de sortie avant de toucher au rendement ou de relâcher les garde-fous. |
| Compromis sur trajet court | Une route locale peut être acceptable, une autre calculée mais dominée. Si nécessaire, montrer une vraie variante grise. Vérifier que « Recommandé » n'apparaît que pour le milieu qualifié. |
| Couverture péages/sections gratuites | Priorité : couverture vérifiable, avec organisme, grille, classe, date, sens, et preuves pour entrée/sortie. Une portion authentiquement gratuite et une portion inconnue doivent rester séparées. Distinguer les données du moteur et l'affichage. |
| Limitations de vitesse | Les tags directionnels et zones aident ; sources incomplètes, limitations conditionnelles et changements temporaires restent un risque. Tester les deux sens d'une même route et des transitions 80/90/110. Ne pas confondre une vitesse de simulation par défaut avec une limitation légalement établie. |
| GPS et recalcul | Sur des positions bruitées ou chaussées parallèles, enregistrer cap, vitesse, précision et durée avant le déclenchement ; utiliser des traces anonymisées de test. Contrôler que les options et le choix Compromis survivent au recalcul. |
| Estimation carburant | Calibrage à 75 km/h, modes sans mesure de réservoir, trafic partiel. Pour améliorer, mesurer les profils à plusieurs allures et sur terrains distincts ; isoler ce qui relève du rendement, des arrêts, de la pente et des tags. Ajouter un test avant de rebaptiser le modèle physique. |
| Lenteur | Séparer téléchargement de carte, ouverture du graphe, recherche/rejeu et appels trafic ; comparer temps de calcul indépendamment de l'ETA. Les timeouts sur long trajet ne justifient pas de revenir à un plafond sur la durée des chemins. |
| Design | Continuer les essais d'icônes avant l'intégration. Ne pas associer une refonte esthétique au changement d'un contrat moteur ou du format de stockage. |
| Port iOS | Évoqué mais non livré. Reprendre d'abord la .71 Android, puis isoler les fonctions spécifiques (WebView/bridge, GPS, voix, données locales, signature et publication). |

### Habitudes de maintenance

1. Partir d'un bug reproductible ou d'un comportement attendu clairement décrit. Faire un changement ciblé ; séparer données, recherche, simulation, classement et présentation.
2. Mettre à jour le test qui exerce l'erreur réelle, avec un cas négatif quand il est important (pas de milieu, coût inconnu, même tracé, GPS ancien). Ne pas ajuster les résultats de test pour masquer une régression.
3. Après le test source, faire un contrôle sur les assets embarqués quand une transformation JS ou R8 peut intervenir. Une release est validée par l'APK final, sa signature et ses contrôles, pas seulement par les sources.
4. Tenir une note courte par livraison avec la version, les réglages, les cas essayés, les résultats, le périmètre non vérifié et une sauvegarde sans clé. Conserver l'ancienne version pour comparer et dépanner.
5. Ne pas remplacer le moteur avec une simple API de distance/temps en prétendant conserver l'algorithme Éco. Une refonte est possible par module, avec l'ancienne version utilisée comme référence et un écart mesuré sur les mêmes trajets.

Le projet doit rester reprenable via **le ZIP source + ce document + les tests + la clé historique conservée séparément**. ChatGPT n'est nécessaire ni à l'ouverture du projet ni à sa maintenance.