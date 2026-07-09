---
name: ONE PRINT
description: Plateforme de chiffrage et commande d'impression 3D SLS de OneOrtho Medical
colors:
  green-deep: "#004b32"
  green-hover: "#00603f"
  lime: "#aae66e"
  orange: "#ff6c4f"
  cream-bg: "#f5f2e8"
  surface: "#fcfbf7"
  white: "#ffffff"
  border: "#e2ded2"
  border-soft: "#f0ece0"
  ink: "#1c1c1a"
  muted: "#8a8478"
typography:
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  input: "10px"
  panel: "16px"
  card: "18px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  xl: "30px"
components:
  button-primary:
    backgroundColor: "{colors.green-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  pill-toggle:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  pill-toggle-active:
    backgroundColor: "{colors.green-deep}"
    textColor: "{colors.white}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "28px"
---

# Design System: ONE PRINT

## 1. Overview

**Creative North Star: "L'atelier de précision"**

ONE PRINT emprunte au monde de l'atelier industriel maîtrisé : un fond crème calme (le papier technique), un vert profond qui porte l'identité OneOrtho, un lime qui signale l'action et l'état actif. Le système sert trois briques (configurateur, espace client, back-office admin) avec un seul vocabulaire : mêmes tokens (`app/globals.css`), mêmes pilules, mêmes cartes blanches à ombre douce teintée de vert.

Le système rejette le SaaS sombre à glows néon, la décoration gratuite et toute divergence visuelle entre les briques. La densité est une permission de l'admin (tables, KPI), pas du parcours client, qui reste aéré et rassurant.

**Key Characteristics:**
- Fond crème + surfaces blanches, profondeur par ombres douces teintées vert
- Vert profond = identité et actions primaires ; lime = état actif et accents ; orange = liens de bascule et alertes commerciales
- Titres Sora (700-800, souvent bas-de-casse), corps DM Sans 13-14px
- Pilules pour boutons et toggles, cartes 16-18px, inputs 10px

## 2. Colors

Palette resserrée : deux verts, un lime, un orange, et une gamme de neutres chauds.

### Primary
- **Vert OneOrtho** (#004b32) : boutons primaires, sidebar admin, titres d'écran client, pilule sélectionnée. C'est la couleur d'identité, jamais diluée en décoration.
- **Vert survol** (#00603f) : unique état hover des surfaces vertes.

### Secondary
- **Lime** (#aae66e) : état actif (nav admin), pastilles de section, avatar. Signal, jamais fond de lecture.

### Tertiary
- **Orange** (#ff6c4f) : liens de bascule (connexion ↔ inscription), tags commerciaux, accent du logo.

### Neutral
- **Crème** (#f5f2e8) : fond de page des trois briques.
- **Surface** (#fcfbf7) : fond des inputs.
- **Blanc** (#ffffff) : cartes et panneaux.
- **Bordure** (#e2ded2) et **bordure douce** (#f0ece0) : contours d'inputs, séparateurs de sections.
- **Encre** (#1c1c1a) : texte courant.
- **Sourdine** (#8a8478) : libellés secondaires. Réservé aux textes non essentiels ; jamais pour un paragraphe de contenu.

### Named Rules
**The One Green Rule.** Le vert #004b32 est la seule couleur autorisée pour une action primaire. Un écran n'a qu'une action primaire visible à la fois.
**The Lime-Is-A-State Rule.** Le lime signale un état (actif, sélectionné, validé), jamais une surface décorative.

## 3. Typography

**Display Font:** Sora (via next/font, fallback system-ui)
**Body Font:** DM Sans (via next/font, fallback system-ui)

**Character:** Sora géométrique et affirmée pour les titres (souvent en bas-de-casse dans l'admin : ton moderne, non cérémonieux) ; DM Sans neutre et lisible pour le contenu et les données.

### Hierarchy
- **Headline** (Sora 800, 28px) : titre d'écran client (connexion, inscription, compte).
- **Title** (Sora 700, 22-23px) : titres de cartes et de pages admin (bas-de-casse, letter-spacing -0.5px).
- **Body** (DM Sans 400-600, 13-14px) : contenu, formulaires, tables.
- **Label** (Sora 600, 11px, uppercase, tracking 0.08em) : libellés de champs et de sections.

### Named Rules
**The Lowercase Title Rule.** Les titres de pages admin sont en bas-de-casse ; c'est une signature, pas une négligence.

## 4. Elevation

Profondeur discrète et systématiquement teintée de la marque : les ombres portent du vert (rgba(0,75,50,…)), jamais du noir pur au-delà de 6 % d'opacité. Les surfaces sont plates au repos ; l'ombre distingue la carte du fond crème, elle ne "soulève" pas.

### Shadow Vocabulary
- **Carte client** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,75,50,0.06)`) : cartes de formulaire et de contenu.
- **Carte KPI admin** (`box-shadow: 0 1px 2px rgba(0,75,50,0.04), 0 16px 30px -24px rgba(0,75,50,0.4)`) : indicateurs du dashboard.

### Named Rules
**The Green Shadow Rule.** Toute ombre visible est teintée du vert de marque. Une ombre grise neutre est un corps étranger.

## 5. Components

### Buttons
- **Shape:** pilule complète (99px)
- **Primary:** fond vert #004b32, texte blanc, Sora 700 14.5px, padding 14px
- **Hover / Focus:** fond #00603f ; focus visible obligatoire
- **Disabled:** opacité 0.6, curseur progress

### Chips
- **Style:** pilule blanche, bordure 1.5px #e2ded2, DM Sans 600 13px
- **State:** sélectionnée = fond et bordure verts, texte blanc

### Cards / Containers
- **Corner Style:** 18px (cartes client), 16px (panneaux et KPI admin)
- **Background:** blanc sur fond crème
- **Shadow Strategy:** ombres vertes douces (cf. Elevation)
- **Border:** 1px rgba(0,75,50,0.08) côté admin
- **Internal Padding:** 20-32px

### Inputs / Fields
- **Style:** fond #fcfbf7, bordure 1.5px #e2ded2, radius 10px, DM Sans 14px
- **Focus:** bordure verte #004b32
- **Error / Success:** bandeaux #fdeaea/#c62828 et #e8f5e9/vert

### Navigation
- **Admin :** sidebar verte sticky 108px, boutons verticaux icône+libellé 11px, état actif lime sur vert ; header sticky crème translucide (blur 10px).
- **Client :** header d'espace partagé (`components/EspaceHeader`), liens sobres, actif en vert.

### Signature Component
**Carte KPI dashboard** : valeur Sora 700 32px, libellé 13px, variante inversée fond vert. Accent discret intégré à la bordure, pas de bandeau latéral épais.

## 6. Do's and Don'ts

### Do:
- **Do** utiliser les tokens de `app/globals.css` pour toute nouvelle surface ; les trois briques partagent le même vocabulaire.
- **Do** donner à chaque composant interactif ses états complets : hover, focus visible, disabled, loading, erreur.
- **Do** garder le texte courant en encre #1c1c1a ; la sourdine #8a8478 est réservée aux libellés secondaires courts.
- **Do** teinter toute ombre avec le vert de marque.

### Don't:
- **Don't** introduire de dark mode à glows néon ni de glassmorphism décoratif : anti-référence explicite de PRODUCT.md ("SaaS générique sombre à glows").
- **Don't** utiliser `border-left` > 1px comme bandeau d'accent sur une carte ou une alerte.
- **Don't** animer width/height/padding ; transform et opacity uniquement, avec alternative `prefers-reduced-motion`.
- **Don't** créer un deuxième style de bouton primaire : une action primaire = pilule verte, partout.
- **Don't** mettre du lime en fond de texte long ni en surface décorative.
