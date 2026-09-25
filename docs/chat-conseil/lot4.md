# Chat Conseil — Lot 4 : clôture après une commande issue du chat + statistiques

> Branche `feat/chat-conseil-lot4` (front PEG_FRONTEND et peg_strapi). Contrat : `CONTRACT.md` §2.1, §2.2, §2.3,
> §2.4, §2.5, §3.4, §4 (lignes lot 4), §5 (I3–I6, I11), §6, §7, §8.

## Ce que fait le lot

Quand une commande contient **au moins un article ajouté depuis une offre du chat** (bouton « Ajouter au panier »
du chat, récapitulatif de personnalisation, ou fiche produit ouverte depuis le chat), le paiement réussi fait
**s'ouvrir le chat tout seul** sur un remerciement **écrit par le serveur** ; la conversation est ensuite
**verrouillée** (« Conversation terminée — merci pour votre commande. » + bouton « Nouvelle question »).
Les admins voient dans `/admin/ia/chatbot` les commandes et le CA HT issus de l'assistant, et un badge
« Commande » sur les conversations conclues dans l'historique.

Aucune commande issue du chat → rien ne change (aucun appel réseau, aucun enregistrement).

## Serveur (peg_strapi)

| Fichier | Rôle |
|---|---|
| `src/api/order-item/content-types/order-item/schema.json` | nouveau champ `chatConversationId` (string ≤ 64) |
| `src/services/chat-closing-text.ts` | module **pur** (testé par `node --test`) : `isConversationId`, `sanitizeClosingBody`, `closingItemFromOrderItem`, `closingList`, `closingReply`, `aggregateChatOrders`, `parseJsonColumn` |
| `src/services/chat-closing.service.ts` | `closeConversationAfterOrder(ctx, pool)` et `chatOrderStatsReport(pool)` (le pool pg du chatbot est passé par le contrôleur) |
| `src/api/chatbot/routes/chatbot.ts` | `POST /chatbot/closing` (`chatbot.closeAfterOrder`), `GET /chatbot/stats/orders` (`chatbot.chatOrderStats`), `auth: false` |
| `src/api/chatbot/controllers/chatbot.ts` | import ; 2 `ALTER TABLE chat_history` (`closed_at`, `closing`) dans `initChatbotTables` ; `closedAt` dans `getHistory` / `getConversation` ; 2 handlers minces en fin d'export |
| `src/__tests__/chatClosingText.test.ts` | 23 tests |

### `POST /api/chatbot/closing`
- Corps `{ conversationId, orderItemDocumentIds (1..30), mode: 'card' | 'deferred' }`.
- JWT vérifié dans le service (compte non bloqué) ; **aucun identifiant de confiance** : les articles lus sont ceux
  dont `documentId ∈ ids`, `customer.documentId` = client du porteur du jeton ET `chatConversationId = conversationId`.
  Aucun projet exigé (le webhook Stripe peut ne pas être passé).
- 200 `{ result: true, reply, conversationId, order: { items, totalHT } }` — le texte est ajouté à
  `chat_history.messages`, `closed_at = NOW()`, `closing = { mode, orderItemDocumentIds, items, totalHT, at, reply }`,
  `meta.closed = true`, filtré `conversation_id` + `user_id = customer.documentId`.
- Idempotent : même commande déjà close → même `reply` (relu dans `closing`), rien n'est ajouté. Une conversation
  absente de l'historique de ce client n'est **jamais créée** (la paire conversation/client sert de preuve aux stats).
- 200 `{ result:false, reason:'not_found' | 'not_customer' }` ; 400 « Requête invalide » ; 401 « Connectez-vous »
  (jeton absent/invalide uniquement) ; 500 en cas d'erreur inattendue (le widget affiche alors son repli).

### `GET /api/chatbot/stats/orders` (admin, `requireAdmin`)
`{ result: true, stats: { allTime, last30Days, closedConversations, computedAt } }`, chaque période =
`{ orders, items, revenueHT, conversations }`. Un article compte si sa conversation est valide, son projet existe et
n'est pas annulé, et la paire (conversation, client) figure dans `chat_history` (un client peut écrire n'importe quel
`chatConversationId` sur ses articles : `order-item.create` lui est accordé). `orders` = factures distinctes (première
facture du projet, sinon l'article). Lecture ORM paginée 200/page (5 000 max), cache mémoire 60 s.

## Front (PEG_FRONTEND)

| Fichier | Rôle |
|---|---|
| `src/components/template/chat/chatTrace.ts` | `chatUserKey`, `conversationForOffer`, `chatTraceFor`, `currentChatConversationId`, mémoire des articles créés avec leur conversation |
| `src/components/template/chat/chatClosing.ts` | types du contrat, `prepareChatClosing`, `announceChatClosing`, verrou, `requestChatClosing` (fetch direct, 8 s) |
| `src/components/template/chat/useChatClosing.ts` | hook du widget : traite une clôture ANNONCÉE (montage + événement `peg:chat-closing`), `locked` |
| `src/components/template/chat/ChatClosedBar.tsx` | remplace la saisie d'une conversation close |
| `src/services/ChatTraceServices.ts` | `createOrderItemWithTrace` (repli sans le champ, comme `fetchBannerGraphQL`), `apiGetChatOrderStats` |
| `src/views/app/admin/chatbot/ChatOrderStats.tsx` | 3 tuiles (masquées si la route n'existe pas) |
| `src/@types/cart.ts` | `CartItem.chatConversationId?` |
| `ChatOfferAction.tsx`, `ShowProduct.tsx` | la conversation de l'offre est posée sur l'article au moment de l'ajout |
| `PaymentContent.tsx` | création des order-items via `createOrderItemWithTrace` ; `prepareChatClosing` après création ; `announceChatClosing` après le succès du paiement différé |
| `Success.tsx` | `announceChatClosing(userKey, ids payés)` ; dans le `catch`, sans filtre |
| `ChatWidget.tsx` | `useChatClosing` ; `sendText` bloqué si verrouillé ; `ChatClosedBar` à la place de la saisie |
| `ChatbotPage.tsx`, `ChatbotServices.ts` | tuiles de stats, badge « Commande », `closedAt` |

Déroulé : ajout au panier → `CartItem.chatConversationId` (conversation lue dans `sessionStorage`
`peg_chat_widget_v2:<userKey>`) → order-item créé avec le champ (noté en mémoire si le serveur l'accepte) →
`prepareChatClosing` écrit `peg_chat_closing_v1:<userKey>` (non annoncé) → Stripe → Success → `announce(ids)` → le
widget appelle `POST /chatbot/closing`, s'ouvre, ajoute le remerciement (ou bascule sur la conversation de la commande)
et pose `peg_chat_locked_v1:<userKey>`. « Nouvelle question » = `resetConversation()` : nouvel identifiant → verrou
levé et clé effacée. Réponse `result:false` / 4xx → rien ; erreur réseau / 5xx / délai → remerciement de repli local
+ verrou. Une clôture non annoncée (paiement annulé) est écrasée au paiement suivant et ignorée après 2 h.

Téléphone (< 768 px) : la barre de fin prend toute la largeur, bouton en pleine largeur, marge de la barre d'accueil
de l'iPhone. Bureau et tablette : seule la zone de saisie d'une conversation close change.

## Environnement
Aucune variable nouvelle.

## Ordre de déploiement
1. **Strapi d'abord** (int → prod) : Strapi crée la colonne `order_items.chat_conversation_id`, le démarrage ajoute
   `chat_history.closed_at/closing`. Vérifier : `POST /api/chatbot/closing` sans jeton → 401 ;
   `GET /api/chatbot/stats/orders` sans jeton → 401.
2. Front ensuite. **Front avant back** : la création d'article est rejouée SANS `chatConversationId` (erreur GraphQL
   détectée, mémorisée pour la session) — la commande part normalement ; aucune clôture (404 ignoré) ; tuiles masquées.
   Aucune erreur visible.

## Libellés (exacts)
- Serveur : « Merci {Prénom} ! » / « Merci ! » ; « Votre commande est validée : {liste} — en cours de fabrication. » ;
  « Votre commande est enregistrée : {liste} — elle part en fabrication. » ; « Votre logo et votre personnalisation sont
  transmis à l'atelier. » / « Votre personnalisation est transmise à l'atelier. » ; « Il reste votre logo à nous
  transmettre : déposez-le dans l'onglet « Fichiers client » du projet. » ; « Je vous préviens le jour de l'expédition 📦 ».
- Repli : « Merci pour votre commande ! Elle est bien enregistrée. Je vous préviens le jour de l'expédition 📦 »
- Verrou : « Conversation terminée — merci pour votre commande. » + « Nouvelle question ».
- Admin : « Commandes issues de l'assistant », « CA HT issu de l'assistant », « Conversations conclues par une
  commande », « 30 derniers jours : … », badge « Commande ».

## Tests
- Strapi : `node --test src/__tests__/chatClosingText.test.ts` (23).
- Front : `chatTrace.test.ts`, `chatTraceServices.test.ts`, `chatClosing.test.tsx` (22).

## Paragraphe proposé pour CLAUDE.md

```
## 🧾 Chat — clôture après une commande issue du chat (ajout 26/09/2026)

- Un article ajouté au panier depuis une offre du chat porte `CartItem.chatConversationId` (conversation lue AU MOMENT
  de l'ajout dans `sessionStorage` `peg_chat_widget_v2:<userKey>`), recopié sur `order-item.chatConversationId` par
  `createOrderItemWithTrace` (`ChatTraceServices.ts`) — repli sans le champ si le serveur ne le connaît pas.
- Après paiement (page Success, ou succès du paiement différé), `announceChatClosing` → le widget appelle
  `POST /api/chatbot/closing` (JWT + propriété + conversation vérifiés, texte ÉCRIT PAR LE SERVEUR — `chat-closing-text.ts`),
  s'ouvre tout seul, conversation verrouillée (`peg_chat_locked_v1`) jusqu'à « Nouvelle question ».
- `chat_history.closed_at` fait foi (la colonne `meta` est réécrite à chaque tour) ; `closing` garde texte et articles.
- Stats admin `GET /api/chatbot/stats/orders` : un article ne compte que si la paire (conversation, client) existe dans
  `chat_history` et que son projet n'est pas annulé (`order-item.create` est ouvert aux clients).
- ⚠️ Ne JAMAIS mettre `chatConversationId` dans une requête GraphQL hors `createOrderItemWithTrace` (champ inconnu = 400
  qui ferait échouer la commande). Le widget ne fait AUCUN appel au montage sans clôture annoncée.
- Ordre de déploiement : Strapi d'abord ; front avant back = commande normale, pas de clôture, tuiles masquées.
```

## Termes proposés pour GLOSSARY.md
- **Commande issue de l'assistant** : commande dont au moins un article a été ajouté au panier depuis une offre du chat.
- **Conversation conclue (par une commande)** : conversation du chat close après le paiement d'une commande issue de
  l'assistant (remerciement écrit par le serveur, badge « Commande » dans l'historique admin).
- **Nouvelle question** : bouton qui ouvre une nouvelle conversation après une conversation conclue.

## Écarts et points ouverts
Voir le compte rendu du lot (résultat structuré) — résumé :
- `PaymentContent.tsx` : import `apiCreateOrderItem` retiré (devenu inutilisé → erreur ESLint `no-unused-vars`).
- Service de clôture : une **seconde** commande issue de la même conversation (deux offres) reçoit son propre
  remerciement (le contrat ne prévoyait que « déjà close → même texte ») ; `closing` contient en plus `reply`.
- Tuile « Conversations conclues par une commande » : valeur = `closedConversations`, sous-titre 30 jours =
  `last30Days.conversations` (conversations ayant mené à une commande validée sur 30 jours).
- Limites acceptées : offre sortie des 40 derniers messages conservés → article non tracé ; clôture repliée si le
  widget est démonté pendant la requête.
- ESLint (règle `prettier/prettier` seulement, fichiers déjà très loin de Prettier) : `ChatWidget.tsx` +36 erreurs,
  toutes dues au bloc de saisie enveloppé par `{closing.locked ? … : (<> … </>)}` SANS réindentation (imposé par le
  contrat §4.3, pour ne pas entrer en conflit avec les lots 2 et 3) ; `ChatOfferAction.tsx` +1 (la ligne insérée suit
  l'indentation de ses voisines, déjà signalées). Aucune autre règle touchée ; les autres lignes insérées sont au
  format Prettier. L'intégrateur peut réindenter le bloc de saisie une fois les lots fusionnés.
