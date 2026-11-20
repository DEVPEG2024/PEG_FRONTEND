import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Container from '@/components/shared/Container';
import type {
  MpCatalogItem,
  MpMarking,
  MpOfferAdmin,
  OfferConfig,
} from '@/@types/masterPrint';
import type { Product } from '@/@types/product';
import {
  apiGetMasterPrintOffer,
  apiRefreshMasterPrintDescription,
  apiSaveMasterPrintOffer,
} from '@/services/ConfiguratorServices';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { masterPrintError } from '@/utils/masterPrint';
import { unwrapData } from '@/utils/serviceHelper';
import {
  Btn,
  Field,
  Issues,
  Pill,
  card,
  grid,
  input,
  label,
  muted,
  sectionTitle,
  SANDBOX_TONE,
  LIVE_TONE,
} from '@/views/app/common/projects/details/components/masterPrint/ui';
import MarkingsEditor from '@/views/app/common/projects/details/components/masterPrint/MarkingsEditor';
import ProductPicker from '@/views/app/common/projects/details/components/masterPrint/ProductPicker';

const OfferConfigurator = lazy(
  () =>
    import('@/views/app/customer/products/show/configurator/OfferConfigurator')
);

/*
 * « Formulaire client » d'un produit relié à Master Print (offre configurable).
 * L'admin décide, option par option, ce que le client choisit et ce qui est
 * imposé ; l'aperçu à droite est le VRAI formulaire du client (prix réels,
 * sans ajout au panier), rafraîchi à chaque enregistrement.
 */

type View = NonNullable<MpOfferAdmin['mpProduct']>;

const Check = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      fontSize: '13px',
      color: '#fff',
      cursor: 'pointer',
      lineHeight: 1.35,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ marginTop: '2px' }}
    />
    <span>{children}</span>
  </label>
);

const Radio = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        style={{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '12.5px',
          fontWeight: 700,
          cursor: 'pointer',
          border: `1px solid ${value === o.value ? '#2f6fed' : 'rgba(255,255,255,0.12)'}`,
          background:
            value === o.value
              ? 'rgba(47,111,237,0.18)'
              : 'rgba(255,255,255,0.04)',
          color: value === o.value ? '#fff' : 'rgba(255,255,255,0.7)',
        }}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** Liste à cocher « parmi » : aucune case = tout est proposé. */
const Among = ({
  all,
  picked,
  onChange,
  empty = 'Tous proposés',
}: {
  all: Array<{ code: string; label: string; extra?: string }>;
  picked: string[];
  onChange: (codes: string[]) => void;
  empty?: string;
}) => (
  <div>
    <p style={{ ...muted, margin: '0 0 6px' }}>
      {picked.length ? `${picked.length} sur ${all.length}` : empty} — décochez
      tout pour tout proposer.
    </p>
    <div style={grid(170)}>
      {all.map((x) => (
        <Check
          key={x.code}
          checked={picked.includes(x.code)}
          onChange={(on) =>
            onChange(
              on ? [...picked, x.code] : picked.filter((c) => c !== x.code)
            )
          }
        >
          {x.label}
          {x.extra && (
            <span
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px' }}
            >
              {' '}
              {x.extra}
            </span>
          )}
        </Check>
      ))}
    </div>
  </div>
);

const cm = (mm: number | null | undefined) =>
  mm ? `${Math.round(mm) / 10}` : '?';

const OfferSettings = () => {
  const { productDocumentId = '' } = useParams<{ productDocumentId: string }>();
  const [data, setData] = useState<MpOfferAdmin | null>(null);
  const [offer, setOffer] = useState<OfferConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  const apply = (d: MpOfferAdmin) => {
    setData(d);
    setOffer(d.offer ?? null);
    setEnabled(d.enabled);
    setDirty(false);
    setPreviewKey((k) => k + 1);
  };

  useEffect(() => {
    let alive = true;
    apiGetMasterPrintOffer(productDocumentId)
      .then((r) => alive && apply(r.data))
      .catch(
        (e) => alive && setError(masterPrintError(e, 'Produit introuvable.'))
      );
    unwrapData<{ product: Product }>(
      apiGetProductForShowById(productDocumentId)
    )
      .then((r) => alive && setProduct(r.product ?? null))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [productDocumentId]);

  const patch = (p: Partial<OfferConfig>) => {
    setOffer((o) => (o ? { ...o, ...p } : o));
    setDirty(true);
  };

  const save = async (opts: { enabled?: boolean; productId?: string } = {}) => {
    setSaving(true);
    try {
      const on = opts.enabled ?? enabled;
      const { data: d } = await apiSaveMasterPrintOffer(productDocumentId, {
        enabled: on,
        ...(on && offer && !opts.productId ? { offer } : {}),
        ...(opts.productId ? { productId: opts.productId } : {}),
      });
      apply(d);
      toast.success(
        d.enabled
          ? 'Formulaire client enregistré'
          : 'Formulaire client retiré : le produit reprend sa fiche habituelle'
      );
    } catch (e) {
      toast.error(masterPrintError(e, 'Enregistrement impossible.'));
    } finally {
      setSaving(false);
    }
  };

  const [describing, setDescribing] = useState(false);
  const refreshDescription = async () => {
    if (
      product?.description &&
      !window.confirm(
        'Remplacer la description actuelle de la fiche produit par celle de Master Print ?'
      )
    )
      return;
    setDescribing(true);
    try {
      const { data: d } =
        await apiRefreshMasterPrintDescription(productDocumentId);
      setProduct((p) => (p ? { ...p, description: d.description } : p));
      setPreviewKey((k) => k + 1);
      toast.success('Description reprise de Master Print');
    } catch (e) {
      toast.error(masterPrintError(e, 'Description indisponible.'));
    } finally {
      setDescribing(false);
    }
  };

  const pick = (item: MpCatalogItem) => {
    setPicking(false);
    save({ enabled: true, productId: item.id });
  };

  if (error) {
    return (
      <Container>
        <div style={card}>
          <p style={muted}>{error}</p>
        </div>
      </Container>
    );
  }
  if (!data) {
    return (
      <Container>
        <div style={card}>
          <p style={muted}>Chargement…</p>
        </div>
      </Container>
    );
  }

  const view = data.mpProduct as View | undefined;
  const textile = !!view?.colors.length;
  const header = (
    <div
      style={{
        ...card,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ ...label, marginBottom: '2px' }}>
          Formulaire client — offre configurable
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800,
            color: '#fff',
          }}
        >
          {data.product.name}
        </h1>
        <p style={{ ...muted, margin: '4px 0 0' }}>
          {view ? (
            <>
              Produit Master Print :{' '}
              <strong style={{ color: '#fff' }}>{view.name}</strong>
              {view.sku ? ` (${view.sku})` : ''} ·{' '}
            </>
          ) : null}
          {data.product.inCatalogue
            ? 'au catalogue public'
            : 'hors catalogue (offre réservée à des clients)'}
          {' · '}
          <Link
            to={`/admin/products/edit/${productDocumentId}`}
            style={{ color: '#8db4ff', textDecoration: 'underline' }}
          >
            fiche produit
          </Link>
        </p>
      </div>
      {data.linked && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Pill tone={data.enabled ? LIVE_TONE : SANDBOX_TONE}>
            {data.enabled ? 'Formulaire actif' : 'Formulaire inactif'}
          </Pill>
          <Btn
            disabled={describing}
            onClick={refreshDescription}
            title="Remplace la description de la fiche produit par celle de Master Print (texte et caractéristiques)"
          >
            {describing
              ? 'Description…'
              : 'Reprendre la description Master Print'}
          </Btn>
          {data.enabled ? (
            <Btn
              variant="danger"
              disabled={saving}
              onClick={() => save({ enabled: false })}
            >
              Retirer le formulaire
            </Btn>
          ) : (
            <Btn
              variant="primary"
              disabled={saving}
              onClick={() => save({ enabled: true })}
            >
              Activer le formulaire
            </Btn>
          )}
        </div>
      )}
    </div>
  );

  if (!data.linked || !view || !offer) {
    return (
      <Container>
        <div style={{ display: 'grid', gap: '14px' }}>
          {header}
          <div style={card}>
            <h2 style={sectionTitle}>
              Produit pas encore relié à Master Print
            </h2>
            <p style={muted}>
              Choisissez le produit Master Print que ce produit PEG représente :
              son formulaire (coloris, tailles, marquages, options) sera repris,
              sous la marque PEG.
            </p>
            <div style={{ marginTop: '10px' }}>
              <Btn variant="primary" onClick={() => setPicking(true)}>
                Choisir le produit Master Print
              </Btn>
            </div>
          </div>
          {picking && (
            <ProductPicker
              initialQuery={data.product.name}
              onPick={pick}
              onClose={() => setPicking(false)}
            />
          )}
        </div>
      </Container>
    );
  }

  const m = view.markings;
  const formats =
    view.dimensions && !view.dimensions.perLength
      ? view.dimensions.standardFormats
      : [];

  return (
    <Container>
      <div style={{ display: 'grid', gap: '14px' }}>
        {header}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          {/* Réglages */}
          <div
            style={{
              flex: '1 1 420px',
              minWidth: 0,
              display: 'grid',
              gap: '14px',
            }}
          >
            <div style={card}>
              <h2 style={sectionTitle}>Prix et commande</h2>
              <div style={grid(170)}>
                <Field title="Majoration sur le prix Master Print (%)">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    style={input}
                    value={offer.markupPercent}
                    onChange={(e) =>
                      patch({ markupPercent: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field title="Minimum de commande (pièces)">
                  <input
                    type="number"
                    min={0}
                    style={input}
                    value={offer.minQuantity ?? ''}
                    placeholder={`${view.quantity.min ?? 1} (Master Print)`}
                    onChange={(e) =>
                      patch({
                        minQuantity:
                          Number(e.target.value) > 0
                            ? Number(e.target.value)
                            : null,
                      })
                    }
                  />
                </Field>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Check
                  checked={offer.autoSend}
                  onChange={(v) => patch({ autoSend: v })}
                >
                  Envoyer la commande à Master Print{' '}
                  <strong>automatiquement</strong> dès qu’elle est payée (ou
                  passée en paiement différé)
                </Check>
                <p style={{ ...muted, margin: '6px 0 0 24px' }}>
                  Décoché : la commande arrive prête dans l’onglet Master Print
                  du projet, vous l’envoyez d’un clic. Le prix client = prix
                  Master Print ×{' '}
                  {(1 + offer.markupPercent / 100).toLocaleString('fr-FR', {
                    maximumFractionDigits: 3,
                  })}
                  , remise Premium en plus si le produit est au catalogue
                  public.
                </p>
              </div>
            </div>

            {textile && (
              <div style={card}>
                <h2 style={sectionTitle}>Coloris proposés</h2>
                <Among
                  all={view.colors.map((c) => ({
                    code: c.code,
                    label: c.label,
                  }))}
                  picked={offer.colors}
                  onChange={(colors) => patch({ colors })}
                />
              </div>
            )}

            {m && (
              <div style={card}>
                <h2 style={sectionTitle}>Marquage</h2>
                <Radio
                  value={offer.markings.mode}
                  onChange={(mode) =>
                    patch({ markings: { ...offer.markings, mode } })
                  }
                  options={[
                    ...(m.required
                      ? []
                      : [
                          {
                            value: 'none' as const,
                            label: 'Aucun (textile vierge)',
                          },
                        ]),
                    { value: 'client' as const, label: 'Au choix du client' },
                    {
                      value: 'fixed' as const,
                      label: 'Imposé (ex. logo au cœur)',
                    },
                  ]}
                />
                {offer.markings.mode === 'client' && (
                  <div
                    style={{ display: 'grid', gap: '12px', marginTop: '12px' }}
                  >
                    <div>
                      <p style={label}>Emplacements</p>
                      <Among
                        all={m.positions.map((p) => ({
                          code: p.code,
                          label: p.label,
                          extra: p.maxWidthMm
                            ? `${cm(p.maxWidthMm)} × ${cm(p.maxHeightMm)} cm`
                            : '',
                        }))}
                        picked={offer.markings.positions}
                        onChange={(positions) =>
                          patch({ markings: { ...offer.markings, positions } })
                        }
                      />
                    </div>
                    <div>
                      <p style={label}>Tailles de marquage</p>
                      <Among
                        all={m.formats.map((f) => ({
                          code: f.code,
                          label: f.label,
                          extra: f.widthMm
                            ? `${cm(f.widthMm)} × ${cm(f.heightMm)} cm`
                            : '',
                        }))}
                        picked={offer.markings.formats}
                        onChange={(fs) =>
                          patch({
                            markings: { ...offer.markings, formats: fs },
                          })
                        }
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Check
                          checked={offer.markings.customSize}
                          onChange={(v) =>
                            patch({
                              markings: { ...offer.markings, customSize: v },
                            })
                          }
                        >
                          Le client peut aussi donner une largeur libre
                        </Check>
                      </div>
                    </div>
                    {m.techniques.length > 1 && (
                      <div>
                        <p style={label}>Techniques</p>
                        <Among
                          all={m.techniques.map((t) => ({
                            code: t.code,
                            label: t.label,
                          }))}
                          picked={offer.markings.techniques}
                          onChange={(techniques) =>
                            patch({
                              markings: { ...offer.markings, techniques },
                            })
                          }
                          empty="Toutes proposées"
                        />
                      </div>
                    )}
                    <div style={grid(150)}>
                      <Field title="Marquages au minimum">
                        <input
                          type="number"
                          min={m.required ? 1 : 0}
                          max={10}
                          style={input}
                          value={offer.markings.min}
                          onChange={(e) =>
                            patch({
                              markings: {
                                ...offer.markings,
                                min: Math.max(0, Number(e.target.value) || 0),
                              },
                            })
                          }
                        />
                      </Field>
                      <Field title="Marquages au maximum">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          style={input}
                          value={offer.markings.max}
                          onChange={(e) =>
                            patch({
                              markings: {
                                ...offer.markings,
                                max: Math.max(1, Number(e.target.value) || 1),
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                )}
                {offer.markings.mode === 'fixed' && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ ...muted, margin: '0 0 8px' }}>
                      Le client voit ces marquages comme « compris dans l’offre
                      » et envoie seulement son visuel pour chacun.
                    </p>
                    <MarkingsEditor
                      view={view}
                      markings={offer.markings.fixed}
                      onChange={(fixed: MpMarking[]) =>
                        patch({ markings: { ...offer.markings, fixed } })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {formats.length > 0 ||
            (view.dimensions?.freeFormat && !view.dimensions.perLength) ? (
              <div style={card}>
                <h2 style={sectionTitle}>Format</h2>
                <Radio
                  value={offer.format.mode}
                  onChange={(mode) =>
                    patch({
                      format: {
                        ...offer.format,
                        mode,
                        fixed:
                          mode === 'fixed'
                            ? offer.format.fixed || formats[0]?.code || null
                            : null,
                      },
                    })
                  }
                  options={[
                    { value: 'client', label: 'Au choix du client' },
                    { value: 'fixed', label: 'Imposé' },
                  ]}
                />
                <div style={{ marginTop: '12px' }}>
                  {offer.format.mode === 'client' ? (
                    <>
                      {formats.length > 0 && (
                        <Among
                          all={formats.map((f) => ({
                            code: f.code,
                            label: f.label,
                            extra: f.widthMm
                              ? `${cm(f.widthMm)} × ${cm(f.heightMm)} cm`
                              : '',
                          }))}
                          picked={offer.format.allowed}
                          onChange={(allowed) =>
                            patch({ format: { ...offer.format, allowed } })
                          }
                        />
                      )}
                      {view.dimensions?.freeFormat && (
                        <div style={{ marginTop: '8px' }}>
                          <Check
                            checked={offer.format.free}
                            onChange={(free) =>
                              patch({ format: { ...offer.format, free } })
                            }
                          >
                            Dimensions sur mesure permises
                          </Check>
                        </div>
                      )}
                    </>
                  ) : (
                    <Field title="Format imposé">
                      <select
                        style={input}
                        value={offer.format.fixed ?? ''}
                        onChange={(e) =>
                          patch({
                            format: {
                              ...offer.format,
                              fixed: e.target.value || null,
                            },
                          })
                        }
                      >
                        {formats.map((f) => (
                          <option key={f.code} value={f.code}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              </div>
            ) : null}

            {view.otherOptions.length > 0 && (
              <div style={card}>
                <h2 style={sectionTitle}>Options</h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {view.otherOptions.map((o) => {
                    const rule = offer.options[o.code] ?? {
                      mode: 'client' as const,
                      allowed: [],
                    };
                    const values = o.values.filter((v) => !v.custom);
                    const setRule = (r: typeof rule) =>
                      patch({ options: { ...offer.options, [o.code]: r } });
                    const fixedList = Array.isArray(rule.value)
                      ? rule.value
                      : rule.value
                        ? [rule.value]
                        : [];
                    return (
                      <div
                        key={o.code}
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          paddingTop: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '8px',
                          }}
                        >
                          <strong
                            style={{
                              color: '#fff',
                              fontSize: '13.5px',
                              flex: 1,
                            }}
                          >
                            {o.label}
                            {o.required ? ' *' : ''}
                          </strong>
                          <Radio
                            value={rule.mode}
                            onChange={(mode) =>
                              setRule(
                                mode === 'fixed'
                                  ? {
                                      mode,
                                      value:
                                        o.type === 'multi_select'
                                          ? []
                                          : (
                                              values.find((v) => v.default) ||
                                              values[0]
                                            )?.code,
                                    }
                                  : { mode, allowed: [] }
                              )
                            }
                            options={[
                              { value: 'client', label: 'Au choix' },
                              { value: 'fixed', label: 'Imposée' },
                            ]}
                          />
                        </div>
                        {rule.mode === 'client' ? (
                          <Among
                            all={values.map((v) => ({
                              code: v.code,
                              label: v.label,
                            }))}
                            picked={rule.allowed ?? []}
                            onChange={(allowed) =>
                              setRule({ mode: 'client', allowed })
                            }
                            empty="Toutes proposées"
                          />
                        ) : o.type === 'multi_select' ? (
                          <div style={grid(170)}>
                            {values.map((v) => (
                              <Check
                                key={v.code}
                                checked={fixedList.includes(v.code)}
                                onChange={(on) =>
                                  setRule({
                                    mode: 'fixed',
                                    value: on
                                      ? [...fixedList, v.code]
                                      : fixedList.filter((c) => c !== v.code),
                                  })
                                }
                              >
                                {v.label}
                              </Check>
                            ))}
                          </div>
                        ) : (
                          <select
                            style={input}
                            value={
                              typeof rule.value === 'string' ? rule.value : ''
                            }
                            onChange={(e) =>
                              setRule({ mode: 'fixed', value: e.target.value })
                            }
                          >
                            {!o.required && (
                              <option value="">— Aucune —</option>
                            )}
                            {values.map((v) => (
                              <option key={v.code} value={v.code}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              style={{
                ...card,
                position: 'sticky',
                bottom: 'calc(12px + var(--peg-dock-lift, 0px))',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <Btn
                variant="primary"
                disabled={saving || (!dirty && data.enabled)}
                onClick={() => save({ enabled: true })}
              >
                {saving
                  ? 'Enregistrement…'
                  : data.enabled
                    ? 'Enregistrer'
                    : 'Enregistrer et activer'}
              </Btn>
              <span style={muted}>
                {dirty
                  ? 'Modifications non enregistrées — l’aperçu se met à jour à l’enregistrement.'
                  : 'Aperçu à jour.'}
              </span>
              <Issues items={data.issues ?? []} />
            </div>
          </div>

          {/* Aperçu : le vrai formulaire du client */}
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>
            <p style={{ ...label, margin: '0 0 8px' }}>
              Aperçu — ce que voit le client
            </p>
            {data.enabled && data.spec && product ? (
              <Suspense
                fallback={
                  <div style={card}>
                    <p style={muted}>Chargement de l’aperçu…</p>
                  </div>
                }
              >
                <OfferConfigurator
                  key={previewKey}
                  product={product}
                  spec={data.spec}
                  preview
                />
              </Suspense>
            ) : (
              <div style={card}>
                <p style={muted}>
                  {data.enabled
                    ? 'Chargement de l’aperçu…'
                    : 'Activez le formulaire pour le voir tel que le client le verra.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default OfferSettings;
