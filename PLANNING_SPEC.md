# 📐 Spécification — Planificateur de charge PEG

> Document de conception technique du module **Planning** (analyse des commandes en cours + suggestion d'emploi du temps pour tenir les deadlines).
> Version 1.0 — étend le POC frontend déjà livré (`src/utils/planning/`, `src/views/app/admin/planning/`) vers une solution persistée et complète.

---

## 0. Sommaire

1. [Vue d'ensemble & objectifs](#1-vue-densemble--objectifs)
2. [Architecture complète](#2-architecture-complète)
3. [Schéma base de données + Modèle Prisma](#3-schéma-base-de-données--modèle-prisma)
4. [Algorithmes de calcul](#4-algorithmes-de-calcul)
5. [Moteur IA](#5-moteur-ia)
6. [API REST](#6-api-rest)
7. [Structure React](#7-structure-react)
8. [UX/UI détaillée](#8-uxui-détaillée)
9. [Wireframes](#9-wireframes)
10. [Roadmap de mise en œuvre](#10-roadmap-de-mise-en-œuvre)

---

## 1. Vue d'ensemble & objectifs

### Problème
L'admin gère N projets en cours, chacun avec une deadline (`endDate`), une priorité, un producteur, un montant. Aujourd'hui rien ne dit **ce qui va déraper**, **par quoi commencer**, ni **comment répartir la charge** pour livrer à temps.

### Objectif
Un outil admin qui, à partir des projets actifs :
1. **détecte les risques** (projets qui rateront leur deadline au rythme estimé) ;
2. **priorise** (file d'urgence : deadline × marge × valeur) ;
3. **suggère un emploi du temps** jour-par-jour, lissé, par producteur ;
4. **explique** la situation en langage naturel (IA) et permet de **simuler** des décalages.

### Principes directeurs
- **Strapi = source de vérité** des projets/producteurs. Le module Planning ne **duplique pas** ces données : il les lit et y ajoute des *métadonnées de planification*.
- **Moteur déterministe = source de vérité des chiffres.** L'IA explique, ne calcule jamais.
- **Dégradation gracieuse** : tout fonctionne sans backend Planning (mode POC actuel, calcul client) ; le backend ajoute la persistance, les durées manuelles, les capacités et l'historique.

### Périmètre par phase
| Phase | Contenu | État |
|-------|---------|------|
| **P0 — POC** | Moteur client + UI lecture seule, estimation auto, IA via `/chatbot/test` | ✅ Livré |
| **P1 — Persistance** | Service Prisma : durées manuelles, capacités producteurs, snapshots | 📋 Spec |
| **P2 — IA dédiée** | Endpoint IA planning + simulation interactive | 📋 Spec |
| **P3 — Sync** | Export Google Calendar, notifications de dérive | 📋 Spec |

---

## 2. Architecture complète

### 2.1 Vue macro

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React / Vite)                       │
│                                                                       │
│  src/views/app/admin/planning/        src/utils/planning/             │
│  ├─ PlanningPage                       ├─ estimateWorkload.ts (P0)     │
│  ├─ components/*                       └─ scheduler.ts        (P0)     │
│  └─ hooks/usePlanning.ts                                               │
│                                                                       │
│  src/services/                                                        │
│  ├─ PlanningService.ts   ──► REST  /planning/*  (PEG_BACKEND)         │
│  ├─ PlanningAIService.ts ──► REST  /planning/ai/* (PEG_BACKEND)       │
│  └─ ProjectServices.ts   ──► GraphQL /graphql   (Strapi, lecture)    │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │ GraphQL (projets/producteurs)      │ REST (planning)
                ▼                                     ▼
   ┌────────────────────────┐          ┌──────────────────────────────┐
   │   STRAPI (source vérité)│          │  PEG_BACKEND (Express)        │
   │  - projects             │          │  routes/planning/index.ts     │
   │  - producers            │          │  services/planning.engine.ts  │
   │  - tasks                │          │  services/planning.ai.ts      │
   └──────────┬─────────────┘          │  Prisma Client                │
              │                         └──────────────┬────────────────┘
              │ (mêmes données via pool)               │ Prisma
              ▼                                         ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                    PostgreSQL (Heroku)                          │
   │  Tables Strapi (projects, producers, …)                         │
   │  Tables Planning (planning_estimates, producer_capacities, …)   │
   └───────────────────────────────────────────────────────────────┘
```

### 2.2 Découpage des responsabilités

| Couche | Rôle | Ne fait PAS |
|--------|------|-------------|
| **Frontend / hooks** | Orchestration, état UI, appels API, rendu | Aucune logique de scoring « cachée » (utilise le moteur partagé) |
| **Moteur partagé (`utils/planning`)** | Estimation, scoring, lissage — **isomorphe** (utilisable client ET serveur) | Accès réseau / DB |
| **PEG_BACKEND `planning.engine`** | Exécute le moteur côté serveur sur données fraîches, persiste les snapshots | Stocker les projets (lus depuis Strapi/PG) |
| **PEG_BACKEND `planning.ai`** | Compose le prompt, appelle le LLM, met en cache | Inventer des chiffres |
| **Prisma** | Persistance des métadonnées de planification | Source de vérité projets |

### 2.3 Choix structurants
- **Moteur isomorphe** : `estimateWorkload.ts` / `scheduler.ts` ne dépendent d'aucune API React/Node → compilables côté serveur. Le backend P1 importe la **même** logique (package partagé ou copie versionnée) pour garantir que client et serveur calculent identiquement.
- **Prisma sur le PG existant** : `schema.prisma` avec `@@map` vers des tables préfixées `planning_*` pour cohabiter avec les tables Strapi sans collision.
- **Lecture projets côté backend** : le `planning.engine` lit les projets soit via GraphQL Strapi (token service), soit via SQL direct sur le pool PG (plus rapide pour les batchs). Recommandation : GraphQL pour rester découplé du schéma SQL Strapi.

---

## 3. Schéma base de données + Modèle Prisma

### 3.1 Tables (logique)

| Table | Rôle | Clé de jointure Strapi |
|-------|------|------------------------|
| `planning_estimates` | Durée estimée/figée par projet (override manuel possible) | `project_document_id` |
| `planning_task_durations` | Durée estimée par tâche (granularité fine, P1+) | `task_document_id` |
| `planning_producer_capacities` | Capacité/jour, jours off, par producteur | `producer_document_id` |
| `planning_runs` | Snapshot d'un planning généré (audit + historique) | — |
| `planning_assignments` | Lignes de planning (projet × jour) d'un run | `project_document_id` |
| `planning_ai_analyses` | Résumés IA mis en cache (par run) | — |
| `planning_settings` | Configuration globale (horizon, seuils) | — (singleton) |

### 3.2 Modèle Entité-Relation

```
planning_runs 1───* planning_assignments
planning_runs 1───1 planning_ai_analyses
planning_estimates           (1 ligne / projet Strapi)
planning_task_durations      (1 ligne / tâche Strapi)
planning_producer_capacities (1 ligne / producteur Strapi)
planning_settings            (singleton)
```

### 3.3 `schema.prisma`

```prisma
// PEG_BACKEND/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WorkloadSource {
  PRODUCER   // déduit de averageDeliveryDays
  TASKS      // déduit du nb de tâches restantes
  MANUAL     // saisi par un admin (override)
  DEFAULT    // fallback constant
}

enum RiskLevel {
  LATE
  TIGHT
  OK
}

/// Durée estimée (jours-homme) figée par projet. Le champ `manualDays`,
/// s'il est non nul, l'emporte sur l'estimation automatique.
model PlanningEstimate {
  id                String         @id @default(cuid())
  projectDocumentId String         @unique @map("project_document_id")
  autoDays          Float          @map("auto_days")
  autoSource        WorkloadSource @map("auto_source")
  manualDays        Float?         @map("manual_days")
  note              String?
  updatedBy         String?        @map("updated_by") // documentId admin
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  @@map("planning_estimates")
}

/// Durée estimée par tâche (granularité fine, optionnel).
model PlanningTaskDuration {
  id             String   @id @default(cuid())
  taskDocumentId String   @unique @map("task_document_id")
  estimatedHours Float    @map("estimated_hours")
  updatedBy      String?  @map("updated_by")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("planning_task_durations")
}

/// Capacité de production d'un producteur, utilisée pour la détection de surcharge.
model PlanningProducerCapacity {
  id                 String   @id @default(cuid())
  producerDocumentId String   @unique @map("producer_document_id")
  dailyCapacityDays  Float    @default(1) @map("daily_capacity_days") // jours-homme/jour ouvré
  weeklyOffDays      Int[]    @map("weekly_off_days")                  // 0=dim … 6=sam
  unavailableDates   DateTime[] @map("unavailable_dates")             // congés ponctuels
  note               String?
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("planning_producer_capacities")
}

/// Snapshot d'un planning généré (audit + comparaison de scénarios).
model PlanningRun {
  id           String               @id @default(cuid())
  label        String?                                       // ex: "scénario décalage A"
  horizonWeeks Int                  @default(2) @map("horizon_weeks")
  generatedBy  String?              @map("generated_by")
  counts       Json                                          // { late, tight, ok, total }
  createdAt    DateTime             @default(now()) @map("created_at")
  assignments  PlanningAssignment[]
  aiAnalysis   PlanningAiAnalysis?

  @@index([createdAt])
  @@map("planning_runs")
}

/// Une ligne de planning : un projet travaillé un jour donné.
model PlanningAssignment {
  id                 String      @id @default(cuid())
  runId              String      @map("run_id")
  run                PlanningRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  projectDocumentId  String      @map("project_document_id")
  producerDocumentId String?     @map("producer_document_id")
  date               DateTime    @db.Date
  allocatedDays      Float       @map("allocated_days")
  risk               RiskLevel
  urgency            Float

  @@index([runId])
  @@index([projectDocumentId])
  @@map("planning_assignments")
}

/// Résumé IA mis en cache pour un run (évite de re-solliciter le LLM).
model PlanningAiAnalysis {
  id        String      @id @default(cuid())
  runId     String      @unique @map("run_id")
  run       PlanningRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  summary   String                                  // texte généré
  model     String?                                 // modèle LLM utilisé
  snapshot  Json                                    // PlanningSnapshot envoyé au LLM
  createdAt DateTime    @default(now()) @map("created_at")

  @@map("planning_ai_analyses")
}

/// Configuration globale (singleton — id fixe "default").
model PlanningSetting {
  id                String @id @default("default")
  horizonWeeks      Int    @default(2)  @map("horizon_weeks")
  tightMarginDays   Float  @default(2)  @map("tight_margin_days")
  defaultWorkloadDays Float @default(3) @map("default_workload_days")
  daysPerTask       Float  @default(1)  @map("days_per_task")
  priorityWeights   Json   @map("priority_weights") // { high:1.3, medium:1, low:0.8 }
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("planning_settings")
}
```

> **Migration** : `npx prisma migrate dev --name init_planning`. Les tables `planning_*` cohabitent avec Strapi sur le même `DATABASE_URL`. Prisma ne gère QUE ces tables (ne pas faire `prisma db pull` sur tout Strapi).

---

## 4. Algorithmes de calcul

### 4.1 Estimation de charge (jours-homme)

```
fonction estimerCharge(projet, settings):
    poids = settings.priorityWeights[projet.priority]   # défaut 1

    # 0. Override manuel (P1) — priorité absolue
    si estimate.manualDays existe:
        retourner { jours: manualDays, source: MANUAL }

    # 1. Durée des tâches si granularité fine connue (P1)
    si Σ taskDurations(projet) > 0:
        heures = Σ estimatedHours des tâches non terminées
        retourner { jours: arrondi(heures / 7 * poids), source: TASKS }

    # 2. Délai moyen du producteur
    si projet.producer.averageDeliveryDays > 0:
        retourner { jours: arrondi(avg * poids), source: PRODUCER }

    # 3. Nb de tâches restantes
    si tâches_non_terminées > 0:
        retourner { jours: arrondi(n * daysPerTask * poids), source: TASKS }

    # 4. Fallback
    retourner { jours: arrondi(defaultWorkloadDays * poids), source: DEFAULT }
```
> ⚠️ La fenêtre `startDate→endDate` n'est **jamais** l'effort : c'est le temps **disponible** (cf. marge).

### 4.2 Jours ouvrés & capacité

```
joursOuvrésEntre(a, b):           # lun–ven, signé
    parcourt jour par jour, +1 si !weekend ; négatif si b < a

capacitéProducteur(producteur, horizon):
    jours = joursOuvrés(horizon)
        − weeklyOffDays additionnels
        − unavailableDates dans l'horizon
    retourner jours × dailyCapacityDays
```

### 4.3 Marge & risque

```
marge   = joursOuvrésRestants(endDate) − chargeEstimée
risque  = marge < 0                → LATE
          marge < tightMarginDays  → TIGHT
          sinon                    → OK
```

### 4.4 Score d'urgence (tri de la file de priorité — EDD pondéré)

```
base    = LATE:1000 | TIGHT:500 | OK:0
prio    = high:150 | medium:75 | low:0
valeur  = min(price / 100, 200)        # plafonné à +200
urgence = base + prio + valeur − marge × 10

tri = urgence décroissante
```
*Rationale* : le risque domine (un retard passe avant tout), puis la priorité métier, puis la valeur €, et à conditions égales la plus petite marge gagne.

### 4.5 Lissage / répartition jour-par-jour

```
construirePlanning(projetsTriés, horizon, capacités):
    jours = joursOuvrésProchains(horizon)
    grille = map jour → []

    pour chaque projet (ordre d'urgence):
        besoin = ceil(chargeEstimée)
        si risque ∈ {LATE, TIGHT}:
            idxDébut = 0                       # commence au plus tôt
        sinon:                                 # OK → commence au plus tard
            idxDeadline = index(endDate dans jours)
            idxDébut = max(0, idxDeadline − besoin + 1)

        placer le projet sur `besoin` jours ouvrés consécutifs dès idxDébut,
        en respectant la capacité résiduelle du producteur ce jour-là ;
        si saturé, glisser au jour ouvré suivant disponible.
```
> Variante P1 « capacité stricte » : un producteur ne peut pas dépasser `dailyCapacityDays` par jour → débordement = signal de surcharge.

### 4.6 Charge par producteur

```
pour chaque producteur:
    totalDays = Σ chargeEstimée des projets actifs assignés
    capacityDays = capacitéProducteur(horizon)
    surcharge = totalDays > capacityDays
    ratio = totalDays / capacityDays      # → barre de charge UI
```

### 4.7 Complexité
- Estimation : O(P) projets.
- Tri : O(P log P).
- Lissage : O(P × besoinMoyen).
- Charge producteur : O(P).
→ Négligeable pour des centaines de projets ; calcul instantané client ou serveur.

---

## 5. Moteur IA

### 5.1 Rôle & garde-fous
- L'IA **explique et conseille**, ne calcule **jamais** les chiffres (fournis par le moteur).
- Entrée = `PlanningSnapshot` (JSON compact, déjà calculé).
- Toujours un **fallback déterministe** (`localSummary`) si le LLM échoue ou répond vide.

### 5.2 Pipeline

```
snapshot ─► buildPrompt ─► LLM (Claude via backend) ─► résumé
                                   │ échec/vide
                                   ▼
                            localSummary(snapshot)   (déterministe)
```

### 5.3 PlanningSnapshot (contrat)
```ts
type PlanningSnapshot = {
  counts: { late; tight; ok; total };
  topPriorities: { name; risk; daysRemaining; workloadDays; price; producer }[];
  overloadedProducers: { name; totalDays; capacityDays; projectCount }[];
};
```

### 5.4 Prompt système (backend P2)
```
Tu es l'assistant de planification d'un studio de production (PEG).
À partir des données d'ordonnancement (déjà calculées — NE LES RECALCULE PAS),
rédige en français un résumé actionnable pour un admin :
1) situation générale, 2) 3 projets à attaquer en premier et pourquoi,
3) risques de surcharge producteur + 1 suggestion concrète.
Concis (~150 mots), ton pro, aucune invention de chiffre.
DONNÉES (JSON): {snapshot}
```

### 5.5 Simulation interactive (P2)
```
POST /planning/ai/simulate
body: { changes: [{ projectDocumentId, newEndDate?, newProducerId?, newDays? }] }

backend:
  1. charge les projets, applique les `changes` en mémoire
  2. relance le moteur → snapshot' + counts'
  3. diff = comparer(snapshotAvant, snapshot')   # qui passe LATE→OK, etc.
  4. LLM rédige : « Décaler A de 3 j résout son retard mais pousse B en TIGHT… »
  5. retourne { snapshotAvant, snapshotApres, diff, narrative }
```

### 5.6 Modèle & coûts
- Modèle : `claude-haiku-4-5` (résumé court, peu coûteux) ; `claude-sonnet-4-6` pour la simulation (raisonnement comparatif).
- Cache : résumé stocké dans `planning_ai_analyses` par `runId` → pas de re-call si le run n'a pas changé.

---

## 6. API REST

> Base : `PEG_BACKEND` Express. Préfixe `/planning`. Auth : middleware admin (Bearer Strapi → vérif rôle `admin`/`super_admin`). CORS : liste explicite + `credentials:true` (jamais `*`).

### 6.1 Lecture / analyse

| Méthode | Endpoint | Description | Réponse |
|---------|----------|-------------|---------|
| `GET` | `/planning/overview?horizonWeeks=2` | Analyse complète live (moteur serveur sur données Strapi fraîches) | `{ counts, scheduled[], weekPlan[], producerLoads[], snapshot }` |
| `GET` | `/planning/settings` | Config globale | `PlanningSetting` |
| `PUT` | `/planning/settings` | MAJ config (horizon, seuils, poids) | `PlanningSetting` |

### 6.2 Estimations & capacités

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `GET` | `/planning/estimates` | — | Toutes les estimations (auto + override) |
| `PUT` | `/planning/estimates/:projectDocumentId` | `{ manualDays?, note? }` | Override manuel d'une durée |
| `DELETE` | `/planning/estimates/:projectDocumentId` | — | Revenir à l'estimation auto |
| `GET` | `/planning/producers/:producerDocumentId/capacity` | — | Capacité d'un producteur |
| `PUT` | `/planning/producers/:producerDocumentId/capacity` | `{ dailyCapacityDays, weeklyOffDays[], unavailableDates[], note? }` | MAJ capacité |

### 6.3 Snapshots / runs

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/planning/runs` | `{ horizonWeeks?, label? }` | Génère + persiste un snapshot |
| `GET` | `/planning/runs` | — | Historique (pagination) |
| `GET` | `/planning/runs/:id` | — | Détail d'un run + assignments |
| `DELETE` | `/planning/runs/:id` | — | Supprime un run |

### 6.4 IA

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/planning/ai/summary` | `{ snapshot }` ou `{ runId }` | Résumé IA (cache si runId) |
| `POST` | `/planning/ai/simulate` | `{ changes[] }` | Simulation « et si… » |

### 6.5 Exemple de réponse `/planning/overview`
```json
{
  "horizonWeeks": 2,
  "counts": { "late": 3, "tight": 5, "ok": 12, "total": 20 },
  "scheduled": [
    {
      "projectDocumentId": "abc123",
      "name": "Banderoles Salon Genève",
      "risk": "late",
      "daysRemaining": -1,
      "workload": { "days": 4, "source": "PRODUCER", "label": "délai moyen producteur (4 j)" },
      "margin": -5,
      "urgency": 1145,
      "producer": { "documentId": "p1", "name": "Atelier Léman" },
      "price": 4200
    }
  ],
  "weekPlan": [
    { "date": "2026-06-04", "items": ["abc123", "def456"] }
  ],
  "producerLoads": [
    { "producerId": "p1", "producerName": "Atelier Léman",
      "totalDays": 14, "capacityDays": 10, "projectCount": 5, "overloaded": true }
  ]
}
```

---

## 7. Structure React

```
src/
├─ utils/planning/                      # MOTEUR ISOMORPHE (réutilisé backend)
│  ├─ estimateWorkload.ts               # ✅ P0
│  ├─ scheduler.ts                      # ✅ P0
│  └─ __tests__/scheduler.test.ts       # 📋 tests unitaires du moteur
│
├─ services/
│  ├─ PlanningService.ts                # REST /planning/* (overview, estimates, capacités, runs)
│  └─ PlanningAIService.ts              # ✅ P0 (summary) → étendu simulate (P2)
│
└─ views/app/admin/planning/
   ├─ PlanningPage.tsx                  # ✅ orchestration
   ├─ theme.ts                          # ✅ couleurs/format
   ├─ hooks/
   │  ├─ usePlanning.ts                 # charge overview + état (loading, refresh)
   │  └─ usePlanningSimulation.ts       # état du mode simulation (P2)
   └─ components/
      ├─ PlanningKpis.tsx               # ✅ cartes risque
      ├─ AiSummary.tsx                  # ✅ analyse IA + bouton affiner
      ├─ PriorityList.tsx               # ✅ file de priorité
      ├─ WeekSchedule.tsx               # ✅ grille planning
      ├─ ProducerLoadList.tsx           # ✅ barres de charge
      ├─ EstimateEditorModal.tsx        # 📋 P1 : éditer la durée d'un projet
      ├─ CapacityEditorModal.tsx        # 📋 P1 : éditer la capacité producteur
      ├─ SimulationDrawer.tsx           # 📋 P2 : panneau « et si… »
      └─ RunHistoryDrawer.tsx           # 📋 P2 : historique des snapshots
```

### 7.1 Hook central `usePlanning`
```ts
type UsePlanning = {
  loading: boolean;
  horizonWeeks: number;
  counts: RiskCounts;
  scheduled: ScheduledProject[];
  weekPlan: DayPlan[];
  producerLoads: ProducerLoad[];
  snapshot: PlanningSnapshot;
  refresh: () => Promise<void>;
  setHorizon: (w: number) => void;
};
```
- **Mode dégradé (P0)** : si `/planning/overview` répond 404/erreur → fallback sur `apiGetProjects()` + moteur client (comportement actuel).
- **Mode backend (P1)** : consomme `/planning/overview` (durées manuelles + capacités prises en compte côté serveur).

### 7.2 State management
- Pas de Redux : état local via `useState`/`useMemo` (cohérent avec les pages récentes). Le moteur étant pur, `useMemo([projects])` recalcule à la volée.
- Mutations (override durée, capacité) → optimistic update local + `PUT`, invalidation via `refresh()`.

---

## 8. UX/UI détaillée

### 8.1 Layout général
- En-tête : icône `TbCalendarStats`, titre « Planificateur de charge », compteur projets, sélecteur **horizon** (1/2/4 sem.), bouton **Actualiser**, (P2) bouton **Historique**.
- Largeur max 1080px, thème sombre dégradé (cohérent Premium/Factures), police Inter.

### 8.2 Sections (ordre vertical)
1. **KPIs risque** — 3 cartes (🔴 retard / 🟠 serré / 🟢 OK) avec compteur + hint.
2. **Analyse IA** — encart indigo : résumé déterministe immédiat + bouton « Affiner avec l'IA » (→ LLM). (P2) bouton « Simuler ».
3. **Planning suggéré** — grille jours ouvrés sur l'horizon ; chaque cellule liste les projets du jour (barre colorée par risque) ; colonne « aujourd'hui » surlignée.
4. **File de priorité** (2/3) — lignes triées par urgence, cliquables → détail projet ; badge risque, J-restants, charge estimée (tooltip = source), producteur, montant.
5. **Charge producteur** (1/3) — barre de charge par producteur (vert/orange/rouge), alerte surcharge avec écart en jours.

### 8.3 États
| État | Rendu |
|------|-------|
| Chargement | « Analyse des commandes en cours… » centré |
| Vide | « Aucun projet en cours à planifier » |
| Erreur backend | Toast + fallback calcul client (transparent) |
| IA en cours | Bouton « Analyse… » désactivé, spinner implicite |
| Surcharge producteur | Barre rouge + ligne d'alerte + ⚠️ |

### 8.4 Interactions clés
- **Clic ligne priorité** → navigation `/common/projects/details/:id`.
- **Survol charge estimée** → tooltip de provenance (`producer`/`tasks`/`manual`/`default`).
- **(P1) Crayon sur une ligne** → `EstimateEditorModal` (saisir durée manuelle).
- **(P1) Clic producteur** → `CapacityEditorModal` (capacité/jour, jours off, congés).
- **(P2) Bouton Simuler** → `SimulationDrawer` : sélection de projets, nouveaux paramètres, comparaison avant/après + narratif IA.
- **Changement horizon** → recalcul instantané (mémoïsé).

### 8.5 Accessibilité / responsive
- Grille planning `overflow-x` sur mobile (scroll horizontal).
- Layout priorité/charge passe en 1 colonne < 900px.
- Contrastes ≥ AA, couleurs doublées d'un libellé texte (jamais la couleur seule).

---

## 9. Wireframes

### 9.1 Desktop — vue principale
```
┌──────────────────────────────────────────────────────────────────────────┐
│  📅  Planificateur de charge                    [Horizon: 2 sem ▾]  [⟳]    │
│      20 projets en cours · planning sur 2 semaines                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ ● EN RETARD  │  │ ● SERRÉS     │  │ ● SOUS CTRL  │                      │
│  │     3        │  │     5        │  │     12       │                      │
│  │ deadline …   │  │ marge <2j    │  │ marge ok     │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
├──────────────────────────────────────────────────────────────────────────┤
│  ✨ Analyse rapide                                  [⟳ Affiner avec l'IA]   │
│  🔴 3 projets en retard — priorité absolue. 🟠 5 serrés à surveiller.       │
│  À attaquer : « Banderoles Genève » (retard, J+1, ~4j, Atelier Léman) …     │
│  ⚠️ Atelier Léman en surcharge (14j pour 10j dispo).                        │
├──────────────────────────────────────────────────────────────────────────┤
│  🕒 Planning suggéré · 2 semaines · jours ouvrés                            │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐                        │
│  │Lun │Mar │Mer │Jeu │Ven │Lun │Mar │Mer │Jeu │Ven │                        │
│  │04/06│05 │06 │07 │08 │11 │12 │13 │14 │15 │                              │
│  │▌Gen│▌Gen│▌Aff│▌Aff│▌Cat│▌Cat│… │   │   │   │   (▌ = couleur risque)     │
│  │▌Aff│▌Cat│    │    │    │    │   │   │   │   │                            │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘                        │
├──────────────────────────────────┬───────────────────────────────────────┤
│  ✓ File de priorité (urgence)     │  👥 Charge par producteur (2 sem.)      │
│  ┌─────────────────────────────┐  │  Atelier Léman ⚠️        14 / 10 j      │
│  │[RETARD] Banderoles Genève   │  │  ████████████████░ (rouge)             │
│  │ ⏱ J+1 · ~4j · Léman · 4200€ →│  │  Surcharge : +4j — redistribuer        │
│  ├─────────────────────────────┤  │                                         │
│  │[SERRÉ] Catalogue Été        │  │  Studio Mont-Blanc     6 / 10 j         │
│  │ ⏱ J-2 · ~3j · MB · 2100€   →│  │  ██████████░░░░░░ (vert)               │
│  ├─────────────────────────────┤  │                                         │
│  │[OK] Cartes de visite        │  │  Non assigné           3 / 10 j         │
│  │ ⏱ J-8 · ~1j · — · 300€     →│  │  █████░░░░░░░░░ (vert)                  │
│  └─────────────────────────────┘  │                                         │
└──────────────────────────────────┴───────────────────────────────────────┘
```

### 9.2 P1 — Modal édition durée
```
┌──────────────────────────────────────────────┐
│  Durée estimée — « Banderoles Genève »     ✕  │
├──────────────────────────────────────────────┤
│  Estimation auto : 4 j                         │
│  (basée sur le délai moyen du producteur)      │
│                                                │
│  Durée manuelle (override)                     │
│  ┌──────────┐ jours-homme                      │
│  │   5      │                                   │
│  └──────────┘                                   │
│  Note  ┌────────────────────────────────────┐  │
│        │ Impression + façonnage complexe     │  │
│        └────────────────────────────────────┘  │
│             [Réinitialiser auto]  [Enregistrer]│
└──────────────────────────────────────────────┘
```

### 9.3 P2 — Drawer simulation « et si… »
```
┌───────────────────────────────── Simulation ─┐
│  Scénario : décaler des deadlines              │
│                                                │
│  Projet : [ Banderoles Genève ▾ ]              │
│  Nouvelle deadline : [ 11/06/2026 📅 ]         │
│  [+ Ajouter un changement]                     │
│                                                │
│  ──────────── Résultat ────────────            │
│  Avant : 🔴3  🟠5  🟢12                         │
│  Après : 🔴2  🟠6  🟢12                         │
│                                                │
│  ✨ « Décaler Banderoles résout son retard,    │
│     mais pousse Catalogue Été en zone serrée.  │
│     Atelier Léman repasse sous sa capacité. »  │
│                                                │
│            [Annuler]   [Appliquer le scénario] │
└────────────────────────────────────────────────┘
```

---

## 10. Roadmap de mise en œuvre

| Phase | Livrables | Dépendances | Déploiement |
|-------|-----------|-------------|-------------|
| **P0** ✅ | Moteur client, UI lecture seule, estimation auto, IA via `/chatbot/test`, route+menu | — | Front seul (fait) |
| **P1** | `schema.prisma` + migration, endpoints `overview`/`estimates`/`capacity`/`settings`, modals édition, hook backend + fallback | Prisma sur PG, token service Strapi | **Backend d'abord** (tables + endpoints), puis front |
| **P2** | `runs` (snapshots), endpoint `ai/summary` dédié + cache, `ai/simulate`, `SimulationDrawer`, `RunHistoryDrawer` | P1 | Backend puis front |
| **P3** | Export Google Calendar (MCP), notifications de dérive (réutilise `triggerNotification`), durées par tâche | P1/P2 | Incrémental |

### Ordre de déploiement (règle PEG)
> **Toujours backend d'abord** (colonnes + endpoints) → vérifier sur intégration → puis frontend. Déployer le front P1 avant le back ferait échouer `/planning/*` (le fallback client P0 amortit toutefois le risque).

### Tests
- **Unitaires moteur** : `scheduler.test.ts` (jours ouvrés, marge, urgence, lissage, surcharge) — déterministe, sans réseau.
- **Intégration API** : endpoints `overview`/`estimates`/`capacity` (Supertest).
- **Non-régression terminologie** : respecter `GLOSSARY.md` (libellés métier).

---

*Fin de spécification — v1.0.*
