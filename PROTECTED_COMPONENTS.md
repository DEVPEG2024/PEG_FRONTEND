# PEG -- Composants proteges

> NE PAS MODIFIER ces composants sans demande explicite de Nova.
> Reference : GLOSSARY.md
> Derniere validation : 2026-04-18

---

## Banniere admin (hero dashboard)

| Element                | Chemin                                                                                   | Lignes cles          |
|------------------------|------------------------------------------------------------------------------------------|----------------------|
| Composant principal    | `src/views/app/admin/home/DashboardAdmin.tsx`                                            | 285-532 (banner)     |
| Service API            | `src/services/AdminPreferenceService.ts`                                                 | 60-73 (upload)       |
| Types                  | `src/@types/banner.ts`                                                                   | Types Banner         |

**Stockage** : localStorage `peg:dashboardBanner` + Strapi `AdminPreference.bannerImage` (media)

---

## Notes du dashboard (Pense-bete / TodoListWidget)

| Element                | Chemin                                                                                   | Lignes cles          |
|------------------------|------------------------------------------------------------------------------------------|----------------------|
| Widget todo            | `src/views/app/admin/home/DashboardAdmin.tsx`                                            | 149-182 (widget)     |
| Service API            | `src/services/AdminPreferenceService.ts`                                                 | 6-57 (CRUD prefs)    |
| Schema Strapi          | `peg_strapi/src/api/admin-preference/content-types/admin-preference/schema.json`         | champ `todos` (JSON) |

**Stockage** : localStorage `peg:dashboardTodos` + Strapi `AdminPreference.todos` (JSON)

---

## Gestion des bannieres (module separe)

| Element                | Chemin                                                                                   |
|------------------------|------------------------------------------------------------------------------------------|
| Liste                  | `src/views/app/admin/banners/BannersList.tsx`                                            |
| Modal creation         | `src/views/app/admin/banners/modals/ModalNewBanner.tsx`                                  |
| Modal edition          | `src/views/app/admin/banners/modals/ModalEditBanner.tsx`                                 |
| Redux slice            | `src/views/app/admin/banners/store/bannerSlice.ts`                                       |

---

## Notes admin sur projets

| Element                | Chemin                                                                                   | Lignes cles          |
|------------------------|------------------------------------------------------------------------------------------|----------------------|
| Composant              | `src/views/app/common/projects/details/components/Summary.tsx`                           | 170-194, 362-425     |
| Type                   | `src/@types/project.ts`                                                                  | L34 (`adminNotes`)   |
| Service                | `src/services/ProjectServices.ts`                                                        | L124 (mutation)      |

---

## Widget layout dashboard

| Element                | Chemin                                                                                   | Lignes cles          |
|------------------------|------------------------------------------------------------------------------------------|----------------------|
| Definitions widgets    | `src/views/app/admin/home/DashboardAdmin.tsx`                                            | 218-265              |
| Ordre drag & drop      | `src/views/app/admin/home/DashboardAdmin.tsx`                                            | 416-483              |

**Stockage** : localStorage `peg:dashboardLayout` + `peg:dashboardHidden`

---

## Fichiers i18n

| Fichier                        | Role                          |
|--------------------------------|-------------------------------|
| `src/locales/lang/fr.json`     | Traductions francaises (UI)   |
| `src/locales/lang/en.json`     | Traductions anglaises (UI)    |
| `src/locales/locales.ts`       | Configuration i18next         |
