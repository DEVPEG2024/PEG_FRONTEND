/**
 * Écrans de lancement iOS de l'application installée (apple-touch-startup-image).
 * ---------------------------------------------------------------------------
 * Sans eux, iOS affiche un écran BLANC le temps que l'app démarre. Une image par
 * taille d'iPhone (iOS n'en redimensionne aucune).
 *
 * L'image reproduit à l'identique l'écran de démarrage HTML d'index.html
 * (#peg-boot, affiché jusqu'au montage de React), lu directement dans le fichier :
 * écran de lancement iOS → écran de démarrage → application s'enchaînent sans
 * saut. Changer le logo ou le fond de #peg-boot, puis relancer :
 *     node scripts/pwa/generate-splash.mjs
 * Le script régénère public/splash/*.png ET le bloc <!-- splash:start/end -->
 * d'index.html. Rendu par Playwright (déjà en devDependencies).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = path.join(ROOT, 'public/splash')
const INDEX = path.join(ROOT, 'index.html')

// iPhones en portrait : dimensions CSS (points) × densité
const DEVICES = [
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max
  { w: 402, h: 874, dpr: 3 }, // 16 Pro
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 428, h: 926, dpr: 3 }, // 12 / 13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12 / 13 mini
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 414, h: 736, dpr: 3 }, // 6+ à 8 Plus
  { w: 375, h: 667, dpr: 2 }, // 6 à 8, SE 2 et 3
]

const html = fs.readFileSync(INDEX, 'utf8')
const boot = html.match(/<style>\s*#peg-boot[\s\S]*?<\/style>\s*<div id="peg-boot"[\s\S]*?<\/svg>\s*<\/div>/)
if (!boot) throw new Error('index.html : écran de démarrage #peg-boot introuvable')

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const links = []
for (const { w, h, dpr } of DEVICES) {
  // reducedMotion : l'écran de démarrage s'y fige sur son opacité de repos
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.setContent(`<!doctype html><html><body style="margin:0">${boot[0]}</body></html>`)
  const file = `iphone-${w * dpr}x${h * dpr}.png`
  await page.screenshot({ path: path.join(OUT_DIR, file) })
  await context.close()
  links.push(
    `    <link rel="apple-touch-startup-image" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/splash/${file}" />`
  )
}
await browser.close()

const START = '<!-- splash:start -->'
const END = '<!-- splash:end -->'
if (!html.includes(START) || !html.includes(END)) {
  throw new Error(`index.html : balises ${START} / ${END} introuvables`)
}
const block = `${START}\n    <!-- Généré par scripts/pwa/generate-splash.mjs — ne pas éditer à la main -->\n${links.join('\n')}\n    ${END}`
fs.writeFileSync(INDEX, html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block))

const total = fs.readdirSync(OUT_DIR).reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0)
console.log(`${DEVICES.length} écrans de lancement → public/splash (${Math.round(total / 1024)} Ko), index.html mis à jour`)
