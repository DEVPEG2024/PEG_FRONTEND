# PEG -- Glossaire terminologique officiel

> SOURCE DE VERITE. Ne jamais modifier sans validation explicite de Nova.
> Derniere validation : 2026-04-18

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

---

## Statuts projet (valeurs internes)

| Valeur interne   | Label FR attendu        |
|------------------|-------------------------|
| `pending`        | En attente              |
| `waiting`        | Attente                 |
| `fulfilled`      | Termine / Complete      |
| `canceled`       | Annule                  |
| `unpaid`         | Termine impaye (filtre) |
| `sav`            | SAV                     |

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
