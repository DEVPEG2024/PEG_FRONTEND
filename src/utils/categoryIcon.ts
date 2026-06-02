import { IconType } from 'react-icons';
import {
  TbShirt,
  TbJacket,
  TbRoadSign,
  TbMug,
  TbFileText,
  TbVectorBezier2,
  TbBallFootball,
  TbCamera,
  TbCategory2,
} from 'react-icons/tb';

// Normalise un libellé : minuscules + suppression des accents
export const normalizeLabel = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Détermine le "type" visuel d'une catégorie d'après des mots-clés de son nom
type CategoryKind =
  | 'visibilite' | 'vetement' | 'signaletique' | 'objet'
  | 'print' | 'conception' | 'football' | 'photo' | 'default';

const detectKind = (name: string): CategoryKind => {
  const n = normalizeLabel(name);
  const has = (...keys: string[]) => keys.some((k) => n.includes(k));

  if (has('haute visibilite', 'haute-visibilite', 'gilet', 'securite', 'fluo', 'hi-vis', 'hivis')) return 'visibilite';
  if (has('vetement', 't-shirt', 'tshirt', 'tee-shirt', 'textile', 'polo', 'sweat', 'casquette', 'pull', 'veste')) return 'vetement';
  if (has('signaletique', 'plv', 'panneau', 'enseigne', 'banderole', 'kakemono', 'oriflamme', 'signal', 'affichage')) return 'signaletique';
  if (has('objet', 'goodies', 'mug', 'tasse', 'cadeau', 'gourde', 'gobelet', 'tote')) return 'objet';
  if (has('print', 'impression', 'imprime', 'papier', 'flyer', 'brochure', 'depliant', 'carte', 'affiche', 'sticker', 'autocollant')) return 'print';
  if (has('conception', 'graphique', 'graphisme', 'design', 'logo', 'creation', 'crea', 'identite')) return 'conception';
  if (has('football', 'foot', 'sport', 'ballon', 'maillot', 'club')) return 'football';
  if (has('photo', 'video', 'camera', 'film', 'audiovisuel', 'drone')) return 'photo';
  return 'default';
};

const ICONS: Record<CategoryKind, IconType> = {
  visibilite: TbJacket,
  vetement: TbShirt,
  signaletique: TbRoadSign,
  objet: TbMug,
  print: TbFileText,
  conception: TbVectorBezier2,
  football: TbBallFootball,
  photo: TbCamera,
  default: TbCategory2,
};

// Couleur néon par type de catégorie (style sombre lumineux)
const COLORS: Record<CategoryKind, string> = {
  vetement: '#3b82f6',     // bleu
  signaletique: '#a855f7', // violet
  objet: '#22d3ee',        // cyan
  print: '#fb7185',        // rose
  conception: '#60a5fa',   // bleu clair
  visibilite: '#f59e0b',   // orange
  football: '#84cc16',     // vert
  photo: '#c084fc',        // magenta
  default: '#3b82f6',      // bleu
};

// Choisit une icône en fonction de mots-clés présents dans le nom de la catégorie
export const pickCategoryIcon = (name: string): IconType => ICONS[detectKind(name)];

// Choisit une couleur néon en fonction de mots-clés présents dans le nom de la catégorie
export const pickCategoryColor = (name: string): string => COLORS[detectKind(name)];
