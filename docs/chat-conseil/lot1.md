# Chat Conseil — Lot 1 : Expédition

> Branche `feat/chat-conseil-lot1` (front ET Strapi). Contrat : `CONTRACT.md` §2.1, §2.4, §2.5, §3.1, §3.5, §4, §6, §7.

## Ce que fait le lot

- Un projet peut être **marqué « expédié »** par l'admin ou par le **producteur attribué** : transporteur, numéro de suivi (facultatif), date d'expédition (aujourd'hui par défaut, rattrapage jusqu'à 90 jours).
- Le **client est prévenu** au premier marquage (ou si le transporteur / le numéro change) : cloche + push et e-mail « Suivre le colis » / « Voir mon projet ». Une date corrigée ou une annulation ne préviennent personne. En modification, la case « Prévenir à nouveau le client » renvoie cloche et e-mail (rattrapage d'un envoi échoué, signalé par un toast d'avertissement).
- L'en-tête du projet affiche « Expédié le 2 oct. · Colissimo · Suivre le colis » (ordinateur et téléphone). Le client ne voit rien tant que rien n'est expédié.
- L'assistant du chat connaît l'expédition : `mes_projets`, `etat_projet_detaille` et `mes_commandes` renvoient `expedition`, la carte projet du chat affiche « Expédié le 02/10/2026 · Colissimo ».
- **Aucun nouveau statut projet** : `state` est inchangé ; « Expédié » = `shippedAt` renseigné.

## Serveur (Strapi) — commit `d72a15a` (+ retouche de commentaire, + correctifs de relecture)

- **Schéma** `src/api/project/content-types/project/schema.json` : `shippedAt` (datetime), `shippingCarrier` (enum : `colissimo`, `chronopost`, `dpd`, `gls`, `ups`, `dhl`, `fedex_tnt`, `peg_delivery`, `pickup`), `trackingNumber` (string, 64 max). Colonnes créées par Strapi au démarrage, aucune migration.
- **Module pur** `src/services/shipping-text.ts` (aucun import à l'exécution) : transporteurs et libellés, modèles de liens de suivi (le lien est **construit par le serveur**, jamais saisi), `normalizeTrackingNumber` (espaces retirés, majuscules, `^[A-Z0-9-]{4,40}$`), `parseShippedAt` (AAAA-MM-JJ ou ISO, fenêtre [maintenant − 90 j ; maintenant + 1 j] — pour un jour AAAA-MM-JJ, comparée en **jours calendaires de Paris**, exactement ce que propose le dialogue), `resolveShippedAt` (POST : jour inchangé par rapport à l'expédition en base → date d'origine conservée sans revalidation), `toProjectShipping` (résumé en `Europe/Paris`), `shippingForModel`, `shippingCardMeta`, `shouldNotifyShipping` (3e paramètre facultatif `force`), `shippingNotificationTexts`. Exporte en plus `carrierOptions()`, `parisIsoDay`, `parisShortDate`, `SHIPPED_AT_MAX_PAST_DAYS`, `ShippingCaller`, `resolveShippingCaller` (identification de l'appelant, dépendances passées en paramètres) et `withTimeout`.
- **Route** `src/api/shipping/` — `/api/shipping/projects/:documentId`, `auth: false`, JWT vérifié dans le contrôleur (`populate: role, customer, producer`) :

  | Méthode | Accès | Réponse |
  |---|---|---|
  | GET | admin, producteur attribué, client propriétaire | `{ result, shipping, canEdit, carriers? }` (`carriers` seulement si `canEdit`) |
  | POST | admin, producteur attribué | `{ result, shipping, notified: { bell, email } }` |
  | DELETE | admin, producteur attribué | `{ result, shipping }` — champs remis à null, aucune notification |

  401 **uniquement** jeton absent/invalide ou compte introuvable/bloqué — une erreur de la base pendant la lecture du compte répond **500** (sinon une panne passagère déconnecterait tous ceux qui ouvrent un projet) ; 403 autre producteur (« Réservé à l'équipe PEG et au producteur du projet ») ; 404 projet inexistant **ou** client non propriétaire (« Projet introuvable ») ; 400 « Transporteur inconnu » / « Numéro de suivi invalide » / « Date d'expédition invalide » ; 409 « Projet annulé : expédition impossible ». Toutes les réponses par `ctx.send(body, status)`.
- **Service** `src/services/shipping.service.ts` : écriture par `documents('api::project.project').update` (appel interne), notification si `shouldNotifyShipping(prev, next, body.notify === true)` — cloche et e-mail envoyés **en parallèle**, chacun borné à 8 s (`postBell` et `withTimeout` sur Mailjet : la réponse reste loin du H12) :
  - cloche + push : `POST ${EXPRESS_BACKEND_URL}/notifications/event` (`X-Internal-Secret`), `eventType: 'project_status_change'`, destinataires = `user.documentId` des comptes `customer` non bloqués du client, lien `/common/projects/details/<documentId>`, `metadata: { projectId, shipped: true, carrier }` ;
  - e-mail : `sendProjectShippedToClient` (ajoutée à la fin de `src/services/mail.service.ts`, réutilise `wrapHtml`/`buttonHtml`/`infoRow`, renvoie `Promise<boolean>`), e-mails dédoublonnés ;
  - **bac à sable** : cloche ET e-mail seulement si `liveDelivery()` (campagnes : `FRONTEND_URL = https://app.mypeg.fr` ou `CAMPAIGNS_DELIVERY=live`). Sinon `notified = { bell: 'sandbox', email: 'sandbox' }`. Aucun compte client → `skipped` ; aucun e-mail → `noemail` ; échec (y compris SMTP non configuré ou Mailjet au-delà de 8 s) → `failed` (l'expédition reste enregistrée ; le front l'annonce).
- **Garde** `src/index.ts` (nouveau `strapi.documents.use`, entre la garde en écriture et la numérotation des factures) : pour `api::project.project` en `create`/`update`, retire `shippedAt`, `shippingCarrier`, `trackingNumber` de `params.data` quand l'appel HTTP vient d'un utilisateur authentifié **non admin** (REST et GraphQL). Laisse passer la route dédiée (pas de `state.user`), les appels internes et le panel admin Strapi. Fail-open (try/catch + log). Raison : `project.update` est accordé aux producteurs (sans propriété) et aux clients (sur leurs projets).
- **Chat** `src/api/chatbot/controllers/chatbot.ts` (ancres du contrat uniquement) : import ; puce « Où en est ma commande » de `TOOL_GUIDANCE` complétée (« [Suivre le colis](lien_suivi) SEULEMENT si lien_suivi n'est pas null (sinon aucun lien) » : `lien_suivi` vaut null pour Livraison PEG, retrait ou sans numéro) ; `projectCard` → `shippingCardMeta(p)` à la place de « Fin prévue … » ; descriptions de `mes_projets` et `etat_projet_detaille` ; champ `expedition` dans `mes_projets`, `mes_commandes` (via `o.project`) et `etat_projet_detaille`. Le lien de suivi vient du résultat d'outil → `stripUnknownLinks` le conserve.
- Tests : `src/__tests__/shippingText.test.ts` (45 tests, `node --test`), dont les non-régressions de relecture : bornes de date en jours de Paris (demain le matin et la nuit, J−90 l'après-midi), date d'origine conservée en modification, `force`, 401/500 de l'identification, `withTimeout`, consigne conditionnelle du lien de suivi (lecture du source de `chatbot.ts`).

## Front

- **Nouveaux** :
  - `src/@types/shipping.ts` — types filaires (§2.5).
  - `src/services/ShippingServices.ts` — `apiGetProjectShipping`, `apiMarkProjectShipped`, `apiCancelProjectShipping` (REST dédié via `ApiService`, **jamais GraphQL** : un champ inconnu ferait échouer toute la requête).
  - `.../details/components/shipping/useProjectShipping.ts` — lecture au montage ; toute réponse non 200 (route absente, 403, 404, réseau) → barre masquée, jamais d'erreur visible. Dernière réponse gardée **par compte et par projet** (`userKey` = `user.documentId`, passé par `ProjectHeader`) : évite le clignotement sur téléphone quand la carte héros revient au changement d'onglet, sans montrer à un autre compte (déconnexion sans rechargement) les boutons du précédent. Numéro de version par clé : une lecture partie avant un enregistrement / une annulation n'écrase jamais l'état qu'ils ont posé.
  - `.../shipping/ProjectShippingBar.tsx` — client : résumé + « Suivre le colis » (`target=_blank`, `rel=noopener noreferrer`, lien https seulement) ; admin / producteur attribué (`canEdit` décidé par le serveur) : « Marquer comme expédié », puis « Modifier » · « Annuler l'expédition » (confirmation). Toast selon `notified` : prévenu / bac à sable / **échec** (« Expédition enregistrée, mais le client n'a pas pu être prévenu ») / sans notification. `variant="mobile"` : pleine largeur, cibles de 40 px.
  - `.../shipping/ShipProjectDialog.tsx` — dialogue « Expédition » (portail) : « Transporteur », « Numéro de suivi (facultatif) » (affiché seulement pour un transporteur suivi), « Date d'expédition » (aujourd'hui par défaut ; bornes `shippingDateBounds` = de J−90 à demain en **jours de Paris**, comme le serveur ; en modification, le jour d'origine reste sélectionnable même au-delà de 90 jours) ; case « Prévenir à nouveau le client » en modification seulement (envoie `notify: true`) ; « Enregistrer l'expédition » / « Annuler » ; Échap et clic hors fenêtre ferment ; **plein écran sous 768 px**. Numéro nettoyé et vérifié comme le serveur avant l'envoi ; message du serveur affiché dans la fenêtre en cas de refus.
- **Modifiés** (ancres §4.2, insertions seules) :
  - `ProjectHeader.tsx` : import ; `shipping={<ProjectShippingBar project={project} variant="mobile" userKey={user?.documentId} />}` passé à `ProjectHeaderMobile` ; `<ProjectShippingBar project={project} userKey={user?.documentId} />` sous `{statusControl}` (ordinateur/tablette).
  - `ProjectHeaderMobile.tsx` : prop `shipping?: ReactNode`, rendue dans la carte héros après le bloc échéance / « vu ». Bande réduite (onglets autres qu'Accueil) inchangée.
- Tests : `src/__tests__/projectShipping.test.tsx` (23 tests, jsdom), dont les non-régressions de relecture : bornes de date, date d'origine ancienne sélectionnable, toast d'échec, « Prévenir à nouveau le client », lecture en vol qui ne rétablit pas l'ancien état, cache propre au compte.

## Contrôle des liens de suivi (26/09/2026, numéro factice)

| Transporteur | Modèle | Résultat |
|---|---|---|
| Colissimo | `https://www.laposte.fr/outils/suivre-vos-envois?code={n}` | **OK** (page de suivi) |
| GLS | `https://gls-group.com/FR/fr/suivi-colis?match={n}` | Redirige vers **moncolis.gls-france.com** (à vérifier que le numéro y est repris) |
| Chronopost | `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={n}` | **Non vérifiable par robot** (403 / anti-bot) — à ouvrir dans un navigateur |
| DPD | `https://trace.dpd.fr/fr/trace/{n}` | **Non vérifiable par robot** — à ouvrir dans un navigateur |
| UPS | `https://www.ups.com/track?loc=fr_FR&tracknum={n}` | **Non vérifiable par robot** — à ouvrir dans un navigateur |
| DHL | `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id={n}` | **Non vérifiable par robot** — à ouvrir dans un navigateur |
| FedEx/TNT | `https://www.fedex.com/fedextrack/?trknbr={n}` | **Non vérifiable par robot** — à ouvrir dans un navigateur |
| Livraison PEG, Retrait sur place | — | Pas de lien (volontaire) |

Un modèle faux se corrige en une ligne dans `TRACKING_URL_TEMPLATES` (`peg_strapi/src/services/shipping-text.ts`) : le lien est reconstruit à chaque lecture, les expéditions déjà saisies en profitent.

## Variables d'environnement

Aucune nouvelle. Utilisées : `EXPRESS_BACKEND_URL` + `INTERNAL_SECRET` (cloche), `SMTP_USERNAME` / `SMTP_PASSWORD` / `EMAIL_FROM` (Mailjet), `FRONTEND_URL` (liens de l'e-mail et règle du bac à sable), `CAMPAIGNS_DELIVERY` (forçage `live|sandbox`). **Ne jamais poser `CAMPAIGNS_DELIVERY=live` sur peg-int.**

## Ordre de déploiement

1. **Strapi d'abord** (`integration` → peg-int, déploiement manuel) : Strapi crée les 3 colonnes. Vérifier `GET /api/shipping/projects/<id>` → **401** sans jeton.
2. Front ensuite. **Front avant back = sans risque** : la route répond 404/405 → la barre ne s'affiche pas, rien d'autre ne change.
3. Sur int, marquer un projet expédié : toast « bac à sable » attendu, aucun client prévenu.

## Libellés (§7, exacts)

- « Marquer comme expédié » ; dialogue « Expédition », « Transporteur », « Numéro de suivi (facultatif) », « Date d'expédition », « Enregistrer l'expédition » / « Annuler ».
- « Expédié le 2 oct. · Colissimo · Suivre le colis » ; « Expédié le 2 oct. · Livraison PEG » ; « Prête à être retirée depuis le 2 oct. ».
- « Modifier » · « Annuler l'expédition » ; « Annuler l'expédition de « {nom du projet} » ? Le client ne sera pas prévenu. »
- Toasts : « Expédition enregistrée — le client est prévenu » · « Expédition enregistrée (bac à sable : le client n'est pas prévenu) » · « Expédition annulée » · « Impossible d'enregistrer l'expédition ».
- Ajoutés après relecture (hors §7) : toast « Expédition enregistrée, mais le client n'a pas pu être prévenu » ; case « Prévenir à nouveau le client » (dialogue, modification seulement).
- Cloche / e-mail / erreurs API : textes du §7 (générés par `shippingNotificationTexts` et le service).

## Écarts au contrat (documentés)

1. **Libellés ajoutés** (cas non prévus au §7) : toast « Expédition enregistrée » (enregistré sans notification : seule la date a changé, ou aucun compte client) ; toast « Impossible d'annuler l'expédition » (échec du DELETE) ; « Choisissez un transporteur. » (validation locale) ; option « Choisir… » du sélecteur ; bouton « Fermer » (`aria-label`) du dialogue.
2. Le champ « Numéro de suivi (facultatif) » n'est affiché que pour un transporteur à suivi en ligne (`tracking: true`) ; pour « Livraison PEG » / « Retrait sur place », `trackingNumber: null` est envoyé.
3. Confirmation d'annulation par `window.confirm` (texte exact du §7) plutôt qu'une fenêtre dédiée.
4. `ProjectHeaderMobile.tsx` : la ligne `{shipping}` est indentée de 12 espaces, et non 8 comme ses voisines. Le fragment `<>…</>` de ce fichier est déjà sous-indenté par rapport à Prettier ; 12 espaces est la position attendue par Prettier → **aucune nouvelle erreur ESLint** (86 avant / 86 après), alors que 8 espaces en ajoutait une. Rien n'a été réindenté autour.
5. Strapi exporte des aides en plus de l'interface du §2.4 (`carrierOptions`, `parisIsoDay`, `parisShortDate`, `SHIPPED_AT_MAX_PAST_DAYS`) — ajouts, aucune signature modifiée.
6. `useProjectShipping.ts` exporte `resetProjectShippingCache()` pour les tests.
7. **Correctifs de relecture** :
   - `MarkProjectShippedRequest` gagne `notify?: boolean` (facultatif, rétro-compatible) ; `shouldNotifyShipping` gagne un 3e paramètre facultatif `force` ; `useProjectShipping(documentId, userKey?)` et la prop `userKey` de `ProjectShippingBar` (ajoutée sur les deux lignes que le lot 1 a lui-même insérées dans `ProjectHeader.tsx`).
   - Libellés hors §7 : voir « Libellés ».
   - `ShipProjectDialog.tsx` exporte `shippingDateBounds` (fonction pure, testée).
   - **Non fait (hors ancres)** : le « filet de sécurité » proposé par la relecture — retirer côté serveur les liens markdown dont la cible n'est pas une URL (`[Suivre le colis](null)`) — se placerait dans `stripUnknownLinks` (`chatbot.ts` l.1860), qui n'est pas une ancre du lot 1. Seule la consigne (ancre l.322) est corrigée. À reprendre par l'intégrateur si souhaité : `reply.replace(/\[([^\]]+)\]\((?!https?:)[^)]*\)/g, '$1')`.
   - SMTP non configuré : reste `failed` (et non `noemail`) — c'est une panne de configuration, pas l'absence d'adresse ; le front l'annonce désormais.

## Points d'attention

- `ApiService` déconnecte sur tout 401 : la route ne renvoie 401 que pour un jeton absent/invalide (comportement identique à tout autre appel `ApiService` avec une session expirée).
- Un client ne voit rien tant que le projet n'est pas expédié ; un autre producteur reçoit 403 et la barre reste masquée.
- La date saisie est un jour calendaire ; « aujourd'hui » garde l'heure réelle, un autre jour est enregistré à midi UTC (même jour à Paris). Un jour inchangé en modification garde la date d'origine.
- « Prévenir à nouveau le client » n'est pas limité en nombre (réservé à l'admin et au producteur attribué) : chaque coche renvoie une cloche et un e-mail.

## Paragraphe proposé pour CLAUDE.md

```markdown
## 📦 Expédition d'un projet (ajout 26/09/2026)

- 3 champs sur `project` : `shippedAt`, `shippingCarrier` (colissimo, chronopost, dpd, gls, ups, dhl, fedex_tnt, peg_delivery, pickup), `trackingNumber`. **Pas de nouveau statut** : « Expédié » = `shippedAt` renseigné.
- Écriture **uniquement** par `/api/shipping/projects/:documentId` (GET admin / producteur attribué / client propriétaire ; POST / DELETE admin et producteur attribué ; `auth: false` + JWT dans le contrôleur ; 401 seulement jeton invalide, 403 autre producteur, 404 projet d'autrui, 409 projet annulé). Un garde `strapi.documents.use` (`src/index.ts`) retire ces champs de toute écriture HTTP non admin (REST/GraphQL) — `project.update` est accordé aux producteurs et aux clients. **Ne jamais lire ni écrire ces champs en GraphQL côté front.**
- Le lien de suivi est **construit par le serveur** (`TRACKING_URL_TEMPLATES`, `src/services/shipping-text.ts`), jamais saisi.
- Client prévenu (cloche `project_status_change` + push + e-mail « Suivre le colis ») au 1er marquage ou si transporteur/numéro change, ou sur demande (« Prévenir à nouveau le client ») ; annulation silencieuse. **Bac à sable** : seulement si `liveDelivery()` (comme les campagnes). Échec d'envoi → toast d'avertissement côté admin.
- Date d'expédition : de J−90 à demain en **jours de Paris**, front et serveur alignés ; en modification, le jour d'origine est conservé tel quel.
- Front : `ProjectShippingBar` dans l'en-tête projet (ordinateur sous le contrôle de statut, téléphone dans la carte héros) ; route absente → barre masquée.
- Chat : `mes_projets`, `etat_projet_detaille`, `mes_commandes` renvoient `expedition` ; la carte projet affiche « Expédié le … · Transporteur ».
- Ordre : **Strapi d'abord** ; front avant back sans risque.
```

## Termes proposés pour GLOSSARY.md

- **Expédition / Expédié** : départ de la commande d'un projet (`shippedAt` renseigné). N'est pas un statut du projet : un projet « En cours » ou « Terminé » peut être expédié.
- **Transporteur** : Colissimo, Chronopost, DPD, GLS, UPS, DHL, FedEx/TNT, Livraison PEG, Retrait sur place.
- **Numéro de suivi** : référence du colis chez le transporteur ; le lien « Suivre le colis » en est déduit.
- **Retrait sur place** : pas d'envoi ; le client est prévenu que sa commande « est prête à être retirée ».
