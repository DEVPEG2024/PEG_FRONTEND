/**
 * Script automatique de capture d'écran PEG
 * Usage : node take-screenshots.mjs
 *
 * Prérequis : npm install playwright
 * (ou npx playwright install chromium)
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://app.mypeg.fr',

  admin: {
    email: 'admin@mypeg.fr',
    password: 'Peg2025',
  },

  customer: {
    email: 'dina@mypeg.fr',
    password: 'Peg2025',
  },

  producer: {
    email: 'helena@mypeg.fr',
    password: 'Peg2025',
  },

  viewport: { width: 1920, height: 1080 },
  waitAfterNav: 3000,
};

// ─── CAPTURES À PRENDRE ─────────────────────────────────────
const SCREENSHOTS = {
  admin: [
    {
      name: 'screenshot-dashboard',
      path: '/home',
      description: 'Dashboard admin — KPIs et graphiques',
      waitFor: 4000,
    },
    {
      name: 'screenshot-projects',
      path: '/common/projects',
      description: 'Liste des projets en cartes',
      waitFor: 3000,
    },
    {
      name: 'screenshot-project-detail',
      path: null,
      description: 'Détail d\'un projet',
      action: async (page) => {
        await page.goto(`${CONFIG.baseUrl}/common/projects`);
        await page.waitForTimeout(3000);
        const firstProject = page.locator('a[href*="/projects/details/"]').first();
        if (await firstProject.isVisible()) {
          await firstProject.click();
          await page.waitForTimeout(4000);
        }
      },
    },
    {
      name: 'screenshot-invoices',
      path: '/admin/invoices',
      description: 'Liste des factures',
      waitFor: 3000,
    },
    {
      name: 'screenshot-financial',
      path: '/home',
      description: 'Graphique CA/Marge (scroll vers le graphique)',
      action: async (page) => {
        await page.goto(`${CONFIG.baseUrl}/home`);
        await page.waitForTimeout(4000);
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForTimeout(1500);
      },
    },
    {
      name: 'screenshot-notifications',
      path: '/home',
      description: 'Panneau de notifications',
      action: async (page) => {
        await page.goto(`${CONFIG.baseUrl}/home`);
        await page.waitForTimeout(3000);
        // Cherche le bouton cloche (notification)
        const bell = page.locator('button').filter({ has: page.locator('svg') });
        const buttons = await bell.all();
        for (const btn of buttons) {
          const text = await btn.innerHTML();
          if (text.includes('bell') || text.includes('notification') || text.includes('Bell') || text.includes('Notification')) {
            await btn.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
      },
    },
    {
      name: 'screenshot-wizard',
      path: '/admin/customers/list',
      description: 'Wizard création client',
      action: async (page) => {
        await page.goto(`${CONFIG.baseUrl}/admin/customers/list`);
        await page.waitForTimeout(3000);
        // Cherche un bouton d'ajout
        const addBtn = page.locator('button').filter({ hasText: /ajout|nouveau|créer|\+/i }).first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(2000);
        }
      },
    },
  ],
  customer: [
    {
      name: 'screenshot-catalog',
      path: '/customer/catalogue',
      description: 'Catalogue produits côté client',
      waitFor: 3000,
    },
  ],
  producer: [
    {
      name: 'screenshot-producer',
      path: '/home',
      description: 'Dashboard producteur',
      waitFor: 3000,
    },
  ],
};

// ─── FLOUTAGE DES ZONES SENSIBLES ──────────────────────────
async function blurSensitiveData(page) {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Flouter les emails */
      [href*="mailto"], [data-email], td:has(> a[href*="mailto"]) {
        filter: blur(5px) !important;
      }
      /* Flouter les numéros de téléphone */
      [href*="tel:"], a[href*="tel"] {
        filter: blur(5px) !important;
      }
    `;
    document.head.appendChild(style);

    // Flouter les contenus texte qui ressemblent à des données sensibles
    const allElements = document.querySelectorAll('span, p, td, div, a, li');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\+?\d[\d\s\-.()]{7,})/;
    const siretRegex = /\b\d{14}\b/;
    const ibanRegex = /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}/;

    allElements.forEach((el) => {
      const text = el.textContent || '';
      const childCount = el.children.length;
      // Ne flouter que les elements "feuilles" (pas de sous-elements complexes)
      if (childCount <= 1) {
        if (
          emailRegex.test(text) ||
          phoneRegex.test(text) ||
          siretRegex.test(text) ||
          ibanRegex.test(text)
        ) {
          el.style.filter = 'blur(5px)';
        }
      }
    });

    // Flouter les noms de clients réels (dans les cartes, tableaux, headers)
    // On floute les éléments qui contiennent "@" (emails visibles)
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && el.textContent && el.textContent.includes('@') && el.textContent.length < 100) {
        el.style.filter = 'blur(5px)';
      }
    });
  });

  // Petit délai pour que le CSS s'applique
  await page.waitForTimeout(300);
}

// ─── HELPERS ─────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

async function login(page, credentials) {
  console.log(`  Connexion avec ${credentials.email}...`);
  await page.goto(`${CONFIG.baseUrl}/sign-in`);
  await page.waitForTimeout(2000);

  // Attendre que la page soit bien chargée
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Trouver les inputs par leur ordre d'apparition
  const inputs = await page.locator('input').all();
  console.log(`  ${inputs.length} inputs trouvés sur la page`);

  // Premier input = email, deuxième = password
  if (inputs.length >= 2) {
    await inputs[0].fill(credentials.email);
    await inputs[1].fill(credentials.password);
  } else {
    throw new Error(`Seulement ${inputs.length} inputs trouvés — attendu au moins 2`);
  }

  // Soumettre le formulaire
  const submitBtn = page.locator('button[type="submit"]');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  } else {
    // Fallback : chercher un bouton contenant "connexion" ou "login"
    await page.locator('button').filter({ hasText: /connexion|login|se connecter/i }).first().click();
  }
  await page.waitForTimeout(5000);

  const url = page.url();
  if (url.includes('sign-in')) {
    throw new Error(`Echec de connexion pour ${credentials.email} — toujours sur la page de login`);
  }
  console.log(`  Connecté ! (${url})`);
}

async function takeScreenshot(page, shot, outputDir) {
  const filePath = join(outputDir, `${shot.name}.png`);

  if (shot.action) {
    await shot.action(page);
  } else if (shot.path) {
    await page.goto(`${CONFIG.baseUrl}${shot.path}`);
    await page.waitForTimeout(shot.waitFor || CONFIG.waitAfterNav);
  }

  // Appliquer le floutage avant chaque capture
  await blurSensitiveData(page);

  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [OK] ${shot.name}.png — ${shot.description}`);
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n  Lancement du navigateur...\n');
  const browser = await chromium.launch({ headless: true });

  // ── Admin screenshots ──
  console.log('--- CAPTURES ADMIN ---');
  const adminContext = await browser.newContext({ viewport: CONFIG.viewport });
  const adminPage = await adminContext.newPage();
  await login(adminPage, CONFIG.admin);

  for (const shot of SCREENSHOTS.admin) {
    try {
      await takeScreenshot(adminPage, shot, OUTPUT_DIR);
    } catch (err) {
      console.error(`  [FAIL] ${shot.name} — ${err.message}`);
    }
  }
  await adminContext.close();

  // ── Customer screenshots ──
  if (!CONFIG.customer.email.startsWith('REMPLACE')) {
    console.log('\n--- CAPTURES CLIENT ---');
    const customerContext = await browser.newContext({ viewport: CONFIG.viewport });
    const customerPage = await customerContext.newPage();
    await login(customerPage, CONFIG.customer);

    for (const shot of SCREENSHOTS.customer) {
      try {
        await takeScreenshot(customerPage, shot, OUTPUT_DIR);
      } catch (err) {
        console.error(`  [FAIL] ${shot.name} — ${err.message}`);
      }
    }
    await customerContext.close();
  } else {
    console.log('\n  [SKIP] Captures client — identifiants non renseignés');
  }

  // ── Producer screenshots ──
  if (!CONFIG.producer.email.startsWith('REMPLACE')) {
    console.log('\n--- CAPTURES PRODUCTEUR ---');
    const producerContext = await browser.newContext({ viewport: CONFIG.viewport });
    const producerPage = await producerContext.newPage();
    await login(producerPage, CONFIG.producer);

    for (const shot of SCREENSHOTS.producer) {
      try {
        await takeScreenshot(producerPage, shot, OUTPUT_DIR);
      } catch (err) {
        console.error(`  [FAIL] ${shot.name} — ${err.message}`);
      }
    }
    await producerContext.close();
  } else {
    console.log('\n  [SKIP] Captures producteur — identifiants non renseignés');
  }

  await browser.close();

  console.log(`\n  Terminé ! Les captures sont dans : ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
