/**
 * Harnais d'audit responsive PEG
 * ------------------------------------------------------------------
 * Parcourt l'application avec trois profils de viewport (mobile, tablette,
 * desktop-témoin), capture chaque page et MESURE objectivement ce qui casse
 * sur téléphone :
 *   - débordement horizontal (scrollWidth > largeur utile) + éléments fautifs
 *   - cibles tactiles de moins de 44 px
 *   - champs de saisie de moins de 16 px (iOS zoome au focus)
 *
 * Le profil desktop 1920x1080 sert de TÉMOIN de non-régression : ses captures
 * doivent rester identiques d'une exécution à l'autre.
 *
 * Usage :
 *   node scripts/screenshots/responsive-audit.mjs
 *   node scripts/screenshots/responsive-audit.mjs --viewports=mobile --roles=admin
 *   node scripts/screenshots/responsive-audit.mjs --only=projects,invoices --no-screenshots
 *
 * Voir scripts/screenshots/README.md pour la liste des variables
 * d'environnement et des options.
 *
 * Prérequis : playwright (déjà en devDependencies) + `npx playwright install chromium`.
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── ARGUMENTS DE LIGNE DE COMMANDE ─────────────────────────
// --cle=valeur  → CLI_ARGS.cle = 'valeur'
// --drapeau     → CLI_ARGS.drapeau = '1'
// --no-drapeau  → CLI_ARGS.drapeau = '0'
const CLI_ARGS = {};
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--')) continue;
  const body = raw.slice(2);
  const eq = body.indexOf('=');
  if (eq !== -1) {
    CLI_ARGS[body.slice(0, eq)] = body.slice(eq + 1);
  } else if (body.startsWith('no-')) {
    CLI_ARGS[body.slice(3)] = '0';
  } else {
    CLI_ARGS[body] = '1';
  }
}

const opt = (cliKey, envKey, fallback) => {
  if (CLI_ARGS[cliKey] !== undefined) return CLI_ARGS[cliKey];
  if (process.env[envKey] !== undefined && process.env[envKey] !== '') return process.env[envKey];
  return fallback;
};
const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
};
const list = (value) =>
  String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// ─── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  // Par DÉFAUT le serveur de développement local — jamais la production.
  baseUrl: String(opt('base-url', 'PEG_BASE_URL', 'http://localhost:5173')).replace(/\/+$/, ''),

  outputDir: opt('out', 'PEG_OUT_DIR', join(__dirname, 'audit')),

  viewports: list(opt('viewports', 'PEG_VIEWPORTS', 'mobile,tablet,desktop')),
  roles: list(opt('roles', 'PEG_ROLES', 'public,admin,customer,producer')),
  only: list(opt('only', 'PEG_ONLY', '')),

  headless: !bool(opt('headed', 'PEG_HEADED', '0'), false),
  screenshots: bool(opt('screenshots', 'PEG_SCREENSHOTS', '1'), true),
  fullPage: bool(opt('full-page', 'PEG_FULL_PAGE', '1'), true),
  blur: bool(opt('blur', 'PEG_BLUR', '1'), true),
  autoScroll: bool(opt('auto-scroll', 'PEG_AUTO_SCROLL', '1'), true),

  deviceScaleFactor: Number(opt('dsf', 'PEG_DSF', '1')) || 1,
  settleMs: Number(opt('settle', 'PEG_SETTLE_MS', '2500')) || 2500,
  navTimeoutMs: Number(opt('nav-timeout', 'PEG_NAV_TIMEOUT_MS', '45000')) || 45000,

  failOnOverflow: bool(opt('fail-on-overflow', 'PEG_FAIL_ON_OVERFLOW', '0'), false),
  allowProd: bool(opt('allow-prod', 'PEG_ALLOW_PROD', '0'), false),

  // Identifiants : UNIQUEMENT par variables d'environnement. Aucun mot de passe
  // n'est écrit ici — ce fichier est versionné. Sans variable définie, le rôle
  // est simplement ignoré (voir le contrôle plus bas).
  accounts: {
    admin: {
      email: process.env.PEG_ADMIN_EMAIL || '',
      password: process.env.PEG_ADMIN_PASSWORD || '',
    },
    customer: {
      email: process.env.PEG_CUSTOMER_EMAIL || '',
      password: process.env.PEG_CUSTOMER_PASSWORD || '',
    },
    producer: {
      email: process.env.PEG_PRODUCER_EMAIL || '',
      password: process.env.PEG_PRODUCER_PASSWORD || '',
    },
    generator: {
      email: process.env.PEG_GENERATOR_EMAIL || '',
      password: process.env.PEG_GENERATOR_PASSWORD || '',
    },
  },
};

// ─── SEUILS D'AUDIT ─────────────────────────────────────────
const THRESHOLDS = {
  overflowTolerancePx: 2, // marge anti-arrondi sous-pixel
  minTouchTargetPx: 44, // recommandation Apple HIG / WCAG 2.5.5
  minInputFontPx: 16, // en-dessous, iOS zoome au focus du champ
  maxOffenders: 12,
  maxTouchTargets: 25,
  maxSmallInputs: 15,
};

// ─── PROFILS DE VIEWPORT ────────────────────────────────────
const VIEWPORT_PROFILES = {
  mobile: {
    id: 'mobile',
    label: 'Mobile — iPhone 14 (390x844)',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    control: false,
  },
  tablet: {
    id: 'tablet',
    label: 'Tablette (768x1024)',
    width: 768,
    height: 1024,
    isMobile: false,
    hasTouch: true,
    control: false,
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop TÉMOIN (1920x1080)',
    width: 1920,
    height: 1080,
    isMobile: false,
    hasTouch: false,
    control: true,
  },
};

// ─── INTERACTIONS RÉUTILISABLES ─────────────────────────────
// Purement navigationnelles : ouvrir une modale / un tiroir pour les auditer.
const clickFirstVisible = async (page, locators) => {
  for (const locator of locators) {
    const candidate = page.locator(locator).first();
    try {
      if (await candidate.isVisible({ timeout: 1500 })) {
        await candidate.click({ timeout: 3000 });
        await page.waitForTimeout(1500);
        return true;
      }
    } catch {
      /* selecteur absent : on tente le suivant */
    }
  }
  return false;
};

const openSignUpModal = async (page) =>
  clickFirstVisible(page, ['text=Créer un compte', 'button:has-text("compte")']);

const openMobileDrawer = async (page) =>
  clickFirstVisible(page, ['header div.text-2xl', 'div.text-2xl']);

const openCustomerWizard = async (page) =>
  clickFirstVisible(page, [
    'button:has-text("Ajouter")',
    'button:has-text("Nouveau")',
    'button:has-text("Créer")',
  ]);

// ─── DÉCOUVERTE DE ROUTES DYNAMIQUES ────────────────────────
// Récupère l'URL du premier élément d'une liste, sans rien deviner ni forger.
const discoverFromList = (listPath, linkSelector) => async (page, baseUrl) => {
  await page.goto(`${baseUrl}${listPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: CONFIG.navTimeoutMs,
  });
  await page.waitForTimeout(CONFIG.settleMs);
  const link = page.locator(linkSelector).first();
  try {
    if (!(await link.isVisible({ timeout: 4000 }))) return null;
  } catch {
    return null;
  }
  const href = await link.getAttribute('href');
  if (!href) return null;
  return href.startsWith('http') ? href : `${baseUrl}${href}`;
};

// ─── PAGES AUDITÉES ─────────────────────────────────────────
// `key` vient de src/configs/routes.config/routes.config.ts : il sert d'identifiant
// stable pour les noms de fichiers, aucun libellé métier n'est inventé ici.
const PAGES = [
  // ── Public : aucune session ──
  { key: 'public.sign-in', role: 'public', path: '/sign-in' },
  { key: 'public.forgot-password', role: 'public', path: '/forgot-password' },
  { key: 'public.sign-up-modal', role: 'public', path: '/sign-in', interact: openSignUpModal },

  // ── Admin ──
  { key: 'admin.home', role: 'admin', path: '/home', settleMs: 4500 },
  { key: 'admin.home.drawer', role: 'admin', path: '/home', interact: openMobileDrawer, viewports: ['mobile', 'tablet'] },
  { key: 'admin.projects', role: 'admin', path: '/common/projects' },
  { key: 'admin.projects.details', role: 'admin', discover: discoverFromList('/common/projects', 'a[href*="/projects/details/"]') },
  { key: 'admin.quotes', role: 'admin', path: '/common/quotes' },
  { key: 'admin.invoices', role: 'admin', path: '/admin/invoices' },
  { key: 'admin.expenses', role: 'admin', path: '/admin/expenses' },
  { key: 'admin.leads', role: 'admin', path: '/admin/leads' },
  { key: 'admin.calendar', role: 'admin', path: '/admin/calendar' },
  { key: 'admin.planning', role: 'admin', path: '/admin/planning', settleMs: 4000 },
  { key: 'admin.premium', role: 'admin', path: '/admin/premium' },
  { key: 'admin.generators', role: 'admin', path: '/admin/generators' },
  { key: 'admin.customers.list', role: 'admin', path: '/admin/customers/list' },
  { key: 'admin.customers.wizard', role: 'admin', path: '/admin/customers/list', interact: openCustomerWizard },
  { key: 'admin.customers.categories', role: 'admin', path: '/admin/customers/categories' },
  { key: 'admin.producers.list', role: 'admin', path: '/admin/producers/list' },
  { key: 'admin.producers.categories', role: 'admin', path: '/admin/producers/categories' },
  { key: 'admin.products', role: 'admin', path: '/admin/products' },
  { key: 'admin.products.new', role: 'admin', path: '/admin/products/new', settleMs: 4000 },
  { key: 'admin.products.categories', role: 'admin', path: '/admin/products/categories' },
  { key: 'admin.products.sizes', role: 'admin', path: '/admin/products/sizes' },
  { key: 'admin.products.colors', role: 'admin', path: '/admin/products/colors' },
  { key: 'admin.imbretex.catalog', role: 'admin', path: '/admin/imbretex/catalog' },
  { key: 'admin.store.orders', role: 'admin', path: '/admin/store/orders' },
  { key: 'admin.store.promo-codes', role: 'admin', path: '/admin/store/promo-codes' },
  { key: 'admin.forms', role: 'admin', path: '/admin/forms' },
  { key: 'admin.checklists', role: 'admin', path: '/admin/checklists' },
  { key: 'admin.users', role: 'admin', path: '/admin/users' },
  { key: 'admin.banners', role: 'admin', path: '/admin/banners' },
  { key: 'admin.chatbot', role: 'admin', path: '/admin/chatbot' },
  { key: 'admin.ia.images', role: 'admin', path: '/admin/ia/images' },
  { key: 'admin.ia.content', role: 'admin', path: '/admin/ia/content' },
  { key: 'admin.ia.product-agent', role: 'admin', path: '/admin/ia/product-agent' },
  { key: 'admin.support', role: 'admin', path: '/support' },
  { key: 'admin.settings.profile', role: 'admin', path: '/settings/profile' },
  { key: 'admin.settings.notifications', role: 'admin', path: '/settings/notifications' },

  // ── Client ──
  { key: 'customer.home', role: 'customer', path: '/home', settleMs: 4000 },
  { key: 'customer.home.drawer', role: 'customer', path: '/home', interact: openMobileDrawer, viewports: ['mobile', 'tablet'] },
  { key: 'customer.catalogue', role: 'customer', path: '/customer/catalogue' },
  { key: 'customer.products', role: 'customer', path: '/customer/products' },
  { key: 'customer.product.details', role: 'customer', discover: discoverFromList('/customer/catalogue', 'a[href*="/customer/product/"]'), settleMs: 4000 },
  { key: 'customer.cart', role: 'customer', path: '/customer/cart' },
  { key: 'customer.devis', role: 'customer', path: '/customer/devis' },
  { key: 'customer.quotes', role: 'customer', path: '/common/quotes' },
  { key: 'customer.invoices', role: 'customer', path: '/customer/invoices' },
  { key: 'customer.files', role: 'customer', path: '/customer/files' },
  { key: 'customer.referral', role: 'customer', path: '/customer/referral' },
  { key: 'customer.premium', role: 'customer', path: '/customer/premium' },
  { key: 'customer.projects', role: 'customer', path: '/common/projects' },
  { key: 'customer.projects.details', role: 'customer', discover: discoverFromList('/common/projects', 'a[href*="/projects/details/"]') },
  { key: 'customer.support', role: 'customer', path: '/support' },
  { key: 'customer.settings.profile', role: 'customer', path: '/settings/profile' },
  { key: 'customer.settings.company', role: 'customer', path: '/settings/company' },
  { key: 'customer.settings.password', role: 'customer', path: '/settings/password' },

  // ── Producteur ──
  { key: 'producer.home', role: 'producer', path: '/home', settleMs: 4000 },
  { key: 'producer.home.drawer', role: 'producer', path: '/home', interact: openMobileDrawer, viewports: ['mobile', 'tablet'] },
  { key: 'producer.pool', role: 'producer', path: '/producer/pool' },
  { key: 'producer.wallet', role: 'producer', path: '/producer/wallet' },
  { key: 'producer.projects', role: 'producer', path: '/common/projects' },
  { key: 'producer.projects.details', role: 'producer', discover: discoverFromList('/common/projects', 'a[href*="/projects/details/"]') },
  { key: 'producer.support', role: 'producer', path: '/support' },
  { key: 'producer.settings.profile', role: 'producer', path: '/settings/profile' },

  // ── Générateur (identifiants à fournir via PEG_GENERATOR_EMAIL / _PASSWORD) ──
  { key: 'generator.home', role: 'generator', path: '/home', settleMs: 4000 },
  { key: 'generator.wallet', role: 'generator', path: '/generator/wallet' },
];

// ════════════════════════════════════════════════════════════
// SONDE EXÉCUTÉE DANS LA PAGE
// ════════════════════════════════════════════════════════════
/**
 * Mesure le débordement horizontal, les cibles tactiles trop petites et les
 * champs de saisie sous 16 px. Ne modifie jamais le DOM.
 */
function pageProbe(cfg) {
  const doc = document.documentElement;
  const body = document.body;

  // Largeur utile réelle : clientWidth exclut une éventuelle barre de
  // défilement verticale, ce que window.innerWidth ne fait pas.
  const clientWidth = doc.clientWidth || window.innerWidth;
  const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
  const limit = clientWidth;
  const overflowPx = Math.round(scrollWidth - limit);
  const hasDocumentOverflow = overflowPx > cfg.tolerance;

  const rootStyle = getComputedStyle(doc);
  const bodyStyle = body ? getComputedStyle(body) : null;
  const clippedByRoot =
    /(hidden|clip)/.test(rootStyle.overflowX) ||
    (bodyStyle ? /(hidden|clip)/.test(bodyStyle.overflowX) : false);

  // ── Utilitaires ──
  const classesOf = (el) => {
    const raw = el.getAttribute && el.getAttribute('class');
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((c) => (c.length > 28 ? c.slice(0, 28) + '…' : c));
  };

  const describe = (el) => {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && node !== doc && node !== body && depth < 4) {
      let token = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(token + '#' + node.id);
        break;
      }
      const cls = classesOf(node);
      if (cls.length) token += '.' + cls.join('.');
      const parent = node.parentElement;
      if (parent) {
        const index = Array.prototype.indexOf.call(parent.children, node) + 1;
        token += ':nth-child(' + index + ')';
      }
      parts.unshift(token);
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(' > ');
  };

  const isRendered = (style, rect) => {
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  };

  // Un ancêtre qui gère lui-même son débordement horizontal contient le
  // problème : ses enfants ne poussent pas le document.
  const hasScrollableAncestor = (el) => {
    let parent = el.parentElement;
    while (parent && parent !== body && parent !== doc) {
      const ox = getComputedStyle(parent).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      parent = parent.parentElement;
    }
    return false;
  };

  const snippet = (el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 70 ? text.slice(0, 70) + '…' : text;
  };

  // ── 1. Éléments qui dépassent la largeur utile ──
  const candidates = [];
  const all = document.querySelectorAll('body *');
  for (let i = 0; i < all.length && candidates.length < 600; i += 1) {
    const el = all[i];
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!isRendered(style, rect)) continue;

    const right = rect.right + window.scrollX;
    const left = rect.left + window.scrollX;

    // Panneau garé entièrement hors cadre (tiroir / modale fermés) : en LTR il
    // ne crée aucun défilement et n'est pas un défaut. On l'ignore, sinon
    // chaque page mobile remonterait son tiroir de navigation.
    if (right <= 0) continue;
    if (style.position === 'fixed' && left >= limit) continue;

    const past = Math.round(Math.max(right - limit, -left, rect.width - limit));
    if (past <= cfg.tolerance) continue;
    if (hasScrollableAncestor(el)) continue;

    candidates.push({
      el,
      overflowPx: past,
      selector: describe(el),
      tag: el.tagName.toLowerCase(),
      rect: {
        x: Math.round(rect.left),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      // Ces styles sont les causes racines les plus fréquentes dans ce projet.
      styles: {
        position: style.position,
        display: style.display,
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        gridTemplateColumns:
          style.gridTemplateColumns && style.gridTemplateColumns !== 'none'
            ? style.gridTemplateColumns
            : undefined,
        flexWrap: style.display.includes('flex') ? style.flexWrap : undefined,
        whiteSpace: style.whiteSpace !== 'normal' ? style.whiteSpace : undefined,
        overflowX: style.overflowX,
      },
      text: snippet(el),
      fixed: style.position === 'fixed',
    });
  }

  // On ne garde que les fautifs « feuilles » : si un descendant déborde aussi,
  // c'est lui la cause, pas son conteneur.
  const nodes = candidates.map((c) => c.el);
  const culprits = candidates.filter((c) => {
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i] !== c.el && c.el.contains(nodes[i])) return false;
    }
    return true;
  });

  culprits.sort((a, b) => {
    // Un élément `position: fixed` ne pousse pas le document : il passe après.
    if (a.fixed !== b.fixed) return a.fixed ? 1 : -1;
    return b.overflowPx - a.overflowPx;
  });

  const offenders = culprits.slice(0, cfg.maxOffenders).map((c) => ({
    selector: c.selector,
    tag: c.tag,
    overflowPx: c.overflowPx,
    rect: c.rect,
    styles: c.styles,
    text: c.text,
    positionFixed: c.fixed,
  }));

  // ── 2. Cibles tactiles sous 44 px ──
  const TOUCH_SELECTOR = [
    'a[href]',
    'button',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="switch"]',
    '[role="checkbox"]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const touchSeen = new Map();
  document.querySelectorAll(TOUCH_SELECTOR).forEach((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!isRendered(style, rect)) return;
    if (style.pointerEvents === 'none') return;
    // WCAG 2.5.8 exempte les liens en flux de texte.
    if (el.tagName === 'A' && style.display === 'inline') return;

    const smallest = Math.min(Math.round(rect.width), Math.round(rect.height));
    if (smallest >= cfg.minTouchTarget) return;

    const key =
      el.tagName.toLowerCase() +
      '|' +
      classesOf(el).join('.') +
      '|' +
      Math.round(rect.width) +
      'x' +
      Math.round(rect.height);
    const existing = touchSeen.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    touchSeen.set(key, {
      selector: describe(el),
      tag: el.tagName.toLowerCase(),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      smallestSidePx: smallest,
      label: (el.getAttribute('aria-label') || snippet(el) || '').slice(0, 50),
      count: 1,
    });
  });

  const smallTouchTargets = Array.from(touchSeen.values()).sort(
    (a, b) => a.smallestSidePx - b.smallestSidePx
  );

  // ── 3. Champs de saisie sous 16 px ──
  const inputSeen = new Map();
  document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!isRendered(style, rect)) return;
    const fontSize = parseFloat(style.fontSize) || 0;
    if (fontSize >= cfg.minInputFont) return;

    const key = el.tagName.toLowerCase() + '|' + classesOf(el).join('.') + '|' + fontSize;
    const existing = inputSeen.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    inputSeen.set(key, {
      selector: describe(el),
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || undefined,
      fontSizePx: Math.round(fontSize * 100) / 100,
      count: 1,
    });
  });

  const smallInputs = Array.from(inputSeen.values()).sort((a, b) => a.fontSizePx - b.fontSizePx);

  return {
    metrics: {
      viewportWidth: window.innerWidth,
      clientWidth,
      scrollWidth,
      scrollHeight: doc.scrollHeight,
      overflowPx: Math.max(overflowPx, 0),
    },
    overflow: hasDocumentOverflow,
    // Débordement invisible : la page ne défile pas mais des éléments sortent
    // quand même du cadre (typiquement un `overflow-x: hidden` posé en rustine).
    maskedOverflow: !hasDocumentOverflow && offenders.length > 0,
    clippedByRoot,
    rootOverflowX: rootStyle.overflowX,
    bodyOverflowX: bodyStyle ? bodyStyle.overflowX : null,
    offenders,
    offendersTotal: culprits.length,
    smallTouchTargets: smallTouchTargets.slice(0, cfg.maxTouchTargets),
    smallTouchTargetsTotal: smallTouchTargets.reduce((sum, t) => sum + t.count, 0),
    smallInputs: smallInputs.slice(0, cfg.maxSmallInputs),
    smallInputsTotal: smallInputs.reduce((sum, t) => sum + t.count, 0),
  };
}

// ─── FLOUTAGE DES ZONES SENSIBLES ──────────────────────────
// Repris de take-screenshots.mjs. Appliqué APRÈS la mesure : `filter` n'a aucun
// effet sur la mise en page, mais on garde les mesures sur un DOM intact.
async function blurSensitiveData(page) {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      [href*="mailto"], [data-email], td:has(> a[href*="mailto"]) { filter: blur(5px) !important; }
      [href*="tel:"], a[href*="tel"] { filter: blur(5px) !important; }
    `;
    document.head.appendChild(style);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\+?\d[\d\s\-.()]{7,})/;
    const siretRegex = /\b\d{14}\b/;
    const ibanRegex = /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}/;

    document.querySelectorAll('span, p, td, div, a, li').forEach((el) => {
      const text = el.textContent || '';
      if (el.children.length <= 1) {
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

    document.querySelectorAll('*').forEach((el) => {
      if (
        el.children.length === 0 &&
        el.textContent &&
        el.textContent.includes('@') &&
        el.textContent.length < 100
      ) {
        el.style.filter = 'blur(5px)';
      }
    });
  });
  await page.waitForTimeout(200);
}

// ─── HELPERS ─────────────────────────────────────────────────
const fileNameFor = (key) => key.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/\./g, '-');

const ensureDir = (dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

async function settle(page, ms) {
  // `networkidle` peut ne jamais survenir (sondage des notifications, HMR) :
  // on le borne et on retombe sur l'attente fixe ci-dessous.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

// Déroule la page pour déclencher le contenu animé « à l'entrée dans le
// viewport », puis remonte en haut avant toute mesure.
async function scrollThrough(page) {
  await page
    .evaluate(async () => {
      const step = Math.max(window.innerHeight * 0.8, 200);
      const max = document.documentElement.scrollHeight;
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    })
    .catch(() => {});
}

async function login(page, credentials) {
  await page.goto(`${CONFIG.baseUrl}/sign-in`, {
    waitUntil: 'domcontentloaded',
    timeout: CONFIG.navTimeoutMs,
  });
  await settle(page, 1500);

  const emailField = page.locator('input[name="email"]').first();
  const passwordField = page.locator('input[name="password"], input[type="password"]').first();

  let filled = false;
  try {
    if (await emailField.isVisible({ timeout: 6000 })) {
      await emailField.fill(credentials.email);
      await passwordField.fill(credentials.password);
      filled = true;
    }
  } catch {
    /* on bascule sur le repli positionnel */
  }

  if (!filled) {
    // Repli : premier champ = email, deuxième = mot de passe (mécanisme historique).
    const inputs = await page.locator('input:not([type="hidden"])').all();
    if (inputs.length < 2) {
      throw new Error(`page de connexion : ${inputs.length} champ(s) trouvé(s), 2 attendus`);
    }
    await inputs[0].fill(credentials.email);
    await inputs[1].fill(credentials.password);
  }

  const submit = page.locator('button[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
  } else {
    await page
      .locator('button')
      .filter({ hasText: /connexion|login|se connecter/i })
      .first()
      .click();
  }

  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 20000 });
  await settle(page, 1500);
}

async function newContextFor(browser, profile, storageState) {
  return browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: CONFIG.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    reducedMotion: 'reduce',
    ...(storageState ? { storageState } : {}),
  });
}

// ─── AUDIT D'UNE PAGE ────────────────────────────────────────
async function auditOnePage(page, spec, profile, role, outRoot) {
  const result = {
    key: spec.key,
    role,
    viewport: profile.id,
    viewportWidth: profile.width,
    viewportHeight: profile.height,
    isControl: profile.control,
    path: spec.path || null,
    url: null,
    status: 'ok',
    error: null,
    screenshot: null,
  };

  let targetUrl = spec.path ? `${CONFIG.baseUrl}${spec.path}` : null;

  if (spec.discover) {
    targetUrl = await spec.discover(page, CONFIG.baseUrl);
    if (!targetUrl) {
      result.status = 'skipped';
      result.error = 'aucun élément trouvé dans la liste source';
      return result;
    }
  }

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.navTimeoutMs });
  await settle(page, spec.settleMs || CONFIG.settleMs);

  if (spec.interact) {
    const opened = await spec.interact(page);
    if (!opened) {
      result.status = 'skipped';
      result.error = 'élément déclencheur introuvable (modale / tiroir non ouvert)';
      result.url = page.url();
      return result;
    }
  }

  if (CONFIG.autoScroll && !spec.interact) {
    await scrollThrough(page);
  }

  result.url = page.url();

  // Une redirection vers /sign-in signifie que la session n'a pas tenu.
  if (!spec.key.startsWith('public.') && /\/sign-in/.test(result.url)) {
    result.status = 'skipped';
    result.error = 'redirigé vers /sign-in (session perdue ou page non autorisée)';
    return result;
  }

  const probe = await page.evaluate(pageProbe, {
    tolerance: THRESHOLDS.overflowTolerancePx,
    minTouchTarget: THRESHOLDS.minTouchTargetPx,
    minInputFont: THRESHOLDS.minInputFontPx,
    maxOffenders: THRESHOLDS.maxOffenders,
    maxTouchTargets: THRESHOLDS.maxTouchTargets,
    maxSmallInputs: THRESHOLDS.maxSmallInputs,
  });
  Object.assign(result, probe);

  if (CONFIG.screenshots) {
    if (CONFIG.blur) await blurSensitiveData(page);
    const dir = join(outRoot, profile.id, role);
    ensureDir(dir);
    const file = join(dir, `${fileNameFor(spec.key)}.png`);
    await page.screenshot({
      path: file,
      fullPage: CONFIG.fullPage,
      animations: 'disabled',
      caret: 'hide',
    });
    result.screenshot = `${profile.id}/${role}/${fileNameFor(spec.key)}.png`;
  }

  return result;
}

// ─── RAPPORT MARKDOWN ────────────────────────────────────────
const esc = (value) => String(value == null ? '' : value).replace(/\|/g, '\\|');

function verdictCell(entry) {
  if (!entry) return '—';
  if (entry.status === 'skipped') return 'ignoré';
  if (entry.status === 'error') return 'ERREUR';
  if (entry.overflow) return `**+${entry.metrics.overflowPx} px**`;
  if (entry.maskedOverflow) return `masqué (${entry.offendersTotal})`;
  return 'OK';
}

function buildMarkdown(report) {
  const lines = [];
  const viewportIds = report.viewports.map((v) => v.id);

  lines.push('# Audit responsive PEG');
  lines.push('');
  lines.push(`- Généré le : ${report.generatedAt}`);
  lines.push(`- Base URL : \`${report.baseUrl}\``);
  lines.push(`- Viewports : ${report.viewports.map((v) => v.label).join(' · ')}`);
  lines.push(`- Rôles : ${report.roles.join(', ')}`);
  lines.push(
    `- Seuils : débordement > ${THRESHOLDS.overflowTolerancePx} px · cible tactile < ${THRESHOLDS.minTouchTargetPx} px · saisie < ${THRESHOLDS.minInputFontPx} px`
  );
  lines.push('');
  lines.push(
    "> Le viewport `desktop` est le TÉMOIN de non-régression : ses captures doivent rester identiques d'une exécution à l'autre."
  );
  lines.push('');

  // ── Synthèse ──
  const byKey = new Map();
  for (const entry of report.pages) {
    if (!byKey.has(entry.key)) byKey.set(entry.key, { role: entry.role, cells: {} });
    byKey.get(entry.key).cells[entry.viewport] = entry;
  }

  lines.push('## Synthèse — débordement horizontal');
  lines.push('');
  lines.push(`| Page | Rôle | ${viewportIds.join(' | ')} |`);
  lines.push(`| --- | --- | ${viewportIds.map(() => '---').join(' | ')} |`);
  for (const [key, row] of byKey) {
    const cells = viewportIds.map((id) => verdictCell(row.cells[id]));
    lines.push(`| \`${esc(key)}\` | ${esc(row.role)} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  // ── Détail des débordements ──
  const overflowing = report.pages
    .filter((p) => p.status === 'ok' && (p.overflow || p.maskedOverflow))
    .sort((a, b) => (b.metrics?.overflowPx || 0) - (a.metrics?.overflowPx || 0));

  lines.push('## Débordements horizontaux — éléments fautifs');
  lines.push('');
  if (overflowing.length === 0) {
    lines.push('Aucun débordement détecté.');
    lines.push('');
  } else {
    for (const entry of overflowing) {
      const kind = entry.overflow
        ? `débordement de ${entry.metrics.overflowPx} px`
        : `débordement masqué (\`overflow-x\` racine : ${entry.rootOverflowX} / corps : ${entry.bodyOverflowX})`;
      lines.push(`### \`${esc(entry.key)}\` — ${esc(entry.viewport)} (${esc(entry.role)})`);
      lines.push('');
      lines.push(`- URL : \`${esc(entry.path || entry.url)}\``);
      lines.push(
        `- Largeur utile ${entry.metrics.clientWidth} px · contenu ${entry.metrics.scrollWidth} px → ${kind}`
      );
      lines.push(`- Éléments fautifs retenus : ${entry.offenders.length} / ${entry.offendersTotal}`);
      if (entry.screenshot) lines.push(`- Capture : \`${esc(entry.screenshot)}\``);
      lines.push('');
      if (entry.offenders.length) {
        lines.push('| Dépassement | Élément | Rect (x,y,l,h) | Styles en cause |');
        lines.push('| --- | --- | --- | --- |');
        for (const off of entry.offenders) {
          const styles = Object.entries(off.styles)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join('<br>');
          const rect = `${off.rect.x}, ${off.rect.y}, ${off.rect.width}, ${off.rect.height}`;
          lines.push(
            `| +${off.overflowPx} px${off.positionFixed ? ' _(fixed)_' : ''} | \`${esc(off.selector)}\`${off.text ? `<br>« ${esc(off.text)} »` : ''} | ${rect} | ${esc(styles)} |`
          );
        }
        lines.push('');
      }
    }
  }

  // ── Cibles tactiles ──
  lines.push(`## Cibles tactiles sous ${THRESHOLDS.minTouchTargetPx} px`);
  lines.push('');
  const touchPages = report.pages
    .filter((p) => p.status === 'ok' && p.viewport !== 'desktop' && p.smallTouchTargetsTotal > 0)
    .sort((a, b) => b.smallTouchTargetsTotal - a.smallTouchTargetsTotal);
  if (touchPages.length === 0) {
    lines.push('Aucune cible tactile sous le seuil.');
    lines.push('');
  } else {
    lines.push('| Page | Viewport | Total | Plus petites cibles |');
    lines.push('| --- | --- | --- | --- |');
    for (const entry of touchPages) {
      const worst = entry.smallTouchTargets
        .slice(0, 4)
        .map(
          (t) =>
            `\`${esc(t.tag)}\` ${t.width}x${t.height}${t.count > 1 ? ` (x${t.count})` : ''}${t.label ? ` — « ${esc(t.label)} »` : ''}`
        )
        .join('<br>');
      lines.push(
        `| \`${esc(entry.key)}\` | ${esc(entry.viewport)} | ${entry.smallTouchTargetsTotal} | ${worst} |`
      );
    }
    lines.push('');
    lines.push(
      `_Les liens en flux de texte (\`display: inline\`) sont exclus, conformément à l'exception WCAG 2.5.8._`
    );
    lines.push('');
  }

  // ── Champs de saisie ──
  lines.push(`## Champs de saisie sous ${THRESHOLDS.minInputFontPx} px`);
  lines.push('');
  lines.push(
    `_En dessous de ${THRESHOLDS.minInputFontPx} px, iOS Safari zoome automatiquement à la mise au point du champ._`
  );
  lines.push('');
  const inputPages = report.pages
    .filter((p) => p.status === 'ok' && p.viewport !== 'desktop' && p.smallInputsTotal > 0)
    .sort((a, b) => b.smallInputsTotal - a.smallInputsTotal);
  if (inputPages.length === 0) {
    lines.push('Aucun champ de saisie sous le seuil.');
    lines.push('');
  } else {
    lines.push('| Page | Viewport | Total | Champs |');
    lines.push('| --- | --- | --- | --- |');
    for (const entry of inputPages) {
      const worst = entry.smallInputs
        .slice(0, 4)
        .map(
          (f) =>
            `\`${esc(f.tag)}${f.type ? `[type=${esc(f.type)}]` : ''}\` ${f.fontSizePx} px${f.count > 1 ? ` (x${f.count})` : ''}`
        )
        .join('<br>');
      lines.push(
        `| \`${esc(entry.key)}\` | ${esc(entry.viewport)} | ${entry.smallInputsTotal} | ${worst} |`
      );
    }
    lines.push('');
  }

  // ── Pages non auditées ──
  const problems = report.pages.filter((p) => p.status !== 'ok');
  lines.push('## Pages non auditées');
  lines.push('');
  if (problems.length === 0) {
    lines.push('Toutes les pages ont été auditées.');
  } else {
    lines.push('| Page | Rôle | Viewport | Statut | Raison |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const entry of problems) {
      lines.push(
        `| \`${esc(entry.key)}\` | ${esc(entry.role)} | ${esc(entry.viewport)} | ${esc(entry.status)} | ${esc(entry.error)} |`
      );
    }
  }
  lines.push('');

  if (report.loginFailures.length) {
    lines.push('## Connexions en échec');
    lines.push('');
    for (const failure of report.loginFailures) {
      lines.push(`- \`${esc(failure.role)}\` : ${esc(failure.error)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function main() {
  // ── Garde-fou production ──
  if (/mypeg\.fr/i.test(CONFIG.baseUrl) && !CONFIG.allowProd) {
    console.error(
      [
        '',
        `  REFUS : la base URL vise un environnement PEG distant (${CONFIG.baseUrl}).`,
        "  Cet outil se connecte avec de vrais comptes et parcourt des dizaines de pages ;",
        "  on ne lance pas ça par accident sur la production ou l'intégration.",
        '',
        '  Si c\'est vraiment voulu : PEG_ALLOW_PROD=1 (ou --allow-prod).',
        '',
      ].join('\n')
    );
    process.exit(1);
  }

  // ── Le serveur répond-il ? (message clair plutôt qu'une pile d'erreurs) ──
  if (typeof fetch === 'function' && typeof AbortSignal.timeout === 'function') {
    try {
      const probe = await fetch(CONFIG.baseUrl, { signal: AbortSignal.timeout(8000) });
      if (probe.status >= 500) throw new Error(`HTTP ${probe.status}`);
    } catch (err) {
      console.error(
        [
          '',
          `  Impossible de joindre ${CONFIG.baseUrl} (${err.message}).`,
          '  Démarre le serveur de développement dans un autre terminal (npm start),',
          '  ou pointe ailleurs avec PEG_BASE_URL=... / --base-url=...',
          '',
        ].join('\n')
      );
      process.exit(1);
    }
  }

  const profiles = CONFIG.viewports
    .map((id) => VIEWPORT_PROFILES[id])
    .filter(Boolean);
  if (profiles.length === 0) {
    console.error(
      `  Aucun viewport valide. Valeurs possibles : ${Object.keys(VIEWPORT_PROFILES).join(', ')}`
    );
    process.exit(1);
  }

  const roles = CONFIG.roles.filter(
    (role) => role === 'public' || CONFIG.accounts[role] !== undefined
  );

  const matchesFilter = (key) =>
    CONFIG.only.length === 0 || CONFIG.only.some((needle) => key.includes(needle));

  ensureDir(CONFIG.outputDir);

  console.log('');
  console.log(`  Audit responsive PEG — ${CONFIG.baseUrl}`);
  console.log(`  Viewports : ${profiles.map((p) => p.id).join(', ')}`);
  console.log(`  Rôles     : ${roles.join(', ')}`);
  console.log(`  Sortie    : ${CONFIG.outputDir}`);
  console.log(`  Captures  : ${CONFIG.screenshots ? (CONFIG.fullPage ? 'page entière' : 'viewport') : 'désactivées'}`);
  console.log('');

  const browser = await chromium.launch({ headless: CONFIG.headless });
  const results = [];
  const loginFailures = [];

  try {
    for (const role of roles) {
      const specs = PAGES.filter((p) => p.role === role && matchesFilter(p.key));
      if (specs.length === 0) continue;

      // ── Session : une seule connexion par rôle, réutilisée sur chaque
      //    viewport (limite la pression sur le rate-limit de connexion). ──
      let storageState = null;
      if (role !== 'public') {
        const credentials = CONFIG.accounts[role];
        if (!credentials || !credentials.email || !credentials.password) {
          console.log(`  [SKIP] rôle ${role} — identifiants non renseignés`);
          loginFailures.push({ role, error: 'identifiants non renseignés' });
          continue;
        }
        const bootContext = await newContextFor(browser, VIEWPORT_PROFILES.desktop, null);
        const bootPage = await bootContext.newPage();
        try {
          await login(bootPage, credentials);
          storageState = await bootContext.storageState();
          console.log(`  Session ouverte : ${role}`);
        } catch (err) {
          console.log(`  [SKIP] rôle ${role} — connexion impossible : ${err.message}`);
          loginFailures.push({ role, error: err.message });
          await bootContext.close();
          continue;
        }
        await bootContext.close();
      }

      for (const profile of profiles) {
        const applicable = specs.filter(
          (spec) => !spec.viewports || spec.viewports.includes(profile.id)
        );
        if (applicable.length === 0) continue;

        console.log('');
        console.log(`  ── ${profile.label} · ${role} ──`);

        const context = await newContextFor(browser, profile, storageState);
        const page = await context.newPage();
        page.setDefaultTimeout(15000);

        for (const spec of applicable) {
          const label = spec.key.padEnd(32);
          let entry;
          try {
            entry = await auditOnePage(page, spec, profile, role, CONFIG.outputDir);
          } catch (err) {
            entry = {
              key: spec.key,
              role,
              viewport: profile.id,
              viewportWidth: profile.width,
              viewportHeight: profile.height,
              isControl: profile.control,
              path: spec.path || null,
              url: null,
              status: 'error',
              error: err.message,
              screenshot: null,
            };
          }
          results.push(entry);

          if (entry.status === 'error') {
            console.log(`  [ERR ] ${label} ${entry.error}`);
          } else if (entry.status === 'skipped') {
            console.log(`  [SKIP] ${label} ${entry.error}`);
          } else if (entry.overflow) {
            console.log(
              `  [!!  ] ${label} déborde de ${entry.metrics.overflowPx} px — ${entry.offenders.length} élément(s)`
            );
          } else if (entry.maskedOverflow) {
            console.log(
              `  [~   ] ${label} débordement masqué — ${entry.offendersTotal} élément(s) hors cadre`
            );
          } else {
            console.log(`  [OK  ] ${label} ${entry.metrics.scrollWidth} px`);
          }
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  // ── Rapports ──
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: CONFIG.baseUrl,
    thresholds: THRESHOLDS,
    viewports: profiles.map((p) => ({
      id: p.id,
      label: p.label,
      width: p.width,
      height: p.height,
      isMobile: p.isMobile,
      hasTouch: p.hasTouch,
      control: p.control,
    })),
    roles,
    options: {
      screenshots: CONFIG.screenshots,
      fullPage: CONFIG.fullPage,
      blur: CONFIG.blur,
      autoScroll: CONFIG.autoScroll,
      deviceScaleFactor: CONFIG.deviceScaleFactor,
    },
    loginFailures,
    summary: {
      pagesAudited: results.filter((r) => r.status === 'ok').length,
      pagesSkipped: results.filter((r) => r.status === 'skipped').length,
      pagesInError: results.filter((r) => r.status === 'error').length,
      pagesWithOverflow: results.filter((r) => r.overflow).length,
      pagesWithMaskedOverflow: results.filter((r) => r.maskedOverflow).length,
    },
    pages: results,
  };

  const jsonPath = join(CONFIG.outputDir, 'report.json');
  const mdPath = join(CONFIG.outputDir, 'report.md');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, `${buildMarkdown(report)}\n`, 'utf8');

  console.log('');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Pages auditées        : ${report.summary.pagesAudited}`);
  console.log(`  Débordement horizontal: ${report.summary.pagesWithOverflow}`);
  console.log(`  Débordement masqué    : ${report.summary.pagesWithMaskedOverflow}`);
  console.log(`  Ignorées / en erreur  : ${report.summary.pagesSkipped} / ${report.summary.pagesInError}`);
  console.log('');
  console.log(`  Rapport JSON     : ${jsonPath}`);
  console.log(`  Rapport markdown : ${mdPath}`);
  console.log('');

  if (CONFIG.failOnOverflow && report.summary.pagesWithOverflow > 0) {
    process.exit(1);
  }
}

// Ne s'exécute que lancé directement : importer le module (pour vérifier la
// génération du rapport, par exemple) ne doit démarrer aucun navigateur.
const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    console.error('Erreur fatale :', err);
    process.exit(1);
  });
}

export { buildMarkdown, pageProbe, PAGES, VIEWPORT_PROFILES, THRESHOLDS, CONFIG };
