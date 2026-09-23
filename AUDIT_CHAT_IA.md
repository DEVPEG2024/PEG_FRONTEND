# Audit chat & IA de PEG — 23/09/2026

Périmètre : widget client, page admin « Chatbot IA », pages IA admin (images, contenu, agent produit), points d'entrée IA des fiches produit / formulaires / projets, planning IA, backend Strapi (`src/api/chatbot`), peg-backend Express (`routes/planning`), et en annexe l'assistant NOVA.

Méthode : cartographie par 9 lecteurs, 3 tours de recherche sur 8 dimensions (fonctionnement, sécurité, performance, qualité IA, UX, observabilité et coûts, architecture, état de l'art), vérification contradictoire de chaque constat élevé ou critique, puis tests de bout en bout sur l'intégration et la production.

## 1. En bref

**L'IA de PEG a été entièrement hors service du 16/08 au 23/09/2026, soit 38 jours, sans aucune alerte.** Groq a retiré `llama-3.3-70b-versatile` de son palier gratuit. Le code ne lisait aucune variable de modèle en production et masquait toutes les erreurs. Le widget affichait « Je rencontre un souci technique momentané », et les écrans admin échouaient en silence.

Le service est rétabli et modernisé :

| Composant | État |
|---|---|
| Modèle | `openai/gpt-oss-120b` via `GROQ_MODEL` sur peg-int et peg-prod |
| Front (PEG_FRONTEND) | en production (`main` 80bdc8c) |
| peg-backend Express | en production (`vercel --prod`, planning IA vérifié) |
| Strapi | `main` = 0f5269d, **validé sur int (v190)**, **à déployer sur peg-prod** (déploiement manuel) |

Tant que peg-prod n'est pas redéployé, la production répond avec l'ancien code du chatbot. Les appels d'outils y échouent souvent avec le nouveau modèle, et le bot répond alors sans les données du client.

## 2. Mesures

Tests réels sur api-int avec un compte client, et sur la production pour le planning.

| Parcours | Avant (prod, 23/09 16 h) | Après (int v190) |
|---|---|---|
| « Où en sont mes projets ? » | message d'erreur | 1er mot à **0,6 s**, réponse complète en **1,1 s** |
| « Prépare-moi une offre pour 30 vestes » | message d'erreur | 3 appels, **2,3 s**, chiffrage exact (livraison 9,90 € HT, TVA, Premium) |
| Produit absent du catalogue du client | message d'erreur | réponse honnête en **0,85 s**, sans substitution |
| Fonctions IA admin (fiche, formulaire, suggestions, contenu, réécriture) | erreur | **0,8 à 1,4 s**, JSON conforme au schéma |
| Planning IA (prod) | erreur | **1,3 s** |
| Tokens par tour client | 2 550 à 3 500 par appel, jusqu'à 5 appels | ≈ 4 500 pour un suivi de projet, ≈ 7 300 pour une offre |

## 3. Ce qui a été corrigé

### Disponibilité et performance
- **Modèle retiré** : modèle lu dans `GROQ_MODEL` partout (Strapi et Express), défaut `openai/gpt-oss-120b`, raisonnement limité à `low`.
- **Streaming** : nouvelle route `POST /chatbot/chat/stream` (SSE). Le client voit l'outil en cours puis le texte au fil de l'eau. Le widget retombe sur `/chatbot/chat` si la route n'existe pas.
- **Timeouts** : cinq appels admin et le planning gardaient les défauts du SDK (60 s × 3 tentatives, au-delà du H12 Heroku). Bornés à 20 s et 1 retry. Dans la boucle client, le retry SDK doublait la durée : supprimé.
- **Quota Groq** : les réessais rejouaient le même contexte jusqu'à 5 fois et entretenaient les 429. Désormais une attente du délai indiqué, puis un seul essai allégé.
- **Contexte** : FAQ et documents choisis par pertinence et bornés, historique limité à 12 messages, résultats catalogue compacts (12 produits au lieu de 25 fiches complètes), prompt ordonné pour le cache de Groq.

### Fiabilité des réponses
- **Appels d'outils gpt-oss** : le modèle envoie `null` pour un paramètre optionnel et Groq rejetait tout l'appel. Paramètres rendus nullables, un réessai sur `tool_use_failed`.
- **Repli sans outils** : il produisait une réponse vide. Consigne explicite ajoutée, et **aucun chiffrage en mode dégradé**, car un total calculé par le modèle omettait la livraison.
- **Produit substitué** : une « Veste softshell » était présentée et chiffrée comme les t-shirts demandés. Résultat vide explicite et consigne d'interdiction.
- **Recherche catalogue** en cascade (catégorie, nom, singulier, mot-clé) : « t-shirts » passé en catégorie ne trouvait rien.
- **Factures annulées** comptées dans « total dû » et signalées « en retard » : corrigé.
- **Champs de personnalisation** d'un produit : jamais transmis au modèle (JSON Form.io non lu). Corrigé.
- **Sorties JSON admin** : `response_format: json_schema` au lieu d'extraire par regex avec la consigne « sans apostrophes ».

### Écrans cassés
- **Fichiers de référence du chatbot** : la route d'upload n'avait jamais existé côté Strapi. Créée ; le texte des PDF est extrait dans le navigateur.
- **Génération de contenu** : route inexistante, la page affichait du HTML brut et des « points forts » inventés. Route créée.
- **Upload d'avatar, d'images de test et de références** : requêtes sans jeton vers une route disparue, échec silencieux. Passent par l'upload authentifié.
- **Images IA** : le style et la photo de référence étaient ignorés, et l'URL fal.ai, éphémère, était bloquée par la CSP. Style et référence pris en compte, 28 pas au lieu de 50, image copiée sur S3.
- **Historique admin** : une ligne par message au lieu d'une par conversation, et un nombre de caractères affiché comme nombre de messages. Le détail plantait. Corrigé, avec modèle, latence et outils visibles.
- **Page admin** : erreurs invisibles, prompt en cours d'édition écrasé par un ajout de FAQ, aperçu qui ignorait le brouillon. Corrigé.
- **Agent produit** : un référentiel en échec vidait toutes les listes. Corrigé.
- **Codes HTTP** : toutes les erreurs du contrôleur sortaient en 200. Corrigé.

### Widget client
- Les erreurs ne sont plus renvoyées au modèle comme de vrais tours. Bouton « Réessayer » et messages distincts selon la cause.
- Conversation conservée dans l'onglet, rattachée au compte. Bouton « Nouvelle conversation ».
- Rendu des tableaux, listes numérotées et titres que produit le nouveau modèle. Tests unitaires : aucun HTML actif possible.

### Sécurité et exploitation
- **Rate-limit contournable** : un `X-Forwarded-For` inventé donnait un compteur neuf à chaque requête, y compris sur `/auth` et les routes IA payantes. L'IP retenue est maintenant le dernier hop, ajouté par Heroku.
- **Plafond global** de tours anonymes par minute (`CHATBOT_ANON_PER_MINUTE`, 20).
- **Pool Postgres du chatbot** sans gestionnaire d'erreur : une connexion coupée faisait tomber tout Strapi. Corrigé.
- **Secrets de peg-backend** : le `.env` (Stripe, JWT, token Strapi, base de données, Groq) était téléversé dans les sources de chaque déploiement Vercel. Ces sources sont visibles de l'équipe Vercel, pas du public. Exclu désormais.
- **Observabilité** : la seule ligne de log perdait son contenu. Elle contient maintenant branche, outils et arguments, latence, modèle et tokens consommés.

## 4. Décisions pour Nova

1. **Déployer Strapi sur peg-prod.** Dashboard Heroku, onglet Deploy rechargé, branche `main` (0f5269d). Cela n'apporte que les 9 commits chatbot, déjà validés sur int.
2. **Passer Groq au Dev Tier.** Le palier gratuit plafonne à 8 000 tokens par minute pour int et prod réunis. Une offre en consomme environ 7 300 : deux clients simultanés suffisent à saturer. Coût estimé : environ 0,002 € par tour.
3. **Remplacer le prompt système de production** depuis `/admin/ia/chatbot`. Le prompt actuel (avril, environ 9 000 caractères) pose plusieurs problèmes :
   - c'est un copier-coller d'une conversation avec une autre IA, avec deux versions bout à bout et du texte parasite ;
   - il contient des liens fictifs (`[LIEN_CATEGORIE_TEXTILE]`) et un lien vers une preview Vercel protégée ;
   - il interdit les devis, alors que le widget propose « Prépare-moi une offre ».

   Une version nettoyée (annexe A) tourne sur int.
4. **Faire tourner les secrets de peg-backend** si l'équipe Vercel compte des personnes qui ne devraient pas les voir. Les anciens déploiements les contiennent toujours.
5. **Chatbot sur mobile et dans le tunnel de commande.** Il y est masqué volontairement, parce qu'il recouvrait des boutons. Une icône dans l'en-tête permettrait de le proposer sans gêner.

## 5. Non traité dans ce chantier

### NOVA (assistant d'administration, dépôt séparé) — prioritaire
- **Critique** : `POST /execute-tool` exécute n'importe quel outil, y compris `delete_customer`, `delete_invoice` et `send_email`, avec le seul PIN partagé, sans confirmation ni journal. L'exécution se fait en SQL brut sur la base de production.
- **Critique** : `create_user` crée un compte confirmé avec un rôle libre, y compris `admin`, et stocke le mot de passe en clair.
- **Élevé** : 43 outils sur 44 écrivent en SQL brut dans la base de production. Ils contournent la numérotation des factures, les commissions, `pending_paid` et le prix serveur. Les cibles sont désignées par correspondance partielle (`ILIKE`).
- **Élevé** : les états écrits ne correspondent pas aux enums Strapi. Le PIN est accepté en paramètre d'URL sur les routes de debug, hors du verrouillage anti-force brute.
- **Élevé** : les données saisies par les clients arrivent dans le prompt de NOVA sans séparation (injection de prompt).

Correctif recommandé : identité réelle (JWT admin PEG) au lieu du PIN, écritures uniquement via l'API Strapi, confirmation signée côté serveur pour toute écriture. Ces changements modifient l'usage de NOVA, notamment le mode voix : ils demandent l'accord de Nova.

### Dette technique
- Les constantes de prix sont recopiées en cinq endroits (checkout, chatbot, front). Un module partagé et un test d'égalité éviteraient toute divergence.
- Les tables du chatbot sont créées par SQL au démarrage, hors des content-types Strapi.
- `groq-sdk` est en 0.9.1 côté Strapi (courant : 1.6.0). Tout fonctionne en 0.9.1 ; la montée est à faire à froid.
- Le flux de création produit est dupliqué entre la fiche produit et l'agent produit, et a déjà divergé.

## 6. Limites

- 255 pistes de sévérité moyenne ou faible n'ont pas été contre-vérifiées une à une. Aucune piste élevée ou critique n'est restée sans vérification.
- Le widget n'a pas été testé dans un navigateur connecté en client. Le flux SSE, le repli et le rendu ont été vérifiés par appels réels et par tests unitaires.
- La génération d'image n'a pas été relancée après les changements, pour éviter un coût fal.ai. Le code de copie sur S3 est typé et suit la signature du service d'upload de Strapi 5.52.

## Annexe A — Prompt système proposé

```
Tu es l'assistant officiel de PEG, plateforme B2B de produits personnalisés (textile, objets publicitaires, signalétique, supports imprimés), basée en Haute-Savoie / Genève.

Ta mission :
1. Amener le client au produit qui lui convient le mieux, avec le lien direct vers sa fiche produit (fourni par les outils).
2. Répondre à ses questions sur ses projets, commandes, BAT, factures et devis, à partir de ses vraies données.
3. Expliquer le fonctionnement de PEG : le client choisit un produit dans le catalogue (prix affichés selon les quantités), crée son projet, envoie son logo ou son visuel, puis suit l'avancement dans son espace projets.
4. Quand le client demande un prix pour une quantité, donner une estimation chiffrée, uniquement avec l'outil de préparation d'offre. Elle reste indicative : le prix final est celui du panier.

Style :
- Réponses très courtes : 1 à 4 lignes, phrases simples, ton humain et chaleureux, en français.
- Va droit au but. Une seule question à la fois, et seulement si elle est utile.

Interdits :
- Inventer un prix, un délai, une date de livraison ou toute information absente des outils.
- Promettre une livraison, confirmer une production ou une validation finale, modifier une commande.

SAV ou question hors chat : contact@hellonova.fr — 06 59 25 28 23.
```
