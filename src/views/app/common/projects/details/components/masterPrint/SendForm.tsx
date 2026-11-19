/*
 * Envoi d'un projet à Master Print.
 *
 * Projet issu d'une commande PEG : les quantités viennent de la commande ; l'admin
 * vérifie le produit Master Print, les coloris et tailles associés (proposés par
 * le serveur, mémorisés pour la prochaine fois), les marquages, les fichiers,
 * l'adresse — puis chiffre et envoie.
 * Projet sans commande (devis, création admin) : lignes saisies à la main.
 *
 * Le serveur revérifie tout ; Master Print aussi (422 avec le champ en cause).
 */
import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HiPlus, HiTrash } from 'react-icons/hi';
import type {
  MpAddress,
  MpCatalogItem,
  MpLineConfig,
  MpPriceResult,
  MpProductMapping,
  MpProductView,
  MpProjectDraft,
} from '@/@types/masterPrint';
import {
  apiGetMasterPrintMapping,
  apiGetMasterPrintProduct,
  apiPriceMasterPrint,
  apiSendToMasterPrint,
} from '@/services/MasterPrintServices';
import {
  BuiltLine,
  addressIssues,
  fileSlots,
  fmtEur,
  linesFromMapping,
  manualLineIssues,
  mappingToSave,
  margin,
  markingIssues,
  masterPrintError,
  nextIdempotencyKey,
  optionDefaults,
  optionIssues,
  sizesForColor,
  slotLabel,
} from '@/utils/masterPrint';
import MarkingsEditor from './MarkingsEditor';
import ProductPicker from './ProductPicker';
import {
  Btn,
  Field,
  Issues,
  Pill,
  SANDBOX_TONE,
  card,
  grid,
  input,
  label,
  muted,
  sectionTitle,
} from './ui';

type Props = {
  draft: MpProjectDraft;
  onSent: () => void;
  onClose: () => void;
};

type ManualLine = { key: string; config: MpLineConfig };

let seq = 0;
const newKey = () => `l${Date.now().toString(36)}${(seq += 1)}`;

/** Options simples ou multiples d'un produit (hors coloris, tailles et marquages). */
const OptionsEditor = ({
  view,
  value,
  onChange,
}: {
  view: MpProductView;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) =>
  view.otherOptions.length ? (
    <div style={grid(200)}>
      {view.otherOptions.map((o) => (
        <Field key={o.code} title={`${o.label}${o.required ? ' *' : ''}`}>
          {o.type === 'multi_select' ? (
            <select
              multiple
              style={{ ...input, minHeight: '72px' }}
              value={(value[o.code] as string[]) || []}
              onChange={(e) =>
                onChange({
                  ...value,
                  [o.code]: Array.from(e.target.selectedOptions).map(
                    (x) => x.value
                  ),
                })
              }
            >
              {o.values.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              style={input}
              value={(value[o.code] as string) || ''}
              onChange={(e) =>
                onChange({ ...value, [o.code]: e.target.value || undefined })
              }
            >
              <option value="">{o.required ? 'Choisir…' : 'Aucune'}</option>
              {o.values.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      ))}
    </div>
  ) : null;

/** Ligne saisie à la main : produit, coloris, quantités par taille ou quantité, format, options, marquages. */
const ManualLineEditor = ({
  line,
  view,
  onChange,
  onRemove,
  onPick,
  picking,
}: {
  line: ManualLine;
  view: MpProductView | undefined;
  onChange: (config: MpLineConfig) => void;
  onRemove: () => void;
  onPick: () => void;
  picking: boolean;
}) => {
  const c = line.config;
  const setOptions = (patch: Record<string, unknown>) =>
    onChange({ ...c, options: { ...c.options, ...patch } });
  const issues = [
    ...manualLineIssues(c, view),
    ...markingIssues(c.options.markings, view),
  ];
  const d = view?.dimensions;
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <strong style={{ fontSize: '13.5px' }}>
          {view
            ? `${view.name}${view.sku ? ` · réf. ${view.sku}` : ''}`
            : 'Produit à choisir'}
        </strong>
        <span style={{ display: 'inline-flex', gap: '6px' }}>
          <Btn onClick={onPick} disabled={picking}>
            {view ? 'Changer de produit' : 'Choisir le produit'}
          </Btn>
          <Btn variant="danger" onClick={onRemove} title="Retirer cette ligne">
            <HiTrash aria-hidden="true" />
          </Btn>
        </span>
      </div>
      {view && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '10px',
          }}
        >
          {!!view.colors.length && (
            <Field title="Coloris" style={{ maxWidth: '320px' }}>
              <select
                style={input}
                value={c.options.color || ''}
                onChange={(e) =>
                  setOptions({ color: e.target.value || undefined })
                }
              >
                <option value="">Choisir…</option>
                {view.colors.map((col) => (
                  <option
                    key={col.code}
                    value={col.code}
                    disabled={col.available === false}
                  >
                    {col.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {view.sizes.length ? (
            <div>
              <p style={label}>Quantités par taille</p>
              <div style={grid(80)}>
                {sizesForColor(view, c.options.color).map((s) => (
                  <Field key={s} title={s}>
                    <input
                      style={input}
                      type="number"
                      min={0}
                      value={c.options.sizes?.[s] ?? ''}
                      onChange={(e) => {
                        const n = Math.max(
                          0,
                          Math.floor(Number(e.target.value) || 0)
                        );
                        const sizes = { ...(c.options.sizes || {}) };
                        if (n) sizes[s] = n;
                        else delete sizes[s];
                        setOptions({ sizes });
                      }}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ) : d?.perLength ? (
            <Field
              title={`Longueur (m)${d.rollWidthMm ? ` — laize ${d.rollWidthMm / 10} cm` : ''}`}
              style={{ maxWidth: '220px' }}
            >
              <input
                style={input}
                type="number"
                min={0}
                step={0.1}
                value={c.length_mm ? c.length_mm / 1000 : ''}
                onChange={(e) =>
                  onChange({
                    ...c,
                    length_mm: e.target.value
                      ? Math.round(Number(e.target.value) * 1000)
                      : undefined,
                  })
                }
              />
            </Field>
          ) : (
            <Field title="Quantité" style={{ maxWidth: '160px' }}>
              <input
                style={input}
                type="number"
                min={1}
                value={c.quantity ?? ''}
                onChange={(e) =>
                  onChange({
                    ...c,
                    quantity: e.target.value
                      ? Math.max(1, Math.floor(Number(e.target.value)))
                      : undefined,
                  })
                }
              />
            </Field>
          )}
          {d && !d.perLength && (
            <div style={grid(160)}>
              {!!d.standardFormats.length && (
                <Field title="Format">
                  <select
                    style={input}
                    value={c.format || (c.width_mm ? '__libre__' : '')}
                    onChange={(e) =>
                      e.target.value === '__libre__'
                        ? onChange({
                            ...c,
                            format: undefined,
                            width_mm: c.width_mm || d.widthMm?.min || 100,
                            height_mm: c.height_mm || d.heightMm?.min || 100,
                          })
                        : onChange({
                            ...c,
                            format: e.target.value || undefined,
                            width_mm: undefined,
                            height_mm: undefined,
                          })
                    }
                  >
                    <option value="">Choisir…</option>
                    {d.standardFormats.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.label}
                      </option>
                    ))}
                    {d.freeFormat && (
                      <option value="__libre__">Dimensions libres…</option>
                    )}
                  </select>
                </Field>
              )}
              {(!d.standardFormats.length || (!c.format && c.width_mm)) &&
                d.freeFormat && (
                  <>
                    <Field
                      title={`Largeur (mm)${d.widthMm?.max ? ` — max ${d.widthMm.max}` : ''}`}
                    >
                      <input
                        style={input}
                        type="number"
                        min={d.widthMm?.min || 1}
                        value={c.width_mm ?? ''}
                        onChange={(e) =>
                          onChange({
                            ...c,
                            format: undefined,
                            width_mm: Number(e.target.value) || undefined,
                          })
                        }
                      />
                    </Field>
                    <Field
                      title={`Hauteur (mm)${d.heightMm?.max ? ` — max ${d.heightMm.max}` : ''}`}
                    >
                      <input
                        style={input}
                        type="number"
                        min={d.heightMm?.min || 1}
                        value={c.height_mm ?? ''}
                        onChange={(e) =>
                          onChange({
                            ...c,
                            format: undefined,
                            height_mm: Number(e.target.value) || undefined,
                          })
                        }
                      />
                    </Field>
                  </>
                )}
            </div>
          )}
          <OptionsEditor
            view={view}
            value={c.options}
            onChange={(next) =>
              onChange({
                ...c,
                options: {
                  ...next,
                  color: c.options.color,
                  sizes: c.options.sizes,
                  markings: c.options.markings,
                },
              })
            }
          />
          {view.markings && (
            <div>
              <p style={label}>Marquages</p>
              <MarkingsEditor
                view={view}
                markings={c.options.markings || []}
                onChange={(markings) => setOptions({ markings })}
              />
            </div>
          )}
          <Issues items={issues} />
        </div>
      )}
    </div>
  );
};

const SendForm = ({ draft, onSent, onClose }: Props) => {
  const pegMode = draft.lines.length > 0;
  const [mapping, setMapping] = useState<MpProductMapping | null>(
    draft.mapping
  );
  const [view, setView] = useState<MpProductView | null>(draft.mpProduct);
  const [extra, setExtra] = useState<Record<string, unknown>>(() =>
    optionDefaults(draft.mpProduct)
  );
  const [manual, setManual] = useState<ManualLine[]>(() =>
    pegMode ? [] : [{ key: newKey(), config: { product_id: '', options: {} } }]
  );
  const [views, setViews] = useState<Record<string, MpProductView>>({});
  const [picker, setPicker] = useState<string | null>(null); // 'peg' | clé d'une ligne manuelle
  const [address, setAddress] = useState<MpAddress>(draft.address || {});
  const [pickup, setPickup] = useState(false);
  const [blind, setBlind] = useState(true);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<Record<string, number>>({});
  const [remember, setRemember] = useState(true);
  const [price, setPrice] = useState<MpPriceResult | null>(null);
  const [priceFor, setPriceFor] = useState('');
  const [busy, setBusy] = useState<'price' | 'send' | 'pick' | null>(null);
  const keyRef = useRef(draft.idempotencyKey);
  const sandbox = draft.environment === 'sandbox';

  const built: BuiltLine[] = useMemo(
    () =>
      pegMode
        ? linesFromMapping(draft.lines, mapping, extra)
        : manual.map((l) => ({
            key: l.key,
            config: l.config,
            issues: manualLineIssues(l.config, views[l.config.product_id]),
          })),
    [pegMode, draft.lines, mapping, extra, manual, views]
  );
  const lines = built.map((b) => b.config);
  const issues = [
    ...new Set([
      ...(!lines.length ? ['Ajoutez au moins une ligne'] : []),
      ...built.flatMap((b) => b.issues),
      ...(pegMode
        ? [
            ...markingIssues(mapping?.markings, view),
            ...optionIssues(view, extra),
          ]
        : manual.flatMap((l) =>
            markingIssues(l.config.options.markings, views[l.config.product_id])
          )),
      ...(pickup ? [] : addressIssues(address)),
    ]),
  ];
  const slots = fileSlots(lines);
  const signature = JSON.stringify({ lines, address: pickup ? null : address });
  const priceFresh = !!price && priceFor === signature;
  const slotView = (slot: string) =>
    pegMode
      ? view
      : Object.values(views).find((v) =>
          v.markings?.positions.some((p) => `marking:${p.code}` === slot)
        ) || null;

  // Coloris et tailles de la commande PEG, à associer au produit Master Print.
  const pegColors = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of draft.lines)
      if (l.pegColor?.documentId) m.set(l.pegColor.documentId, l.pegColor.name);
    return [...m.entries()];
  }, [draft.lines]);
  const pegSizes = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of draft.lines)
      for (const s of l.pegSizes) if (s.documentId) m.set(s.documentId, s.name);
    return [...m.entries()];
  }, [draft.lines]);

  const pickPeg = async (item: MpCatalogItem) => {
    if (!draft.pegProduct) return;
    setBusy('pick');
    try {
      const { data } = await apiGetMasterPrintMapping(
        draft.pegProduct.documentId,
        item.id
      );
      setMapping(data.mapping);
      setView(data.product);
      setExtra(optionDefaults(data.product));
      setPicker(null);
    } catch (e) {
      toast.error(masterPrintError(e, 'Produit Master Print indisponible.'));
    } finally {
      setBusy(null);
    }
  };

  const pickManual = async (key: string, item: MpCatalogItem) => {
    setBusy('pick');
    try {
      const v =
        views[item.id] || (await apiGetMasterPrintProduct(item.id)).data;
      setViews((all) => ({ ...all, [v.id]: v }));
      setManual((ls) =>
        ls.map((l) =>
          l.key === key
            ? {
                key,
                config: {
                  product_id: v.id,
                  ...(v.sizes.length || v.dimensions?.perLength
                    ? {}
                    : { quantity: v.quantity.min || 1 }),
                  options: { ...optionDefaults(v) },
                },
              }
            : l
        )
      );
      setPicker(null);
    } catch (e) {
      toast.error(masterPrintError(e, 'Produit Master Print indisponible.'));
    } finally {
      setBusy(null);
    }
  };

  const computePrice = async () => {
    setBusy('price');
    try {
      const { data } = await apiPriceMasterPrint(
        draft.project.documentId,
        lines,
        pickup ? undefined : address
      );
      setPrice(data);
      setPriceFor(signature);
    } catch (e) {
      toast.error(masterPrintError(e, 'Chiffrage impossible.'));
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    const total =
      priceFresh && price?.totalExclTax != null
        ? ` (${fmtEur(price.totalExclTax)} HT)`
        : '';
    const question = sandbox
      ? 'Bac à sable : rien ne sera produit ni facturé. Envoyer la commande d’essai ?'
      : `Envoyer ce projet à Master Print${total} ? Il sera fabriqué et facturé.`;
    if (!window.confirm(question)) return;
    setBusy('send');
    try {
      const assigned = Object.fromEntries(
        Object.entries(files).filter(([slot, id]) => id && slots.includes(slot))
      );
      const { data } = await apiSendToMasterPrint(draft.project.documentId, {
        idempotencyKey: keyRef.current,
        lines,
        ...(pickup
          ? { pickup: true }
          : { shipping_address: address, blind_shipping: blind }),
        notes: notes.trim() || undefined,
        files: assigned,
        ...(pegMode && remember && mapping?.productId && draft.pegProduct
          ? { remember: mappingToSave(mapping) }
          : {}),
      });
      toast.success(
        data.filesStarted
          ? `Commande ${data.order.orderId} créée — envoi des fichiers en cours`
          : `Commande ${data.order.orderId} créée${data.order.missingFiles ? ' — fichiers à envoyer' : ''}`
      );
      onSent();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      keyRef.current = nextIdempotencyKey(keyRef.current, status);
      toast.error(masterPrintError(e, 'Envoi refusé par Master Print.'));
    } finally {
      setBusy(null);
    }
  };

  const setAddr =
    (k: keyof MpAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((a) => ({ ...a, [k]: e.target.value }));
  const m = margin(draft.project.price, price?.totalExclTax);

  return (
    <div
      style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}
      data-testid="master-print-send-form"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ ...sectionTitle, margin: 0, fontSize: '16px' }}>
          Envoyer à Master Print
        </h3>
        <span
          style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}
        >
          {sandbox && (
            <Pill tone={SANDBOX_TONE}>Bac à sable — rien n’est produit</Pill>
          )}
          <Btn onClick={onClose}>Fermer</Btn>
        </span>
      </div>

      {!!draft.personalization.length && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}
        >
          <p style={label}>Personnalisation demandée par le client</p>
          {draft.personalization.map((p, i) => (
            <p key={i} style={{ fontSize: '12.5px', lineHeight: 1.6 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {p.label} :
              </span>{' '}
              {p.value}
            </p>
          ))}
        </div>
      )}

      {/* 1. Produit */}
      <section>
        <h4 style={sectionTitle}>1. Produit</h4>
        {pegMode ? (
          <>
            <p style={muted}>
              Produit PEG :{' '}
              <strong style={{ color: '#fff' }}>
                {draft.pegProduct?.name || '—'}
              </strong>
              {draft.pegProduct?.ref ? ` (réf. ${draft.pegProduct.ref})` : ''}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                marginTop: '6px',
              }}
            >
              <span style={{ fontSize: '13.5px' }}>
                Master Print :{' '}
                <strong>
                  {view
                    ? `${view.name}${view.sku ? ` · réf. ${view.sku}` : ''}`
                    : 'à choisir'}
                </strong>
              </span>
              {draft.mappingProposed && view && (
                <Pill tone={SANDBOX_TONE}>Proposé — à vérifier</Pill>
              )}
              <Btn
                onClick={() => setPicker(picker === 'peg' ? null : 'peg')}
                disabled={busy === 'pick'}
              >
                {view ? 'Changer' : 'Choisir le produit'}
              </Btn>
            </div>
            {draft.mappingError && (
              <p style={{ ...muted, color: '#fca5a5', marginTop: '6px' }}>
                {draft.mappingError}
              </p>
            )}
            {picker === 'peg' && (
              <ProductPicker
                initialQuery={draft.pegProduct?.ref || ''}
                onPick={pickPeg}
                onClose={() => setPicker(null)}
              />
            )}
          </>
        ) : (
          <p style={muted}>
            Projet sans commande en ligne : décrivez chaque ligne à fabriquer.
          </p>
        )}
      </section>

      {/* 2. Lignes */}
      <section>
        <h4 style={sectionTitle}>
          2. Quantités {pegMode ? 'et correspondances' : ''}
        </h4>
        {pegMode ? (
          view && mapping ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {!!pegColors.length && !!view.colors.length && (
                <div style={grid(220)}>
                  {pegColors.map(([doc, name]) => (
                    <Field key={doc} title={`Coloris PEG « ${name} »`}>
                      <select
                        style={input}
                        value={mapping.colors[doc] || ''}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            colors: {
                              ...mapping.colors,
                              [doc]: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Choisir…</option>
                        {view.colors.map((c) => (
                          <option
                            key={c.code}
                            value={c.code}
                            disabled={c.available === false}
                          >
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              )}
              {!!pegSizes.length && !!view.sizes.length && (
                <div style={grid(140)}>
                  {pegSizes.map(([doc, name]) => (
                    <Field key={doc} title={`Taille PEG « ${name} »`}>
                      <select
                        style={input}
                        value={mapping.sizes[doc] || ''}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            sizes: { ...mapping.sizes, [doc]: e.target.value },
                          })
                        }
                      >
                        <option value="">Choisir…</option>
                        {view.sizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              )}
              <OptionsEditor view={view} value={extra} onChange={setExtra} />
              {built.map((b) => (
                <div
                  key={b.key}
                  style={{
                    fontSize: '12.5px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <strong>{b.config.quantity} pièce(s)</strong>
                  {b.config.options.color
                    ? ` · ${view.colors.find((c) => c.code === b.config.options.color)?.label || b.config.options.color}`
                    : ''}
                  {b.config.options.sizes
                    ? ` · ${Object.entries(b.config.options.sizes)
                        .map(([s, n]) => `${s} × ${n}`)
                        .join(', ')}`
                    : ''}
                  {b.config.width_mm
                    ? ` · ${b.config.width_mm} × ${b.config.height_mm} mm`
                    : ''}
                  {b.config.options.color &&
                    b.config.options.sizes &&
                    Object.keys(b.config.options.sizes).some(
                      (s) =>
                        !sizesForColor(
                          view,
                          b.config.options.color as string
                        ).includes(s)
                    ) && (
                      <span style={{ color: '#fcd34d' }}>
                        {' '}
                        · une taille n’existe pas dans ce coloris
                      </span>
                    )}
                </div>
              ))}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Mémoriser ces correspondances et marquages pour «{' '}
                {draft.pegProduct?.name} »
              </label>
            </div>
          ) : (
            <p style={muted}>Choisissez d’abord le produit Master Print.</p>
          )
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {manual.map((l) => (
              <div key={l.key}>
                <ManualLineEditor
                  line={l}
                  view={views[l.config.product_id]}
                  onChange={(config) =>
                    setManual((ls) =>
                      ls.map((x) => (x.key === l.key ? { ...x, config } : x))
                    )
                  }
                  onRemove={() =>
                    setManual((ls) => ls.filter((x) => x.key !== l.key))
                  }
                  onPick={() => setPicker(picker === l.key ? null : l.key)}
                  picking={busy === 'pick'}
                />
                {picker === l.key && (
                  <ProductPicker
                    onPick={(item) => pickManual(l.key, item)}
                    onClose={() => setPicker(null)}
                  />
                )}
              </div>
            ))}
            <div>
              <Btn
                onClick={() =>
                  setManual((ls) => [
                    ...ls,
                    { key: newKey(), config: { product_id: '', options: {} } },
                  ])
                }
              >
                <HiPlus aria-hidden="true" /> Ajouter une ligne
              </Btn>
            </div>
          </div>
        )}
      </section>

      {/* 3. Marquages (commande PEG : les mêmes sur toutes les lignes) */}
      {pegMode && view?.markings && mapping && (
        <section>
          <h4 style={sectionTitle}>3. Marquages</h4>
          <MarkingsEditor
            view={view}
            markings={mapping.markings}
            onChange={(markings) => setMapping({ ...mapping, markings })}
          />
        </section>
      )}

      {/* 4. Fichiers */}
      <section>
        <h4 style={sectionTitle}>
          {pegMode ? '4' : '3'}. Fichiers d’impression
        </h4>
        {!slots.length ? (
          <p style={muted}>
            Aucun fichier attendu pour l’instant (ajoutez un marquage, ou Master
            Print précisera après l’envoi).
          </p>
        ) : !draft.files.length ? (
          <p style={muted}>
            Aucun fichier sur le projet : déposez-les dans l’onglet « Fichiers
            », ou envoyez-les après la commande.
          </p>
        ) : (
          <div style={grid(240)}>
            {slots.map((slot) => (
              <Field key={slot} title={slotLabel(slot, slotView(slot))}>
                <select
                  style={input}
                  value={files[slot] || ''}
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, [slot]: Number(e.target.value) }))
                  }
                >
                  <option value="">Plus tard</option>
                  {draft.files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.source})
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        )}
        <p style={{ ...muted, marginTop: '6px' }}>
          PDF, PNG, JPG, SVG ou TIFF, 50 Mo au plus. Sans fichier, la commande
          attend vos fichiers.
        </p>
      </section>

      {/* 5. Livraison */}
      <section>
        <h4 style={sectionTitle}>{pegMode ? '5' : '4'}. Livraison</h4>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '10px',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
            }}
          >
            <input
              type="checkbox"
              checked={!pickup}
              onChange={(e) => setPickup(!e.target.checked)}
            />
            Livrer directement le client
          </label>
          {!pickup && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
              }}
            >
              <input
                type="checkbox"
                checked={blind}
                onChange={(e) => setBlind(e.target.checked)}
              />
              Envoi neutre (aucune mention de Master Print)
            </label>
          )}
        </div>
        {pickup ? (
          <p style={muted}>
            Retrait à l’atelier Master Print (Ogy-Montoy-Flanville, 57).
          </p>
        ) : (
          <div style={grid(200)}>
            <Field title="Société">
              <input
                style={input}
                value={address.company || ''}
                onChange={setAddr('company')}
              />
            </Field>
            <Field title="Destinataire *">
              <input
                style={input}
                value={address.name || ''}
                onChange={setAddr('name')}
              />
            </Field>
            <Field title="Rue *">
              <input
                style={input}
                value={address.street || ''}
                onChange={setAddr('street')}
              />
            </Field>
            <Field title="Complément">
              <input
                style={input}
                value={address.street2 || ''}
                onChange={setAddr('street2')}
              />
            </Field>
            <Field title="Code postal *">
              <input
                style={input}
                value={address.postal_code || ''}
                onChange={setAddr('postal_code')}
              />
            </Field>
            <Field title="Ville *">
              <input
                style={input}
                value={address.city || ''}
                onChange={setAddr('city')}
              />
            </Field>
            <Field title="Pays * (FR, CH…)">
              <input
                style={input}
                maxLength={2}
                value={address.country || ''}
                onChange={setAddr('country')}
              />
            </Field>
            <Field title="Téléphone">
              <input
                style={input}
                value={address.phone || ''}
                onChange={setAddr('phone')}
              />
            </Field>
            <Field title="E-mail">
              <input
                style={input}
                type="email"
                value={address.email || ''}
                onChange={setAddr('email')}
              />
            </Field>
          </div>
        )}
        <Field title="Consignes pour l’atelier" style={{ marginTop: '10px' }}>
          <textarea
            style={{ ...input, minHeight: '64px', resize: 'vertical' }}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </section>

      {/* 6. Prix et envoi */}
      <section>
        <h4 style={sectionTitle}>{pegMode ? '6' : '5'}. Prix et envoi</h4>
        <Issues items={issues} />
        {priceFresh && price && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {price.results.map((r) => (
              <p
                key={r.index}
                style={{
                  fontSize: '12.5px',
                  lineHeight: 1.6,
                  color: r.ok ? 'rgba(255,255,255,0.85)' : '#fca5a5',
                }}
              >
                Ligne {r.index + 1} :{' '}
                {r.ok
                  ? `${fmtEur(r.totalExclTax)} HT${r.unitPriceExclTax ? ` (${fmtEur(r.unitPriceExclTax)} / pièce)` : ''}${r.shipDate ? ` · expédition estimée le ${new Date(r.shipDate).toLocaleDateString('fr-FR')}` : ''}`
                  : r.error}
              </p>
            ))}
            <div style={{ ...grid(150), marginTop: '8px' }}>
              <div>
                <p style={label}>Produits</p>
                <p style={{ fontWeight: 700 }}>
                  {fmtEur(price.productsExclTax)} HT
                </p>
              </div>
              <div>
                <p style={label}>Port estimé</p>
                <p style={{ fontWeight: 700 }}>
                  {price.shipping?.amount != null
                    ? `${fmtEur(price.shipping.amount)} HT`
                    : pickup
                      ? 'Retrait'
                      : '—'}
                </p>
              </div>
              <div>
                <p style={label}>Coût Master Print</p>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>
                  {fmtEur(price.totalExclTax)} HT
                </p>
              </div>
              <div>
                <p style={label}>Prix du projet</p>
                <p style={{ fontWeight: 700 }}>{fmtEur(draft.project.price)}</p>
              </div>
              {m && (
                <div>
                  <p style={label}>Marge</p>
                  <p
                    style={{
                      fontWeight: 700,
                      color: m.amount >= 0 ? '#86efac' : '#fca5a5',
                    }}
                  >
                    {fmtEur(m.amount)} ({m.rate.toLocaleString('fr-FR')} %)
                  </p>
                </div>
              )}
            </div>
            {/* La note de Master Print n'est utile que si le port n'a pas pu être chiffré. */}
            {price.shipping &&
              price.shipping.amount == null &&
              price.shipping.message && (
                <p style={{ ...muted, marginTop: '6px' }}>
                  {price.shipping.message}
                </p>
              )}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          <Btn onClick={computePrice} disabled={!!issues.length || !!busy}>
            {busy === 'price'
              ? 'Calcul…'
              : priceFresh
                ? 'Recalculer le prix'
                : 'Calculer le prix Master Print'}
          </Btn>
          <Btn
            variant="primary"
            onClick={send}
            disabled={!!issues.length || !!busy}
          >
            {busy === 'send'
              ? 'Envoi…'
              : sandbox
                ? 'Envoyer la commande d’essai'
                : 'Envoyer à Master Print'}
          </Btn>
        </div>
      </section>
    </div>
  );
};

export default SendForm;
