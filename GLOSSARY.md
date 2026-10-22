# PEG -- Glossaire terminologique officiel

> SOURCE DE VERITE. Ne jamais modifier sans validation explicite de Nova.
> Derniere validation : 2026-10-22 (ajout des termes Expedition et Chat Conseil)

---

## Termes metier (FR)

| Terme officiel           | Usage dans l'UI / le code                                  | NE JAMAIS remplacer par                          |
|--------------------------|-------------------------------------------------------------|--------------------------------------------------|
| Leads                    | Module CRM prospects entrants (`/admin/leads`)             | conduit, canal, tuyau, prospect (dans l'UI)      |
| Vente additionnelle      | Upsell / cross-sell sur un projet (`additionalSales`)      | bouche d'aeration, extension, supplement         |
| Ventes add.              | Label abrege dans widgets/onglets dashboard                | Ventes supplementaires, extras                   |
| Client                   | Entite acheteur B2B (`/admin/customers`)                   | acheteur, consommateur, compte                   |
| Producteur               | Fournisseur/sous-traitant (`/admin/producers`)             | fournisseur, prestataire, fabricant               |
| Projet                   | Dossier de travail B2B (`/common/projects`)                | commande (reserve au e-commerce), mission, dossier|
| Commande                 | Achat e-commerce boutique (`/admin/order-items`)           | projet, demande                                  |
| Facture                  | Document comptable (`/admin/invoices`)                     | note de frais, recu, bon                         |
| Devis                    | Document de chiffrage avant projet (`Devis.tsx`)           | estimation, proposition commerciale, offre        |
| Ticket                   | Demande de support (`/support`)                            | incident, requete, demande SAV (sauf SAV projet) |
| SAV                      | Service apres-vente lie a un projet (`SavTicket`)          | reclamation, retour                              |
| Catalogue                | Vitrine produits client (`/customer/catalogue`)            | boutique, shop, magasin (=Markets), vitrine       |
| Pense-bete               | Widget todo/notes du dashboard admin                       | notes, memo, post-it, rappels                    |
| Banniere                 | Image hero du dashboard admin                              | header, couverture, fond                         |
| Categorie                | Classement clients/producteurs/produits                    | type, groupe, famille                            |
| Pool                     | Ressource producteur affectable a un projet                | equipe, groupe, assignation                      |
| Magasin                  | Point de vente physique (`/admin/markets`)                 | boutique (= e-commerce), store                   |
| Expedition / Expedie     | Depart de la commande d'un projet (`shippedAt` renseigne) -- pas un statut projet | envoi, livraison (= date prevue du projet), statut "Expedie" |
| Transporteur             | Societe qui achemine le colis (`shippingCarrier`)          | livreur, coursier, prestataire                   |
| Numero de suivi          | Reference du colis chez le transporteur (`trackingNumber`) ; lien "Suivre le colis" deduit | tracking, numero de colis, reference d'envoi |
| Retrait sur place        | Pas d'envoi : commande "prete a etre retiree" (`pickup`)   | click & collect, enlevement                      |
| Style de reponse         | Facon dont l'assistant repond, choisie par le client : Rapide / Conseil | mode, ton, personnalite, niveau     |
| Personnalisation guidee  | Formulaire de personnalisation rempli dans le chat avec l'assistant | formulaire IA, auto-remplissage, questionnaire |
| Rempli avec l'assistant  | Badge d'une commande dont la personnalisation a ete remplie dans le chat | genere par l'IA, rempli par le bot |
| Commande issue de l'assistant | Commande dont au moins un article vient d'une offre du chat | vente IA, commande chatbot                  |
| Conversation conclue     | Conversation du chat close apres le paiement d'une commande issue de l'assistant | conversation fermee, archivee |

---

## Statuts projet (valeurs internes)

| Valeur interne   | Label FR attendu        |
|------------------|-------------------------|
| `pending`        | En attente              |
| `pending_paid`   | En cours (paye)         |
| `waiting`        | Attente                 |
| `fulfilled`      | Termine / Complete      |
| `canceled`       | Annule                  |
| `unpaid`         | Termine impaye (filtre) |
| `sav`            | SAV                     |

---

## Transporteurs (valeurs internes, `project.shippingCarrier`)

| Valeur interne   | Label FR            |
|------------------|---------------------|
| `colissimo`      | Colissimo           |
| `chronopost`     | Chronopost          |
| `dpd`            | DPD                 |
| `gls`            | GLS                 |
| `ups`            | UPS                 |
| `dhl`            | DHL                 |
| `fedex_tnt`      | FedEx/TNT           |
| `peg_delivery`   | Livraison PEG       |
| `pickup`         | Retrait sur place   |

---

## Styles de reponse du chat (valeurs internes)

| Valeur interne | Label FR | Indication affichee                                 |
|----------------|----------|-----------------------------------------------------|
| `quick`        | Rapide   | Reponses courtes, droit au but                      |
| `advice`       | Conseil  | Je m'interesse a votre projet et je vous conseille  |

---

## Etapes leads (pipeline CRM)

| Valeur interne      | Label FR         |
|---------------------|------------------|
| `nouveau`           | Nouveau          |
| `contacte`          | Contacte         |
| `qualification`     | Qualification    |
| `proposition`       | Proposition      |
| `negociation`       | Negociation      |
| `gagne`             | Gagne            |
| `perdu`             | Perdu            |

---

## Priorites leads

| Valeur interne | Label FR  |
|----------------|-----------|
| `basse`        | Basse     |
| `normale`      | Normale   |
| `haute`        | Haute     |
| `urgente`      | Urgente   |

---

## Sources leads

| Valeur interne | Label FR    |
|----------------|-------------|
| `linkedin`     | LinkedIn    |
| `referral`     | Reference   |
| `inbound`      | Inbound     |
| `cold_call`    | Cold Call   |
| `event`        | Evenement   |
| `site_web`     | Site Web    |
| `autre`        | Autre       |

---

## Regles

1. Aucun synonyme dans l'UI -- un seul terme par concept.
2. Les cles i18n reflètent le terme officiel (ex: `nav.customers` = "Clients").
3. Pas de reformulation creative par l'IA.
4. Code interne en anglais (`additionalSales`, `customer`, `producer`) -- l'UI affiche toujours le terme FR officiel.
5. Toute modification de ce glossaire doit être validee explicitement par Nova.
