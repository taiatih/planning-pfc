# PFC Planning Manager - Concepts de Design

## Contexte
Application de planification interne pour un commerce de détail alimentaire. Utilisateur unique : le manager. Outil professionnel, usage quotidien, doit être rapide et lisible.

---

<response>
<text>
## Approche 1 : "Terrain Pro" — Brutalisme Fonctionnel

**Design Movement**: Brutalisme digital adapté aux outils métier — honnêteté structurelle, pas d'ornement superflu.

**Core Principles**:
- Lisibilité maximale : chaque information visible d'un coup d'œil
- Densité contrôlée : beaucoup d'info sans surcharge visuelle
- Hiérarchie typographique forte et assumée
- Couleurs fonctionnelles uniquement (statuts, alertes, postes)

**Color Philosophy**:
- Fond : blanc cassé #F8F7F4 (papier, terrain)
- Primaire : bleu marine #1B2B4B (autorité, clarté)
- Accents : vert #2D6A4F (OK), orange #E07B39 (alerte), rouge #C0392B (KO)
- Postes : vert clair F&L, vert SEC, bleu FRAIS, jaune CAISSE

**Layout Paradigm**:
- Sidebar gauche fixe avec navigation verticale
- Zone centrale = tableau de planning full-width
- Pas de padding excessif, colonnes serrées mais lisibles

**Signature Elements**:
- Cellules de planning avec coins carrés et bordures nettes
- Badges de statut (BROUILLON/PUBLIÉ/AVENANT) en typographie monospace
- En-têtes de colonnes en majuscules, police condensée

**Interaction Philosophy**:
- Clic direct sur cellule = sélecteur de brique
- Pas de modales inutiles, tout inline
- Feedback immédiat : couleur change instantanément

**Animation**:
- Transitions 100ms max, pas d'animation décorative
- Highlight de ligne au survol
- Slide-in du panneau de sélection de brique

**Typography System**:
- Titres : IBM Plex Sans Condensed Bold
- Corps : IBM Plex Sans Regular
- Données : IBM Plex Mono (heures, codes)
</text>
<probability>0.08</probability>
</response>

<response>
<text>
## Approche 2 : "Dashboard Retail" — Material Design Épuré

**Design Movement**: Material Design 3 adapté aux outils de gestion — cartes, ombres douces, couleurs sémantiques.

**Core Principles**:
- Cards pour chaque section (semaine, employé, indicateur)
- Couleurs sémantiques cohérentes pour tous les postes
- Navigation par onglets horizontaux
- Responsive et accessible

**Color Philosophy**:
- Fond : #FAFAFA gris très clair
- Primaire : #1565C0 bleu profond
- Surface : blanc pur pour les cards
- Statuts : vert/orange/rouge Material

**Layout Paradigm**:
- Top navigation + sidebar collapsible
- Grid de cards pour le dashboard
- Tableau scrollable horizontalement pour le planning

**Signature Elements**:
- Cards avec ombre portée douce
- Chips colorés pour les briques horaires
- Progress bars pour la conformité des contrats

**Interaction Philosophy**:
- Ripple effect sur les boutons
- Tooltips informatifs au survol
- Drawer latéral pour l'édition

**Animation**:
- Fade-in des cards au chargement
- Ripple Material sur les interactions
- Smooth scroll entre les semaines

**Typography System**:
- Titres : Roboto Bold
- Corps : Roboto Regular
- Données : Roboto Mono
</text>
<probability>0.06</probability>
</response>

<response>
<text>
## Approche 3 : "Ops Center" — Dark Mode Professionnel

**Design Movement**: Interface de contrôle opérationnel — sombre, dense, haute lisibilité pour usage intensif.

**Core Principles**:
- Dark mode natif pour réduire la fatigue visuelle
- Couleurs lumineuses sur fond sombre pour les statuts
- Densité maximale de l'information
- Accent sur les alertes et anomalies

**Color Philosophy**:
- Fond : #0F1117 quasi-noir
- Surface : #1A1D27 gris très sombre
- Primaire : #4F8EF7 bleu électrique
- Postes : couleurs vives sur fond sombre
- Alertes : rouge/orange saturés

**Layout Paradigm**:
- Sidebar gauche dark avec icônes
- Header avec KPIs toujours visibles
- Tableau de planning avec lignes alternées sombres

**Signature Elements**:
- Badges lumineux pour les statuts
- Indicateurs de couverture en temps réel
- Timeline horizontale des 3 semaines

**Interaction Philosophy**:
- Hover avec glow effect sur les cellules
- Sélection multiple de cellules
- Raccourcis clavier pour les briques fréquentes

**Animation**:
- Glow pulse sur les alertes
- Slide des panneaux latéraux
- Counter animation pour les KPIs

**Typography System**:
- Titres : Space Grotesk Bold
- Corps : Inter Regular
- Données : JetBrains Mono
</text>
<probability>0.09</probability>
</response>

---

## Choix retenu : Approche 1 — "Terrain Pro"

**Raison** : Pour un outil métier utilisé quotidiennement par un manager de terrain, la lisibilité et la rapidité d'exécution priment. Le brutalisme fonctionnel avec IBM Plex offre une densité d'information optimale sans sacrifier la clarté. Les couleurs fonctionnelles pour les postes (F&L, SEC, FRAIS, CAISSE) permettent une lecture instantanée du planning.
