# Skill : Déploiement & DevOps

## Vue d'ensemble

| Composant | Outil | Branche prod | Branche int |
|-----------|-------|-------------|-------------|
| Backend | Heroku | `main` (manuel) | `integration` (auto possible) |
| Frontend | Vercel | `main` (auto) | `front-test` (auto) |
| BDD prod | Heroku Postgres | — | — |
| BDD int | Heroku Postgres | — | — |
| Fichiers | Amazon S3 | — | — |
| Backup | S3 via Scheduler | Quotidien 2h | — |

## Heroku — Commandes utiles

```bash
# Voir les logs en direct
heroku logs --tail --app peg-prod
heroku logs --tail --app peg-int

# Voir les variables d'environnement
heroku config --app peg-prod

# Lancer une commande sur le dyno
heroku run bash --app peg-prod

# Accès BDD PostgreSQL
heroku pg:psql --app peg-prod
```

## Checklist déploiement backend (Heroku)

1. [ ] Push sur la bonne branche (`integration` ou `main`)
2. [ ] Aller sur Heroku dashboard → onglet Deploy
3. [ ] Cliquer "Deploy Branch" en bas de page
4. [ ] Surveiller les logs du build
5. [ ] Vérifier que l'app répond : `curl https://api.mypeg.fr/_health` (ou api-int)
6. [ ] Tester les endpoints critiques

## ⚠️ Problème connu : peg-int repository

Le repository connecté sur Heroku `peg-int` pointe vers `PEG_BACKEND` (obsolète).
**À corriger** : aller sur Heroku peg-int → onglet Deploy → reconnecter sur `peg_strapi`

## Amazon S3 — Gestion CORS

Si tu ajoutes un nouveau domaine frontend, ajoute-le dans les CORS du bucket :
- URL : https://eu-west-3.console.aws.amazon.com/s3/buckets/strapi-mypeg-aws-s3-images
- Onglet : Permissions → CORS

```json
{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedOrigins": [
    "https://api.mypeg.fr",
    "https://app.mypeg.fr",
    "NOUVEAU_DOMAINE_ICI"
  ]
}
```

## En cas de problème en production

1. **Vérifier les logs** : `heroku logs --tail --app peg-prod`
2. **Vérifier le backup** : S3 bucket `strapi-export-mypeg` — est-il récent ?
3. **Ne jamais modifier la BDD directement** sans backup
4. **Rollback Heroku** : onglet Activity → "Roll back to here" sur le dernier déploiement stable
