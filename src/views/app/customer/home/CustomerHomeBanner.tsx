// Bannière de l'accueil client.
//
// Ordinateur et tablette (≥ 768px) : rendu inchangé depuis juillet — image
// principale, 220px de haut au plus, rognée en `cover`.
//
// Téléphone : cadre TROIS FOIS plus haut qu'avant (demande Nova du 25/09/2026).
// - Image téléphone de la bannière (`mobileImage`) : affichée entière, à ses
//   proportions — au format conseillé (1280 × 600) elle remplit ce cadre.
// - Sinon, l'image d'ordinateur est posée ENTIÈRE au milieu du cadre, sur un
//   fond qui en est une copie floutée. La rogner pour remplir le cadre ne
//   laisserait qu'un tiers de sa largeur : là où les visuels placent le logo
//   du client (constaté en septembre sur une bannière 2836 × 442).
import useResponsive from '@/utils/hooks/useResponsive';
import { buildImageSources } from '@/utils/strapiImage';
import {
  BannerImage,
  MOBILE_BANNER_HEIGHT,
  MOBILE_BANNER_WIDTH,
  PhoneBannerImage,
} from '@/utils/bannerVisual';

const FADE = 'linear-gradient(to top, #0a1628, transparent)';
const PHONE_FRAME_RATIO = `${MOBILE_BANNER_WIDTH} / ${MOBILE_BANNER_HEIGHT}`;

const PhoneBanner = ({ image, dedicated }: PhoneBannerImage) => {
  const src = image.url!;
  if (dedicated) {
    const sources = buildImageSources(image);
    return (
      <div style={{ position: 'relative' }}>
        <img
          src={src}
          srcSet={sources?.srcSet}
          sizes={sources?.srcSet ? '100vw' : undefined}
          // Dimensions connues → la place est réservée avant le chargement
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          alt="Bannière"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: FADE }} />
      </div>
    );
  }
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: PHONE_FRAME_RATIO,
      overflow: 'hidden', background: '#0a1628',
    }}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: 'blur(22px) brightness(0.6)', transform: 'scale(1.25)',
        }}
      />
      <img
        src={src}
        alt="Bannière"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {/* Fondu limité au tiers bas : il ne recouvre que le fond flouté */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '33%', background: FADE }} />
    </div>
  );
};

/** Visuel épuré sans texte, quand aucune bannière n'a d'image. */
const EmptyBanner = ({ phone }: { phone: boolean }) => (
  <div style={{
    position: 'relative',
    width: '100%',
    // Téléphone : même cadre que les bannières illustrées
    ...(phone ? { aspectRatio: PHONE_FRAME_RATIO } : { height: '180px' }),
    background: 'radial-gradient(120% 160% at 82% 8%, rgba(124,107,255,0.30) 0%, rgba(91,71,224,0.10) 46%, rgba(10,12,22,0.2) 76%), linear-gradient(160deg, #14152a 0%, #0a0c16 100%)',
    overflow: 'hidden',
  }}>
    {/* Halo décoratif */}
    <div style={{
      position: 'absolute', top: '-70px', right: '-30px',
      width: '280px', height: '280px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(124,107,255,0.22), transparent 70%)',
    }} />
    <div style={{
      position: 'absolute', bottom: '-90px', right: '22%',
      width: '200px', height: '200px', borderRadius: '50%',
      background: 'rgba(124,107,255,0.06)',
      border: '1px solid rgba(124,107,255,0.12)',
    }} />
    <div style={{
      position: 'absolute', top: '26px', left: '6%',
      width: '90px', height: '90px', borderRadius: '50%',
      background: 'rgba(169,155,255,0.05)',
      border: '1px solid rgba(169,155,255,0.08)',
    }} />
    {/* Grille de points */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }} />
    {/* Dégradé bas (raccord avec le contenu) */}
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '80px',
      background: 'linear-gradient(to top, #0a0c16, transparent)',
    }} />
  </div>
);

const CustomerHomeBanner = ({
  desktop,
  phone,
}: {
  desktop: BannerImage | null;
  phone: PhoneBannerImage | null;
}) => {
  const { smaller } = useResponsive();

  if (smaller.md) {
    return phone ? <PhoneBanner {...phone} /> : <EmptyBanner phone />;
  }
  if (!desktop?.url) return <EmptyBanner phone={false} />;
  return (
    <div style={{ position: 'relative' }}>
      <img
        src={desktop.url}
        alt="Banner"
        style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '80px',
        background: FADE,
      }} />
    </div>
  );
};

export default CustomerHomeBanner;
