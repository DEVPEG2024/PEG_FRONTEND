# Chat Conseil — Lot 3 : personnalisation guidée par l'assistant

> Contrat : `CONTRACT.md` §2.4, §2.5, §3.3, §4, §7 (lot 3). Branches : `feat/chat-conseil-lot3`
> (front et Strapi). Rien en base : le brouillon vit dans le navigateur.

## 0. En bref

Après une offre chiffrée dans le chat, l'assistant remplit **avec le client** le formulaire de
personnalisation du produit (texte à broder, couleur du fil, logo…). Le brouillon est tenu par
le widget, renvoyé à chaque message et **revalidé intégralement par le serveur** contre le
formulaire réel du produit. Les clics (options, 📎, logo déjà transmis, « Passer »…) reçoivent
une réponse **écrite par le serveur, sans appel au modèle**. Au bout : un récapitulatif
« Votre personnalisation » et un bouton « Ajouter au panier » qui met l'article au panier avec
une réponse `state: 'submitted'` (ou `'pending'` si le logo est envoyé plus tard) et
`metadata.source: 'assistant'`.

## 1. Serveur (peg_strapi)

| Fichier | Rôle |
|---|---|
| `src/services/chat-form-text.ts` (pur, `import type` seulement) | Extraction des champs (miroir de `WizardShowForm` : clé `c.id ?? c.key`, conteneurs, signature/caché/bouton/contenu exclus, liste sans options exclue), validation champ par champ (tableau §3.3), brouillon (`sanitizeDraft` ≤ 32 Ko, `revalidateDraft`), coordonnées (`contactPrefill`), ordre des questions (`nextField`), `buildAnswerData` (défauts de la fiche), `buildRecap`, `interpretProposalReply`, textes (`questionText`, `stepText`), outil (`applyToolArgs`, `toolResult`, `formContext`), `widgetSupportsForm`. |
| `src/services/chat-form.service.ts` | Orchestration d'un tour : `openFormRun(formDraft, formInput, deps)` → `inputTurn` (clic : réponse serveur), `systemMessage` (« PERSONNALISATION EN COURS » en fin de contexte), `tools` (`FORM_TOOLS`, paramètres déjà nullables), `runTool`, `serverStep` (récapitulatif / coordonnées écrits par le serveur), `afterOffer` (suite après une offre), `finalTurn`. Logos « Mes fichiers » (`client-file` du client, `visibleToCustomer`, taille Ko → octets). Dépendances reçues de chatbot.ts (aucun import croisé) : `customer`, `style`, `loadProduct` (= `fetchVisibleProducts(..., { withForm: true })`), `pricing` (`SHIPPING_HT`, `TVA_RATE`), `trustedHosts`, `conversationId`. |
| `src/api/chatbot/controllers/chatbot.ts` | Insertions aux seules ancres §4.3 : import (après l.13), puce l.337 « (sauf PERSONNALISATION EN COURS…) », `TOOL_LABELS.remplir_personnalisation`, `AgentResult.form`, branche `formInput` avec retour anticipé (après l.1936 : persistance, `delta` en flux, log `branch: 'form_input'`), consigne poussée en fin de `convo` (après l.1948), outils (l.1984), routage de l'outil (l.2101), récapitulatif serveur (après l.2124), suite d'offre + `form` final (après l.2229), `form` dans le résultat (l.2255), la réponse JSON (l.3022) et l'événement SSE `done` (l.3109). |
| `src/__tests__/chatFormText.test.ts` + `fixtures/chat-form-fixture.json` | 43 tests `node --test` ; fixture commune (copie identique côté front). |

Requête (`/chatbot/chat` et `/chat/stream`) : `formDraft` (envoyé à **chaque** message par le
nouveau widget, `null` sans brouillon) et `formInput` (clic, une seule fois). Réponse :
`form: ChatFormTurn | null` (JSON et SSE `done`). Aucun nouvel événement SSE.

Hôtes de confiance des fichiers : `*.amazonaws.com`, `api.mypeg.fr`, `api-int.mypeg.fr`, les
hôtes de `API_URL` / `PUBLIC_URL` / `STRAPI_URL` ; `localhost` / `127.0.0.1` (http) hors
production seulement. Le modèle ne peut jamais fournir un fichier (seul un envoi par 📎 ou un
logo « Mes fichiers » en est un).

## 2. Front (PEG_FRONTEND)

| Fichier | Rôle |
|---|---|
| `src/components/template/chat/chatFormTypes.ts` | Format filaire (identique au serveur). |
| `src/components/template/chat/chatForm.ts` | Vérification de tout ce qui vient du réseau ou du stockage (`parseChatFormTurn`), stockage `sessionStorage['peg_chat_form_v1:<conversationId>']`, `ChatFormChannel` (brouillon courant, clic consommé une fois), offre du récapitulatif `<offre>-perso` (`recapOfferOf`), réponses par produit (`answersForMessage`), trombone (`attachAskOf`), trace de l'assistant (`isAssistantFilled`, `keepAssistantMetadata`). |
| `src/components/template/chat/useChatForm.ts` | Hook du widget : `requestFields`, `acceptTurn`, `recapOffer`, `answersFor`, `onOfferChange`, `act`, `canAttach` / `attachAsk`. Brouillon relu à chaque changement de `conversationId` (nouvelle conversation, autre compte, clôture). |
| `src/components/template/chat/ChatFormTurnView.tsx` | Sous la réponse : proposition, coordonnées, boutons de la question (options exactes, choix multiple + « Valider la sélection », 📎, logos, « Je l'enverrai plus tard », « Passer »), « Voir le récapitulatif », carte « Votre personnalisation » + « Modifier ». Styles `pcf-*` propres (CSS du widget intouché), boutons de 40 px et récapitulatif en colonne sous 768 px. |
| `src/components/template/chat/ChatAttachButton.tsx` | Téléversement réel (`apiUploadFile`, comme la fiche) : bouton « 📎 Joindre un fichier » sous la question et trombone dans la zone de saisie. « Envoi de « {nom} »… » / « L'envoi de « {nom} » a échoué. Réessayez. » |
| `src/components/template/chatOffer.ts` (propriétaire unique) | `ChatPrefill.answer` / `openForm` ; `planOffer(offer, { answers })` : ligne prête → `formAnswer` = réponse du chat, ligne à finaliser → `prefill.answer` ; `readChatPrefill` écarte une réponse mal formée. `pendingFormAnswer` / `personalizationStatus` inchangés. |
| `ChatWidget.tsx`, `ChatOfferAction.tsx`, `ShowProduct.tsx` | Insertions aux ancres §4.3 (imports, `Message.form`, `ChatResult.form`, `done.form`, hook, `...chatForm.requestFields()`, `acceptTurn` + offre du récapitulatif, `updateOffer` → `onOfferChange`, vue sous la réponse, `formAnswers`, trombone ; `formAnswers` → `planOffer` ; effet `chatPrefill` : réponse reprise, `openForm` → étape formulaire). |
| `WizardShowForm.tsx` | `export` devant `extractFields` et `buildGroups` (rien d'autre). |
| `PersonalizeDialog.tsx` | La soumission garde `metadata.source` / `filledAt` / `conversationId` de la réponse précédente. |
| `ShowOrderItem.tsx` | Badge « Rempli avec l'assistant » si `metadata.source === 'assistant'` **et** `metadata.filledAt`. |

Tests : `chatForm.test.ts` (18), `chatFormTurnView.test.tsx` (13, dont 2 parcours dans le vrai
widget), `chatFormParity.test.ts` (4), `chatOfferForm.test.tsx` (9 : `ChatOfferAction`, parcours
récapitulatif → panier dans le widget, fiche produit ouverte par « Modifier », pop-up du panier,
badge de la commande).

## 3. Environnement

Aucune variable nouvelle. Le serveur lit `API_URL` / `PUBLIC_URL` / `STRAPI_URL` (déjà
présentes) pour les hôtes de fichiers et `NODE_ENV` pour exclure `localhost` en production.

## 4. Ordre de déploiement

**Strapi d'abord**, puis le front (ordre général du contrat). Les deux fenêtres sont sans risque :

- **Front avant Strapi** : le serveur ignore `formDraft` / `formInput` et ne renvoie pas `form` →
  rien ne s'affiche, le chat fonctionne comme avant.
- **Strapi avant front** : l'ancien widget n'envoie pas `formDraft` → le serveur ne crée aucun
  brouillon et n'ajoute ni proposition ni question (`widgetSupportsForm`). Sans cette règle, les
  clients auraient lu « Je remplis la personnalisation avec vous ? » sans bouton pendant
  l'intervalle.

## 5. Libellés (§7)

Proposition « Je remplis la personnalisation avec vous ? » · « Oui, remplissons-la » ·
« Plus tard » ; question ouverte (Conseil / après « oui ») « Préparons votre personnalisation
ensemble : décrivez-moi ce que vous souhaitez ({indices}), je remplis la fiche pour vous. »
(Rapide : « Décrivez votre personnalisation ({indices}). ») ; fichier « {libellé} : joignez le
fichier avec 📎, choisissez un logo déjà transmis, ou envoyez-le plus tard. » · « 📎 Joindre un
fichier » · « Utiliser ce logo » · « Je l'enverrai plus tard » ; coordonnées « J'ai repris vos
coordonnées : … C'est bon ? » · « C'est bon » · « Modifier » ; « Passer » · « Valider la
sélection » · « Voir le récapitulatif » ; textes envoyés au clic : libellé de l'option ·
« 📎 {nom} » · « Logo : {nom} » · « Je l'enverrai plus tard » · « Passer » · « C'est bon » ·
« Je veux modifier mes coordonnées » · « Voir le récapitulatif » · « Oui, remplissons-la » ·
« Plus tard » ; refus « Je n'ai pas pu retenir « {valeur} » pour « {libellé} » : {raison}. » ;
« Pas de souci : vous pourrez la compléter depuis le panier. » ; « Voici le récapitulatif de
votre personnalisation 👇 » (+ « Votre logo reste à envoyer depuis le panier. ») ; carte
« Votre personnalisation », « — », « À envoyer depuis le panier », « Modifier » ; admin
« Rempli avec l'assistant ».

Textes serveur que §7 ne fixe pas : « Cette personnalisation n'est plus disponible ici : vous
pourrez la compléter depuis le panier. » (clic sur un brouillon disparu) ; question d'un champ
saisi « {libellé} (facultatif) ? » (Rapide) / « {libellé} (facultatif) : que souhaitez-vous ? »
(Conseil), « (plusieurs choix possibles) » pour un choix multiple ; préfixe « C'est noté. »
après une valeur retenue ; fichier sans logo déjà transmis : « {libellé} : joignez le fichier
avec 📎, ou envoyez-le plus tard. ».

## 6. Paragraphe proposé pour CLAUDE.md

> ### ✍️ Chat — personnalisation guidée (Chat Conseil, lot 3)
> Après une offre, l'assistant remplit avec le client le formulaire de personnalisation du
> produit. **Brouillon dans le navigateur** (`sessionStorage peg_chat_form_v1:<conversationId>`),
> renvoyé à chaque message (`formDraft`, null sans brouillon) et **revalidé par le serveur**
> contre le formulaire réel (`chat-form-text.ts`, pur, testé). « Le modèle propose, le code
> décide » : outil `remplir_personnalisation`, options exactes, dates réelles, fichiers
> **téléversés chez PEG seulement** (le modèle ne fournit jamais de fichier). Un clic part en
> `formInput` et reçoit une réponse **écrite par le serveur, sans IA**. Réponses rangées comme la
> fiche (`WizardShowForm`, clé `c.id ?? c.key`) — fixture commune front/Strapi
> `chat-form-fixture.json` (copies identiques, `cmp`). Récapitulatif → offre `<offre>-perso` →
> panier avec `state: 'submitted'` (`'pending'` si logo plus tard) et `metadata.source:
> 'assistant'` + `filledAt` (badge « Rempli avec l'assistant » sur la commande). « Modifier »
> ouvre la fiche sur le formulaire pré-rempli (`ChatPrefill.answer` / `openForm`). ⚠️ Ne jamais
> recalculer les tarifs dans `chat-form.service.ts` (constantes passées par chatbot.ts). ⚠️
> `pendingFormAnswer` porte déjà `source: 'assistant'` SANS `filledAt` : ne pas s'en servir
> pour le badge. Ordre de déploiement indifférent (Strapi d'abord recommandé).

## 7. Termes proposés pour GLOSSARY.md

- **Personnalisation guidée** : formulaire de personnalisation rempli dans le chat avec
  l'assistant (≠ « Personnaliser » depuis le panier).
- **Récapitulatif de personnalisation** : carte « Votre personnalisation » du chat, avant
  l'ajout au panier.
- **Rempli avec l'assistant** : badge d'une commande dont la personnalisation a été remplie
  dans le chat.

## 8. Écarts au contrat (et pourquoi)

1. **`formDraft` envoyé à chaque message** (null sans brouillon) au lieu de « tant qu'un
   brouillon existe » : c'est le signal qui évite une proposition sans bouton à un ancien widget
   (§4). Le serveur traite `null` comme « pas de brouillon ».
2. **Ouverture du tour à l'ancre « après l.1936 »** : la revalidation du brouillon a lieu là
   (la branche `formInput` en a besoin) ; seule la consigne est poussée à l'ancre « après l.1948 ».
3. **Offre chiffrée alors qu'un brouillon existe** : « un seul brouillon à la fois » appliqué
   ainsi — un brouillon `filling` est conservé (son offre suit si le même produit est rechiffré) ;
   un brouillon `proposed` (sans réponse) ou `review` (récapitulatif déjà montré, conservé dans
   son message) est remplacé par celui de la nouvelle offre.
4. **`PersonalizeDialog`** : la ligne modifiée est la l.112 (`onSubmit`), le contrat dit l.111
   (fichier mono-lot). `conversationId` est conservé en plus de `source` / `filledAt`.
5. **`readChatPrefill`** (propriétaire unique de `chatOffer.ts`) écarte une `answer` mal formée
   relue de l'historique de navigation.
6. **Boutons d'un ancien message** : retirés (pas seulement inactifs) ; la carte du
   récapitulatif reste lisible, « Modifier » inactif.
7. **Tests** : `chatOfferForm.test.tsx` couvre aussi `ShowProduct`, `PersonalizeDialog` et
   `ShowOrderItem` ; il importe `@/store` EN PREMIER (cycle d'imports préexistant cartSlice →
   store de la fiche → `@/store` : commencé par cartSlice, le store de l'application se
   construit sans panier).

## 9. Limites connues / points ouverts

1. **« Modifier » puis retour dans le chat** : l'offre du récapitulatif passe en
   `status: 'completing'` (mécanisme existant) ; `ChatOfferAction` affiche alors ses libellés
   existants « Plus qu'une étape sur la fiche : choisir la taille ou la couleur manquante. » /
   « Finaliser {produit} » (hors de mes ancres, texte inexact dans ce cas). « Finaliser » ajoute
   la version du chat directement (un seul ajout). Dès que la fiche a mis l'article au panier,
   l'offre passe à « Dans votre panier » : pas de second ajout. À l'intégrateur : libellé dédié
   si souhaité.
2. **Après « Modifier », re-valider le formulaire sur la fiche** remplace `metadata` par `{}`
   (`ShowProduct.handleFormSubmit`, hors ancre) : plus de badge. Aller directement au
   « Récapitulatif » (réponse déjà complète) conserve la trace.
3. **Doublon possible par l'utilisateur** : l'offre d'origine et l'offre `<id>-perso` (ou deux
   récapitulatifs successifs) restent chacune cliquables, comme toute offre du chat aujourd'hui.
   L'ajout de l'offre d'origine termine le brouillon, pas les récapitulatifs déjà affichés.
4. **Envoi d'un fichier pendant une requête en cours** : refusé proprement (message d'échec,
   rien n'est rejoué avec le message suivant).
5. Clés de réponse `c.id ?? c.key` (comme `WizardShowForm`) alors que la vue admin Formio lit par
   `key` : incohérence PRÉEXISTANTE (§8-14), non corrigée.
