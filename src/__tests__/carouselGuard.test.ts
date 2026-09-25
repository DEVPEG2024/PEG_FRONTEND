import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

// Garde-fou : tous les carrousels passent par components/shared/Carousel.
// Chaque règle correspond à une panne réelle constatée au téléphone (25/09/2026).

const SRC = join(__dirname, '..');
const CAROUSEL = 'components/shared/Carousel.tsx';

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__') walk(p);
    } else if (/\.(tsx?|css|scss)$/.test(name)) files.push(p);
  }
};
walk(SRC);
const rel = (p: string) => relative(SRC, p).split('\\').join('/');
const read = (p: string) => readFileSync(p, 'utf8');

test('aucune piste avancée par incréments de scrollLeft (Safari arrondit : la piste reste à 0)', () => {
  const offenders = files.filter((f) => /scrollLeft\s*[+-]=/.test(read(f))).map(rel);
  expect(offenders).toEqual([]);
});

test('aucun défilé CSS en boucle sur liste dupliquée (ni glissable ni pausable au doigt)', () => {
  const marquee = /@keyframes\s+[\w-]+\s*\{\s*(from|0%)\s*\{[^}]*\}\s*(to|100%)\s*\{[^}]*translateX\(\s*-50%\s*\)/;
  const offenders = files.filter((f) => marquee.test(read(f))).map(rel);
  expect(offenders).toEqual([]);
});

test('l’ancien auto-défilement natif (useAutoAdvance) n’est pas réintroduit', () => {
  expect(existsSync(join(SRC, 'utils/hooks/useAutoAdvance.ts'))).toBe(false);
  expect(files.filter((f) => /useAutoAdvance/.test(read(f))).map(rel)).toEqual([]);
});

test('Embla et ses greffons ne sont branchés QUE dans le composant partagé', () => {
  const offenders = files
    .filter((f) => rel(f) !== CAROUSEL)
    .filter((f) => /from ['"]embla-carousel-(react|autoplay|auto-scroll)['"]/.test(read(f)))
    .map(rel);
  expect(offenders).toEqual([]);
});

test('les carrousels clients utilisent le composant partagé', () => {
  for (const f of [
    'views/app/customer/home/DashboardCustomerMobile.tsx',
    'views/app/customer/home/DashboardCustomer.tsx',
    'views/app/customer/cart/Cart.tsx',
    'components/shared/ProductImageCarousel.tsx',
  ]) {
    const src = read(join(SRC, f));
    expect({ f, imports: /from '@\/components\/shared\/Carousel'/.test(src) }).toEqual({ f, imports: true });
    expect({ f, uses: /<Carousel\b/.test(src) }).toEqual({ f, uses: true });
  }
});

test('le défilé continu ne démarre ni ne s’arrête au survol de lui-même (piège iOS : mouseenter émulé)', () => {
  const src = read(join(SRC, CAROUSEL));
  expect(src).toMatch(/stopOnMouseEnter:\s*false/);
  expect(src).toMatch(/playOnInit:\s*false/);
  expect(src).toMatch(/useCarouselMotion\(/);
});

test('la garde de tape reste branchée (sinon une tape de 2 px sur une carte n’ouvre rien sur iPhone)', () => {
  const src = read(join(SRC, CAROUSEL));
  expect(src).toMatch(/return installTapGuard\(api\.rootNode\(\)\)/);
  expect(src).toMatch(/dragThreshold:\s*TAP_SLOP/);
});
