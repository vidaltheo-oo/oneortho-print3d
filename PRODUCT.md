# Product

## Register

product

## Users

- **Clients professionnels** (praticiens et ateliers du secteur orthopédique, international) : ils uploadent un fichier STL, obtiennent un chiffrage immédiat d'impression SLS PA2200, commandent et suivent leurs commandes. Contexte : au travail, entre deux tâches métier, souvent non francophones (i18n 6 langues : fr, en, de, es, it, nl). Le job : "obtenir un prix fiable et commander sans friction".
- **Équipe interne OneOrtho** (back-office `/admin`, français uniquement) : traiter devis, commandes, clients et fichiers STL. Job : passer en revue un volume de dossiers rapidement, sans erreur.

## Product Purpose

ONE PRINT est la plateforme de chiffrage et de commande d'impression 3D SLS de OneOrtho Medical. Projet **non réglementé** (hors périmètre dispositif médical, aucune donnée patient). Succès = un client passe de l'upload STL à la commande confirmée sans assistance, et l'équipe interne traite les commandes sans quitter l'outil.

## Brand Personality

Professionnel, chaleureux, précis. La marque OneOrtho s'exprime par le vert profond (#004b32) et le lime (#aae66e) sur fond crème : sérieux industriel sans froideur. Les titres en Sora bas-de-casse donnent un ton moderne et accessible ; le contenu (prix, volumes, délais) reste factuel et dense là où il le faut.

## Anti-references

- Le SaaS générique sombre à glows néon : l'outil est utilisé en journée, en environnement de travail.
- Le catalogue e-commerce grand public : pas de promotions criardes, pas d'urgence artificielle.
- Le prototype "démo tech 3D" : le viewer three.js sert le chiffrage, il n'est pas une vitrine.
- Tout vocabulaire visuel qui divergerait entre configurateur, espace client et admin : les trois briques partagent les mêmes tokens (`app/globals.css`).

## Design Principles

1. **L'outil s'efface devant la tâche** : chiffrer, commander, traiter. Aucune décoration qui ne véhicule pas un état ou une information.
2. **Un seul vocabulaire visuel** pour les trois briques (configurateur iframe, espace client Next, admin) : mêmes tokens, mêmes formes de boutons, mêmes cartes.
3. **La confiance passe par la précision** : chiffres lisibles, états complets (chargement, vide, erreur, succès), jamais d'ambiguïté sur le statut d'une commande.
4. **International par défaut** côté client : tout texte visible passe par l'i18n ; l'admin reste français (outil interne).
5. **Dense où il faut, calme partout ailleurs** : tables admin denses, parcours client aéré.

## Accessibility & Inclusion

- Cible WCAG 2.1 AA : contraste texte ≥ 4.5:1 (≥ 3:1 pour les grands corps), focus visible sur tout élément interactif.
- `prefers-reduced-motion` respecté pour toute animation.
- Public professionnel international : libellés simples, pas d'idiomes, unités métriques.
