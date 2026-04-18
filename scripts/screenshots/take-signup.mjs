import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // 1. Capture page de login
  console.log('  Navigation vers la page de connexion...');
  await page.goto('https://app.mypeg.fr/sign-in');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: join(OUTPUT_DIR, 'screenshot-login.png'),
    fullPage: false,
  });
  console.log('  [OK] screenshot-login.png — Page de connexion');

  // 2. Clic sur "Créer un compte" pour ouvrir la modal
  console.log('  Ouverture de la modal inscription...');
  const createBtn = page.locator('text=Créer un compte').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshot-signup.png'),
      fullPage: false,
    });
    console.log('  [OK] screenshot-signup.png — Modal création de compte');
  } else {
    console.error('  [FAIL] Bouton "Créer un compte" non trouvé');
  }

  await browser.close();
  console.log(`\n  Terminé ! Captures dans : ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  console.error('Erreur :', err);
  process.exit(1);
});
