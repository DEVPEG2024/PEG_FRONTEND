# Skill : Frontend (PEG_FRONTEND)

## Contexte
- Repo : https://github.com/DEVPEG2024/PEG_FRONTEND
- Prod : https://app.mypeg.fr (branche `main`)
- Intégration : https://int.mypeg.fr (toute branche hors `main`)
- Hébergement : Vercel (compte gratuit)

## ⚠️ Particularité Vercel compte gratuit

Sur Vercel gratuit, **toute branche non-`main`** est déployée sur l'environnement preview.
Cela signifie que si on push branche1 puis branche2, c'est branche2 qui est active sur int.mypeg.fr.
→ **Toujours utiliser `front-test` comme branche d'intégration**

## Variables d'environnement frontend

```env
# Production (app.mypeg.fr)
API_ENDPOINT_URL=https://api.mypeg.fr
STRIPE_PUBLIC_KEY=pk_live_...

# Intégration (int.mypeg.fr)
API_ENDPOINT_URL=https://api-int.mypeg.fr
STRIPE_PUBLIC_KEY=pk_test_...
```

## Règles de développement frontend

- `API_ENDPOINT_URL` toujours via variable d'environnement — JAMAIS hardcodé
- Vérifier que les appels API correspondent aux endpoints Strapi existants
- Les images viennent du bucket S3 `strapi-mypeg-aws-s3-images`
- Tester les paiements Stripe avec la clé `pk_test_*` sur intégration uniquement

## Workflow de déploiement frontend

```bash
# 1. Développement
git checkout -b ma-feature
# ... code ...

# 2. Test intégration
git push origin front-test
# → Déploiement auto sur int.mypeg.fr
# → Vérifier sur https://int.mypeg.fr

# 3. Production (si OK)
git push origin main
# → Déploiement auto sur app.mypeg.fr
# → Vérifier sur https://app.mypeg.fr
```

## Checklist frontend avant push main

- [ ] Testé sur https://int.mypeg.fr
- [ ] Aucune URL hardcodée
- [ ] Paiements Stripe testés (mode test)
- [ ] Images S3 qui se chargent correctement
- [ ] Pas de régression sur les pages existantes
