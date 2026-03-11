# Projet PEG

Le projet PEG est composé de deux repositories:
  * Le backend : https://github.com/DEVPEG2024/peg_strapi
  * Le frontend: https://github.com/DEVPEG2024/PEG_FRONTEND

## Back-end

Le backend est basé sur le framework [Strapi](https://strapi.io/). C'est un CMS.

Le code est sur le repository Github https://github.com/DEVPEG2024/peg_strapi

Côté backend, on a différents environnements sur Heroku:
  * peg-prod: l'environnement de production
  * peg-int: l'environnement d'intégration (alias pré-production)
  * peg-dev : l'environnement de développement

### Peg-prod

Lien Heroku: https://dashboard.heroku.com/apps/peg-prod

Lien vers Strapi déployé : https://api.mypeg.fr

#### Add-ons (visible dans Heroku, onglet Overview)

* Heroku postgres : la base de données PostgreSQL de production
* Heroku Scheduler : une exécution quotidienne à 2h du matin du script https://github.com/DEVPEG2024/peg_strapi/blob/main/backup-heroku.sh. Ce script va effectuer un export de la base de données de production et l'enregistrer sur Amazon S3 sur le bucket dédié : https://eu-west-3.console.aws.amazon.com/s3/buckets/strapi-export-mypeg?region=eu-west-3&tab=objects

#### Onglet Deploy

Cet environnement de production se base sur la branche `main`.
Il est possible de mettre en place un déploiement automatique.
Cependant, comme il s'agit de l'environnement de production, il est peut-être préférable, dans un premier temps du moins, de plutôt faire des déploiements manuels, le temps de bien comprendre les enjeux de ce déploiement.

#### Onglet Settings

On retrouve dans la partie Domains l'URL où est déployée cette application, à savoir https://api.mypeg.fr.

On y trouve également les Config Vars - les variables d'environnement - avec notamment:
* AWS_ACCESS_KEY_ID : l'id d'accès à amazon S3
* AWS_ACCESS_SECRET / AWS_SECRET_ACCESS_KEY : la clé secrète d'accès à amazon S3 (en double car utilisée par l'application et le script de sauvegarde mais avec des noms différents)
* AWS_BUCKET : le bucket où sont stockées les images
* AWS_BUCKET_EXPORT : le bucket où sont stockés les exports de BDD
* DATABASE_CLIENT : le type de BDD utilisée
* DATABASE_HOST / DATABASE_NAME / DATABASE_PASSWORD / DATABASE_PORT / DATABASE_URL / DATABASE_USERNAME : les informations pour se connecter à la BDD (ici, de production)
* EMAIL_FROM / EMAIL_REPLY_TO : quels adresses utiliser pour les mails envoyés par l'application
* SMTP_HOST / SMTP_PASSWORD / SMTP_PORT / SMTP_USERNAME : les informations de connexion au serveur de mails
* FRONTEND_URL : l'URL où rediriger l'utilisateur après son paiement Stripe
* STRIPE_SECRET_KEY : la clé secrète de Stripe
* STRIPE_WEBHOOK_SECRET : l'identifiant généré par Stripe afin de récupérer le contexte lors d'un paiement, à retrouver ici https://dashboard.stripe.com/acct_1R9MMyKa36UjT6qO/workbench/webhooks/we_1T0GfSKa36UjT6qOhQWyZ7f2

##### Spécificité Webhook Stripe

Quand un utilisateur effectue un paiement, le contexte de son paiement est envoyé à Stripe (quels items, quels prix, etc.).
Une fois le paiement effectué côté Stripe, il faut rediriger l'utilisateur vers le PEG:
* soit en succès
* soit en échec

Dans les deux cas, c'est le webhook créé qui gère cette redirection. La clé secrète du webhook permet au PEG de retrouver les informations côté Stripe.

##### Spécificté Amazon S3

Dans l'onglet https://eu-west-3.console.aws.amazon.com/s3/buckets/strapi-mypeg-aws-s3-images?region=eu-west-3&tab=permissions

On y retrouve une partie "Partage des ressources entre origines (CORS)".
C'est là où sont définies les origines autorisées de demande d'accès aux ressources du bucket d'images.

On peut y voir:
````json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "https://api.mypeg.fr",
            "https://app.mypeg.fr",
            "https://super-space-journey-x5vr6j947qvqhjrv-4173.app.github.dev",
            "https://super-space-journey-x5vr6j947qvqhjrv-5173.app.github.dev"
        ],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
````

On voit ainsi que "https://api.mypeg.fr" y a accès : afin de permettre au back d'ajouter des images au bucket.

On voit également que "https://app.mypeg.fr" y a accès : afin de permettre au front de récupérer des images du bucket.

### Peg-int

C'est l'environnement d'intégration, ou autrement dit, de pré-production.

Lien Heroku: https://dashboard.heroku.com/apps/peg-int

Lien vers Strapi déployé : https://api-int.mypeg.fr

#### Add-ons (visible dans Heroku, onglet Overview)

* Heroku postgres : la base de données PostgreSQL d'intégration

Et rien d'autre car on ne souhaite pas sauvegarder les données de cet environnement sur Amazon S3.

#### Onglet Deploy

Cet environnement se base sur la branche `integration`.
Il est possible de mettre en place un déploiement automatique. De cette manière, dès que du code est possué sur `integration`, l'environnement d'intégration contient les nouvelles données.

#### Onglet Settings

Les variables d'environnement sont globalement les mêmes, à l'exception des informations de connexion à la base de données qui, là, redirigent vers la base de données d'intégration.

Pour info, je vois des variables d'environnement que je n'ai pas ajoutées moi (GROQ_API_KEY, NODE_ENV, NPM_CONFIG_PRODUCTION, STRAPI_API_TOKEN, SUPABASE_DATABASE_UR, ALLOWED_ORIGINS, etc.).
Je ne maîtrise pas ce qu'elles font car ce n'est pas moi qui les ai ajoutées.

### Peg-dev

C'est l'environnement de développement.
Il n'y a qu'une base de données, pas d'application déployée.

Il est surtout utile pour avoir accès à la base de données de développement lors des tests réalisés via VSCode.

## Front-end

Géré côté Vercel: https://vercel.com/zooms-projects/peg-v2-frontend

Le code est sur le repository Github https://github.com/DEVPEG2024/PEG_FRONTEND

Dans l'onglet Domains, on peut voir où est déployé quoi.

### Domains

#### app.mypeg.fr

C'est là où est déployée l'application front de production.

La branche suivie est `main`. C'est configuré ici: https://vercel.com/zooms-projects/peg-v2-frontend/settings/environments/production

Dans cette page, on peut également voir les variables d'environnement pour le frontend : 
* STRIPE_PUBLIC_KEY : la clé publique de Stripe, à retrouver sur Stripe
* API_ENDPOINT_URL : l'URL du serveur backend déployé où le frontend doit aller chercher les informations.


API_ENDPOINT_URL redirige ainsi, pour la production, vers https://api.mypeg.fr.
STRIPE_PUBLIC_KEY utilise la clé publique de l'environnement de production (elle commence par 'pk_live')

### int.mypeg.fr

C'est là où est déployée l'application front d'intégration, ou pré-production.

Tout branche non assignée (donc non `main` dans notre cas) est suivie. C'est configuré ici: https://vercel.com/zooms-projects/peg-v2-frontend/settings/environments/preview

On pourrait vouloir suivre une branche unique. Cependant, comme il s'agit d'un compte gratuit, on n'a pas cette possibilité.
Donc, il faut bien garder en tête que tout code poussé sur une branche autre que main est alors déployé sur cet environnement.

Donc si on push du code sur branche1, puis sur branche2, l'environnement déployé se base au final sur branche2.

Actuellement, on peut voir que la branche utilisée est front-test : 

![Configuration environnement preview](image-1.png)

Pour cet environnement:
* API_ENDPOINT_URL redirige vers https://api-int.mypeg.fr.
* STRIPE_PUBLIC_KEY utilise la clé publique de l'environnement de test (elle commence par 'pk_test')

## Autres informations

### Stripe

Stripe a deux environnements: un environnement de production et un environnement de test.

On peut basculer facilement de l'un à l'autre sur stripe.com afin de retrouver les clés secrètes de chaque environnement.

## Procédure de mise en production

Quand on effectue un nouveau développement (via code, avec Claude code, peu importe), on a deux cas de figures.

### Côté frontend uniquement :

Le code ne concerne que le repository PEG_FRONTEND: il n' a pas de modification côté back-end.

1. Je push le code sur la branche front-test
2. Le code est automatiquement déployé sur Vercel sur l'environnement d'intégration disponible via https://int.mypeg.fr
3. Je vérifie que le comportement est celui voulu
4. Si OK, je push le code sur main
5. Le code est automatiquement déployé sur Vercel sur l'environnement de production disponible via https://app.mypeg.fr

### Côté frontend et backend :

Le code concerne les deux repositories PEG_FRONTEND et peg_strapi.

#### Côté backend

1. Je push le code sur la branche integration
2. Je vais sur Heroku peg-int et je déploie le code --> vérifier que le build est OK
3. L'application backend est ainsi déployée est accessible via https://api-int.mypeg.fr

### Côté frontend

4. Je push le code sur la branche front-test
5. Le code est automatiquement déployé sur Vercel sur l'environnement d'intégration disponible via https://int.mypeg.fr. Comme celui-ci a dans ses variables d'environnement l'information qu'il doit aller regarder sur https://api-int.mypeg.fr, et que celle-ci contient bien le nouveau code, la nouvelle fonctionnalité est bien accessible.
6. Je vérifie que le comportement est celui voulu sur https://int.mypeg.fr.

#### Côté backend

Si comportement OK

7. Je push le code sur la branche main
8. Je vais sur Heroku peg-prod et je déploie le code --> vérifier que le build est OK
9. L'application backend est ainsi déployée est accessible via https://api.mypeg.fr

### Côté frontend

10. Je push le code sur la branche main
11. Le code est automatiquement déployé sur Vercel sur l'environnement d'intégration disponible via https://app.mypeg.fr. Comme celui-ci a dans ses variables d'environnement l'information qu'il doit aller regarder sur https://api.mypeg.fr, et que celle-ci contient bien le nouveau code, la nouvelle fonctionnalité est bien accessible.
12. Je vérifie que le comportement est celui voulu sur https://app.mypeg.fr.


## Remarques au 10/03/2026

* Sur Heroku, application peg-int, le repository connecté n'est plus peg_strapi --> tu as dû le changer et brancher à PEB_BACKEND, mais celui-ci n'est plus d'actualité
* Des variables d'environnement sur Heroku peg-int sont présentes mais que je n'ai pas ajoutées moi