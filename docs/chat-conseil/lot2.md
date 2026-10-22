# Chat Conseil — Lot 2 : style de réponse ⚡ Rapide / 💬 Conseil

> Branche `feat/chat-conseil-lot2` (front ET Strapi). Contrat : `CONTRACT.md` §2.3, §2.4, §2.5, §3.2, §4.3, §6, §7.

## Ce que fait le lot

Le client choisit comment l'assistant lui répond :

| Style | Valeur filaire | Effet serveur |
|---|---|---|
| ⚡ Rapide | `quick` | **Aucun** — prompt système identique octet pour octet à avant (cache de prompt compris). |
| 💬 Conseil | `advice` | Bloc `ADVICE_GUIDANCE` ajouté au prompt système : 2 à 5 lignes, ton chaleureux, s'intéresse au projet (occasion, date, quantité, logo), UNE question à la fin, au plus UNE suggestion complémentaire par conversation. Il **prime** sur les consignes de longueur/ton/format (y compris celles du prompt enregistré dans `/admin/ia/chatbot`), **jamais** sur les règles de données (outils, liens et cartes exacts, HT/TTC, ne rien inventer, contact PEG). |

- **Choix** : à la 1re ouverture, dans la bulle d'accueil (« Comment préférez-vous que je vous réponde ? » + deux boutons avec leur indication).
- **Bascule** : dans l'en-tête du chat, à gauche du bouton voix — « ⚡ Rapide » / « 💬 Conseil » sur ordinateur et tablette tant que la conversation est vide, **emoji seul** sur téléphone (< 768 px) et, sur ordinateur, dès que la conversation a commencé ; libellé accessible complet (`aria-label` = `title`) dans tous les cas. Raison (relecture du 26/09, mesurée dans Chromium) : avec « Nouvelle conversation » en plus du micro et de la fermeture, le libellé complet ne laissait qu'≈ 70 px au titre dans la fenêtre de 400 px (« Assistant PEG » sur deux lignes, statut d'outil tronqué) ; en emoji seul il en garde ≈ 136 (il lui en faut ≈ 111). Tant que la bascule est affichée, le titre reste sur une ligne (ellipse — cas du téléphone de 360 px, ≈ 96 px) : règle portée par la feuille de style de `ChatStyleToggle`, `CHAT_CSS` intact.
- **S'il écrit sans choisir** → Conseil, envoyé et retenu (les boutons d'accueil disparaissent avec la conversation).
- **Mémorisation** : par compte et par appareil — `localStorage['peg_chat_style:<user.documentId>']` = `'quick' | 'advice'`. Deux comptes sur le même appareil sont indépendants ; une valeur inconnue est ignorée ; stockage bloqué toléré (le choix vaut alors pour la session).
- **Visiteur non connecté** : ni question, ni bascule, ni style envoyé ; le serveur l'ignorerait de toute façon (`styleGuidance(…, { authenticated: false }) === ''`).

## Serveur (Strapi)

- **Nouveau** `src/services/chat-style.ts` (module pur, aucun import) : `ChatStyle`, `CHAT_FEATURES = ['style']`, `parseChatStyle(raw)` (seul `'advice'` exact → Conseil, tout le reste → Rapide), `ADVICE_GUIDANCE`, `styleGuidance(style, { authenticated })`.
- `src/api/chatbot/controllers/chatbot.ts` (insertions aux ancres du contrat §4.3, rien d'autre) :
  - import après `voice-text` ;
  - `const style = appliedChatStyle(parseChatStyle(input.ctx?.request?.body?.style), { authenticated: !!customer });` après `loadKnowledge` — signature de `runCustomerAgent` et déstructurations des contrôleurs **inchangées** ;
  - `systemContent` : `… + accountContext(customer, origin) + styleGuidance(style, { authenticated: !!customer }) + knowledge.faqsContext + …` — le bloc suit le STABLE et précède le VARIABLE (préfixe stable par style) ;
  - `meta.style` (style APPLIQUÉ, pas celui demandé) → ligne `chat_history.meta` et log `chatbot agent {…}` (mesurer l'usage de chaque style) ;
  - SSE `open` : `{ model, features: CHAT_FEATURES }`. Route JSON : rien de nouveau.
- `appliedChatStyle(style, { authenticated })` : style réellement appliqué (Conseil seulement pour un client identifié par son jeton). C'est lui que porte `meta.style` — session expirée (le widget envoie encore `advice`) ou compte sans fiche client = `quick` dans `chat_history.meta` et le log, puisqu'aucune consigne n'est ajoutée.
- Requête `POST /chatbot/chat` et `/chatbot/chat/stream` : champ ajouté `style?: 'quick' | 'advice'` (absent/inconnu → `quick`).
- Test : `src/__tests__/chatStyle.test.ts` (`node --test`) — `parseChatStyle`, Rapide = chaîne vide (prompt inchangé), Conseil connecté (PRIME, 2 à 5 lignes, UNE seule question, au plus UNE suggestion, règles de données, aucun lien), Conseil anonyme = `''`, style appliqué (`appliedChatStyle`, cohérent avec les consignes ajoutées), et branchement dans `chatbot.ts` (ordre du prompt, `features` dans `open`, `style` dans `meta`) par lecture du source.
- Aucune table, aucune colonne, aucune variable d'environnement, aucune permission.

## Front

- **Nouveaux** (`src/components/template/chat/`) :
  - `chatStyle.ts` — clés, `CHAT_STYLE_LABELS`, `STYLE_WHEN_UNCHOSEN = 'advice'`, `readChatStyle`, `saveChatStyle`, `noteChatServerFeatures` (appelé sur `open`), `chatStyleSupported()` (`null` = inconnu → optimiste), plus deux aides : `otherChatStyle` et `subscribeChatServerFeatures` (abonnement pour que le widget se re-rende dès l'annonce du serveur) ;
  - `useChatStyle.ts` — `{ style, supported, choose, toggle, forRequest }` ; `forRequest()` renvoie le style à envoyer, enregistre Conseil si rien n'est choisi, renvoie `undefined` si le serveur n'a pas les styles ou sans compte ;
  - `ChatStyleChooser.tsx` (bulle d'accueil) et `ChatStyleToggle.tsx` (en-tête) — chacun porte ses styles (`pcw-style-*`), `CHAT_CSS` n'est pas touché ; les boutons d'accueil passent l'un sous l'autre quand la place manque.
- `ChatWidget.tsx` — insertions aux seules ancres du lot 2 : imports ; `open` → `noteChatServerFeatures` ; `const chatStyle = useChatStyle(user?.documentId)` ; `requestStyle` + `...(requestStyle ? { style } : {})` dans le corps ; bascule dans l'en-tête ; bulle de choix après `.pcw-intro`.
- **Serveur sans styles** : `sessionStorage['peg_chat_features_v1']` = `string[]` annoncé par `open`. Sans `features` → `[]` → bascule et bulle masquées, `style` n'est plus envoyé. Rien d'annoncé (route JSON de repli, onglet neuf) → inconnu → affichées et envoyées (sans effet sur un vieux serveur).
- Test : `src/__tests__/chatStyle.test.tsx` (jsdom) — clés par compte, valeur inconnue, stockage bloqué, annonces du serveur, libellés exacts, bulle d'accueil (clic → enregistré, boutons effacés), envoi sans choix → `advice` enregistré, bascule → `quick` au message suivant, `open` sans `features` → bascule masquée et plus de `style`, téléphone → emoji seul, ordinateur → libellé complet à l'accueil puis emoji seul dès le 1er message (et retour du libellé après « Nouvelle conversation »), titre de l'en-tête sur une ligne, sans compte → rien.

## Libellés (§7, exacts)

- `quick` : « ⚡ » « Rapide » — « Réponses courtes, droit au but ».
- `advice` : « 💬 » « Conseil » — « Je m'intéresse à votre projet et je vous conseille ».
- Accueil : « Comment préférez-vous que je vous réponde ? ».
- En-tête : « ⚡ Rapide » / « 💬 Conseil » (ordinateur, conversation vide), emoji seul (téléphone, et ordinateur une fois la conversation commencée) ; `aria-label` = `title` = « Style de réponse : Conseil — passer en Rapide » (et inversement).

## Ordre de déploiement

**Strapi d'abord** (avec les autres lots) : rien en base, le démarrage ne change pas. Front déployé avant le back : la bulle et la bascule s'affichent, le style part sans effet, puis tout se masque dès la 1re réponse en flux (l'ancien `open` n'annonce pas `features`). Aucune erreur visible.

À vérifier après déploiement : un tour en Conseil puis un en Rapide ; le log `chatbot agent {… "style":"advice" …}` ; en Rapide, `tokensCached` inchangé par rapport à avant (prompt identique).

## Points d'attention

- ⚠️ Rapide doit rester `''` : toute consigne ajoutée en Rapide changerait le prompt de TOUS les clients existants (et casserait le cache de prompt).
- ⚠️ `ADVICE_GUIDANCE` ne contient aucun lien (`stripUnknownLinks` s'appuie sur le prompt pour conserver les liens connus).
- Le style ne modifie que le serveur : le lot 3 lit lui-même `body.style` (interface I1), sans importer `chat-style.ts`.
- Conseil est plus long : ≈ 300 tokens de prompt en plus par tour et des réponses de 2 à 5 lignes (surveiller `tokensIn` / `tokensOut`).
- Téléphone de 360 px avec micro + « Nouvelle conversation » + fermeture : même en emoji seul, le titre n'a que ≈ 96 px (il lui en faut ≈ 111) → « Assistant P… » sur une ligne (ellipse). Tient en entier dès 375 px (≈ 111 px) et à 390 px (≈ 126 px). Mesures Chromium du 26/09.

## Écarts au contrat (documentés)

- **§7 En-tête** : le contrat prévoit « ⚡ Rapide » / « 💬 Conseil » sur ordinateur. Le libellé complet n'est gardé que tant que la conversation est vide ; dès le 1er message la bascule passe en emoji seul (`compact={isPhone || messages.length > 0}`), `aria-label`/`title` complets inchangés. Raison : relecture du 26/09 (fenêtre de 400 px, titre réduit à ≈ 70 px et sur deux lignes, statut d'outil tronqué). Seule la ligne insérée par le lot 2 (ancre après l.683) change.
- **Titre de l'en-tête** : la règle `.pcw-head .pcw-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` vit dans la feuille de style de `ChatStyleToggle` (présente seulement quand la bascule est affichée) : elle s'applique à un élément dessiné par `ChatWidget`, mais `CHAT_CSS` n'est pas modifié (interdit §4.3).
- **§2.4 Strapi** : `chat-style.ts` exporte en plus `appliedChatStyle(style, { authenticated })`, et la ligne insérée après l.1938 devient `const style = appliedChatStyle(parseChatStyle(…), { authenticated: !!customer });` (même ancre, une seule ligne) pour que `meta.style` journalise le style APPLIQUÉ. `styleGuidance` garde sa signature et son résultat (prouvé par le test de cohérence).
- **§2.5 front** : deux aides en plus dans `chatStyle.ts` (`otherChatStyle`, `subscribeChatServerFeatures`), sans changement des signatures prévues.

## Paragraphe proposé pour CLAUDE.md

> ### 💬 Style de réponse de l'assistant — Rapide / Conseil (ajout 26/09/2026)
> - Le client choisit dans le chat : **⚡ Rapide** (`quick`, comportement historique) ou **💬 Conseil** (`advice`). Choix à la 1re ouverture (bulle d'accueil), bascule dans l'en-tête (emoji seul sur téléphone et dès que la conversation a commencé), **mémorisé par compte et par appareil** (`localStorage peg_chat_style:<user.documentId>`). S'il écrit sans choisir → Conseil. Visiteur non connecté : style ignoré.
> - Envoyé à chaque message (`style` dans `/chatbot/chat` et `/chat/stream`). Serveur : `src/services/chat-style.ts` (pur, testé) ; `styleGuidance()` concaténé APRÈS `accountContext` et AVANT FAQ/documents. **Rapide = chaîne vide = prompt identique octet pour octet** — ne jamais y ajouter de consigne. Conseil (`ADVICE_GUIDANCE`) **prime sur les consignes de longueur/ton** (y compris le prompt enregistré en admin) mais **jamais sur les règles de données**. `meta.style` (style **appliqué** : `quick` si le client n'est pas identifié) dans `chat_history` et le log `chatbot agent`.
> - Détection : SSE `open` = `{ model, features: ['style'] }` ; sans `features` (backend antérieur), le widget masque la bascule et n'envoie plus de style (`sessionStorage peg_chat_features_v1`).
> - Fichiers : front `src/components/template/chat/{chatStyle.ts, useChatStyle.ts, ChatStyleChooser.tsx, ChatStyleToggle.tsx}` ; tests front `src/__tests__/chatStyle.test.tsx`, back `src/__tests__/chatStyle.test.ts`.
> - Ordre de déploiement : Strapi d'abord ; front avant back = sans risque (bascule masquée après la 1re réponse).

## Termes proposés pour GLOSSARY.md

- **Style de réponse** : manière dont l'assistant répond au client dans le chat, choisie par le client. Deux valeurs : **Rapide** (réponses courtes, droit au but) et **Conseil** (l'assistant s'intéresse au projet et conseille). Valeurs techniques `quick` / `advice` — jamais affichées.
- **Rapide** (style de réponse) : ⚡ — réponses courtes ; comportement historique de l'assistant.
- **Conseil** (style de réponse) : 💬 — réponses de 2 à 5 lignes, une question à la fois, conseils tirés des données PEG. Ne pas confondre avec un « devis » ni une « offre ».
