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

// Choisit une icône en fonction de mots-clés présents dans le nom de la catégorie
export const pickCategoryIcon = (name: string): IconType => {
  const n = normalizeLabel(name);
  const has = (...keys: string[]) => keys.some((k) => n.includes(k));

  if (has('haute visibilite', 'haute-visibilite', 'gilet', 'securite', 'fluo', 'hi-vis', 'hivis')) return TbJacket;
  if (has('vetement', 't-shirt', 'tshirt', 'tee-shirt', 'textile', 'polo', 'sweat', 'casquette', 'pull', 'veste')) return TbShirt;
  if (has('signaletique', 'plv', 'panneau', 'enseigne', 'banderole', 'kakemono', 'oriflamme', 'signal', 'affichage')) return TbRoadSign;
  if (has('objet', 'goodies', 'mug', 'tasse', 'cadeau', 'gourde', 'gobelet', 'tote')) return TbMug;
  if (has('print', 'impression', 'imprime', 'papier', 'flyer', 'brochure', 'depliant', 'carte', 'affiche', 'sticker', 'autocollant')) return TbFileText;
  if (has('conception', 'graphique', 'graphisme', 'design', 'logo', 'creation', 'crea', 'identite')) return TbVectorBezier2;
  if (has('football', 'foot', 'sport', 'ballon', 'maillot', 'club')) return TbBallFootball;
  if (has('photo', 'video', 'camera', 'film', 'audiovisuel', 'drone')) return TbCamera;
  return TbCategory2;
};
