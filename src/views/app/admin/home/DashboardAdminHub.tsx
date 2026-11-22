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
  TbLayoutGridAdd,
  TbLock,
  TbPhotoEdit,
  TbPlus,
  TbRefresh,
  TbX,
} from 'react-icons/tb';
import Container from '@/components/shared/Container';
import { HUB_CSS } from '@/components/shared/hub/hubStyles';
import {
  type BarSeries,
  GroupedBars,
  Kpi,
  Legend,
  MeterList,
  Ring,
  Spark,
  tint,
} from '@/components/shared/hub/HubWidgets';

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
    sub: ReactNode;
    delta: number | null;
    series: number[];
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

// Couleurs validées (daltonisme, contraste) sur le fond des cartes.
export const CA_INK = '#7c6cf0';
export const MARGIN_INK = '#199e70';
export const SPEND_INK = '#d95926';

/** Chiffre d'affaires, marge et dépenses des six derniers mois. */
export const MonthsChart = ({
  months,
  format,
  axisFormat,
}: {
  months: Array<{ label: string; ca: number; marge: number; depenses: number }>;
  format: (n: number) => string;
  axisFormat: (n: number) => string;
}) => {
  const withSpend = months.some((m) => m.depenses > 0);
  const series: BarSeries[] = [
    { key: 'ca', label: 'CA', color: CA_INK },
    { key: 'marge', label: 'Marge', color: MARGIN_INK },
    ...(withSpend ? [{ key: 'dep', label: 'Dépenses', color: SPEND_INK }] : []),
  ];
  if (!months.some((m) => m.ca > 0 || m.marge > 0 || m.depenses > 0))
    return <Empty>Pas encore de chiffre sur ces six mois.</Empty>;
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Legend series={series} />
      </div>
      <GroupedBars
        ariaLabel="Chiffre d'affaires, marge et dépenses par mois"
        rows={months.map((m, i) => ({
          key: `${i}-${m.label}`,
          axis: m.label,
          title: m.label,
          values: withSpend ? [m.ca, m.marge, m.depenses] : [m.ca, m.marge],
        }))}
        series={series}
        format={format}
        axisFormat={axisFormat}
      />
    </>
  );
};

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
          {/* Bannière (image choisie par l'admin, sinon fond PEG) */}
          <header className="hx-banner" data-testid="hx-banner">
            {p.bannerUrl && <img src={p.bannerUrl} alt="" />}
            <div className="hx-banner-tools">
              {p.lastUpdatedText && (
                <span
                  className="hx-glass hx-glass--stamp"
                  style={{
                    cursor: 'default',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  Mis à jour {p.lastUpdatedText}
                </span>
              )}
              <button
                type="button"
                className={`hx-glass${p.hidePrices ? ' hx-glass--on' : ''}`}
                onClick={p.onTogglePrices}
                aria-pressed={p.hidePrices}
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
                className="hx-glass"
                onClick={p.onRefresh}
                disabled={p.refreshing}
                aria-label="Actualiser"
              >
                <TbRefresh aria-hidden="true" />
                <span>{p.refreshing ? 'Lecture…' : 'Actualiser'}</span>
              </button>
              <button
                type="button"
                className="hx-glass"
                onClick={p.onPickBanner}
                aria-label="Changer la bannière"
              >
                <TbPhotoEdit aria-hidden="true" />
                <span>Bannière</span>
              </button>
              {p.onOpenCity && (
                <button
                  type="button"
                  className="hx-glass hx-glass--accent"
                  onClick={p.onOpenCity}
                >
                  <TbBuildingCommunity aria-hidden="true" />
                  <span>Ville PEG</span>
                </button>
              )}
            </div>
            <div>
              <h1 className="hx-banner-title">{p.greeting}</h1>
              <p className="hx-banner-sub" style={{ textTransform: 'none' }}>
                {p.dateLabel}
              </p>
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
                      background: 'rgba(10,16,30,0.55)',
                      borderColor: tint(TONE[a.tone], 0.45),
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
            </div>
            {p.error && (
              <p
                className="hx-muted"
                role="alert"
                style={{ color: '#fca5a5', marginTop: 10 }}
              >
                {p.error}
              </p>
            )}
          </header>

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
                <Kpi
                  label={p.hero.label}
                  icon={<TbLayoutGridAdd aria-hidden="true" />}
                  accent={CA_INK}
                  className="hx-k2"
                  onClick={p.hero.onClick}
                  testId="hx-hero-kpi"
                  value={<span className="hx-hero-figure">{p.hero.value}</span>}
                  foot={
                    <span>
                      {p.hero.sub}
                      {p.hero.delta != null && (
                        <span
                          className={`hx-delta ${p.hero.delta >= 0 ? 'hx-delta--good' : 'hx-delta--bad'}`}
                          style={{ marginLeft: 10 }}
                        >
                          {p.hero.delta >= 0 ? '+' : ''}
                          {p.hero.delta} % sur un mois
                        </span>
                      )}
                    </span>
                  }
                >
                  <span className="hx-kpi-spark-bg" aria-hidden="true">
                    <Spark
                      values={p.hero.series}
                      color={CA_INK}
                      w={300}
                      h={70}
                      stretch
                      className=""
                    />
                  </span>
                </Kpi>
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
