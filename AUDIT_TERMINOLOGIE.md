# PEG -- Audit terminologique

> Date : 2026-04-18
> Auteur : Nova (audit automatise)
> AUCUNE CORRECTION APPLIQUEE -- Nova valide ligne par ligne avant correction.
> Reference : GLOSSARY.md

---

## Legende

- **OK** : terme conforme au glossaire
- **SUSPECT** : terme potentiellement incorrect ou inconsistant
- **MANQUANT** : cle i18n absente (fallback sur titre hardcode)
- **HARDCODE** : texte FR directement dans le JSX (pas via i18n `t()`)

---

## 1. Termes suspects ou inconsistants

### 1.1 "Fournisseur" vs "Producteur"

Le glossaire definit **"Producteur"** comme terme officiel. Or **"Fournisseur"** est utilise dans le module depenses (ou il designe un fournisseur materiel, pas un producteur PEG). A valider si c'est intentionnel.

| Fichier | Ligne | Terme trouve | Contexte | Statut |
|---------|-------|--------------|----------|--------|
| `src/configs/navigation.config/admin.ts` | 267 | `// --- Fournisseurs ---` | Commentaire section nav | SUSPECT |
| `src/configs/navigation.config/admin.ts` | 280 | `title: "Fournisseurs"` | Titre nav Imbretex | SUSPECT -- voir si "Fournisseurs" est volontaire (Imbretex = fournisseur externe, pas producteur PEG) |
| `src/views/app/admin/expenses/ExpensesList.tsx` | 38 | `label: 'Fournisseur'` | Type de depense | OK si intentionnel (depense fournisseur materiel) |
| `src/views/app/admin/expenses/ModalEditExpense.tsx` | 11 | `label: 'Fournisseur materiel'` | Select type depense | OK si intentionnel |
| `src/views/app/admin/expenses/ModalEditExpense.tsx` | 189 | `Fournisseur` | Label formulaire | OK si intentionnel |
| `src/views/app/admin/imbretex/ImbretexCatalog.tsx` | 565 | `Fournisseur` | Label UI | OK (Imbretex est un fournisseur externe) |
| `src/views/app/common/projects/details/components/ProjectExpenses.tsx` | 17 | `label: 'Fournisseur'` | Type depense projet | OK si intentionnel |
| `src/@types/expense.ts` | 2 | `'supplier' // Fournisseur materiel` | Type TS | OK (commentaire) |

**Decision requise Nova** : "Fournisseur" dans le contexte depenses/Imbretex est-il un terme distinct de "Producteur", ou faut-il uniformiser ?

---

### 1.2 "Boutique" vs "Magasin" vs "Catalogue"

Le glossaire definit : **Catalogue** = vitrine produits client, **Magasin** = point de vente physique. Or **"Boutique"** est utilise pour le module e-commerce admin.

| Fichier | Ligne | Terme trouve | Contexte | Statut |
|---------|-------|--------------|----------|--------|
| `src/locales/lang/fr.json` | 12 | `"store": "Boutique"` | Traduction nav.store | SUSPECT -- glossaire dit "Magasin" pour store |
| `src/configs/navigation.config/admin.ts` | 139 | `// --- Boutique ---` | Commentaire section | SUSPECT |
| `src/configs/navigation.config/admin.ts` | 152 | `title: "Boutique"` | Titre nav | SUSPECT |
| `src/views/app/admin/orders/OrderItemsList.tsx` | 201 | `Boutique` | Label section | SUSPECT |
| `src/views/app/admin/promoCodes/PromoCodesList.tsx` | 153 | `Boutique` | Label UI | SUSPECT |

**Decision requise Nova** : Le module e-commerce admin doit-il s'appeler "Boutique" ou "Magasin" ? Le glossaire actuel dit "Magasin" = point de vente physique. Si la boutique en ligne est un concept different, il faudrait l'ajouter au glossaire.

---

### 1.3 "catalogue" vs "catalog" (orthographe inconsistante)

| Fichier | Ligne | Terme trouve | Contexte | Statut |
|---------|-------|--------------|----------|--------|
| `src/@types/product.ts` | 32 | `inCatalogue` | Champ type TS | FR spelling |
| `src/@types/product.ts` | 37 | `catalogPrice` | Champ type TS | EN spelling |
| `src/@types/customer.ts` | 33 | `catalogAccess` | Champ type TS | EN spelling |
| `src/utils/productHelpers.ts` | 94 | `getCatalogSavingsPercent` | Nom fonction | EN spelling |
| `src/services/ProductServices.ts` | 74 | `inCatalogue` | Champ GraphQL | FR spelling |
| `src/views/app/customer/catalogue/store/catalogueSlice.ts` | 18 | `SLICE_NAME = 'catalogue'` | Redux slice | FR spelling |

**Decision requise Nova** : uniformiser en `catalogue` (FR) ou `catalog` (EN) dans le code ? L'UI est en FR, mais les conventions de code sont generalement en EN.

---

## 2. Cles i18n manquantes

Ces entrees de navigation ont un `translateKey` mais la cle correspondante n'existe pas dans `fr.json` ni `en.json`. Le titre hardcode est affiche a la place.

| Fichier navigation | translateKey | Titre fallback | Action suggeree |
|-------------------|-------------|----------------|-----------------|
| `admin.ts` L43 | `nav.leads` | "Leads" | Ajouter `"leads": "Leads"` dans fr.json nav |
| `customer.ts` L43 | `nav.catalogue` | "Catalogue" | Ajouter `"catalogue": "Catalogue"` dans fr.json nav |
| `admin.ts` L280 | `nav.suppliers` | "Fournisseurs" | Ajouter si necessaire |

---

## 3. Textes FR hardcodes (hors i18n)

Ces textes sont directement dans le JSX sans passer par `t()`. Ce n'est pas forcement un bug (l'app est principalement FR), mais c'est a noter pour la coherence.

### 3.1 Dashboard admin (`DashboardAdmin.tsx`)

| Ligne | Texte hardcode |
|-------|---------------|
| 181 | `Pense-bete` |
| 239 | `Chiffre d'affaires` |
| 240 | `Tickets` |
| 241 | `Pipeline` |
| 242 | `Commandes` |
| 243 | `Pense-bete` |
| 244 | `Calendrier` |
| 245 | `Alertes` |
| 246 | `Echeances` |
| 247 | `Top clients` |
| 248 | `Top producteurs` |
| 249 | `Activite recente` |
| 250 | `Ventes add.` |
| 418 | `Bonjour` / `Bon apres-midi` / `Bonsoir` |
| 499 | `facture(s) en retard`, `projet(s) a risque`, `ticket(s) ouvert(s)` |
| 504 | `Ventes additionnelles` |
| 536 | `Finances`, `Suivi du chiffre d'affaires` |
| 558 | `Ventes add.` |

### 3.2 Onglets projet (`utils.ts` + `ProjectDetails.tsx` + `QuickFilterTab.tsx`)

| Fichier | Termes hardcodes |
|---------|-----------------|
| `details/utils.ts` L2-12 | `Accueil`, `Commentaires`, `Fichiers`, `Fichiers client`, `Checklist`, `BAT`, `Devis`, `Factures`, `Depenses`, `Ventes add.`, `SAV` |
| `ProjectDetails.tsx` L100-119 | Memes termes en comparaison `selectedTab ===` |
| `QuickFilterTab.tsx` L25-47 | Memes termes en conditions d'affichage |

### 3.3 Statuts projet (`constants.ts`)

| Ligne | Terme hardcode |
|-------|---------------|
| 26 | `En cours` (pending) |
| 27 | `Termine` (fulfilled) |
| 28 | `En attente` (waiting) |
| 29 | `Annule` (canceled) |
| 30 | `SAV` |
| 31 | `Termine impaye` (unpaid) |

### 3.4 Ventes additionnelles (`AdditionalSales.tsx`)

| Ligne | Terme hardcode | Note |
|-------|---------------|------|
| 70 | `Ventes additionnelles mises a jour` | Toast — typo : accent manquant sur "a" |
| 145 | `Ventes additionnelles` | Titre section |
| 178 | `Libelle *` | Label formulaire |
| 187 | `Montant HT *` | Label formulaire |
| 200 | `Date` | Label formulaire |
| 209 | `Note (optionnel)` | Label formulaire |

### 3.5 Leads (`LeadsPage.tsx`)

| Ligne | Termes hardcodes |
|-------|-----------------|
| 25-31 | `Nouveau`, `Contacte`, `Qualification`, `Proposition`, `Negociation`, `Gagne`, `Perdu` |
| 35-38 | `Basse`, `Normale`, `Haute`, `Urgente` |
| 42-48 | `LinkedIn`, `Reference`, `Inbound`, `Cold Call`, `Evenement`, `Site Web`, `Autre` |

---

## 4. Termes conformes au glossaire (pas d'action requise)

| Terme | Usage | Statut |
|-------|-------|--------|
| Leads | Navigation + module CRM | OK |
| Vente additionnelle / Ventes add. | Dashboard + projet | OK |
| Client / Clients | i18n + UI | OK |
| Producteur / Producteurs | i18n + UI | OK |
| Projet / Projets | i18n + UI | OK |
| Commande / Commandes | i18n + UI | OK |
| Facture / Factures | i18n + UI | OK |
| Devis | Onglet projet | OK |
| Ticket / Support | i18n + UI | OK |
| SAV | Onglet projet + statut | OK |
| Pense-bete | Widget dashboard | OK |
| Catalogue | Navigation client | OK |
| Pool | Module producteur | OK |

---

## 5. Aucun synonyme dangereux trouve

Les termes suivants n'ont **pas** ete trouves dans le codebase :
- "conduit" (pour leads) -- ABSENT
- "tuyau" (pour leads) -- ABSENT
- "canal" (pour leads) -- ABSENT
- "bouche d'aeration" (pour vente additionnelle) -- ABSENT
- "prospect" (comme label UI) -- ABSENT
- "prestataire" (pour producteur) -- ABSENT

---

## Resume des actions requises (attente validation Nova)

| # | Action | Priorite |
|---|--------|----------|
| 1 | Decider si "Fournisseur" (depenses/Imbretex) est un terme distinct de "Producteur" | HAUTE |
| 2 | Decider si le module e-commerce s'appelle "Boutique" ou "Magasin" | HAUTE |
| 3 | Uniformiser `catalogue` vs `catalog` dans le code | BASSE |
| 4 | Ajouter les cles i18n manquantes (`nav.leads`, `nav.catalogue`) | BASSE |
| 5 | Corriger typo "mises a jour" -> "mises a jour" dans AdditionalSales.tsx L70 | BASSE |
