# 🧠 CLAUDE.md — Projet PEG

> Lis ce fichier EN ENTIER avant toute action. Il contient toutes les règles, conventions et contexte du projet.

---

## 🤖 Autonomie

**Tout ce que tu es en mesure de faire tout seul sans intervention de l'utilisateur, tu le fais obligatoirement.** Ne pose pas de question si tu peux résoudre le problème toi-même. Agis, corrige, implémente, et ne demande confirmation que pour les actions irréversibles ou ambiguës.

---

## 📁 Architecture du projet

Le projet PEG est composé de **deux repositories** :
- **Backend** : `https://github.com/DEVPEG2024/peg_strapi` — Strapi (CMS, API REST, PostgreSQL)
- **Frontend** : `https://github.com/DEVPEG2024/PEG_FRONTEND` — déployé sur Vercel

---

## 🌍 Environnements

| Env | Backend (Heroku) | Frontend (Vercel) | Branche back | Branche front |
|-----|-----------------|-------------------|--------------|---------------|
| **Production** | https://api.mypeg.fr | https://app.mypeg.fr | `main` | `main` |
| **Intégration** | https://api-int.mypeg.fr | https://int.mypeg.fr | `integration` | `front-test` |
| **Dev** | BDD locale uniquement | — | — | — |

### ⚠️ Règles importantes sur les environnements
- NE JAMAIS modifier directement la base de données de production
- Toujours tester sur intégration AVANT de pousser en production
- Le déploiement backend prod (Heroku peg-prod) est **manuel** — ne jamais activer l'auto-deploy sur `main` sans validation
- Sur Vercel (compte gratuit) : toute branche autre que `main` est déployée sur l'environnement preview — donc si on push branche1 puis branche2, c'est branche2 qui est active sur int.mypeg.fr

---

## 🚀 Procédure de mise en production

### Frontend uniquement
```
1. git push origin front-test
2. Vérifier sur https://int.mypeg.fr
3. Si OK → git push origin main
4. Vérifier sur https://app.mypeg.fr
```

### Frontend + Backend
```
BACKEND :
1. git push origin integration (dans peg_strapi)
2. Heroku peg-int → déploiement manuel → vérifier le build
3. Vérifier sur https://api-int.mypeg.fr

FRONTEND :
4. git push origin front-test (dans PEG_FRONTEND)
5. Vérifier sur https://int.mypeg.fr (pointe vers api-int)

SI TOUT OK :
BACKEND :
6. git push origin main (dans peg_strapi)
7. Heroku peg-prod → déploiement manuel → vérifier le build

FRONTEND :
8. git push origin main (dans PEG_FRONTEND)
9. Vérifier sur https://app.mypeg.fr
```

---

## 🔧 Stack technique

### Backend
- **Framework** : Strapi v4+ (Node.js)
- **Base de données** : PostgreSQL (via Heroku Postgres)
- **Stockage fichiers** : Amazon S3 (`strapi-mypeg-aws-s3-images`, région `eu-west-3`)
- **Backup BDD** : Script quotidien à 2h → S3 bucket `strapi-export-mypeg`
- **Paiements** : Stripe (webhook configuré)
- **Emails** : SMTP configuré via variables d'environnement

### Frontend
- **Hébergement** : Vercel (compte gratuit, projet `peg-v2-frontend`)
- **Variable clé** : `API_ENDPOINT_URL` pointe vers le backend selon l'environnement
- **Paiements** : Stripe public key (`pk_live_*` en prod, `pk_test_*` en intégration)

---

## 💳 Stripe

- Deux environnements : **production** et **test**
- Basculer sur stripe.com pour accéder aux clés de chaque environnement
- Le webhook gère la redirection après paiement (succès ou échec)
- `STRIPE_WEBHOOK_SECRET` : permet au PEG de retrouver les infos de paiement côté Stripe

---

## ☁️ Amazon S3 — CORS

Le bucket d'images autorise ces origines :
```json
["https://api.mypeg.fr", "https://app.mypeg.fr",
 "https://super-space-journey-x5vr6j947qvqhjrv-4173.app.github.dev",
 "https://super-space-journey-x5vr6j947qvqhjrv-5173.app.github.dev"]
```
> Si on ajoute un nouveau domaine, penser à l'ajouter dans les CORS du bucket S3.

---

## ⚙️ Variables d'environnement clés

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | Connexion PostgreSQL |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Accès S3 |
| `AWS_BUCKET` | Bucket images |
| `AWS_BUCKET_EXPORT` | Bucket backups BDD |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe |
| `FRONTEND_URL` | Redirection après paiement |
| `SMTP_HOST/PORT/USER/PASS` | Envoi d'emails |
| `API_ENDPOINT_URL` | (Frontend) URL du backend |

---

## 🧾 Numérotation des factures (mise à jour 01/04/2026)

### Séquence partagée FAC-XXXX
- **PEG et NOVA partagent la même séquence** de numéros de facture : `FAC-0001`, `FAC-0002`, etc.
- Côté PEG Frontend (`Invoices.tsx`), la fonction `apiGetNextInvoiceNumber()` dans `InvoicesServices.ts` requête Strapi GraphQL pour trouver le plus grand numéro FAC-XXXX existant et retourne le suivant
- Côté NOVA (`peg.py`), le même mécanisme existe via SQL direct (`SELECT MAX(...)`)
- Le paramètre `name` n'est **jamais** généré par le LLM de NOVA — il est supprimé dans `execute_tool` de `main.py`
- Les factures uploadées manuellement (PDF) conservent le nom du fichier comme identifiant

---

## 🔔 Système de notifications (mise à jour 03/04/2026)

### Architecture
- **Dev** : Socket.io WebSocket vers `http://localhost:3000` (transports: websocket + polling)
- **Prod** : Polling HTTP toutes les **5 secondes** via `/peg-api` (Socket.io désactivé — `SOCKET_ENABLED = import.meta.env.DEV` — car Vercel serverless ne supporte pas WebSocket)
- **Base de données** : PostgreSQL (tables `notifications`, `notification_preferences`, `push_subscriptions`)

### Son
- Web Audio API — chime deux tons (880 Hz → 1174.66 Hz), gain 0.3, durée 0.4s
- Déclenché quand le nombre de non-lus augmente (polling) ou sur événement socket (dev)

### Types d'événements
`new_order`, `project_status_change`, `new_invoice`, `new_ticket`, `payment_received`, `new_comment`, `new_file`, `new_task`, `task_status_change`

### Système d'IDs — ATTENTION
- **Les notifications utilisent `user.documentId`** (string Strapi, ex: `ncgzvxcyahbgztbtflqbf60j`)
- **Ne JAMAIS utiliser `user.id`** (numérique, ex: `75`) pour les notifications — c'est l'erreur qui cause les notifications perdues
- Le `userId` dans `useNotifications.ts` est résolu par : `user?.documentId || user?.id || user?._id`
- Le `senderId` dans les triggers est résolu par : `user?.documentId || user?.id || user?._id`
- Les tables `notification_preferences` et `push_subscriptions` stockent le `user_id` en tant que `documentId`

### Mécanisme `notifyAdmins`
- Quand `notifyAdmins: true`, le frontend récupère les `documentId` des admins via **GraphQL Strapi** (requête `usersPermissionsUsers_connection` filtrée sur `role.name IN ["admin", "super_admin"]`)
- Ces `adminIds` sont envoyés dans le payload du trigger vers le backend Express
- Le backend ajoute chaque `adminId` comme destinataire (sauf le `senderId`)
- **⚠️ NE PAS récupérer les admins depuis `user_online`** — cette table utilise `user.id` (numérique), pas `documentId`
- **⚠️ NE PAS notifier tous les users de `notification_preferences`** — cette table contient aussi les clients/producteurs
- Le cache des `adminIds` est en mémoire côté frontend (variable `cachedAdminIds` dans `NotificationService.ts`), réinitialisé à chaque refresh

### Destinataires d'une notification
1. **`recipients`** : liste explicite envoyée par le frontend (ex: le `customer.documentId` du projet pour `new_comment`)
2. **`adminIds`** : liste des admins envoyée par le frontend quand `notifyAdmins: true`
3. Le `senderId` est **toujours exclu** des destinataires

### Fichiers clés
- `src/utils/hooks/useNotifications.ts` — logique connexion + polling (userId = documentId)
- `src/services/NotificationService.ts` — appels API + `triggerNotification()` + `getAdminIds()`
- `PEG_BACKEND/routes/notifications/index.ts` — endpoint `/trigger`, `/preferences`, push subscriptions
- `PEG_BACKEND/services/notification.service.ts` — `dispatchNotification()`

---

## 👁️ Tracking des vues projet (mise à jour 03/04/2026)

### Endpoints (peg-backend Express)
- **POST** `/projects/view/{documentId}` — enregistre la vue (clients uniquement, pas les admins)
- **GET** `/projects/view/{documentId}` — récupère les vues (admins uniquement, polling 30s en vue détail)

### URL — ATTENTION : appel direct, PAS le proxy
- **Dev** : `http://localhost:3000`
- **Prod** : `https://peg-backend.vercel.app` (hardcodé, ne passe PAS par le proxy `/peg-api`)
- **Raison** : les vues projet utilisent `fetch()` simple sans credentials, donc pas besoin de proxy same-origin. L'appel direct fonctionne grâce au CORS configuré dans `app.ts` du backend

### Auth
- **Aucun Bearer token** — le `userId` (documentId Strapi) est envoyé dans le body du POST

### Base de données
- Table PostgreSQL `project_views` sur le pool PG du backend Express
- Stocke : `project_id` (documentId du projet), `user_id` (documentId du client), `last_seen` (timestamp)

### Affichage (admin only)
- Cartes projets : icône œil + timestamp
- Header projet : badge avec timestamp formaté
- Format : "Vu auj. HH:mm" / "Vu hier HH:mm" / "Vu le DD/MM à HH:mm"

### Fichiers clés
- `src/views/app/common/projects/details/ProjectDetails.tsx` — POST client + GET admin
- `src/views/app/common/projects/lists/components/ProjectListContent.tsx` — GET batch admin
- `src/views/app/common/projects/details/components/ProjectHeader.tsx` — affichage header
- `src/views/app/common/projects/lists/components/ProjectItem.tsx` — affichage carte

---

## 🟢 Utilisateurs en ligne (ajout 03/04/2026)

### Architecture
- **Ping** : chaque utilisateur connecté (admin, client, producteur) envoie un ping toutes les **10 secondes**
- **Seuil** : un utilisateur est considéré "en ligne" s'il a pingé dans les **5 dernières minutes** (requête SQL `WHERE last_seen >= NOW() - INTERVAL '5 minutes'`)
- **Base de données** : table PostgreSQL `user_online` (`user_id`, `display_name`, `avatar_url`, `role`, `last_seen`)

### Système d'IDs — ATTENTION
- **`user_online` utilise `user.id`** (numérique, ex: `75`) — PAS le `documentId`
- C'est parce que le ping est envoyé par `OnlinePing` qui utilise `user?._id ?? user?.id ?? user?.documentId`
- **⚠️ Ne JAMAIS croiser `user_online.user_id` avec les `documentId` des notifications** — ce sont des systèmes d'IDs différents

### Composants
- **`OnlinePing`** : composant invisible monté pour **TOUS les utilisateurs** (dans `ModernLayout.tsx`, hors du `AuthorityCheck`). Envoie le ping.
- **`OnlineUsersCount`** : composant visible **uniquement pour les admins** (wrappé dans `AuthorityCheck authority={["admin", "super_admin"]}`). Affiche le compteur vert et la liste déroulante.
- **⚠️ Le ping DOIT être séparé de l'affichage** — si le ping est à l'intérieur du composant réservé aux admins, les clients/producteurs ne sont jamais visibles en ligne

### URL
- **Dev** : `http://localhost:3000`
- **Prod** : `/peg-api` (proxy Vercel same-origin)

### Endpoints (peg-backend Express)
- **POST** `/auth/user/ping/{userId}` — body: `{ displayName, avatarUrl, role }`
- **GET** `/auth/user/online-count` — retourne `{ count: N }`
- **GET** `/auth/user/online-users` — retourne `{ users: [...] }`

### Fichiers clés
- `src/components/template/OnlineUsersCount.tsx` — composant affichage + `OnlinePing`
- `src/components/layouts/ModernLayout.tsx` — montage de `OnlinePing` (tous) et `OnlineUsersCount` (admins)
- `PEG_BACKEND/routes/auth/user/index.ts` — endpoints ping, online-count, online-users

---

## 💜 Statut "Terminé impayé" (ajout 02/04/2026)

### Comportement
- **Pas un vrai statut en BDD** — c'est un filtre calculé côté client
- Règle : projets avec statut `fulfilled` où `paidPrice < price`
- L'API reçoit une requête pour `fulfilled` (jusqu'à 1000 résultats), puis le frontend filtre

### Valeur interne : `'unpaid'`
### Couleur : magenta `#e879f9` (bg: `rgba(232,121,249,0.15)`, border: `rgba(232,121,249,0.35)`)

### Fichiers clés
- `src/views/app/common/projects/lists/constants.ts` — définition statut/couleurs
- `src/views/app/common/projects/ProjectsList.tsx` — onglet filtre + logique comptage + filtrage client-side
- `src/views/app/common/projects/lists/components/ProjectItem.tsx` — badge sur les cartes
- `src/views/app/common/projects/details/components/ProjectHeader.tsx` — boutons changement statut

---

## 🔀 Deux backends distincts (mise à jour 03/04/2026)

### 1. Strapi — via `EXPRESS_BACKEND_URL`
- **Dev** : `http://localhost:3000`
- **Prod** : `apiUrl + '/api'` (= `https://api.mypeg.fr/api`)
- **Utilisé pour** : factures (`/invoices/.../payment-status`), chatbot (`/chatbot/chat`), upload (`/upload`), GraphQL (`/graphql`)
- Config : `src/configs/env.config.ts` + `src/configs/api.config.ts`

### 2. peg-backend (Express) — DEUX modes d'accès
- **Dev** : `http://localhost:3000`
- **Prod** : `https://peg-backend.vercel.app`
- **Repo** : `PEG_BACKEND` (GitHub), déployé manuellement via `vercel --prod` (PAS d'auto-deploy)
- **CORS** : `origin` avec liste explicite (`app.mypeg.fr`, `int.mypeg.fr`, etc.) + `credentials: true`
  - **⚠️ JAMAIS `origin: '*'` avec `credentials: true`** — le navigateur bloque silencieusement

#### Mode proxy `/peg-api` (same-origin, pas de CORS)
- Utilisé par : **notifications** (`NotificationService.ts`), **ping en ligne** (`OnlineUsersCount.tsx`), **polling notifs** (`useNotifications.ts`)
- Avantage : pas de problème CORS car same-origin

#### Mode appel direct `https://peg-backend.vercel.app`
- Utilisé par : **vues projet** (`ProjectDetails.tsx`, `ProjectListContent.tsx`)
- Raison : ces appels n'envoient pas de credentials, le CORS fonctionne

---

## 📦 Configuration Vercel (mise à jour 02/04/2026)

### vercel.json
- **Proxy** : `/peg-api/:path*` → `https://peg-backend.vercel.app/:path*`
- **Cache** : `no-cache, no-store, must-revalidate` sur `/` et `/index.html` (force le rechargement du dernier build)
- **SPA** : catch-all `/(.*)`  → `/`

### CSP (index.html)
- `connect-src` autorise : `api.mypeg.fr`, `api-int.mypeg.fr`, `*.stripe.com`, `peg-backend.vercel.app` (HTTP + WSS)

---

## 🧑‍💼 Gestion des clients — Wizard (mise à jour 14/04/2026)

### Architecture
- **Création ET édition** se font via un **wizard modal 3 étapes** directement depuis la liste des clients
- Plus de navigation vers une page séparée (`/admin/customers/edit/:id`) — tout reste en modal inline, comme les tickets
- Les routes `/admin/customers/add` et `/admin/customers/edit/:documentId` redirigent vers la liste

### Wizard : 3 étapes

| Step | Titre | Champs |
|------|-------|--------|
| 0 | Identité du client | Nom*, email, téléphone, logo (upload) |
| 1 | Informations entreprise | Catégorie, adresse, CP, ville, pays, TVA, SIRET (si France), site web, paiement différé, accès catalogue |
| 2 | Confirmation | Résumé complet avec badges — bouton "Créer" (vert) ou "Enregistrer" (bleu) selon le mode |

### Mode édition
- Le bouton crayon sur une carte client ouvre le wizard **pré-rempli** avec les données existantes
- Le logo existant est affiché en preview (résolu via `resolveUrl`)
- La catégorie client est chargée dynamiquement via `apiGetCustomerCategories()`

### Pattern technique
- **Pas de React Hook Form** — état géré avec `useState` (comme le wizard tickets)
- **Pas de librairie stepper** — `StepDot` custom avec dots animés (vert = fait, bleu = courant, gris = à venir)
- **Redux** : utilise `createCustomer` et `updateCustomer` du slice existant
- **Validation** : nom obligatoire (step 0), reste optionnel

### Fichiers clés
- `src/views/app/admin/customers/lists/CustomerWizard.tsx` — wizard création + édition
- `src/views/app/admin/customers/lists/CustomersList.tsx` — liste + ouverture wizard
- `src/views/app/admin/customers/store/customersSlice.ts` — Redux CRUD

### Fichiers legacy (conservés mais plus utilisés par la liste)
- `src/views/app/admin/customers/lists/EditCustomer.tsx` — ancien formulaire page séparée
- `src/views/app/admin/customers/lists/CustomersForm/` — ancien formulaire React Hook Form
- `src/views/app/admin/customers/lists/QuickAddCustomerWizard.tsx` — ancien wizard création seule (remplacé par `CustomerWizard`)

---

## 🔒 Terminologie & composants protégés (ajout 18/04/2026)

### Règle absolue
**NE JAMAIS modifier les libellés métier, la bannière admin, les notes du dashboard, ou les clés i18n sans demande EXPLICITE de Nova.**

### Fichiers de référence
- `GLOSSARY.md` — glossaire terminologique officiel (source de vérité)
- `PROTECTED_COMPONENTS.md` — cartographie des composants protégés
- `AUDIT_TERMINOLOGIE.md` — rapport d'audit des dérives terminologiques

### Composants protégés (marqueur en tête de fichier)
- `src/views/app/admin/home/DashboardAdmin.tsx` — bannière, pense-bête, widgets
- `src/services/AdminPreferenceService.ts` — API prefs admin (todos, bannière)
- `src/views/app/admin/banners/` — gestion bannières (liste, modals)

### Renommage menu latéral — SUPPRIMÉ
- La fonctionnalité double-clic pour renommer les items du menu (localStorage `peg_nav_labels`) a été **supprimée** le 18/04/2026
- Cause : dérives terminologiques (ex: "bouches d'aération" au lieu de "Ventes add.")
- Le localStorage legacy est nettoyé au mount (`clearLegacyLabels()` dans `CustomVerticalMenu.tsx`)
- **NE JAMAIS réimplémenter cette fonctionnalité** sans validation Nova

### Tests de non-régression
- `src/__tests__/terminology-guard.test.ts` — 39 tests (glossaire, marqueurs, i18n, statuts, synonymes interdits)
- Lancer : `npx jest src/__tests__/terminology-guard.test.ts`

---

## 📊 Dashboard admin — Calcul du CA (mise à jour 18/04/2026)

### Source de vérité : `project.price`
- **CA = somme(`project.price`) + ventes additionnelles**
- **NE JAMAIS baser le CA sur `invoices_connection`** — cette collection retourne 0 en prod (permissions Strapi non configurées pour l'API GraphQL publique)
- Encaissé = somme(`project.paidPrice`)
- Reste à encaisser = CA - Encaissé

### Ventes additionnelles — requête séparée
- Chargées via `apiGetProjectsAdditionalSales()` (requête GraphQL isolée dans `DashboardSuperAdminService.ts`)
- Si le champ `additionalSales` n'existe pas côté Strapi prod → le catch ignore silencieusement, le dashboard fonctionne sans
- **NE JAMAIS remettre `additionalSales` dans la requête principale** — ça fait échouer toute la requête si le champ manque

### Extraction GraphQL — règles
- Toujours vérifier `body.data` (pas `body` comme fallback)
- Logger les erreurs GraphQL (`body.errors`) au lieu de les ignorer
- Vérifier que `projects_connection` ou `invoices_connection` existe dans la réponse avant d'accepter les données

### Animation KPIs Finances
- Les sections Finances et Opérations utilisent `<AnimatedSection immediate>` (`animate="visible"` au lieu de `whileInView`)
- **NE JAMAIS remettre `whileInView`** sur ces sections — la bannière peut les pousser hors du viewport initial et les KPIs restent invisibles à cause de `once: true`

### Fichiers clés
- `src/views/app/admin/home/DashboardAdmin.tsx` — composant principal (PROTÉGÉ)
- `src/services/DashboardSuperAdminService.ts` — requête GraphQL principale + requête additionalSales séparée
- `src/services/AdminPreferenceService.ts` — prefs admin (PROTÉGÉ)

---

## 🐛 Problèmes connus (au 18/04/2026)

- Des variables d'environnement inconnues sont présentes sur `peg-int` : `GROQ_API_KEY`, `STRAPI_API_TOKEN`, `SUPABASE_DATABASE_URL`, `ALLOWED_ORIGINS`, etc. → origine inconnue, ne pas supprimer sans vérification
- **Strapi prod REST endpoints retournent 500** — tous les endpoints `/api/*` retournent `InternalServerError`. Le GraphQL fonctionne. À investiguer côté Heroku.
- **`invoices_connection` retourne 0 en prod** — les factures existent (visibles dans les projets) mais ne sont pas retournées par la query GraphQL. Probablement un problème de permissions Strapi. Le dashboard utilise `project.price` comme contournement.

---

## 📏 Conventions de code

> Voir les fichiers skills dans `.claude/skills/` pour les règles détaillées par domaine.

### Règles générales
- Toujours vérifier dans quel repository on travaille avant de modifier un fichier
- Ne jamais hardcoder des clés API ou secrets — utiliser les variables d'environnement
- Tester en local ou sur intégration AVANT tout push
- Commits clairs et descriptifs en français ou anglais (cohérent avec l'existant)

### Backend (Strapi)
- Respecter la structure Strapi existante (content-types, controllers, services, routes)
- Toute nouvelle collection → migration PropTypeDB compatible
- Ne pas modifier les fichiers générés automatiquement par Strapi

### Frontend
- Respecter les composants et patterns existants avant d'en créer de nouveaux
- `API_ENDPOINT_URL` toujours utilisé via les variables d'environnement — jamais hardcodé

---

## 🔗 Liens utiles

- Heroku prod : https://dashboard.heroku.com/apps/peg-prod
- Heroku int : https://dashboard.heroku.com/apps/peg-int
- Vercel : https://vercel.com/zooms-projects/peg-v2-frontend
- S3 images : https://eu-west-3.console.aws.amazon.com/s3/buckets/strapi-mypeg-aws-s3-images
- S3 backups : https://eu-west-3.console.aws.amazon.com/s3/buckets/strapi-export-mypeg
- Stripe webhook : https://dashboard.stripe.com/acct_1R9MMyKa36UjT6qO/workbench/webhooks/we_1T0GfSKa36UjT6qOhQWyZ7f2

## Skills
Lis et applique systématiquement les fichiers dans `.claude/skills/` :
- `.claude/skills/qualite-code.md` → avant chaque commit
- `.claude/skills/backend-strapi.md` → pour tout travail sur peg_strapi
- `.claude/skills/frontend.md` → pour tout travail sur PEG_FRONTEND
- `.claude/skills/devops-deploiement.md` → avant chaque déploiement

