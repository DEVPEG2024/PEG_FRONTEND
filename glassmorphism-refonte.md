# 🎨 Refonte Visuelle PEG — Style Glassmorphism Dark

> Lis ce fichier AVANT toute modification visuelle. Il définit le design system complet à appliquer sur toute l'interface PEG.

---

## 📋 Méthode d'application

1. Lire toute la structure du projet avant de modifier quoi que ce soit
2. Fichiers à lire en priorité :
   - `src/configs/theme.config.ts`
   - `tailwind.config.js` ou `tailwind.config.ts`
   - `src/index.css` ou `src/styles/`
   - Layout principal dans `src/components/template/` ou `src/views/layouts/`
3. Créer/modifier le CSS global avec les variables custom
4. Modifier `tailwind.config` pour les couleurs custom
5. Appliquer sur les composants partagés dans `src/components/` en priorité
6. **Ne jamais toucher** à la logique métier, Redux, services ou types TypeScript
7. Committer par étape : d'abord le global (fond + variables), ensuite les composants

---

## 🌌 1. Fond Global

```css
background: linear-gradient(135deg, #0a0a2e 0%, #1a0a4e 100%);
```

Ajouter 2-3 halos lumineux fixes en arrière-plan :

```css
.halo {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}
.halo-1 { width: 600px; height: 600px; background: #3b82f6; top: -100px; left: -100px; }
.halo-2 { width: 500px; height: 500px; background: #8b5cf6; bottom: -100px; right: -100px; }
.halo-3 { width: 400px; height: 400px; background: #6366f1; top: 40%; left: 40%; }
```

---

## 🗂️ 2. Sidebar

| Propriété | Valeur |
|-----------|--------|
| Fond | `rgba(255,255,255,0.03)` |
| Backdrop | `backdrop-filter: blur(20px)` |
| Bordure droite | `1px solid rgba(255,255,255,0.08)` |
| Item actif fond | `rgba(139,92,246,0.2)` |
| Item actif bordure | `3px solid #8b5cf6` (côté gauche) |
| Icônes | `opacity: 0.6` par défaut, `1.0` si actif |
| Hover | `rgba(255,255,255,0.05)` avec transition `200ms` |

---

## 🃏 3. Cartes & Panels

Applicable à : `AdaptableCard`, panels, modales, conteneurs.

```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

---

## 📊 4. KPI Cards (Dashboard)

- Chiffres clés : blanc pur `#ffffff`, taille `2rem+`
- Tendance positive : `#10b981` (vert)
- Tendance négative : `#ef4444` (rouge)
- Icône : cercle semi-transparent `rgba(couleur, 0.2)` en haut à droite

---

## 📈 5. Graphiques

| Élément | Style |
|---------|-------|
| Fond | Transparent |
| Courbes | Dégradé `#3b82f6 → #8b5cf6`, aire remplie dégradé transparent |
| Barres | Dégradé `#6366f1 → #8b5cf6` |
| Texte axes | `rgba(255,255,255,0.5)` |
| Grille | `rgba(255,255,255,0.05)` |
| Tooltip | Glassmorphism (`rgba(255,255,255,0.1)` + blur) |

---

## 📋 6. Tableaux

| Élément | Style |
|---------|-------|
| En-tête | `rgba(255,255,255,0.05)`, texte `rgba(255,255,255,0.7)` |
| Lignes paires | `rgba(255,255,255,0.02)` |
| Hover ligne | `rgba(255,255,255,0.05)` + transition `150ms` |
| Bordures | `rgba(255,255,255,0.06)` |

---

## 🔘 7. Boutons

```css
/* Primaire */
background: linear-gradient(135deg, #6366f1, #8b5cf6);
border-radius: 8px;
box-shadow: 0 0 20px rgba(139,92,246,0.3); /* au hover */

/* Secondaire */
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.15);

/* Danger */
background: rgba(239,68,68,0.2);
border: 1px solid rgba(239,68,68,0.5);
```

---

## ✏️ 8. Inputs & Formulaires

```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 8px;
color: #ffffff;

/* Focus */
border-color: rgba(139,92,246,0.6);
box-shadow: 0 0 0 3px rgba(139,92,246,0.15);

/* Placeholder */
color: rgba(255,255,255,0.4);
```

---

## 🏷️ 9. Badges & Statuts

```css
border-radius: 999px;
padding: 2px 10px;
font-size: 0.75rem;
font-weight: 600;

/* En cours */   background: rgba(59,130,246,0.2);  color: #93c5fd;
/* Terminé */    background: rgba(16,185,129,0.2);  color: #6ee7b7;
/* En attente */ background: rgba(245,158,11,0.2);  color: #fcd34d;
/* Annulé */     background: rgba(239,68,68,0.2);   color: #fca5a5;
```

---

## 🔝 10. Navbar / Header

```css
background: rgba(10,10,46,0.8);
backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(255,255,255,0.08);
```

Barre de recherche : même style glassmorphism que les inputs.

---

## 🎨 Variables CSS à définir dans `index.css`

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(20px);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  --color-primary: #6366f1;
  --color-primary-light: #8b5cf6;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;

  --bg-base: #0a0a2e;
  --bg-elevated: rgba(255,255,255,0.05);
  --text-primary: #ffffff;
  --text-secondary: rgba(255,255,255,0.6);
  --text-muted: rgba(255,255,255,0.4);
  --border-subtle: rgba(255,255,255,0.08);
}
```

---

## ⚠️ Règles à ne jamais enfreindre

- Ne pas toucher aux fichiers `services/`, `store/`, `@types/`, ni aux appels API
- Ne pas modifier les routes ni la logique d'authentification
- Tester visuellement sur l'env intégration (`int.mypeg.fr`) avant de pusher sur `main`
- Si un composant tiers (ex: recharts, react-select) ne supporte pas le style, wrapper avec une div glassmorphism plutôt que de forker le composant
