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

## 🧾 Numérotation des factures — séquence unique atomique (refonte 18/08/2026)

### La règle, en une phrase
**Le numéro de facture est attribué par le serveur Strapi, à l'insertion, et par lui seul.** Aucun appelant — frontend PEG, NOVA, webhook Stripe, panel admin — ne calcule, ne devine ni ne fournit de numéro.

### Ce qui existait avant (et pourquoi c'était cassé)
Trois séries coexistaient :
| Série | Produite par | Problème |
|---|---|---|
| `FAC-XXXX` | admin PEG (`apiGetNextInvoiceNumber`, GraphQL `MAX()+1`) **et** NOVA (`SELECT MAX(...)` SQL) | deux `MAX()+1` concurrents → **doublons**. Repli NOVA `FAC-<4 chiffres aléatoires>` → collision + saut définitif de séquence |
| `INV-<base36>-<aléa>` | **toutes** les factures serveur : Stripe, devis, devis différé, paiement différé (`generateInvoiceReference()`) | ni chronologique, ni continue — c'était la majorité des factures réelles |
| nom du fichier | PDF téléversés | aucune règle |

Aucune contrainte d'unicité en base, aucune date d'émission garantie (les factures NOVA sortaient avec la case « Date » vide et le champ « FACTURE N° » rempli avec un libellé produit).

### Le mécanisme actuel
- `peg_strapi/src/services/invoice-numbering.service.ts` — **source unique de vérité**
  - table `invoice_number_sequence` : un compteur par série, incrémenté dans une transaction avec **verrou de ligne** (`FOR UPDATE` sur PostgreSQL) → les allocations concurrentes se sérialisent
  - table `invoice_number_journal` : trace chaque allocation (date, source, facture rattachée) → un numéro réservé mais non utilisé reste **visible et justifiable**
  - **index unique partiel** sur `invoices.name` pour `FAC-%` : dernier rempart, une collision devient une erreur DB et non un doublon silencieux
  - compteur **calé au boot** sur le plus grand numéro déjà émis, et **jamais reculé**
- Middleware document service sur `api::invoice.invoice` (`src/index.ts`, `register()`) — **point de passage unique**, couvre REST, GraphQL, panel admin et appels internes :
  - `create` → attribue le numéro et garantit une `date` d'émission
  - `update` → le numéro est **figé** (toute tentative de renumérotation est ignorée et journalisée)
  - `delete` → **refusée** sur une facture de la série (un trou n'est pas justifiable) → annuler via `state: 'canceled'`

### ⚠️ Pièges à ne jamais réintroduire
- **NE JAMAIS** recalculer un numéro côté appelant (`MAX()+1`, horodatage, aléatoire). Un test de non-régression le verrouille : `src/__tests__/invoiceNumbering.test.ts`.
- **NE JAMAIS** repasser `name` dans les `create` de `api/invoice/services/invoice.ts` — le middleware s'en charge.
- **NE JAMAIS** rétablir `generateInvoiceReference()` / la série `INV-*`.
- Les factures `INV-*` **historiques ne sont pas renumérotées** : elles ont été émises et envoyées. Série close, conservée telle quelle.

### Documents externes (PDF téléversés)
Ils conservent leur nom de fichier — le numéro est déjà imprimé sur le PDF — et restent **hors de la séquence**. Si le nom imite un numéro de la série, le serveur le préfixe `EXT-` pour qu'il ne puisse pas usurper un numéro.

### Contrôle de cohérence
`GET /api/invoices/numbering-report` (admin, JWT vérifié dans le contrôleur) → doublons, numéros manquants, ruptures de chronologie, numéros réservés inutilisés, comptages par série. Bouton **« Contrôler la numérotation »** dans la liste des factures (admins).

### Côté NOVA
- `create_invoice` n'a **plus** de paramètre `name` et ne calcule plus rien : il envoie la mutation sans nom et **lit le numéro dans la réponse**. Il renseigne aussi `date` / `dueDate`.
- `update_invoice` fait une correspondance **exacte** sur le numéro (l'ancien `ILIKE '%FAC-0001%'` remontait aussi `FAC-00010`) et **refuse de modifier le montant d'une facture déjà payée** (il faut un avoir).

### ⚠️ Ordre de déploiement
**Backend Strapi d'abord** (int → prod) : le bootstrap crée les tables et cale le compteur. Front déployé avant → les créations de facture partiraient sans numéro côté serveur.

---

## 🔔 Système de notifications (mise à jour 03/04/2026)

### Architecture
- **Dev** : Socket.io WebSocket vers `http://localhost:3000` (transports: websocket + polling)
- **Prod** : Polling HTTP toutes les **5 secondes** via `/peg-api` (Socket.io désactivé — `SOCKET_ENABLED = import.meta.env.DEV` — car Vercel serverless ne supporte pas WebSocket)
- **Auth (02/09/2026)** : toutes les routes `/notifications/*` exigent le JWT Strapi en `Authorization: Bearer` — ajouté par `pegBackendFetch` (`src/services/PegBackendClient.ts`). peg-backend résout l'appelant via `/api/users/me` et ne sert que les notifications dont le propriétaire est le `user.documentId` du porteur du token. Un 401/403 est avalé par les `try/catch` existants (pas de déconnexion, pas de boucle)
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
1. **`recipients`** : liste explicite envoyée par le frontend — toujours des `user.documentId` (le polling lit par `user.documentId`). Pour notifier un client, passer `customerRecipient` (le `customer.documentId` du projet) à `triggerNotification` : le service le résout en `user.documentId` des comptes rattachés via GraphQL (`getCustomerUserIds`, cache par client, repli sur la fiche brute si la résolution échoue). **NE PAS mettre un `customer.documentId` directement dans `recipients`** — la notification ne serait jamais lue (correctif 18/08/2026)
2. **`adminIds`** : liste des admins envoyée par le frontend quand `notifyAdmins: true`
3. Le `senderId` est **toujours exclu** des destinataires

### Fichiers clés
- `src/services/PegBackendClient.ts` — `PEG_BACKEND_BASE` + `pegBackendFetch()` (Bearer JWT), client unique vers peg-backend
- `src/utils/hooks/useNotifications.ts` — logique connexion + polling (userId = documentId)
- `src/services/NotificationService.ts` — appels API + `triggerNotification()` + `getAdminIds()`
- `PEG_BACKEND/routes/notifications/index.ts` — endpoint `/trigger`, `/preferences`, push subscriptions
- `PEG_BACKEND/services/notification.service.ts` — `dispatchNotification()`

---

## 📣 Campagnes clients — notifications de masse avec statistiques (ajout 25/09/2026)

### Concept
L'admin (`/admin/campaigns`, menu « Campagnes ») notifie **tous les clients, un segment (Premium / Standard × secteurs) ou une sélection** : type (Information / Nouveauté / Promotion / Important), titre, message (`**gras**`, liens https), **jusqu'à 6 photos**, bouton d'action vers **un produit précis** (`/customer/product/:id`, sélecteur avec recherche, photo du produit reprise en un clic), **une catégorie du catalogue** (`/customer/catalogue/categories/:id`), une page de l'espace client ou un lien https. Le sélecteur n'affiche que les produits actifs **visibles d'au moins un client** (au catalogue, ou attribués à des clients/secteurs = « offre dédiée », avec avertissement de ciblage) : jamais un import Imbretex privé. Envoi immédiat ou **programmé**, retrait automatique facultatif, **envoi de test à soi-même**, relance des non-ouvreurs.

### Canaux
- **Cloche + push** : toujours — Strapi appelle `POST /notifications/event` de peg-backend (secret `INTERNAL_SECRET`, par paquets de 20), `eventType: 'campaign'`, lien `/common/news/:id?src=bell`, photo de couverture dans `metadata.imageUrl` (vignette dans la cloche). **Aucun changement Express nécessaire** (`/event` n'a pas de liste blanche d'eventType).
- **Pop-up** (option) : `CampaignPopup.tsx`, monté pour les clients dans `ModernLayout`. Chargé à l'arrivée et à chaque notification `campaign` (pas de polling en plus). **Une fois sur chaque appareil** (décision du 25/09/2026) : le serveur propose la campagne pendant toute sa période même déjà vue ailleurs, l'appareil retient par compte ce qu'il a montré (`localStorage` `peg_campaign_popup_device:<documentId>`) ; les stats restent par compte (1ʳᵉ ouverture). ⚠️ Ordre de déploiement de cette règle : front AVANT le serveur (serveur seul → pop-up à chaque nouvel onglet). **Une pop-up par visite** au plus, jamais sur panier / paiement / virement / Actualités. **Temps d'apparition réglable par campagne** (`PopupTiming.tsx`, colonnes `popup_delay` / `popup_duration` / `popup_days` ajoutées au démarrage) : délai d'ouverture après l'arrivée sur l'application (0–120 s), fermeture automatique avec barre de décompte (3–300 s, suspendue au survol ; ne compte pas comme « fermée par le client »), période de proposition en jours après l'envoi (défaut 45 j, filtrée côté serveur) — ensuite Actualités seulement. **Animation d'apparition** au choix (`popup_animation` : zoom rebondi par défaut, glissement, chute avec rebond, fondu — `components/campaign/popupMotion.ts`, framer-motion) : entrée du contenu échelonnée (`entranceDelay` de `CampaignContent`), sortie animée (`AnimatePresence`), fondu simple si le système demande de réduire les animations ; aperçu rejouable dans l'éditeur.
- **E-mail** (option) : Mailjet (50 par appel), pixel d'ouverture, lien de clic suivi, **désinscription en un clic** (`List-Unsubscribe` + page). Les désinscrits sont exclus automatiquement.
- **Actualités** (`/common/news`, menu client « Actualités », pastille `campaign`) : historique des campagnes reçues.

### Backend — `peg_strapi/src/services/campaign.service.ts` (+ `campaign-text.ts`, fonctions pures testées)
- Tables (bootstrap, knex) : `client_campaigns`, `client_campaign_receipts` (**un accusé par compte destinataire = source des stats**), `client_campaign_optouts`. **Pas de content-type** (rien en GraphQL, aucune permission à gérer).
- Routes `/api/campaigns/*` en `auth: false` + JWT vérifié dans le contrôleur : `/admin/*` (rôle admin), `/me/*` (le compte connecté, **ses** accusés uniquement), `/t/:token/*` (liens d'e-mail, jeton aléatoire 128 bits, redirection **uniquement** vers le lien enregistré — pas de redirection ouverte).
- Destinataires = comptes `role.type === 'customer'` non bloqués des clients visés ; **audience figée à l'envoi**.
- Envoi en **tâche de fond, reprenable** : accusés créés en une transaction, puis cloche et e-mail ne traitent que les accusés non marqués. Cron chaque minute (`config/cron-tasks.ts`) : campagnes programmées échues + envois interrompus (> 5 min).
- Statistiques : ouverture = première ouverture (pop-up affichée, actualité ouverte, pixel ou lien e-mail) ; taux sur les destinataires ; clic après ouverture ; canal de 1ʳᵉ ouverture ; courbe horaire (72 h) puis journalière. **Les envois de test ne comptent jamais.**
- Une campagne envoyée ne se modifie plus (409) : la **retirer** (disparaît des pop-ups et Actualités, stats conservées), l'archiver ou la dupliquer.
- **Suppression définitive à tout moment** (demande du 25/09/2026), à l'unité ou par sélection multiple (« Sélectionner » dans la liste), aussi depuis l'éditeur et la page statistiques — sauf pendant les quelques secondes d'un envoi en cours. Efface la campagne et ses accusés (stats perdues ; confirmation explicite). **Cloche** : les notifications vivent dans peg-backend, donc c'est le navigateur de chaque compte qui retire l'entrée (`useCampaignBellCleanup` dans `NotificationBell` → `POST /api/campaigns/me/known` → `DELETE /notifications/:id`, route déjà réservée au propriétaire). Même nettoyage pour une campagne **retirée**.

### ⚠️ Bac à sable hors production
La base d'int est une copie de la prod (mêmes `documentId`) et peg-backend est **commun** : une campagne envoyée depuis int allumerait la cloche des **vrais** clients sur app.mypeg.fr. D'où : cloche et e-mail ne partent vers les clients **que si `FRONTEND_URL` = https://app.mypeg.fr** (forçable par `CAMPAIGNS_DELIVERY=live|sandbox`). Ailleurs, accusés et stats fonctionnent, seuls les **envois de test** (à l'admin) partent ; bandeau jaune dans l'écran. **Ne jamais mettre `CAMPAIGNS_DELIVERY=live` sur peg-int.**

### Fichiers clés
- Front : `src/views/app/admin/campaigns/` (liste, éditeur, statistiques, `components/`), `src/components/template/CampaignPopup.tsx`, `src/components/campaign/`, `src/views/app/common/news/NewsPage.tsx`, `src/services/CampaignServices.ts`, `src/utils/campaignFormat.ts`, `src/@types/campaign.ts`
- Tests : front `src/__tests__/campaignFormat.test.ts`, `campaignPopup.test.tsx` ; back `src/__tests__/campaignText.test.ts` (`node --test`)

### Ordre de déploiement
**Backend Strapi d'abord** (le bootstrap crée les tables). Front déployé avant : l'écran admin affiche « Module indisponible », la pop-up ne fait rien, les Actualités sont vides — rien ne casse.

---

## 🤖 Chatbot client — Agent autonome (mise à jour 23/07/2026)

### Concept
- Le widget en bas à droite (`ChatWidget.tsx`) n'est plus un simple LLM sans données : c'est un **agent** qui interroge **en direct les vraies données PEG** via des **outils (function calling Groq)**. Il sait renseigner le client avec justesse **et préparer des offres chiffrées**.
- Modèle : env **`GROQ_MODEL`**, défaut **`openai/gpt-oss-120b`** (mise à jour 23/09/2026). ⚠️ `llama-3.3-70b-versatile` a été **retiré du palier gratuit Groq le 16/08/2026** : toute l'IA PEG est restée muette 38 jours sans alerte. `GROQ_MODEL` est posé sur peg-int et peg-prod ; l'Express le lit aussi. Modèles raisonnants → `reasoning_effort: 'low'` (géré par `groqChat()`). Boucle agentique côté backend, **max 5 itérations**.
- **Quota Groq** : compte en palier gratuit = **8 000 tokens/min partagés int + prod**. Une offre = 3 appels ≈ 7 000 tokens → 429 dès deux clients simultanés. Passage au **Dev Tier** (pay-as-you-go, ~0,002 € par tour) = décision Nova. Les tokens consommés sont dans le log `chatbot agent {…}` (`tokensIn`, `tokensCached`, `tokensOut`).

### Mise à jour 23/09/2026 — streaming, fiabilité, coûts
- **Streaming SSE** : `POST /chatbot/chat/stream` (événements `open`, `status` = outil en cours, `delta`, `done`, `error` ; battement de cœur 10 s). Le widget l'utilise et **retombe sur `POST /chatbot/chat`** si la route est absente (ordre de déploiement sans risque). Même cœur (`runCustomerAgent`) pour les deux routes.
- **gpt-oss** : paramètres optionnels des outils rendus **nullables** (`makeOptionalNullable`) — sinon Groq rejette l'appel (400 `tool_use_failed`). Un seul réessai sur `tool_use_failed`.
- **429** : une attente du délai indiqué puis un essai en contexte allégé. **Aucun chiffrage en mode dégradé** (un total calculé par le modèle omettait la livraison → ≠ montant Stripe).
- **Contexte** : FAQ/documents choisis **par pertinence** (2 000 / 2 400 c), 12 derniers messages × 2 000 c, `rechercher_catalogue` compact (12 produits). Ordre du prompt = stable puis variable (cache de prompt Groq, tokens en cache non décomptés).
- **Sorties JSON admin** (fiche produit, formulaire, suggestions, contenu) : `response_format: json_schema` via `groqJson()`, plus de regex.
- **Historique** : une ligne par `conversation_id` (colonnes ajoutées au boot). Les colonnes JSONB arrivent **en chaîne** dans ce pool pg → toujours `parseJsonArray/parseJsonObject`.
- **Images IA** : copiées sur S3 (`persistRemoteImage`) — l'URL fal.ai est éphémère et son hôte était hors CSP.
- **Codes HTTP** : `ctx.send(body, status)` — `ctx.status = N; ctx.send()` renvoie 200 (send réécrit le statut).
- **Rate-limit** : IP = **dernier** hop de `X-Forwarded-For` (le premier se forge). Plafond global de tours anonymes : `CHATBOT_ANON_PER_MINUTE` (20).
- ⚠️ **Prompt système de prod** (saisi en avril, ~9 000 c) : copier-coller d'une conversation avec une autre IA, liens fictifs `[LIEN_CATEGORIE_…]`, lien vers une preview Vercel protégée, et interdiction des devis qui contredit l'agent. Une version nettoyée (~1 300 c) est en place **sur int uniquement** ; la remplacer en prod depuis `/admin/ia/chatbot` = décision Nova.

### Backend — `peg_strapi/src/api/chatbot/controllers/chatbot.ts` → `customerChat`
- **Auth FIABLE** : le client est identifié par son **JWT vérifié côté serveur** (`resolveCustomer`), **jamais** par un `userId` envoyé dans le body. Sans token valide → mode anonyme (pas d'accès aux données perso ni au catalogue). La réponse renvoie `authenticated: boolean` (le widget affiche « mode limité » si token présent mais non résolu = session expirée).
- **Sécurité** : messages entrants sanitizés (seuls `user`/`assistant`, 12 derniers, 2000 c — rejet de `system`/`tool` forgés) ; `origin` validé contre une allowlist d'hôtes ; **tous** les outils filtrent sur `customer.documentId` ; commentaires projet filtrés sur `visibility ∈ {all, customer}` (jamais les notes admin/producteur) ; `mes_documents` double-filtre `visibleToCustomer=true`.
- **Outils exposés** (`CUSTOMER_TOOLS`, uniquement si client identifié) :
  - Catalogue : `rechercher_catalogue` / `details_produit` (+ champs de personnalisation du formulaire, économie vs prix catalogue) / `lister_categories` — visibilité identique à `apiGetCustomerProducts`.
  - Offres : `preparer_offre` — chiffre un devis (paliers, **Premium −15 %**, **livraison 9,90 € HT**, TVA 20 %, m² avec largeur/hauteur), renvoie sous-total/livraison/total HT/TTC + `texte_offre`.
  - Suivi : `mes_projets`, `etat_projet_detaille` (dates, étapes, % d'avancement, messages client), `mes_commandes` (+ **statut BAT**, sélections tailles/couleurs, action requise).
  - Finances : `mes_factures` (FAC-XXXX, impayés, PDF, total dû), `mon_historique_paiements`, `mes_devis`.
  - Autres : `mes_tickets_sav`, `verifier_code_promo`, `mes_documents` (logo/charte), `mon_compte`.
- **Pricing = source de vérité `checkout.ts`** : `SHIPPING_HT`, `TVA_RATE`, `PREMIUM_DISCOUNT_RATE`, `PREMIUM_PRICE_HT` sont des **miroirs** des constantes du checkout (`recalculateFromDB`) et du front (`Cart.tsx`, `productHelpers.ts`). Premium appliqué **une seule fois** sur le total ligne, arrondi une fois → l'offre = le montant Stripe débité. **⚠️ Garder ces constantes alignées** si le checkout change.
- **Robustesse** : boucle max 5 itérations, deadline **22 s** en JSON (< H12 Heroku 30 s) et **45 s en streaming** (H12 ne porte que sur le premier octet), timeout par appel Groq et **`maxRetries: 0`** dans la boucle (le retry SDK doublait la durée), repli sans outils avec consigne explicite, **jamais de 500** (tout échec → réponse simple). Appels admin : timeout 20 s, 1 retry. Log `info` d'observabilité en une ligne JSON : auth, itérations, branche, outils + arguments, latence, modèle, tokens.
- **`TOOL_GUIDANCE`** toujours ajouté au prompt système → mappe chaque type de question au bon outil et interdit d'inventer prix/données.
- ORM : `strapi.documents(...)` (Strapi v5), filtres `$eq/$ne/$in/$notIn/$eqi/$containsi/$or`, traversée de relations (`user.customer.documentId` pour les tickets).

### Frontend — `src/components/template/ChatWidget.tsx`
- Envoie le **token JWT** (`Authorization: Bearer`) + `origin` dans `POST /chatbot/chat` ; **plus de préchargement** figé (données live via outils).
- **Rendu markdown** des réponses (gras/italique/listes/liens) → les offres s'affichent proprement. Suggestions **envoyées au clic**. Responsive (`min(…, 100vw/vh)`) + a11y (`role=dialog/log`, `aria-live`, `aria-label`, focus à l'ouverture). Badge « mode limité » si session expirée.

### Prompt « produit d'abord » + cartes visuelles (23/09/2026)
- **Prompt** : `DEFAULT_SYSTEM_PROMPT` (identité, ton ultra-court, exemples) — **remplacé par le prompt enregistré dans `/admin/ia/chatbot`** s'il existe ; bouton admin « Charger le prompt recommandé » (`defaultSystemPrompt` dans la config admin). Les règles non négociables (outils, fiche produit plutôt que catégorie, états projet, cartes, contact SAV `contact@hellonova.fr · 06 59 25 28 23`) sont dans `TOOL_GUIDANCE`, **toujours ajouté**. Les vraies pages du front sont listées dans `accountContext` (fini les `[LIEN_…]` inventés).
- **Cartes** : chaque produit / projet / facture / devis lu par un outil est inscrit dans un registre serveur indexé par **son lien** (`registerCard`). SSE `cards` après chaque outil + `cards` dans `done` / réponse JSON (seulement les cartes citées). Le widget rend en carte (`ChatCardView.tsx`) tout lien `[Nom](url)` **seul sur sa ligne** dont l'url est dans les cartes (`renderChatMarkdown(content, { cards, onNavigate })`). **Le modèle choisit quelle carte montrer, jamais son contenu.**
- Rétro-compatible dans les deux sens (backend sans cartes → liens simples).

### Offre → panier en un clic (24/09/2026)
- `preparer_offre` accepte `taille` / `couleur` (résolues sur le produit par `matchOption`, jamais inventées) et remplit une **offre panier** (`CartOffer` : produit, quantité, dimensions m², taille/couleur) renvoyée dans `done` / la réponse JSON — **hors contexte du modèle** (aucun token). Pas d'offre sous un message d'erreur/saturation.
- Widget : bouton **« Ajouter au panier »** sous la réponse (`ChatOfferAction.tsx`, logique `chatOffer.ts`). **Toute ligne dont la sélection est connue entre directement au panier** (taille/couleur précisées ou uniques, dimensions m²), **y compris un produit à personnaliser** : la ligne porte une réponse de formulaire « en attente » (`answer.state = 'pending'`, `pendingFormAnswer`). Seules les tailles à répartir ouvrent la **fiche pré-remplie** (`navigate(..., { state: { chatOffer } })`, `readChatPrefill`, bandeau « Votre offre », retour au panier après ajout).
- Panier : `personalizationStatus(item)` → bouton « Ajouter votre logo / personnalisation » → fiche en mode modification avec `state.openForm` : ouverte **sur le formulaire**, retour au panier dès validation. ⚠️ Le récapitulatif du mode modification propose « Ajouter au panier » = **doublon** de l'article (bug historique) : ne jamais y renvoyer le client.
- Paiement bloqué **uniquement** si le formulaire a un champ **obligatoire** vide (`formRequiresInput`, prop `missingPersonalization` de `PaymentContent`) — 1 formulaire sur 9 en prod (« Personnalisation du produit », logo requis). Les autres acceptent déjà une commande sans fichier.
- Sélection construite **exactement comme la fiche** (`DEFAULT_CHOICE` quand le produit n'a pas de tailles/couleurs, `{}` + largeur/hauteur en mètres pour le m²) — sinon panier et paiement divergent. Tests : `src/__tests__/chatOffer.test.ts` (logique) et `chatOfferAction.test.tsx` (clic → article réellement dans le store du panier).
- Quantité écrite par le client (« 20 casquettes ») : `quantityInMessage` la détecte (dimensions/grammages exclus) et le serveur injecte la consigne de chiffrage dans le résultat de `rechercher_catalogue` — sinon gpt-oss répondait « Combien de pièces ? ». Après chiffrage, le dernier appel part **sans schémas d'outils** (~1 400 tokens de moins).
- Prix de l'offre = indicatif : le checkout recalcule (`serverLinePriceHT`).
- **Fiche ouverte depuis une carte du chat (25/09/2026)** : si la conversation contient une offre pour ce produit (la plus récente), la carte navigue avec `state.chatOffer` = `prefillForProduct(offer, id)` — les **lignes** de l'offre (quantité, taille, couleur par ligne). `ShowProduct` les résout sur le produit chargé (`selectionForLines`) et reste sur l'étape Sélection. Répartition « 5 M et 5 L » : plusieurs lignes du même produit, chiffrées côté serveur sur la **quantité totale** (comme `getTotalPriceForCartItem`) et fusionnées en **une** ligne de panier. Détection serveur : `quantitiesInMessage` (« 5 M » = taille, « 2 m »/« 2M » = mètres, total annoncé écarté) ; couleurs FR→EN (`COLOR_EN` : noir → BLACK).

### ⚠️ Ordre de déploiement
- **Backend Strapi d'abord** (int → prod) pour que les outils existent. Changements mutuellement rétro-compatibles, mais feature active seulement une fois le back **redéployé** (peg-prod = déploiement Heroku manuel). Nécessite `GROQ_API_KEY` (déjà présent).
- Nouveaux outils = **lecture seule**. Actions d'écriture (créer un devis/ticket) volontairement **non implémentées** (décision produit).

---

## ✍️ Relecteur PEG — orthographe & fiches produit (ajout 24/09/2026)

### Concept
Agent qui relit les **fiches produit** : corrige l'orthographe (appliqué d'office, annulable) et propose de remettre chaque description au **gabarit sobre** (validé par un admin). Écran : `/admin/ia/relecture`. Décision du 24/09/2026 : **vouvoiement, fiches sobres** (accroche d'une phrase + 3 à 5 puces « Libellé : valeur » + « Idéal pour … » facultatif, sans emoji).

### Périmètre = LISTE BLANCHE (côté serveur)
- Lit/écrit **uniquement** `product.description` et `product.name` (nom : nettoyage d'espaces d'office, orthographe **proposée**).
- **Jamais** : commentaires projet, tickets, messages, devis, factures, **descriptions de projet** — ces dernières sont des notes admin qui contiennent du texte à imprimer mot pour mot (dédicaces, logos), des adresses et des prix (audit du 24/09/2026).
- Produits Imbretex (image `imbretex-*`) exclus.

### Garde-fous (le modèle propose, le code décide — `peg_strapi/src/services/relecteur-text.ts`)
- Une correction d'orthographe est refusée si elle modifie un chiffre, une marque en MAJUSCULES ou ®, ne porte que sur la casse/les tirets, ressemble à une réécriture, ou si son extrait est ambigu/introuvable.
- Une fiche uniformisée est **bloquée** si elle contient un nombre absent de la source ou du tutoiement.
- Jamais d'écrasement : écriture seulement si le champ vaut encore le texte relu (sinon « périmée »). Texte déjà relu (empreinte) → pas relu à nouveau, donc une correction refusée ou annulée n'est jamais re-proposée.

### Déclenchement & quota
- Désactivé par défaut (interrupteur dans l'écran). Actif → relecture 30 s après chaque création/modification de produit (middleware document service) + passe complète à **3 h** (`config/cron-tasks.ts`, `RELECTEUR_CRON`).
- **Modèle dédié** `RELECTEUR_MODEL` (défaut `qwen/qwen3.8-27b`, raisonnement coupé ≈ 1 100 tokens/produit) — **jamais** celui du chatbot (`gpt-oss-120b`) ni son secours (`gpt-oss-20b`) : Groq plafonne **par modèle ET par jour**, et la clé est **la même en int et en prod**. ⚠️ Incident 24/09/2026 : une relecture de test sur gpt-oss-120b a épuisé son plafond journalier (200 000 tokens) → le chatbot client a basculé sur son secours pendant plusieurs heures.
- Budget quotidien `RELECTEUR_DAILY_TOKENS` (défaut 120 000) : au-delà, la passe s'arrête et reprend la nuit suivante. Un appel toutes les 20 s (`RELECTEUR_GAP_MS`), file unique.
- Le générateur IA de fiche (`chatbot.aiFillProduct`, « Agent Produit ») utilise le **même gabarit** (`FICHE_RULES` / `renderFiche`) : une fiche générée naît uniforme. Avant, il imposait tutoiement + emojis.
- ⚠️ L'éditeur du front (TipTap) réécrit les puces en `<li><p>…</p></li>` : `isSoberFiche` le tolère — ne pas durcir la regex.

### Fichiers clés
- Back : `src/services/relecteur.service.ts`, `src/services/relecteur-text.ts` (+ `src/__tests__/relecteurText.test.ts`), `src/services/groq.service.ts` (client Groq partagé), `src/api/relecteur/`, `src/index.ts` (middleware + bootstrap), `config/cron-tasks.ts`
- Front : `src/services/RelecteurServices.ts`, `src/views/app/admin/ia/IARelecturePage.tsx`
- Tables : `relecteur_review` (journal), `relecteur_state` (empreintes), `relecteur_settings`

### ⚠️ Ordre de déploiement
**Backend Strapi d'abord** (le bootstrap crée les tables). Front avant back → l'écran affiche « Relecteur indisponible », rien d'autre ne casse.

---

## 👁️ Tracking des vues projet (mise à jour 03/04/2026)

### Endpoints (peg-backend Express)
- **POST** `/projects/view/{documentId}` — enregistre la vue (clients uniquement, pas les admins)
- **GET** `/projects/view/{documentId}` — récupère les vues (admins uniquement, polling 30s en vue détail)

### URL — via `pegBackendFetch` (mise à jour 02/09/2026)
- **Dev** : `http://localhost:3000`
- **Prod** : `/peg-api` (proxy same-origin Vercel) — **plus d'appel direct** à `peg-backend.vercel.app`
- Helper unique : `src/services/PegBackendClient.ts`

### Auth
- **JWT Strapi obligatoire** (`Authorization: Bearer`, ajouté par `pegBackendFetch`)
- **POST** : l'utilisateur est **pris dans le token** — le body est ignoré, le front n'envoie plus de `userId`. Appel conservé pour les clients uniquement (`isCustomer`)
- **GET** : réservé aux admins
- Un 401/403 reste silencieux (`console.warn`), jamais bloquant

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

### URL / Auth (mise à jour 02/09/2026)
- Tous les appels passent par `pegBackendFetch` (`src/services/PegBackendClient.ts`) : `/peg-api` en prod, `http://localhost:3000` en dev, JWT Strapi en Bearer
- Un refus (401/403) est ignoré silencieusement (`r.ok` vérifié, `.catch(() => {})`)

### Endpoints (peg-backend Express)
- **POST** `/auth/user/ping/{userId}` — **authentifié** ; `{userId}` doit être l'id numérique **ou** le documentId de l'appelant — body: `{ displayName, avatarUrl, role }`
- **GET** `/auth/user/online-count` — **admin** — retourne `{ count: N }`
- **GET** `/auth/user/online-users` — **admin** — retourne `{ users: [...] }`

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

## 💠 Statut « En cours (payé) » — `pending_paid` (ajout 02/09/2026)

### Concept
- Vrai statut Strapi (enum `project.state`), demandé par Nova : projet **encore en production** dont le **prix est déjà réglé**.
- Objectif : que la somme soit **comptabilisée dans les KPI du dashboard** (Encaissé ↑, Reste à encaisser ↓) sans attendre le passage en « Terminé ».

### Mécanique (deux garde-fous)
1. **Le statut aligne `paidPrice` sur `price`** : côté front (`ProjectHeader.handleStatusChange`) **et** côté serveur (pré-hook du middleware projet dans `peg_strapi/src/index.ts`, quel que soit le canal : front, NOVA, panel admin). Un projet `pending_paid` a donc toujours `paidPrice >= price`.
2. **Le dashboard compte `pending_paid` comme encaissé** même si la synchro n'a pas eu lieu : `effectivePaid(p)` dans `DashboardAdmin.tsx` (= `max(paidPrice, price)` pour ce statut) alimente « Encaissé », la courbe 6 mois et le détail du widget « Reste à encaisser ».
3. **Les ventes additionnelles du projet sont réglées elles aussi** : le pré-hook serveur pose `paid: true` sur chaque entrée du JSON `additionalSales` (demande Nova du 02/09/2026 : « la vente additionnelle du projet est également payée »).

### Ventes additionnelles — drapeau `paid` (ajout 02/09/2026)
- Chaque entrée `additionalSales` porte `paid?: boolean` (`src/@types/project.ts`). Posé à la main dans l'onglet **Ventes add.** du projet (bouton « Payée / À encaisser », `AdditionalSales.tsx`) ou automatiquement par le statut « En cours (payé) ».
- Dashboard : `isSalePaid(s)` = `paid === true` **ou** projet `pending_paid`. **Encaissé = Σ effectivePaid(projet) + Σ ventes encaissées** ; le détail du widget « Reste à encaisser » ne liste que les ventes non encaissées. Sans ce drapeau, une vente additionnelle restait « à encaisser » pour toujours (10 800 € Borboleta).
- Fiche projet (`DetailsRight.tsx`) : « Reste dû client » = prix + ventes − payé − ventes encaissées.

### ⚠️ Pièges
- Le filtre GraphQL des listes projets est passé de `containsi` à **`eq`** sur `state` (`ProjectServices.ts`) : avec `containsi`, l'onglet « En cours » (`pending`) remontait aussi les `pending_paid`. **Ne pas revenir à `containsi`.**
- Tout nouveau statut doit être ajouté dans **toutes** les cartes de statut du front (`constants.ts`, `ProjectHeader`, `ProjectsList` (onglets, libellés, ordre kanban, comptages, cartes de synthèse), `ProjectListContent`, `ProjectItem`, `RecentProjects`) + `GLOSSARY.md` + test `terminology-guard`.
- Couleur : teal `#2dd4bf` (bg `rgba(45,212,191,0.15)`, border `rgba(45,212,191,0.35)`).

### Ordre de déploiement
**Backend Strapi d'abord** (enum + pré-hook) : tant que peg-prod n'est pas redéployé, choisir « En cours (payé) » depuis le front échoue (valeur d'enum refusée par GraphQL) ; le reste du front fonctionne normalement.

---

## 🔀 Deux backends distincts (mise à jour 03/04/2026)

### 1. Strapi — via `EXPRESS_BACKEND_URL`
- **Dev** : `http://localhost:3000`
- **Prod** : `apiUrl + '/api'` (= `https://api.mypeg.fr/api`)
- **Utilisé pour** : factures (`/invoices/.../payment-status`), chatbot (`/chatbot/chat`), upload (`/upload`), GraphQL (`/graphql`)
- Config : `src/configs/env.config.ts` + `src/configs/api.config.ts`

### 2. peg-backend (Express) — UN SEUL client : `PegBackendClient.ts` (mise à jour 02/09/2026)
- **Dev** : `http://localhost:3000`
- **Prod** : `/peg-api` (proxy same-origin Vercel → `https://peg-backend.vercel.app`) — **plus aucun appel direct**, le header `Authorization` traverse le rewrite, aucun CORS à gérer
- **Repo** : `PEG_BACKEND` (GitHub), déployé manuellement via `vercel --prod` (PAS d'auto-deploy)
- **Auth** : **toutes** les routes exigent un JWT Strapi (`Authorization: Bearer`) ; peg-backend résout l'appelant via `/api/users/me`. Le front ne transmet plus d'identifiant « de confiance » dans le body
- **Helper unique** : `src/services/PegBackendClient.ts` — `PEG_BACKEND_BASE` + `pegBackendFetch(path, init)` (ajoute le Bearer — store Redux de l'onglet puis `getPersistedAuthToken()` — et `Content-Type: application/json` sur body JSON). **Tout nouvel appel vers peg-backend passe par lui**, jamais par un `fetch`/axios direct
- Utilisé par : notifications (`NotificationService.ts`, `useNotifications.ts`), ping/liste en ligne (`OnlineUsersCount.tsx`), vues projet (`ProjectDetails.tsx`, `ProjectListContent.tsx`), propriété des fichiers (`Files.tsx`), planning (`PlanningService.ts`, `PlanningAIService.ts`), Imbretex (`ImbretexService.ts`, `ImbretexImportService.ts`), contrat Premium (`PremiumServices.ts`)
- **Politique côté Express** : `/notifications/*` (propriétaire = `user.documentId`), `POST /auth/user/ping/:id` (id de l'appelant), `GET /auth/user/online-*` (admin), `POST /projects/view/:id` (auth, user pris dans le token), `GET /projects/view/:id` (admin), `/projects/files/ownership` (auth), `/planning/*` (admin), `POST /premium/contract-accept` (auth, `customerId` = client de l'appelant), `/imbretex/*` (admin)
- **Routes supprimées côté Express** : `/mails/*` (le mail de bienvenue est envoyé par Strapi à la vérification du code email), `/chatbot/*`, `/upload`, `/user-prefs` — chatbot et upload passent par Strapi via `EXPRESS_BACKEND_URL`
- **401/403** : silencieux et non bloquant côté front (pas de déconnexion, pas de boucle)
- **CORS** : `origin` avec liste explicite (`app.mypeg.fr`, `int.mypeg.fr`, etc.) + `credentials: true`
  - **⚠️ JAMAIS `origin: '*'` avec `credentials: true`** — le navigateur bloque silencieusement

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

## 👑 Premium — Abonnement client (ajout 03/06/2026)

### Concept
- Un client a un statut **`premium`** (booléen Strapi). Premium = accès aux **offres personnalisées** (« Mes offres ») + **−15 % automatique sur le catalogue standard**. Standard = catalogue seul, prix plein.
- **Tarif : 250 € HT / mois** (abonnement Stripe `mode: subscription`, intervalle `month`). Source unique de vérité : `PREMIUM_PRICE_HT` (côté back **et** front — garder aligné).
- ⚠️ Une migration bootstrap (`premium_defaults` dans `peg_strapi/src/index.ts`) a passé **tous les clients existants en `premium=true`** ; seuls les **nouveaux comptes** sont `false`. La carte d'upgrade ne s'affiche donc que pour les nouveaux comptes standard.

### Parcours client (paiement)
1. Carte **« Passer en Premium »** dans le menu latéral (`SideNav.tsx`), au-dessus de la carte devis, **affichée uniquement si `customer && !customer.premium`**.
2. Page `/customer/premium` (`PremiumPage.tsx`) → bouton → `POST /api/checkout/premium` → `loadStripe` **à la demande** → `redirectToCheckout`.
3. Retour : `?paid=<customerDocumentId>` (succès) / `?canceled=1`. **L'activation `premium=true` est faite par le webhook** (asynchrone), pas au retour client.
4. Résiliation : `POST /api/checkout/premium/cancel` → `cancel_at_period_end` ; la rétrogradation vient du webhook en fin de période.

### Webhook Stripe (`checkout.ts` → `stripeWebhook`)
- `checkout.session.completed` avec `metadata.type === 'premium'` → `premium=true`, `premiumProcessed=false`, `premiumSince=now`, stocke `stripeCustomerId` / `stripeSubscriptionId`. Notifie les admins (« Nouveau client Premium ») + le client. Idempotent.
- `customer.subscription.deleted` **et** `invoice.payment_failed` → `downgradePremiumBySubscription()` repasse le client en `premium=false`.
- **⚠️ Activer ces 3 événements sur le webhook Stripe** (dashboard) — sinon pas de rétrogradation.

### Remise −15 % catalogue
- Helper `applyPremiumDiscount(price, customer)` + `getPremiumMultiplier()` dans `src/utils/productHelpers.ts` (`PREMIUM_DISCOUNT_RATE = 0.15`).
- Appliquée à l'**affichage** : `CustomerProductCard.tsx`, `ShowProduct.tsx`, `HomeProductsList.tsx`, `Cart.tsx`.
- Appliquée au **prix facturé** : `PaymentContent.tsx` (le champ `orderItem.price`). **C'est le point critique** : le backend `recalculateFromDB` recalcule le montant Stripe à partir de `oi.price` en BDD — donc la remise doit être figée à la création de l'order-item.
- Non appliquée à `ShowOrderItem.tsx` / `CartColumns.tsx` (vues commande/legacy : la remise serait basée sur le spectateur, pas sur le client de la commande).

### Page « Mes offres » (`/customer/products`) — refonte 24/09/2026
- **Réservée aux Premium** (décision du 24/09/2026) : `isOffersReserved(premium, catalogAccess)` (`lists/offersView.ts`). Un client Standard voit la présentation Premium, **aucune requête d'offres n'est envoyée** ; le tableau de bord client masque aussi le chiffre et le bloc « Vos offres personnalisées ».
- **Exception** : un client `catalogAccess = false` garde toujours ses offres (seul canal de commande — le bouton « Commander » du dashboard l'y envoie). Statut Premium inconnu → on ne masque rien.
- **Bug corrigé** : `/users/me` ne peuple pas `customer.customerCategory` → la page envoyait un secteur vide et **les offres de secteur n'apparaissaient jamais**. Le contexte est relu par `apiGetCustomerOffersContext` (repli : requête du dashboard, puis store) — `lists/offersContext.ts`.
- Vues : `resolveOffersView` (list / standard / preparing / premium / noCatalogue / unknown / error / noResult). « En préparation » exige `premiumSince` (posé seulement par le webhook : les clients migrés n'en ont pas).
- ⚠️ Ne **jamais** demander `productRef` dans `apiGetCustomerProducts` (référence fournisseur Imbretex, masquée seulement à l'affichage), ni `cost` / `customers` / `customerCategories`.

### Suivi admin — onglet « Premium »
- Nav `admin.premium` → `/admin/premium` (`PremiumAdminList.tsx`), icône `premium` (`TbCrown`).
- Liste les clients `premium=true` via **GraphQL** (`customers_connection`, `PremiumServices.ts`), séparés en **« Nouveaux — à traiter »** (`premiumProcessed=false`) et **« Traités »**.
- « Traité » = offres personnalisées préparées par l'admin → bouton bascule `premiumProcessed` (`apiSetPremiumProcessed`, mutation GraphQL `updateCustomer`).

### Champs Strapi ajoutés (`customer/schema.json`)
`premiumProcessed` (bool), `premiumSince` (datetime), `stripeCustomerId` (string), `stripeSubscriptionId` (string).

### Ordre de déploiement
**Backend d'abord** (colonnes + endpoints), puis configurer les événements webhook Stripe, puis frontend. Déployer le front avant le back ferait échouer `/checkout/premium`.

### Fichiers clés
- Back : `peg_strapi/src/api/checkout/controllers/checkout.ts` + `routes/checkout.ts`, `customer/content-types/customer/schema.json`
- Front : `src/services/PremiumServices.ts`, `src/views/app/customer/premium/PremiumPage.tsx`, `src/views/app/admin/premium/PremiumAdminList.tsx`, `src/components/template/SideNav.tsx`, `src/utils/productHelpers.ts`

---

## 🤝 Générateur — Apporteur d'affaires & commissions (ajout 13/08/2026)

### Concept
- Nouveau profil utilisateur **« Générateur »** (rôle users-permissions `generator`, **nom du rôle = `generator`** car le front calcule l'autorité depuis `role.name`).
- Il n'a accès qu'à **un tableau de bord** (`/home`) et **un wallet** (`/generator/wallet`) — ni catalogue, ni projets, ni données d'autres profils.
- Il dispose d'un **code de parrainage unique** (ex. `DUPONT-A7K2`) et d'un **lien** `FRONTEND_URL/sign-in?ref=CODE`.
- Un client inscrit avec ce code est **rattaché définitivement** (pas de durée limite, nombre de filleuls illimité). Chaque commande **réellement payée** d'un filleul génère une commission.

### Modèle de données (Strapi)
| Content-type | Rôle |
|---|---|
| `generator` | fiche du Générateur : `referralCode` (unique), `commissionRate` (null = taux global), `active`, `users`, `referredCustomers`, `commissions`, `payouts`, `payoutDetails`, `notes` |
| `commission` | une par facture payée : `baseAmount`, `rate` (**figé à la création**), `amount`, `status`, `generator`, `customer`, `invoice`, `payout` |
| `generator-payout` | versement effectué au Générateur (lot de commissions) |
| `referral-setting` (singleType) | `defaultCommissionRate` (5 % par défaut), `autoValidate`, `minPayoutAmount` |
- `customer` gagne `generator` + `referredAt` ; `user` gagne `generator`.

### Cycle de vie d'une commission
`pending` (créée) → `validated` (approuvée par l'admin, entre dans le **solde disponible**) → `paid` (versée, rattachée à un payout). `canceled` = remboursement / commande annulée.
- **Solde disponible** = somme des `validated`. **En attente** = somme des `pending`. **Cumulées** = tout sauf `canceled`.

### Point d'accroche UNIQUE : facture payée
- Middleware document service sur `api::invoice.invoice` dans `peg_strapi/src/index.ts` (`register()`) : à la **création** ou dès que `paymentState`/`state` change → si `paymentState ∈ {fulfilled, transfer_received}` → `commission.createForInvoice()` ; si `state === 'canceled'` → `cancelForInvoice()`.
- Couvre **tous** les canaux : CB Stripe, devis payé, virement confirmé, saisie admin (REST **et** GraphQL).
- **Base de calcul = `invoice.amount` (HT réellement facturé**, après remise promo, livraison incluse).
- **Idempotent** : une seule commission par facture. **Jamais bloquant** : toute erreur est journalisée, le flux de paiement n'échoue jamais.
- ⚠️ **NE PAS** dupliquer l'appel dans `checkout.ts` / `invoice.ts` — le middleware suffit et l'idempotence repose dessus.
- Un générateur **désactivé** (`active = false`) ne génère plus de nouvelle commission.

### API `/api/referral/*` — routes CUSTOM `auth: false` + JWT vérifié dans le contrôleur
Même pattern que `api::auth` : les rôles n'ont **aucune permission users-permissions** sur les content-types de parrainage, tout passe par le contrôleur qui filtre sur le générateur du porteur du token.
- Public : `GET /referral/code/:code` (validation à l'inscription)
- Générateur : `GET /referral/me` (périmètre déduit du JWT — **aucun id envoyé par le client**)
- Admin : `GET|PUT /referral/admin/settings`, `GET|POST /referral/admin/generators`, `GET|PUT /referral/admin/generators/:documentId`, `GET /referral/admin/commissions`, `PUT /referral/admin/commissions/:documentId/status`, `POST /referral/admin/payouts`, `GET /referral/admin/customers`, `PUT /referral/admin/customers/:documentId/generator`

### Inscription
- `clientRegister` accepte `referralCode` : code inconnu/inactif → inscription normale **sans** parrain (jamais bloquante). Notifie le générateur + les admins.
- `SignUpModal` : champ « Code de parrainage » vérifié en direct (nom du parrain affiché) ; `/sign-in?ref=CODE` ouvre la modale pré-remplie.

### Bootstrap (`peg_strapi/src/index.ts`)
- `ensureGeneratorRole()` crée le rôle `generator` + permissions **minimales** (`user.me`, `changePassword`, upload) — surtout **ne pas** ajouter `generator` à `ROLES_TO_GRANT` (donnerait accès au catalogue, aux clients, aux factures…).
- `ensureReferralSettings()` initialise le single type (5 %).

### Taux de commission
- Taux effectif = `generator.commissionRate` sinon `referral-setting.defaultCommissionRate`.
- Le taux est **copié dans la commission** à sa création → une modification du taux n'est **jamais rétroactive**.

### ⚠️ Ordre de déploiement
**Backend Strapi d'abord** (int → prod) : le bootstrap crée les tables, le rôle et les réglages. Le frontend déployé avant ferait échouer `/referral/*` et l'onglet « Générateurs ».

### Fichiers clés
- Back : `peg_strapi/src/api/{generator,commission,generator-payout,referral-setting}/`, `src/api/referral/{controllers,routes}/referral.ts`, `src/api/commission/services/commission.ts`, `src/index.ts` (middleware facture + bootstrap), `src/api/auth/controllers/auth.ts`
- Front : `src/services/GeneratorServices.ts`, `src/@types/generator.ts`, `src/views/app/generator/` (dashboard, wallet, `components/GeneratorUI.tsx`, `useGeneratorSpace.ts`), `src/views/app/admin/generators/GeneratorsAdminList.tsx`, `src/configs/navigation.config/generator.ts`

---

## 🤝 Parrainage CLIENT (extension du programme Générateur, ajout 13/08/2026)

### Concept
- Un **client** peut lui aussi parrainer et toucher une commission, via une entrée de menu **« Parrainage »** (`/customer/referral`).
- Il y voit **son parrain** (qui l'a parrainé — jusque-là invisible côté client) **et** sa propre fiche : code, lien, filleuls, commissions, solde, versements.

### Choix d'architecture — une seule mécanique, deux natures
- Un client parrain reçoit une **fiche `generator` marquée `kind: 'customer'`** reliée à son compte (`generator.customer` ↔ `customer.referralProfile`). Les apporteurs d'affaires gardent `kind: 'partner'`.
- ⚠️ **Tout est mutualisé** : commissions, validation, annulation, versements, écran admin. **NE PAS créer un second circuit de commission pour les clients** — c'est précisément ce que cette conception évite.
- La fiche client est créée **à la demande** (`generatorService.ensureCustomerReferralProfile`) à la première ouverture de la page — pas de fiche vide pour les clients qui n'y vont jamais.
- ⚠️ Les fiches créées **avant** cette évolution ont `kind` à NULL : tout le code doit traiter « NULL ou `partner` » comme apporteur d'affaires (comparer avec `=== 'customer'`, jamais `!== 'partner'`).

### Deux taux distincts (`referral-setting`)
| Réglage | Applique à |
|---|---|
| `defaultCommissionRate` | apporteurs d'affaires (`kind: partner`) |
| `customerCommissionRate` | clients parrains (`kind: customer`) |
| `customerReferralEnabled` | ferme le parrainage entre clients (les clients ne voient plus que leur parrain, aucune commission client créée) |
- `resolveRate()` : taux personnalisé de la fiche → sinon le taux global **de sa nature**.

### Garde-fous
- **Auto-parrainage impossible** : `createForInvoice` ignore le cas `generator.customer === invoice.customer`, et le rattachement admin le refuse explicitement.
- **Parrainage à un seul niveau** : A→B→C, une commande de C rémunère B, jamais A. Pas de cumul multi-niveaux.
- **Périmètre déduit du JWT** : `GET /referral/customer/me` ne prend **aucun identifiant** en entrée.
- Le filleul ne voit de son parrain que **nom, code et date** — rien d'autre.

### Fichiers clés
- Back : `commission/services/commission.ts` (`resolveRate`, `referralRecipients`, garde auto-parrainage), `generator/services/generator.ts` (`ensureCustomerReferralProfile`), `referral/controllers/referral.ts` (`customerSpace`, `buildReferralSpace`)
- Front : `src/views/app/customer/referral/CustomerReferral.tsx`, `src/configs/navigation.config/customer.ts`

---

## 📱 Bannières — version téléphone (ajout 25/09/2026)

### Concept
- Chaque bannière (client, catégorie, NEW CUSTOMER, catalogue, projets, offres) porte une **image principale** (`image`) et une **image téléphone** facultative (`mobileImage`, champ media Strapi).
- ⚠️ **Depuis le 25/09/2026 (soir), l'accueil client sur téléphone n'affiche PLUS de bannière** (demande Nova) : elle est remplacée par la photo de fond que le client téléverse lui-même (voir « Photo de fond de l'accueil téléphone »). Le reste ci-dessous vaut pour l'ordinateur et pour les bannières catalogue / projets / offres.
- Accueil client sur téléphone (< 768px), AVANT le 25/09 au soir : cadre **3× plus haut** qu'avant (demande Nova) — 188px au lieu de 63px sur un iPhone de 402px pour une bannière client 2836 × 442.
  - image téléphone → affichée entière ; **format conseillé 1280 × 600 px** (`MOBILE_BANNER_FORMAT`) ;
  - sinon → image d'ordinateur **entière** au milieu du cadre, sur une copie floutée d'elle-même. **Jamais rognée** : les visuels clients placent leur logo sur les bords.
- Bureau et tablette : **inchangés au pixel** (vérifié 1440 et 820).

### Choix de l'image (`src/utils/bannerVisual.ts`)
Chaîne de priorité inchangée : `customer.banner` → bannière de la catégorie → NEW CUSTOMER. Ordinateur = première image principale de la chaîne. Téléphone = **première bannière qui a une image**, sa version téléphone si elle existe — la bannière propre d'un client prime sur une version téléphone générique.

### Où la modifier
- Onglet **Bannières** : champ « Image téléphone (facultative) » dans les modales, indicateur « Mobile » sur chaque carte.
- Onglet **Premium** : chaque client a un bloc « Bannière de l'espace client » (Ordinateur / Téléphone) qui écrit **sa bannière propre**, créée à la volée et rattachée par la fiche client (`updateCustomer { banner }`) — `PremiumBannerEditor.tsx`.
- Bannières catalogue/projets/offres : sur téléphone, le bouton admin change l'**image téléphone**.

### ⚠️ Rétro-compatibilité (`fetchBannerGraphQL`, `BannerServices.ts`)
Demander `mobileImage` à un Strapi qui ne le connaît pas fait échouer **toute** la requête (400). Toute requête qui le mentionne passe par `fetchBannerGraphQL(build)` : on rejoue `build(false)` sans le champ (sélection **et** données écrites) et on s'en souvient pour la session ; les écrans masquent alors la version téléphone. **Ne jamais ajouter `mobileImage` à une requête sans ce helper.** Tests : `src/__tests__/bannerVisual.test.ts`.

### Ordre de déploiement
**Backend Strapi d'abord** (champ `mobileImage` du schéma `banner`, aucune migration). Front avant back = sans risque : tout fonctionne comme avant, sans version téléphone.

---

## 📱 Accueil client sur téléphone — style « app » (ajout 25/09/2026)

### Concept
- Sous 768px, `/home` client = `DashboardCustomerMobile.tsx`, même langage que l'admin sur téléphone (`DashboardAdminMobile.tsx`) : fond noir `#070a08`, montant en grand, tuiles vitrées, raccourcis ronds, listes façon transactions, couleur d'accent au choix (même clé `peg:dashboardAccent`, même classe `peg-dash-dark` sur le body → en-tête et barre du bas dans le même noir).
- **Composant d'affichage** : `DashboardCustomer` calcule tout et passe des valeurs prêtes. Bureau et tablette : **inchangés au pixel**.
- Ordre : bannière (3× plus haute, fondue dans le noir) → **accueil** → raccourcis → À faire → Mon activité (tuiles) → commandes en cours → activité récente → suggestions → offres personnalisées → **Votre équipe PEG**.
- **Pas de montant en tête** (décision Nova : « créer du lien et faire beau ») : date, « Bonjour/Bonsoir, Prénom » en grand, pastilles « Client Premium » / « Ensemble depuis <1er projet> » / « N projets réalisés », puis **« Vos réalisations »** = photos de ses projets (`project.images`, sinon image du produit). Les factures à régler restent dans « À faire ».
- Carte « Votre équipe PEG » : **Appeler** (`PEG_TEAM_PHONE`, le numéro que l'assistant IA donne déjà) et **Écrire** (ticket).

### Factures de l'accueil (correctif du même jour, bureau compris)
- La requête des projets client **ne ramène pas `invoices`** : « Factures disponibles », les factures du bloc « À faire » et de l'activité restaient à zéro. Elles sont désormais lues à part (`apiGetCustomerInvoiceSummaries`), **jamais bloquant** (échec → accueil sans factures).
- `totalAmount` = **TTC** (l'activité l'affichait en « HT »).
- Règle « à régler » unique : `src/utils/invoiceStatus.ts` (non annulée et non « Payé », virement déclaré compris) — utilisée aussi par les totaux de la page Factures. Une facture en « virement en attente » compte dans le montant mais ne redemande pas « Régler ».
- ⚠️ `devis` n'est pas non plus demandé par cette requête : « Devis en attente » reste à 0 (non traité).

---

## 📱 Détail d'un projet sur téléphone (ajout 25/09/2026)

- Sous 768px, `ProjectHeader` rend `ProjectHeaderMobile` (affichage seul ; la logique — statuts et leurs confirmations, attribution, modale d'édition — reste dans `ProjectHeader`). Il **prolonge la carte de la liste** : mêmes classes `peg-pcard*` (_mobile.css), photo « studio » avec statut/priorité posés dessus, **couleurs bleu nuit** (choix de Nova pour les cartes), nom en grand, « Livraison 2 oct. · dans 7 j », avancement, intervenants, bouton « ← Projets ». Admin : crayon d'édition sur la photo + rangée « Statut du projet » inchangée ; projet sans commande : « Ajouter / Changer la photo » (`useProjectPhotoUpload`, partagé avec l'onglet Accueil).
- La page **défile d'un bloc** (plus de conteneur de hauteur fixe qui laissait la moitié de l'écran au contenu) et le contenu a 16px de marges. Les onglets (`ProjectTabsMobile`) sont **accrochés sous l'en-tête de l'app** (collant, 64px + barre d'état) ; ⚠️ ils doivent rester **enfants directs de la colonne de page** dans `ProjectDetails` — un élément collant ne tient que dans son parent. Onglet actif à la couleur de l'app (`--pdm-accent`).
- Doublons retirés sur téléphone : carte photo/avancement/nom de l'onglet Accueil ; carte « Avancement » de `DetailsRight` (l'en-tête l'affiche) ; carte « Équipe » pour le **client** (l'admin la garde : elle porte le changement de producteur).
- **Chaque onglet tient sans défiler** (demande du 25/09 : « comme les messages, réduire la fenêtre tant qu'il n'y a pas de contenu ») : hors Accueil, l'en-tête devient une **bande réduite** (vignette, nom, statut, livraison, avancement) ; changer d'onglet ramène en haut de page. `DetailsRight`, colonne de droite de **tous** les onglets sur ordinateur, n'est rendu sur téléphone **que dans l'onglet Accueil** (règle posée dans le composant lui-même). La fenêtre des messages prend la hauteur de son contenu (plus de minimum de 500px) et ne défile en elle-même qu'une fois l'écran rempli.
- ⚠️ `checklistItems` est désormais lu avec le projet (`apiGetProjectById`) : sans lui, l'avancement du détail retombait sur les tâches (souvent 0 %) alors que la carte de la liste montrait la checklist — le repli prévu dans `Summary`/`DetailsRight` ne pouvait pas fonctionner (vrai aussi sur ordinateur).
- Avancement et photo : `projectProgress` / `projectCoverUrl` (`details/utils.ts`), mêmes calculs que la carte de liste. Bureau et tablette identiques au pixel.

---

## 📱 Barre du bas du téléphone — défilante et personnalisable (ajout 25/09/2026)

### Comportement (< 768px, `src/components/template/MobileDock.tsx`)
- Par défaut : **un onglet par entrée du premier niveau du menu**, dans l'ordre de la barre latérale. Une catégorie (« Clients », « Finance »…) mène à sa première page et reste allumée sur toutes ses pages.
- Ce qui ne tient pas à l'écran **se fait glisser sur le côté** : 4,5 onglets visibles (le demi-onglet au bord signale la suite), fondu aux bords, **point rouge au bord** si un onglet hors écran a une pastille. « Menu » reste épinglé à droite. Une seule fois par appareil, la barre glisse de 56px et revient (`peg_dock_hint_v1`).
- **Personnalisation** : bouton « Personnaliser la barre du bas » **en bas du menu**, sous la carte « Besoin d'un projet sur-mesure ? » (demande Nova 25/09), ou **appui long** (480 ms) sur un onglet → feuille « Barre du bas » (`MobileDockEditor.tsx`) : retirer (−), ajouter (+, sous-pages comprises : « Factures », « Commandes »…), réordonner (poignée, ou flèches au clavier), « Rétablir la barre d'origine ». La barre reste visible **au-dessus** de la feuille et change en direct.
- Choix **local à l'appareil, par profil** : `localStorage.peg_dock_tabs_v1 = { "<rôles triés>": [clés] }`. Une clé qui n'est plus visible (droits, accès catalogue, Premium) est ignorée ; plus rien de valide → barre par défaut.

### Règles (`src/utils/navMenu.ts`, tests `src/__tests__/dockTabs.test.ts`)
- Entrées = `getDockEntries()` : même lecture des catégories que la barre latérale, mêmes droits, mêmes pastilles. **Ne pas recréer une liste d'onglets à part.**
- Onglet actif = `findActiveDockTab()` : le chemin le plus précis gagne (`/admin/products/sizes` → Attributs, pas Boutique), puis une page épinglée sur sa catégorie.
- **Capsule de verre** sous l'onglet actif (demande Nova 25/09, « effet glace, morphing ») : ses deux bords sont animés séparément (ressorts `GLASS_LEAD` rapide / `GLASS_TAIL` mou) → elle s'étire vers l'onglet visé, s'amincit, un reflet la traverse selon sa vitesse, puis se rétracte. Elle part **dès le toucher** (`pressedKey`, sans attendre le chargement de la page) et défile avec les onglets (dans `.peg-dock-track`). Page hors onglets → elle s'efface et « Menu » prend la même capsule. Animations réduites → déplacement sans animation.
- ⚠️ Au relâchement du doigt après l'appui long, le navigateur émet un clic à cet endroit : il est **avalé** (`swallowReleaseClick`) — sinon il refermait la feuille ou touchait une de ses lignes.
- Bureau et tablette non concernés : composant non monté ≥ 768px, styles sous `@media (max-width: 767.98px)`.

### Fond « app » sur téléphone (demande Nova 25/09/2026)
- Sous 768px, **toutes les pages** prennent le fond des tableaux de bord téléphone : noir `#070a08`, halo de la couleur choisie sur le tableau de bord (bouton palette, `localStorage.peg:dashboardAccent`), en-tête, barre d'onglets et barre d'état fondus dans le même noir.
- Posé par `MobileDock` (classe `body.peg-mobile-dark`, variables `--pdm-accent*` sur `<html>`, relues à chaque page), helpers `src/utils/mobileShell.ts`, styles « FOND APP » de `_mobile.css`. Les tableaux de bord gardent leur propre fond et leurs variables sur le body (elles passent devant). Mode clair : rien ne change.
- **Cartes au style des tableaux de bord** (demande Nova 25/09, page par page, téléphone seulement) :
  - **Projets** : `ProjectCardMobile.tsx` (affichage seul, `ProjectItem` calcule tout et bascule sous md) — coins de 22px, photo produit pleine largeur **jamais rognée** sur fond « studio » clair (`mix-blend-mode: multiply` : le blanc des photos s'y fond), statut/priorité posés sur la photo, montant en grand. **Couleurs de la carte d'ordinateur conservées** (bleu nuit, bordure/barre/filet au statut — Nova : « remets la couleur d'avant sur les cartes de projet »). Mêmes infos et libellés que l'ordinateur ; ordinateur et tablette vérifiés identiques au pixel. Styles « CARTES PROJET » de `_mobile.css`.

---

## 🖼️ Photo de fond de l'accueil téléphone (ajout 25/09/2026)

### Concept
- Demande Nova : sur téléphone, l'accueil client **perd sa bannière** et prend, comme le tableau de bord admin, une **photo de fond que le client téléverse lui-même** — estompée derrière « Bonjour, … » (même traitement que la bannière admin : opacité 0,22, fondu haut et bas).
- Bouton « photo » à côté de la palette → panneau « Photo de fond de l'accueil » : Choisir / Changer la photo, Retirer. Image réduite dans le navigateur (`shrinkImage`, ≈ 2 Mo) avant l'envoi.
- La photo est rattachée au **compte** (`user.dashboardPhoto`) : elle suit le client sur tous ses appareils ; copie locale `peg:dashboardPhoto:<documentId>` pour l'affichage immédiat.

### Backend (`peg_strapi`)
- `user.dashboardPhoto` (media, images) dans `src/extensions/users-permissions/content-types/user/schema.json`.
- `GET | POST | DELETE /api/auth/dashboard-photo` (contrôleur auth, `auth: false` + JWT vérifié) : **toujours la photo du porteur du token**, aucun identifiant accepté. Envoi fait PAR LE SERVEUR (pas de lien vers un fichier existant : un id de fichier fourni par le client permettrait de s'approprier le fichier d'un autre). JPG/PNG/WebP/GIF/AVIF, 8 Mo max (`src/services/dashboard-photo.ts`, tests `src/__tests__/dashboardPhoto.test.ts`). L'ancienne photo quitte le stockage.

### Front
- `src/utils/hooks/useDashboardPhoto.ts` (+ `apiGet/Upload/RemoveDashboardPhoto` dans `UserService.ts`), affichage dans `DashboardCustomerMobile.tsx` (`.pcm-hero`).
- **Rétro-compatible** : tant que le backend n'a pas les routes (404/405) ou hors ligne, le bouton photo ne s'affiche pas ; rien d'autre ne change. Ordinateur inchangé (le hook ne fait aucun appel au-dessus de md).

### Ordre de déploiement
**Backend Strapi d'abord** (nouveau champ, aucune migration). Front avant back = sans risque (bouton masqué).

---

## 🏷️ Attributs produit — Tailles / Couleurs multi-catégories (ajout 01/06/2026)

### Modèle de données
- Une **taille** et une **couleur** sont rattachées à **plusieurs catégories produit** via la relation `manyToMany` **`productCategories`** (Strapi).
- L'ancien champ `productCategory` (relation `oneToOne` historique) est **conservé** pour compatibilité mais n'est plus utilisé en écriture. Une migration bootstrap (`src/index.ts` du Strapi) recopie `productCategory` → `productCategories` de façon idempotente et non destructive.
- En GraphQL Strapi v5, la relation se passe en **tableau de `documentId`** dans l'input (comme `customerCategories`).

### ⚠️ Ordre de déploiement obligatoire
1. **Backend d'abord** : déployer `peg_strapi` (intégration → vérifier le build) → le bootstrap crée la table de jointure et migre les données existantes.
2. **Frontend ensuite** : les queries (`SizeServices.ts`, `ColorServices.ts`) lisent et filtrent désormais sur `productCategories`. Si on déploie le front avant le back, le filtre catégorie renvoie vide.

### Comportement UI (admin `Tailles` / `Couleurs`)
- **Une seule entité par nom** : si on crée « M » (ou « Rouge ») et qu'elle existe déjà, on **ajoute les catégories sélectionnées** à l'entité existante au lieu de dupliquer (fusion par nom, insensible à la casse).
- **Création rapide** : sélecteur de catégories **multi** + saisie (tailles séparées par virgules / couleur unique avec hex).
- **Édition** : multi-select de catégories → c'est aussi le moyen de « dupliquer vers » d'autres catégories.
- **Puce taille/couleur** : le crayon ouvre l'édition ; la croix **retire de la catégorie courante uniquement** (sans supprimer ailleurs). La suppression définitive est dans le modal d'édition.
- Badge `⛓ N` sur une puce = entité partagée par N catégories.
- Tailles triées en **ordre naturel** (XS<S<M<L<XL<XXL<3XL, puis numérique). Couleurs : hex **validé + normalisé** (`#RGB` → `#RRGGBB`).
- ⚠️ **Le `value` d'une couleur (son code hex) n'est PAS unique** : en prod, « NOIR » et « HEATHER GREY » du Bonnet sont tous deux `#000000`. Côté fiche produit / panier, comparer et indexer les options avec **`optionKey` / `sameOption`** (`src/utils/optionKey.ts` : documentId si les deux en ont, sinon valeur **et** nom) — **jamais** `a.value === b.value` (bug du 25/09/2026 : deux sélecteurs « Taille unique » affichés ensemble, quantité partagée). La requête `GetProduct` de la fiche demande `documentId` des tailles et couleurs.

### Fichiers clés
- Backend : `peg_strapi/src/api/{size,color}/content-types/.../schema.json` + migration dans `peg_strapi/src/index.ts`
- Front : `src/@types/product.ts`, `src/services/{SizeServices,ColorServices}.ts`, `src/views/app/admin/products/sizes/SizesList.tsx`, `.../colors/ColorsList.tsx`
- Code mort supprimé : anciens `modals/Modal{Size,Color}*` et `{Size,Color}Columns.tsx` (la liste utilise un dialog inline).

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

## 🔐 Écriture des factures — réservée à l'admin (correctif faille, 13/08/2026)

### Ce qui était ouvert
Le bootstrap accordait `api::invoice.invoice.create` **et** `.update` à tous les rôles de `ROLES_TO_GRANT`, dont `customer` ; seul `.delete` était révoqué. Aucune policy de propriété ne couvrait l'écriture (le middleware d'isolation ne filtre que `findMany`).
Un client pouvait donc appeler `POST /api/invoices` (ou la mutation GraphQL `createInvoice`) avec `paymentState: 'fulfilled'` :
- **facture « encaissée » sans le moindre paiement** → comptabilité et CA du dashboard faussés (le dashboard somme `project.price` / `paidPrice`, mais les factures alimentent le reste) ;
- **commission de parrainage indue** générée automatiquement par le middleware facture, au profit du parrain ;
- possibilité de passer sa **propre** facture impayée en `fulfilled` via `PUT /api/invoices/:id`.

### Correctif
- `api::invoice.invoice.create` et `.update` ajoutés à **`REVOKE_FROM_NON_ADMIN`** (`peg_strapi/src/index.ts`). ⚠️ `grantAuthenticatedPermissions()` s'exécute à chaque boot : **ne jamais les remettre dans `AUTHENTICATED_ACTIONS`**, sinon la faille se réouvre au prochain redémarrage.
- Le seul flux client légitime, « je déclare mon virement », passe par l'action distincte **`updatePaymentStatus`**, qui reste accordée et vérifie propriété + rôle dans son contrôleur.
- ⚠️ **Un seul flux client écrivait une facture** : la validation d'un devis en **paiement différé** (`QuotesList.finalizeDeferred`) créait projet + facture en GraphQL depuis le navigateur. Il passe désormais par **`POST /api/checkout/quote-deferred`** (déjà existant, création serveur). **Ne pas revenir à une création de facture côté front.**

### Ordre de déploiement de ce correctif
Backend et frontend sont couplés : entre les deux déploiements, un client en paiement différé qui valide un devis obtiendrait un projet **sans facture** (l'échec est silencieux, `catch` non bloquant). Enchaîner les deux rapidement, et vérifier après coup qu'aucun devis différé n'a été validé dans l'intervalle.

---

## 🔒 Écriture des fiches CLIENT — réservée à l'admin (correctif faille, 13/08/2026)

### Ce qui était ouvert
`api::customer.customer.update` était accordé au rôle `customer` **sans policy de propriété**. `PUT /api/customers/:documentId` acceptant n'importe quel identifiant, un client pouvait :
- modifier la fiche d'un **autre** client ;
- s'attribuer sur sa propre fiche des champs sensibles — `customerCategory` (**pilote la visibilité du catalogue et les tarifs**), `premium`, `deferredPayment`, `catalogAccess`.

L'écran client `account/components/CompanyProfile.tsx` envoyait effectivement `customerCategory` dans son payload.

### Correctif
- Route dédiée **`PUT /api/auth/update-own-company`** : la fiche visée est **déduite du JWT** (aucun identifiant transmis), et seuls `name`, `logo` et une liste blanche de `companyInformations` (adresse, CP, ville, pays, téléphone, email, TVA, SIRET, site) sont acceptés.
- `api::customer.customer.create` et `.update` ajoutés à **`REVOKE_FROM_NON_ADMIN`**. ⚠️ Même piège que pour les factures : `grantAuthenticatedPermissions()` rejoue la liste à chaque boot — **ne jamais les remettre dans `AUTHENTICATED_ACTIONS`**.
- Le **secteur d'activité passe en lecture seule** côté client : il conditionne catalogue et tarifs, il relève de PEG.

### Règle générale à retenir
Avant de révoquer une permission, **vérifier qu'aucun écran client ne s'en sert** : `invoice.create` servait à la validation de devis différé, `customer.update` à la fiche entreprise. Dans les deux cas le correctif est le même — une route dédiée qui déduit la cible du token et filtre les champs, puis la révocation.

---

## 🛡️ Isolation en ÉCRITURE par propriété (ajout 13/08/2026)

### Le principe
`grantAuthenticatedPermissions()` accorde des actions d'écriture aux rôles client/producteur **à chaque démarrage**, et le middleware d'isolation historique ne filtrait que les `findMany`. Toute écriture était donc possible sur les données de n'importe qui.

Deux mécanismes se complètent désormais :
1. **Révocation** (`REVOKE_FROM_NON_ADMIN`) pour les types sans aucun usage client — 26 actions.
2. **Garde en écriture** (second middleware `documents.use` dans `register()`) pour les types qui ONT un usage client légitime : `invoice`, `project`, `order-item`, `quote`, `client-file` (propriété via `customer`), `comment`, `ticket` (propriété via `user`).

Le garde n'agit que sur `update`/`delete`, uniquement pour le rôle `customer`, laisse passer les appels internes (pas de contexte HTTP) et **fail-open** en cas d'erreur inattendue. Seul un refus délibéré remonte en 403.

### ⚠️ Le prix est calculé par le SERVEUR
`orderItem.price` est écrit par le navigateur (`PaymentContent.tsx`). `recalculateFromDB` se contentait de l'additionner : un client pouvait fixer le montant débité par Stripe (10 200 € HT payés 13 € TTC, avec facture, projet et CA cohérents entre eux).
`serverLinePriceHT()` (checkout.ts) recalcule chaque ligne depuis le produit, les quantités, les paliers, le mode (`tiers`/`packs`/`m2`) et la remise Premium. Si le prix stocké est inférieur, **c'est le tarif serveur qui est facturé** et les admins sont alertés.
**⚠️ Garder aligné avec `src/utils/productHelpers.ts` du frontend** — toute évolution du calcul de prix front doit être répercutée.

### ⚠️ Une relation s'écrit des DEUX côtés
Révoquer `customer.update` ne suffisait pas : la relation client↔catégorie s'écrit aussi depuis `customer-category`. Avant de considérer une écriture fermée, vérifier l'autre extrémité de chaque relation.

### Règle avant toute révocation
**Chercher qui appelle l'action côté front.** `invoice.create` servait au devis différé, `customer.update` à la fiche entreprise, `quote.update` au refus client, `order-item.update` au BAT. Une révocation sèche les aurait cassés — en silence pour le premier.

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

