# Captures & audit responsive

Deux outils cohabitent dans ce dossier :

| Fichier | À quoi ça sert |
|---|---|
| `responsive-audit.mjs` | **Harnais d'audit responsive** : parcourt l'app en mobile / tablette / desktop, capture chaque page et mesure ce qui casse (débordement horizontal, cibles tactiles, taille des champs). |
| `take-screenshots.mjs` / `take-signup.mjs` | Captures de documentation existantes, en 1920x1080 uniquement. ⚠️ Elles pointent en dur sur `https://app.mypeg.fr` (production). |

---

## Audit responsive — démarrage rapide

```bash
# 1. une seule fois : installer le navigateur (playwright est déjà en devDependencies)
npx playwright install chromium

# 2. dans un premier terminal : lancer le front en local
npm start

# 3. dans un second terminal : lancer l'audit
node scripts/screenshots/responsive-audit.mjs
```

Résultat dans `scripts/screenshots/audit/` :

```
audit/
  report.json          <- toutes les mesures, exploitables par un script
  report.md            <- le rapport à lire
  mobile/
    admin/*.png        <- 390x844 (iPhone 14, isMobile + hasTouch)
    customer/*.png
    producer/*.png
    public/*.png
  tablet/…             <- 768x1024
  desktop/…            <- 1920x1080 — TÉMOIN de non-régression
```

Les noms de fichiers sont **stables** (aucun horodatage) : on peut donc comparer
deux exécutions, avant et après une modification, avec n'importe quel outil de
diff d'images ou l'aperçu du système.

Une campagne complète (67 pages × 3 viewports) prend une quinzaine de minutes.
Pendant une session de correction, on travaille plutôt avec
`--viewports=mobile --no-screenshots`, qui descend à quelques minutes, et on
garde la campagne complète pour la vérification finale.

> **Le viewport `desktop` est le témoin.** Ses captures doivent rester
> rigoureusement identiques d'une exécution à l'autre. Si une image desktop
> change, c'est une régression, même si le mobile s'est amélioré.

---

## Ce que l'audit mesure

### 1. Débordement horizontal (le défaut nº 1 sur téléphone)

Sur chaque page, la sonde compare `document.documentElement.scrollWidth` à la
largeur utile (`clientWidth`, qui exclut une éventuelle barre de défilement).
En cas de débordement, elle remonte **les éléments fautifs** : sélecteur,
rectangle, largeur, et surtout les styles en cause (`width`, `minWidth`,
`gridTemplateColumns`, `flexWrap`, `whiteSpace`…).

Trois précautions évitent les faux positifs :

- un élément dont un **descendant** déborde aussi n'est pas retenu — on ne garde
  que la cause, pas la chaîne d'ancêtres qui déborde par ricochet ;
- un élément placé dans un conteneur qui gère son propre débordement
  (`overflow-x: auto | scroll | hidden | clip`) est ignoré : il ne pousse pas la
  page ;
- un panneau **garé entièrement hors cadre** (tiroir ou modale fermés) est
  ignoré : en LTR il ne crée aucun défilement.

Deux verdicts sont possibles :

- `overflow` — la page défile horizontalement : défaut visible et certain ;
- `maskedOverflow` — la page ne défile pas mais des éléments sortent quand même
  du cadre. C'est typiquement le symptôme d'un `overflow-x: hidden` posé en
  rustine : le contenu est coupé au lieu d'être replié. Le rapport indique alors
  les valeurs de `overflow-x` sur la racine et sur le corps du document.

### 2. Cibles tactiles sous 44 px

Liens, boutons, onglets, champs et éléments focalisables dont le plus petit côté
est inférieur à 44 px (recommandation Apple HIG / WCAG 2.5.5). Les liens en flux
de texte (`display: inline`) sont exclus, conformément à l'exception WCAG 2.5.8.
Les cibles identiques sont regroupées et comptées.

### 3. Champs de saisie sous 16 px

En dessous de 16 px, iOS Safari **zoome automatiquement** quand l'utilisateur
met le champ au point, et ne dézoome pas : c'est l'un des défauts mobiles les
plus désagréables et il est invisible sur un émulateur de bureau.

---

## Options

Tout est réglable par variable d'environnement **ou** par argument de ligne de
commande. L'argument gagne sur la variable.

| Argument | Variable | Défaut | Effet |
|---|---|---|---|
| `--base-url=…` | `PEG_BASE_URL` | `http://localhost:5173` | URL de base auditée |
| `--viewports=…` | `PEG_VIEWPORTS` | `mobile,tablet,desktop` | profils à parcourir |
| `--roles=…` | `PEG_ROLES` | `public,admin,customer,producer` | rôles à parcourir (`generator` possible, voir plus bas) |
| `--only=…` | `PEG_ONLY` | *(tout)* | ne garde que les pages dont la clé contient l'un de ces fragments |
| `--out=…` | `PEG_OUT_DIR` | `scripts/screenshots/audit` | dossier de sortie |
| `--no-screenshots` | `PEG_SCREENSHOTS=0` | captures activées | mesure seule, beaucoup plus rapide |
| `--no-full-page` | `PEG_FULL_PAGE=0` | page entière | ne capture que le viewport |
| `--no-blur` | `PEG_BLUR=0` | floutage activé | désactive le floutage des données sensibles |
| `--no-auto-scroll` | `PEG_AUTO_SCROLL=0` | déroulement activé | ne déroule pas la page avant de mesurer |
| `--headed` | `PEG_HEADED=1` | sans interface | affiche le navigateur (utile pour comprendre un échec) |
| `--dsf=2` | `PEG_DSF` | `1` | densité de pixels des captures |
| `--settle=3000` | `PEG_SETTLE_MS` | `2500` | attente après chargement, en ms |
| `--nav-timeout=60000` | `PEG_NAV_TIMEOUT_MS` | `45000` | délai maximal de navigation |
| `--fail-on-overflow` | `PEG_FAIL_ON_OVERFLOW=1` | désactivé | code de sortie 1 s'il reste un débordement |
| `--allow-prod` | `PEG_ALLOW_PROD=1` | désactivé | lève le garde-fou (voir ci-dessous) |

### Identifiants

Le script reprend les comptes de `take-screenshots.mjs` et les rend
surchargeables — aucun nouveau secret n'est écrit dans le dépôt :

```
PEG_ADMIN_EMAIL      PEG_ADMIN_PASSWORD
PEG_CUSTOMER_EMAIL   PEG_CUSTOMER_PASSWORD
PEG_PRODUCER_EMAIL   PEG_PRODUCER_PASSWORD
PEG_GENERATOR_EMAIL  PEG_GENERATOR_PASSWORD   (aucun défaut : à fournir)
```

Le rôle `generator` n'a pas de compte de test par défaut. Pour auditer son
espace :

```bash
PEG_GENERATOR_EMAIL=… PEG_GENERATOR_PASSWORD=… \
  node scripts/screenshots/responsive-audit.mjs --roles=generator
```

**Une seule connexion par rôle** est effectuée : la session est ensuite réutilisée
sur les trois viewports. C'est volontaire — Strapi applique une limitation de
débit sur la connexion, et multiplier les authentifications risquerait de
déclencher des 429.

---

## Garde-fou production

Par défaut, la base URL est le serveur de développement local. Si elle vise un
domaine `mypeg.fr`, le script **refuse de démarrer** :

```
REFUS : la base URL vise un environnement PEG distant (https://app.mypeg.fr).
```

L'outil se connecte avec de vrais comptes et parcourt des dizaines de pages :
on ne déclenche pas ça par accident sur la production ou l'intégration. Pour
passer outre en connaissance de cause : `--allow-prod` ou `PEG_ALLOW_PROD=1`.

---

## Recettes utiles

```bash
# Boucle de travail : mesurer vite, sans captures, sur mobile seulement
node scripts/screenshots/responsive-audit.mjs --viewports=mobile --no-screenshots

# Se concentrer sur un écran en cours de correction
node scripts/screenshots/responsive-audit.mjs --only=projects

# Rejouer uniquement le témoin desktop avant / après une modification
node scripts/screenshots/responsive-audit.mjs --viewports=desktop

# Un seul rôle, avec le navigateur visible, pour comprendre un échec
node scripts/screenshots/responsive-audit.mjs --roles=customer --viewports=mobile --headed
```

Comparer deux états :

```bash
node scripts/screenshots/responsive-audit.mjs --out=/tmp/peg-avant
# … appliquer les modifications …
node scripts/screenshots/responsive-audit.mjs --out=/tmp/peg-apres
diff /tmp/peg-avant/report.md /tmp/peg-apres/report.md
```

---

## Lire le rapport

`report.md` est organisé en cinq parties :

1. **Synthèse** — une ligne par page, une colonne par viewport : `OK`,
   `+N px` (débordement), `masqué (N)`, `ignoré` ou `ERREUR`.
2. **Débordements horizontaux** — le détail, page par page, avec le tableau des
   éléments fautifs et leurs styles. C'est ici qu'on travaille.
3. **Cibles tactiles sous 44 px**.
4. **Champs de saisie sous 16 px**.
5. **Pages non auditées** — et pourquoi (session perdue, liste vide, délai
   dépassé…), pour ne pas confondre « aucun défaut » et « jamais mesuré ».

`report.json` contient exactement les mêmes données, non tronquées, pour un
traitement automatique.

Une page peut apparaître `ignoré` pour des raisons parfaitement normales : liste
vide en base locale (pas de projet, donc pas de page de détail à ouvrir), ou
modale dont le bouton d'ouverture n'a pas été trouvé.

---

## Notes

- Le dossier `audit/` est ignoré par git (`.gitignore` local) : les captures ne
  doivent pas alourdir le dépôt. Le dossier `output/`, lui, contient les
  captures de documentation historiques et reste versionné.
- Le floutage des données sensibles (emails, téléphones, SIRET, IBAN) est
  appliqué **après** la mesure : les chiffres portent toujours sur un DOM intact.
- Les mesures sont prises page défilée en haut, après avoir déroulé la page une
  fois pour déclencher le contenu animé à l'entrée dans le viewport.
- Le script s'exécute seulement s'il est lancé directement ; on peut donc
  l'importer (`import { pageProbe, buildMarkdown } from './responsive-audit.mjs'`)
  sans démarrer de navigateur.
