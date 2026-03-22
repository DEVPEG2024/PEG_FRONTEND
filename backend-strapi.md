# Skill : Backend Strapi (peg_strapi)

## Contexte
- Framework : Strapi v4+
- BDD : PostgreSQL (Heroku Postgres)
- Repo : https://github.com/DEVPEG2024/peg_strapi
- API déployée prod : https://api.mypeg.fr
- API déployée int : https://api-int.mypeg.fr

## Structure Strapi à respecter

```
src/
├── api/                    # Content types personnalisés
│   └── [nom-collection]/
│       ├── content-types/  # Schéma JSON
│       ├── controllers/    # Logique des endpoints
│       ├── routes/         # Définition des routes
│       └── services/       # Logique métier
├── extensions/             # Extensions des plugins Strapi
└── middlewares/            # Middlewares custom
```

## Règles Strapi

- Ne jamais modifier les fichiers auto-générés dans `content-types` à la main — utiliser l'admin Strapi
- Les controllers custom héritent toujours du controller Strapi de base
- Les services métier complexes vont dans `services/`, pas dans les controllers
- Les routes custom se déclarent dans `routes/[nom].js`

## Gestion des paiements Stripe

- Le webhook Stripe est le point central de validation des paiements
- Toujours vérifier `STRIPE_WEBHOOK_SECRET` avant de traiter un événement
- Flux : Utilisateur paie → Stripe → Webhook PEG → Validation → Redirection via `FRONTEND_URL`

## Gestion des fichiers / S3

- Upload via le plugin Strapi AWS S3
- Bucket images : `strapi-mypeg-aws-s3-images`
- Si nouveau domaine frontend → ajouter dans les CORS S3

## Variables d'environnement requises (backend)

```env
DATABASE_URL=
DATABASE_CLIENT=postgres
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=strapi-mypeg-aws-s3-images
AWS_BUCKET_EXPORT=strapi-export-mypeg
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=
EMAIL_FROM=
EMAIL_REPLY_TO=
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
```

## Déploiement backend

```bash
# Intégration
git push origin integration
# Puis déploiement MANUEL sur Heroku peg-int

# Production
git push origin main
# Puis déploiement MANUEL sur Heroku peg-prod
```

## Backup BDD

- Script : `backup-heroku.sh` à la racine du repo
- Exécution : quotidienne à 2h via Heroku Scheduler
- Destination : S3 bucket `strapi-export-mypeg`
- Toujours vérifier qu'un backup récent existe avant une migration importante
