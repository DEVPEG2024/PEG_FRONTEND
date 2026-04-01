# 🧠 CLAUDE.md — Projet PEG

> Lis ce fichier EN ENTIER avant toute action. Il contient toutes les règles, conventions et contexte du projet.

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

## 🐛 Problèmes connus (au 14/03/2026)

- Des variables d'environnement inconnues sont présentes sur `peg-int` : `GROQ_API_KEY`, `STRAPI_API_TOKEN`, `SUPABASE_DATABASE_URL`, `ALLOWED_ORIGINS`, etc. → origine inconnue, ne pas supprimer sans vérification

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
```

