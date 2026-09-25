/**
 * Icônes de l'application (écran d'accueil iPhone / Android, bureau, onglet).
 * ---------------------------------------------------------------------------
 * Demande du 25/09/2026 : « seulement un cercle mauve sur fond bleu foncé ».
 * - fond : le bleu nuit de l'app (#0f1c2e, theme_color du manifeste), en léger
 *   dégradé ;
 * - cercle : le MAUVE de la marque, dégradé #6d5dfc → #4f3fd1 — celui du point
 *   du logo et du bouton « Se connecter » (SignIn.tsx : jamais le rose-magenta),
 *   avec un halo doux et un reflet discret pour le relief.
 * Le cercle tient dans la zone sûre des icônes « maskable » (80 % central) :
 * iOS arrondit les coins, Android peut découper en rond, rien n'est rogné.
 * Aux petites tailles (onglet), cercle plus grand et halo presque absent, sinon
 * il ne reste qu'un point.
 *
 *     node scripts/pwa/generate-icons.mjs
 *
 * Régénère public/{android-chrome-192x192,android-chrome-512x512,
 * apple-touch-icon,favicon-16x16,favicon-32x32}.png et public/favicon.ico.
 * Après un changement d'icône, incrémenter le `?v=` des liens d'icônes
 * (index.html, site.webmanifest) : Android et les navigateurs relisent l'icône.
 * Rendu par Playwright (déjà en devDependencies).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PUBLIC = path.join(ROOT, 'public')

/** Icône dessinée sur 512 unités. `radius` : rayon du cercle ; `halo` : opacité du halo. */
const iconSvg = ({ radius, halo }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#1a2d47"/>
      <stop offset="1" stop-color="#0b1524"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.45" stop-color="#6d5dfc" stop-opacity="${halo}"/>
      <stop offset="1" stop-color="#6d5dfc" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="dot" x1="0.18" y1="0.1" x2="0.82" y2="0.95">
      <stop offset="0" stop-color="#6d5dfc"/>
      <stop offset="1" stop-color="#4f3fd1"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.36" cy="0.3" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="228" fill="url(#halo)"/>
  <circle cx="256" cy="256" r="${radius}" fill="url(#dot)"/>
  <circle cx="256" cy="256" r="${radius}" fill="url(#shine)"/>
</svg>`

const LARGE = iconSvg({ radius: 118, halo: 0.3 })
const SMALL = iconSvg({ radius: 170, halo: 0.12 })

const TARGETS = [
  { file: 'android-chrome-512x512.png', size: 512, svg: LARGE },
  { file: 'android-chrome-192x192.png', size: 192, svg: LARGE },
  { file: 'apple-touch-icon.png', size: 180, svg: LARGE },
  { file: 'favicon-32x32.png', size: 32, svg: SMALL },
  { file: 'favicon-16x16.png', size: 16, svg: SMALL },
]
const ICO_SIZES = [16, 32, 48]

const browser = await chromium.launch()
const page = await browser.newPage()
const render = async (svg, size) => {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`,
  )
  return page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } })
}

for (const t of TARGETS) {
  fs.writeFileSync(path.join(PUBLIC, t.file), await render(t.svg, t.size))
  console.log(`public/${t.file}`)
}

// favicon.ico : conteneur ICO d'images PNG (16, 32, 48 px), lu par tous les
// navigateurs actuels. En-tête 6 octets + 16 octets par image, puis les PNG.
const pngs = []
for (const size of ICO_SIZES) pngs.push({ size, data: await render(SMALL, size) })
const header = Buffer.alloc(6 + 16 * pngs.length)
header.writeUInt16LE(0, 0) // réservé
header.writeUInt16LE(1, 2) // type : icône
header.writeUInt16LE(pngs.length, 4)
let offset = header.length
pngs.forEach(({ size, data }, i) => {
  const e = 6 + 16 * i
  header.writeUInt8(size, e) // largeur
  header.writeUInt8(size, e + 1) // hauteur
  header.writeUInt8(0, e + 2) // palette
  header.writeUInt8(0, e + 3) // réservé
  header.writeUInt16LE(1, e + 4) // plans
  header.writeUInt16LE(32, e + 6) // bits par pixel
  header.writeUInt32LE(data.length, e + 8)
  header.writeUInt32LE(offset, e + 12)
  offset += data.length
})
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...pngs.map((p) => p.data)]))
console.log('public/favicon.ico')

await browser.close()
