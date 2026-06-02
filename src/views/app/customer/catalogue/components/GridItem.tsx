import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
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
  TbArrowRight,
} from 'react-icons/tb';

// Normalise un libellé : minuscules + suppression des accents
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Choisit une icône en fonction de mots-clés présents dans le nom de la catégorie
const pickIcon = (name: string): IconType => {
  const n = normalize(name);
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

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = pickIcon(name);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.boxShadow = '0 16px 32px rgba(37,99,235,0.14)';
      cardRef.current.style.borderColor = 'rgba(37,99,235,0.45)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.boxShadow = '0 1px 2px rgba(16,24,40,0.04)';
      cardRef.current.style.borderColor = '#eaedf3';
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/customer/catalogue/categories/${data.documentId}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '20px',
        padding: '40px 20px 32px',
        minHeight: '230px',
        borderRadius: '20px',
        cursor: 'pointer',
        background: '#ffffff',
        border: '1px solid #eaedf3',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Icône de catégorie */}
      <Icon size={64} color="#2563eb" strokeWidth={1.6} />

      {/* Nom */}
      <p style={{
        color: '#0b1f3a',
        fontWeight: 700,
        fontSize: '18px',
        letterSpacing: '-0.01em',
        margin: 0,
        lineHeight: 1.25,
      }}>
        {name}
      </p>

      {/* Flèche */}
      <TbArrowRight size={22} color="#2563eb" strokeWidth={2} />
    </div>
  );
};

export default GridItem;
