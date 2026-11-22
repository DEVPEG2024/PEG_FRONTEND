/*
 * Accueil admin PEG — rendu « hub » (demande explicite du 22/11/2026 : « le même
 * design que la page Master Print », sur ordinateur, tablette et téléphone).
 *
 * Composant d'AFFICHAGE seulement : aucun calcul ici. DashboardAdmin (protégé)
 * calcule tout et passe les valeurs déjà formatées ; la bannière, le pense-bête,
 * les widgets (ordre par glisser-déposer, masquage, réinitialisation) et le
 * détail « Reste à encaisser » restent les siens. Styles : design « hub » commun
 * (components/shared/hub, préfixe hx-).
 */
import type { DragEvent, ReactNode } from 'react';
import {
  TbBuildingCommunity,
  TbEye,
  TbEyeOff,
  TbGripVertical,
  TbLock,
  TbPhotoEdit,
  TbPlus,
  TbRefresh,
  TbX,
} from 'react-icons/tb';
import Container from '@/components/shared/Container';
import { HUB_CSS } from '@/components/shared/hub/hubStyles';
import { Kpi, MeterList, Ring, tint } from '@/components/shared/hub/HubWidgets';

// ── Types ───────────────────────────────────────────────────────────────────

export type HubTone = 'danger' | 'warning' | 'info' | 'ok';

export type HubTile = {
  key: string;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  icon: ReactNode;
  accent: string;
  onClick?: () => void;
  /** Anneau à droite du pied (part en %). */
  ring?: { value: number; color: string; text?: string };
};

export type HubWidgetView = {
  id: string;
  label: string;
  wide: boolean;
  content: ReactNode;
};

type Props = {
  greeting: string;
  dateLabel: string;
  attention: Array<{
    key: string;
    tone: HubTone;
    label: string;
    onClick?: () => void;
  }>;
  bannerUrl: string;
  onPickBanner: () => void;
  hidePrices: boolean;
  onTogglePrices: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdatedText: string;
  onOpenCity?: () => void;
  error: string | null;
  dataReady: boolean;
  hero: {
    label: string;
    value: ReactNode;
    /** Montant HT. */
    ht: ReactNode;
    /** CA du mois en cours (formaté). */
    month: ReactNode;
    /** Variation du mois en cours sur le mois dernier, en %. */
    delta: number | null;
    /** Six derniers mois (le dernier = mois en cours). */
    bars: Array<{ label: string; value: number; display: string }>;
    onClick: () => void;
  };
  finance: HubTile[];
  ops: HubTile[];
  widgets: HubWidgetView[];
  edit: {
    on: boolean;
    toggle: () => void;
    reset: () => void;
    hidden: Array<{ id: string; label: string }>;
    show: (id: string) => void;
    hide: (id: string) => void;
    draggingIdx: number | null;
    overIdx: number | null;
    onDragStart: (i: number) => (e: DragEvent) => void;
    onDragOver: (i: number) => (e: DragEvent) => void;
    onDrop: (i: number) => (e: DragEvent) => void;
    onDragEnd: () => void;
  };
};

const TONE: Record<HubTone, string> = {
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#9d92ff',
  ok: '#34d399',
};

// ── Briques des widgets (utilisées par DashboardAdmin.renderWidget) ─────────

/** En-tête de widget : titre, précision, lien à droite. */
export const WidgetHead = ({
  title,
  note,
  right,
}: {
  title: string;
  note?: ReactNode;
  right?: ReactNode;
}) => (
  <div className="hx-card-head">
    <div style={{ minWidth: 0 }}>
      <h3 className="hx-card-title">{title}</h3>
      {note && <p className="hx-card-note">{note}</p>}
    </div>
    {right}
  </div>
);

export const WidgetLink = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) => (
  <button type="button" className="hx-link" onClick={onClick}>
    {children}
  </button>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="hx-empty">{children}</p>
);

/** Lignes : titre, précision, valeur ou étiquette, rang, clic. */
export const Rows = ({
  items,
}: {
  items: Array<{
    key: string;
    title: string;
    sub?: string;
    value?: ReactNode;
    tag?: { text: string; tone: HubTone };
    rank?: { n: number; color: string };
    onClick?: () => void;
  }>;
}) => (
  <ul className="hx-rows">
    {items.map((it) => (
      <li
        key={it.key}
        className={`hx-row${it.onClick ? ' hx-row--link' : ''}`}
        onClick={it.onClick}
        onKeyDown={(e) => {
          if (it.onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            it.onClick();
          }
        }}
        tabIndex={it.onClick ? 0 : undefined}
        role={it.onClick ? 'button' : undefined}
      >
        {it.rank && (
          <span
            className="hx-rank"
            style={{
              background: tint(it.rank.color, 0.16),
              color: it.rank.color,
            }}
          >
            {it.rank.n}
          </span>
        )}
        <div className="hx-row-main">
          <p className="hx-row-title">{it.title}</p>
          {it.sub && <p className="hx-row-sub">{it.sub}</p>}
        </div>
        {it.tag && (
          <span
            className="hx-tag"
            style={{
              background: tint(TONE[it.tag.tone], 0.16),
              color: TONE[it.tag.tone],
            }}
          >
            {it.tag.text}
          </span>
        )}
        {it.value != null && <span className="hx-row-value">{it.value}</span>}
      </li>
    ))}
  </ul>
);

/** Points d'attention (ligne colorée + pastille). */
export const AlertRows = ({
  items,
}: {
  items: Array<{ key: string; tone: HubTone; text: string }>;
}) => (
  <ul className="hx-actions">
    {items.map((a) => (
      <li
        key={a.key}
        className="hx-action"
        style={{
          gridTemplateColumns: '12px minmax(0, 1fr)',
          padding: '11px 14px',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: TONE[a.tone],
          }}
          aria-hidden="true"
        />
        <p className="hx-action-title" style={{ fontWeight: 600 }}>
          {a.text}
        </p>
      </li>
    ))}
  </ul>
);

/** Répartition par statut : jauges d'une seule teinte, les plus nombreux d'abord. */
export const StateBars = ({
  items,
  color = '#9d92ff',
  onClick,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  color?: string;
  onClick?: (key: string) => void;
}) => (
  <MeterList
    color={color}
    items={items.map((i) => ({
      ...i,
      onClick: onClick ? () => onClick(i.key) : undefined,
    }))}
  />
);

// ── Page ────────────────────────────────────────────────────────────────────

const Tile = ({ t, className }: { t: HubTile; className?: string }) => (
  <Kpi
    label={t.label}
    icon={t.icon}
    accent={t.accent}
    value={t.value}
    onClick={t.onClick}
    className={className}
    testId="hx-tile"
    foot={
      <>
        <span>{t.foot}</span>
        {t.ring && (
          <Ring
            value={t.ring.value}
            color={t.ring.color}
            size={36}
            stroke={4}
            text={t.ring.text}
          />
        )}
      </>
    }
  />
);

const DashboardAdminHub = (p: Props) => {
  const { edit } = p;
  return (
    // L'accueil est « sans marges » (la ville occupe tout l'écran) : marges des autres pages ici,
    // à partir de 768 px (au téléphone, la coque mobile les pose déjà).
    <Container className="md:px-8 md:pt-6">
      <div className="hx" data-testid="admin-hub">
        <style>{HUB_CSS}</style>
        <div className="hx-stack">
          {/* En-tête : bonjour, points d'attention, réglages. La bannière de l'admin
              (souvent un visuel avec son propre texte) s'affiche ensuite en entier,
              sans rien posé dessus. */}
          <header className="hx-home-head" data-testid="hx-banner">
            <div style={{ minWidth: 0 }}>
              <h1 className="hx-home-title">{p.greeting}</h1>
              <p className="hx-home-date">{p.dateLabel}</p>
              {p.attention.length > 0 && (
                <div className="hx-chips">
                  {p.attention.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className="hx-chip-alert"
                      onClick={a.onClick}
                      disabled={!a.onClick}
                      style={{
                        color: TONE[a.tone],
                        background: tint(TONE[a.tone], 0.1),
                        borderColor: tint(TONE[a.tone], 0.38),
                        cursor: a.onClick ? 'pointer' : 'default',
                      }}
                    >
                      <i
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: TONE[a.tone],
                          display: 'inline-block',
                        }}
                        aria-hidden="true"
                      />
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hx-home-tools">
              {p.lastUpdatedText && (
                <span className="hx-home-stamp">
                  Mis à jour {p.lastUpdatedText}
                </span>
              )}
              <button
                type="button"
                className={`hx-btn hx-btn--ghost${p.hidePrices ? ' hx-btn--on' : ''}`}
                onClick={p.onTogglePrices}
                aria-pressed={p.hidePrices}
                aria-label={
                  p.hidePrices
                    ? 'Afficher les chiffres'
                    : 'Masquer les chiffres'
                }
              >
                {p.hidePrices ? (
                  <TbEyeOff aria-hidden="true" />
                ) : (
                  <TbEye aria-hidden="true" />
                )}
                <span>
                  {p.hidePrices ? 'Chiffres masqués' : 'Masquer les chiffres'}
                </span>
              </button>
              <button
                type="button"
                className="hx-btn hx-btn--ghost"
                onClick={p.onRefresh}
                disabled={p.refreshing}
                aria-label="Actualiser"
              >
                <TbRefresh aria-hidden="true" />
                <span>{p.refreshing ? 'Lecture…' : 'Actualiser'}</span>
              </button>
              <button
                type="button"
                className="hx-btn hx-btn--ghost"
                onClick={p.onPickBanner}
                aria-label={
                  p.bannerUrl ? 'Changer la bannière' : 'Ajouter une bannière'
                }
              >
                <TbPhotoEdit aria-hidden="true" />
                <span>Bannière</span>
              </button>
              {p.onOpenCity && (
                <button
                  type="button"
                  className="hx-btn hx-btn--primary"
                  onClick={p.onOpenCity}
                >
                  <TbBuildingCommunity aria-hidden="true" />
                  <span>Ville PEG</span>
                </button>
              )}
            </div>
            {p.error && (
              <p
                className="hx-muted"
                role="alert"
                style={{ color: '#fca5a5', flexBasis: '100%' }}
              >
                {p.error}
              </p>
            )}
          </header>

          {p.bannerUrl && (
            <figure className="hx-home-banner" data-testid="hx-banner-image">
              <img src={p.bannerUrl} alt="" />
            </figure>
          )}

          {/* Finances */}
          <section aria-labelledby="hx-fin-title">
            <div className="hx-section-head">
              <div>
                <h2 className="hx-section-title" id="hx-fin-title">
                  Finances
                </h2>
                <p className="hx-card-note">
                  Chiffre d’affaires, encaissements et marge.
                </p>
              </div>
            </div>
            {!p.dataReady ? (
              <div className="hx-kgrid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="hx-card hx-kpi"
                    style={{ minHeight: 130, opacity: 0.5 }}
                  />
                ))}
              </div>
            ) : (
              <div className="hx-kgrid">
                <button
                  type="button"
                  className="hx-card hx-kpi hx-kpi--link hx-k2 hx-ca-hero"
                  onClick={p.hero.onClick}
                  data-testid="hx-hero-kpi"
                >
                  <span className="hx-ca-text">
                    <span className="hx-kpi-label">{p.hero.label}</span>
                    <span className="hx-hero-figure">{p.hero.value}</span>
                    <span className="hx-ca-sub">{p.hero.ht}</span>
                    <span className="hx-ca-month">
                      Ce mois-ci <b>{p.hero.month}</b>
                      {p.hero.delta != null && (
                        <span
                          className={`hx-delta ${p.hero.delta >= 0 ? 'hx-delta--good' : 'hx-delta--bad'}`}
                        >
                          {p.hero.delta >= 0 ? '+' : ''}
                          {p.hero.delta} % vs mois dernier
                        </span>
                      )}
                    </span>
                  </span>
                  <span
                    className="hx-ca-bars"
                    role="img"
                    aria-label={`Chiffre d’affaires des six derniers mois : ${p.hero.bars.map((b) => `${b.label} ${b.display}`).join(', ')}`}
                  >
                    {p.hero.bars.map((b, i) => {
                      const max = Math.max(
                        1,
                        ...p.hero.bars.map((x) => x.value)
                      );
                      const now = i === p.hero.bars.length - 1;
                      return (
                        <span
                          key={`${i}-${b.label}`}
                          className={`hx-ca-bar${now ? ' is-now' : ''}`}
                          title={`${b.label} : ${b.display}`}
                        >
                          <i
                            style={{
                              height: `${b.value > 0 ? Math.max(4, (b.value / max) * 92) : 2}px`,
                            }}
                          />
                          <span>{b.label}</span>
                        </span>
                      );
                    })}
                  </span>
                </button>
                {p.finance.map((t) => (
                  <Tile key={t.key} t={t} className="" />
                ))}
              </div>
            )}
          </section>

          {/* Activité */}
          {p.dataReady && (
            <section aria-label="Activité">
              <div className="hx-ogrid">
                {p.ops.map((t) => (
                  <Tile key={t.key} t={t} className="" />
                ))}
              </div>
            </section>
          )}

          {/* Widgets */}
          <section aria-labelledby="hx-widgets-title">
            <div className="hx-section-head">
              <div>
                <h2 className="hx-section-title" id="hx-widgets-title">
                  Votre tableau de bord
                </h2>
                <p className="hx-card-note">
                  Rangez les widgets comme vous voulez : ils restent ainsi sur
                  cet appareil.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {edit.on && (
                  <button
                    type="button"
                    className="hx-btn hx-btn--ghost"
                    onClick={edit.reset}
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  type="button"
                  className={`hx-btn ${edit.on ? 'hx-btn--primary' : 'hx-btn--ghost'}`}
                  onClick={edit.toggle}
                >
                  {edit.on ? (
                    <TbLock aria-hidden="true" />
                  ) : (
                    <TbGripVertical aria-hidden="true" />
                  )}
                  {edit.on ? 'Terminer' : 'Personnaliser'}
                </button>
              </div>
            </div>

            {edit.on && (
              <div className="hx-editbar">
                <TbGripVertical aria-hidden="true" />
                Glissez un widget pour le déplacer, la croix le masque.
                {edit.hidden.length > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    Masqués :
                    {edit.hidden.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className="hx-btn hx-btn--ghost"
                        style={{ minHeight: 30, padding: '4px 10px' }}
                        onClick={() => edit.show(h.id)}
                      >
                        <TbPlus aria-hidden="true" />
                        {h.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            )}

            <div className="hx-wgrid">
              {p.widgets.map((w, i) => (
                <div
                  key={w.id}
                  className={`hx-card hx-widget${w.wide ? ' hx-w2' : ''}`}
                  data-testid="hx-widget"
                  data-widget={w.id}
                  draggable={edit.on}
                  data-dragging={edit.draggingIdx === i}
                  data-over={edit.overIdx === i && edit.draggingIdx !== i}
                  onDragStart={edit.on ? edit.onDragStart(i) : undefined}
                  onDragOver={edit.on ? edit.onDragOver(i) : undefined}
                  onDrop={edit.on ? edit.onDrop(i) : undefined}
                  onDragEnd={edit.on ? edit.onDragEnd : undefined}
                >
                  {edit.on && (
                    <div className="hx-widget-tools">
                      <span
                        className="hx-icon-btn"
                        aria-hidden="true"
                        style={{ cursor: 'grab' }}
                      >
                        <TbGripVertical />
                      </span>
                      <button
                        type="button"
                        className="hx-icon-btn hx-icon-btn--danger"
                        onClick={() => edit.hide(w.id)}
                        aria-label={`Masquer le widget ${w.label}`}
                      >
                        <TbX />
                      </button>
                    </div>
                  )}
                  <div style={{ minWidth: 0, paddingTop: edit.on ? 26 : 0 }}>
                    {w.content}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
};

export default DashboardAdminHub;
