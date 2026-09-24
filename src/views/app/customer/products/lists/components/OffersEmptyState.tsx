// États « sans offre » de « Mes offres » : une variante par profil client.
//   standard    → Premium (tarif issu des constantes) + sélection du catalogue
//   preparing   → Premium récent (premiumSince posé par le webhook) : frise
//   premium     → Premium sans offre (ancien client migré ou déjà traité)
//   noCatalogue → catalogAccess === false : ni catalogue, ni Premium
//   unknown     → statut Premium inconnu : aucune mention de Premium
//   noCustomer  → compte sans fiche client
// Chiffrage = TOUJOURS « Demander un devis » (/customer/devis).
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  HiArrowRight,
  HiOutlineCollection,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineSupport,
} from 'react-icons/hi';
import { TbCrown, TbDiscount, TbGift, TbSparkles } from 'react-icons/tb';
import {
  PREMIUM_ADVANTAGES,
  PREMIUM_MIN_MONTHS,
  PREMIUM_PRICE_HT,
} from '@/services/PremiumServices';
import { fmtEur } from '@/utils/priceHelpers';
import CatalogueSelection from './CatalogueSelection';
import OffersHelpStrip from './OffersHelpStrip';
import OffersProgressSteps from './OffersProgressSteps';
import {
  ACTION_CARD_CLASS,
  CTA_CLASS,
  EYEBROW_STYLE,
  GHOST_BUTTON_STYLE,
  GOLD_BUTTON_STYLE,
  IconTile,
  PREMIUM_PCT,
  EvenGrid,
  PANEL_TILE_CLASS,
  SECTION_TITLE_STYLE,
  VIOLET_BUTTON_STYLE,
  fmtLongDate,
} from './offersUi';

export type OffersEmptyVariant =
  | 'standard'
  | 'preparing'
  | 'premium'
  | 'noCatalogue'
  | 'unknown'
  | 'noCustomer';

type OffersEmptyStateProps = {
  variant: OffersEmptyVariant;
  customerName?: string;
  premiumSince?: string | null;
  /** catalogAccess !== false : autorise la sélection du catalogue. */
  showSelection: boolean;
  /** documentId déjà affichés (jamais en double dans la sélection). */
  excludeIds: string[];
};

// ─── Panneau principal ──────────────────────────────────────────────────────

type PanelTone = 'gold' | 'violet';

const PANEL_TONES: Record<
  PanelTone,
  { background: string; border: string; tile: string; eyebrow: string }
> = {
  gold: {
    background:
      'linear-gradient(160deg, rgba(34,30,12,0.95), rgba(13,16,24,0.95))',
    border: '1px solid rgba(234,179,8,0.25)',
    tile: 'rgba(234,179,8,0.14)',
    eyebrow: '#fde68a',
  },
  violet: {
    // Surface distincte du hero (VIOLET_HERO_BG) : sinon deux « héros »
    // identiques s'empilaient.
    background:
      'linear-gradient(160deg, rgba(124,107,255,0.1), rgba(255,255,255,0.02))',
    border: '1px solid rgba(124,107,255,0.25)',
    tile: 'rgba(124,107,255,0.16)',
    eyebrow: '#a99bff',
  },
};

const OfferPanel = ({
  tone,
  icon,
  eyebrow,
  title,
  children,
  footnote,
  actions,
}: {
  tone: PanelTone;
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footnote?: ReactNode;
  actions?: ReactNode;
}) => {
  const t = PANEL_TONES[tone];
  return (
    <div
      className="peg-pad-mobile"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: '20px',
        padding: '28px 32px',
        borderRadius: '20px',
        background: t.background,
        border: t.border,
      }}
    >
      <IconTile
        size={56}
        radius={16}
        background={t.tile}
        className={PANEL_TILE_CLASS}
      >
        {icon}
      </IconTile>
      <div style={{ flex: '1 1 280px', minWidth: 0 }}>
        {eyebrow && (
          <p
            style={{ ...EYEBROW_STYLE, color: t.eyebrow, marginBottom: '6px' }}
          >
            {eyebrow}
          </p>
        )}
        <h2
          style={{
            margin: 0,
            color: '#fff',
            fontSize: 'var(--peg-fs-20)',
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        <p
          className="peg-text-secondary"
          style={{
            margin: '8px 0 0',
            fontSize: '14px',
            lineHeight: 1.55,
            maxWidth: '640px',
          }}
        >
          {children}
        </p>
        {footnote && (
          <p
            className="peg-text-caption"
            style={{ margin: '10px 0 0', fontSize: '12.5px' }}
          >
            {footnote}
          </p>
        )}
        {actions && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginTop: '18px',
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Cartes-actions ─────────────────────────────────────────────────────────

type ActionDef = {
  key: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  color: string;
  title: string;
  text: string;
  cta: string;
  to: string;
};

const ACTION_BRIEF: ActionDef = {
  key: 'brief',
  icon: HiOutlineDocumentText,
  color: '#a78bfa',
  title: 'Décrire votre besoin',
  text: 'Produits, quantités, délais : une demande de devis nous donne tout le contexte.',
  cta: 'Demander un devis',
  to: '/customer/devis',
};

const ACTION_FILES: ActionDef = {
  key: 'files',
  icon: HiOutlinePhotograph,
  color: '#60a5fa',
  title: 'Déposer votre logo et votre charte',
  text: 'Vos fichiers servent à préparer les visuels de vos produits.',
  cta: 'Ajouter des fichiers',
  to: '/customer/files',
};

const ACTION_TICKET: ActionDef = {
  key: 'ticket',
  icon: HiOutlineSupport,
  color: '#34d399',
  title: 'Échanger avec l’équipe',
  text: 'Une question, une précision ? Écrivez-nous par ticket.',
  cta: 'Ouvrir un ticket',
  to: '/support',
};

const ActionCard = ({ action }: { action: ActionDef }) => {
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      className={ACTION_CARD_CLASS}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.02)',
        textDecoration: 'none',
        minWidth: 0,
      }}
    >
      <IconTile size={40} radius={12} background={`${action.color}1f`}>
        <Icon size={20} color={action.color} />
      </IconTile>
      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
        {action.title}
      </span>
      <span
        className="peg-text-secondary"
        style={{ fontSize: '12.5px', lineHeight: 1.45, flex: 1 }}
      >
        {action.text}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: action.color,
          fontSize: '12.5px',
          fontWeight: 600,
        }}
      >
        {action.cta}
        <HiArrowRight aria-hidden="true" size={14} />
      </span>
    </Link>
  );
};

const ActionSection = ({
  title,
  caption,
  actions,
}: {
  title: string;
  caption?: string;
  actions: ActionDef[];
}) => (
  <section style={{ marginTop: '32px' }}>
    <h2 style={SECTION_TITLE_STYLE}>{title}</h2>
    {caption && (
      <p
        className="peg-text-caption"
        style={{ margin: '4px 0 0', fontSize: '12.5px' }}
      >
        {caption}
      </p>
    )}
    <EvenGrid cols={actions.length} style={{ marginTop: '14px' }}>
      {actions.map((a) => (
        <ActionCard key={a.key} action={a} />
      ))}
    </EvenGrid>
  </section>
);

// ─── Avantages Premium (vue standard) ───────────────────────────────────────

const ADVANTAGE_ICONS = [TbDiscount, TbGift, TbCrown];

const PremiumAdvantages = () => (
  <section style={{ marginTop: '32px' }}>
    <h2 style={SECTION_TITLE_STYLE}>Ce que comprend Premium</h2>
    <EvenGrid cols={PREMIUM_ADVANTAGES.length} style={{ marginTop: '14px' }}>
      {PREMIUM_ADVANTAGES.map((a, i) => {
        const Icon = ADVANTAGE_ICONS[i] ?? TbCrown;
        return (
          <div
            key={a.title}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <IconTile size={36} radius={10} background="#eab3081f">
              <Icon size={18} color="#eab308" />
            </IconTile>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {a.title}
              </p>
              <p
                className="peg-text-secondary"
                style={{
                  margin: '4px 0 0',
                  fontSize: '12.5px',
                  lineHeight: 1.45,
                }}
              >
                {a.desc}
              </p>
            </div>
          </div>
        );
      })}
    </EvenGrid>
  </section>
);

// ─── Boutons ────────────────────────────────────────────────────────────────

const LinkButton = ({
  to,
  style,
  children,
}: {
  to: string;
  style: CSSProperties;
  children: ReactNode;
}) => (
  <Link to={to} className={CTA_CLASS} style={style}>
    {children}
  </Link>
);

const DevisButton = ({ ghost = false }: { ghost?: boolean }) => (
  <LinkButton
    to="/customer/devis"
    style={ghost ? GHOST_BUTTON_STYLE : VIOLET_BUTTON_STYLE}
  >
    Demander un devis
  </LinkButton>
);

const TicketButton = () => (
  <LinkButton to="/support" style={GHOST_BUTTON_STYLE}>
    Ouvrir un ticket
  </LinkButton>
);

// ─── Variantes ──────────────────────────────────────────────────────────────

const OffersEmptyState = ({
  variant,
  customerName,
  premiumSince,
  showSelection,
  excludeIds,
}: OffersEmptyStateProps) => {
  const company = customerName || 'votre entreprise';

  switch (variant) {
    case 'standard':
      return (
        <>
          <OfferPanel
            tone="gold"
            icon={<TbGift size={26} color="#eab308" />}
            eyebrow="OFFRES PERSONNALISÉES"
            title="Les offres personnalisées sont incluses dans Premium"
            footnote={`${fmtEur(PREMIUM_PRICE_HT)} HT / mois · engagement ${PREMIUM_MIN_MONTHS} mois minimum`}
            actions={
              <>
                <LinkButton to="/customer/premium" style={GOLD_BUTTON_STYLE}>
                  Passer en Premium
                </LinkButton>
                <DevisButton ghost />
              </>
            }
          >
            Avec Premium, l’équipe PEG prépare des offres personnalisées pour
            votre entreprise. Elles apparaissent sur cette page, prêtes à
            commander. Vous bénéficiez aussi de -{PREMIUM_PCT} % sur tout le
            catalogue.
          </OfferPanel>
          <PremiumAdvantages />
          {showSelection && (
            <CatalogueSelection
              title="Notre sélection du catalogue"
              excludeIds={excludeIds}
            />
          )}
          <OffersHelpStrip />
        </>
      );

    case 'preparing': {
      const since = fmtLongDate(premiumSince);
      return (
        <>
          <OfferPanel
            tone="violet"
            icon={<TbSparkles size={26} color="#a78bfa" />}
            eyebrow={
              since ? `Premium actif depuis le ${since}` : 'Premium actif'
            }
            title="Vos offres personnalisées sont en préparation"
          >
            L’équipe PEG prépare des offres personnalisées pour {company}. Elles
            apparaîtront sur cette page dès qu’elles seront prêtes.
          </OfferPanel>
          <OffersProgressSteps sinceLabel={since} />
          <ActionSection
            title="Pour préparer vos offres"
            caption="Trois façons de nous aider à viser juste."
            actions={[ACTION_BRIEF, ACTION_FILES, ACTION_TICKET]}
          />
          {showSelection && (
            <CatalogueSelection
              title="En attendant, notre sélection"
              premiumNote
              excludeIds={excludeIds}
            />
          )}
        </>
      );
    }

    case 'premium':
      return (
        <>
          <OfferPanel
            tone="violet"
            icon={<HiOutlineCollection size={26} color="#a99bff" />}
            eyebrow="CLIENT PREMIUM"
            title="Aucune offre personnalisée pour le moment"
            actions={<DevisButton />}
          >
            Les offres personnalisées préparées pour {company} apparaîtront sur
            cette page. Un nouveau besoin ? Décrivez-le dans une demande de
            devis : l’équipe PEG vous accompagne.
          </OfferPanel>
          <ActionSection
            title="Pour nous faire part d’un besoin"
            actions={[ACTION_FILES, ACTION_TICKET]}
          />
          {showSelection && (
            <CatalogueSelection
              title="Notre sélection du moment"
              premiumNote
              excludeIds={excludeIds}
            />
          )}
        </>
      );

    case 'noCatalogue':
      // Ni Premium, ni lien vers le catalogue, ni sélection.
      return (
        <>
          <OfferPanel
            tone="violet"
            icon={<HiOutlineDocumentText size={26} color="#a99bff" />}
            title="Aucune offre disponible pour le moment"
            actions={
              <>
                <DevisButton />
                <TicketButton />
              </>
            }
          >
            Votre espace est configuré pour commander à partir des offres
            préparées par l’équipe PEG. Décrivez votre besoin : l’équipe vous
            répond par un devis.
          </OfferPanel>
          <ActionSection
            title="Pour nous faire part d’un besoin"
            actions={[ACTION_FILES, ACTION_TICKET]}
          />
        </>
      );

    case 'unknown':
      // Statut Premium inconnu : aucune mention de Premium.
      return (
        <>
          <OfferPanel
            tone="violet"
            icon={<HiOutlineCollection size={26} color="#a99bff" />}
            title="Aucune offre personnalisée pour le moment"
            actions={
              <>
                <DevisButton />
                <TicketButton />
              </>
            }
          >
            Les offres préparées pour votre entreprise apparaîtront sur cette
            page.
          </OfferPanel>
          {showSelection && (
            <CatalogueSelection
              title="Notre sélection du moment"
              excludeIds={excludeIds}
            />
          )}
          <OffersHelpStrip />
        </>
      );

    case 'noCustomer':
    default:
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px',
            padding: '64px 20px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            Votre espace est en cours de configuration
          </p>
          <p
            className="peg-text-secondary"
            style={{ margin: 0, fontSize: '13px' }}
          >
            Ouvrez un ticket : l’équipe PEG rattache votre compte à votre
            entreprise.
          </p>
          <TicketButton />
        </div>
      );
  }
};

export default OffersEmptyState;
