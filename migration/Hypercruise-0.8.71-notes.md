# Hypercruise 0.8.71 HARDENED

27 octobre 2026 · versionCode 80 · paquet fr.hypercruise.app.

## Correction du cas signalé

La 0.8.70 pouvait appeler « Équilibré » le meilleur des quelques candidats disponibles, même si le groupe ne contenait qu’un itinéraire presque Éco et un autre presque Rapide. L’affichage de 1,70 € de péages et +68 minutes comme recommandé, sous un texte visant la moitié des péages, était donc trompeur.

La 0.8.71 n’attribue plus automatiquement ce nom et cette recommandation au meilleur résultat disponible. Le profil doit réellement occuper une position intermédiaire : coût connu, péages proches du milieu lorsque la référence est payante et durée suffisamment éloignée de l’extrême Éco. Les autres chemins restent sélectionnables comme variantes « Proche d’Éco », « Proche du Rapide » ou « Autre variante », avec leurs montants et durées calculés.

Si aucun véritable milieu n’a été trouvé, l’application le dit explicitement. Elle n’affiche ni ligne Équilibré ni badge Recommandé pour masquer ce manque. La carte principale correspondante reste une variante et une commande permet de chercher un compromis. Il n’y a pas de nouveau plafond de durée du voyage : cette distinction sert à nommer les profils, et ne supprime pas les variantes utiles.

## Recherche des mélanges

La recherche supplémentaire de la 0.8.70 reposait surtout sur des recherches globales avec différentes pondérations. Lorsque ces calculs ne trouvaient que les deux extrêmes ou dépassaient leurs délais, elle pouvait manquer les mélanges pourtant découverts lors d’un calcul initial plus complet.

La nouvelle recherche établit un guide rapide, essaie des alternatives entre échangeurs et des détours partiels autour de portions payantes, tout en gardant le reste du trajet. Elle complète ensuite ces essais par les autres pondérations. Chaque nouveau tracé est vérifié et réévalué physiquement sur sa géométrie complète avant de pouvoir être proposé. Les points d’évitement servent uniquement à explorer des solutions ; ils ne deviennent pas des routes déclarées fermées ou des exclusions permanentes de navigation.

La recherche à la demande est bornée à environ 90 secondes. Le départ reste possible avant sa fin. Les candidats inconnus, incomplets, fermés, interdits par les préférences, identiques ou dominés ne sont pas utilisés comme un compromis certifié. Les restrictions sans autoroute, sans péage et gros axes restent prioritaires.

Une découverte d’Équilibré peut remplacer une carte de variante non sélectionnée, sans changer le trajet actuellement choisi et sans fermer le dépliant. Le recalcul conserve l’objectif du profil sélectionné. Une variante proche du Rapide conserve ainsi un objectif de navigation rapide ; elle ne reçoit pas arbitrairement le profil économique parce qu’elle est la seule disponible.

## Vérifications

- 15 contrôles supplémentaires reproduisent les chiffres des captures : lignes à 0,50 €, 1,70 € et 13,80 €, durées proches d’Éco/Rapide, absence de fausse recommandation, ajout d’un vrai milieu, durée presque Éco malgré des péages exactement divisés par deux et conservation de l’objectif rapide pour une variante proche du Rapide.
- Les 39 contrôles précédents sur les compromis, les préférences et les recalculs, ainsi que les régressions Extremiling/gros axes et le contrat de recalcul, passent.
- Interface vérifiée avec le JavaScript transformé extrait de l’APK, intégrité active : choix, dépliage, sauvegarde, restauration, variantes, annulation des résultats obsolètes et scénario des captures. Le test confirme qu’un vrai milieu apparaît sans sélectionner automatiquement ce nouveau trajet. Les réponses natives de ces tests d’interface sont simulées ; les calculs routiers sont testés séparément.
- Calculs natifs : départ d’un groupe volontairement privé de ses vrais intermédiaires. Les recherches globales pondérées sont ensuite simulées en échec, tandis que les recherches rapides, détours et réévaluations utilisent le moteur natif réel et les cartes vérifiées. Le but est de vérifier la récupération d’un mélange malgré un groupe initial incomplet, pas de prétendre reproduire le téléphone et son état exact.
- Pau → Valdurenque et Valdurenque → Pau sont testés. Un résultat réel du moteur dans le sens Valdurenque → Pau trouve 7,80 € de péages face aux 15,50 € de la référence, pour environ 4 h 00. Les métriques détaillées et journaux sont inclus dans les sources.
- Avec gros axes prioritaires et cette simulation de recherches manquantes, il peut ne rester aucun milieu admissible. Le test vérifie alors l’absence de recommandation inventée et le respect des contraintes, plutôt que de forcer un résultat à moitié prix.
- Signature historique, manifeste et contrôle Android des 203 ressources vérifiés. Les profils natifs, le modèle physique, les règles de vitesse et la préférence gros axes sont inchangés.

## Limites

Pas d’essai sur téléphone physique. Les montants, consommations et durées sont des estimations du modèle et des tarifs intégrés, pour le véhicule et le carburant utilisés dans les tests. Les résultats ne garantissent pas l’optimum global ni un nombre fixe de variantes. La carte, le trafic et les tarifs ne garantissent pas une couverture exhaustive en France.

Le cache des anciens résultats est renouvelé pour éviter de restaurer les anciennes recommandations. Les données de véhicule, les préférences, les cartes et le bilan ne sont pas réinitialisés.

R8, transformation des 34 scripts propriétaires, certificat épinglé, contrôle SHA-256 des ressources et protections WebView existantes conservés. Aucune clé privée dans l’APK ou dans les sources distribuées. Ces protections ne rendent pas la rétro-ingénierie impossible.