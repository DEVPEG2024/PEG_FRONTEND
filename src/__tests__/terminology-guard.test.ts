/**
 * Tests de non-regression terminologique
 * Verifie la coherence des termes metier avec GLOSSARY.md
 * et la persistance des elements proteges du dashboard.
 */

import * as fs from 'fs'
import * as path from 'path'

const SRC = path.resolve(__dirname, '..')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(SRC, relativePath), 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(SRC, relativePath))
}

// ─── 1. Glossaire et fichiers proteges existent ──────────────────────────────

describe('Fichiers de reference', () => {
  test('GLOSSARY.md existe a la racine', () => {
    expect(fs.existsSync(path.resolve(SRC, '..', 'GLOSSARY.md'))).toBe(true)
  })

  test('PROTECTED_COMPONENTS.md existe a la racine', () => {
    expect(fs.existsSync(path.resolve(SRC, '..', 'PROTECTED_COMPONENTS.md'))).toBe(true)
  })

  test('AUDIT_TERMINOLOGIE.md existe a la racine', () => {
    expect(fs.existsSync(path.resolve(SRC, '..', 'AUDIT_TERMINOLOGIE.md'))).toBe(true)
  })
})

// ─── 2. Marqueurs de protection dans les composants proteges ─────────────────

describe('Marqueurs de protection', () => {
  const protectedFiles = [
    'views/app/admin/home/DashboardAdmin.tsx',
    'services/AdminPreferenceService.ts',
    'views/app/admin/banners/BannersList.tsx',
    'views/app/admin/banners/modals/ModalNewBanner.tsx',
    'views/app/admin/banners/modals/ModalEditBanner.tsx',
  ]

  protectedFiles.forEach(filePath => {
    test(`${filePath} contient le marqueur de protection`, () => {
      const content = readFile(filePath)
      expect(content).toContain('COMPOSANT PROTEGE')
      expect(content).toContain('NE PAS MODIFIER SANS DEMANDE EXPLICITE DE NOVA')
    })
  })
})

// ─── 3. Termes du glossaire presents dans l'UI (i18n) ───────────────────────

describe('Termes i18n conformes au glossaire', () => {
  let frJson: Record<string, any>

  beforeAll(() => {
    frJson = JSON.parse(readFile('locales/lang/fr.json'))
  })

  test('nav.customers = "Clients"', () => {
    expect(frJson.nav.customers).toBe('Clients')
  })

  test('nav.producers = "Producteurs"', () => {
    expect(frJson.nav.producers).toBe('Producteurs')
  })

  test('nav.invoices = "Factures"', () => {
    expect(frJson.nav.invoices).toBe('Factures')
  })

  test('nav.orders = "Commandes"', () => {
    expect(frJson.nav.orders).toBe('Commandes')
  })

  test('nav.products = "Produits"', () => {
    expect(frJson.nav.products).toBe('Produits')
  })

  test('nav.support = "Support"', () => {
    expect(frJson.nav.support).toBe('Support')
  })

  test('nav.home = "Tableau de bord"', () => {
    expect(frJson.nav.home).toBe('Tableau de bord')
  })
})

// ─── 4. Widget Pense-bete present dans le dashboard ──────────────────────────

describe('Dashboard admin - elements proteges', () => {
  let dashboardContent: string

  beforeAll(() => {
    dashboardContent = readFile('views/app/admin/home/DashboardAdmin.tsx')
  })

  test('Widget Pense-bete est defini', () => {
    expect(dashboardContent).toContain("label: 'Pense-bête'")
  })

  test('TodoListWidget existe dans le fichier', () => {
    expect(dashboardContent).toContain('function TodoListWidget()')
  })

  test('Cle localStorage des todos est peg:dashboardTodos', () => {
    expect(dashboardContent).toContain("'peg:dashboardTodos'")
  })

  test('Cle localStorage de la banniere est peg:dashboardBanner', () => {
    expect(dashboardContent).toContain("'peg:dashboardBanner'")
  })

  test('Sync backend des todos est en place (apiUpdateAdminPreference)', () => {
    expect(dashboardContent).toContain('apiUpdateAdminPreference')
  })

  test('Restauration backend des todos est en place (apiGetAdminPreference)', () => {
    expect(dashboardContent).toContain('apiGetAdminPreference')
  })

  test('Widget Ventes add. est defini', () => {
    expect(dashboardContent).toContain("label: 'Ventes add.'")
  })
})

// ─── 5. Statuts projet conformes ─────────────────────────────────────────────

describe('Statuts projet', () => {
  let constantsContent: string

  beforeAll(() => {
    constantsContent = readFile('views/app/common/projects/lists/constants.ts')
  })

  test('Statut pending = "En cours"', () => {
    expect(constantsContent).toMatch(/pending.*En cours/)
  })

  test('Statut fulfilled = "Terminé"', () => {
    expect(constantsContent).toMatch(/fulfilled.*Terminé/)
  })

  test('Statut waiting = "En attente"', () => {
    expect(constantsContent).toMatch(/waiting.*En attente/)
  })

  test('Statut canceled = "Annulé"', () => {
    expect(constantsContent).toMatch(/canceled.*Annulé/)
  })

  test('Statut unpaid = "Terminé impayé"', () => {
    expect(constantsContent).toMatch(/unpaid.*Terminé impayé/)
  })

  test('Statut pending_paid = "En cours (payé)"', () => {
    expect(constantsContent).toMatch(/pending_paid.*En cours \(payé\)/)
  })
})

// ─── 5 bis. Expedition et Chat Conseil (valides le 22/10/2026) ───────────────

describe('Expedition et Chat Conseil', () => {
  test('GLOSSARY.md contient les termes Expedition et Chat Conseil', () => {
    const glossary = fs.readFileSync(path.resolve(SRC, '..', 'GLOSSARY.md'), 'utf-8')
    for (const term of [
      'Expedition / Expedie',
      'Transporteur',
      'Numero de suivi',
      'Retrait sur place',
      'Style de reponse',
      'Personnalisation guidee',
      "Rempli avec l'assistant",
      "Commande issue de l'assistant",
      'Conversation conclue',
    ]) {
      expect(glossary).toContain(term)
    }
  })

  test('Bandeau projet : « Marquer comme expédié » et « Suivre le colis »', () => {
    const bar = readFile('views/app/common/projects/details/components/shipping/ProjectShippingBar.tsx')
    expect(bar).toContain('Marquer comme expédié')
    expect(bar).toContain('Suivre le colis')
  })

  test('Dialogue : « Transporteur » et « Numéro de suivi (facultatif) »', () => {
    const dialog = readFile('views/app/common/projects/details/components/shipping/ShipProjectDialog.tsx')
    expect(dialog).toContain('Transporteur')
    expect(dialog).toContain('Numéro de suivi (facultatif)')
  })

  test('Style quick = "Rapide", advice = "Conseil"', () => {
    const styles = readFile('components/template/chat/chatStyle.ts')
    expect(styles).toMatch(/quick:\s*{[^}]*label: 'Rapide'/)
    expect(styles).toMatch(/advice:\s*{[^}]*label: 'Conseil'/)
  })

  test('Badge de commande « Rempli avec l\'assistant »', () => {
    expect(readFile('views/app/common/orderItem/ShowOrderItem.tsx')).toContain('Rempli avec l&apos;assistant')
  })

  test('Tuiles admin : commandes issues de l\'assistant, conversations conclues', () => {
    const stats = readFile('views/app/admin/chatbot/ChatOrderStats.tsx')
    expect(stats).toMatch(/Commandes issues de l.assistant/)
    expect(stats).toContain('Conversations conclues par une commande')
  })

  test('Clôture : « Nouvelle question »', () => {
    expect(readFile('components/template/chat/chatClosing.ts')).toContain("'Nouvelle question'")
  })
})

// ─── 6. Absence de synonymes interdits ───────────────────────────────────────

describe('Absence de synonymes interdits dans l\'UI', () => {
  const uiFiles = [
    'locales/lang/fr.json',
    'locales/lang/en.json',
  ]

  const forbiddenTerms = [
    { term: /\bconduit\b/i, meaning: 'synonyme interdit de "leads"' },
    { term: /\btuyau\b/i, meaning: 'synonyme interdit de "leads"' },
    { term: /\bbouche d'aération\b/i, meaning: 'synonyme interdit de "vente additionnelle"' },
  ]

  uiFiles.forEach(filePath => {
    forbiddenTerms.forEach(({ term, meaning }) => {
      test(`${filePath} ne contient pas "${term.source}" (${meaning})`, () => {
        const content = readFile(filePath)
        expect(content).not.toMatch(term)
      })
    })
  })
})

// ─── 7. Service AdminPreference intact ───────────────────────────────────────

describe('AdminPreferenceService intact', () => {
  let serviceContent: string

  beforeAll(() => {
    serviceContent = readFile('services/AdminPreferenceService.ts')
  })

  test('apiGetAdminPreference est exportee', () => {
    expect(serviceContent).toContain('export async function apiGetAdminPreference')
  })

  test('apiCreateAdminPreference est exportee', () => {
    expect(serviceContent).toContain('export async function apiCreateAdminPreference')
  })

  test('apiUpdateAdminPreference est exportee', () => {
    expect(serviceContent).toContain('export async function apiUpdateAdminPreference')
  })

  test('apiUploadBanner est exportee', () => {
    expect(serviceContent).toContain('export async function apiUploadBanner')
  })

  test('Le champ todos est requete dans GraphQL', () => {
    expect(serviceContent).toContain('todos')
  })

  test('Le champ bannerImage est requete dans GraphQL', () => {
    expect(serviceContent).toContain('bannerImage')
  })
})
