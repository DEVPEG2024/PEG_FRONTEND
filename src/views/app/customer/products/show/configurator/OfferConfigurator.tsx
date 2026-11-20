import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiCheck,
  HiPlus,
  HiTrash,
  HiUpload,
  HiTruck,
  HiShoppingCart,
} from 'react-icons/hi';
import type {
  OfferClientConfig,
  OfferClientMarking,
  OfferFileSlot,
  OfferPriceResult,
  OfferSpec,
  OfferUploadedFile,
} from '@/@types/masterPrint';
import type { Product } from '@/@types/product';
import type { CartConfigurator, CartItem } from '@/@types/cart';
import { apiPriceConfigurator } from '@/services/ConfiguratorServices';
import { apiUploadFile } from '@/services/FileServices';
import { addToCart, removeFromCart } from '@/store/slices/base/cartSlice';
import { useAppDispatch, useAppSelector, RootState } from '@/store';
import { fmtHT, fmtTTC, toTTC } from '@/utils/priceHelpers';
import {
  acceptAttr,
  cmToMm,
  configBlocker,
  fileMatches,
  formatsLabel,
  configForServer,
  formatDims,
  formatsForPosition,
  initialConfig,
  markingAt,
  mmToCm,
  optionHidden,
  selectionsFromConfig,
  shipDateLabel,
  totalPieces,
} from '@/utils/offerConfigurator';
import useResponsive from '@/utils/hooks/useResponsive';
import ProductImageCarousel from '@/components/shared/ProductImageCarousel';
import ProductActionBar from '../ProductActionBar';
import { C, Chip, Label, Section, Stepper, Swatch, inputStyle } from './ui';

/*
 * Formulaire d'une offre configurable (produit relié à l'imprimeur partenaire).
 * Le client compose sa commande ; le SERVEUR la contrôle et la chiffre à chaque
 * changement (prix PEG, remise Premium comprise) et dit quels visuels fournir.
 * L'article entre au panier avec ce prix ; la ligne de commande est créée par
 * le serveur au paiement (PaymentContent), qui transmet ensuite la commande.
 * L'imprimeur n'est jamais nommé ici.
 */

type Props = {
  product: Product;
  spec: OfferSpec;
  /** Aperçu admin : prix réel, pas d'ajout au panier. */
  preview?: boolean;
  /** Modification d'un article du panier. */
  editing?: CartItem | null;
};

type PriceState =
  | { status: 'idle'; blocker: string | null }
  | { status: 'loading' }
  | { status: 'ok'; result: OfferPriceResult; key: string }
  | { status: 'error'; message: string };

const errorMessage = (e: unknown): string => {
  const data = (e as { response?: { data?: { error?: unknown } } })?.response
    ?.data;
  return typeof data?.error === 'string'
    ? data.error
    : 'Le calcul du prix est momentanément indisponible.';
};

const OfferConfigurator = ({
  product,
  spec,
  preview = false,
  editing = null,
}: Props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { smaller } = useResponsive();
  const user = useAppSelector((s: RootState) => s.auth.user.user);
  const [config, setConfig] = useState<OfferClientConfig>(
    () => editing?.configurator?.config ?? initialConfig(spec)
  );
  const [files, setFiles] = useState<Record<string, OfferUploadedFile>>(
    () => editing?.configurator?.files ?? {}
  );
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [price, setPrice] = useState<PriceState>({
    status: 'idle',
    blocker: null,
  });
  const [showDetail, setShowDetail] = useState(false);
  const seq = useRef(0);

  const forServer = useMemo(
    () => configForServer(spec, config),
    [spec, config]
  );
  const key = JSON.stringify(forServer);
  const blocker = configBlocker(spec, config);
  const pieces = totalPieces(spec, config);

  // Prix serveur à chaque changement (après une courte pause de saisie).
  useEffect(() => {
    if (blocker) {
      setPrice({ status: 'idle', blocker });
      return;
    }
    const mine = ++seq.current;
    setPrice((p) => (p.status === 'ok' ? p : { status: 'loading' }));
    const t = setTimeout(async () => {
      try {
        const res = await apiPriceConfigurator(product.documentId, forServer);
        if (mine === seq.current)
          setPrice({ status: 'ok', result: res.data, key });
      } catch (e) {
        if (mine === seq.current)
          setPrice({ status: 'error', message: errorMessage(e) });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [key, blocker]);

  const priced =
    price.status === 'ok' && price.key === key ? price.result : null;
  const shown = price.status === 'ok' ? price.result : null; // dernier prix connu pendant un recalcul
  const slots: OfferFileSlot[] = shown?.files ?? [];
  const missingFiles = slots.filter(
    (s) => !files[s.slot] || !fileMatches(files[s.slot].name, s.formats)
  );
  const formatsOf = (slot: string) =>
    slots.find((s) => s.slot === slot)?.formats ?? ['pdf'];

  const set = (patch: Partial<OfferClientConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));
  const setOption = (code: string, value: string | string[]) =>
    setConfig((c) => ({
      ...c,
      options: { ...(c.options || {}), [code]: value },
    }));

  const upload = async (
    slot: string,
    file: File | undefined,
    formats: string[]
  ) => {
    if (!file) return;
    if (!fileMatches(file.name, formats)) {
      toast.error(`Format ${formatsLabel(formats)} attendu pour ce visuel.`);
      return;
    }
    setUploading((u) => ({ ...u, [slot]: true }));
    try {
      const f = await apiUploadFile(file);
      setFiles((all) => ({
        ...all,
        [slot]: { id: Number(f.id), name: f.name || file.name, url: f.url },
      }));
    } catch {
      toast.error('Le fichier n’a pas pu être envoyé. Réessayez.');
    } finally {
      setUploading((u) => ({ ...u, [slot]: false }));
    }
  };

  const canAdd =
    !preview &&
    !!priced &&
    missingFiles.length === 0 &&
    !Object.values(uploading).some(Boolean);

  const handleAdd = () => {
    if (!priced) return;
    if (missingFiles.length) {
      toast.error(
        `Ajoutez ${missingFiles.length > 1 ? 'vos visuels' : 'votre visuel'} : ${missingFiles.map((s) => s.label).join(', ')}`
      );
      return;
    }
    const kept = Object.fromEntries(slots.map((s) => [s.slot, files[s.slot]]));
    const configurator: CartConfigurator = {
      config: forServer,
      files: kept,
      price: priced.price,
      summary: priced.summary,
    };
    if (editing) dispatch(removeFromCart(editing));
    dispatch(
      addToCart({
        id: Math.random().toString(16).slice(2),
        product,
        formAnswer: null,
        sizeAndColors: selectionsFromConfig(spec, forServer),
        userDocumentId: user?.documentId,
        configurator,
      } as unknown as CartItem)
    );
    toast.success(editing ? 'Article mis à jour' : 'Article ajouté au panier');
    if (editing) navigate('/customer/cart');
    else navigate(-1);
  };

  // ── Sections ──────────────────────────────────────────────────────────────
  let step = 0;
  const color = spec.colors.find((c) => c.code === config.color);
  const markings = config.markings ?? [];
  const m = spec.markings;

  const toggleMarking = (position: string) => {
    const has = markings.some((x) => x.position === position);
    if (has) set({ markings: markings.filter((x) => x.position !== position) });
    else if (m && markings.length >= m.max)
      toast.info(`${m.max} emplacement${m.max > 1 ? 's' : ''} au plus.`);
    else set({ markings: [...markings, markingAt(spec, position)] });
  };
  const updateMarking = (
    position: string,
    patch: Partial<OfferClientMarking>
  ) =>
    set({
      markings: markings.map((x) =>
        x.position === position ? { ...x, ...patch } : x
      ),
    });

  const colorSection = spec.kind === 'textile' && spec.colors.length > 0 && (
    <Section
      step={++step}
      title="Coloris"
      aside={
        color && (
          <span style={{ fontSize: '13px', color: C.muted }}>
            {color.label}
          </span>
        )
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {spec.colors.map((c) => (
          <button
            key={c.code}
            type="button"
            className="peg-tap-target"
            title={c.label}
            aria-label={c.label}
            aria-pressed={c.code === config.color}
            onClick={() => {
              // Les tailles qui n'existent pas dans le nouveau coloris sont retirées.
              const sizes = Object.fromEntries(
                Object.entries(config.sizes || {}).filter(([k]) =>
                  c.sizes.includes(k)
                )
              );
              set({ color: c.code, sizes });
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              width: '64px',
            }}
          >
            <span
              style={{
                padding: '3px',
                borderRadius: '999px',
                border: `2px solid ${c.code === config.color ? C.accent : 'transparent'}`,
              }}
            >
              <Swatch hex={c.hex} />
            </span>
            <span
              style={{
                fontSize: '11px',
                color: c.code === config.color ? '#fff' : C.muted,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {c.label}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );

  const quantitySection =
    spec.kind !== 'length' &&
    (spec.kind === 'textile' && spec.sizes.length ? (
      <Section
        step={++step}
        title="Tailles et quantités"
        hint={
          spec.quantity.min > 1
            ? `À partir de ${spec.quantity.min} pièces, toutes tailles confondues.`
            : undefined
        }
        aside={
          <span
            style={{
              fontSize: '13px',
              color: pieces ? C.accentText : C.muted,
              fontWeight: 700,
            }}
          >
            {pieces} pièce{pieces > 1 ? 's' : ''}
          </span>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: '10px',
          }}
        >
          {(color?.sizes ?? spec.sizes).map((s) => (
            <Stepper
              key={s}
              label={s}
              ariaLabel={`Taille ${s}`}
              value={Number(config.sizes?.[s] || 0)}
              onChange={(n) =>
                set({ sizes: { ...(config.sizes || {}), [s]: n } })
              }
            />
          ))}
        </div>
      </Section>
    ) : (
      <Section
        step={++step}
        title="Quantité"
        hint={
          spec.quantity.min > 1 ? `Minimum ${spec.quantity.min}.` : undefined
        }
      >
        <div style={{ maxWidth: '200px' }}>
          <Stepper
            ariaLabel="Quantité"
            min={spec.quantity.min}
            step={spec.quantity.step}
            value={Number(config.quantity || 0)}
            onChange={(n) => set({ quantity: n })}
          />
        </div>
      </Section>
    ));

  const formatSection = spec.format?.mode === 'client' && (
    <Section step={++step} title="Format">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '10px',
        }}
      >
        {spec.format.formats.map((f) => (
          <Chip
            key={f.code}
            active={config.format === f.code}
            onClick={() =>
              set({ format: f.code, width_mm: undefined, height_mm: undefined })
            }
          >
            <strong style={{ display: 'block' }}>{f.label}</strong>
            <span style={{ fontSize: '11.5px', color: C.muted }}>
              {f.printed ? formatDims(f) : 'Sans impression'}
            </span>
          </Chip>
        ))}
        {spec.format.free && (
          <Chip
            active={!config.format}
            onClick={() =>
              set({
                format: undefined,
                width_mm:
                  config.width_mm ||
                  Math.max(
                    spec.format?.mode === 'client'
                      ? spec.format.free?.width.min || 100
                      : 100,
                    100
                  ),
                height_mm: config.height_mm || 100,
              })
            }
          >
            <strong style={{ display: 'block' }}>Sur mesure</strong>
            <span style={{ fontSize: '11.5px', color: C.muted }}>
              Vos dimensions
            </span>
          </Chip>
        )}
      </div>
      {spec.format.free && !config.format && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '12px',
            maxWidth: '360px',
          }}
        >
          <label>
            <Label>Largeur (cm)</Label>
            <input
              type="number"
              inputMode="decimal"
              style={inputStyle}
              value={mmToCm(config.width_mm)}
              onChange={(e) => set({ width_mm: cmToMm(e.target.value) })}
            />
          </label>
          <label>
            <Label>Hauteur (cm)</Label>
            <input
              type="number"
              inputMode="decimal"
              style={inputStyle}
              value={mmToCm(config.height_mm)}
              onChange={(e) => set({ height_mm: cmToMm(e.target.value) })}
            />
          </label>
          <p
            style={{
              gridColumn: '1 / -1',
              margin: 0,
              fontSize: '11.5px',
              color: C.faint,
            }}
          >
            De {mmToCm(spec.format.free.width.min)} à{' '}
            {mmToCm(
              Math.max(
                spec.format.free.width.max || 0,
                spec.format.free.height.max || 0
              )
            )}{' '}
            cm.
          </p>
        </div>
      )}
    </Section>
  );

  const markingSection = m?.mode === 'client' && (
    <Section
      step={++step}
      title="Marquage"
      hint={
        m.min > 0
          ? `Choisissez ${m.max > 1 ? `jusqu’à ${m.max} emplacements` : 'l’emplacement'} de votre logo.`
          : `Facultatif : jusqu’à ${m.max} emplacement${m.max > 1 ? 's' : ''}. Sans marquage, le produit est livré vierge.`
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {m.positions.map((p) => {
          const on = markings.some((x) => x.position === p.code);
          const usable = p.formats.length > 0 || m.customSize;
          return (
            <Chip
              key={p.code}
              active={on}
              disabled={!usable}
              onClick={() => toggleMarking(p.code)}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {on && <HiCheck aria-hidden />}
                {p.label}
              </span>
            </Chip>
          );
        })}
      </div>
      {markings.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '14px',
          }}
        >
          {markings.map((mk) => {
            const pos = m.positions.find((p) => p.code === mk.position);
            const formats = formatsForPosition(spec, mk.position);
            return (
              <div
                key={mk.position}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <strong
                    style={{ color: C.text, fontSize: '13.5px', flex: 1 }}
                  >
                    {pos?.label}
                  </strong>
                  {pos?.maxWidthMm && (
                    <span style={{ fontSize: '11px', color: C.faint }}>
                      zone max. {mmToCm(pos.maxWidthMm)} ×{' '}
                      {mmToCm(pos.maxHeightMm)} cm
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formats.map((f) => (
                    <Chip
                      key={f.code}
                      active={mk.format === f.code}
                      onClick={() =>
                        updateMarking(mk.position, {
                          format: f.code,
                          width_mm: undefined,
                        })
                      }
                      style={{ padding: '7px 12px' }}
                    >
                      {f.label}{' '}
                      <span style={{ color: C.muted, fontSize: '11px' }}>
                        {formatDims(f)}
                      </span>
                    </Chip>
                  ))}
                  {m.customSize && (
                    <Chip
                      active={!mk.format}
                      onClick={() =>
                        updateMarking(mk.position, {
                          format: undefined,
                          width_mm:
                            mk.width_mm ||
                            Math.min(100, pos?.maxWidthMm || 100),
                        })
                      }
                      style={{ padding: '7px 12px' }}
                    >
                      Largeur au choix
                    </Chip>
                  )}
                </div>
                {!mk.format && m.customSize && (
                  <label style={{ maxWidth: '180px' }}>
                    <Label>Largeur du logo (cm)</Label>
                    <input
                      type="number"
                      inputMode="decimal"
                      style={inputStyle}
                      value={mmToCm(mk.width_mm)}
                      onChange={(e) =>
                        updateMarking(mk.position, {
                          width_mm: cmToMm(e.target.value),
                        })
                      }
                    />
                  </label>
                )}
                {m.techniques.length > 1 && (
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {m.techniques.map((t) => (
                      <Chip
                        key={t.code}
                        active={mk.technique === t.code}
                        onClick={() =>
                          updateMarking(mk.position, { technique: t.code })
                        }
                        style={{ padding: '7px 12px' }}
                      >
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );

  const piecesSection = spec.kind === 'length' && spec.pieces && (
    <Section
      step={++step}
      title="Vos visuels"
      hint={`Un fichier par visuel, à ses dimensions. Ils sont placés côte à côte sur le rouleau${spec.pieces.rollWidthMm ? ` (${mmToCm(spec.pieces.rollWidthMm)} cm de large)` : ''} : vous ne payez que la longueur utilisée.`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(config.pieces || []).map((p, i) => {
          const slot = `piece:${i + 1}`;
          const update = (patch: Partial<typeof p>) =>
            set({
              pieces: (config.pieces || []).map((x, j) =>
                j === i ? { ...x, ...patch } : x
              ),
            });
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: smaller.sm
                  ? '1fr 1fr'
                  : '1fr 1fr 1fr auto',
                gap: '10px',
                alignItems: 'end',
              }}
            >
              <label>
                <Label>Largeur (cm)</Label>
                <input
                  type="number"
                  inputMode="decimal"
                  style={inputStyle}
                  value={mmToCm(p.width_mm)}
                  onChange={(e) => update({ width_mm: cmToMm(e.target.value) })}
                />
              </label>
              <label>
                <Label>Hauteur (cm)</Label>
                <input
                  type="number"
                  inputMode="decimal"
                  style={inputStyle}
                  value={mmToCm(p.height_mm)}
                  onChange={(e) =>
                    update({ height_mm: cmToMm(e.target.value) })
                  }
                />
              </label>
              <Stepper
                label="Exemplaires"
                ariaLabel={`Exemplaires du visuel ${i + 1}`}
                min={1}
                value={p.quantity}
                onChange={(n) => update({ quantity: Math.max(1, n) })}
              />
              <button
                type="button"
                aria-label={`Retirer le visuel ${i + 1}`}
                disabled={(config.pieces || []).length <= 1}
                onClick={() => {
                  set({
                    pieces: (config.pieces || []).filter((_, j) => j !== i),
                  });
                  // Les visuels suivants remontent d'un rang : leurs fichiers aussi.
                  setFiles((all) => {
                    const next: Record<string, OfferUploadedFile> = {};
                    for (const [k, v] of Object.entries(all)) {
                      const r = k.startsWith('piece:')
                        ? Number(k.slice(6))
                        : NaN;
                      if (!Number.isFinite(r)) next[k] = v;
                      else if (r < i + 1) next[k] = v;
                      else if (r > i + 1) next[`piece:${r - 1}`] = v;
                    }
                    return next;
                  });
                }}
                style={{
                  height: '40px',
                  width: '40px',
                  borderRadius: '10px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  color: C.error,
                  cursor: 'pointer',
                }}
              >
                <HiTrash />
              </button>
              <div style={{ gridColumn: '1 / -1' }}>
                <FileField
                  slot={slot}
                  label={`Fichier du visuel ${i + 1}`}
                  formats={formatsOf(slot)}
                  file={files[slot]}
                  busy={!!uploading[slot]}
                  onFile={(f) => upload(slot, f, formatsOf(slot))}
                />
              </div>
            </div>
          );
        })}
        {(config.pieces || []).length < spec.pieces.maxCount && (
          <button
            type="button"
            onClick={() =>
              set({
                pieces: [
                  ...(config.pieces || []),
                  { width_mm: 100, height_mm: 100, quantity: 1 },
                ],
              })
            }
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: `1.5px dashed ${C.border}`,
              borderRadius: '12px',
              padding: '9px 14px',
              color: C.accentText,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HiPlus aria-hidden /> Ajouter un visuel
          </button>
        )}
      </div>
    </Section>
  );

  const visibleOptions = spec.options.filter((o) => !optionHidden(o, config));
  const optionsSection = visibleOptions.length > 0 && (
    <Section step={++step} title="Options">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {visibleOptions.map((o) => {
          const value = config.options?.[o.code];
          const list = Array.isArray(value) ? value : value ? [value] : [];
          return (
            <div key={o.code}>
              <Label>
                {o.label}
                {o.required ? '' : ' (facultatif)'}
              </Label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '8px',
                }}
              >
                {o.values.map((v) => {
                  const on = list.includes(v.code);
                  return (
                    <Chip
                      key={v.code}
                      active={on}
                      title={v.description || undefined}
                      onClick={() => {
                        if (o.type === 'multi_select')
                          setOption(
                            o.code,
                            on
                              ? list.filter((x) => x !== v.code)
                              : [...list, v.code]
                          );
                        else if (on && !o.required) setOption(o.code, '');
                        else setOption(o.code, v.code);
                      }}
                    >
                      <strong
                        style={{ display: 'block', fontWeight: on ? 700 : 600 }}
                      >
                        {v.label}
                      </strong>
                      {v.description && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: '3px',
                            fontSize: '11.5px',
                            color: C.muted,
                            fontWeight: 400,
                          }}
                        >
                          {v.description}
                        </span>
                      )}
                    </Chip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );

  const includedItems = [
    ...(m?.mode === 'fixed'
      ? m.fixed.map((f) => ({
          label: `Marquage ${f.positionLabel}`,
          value: `${f.sizeLabel} · ${f.techniqueLabel}`,
        }))
      : []),
    ...(spec.format?.mode === 'fixed'
      ? [{ label: 'Format', value: spec.format.label }]
      : []),
    ...spec.fixedOptions,
  ];
  const includedSection = includedItems.length > 0 && (
    <Section title="Compris dans l’offre">
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gap: '6px',
        }}
      >
        {includedItems.map((it) => (
          <li
            key={it.label}
            style={{
              display: 'flex',
              gap: '8px',
              fontSize: '13px',
              color: C.text,
            }}
          >
            <HiCheck style={{ color: C.ok, flexShrink: 0, marginTop: '2px' }} />
            <span>
              <span style={{ color: C.muted }}>{it.label} :</span> {it.value}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );

  const fileSlots = spec.kind === 'length' ? [] : slots;
  const filesSection = fileSlots.length > 0 && (
    <Section
      step={++step}
      title={fileSlots.length > 1 ? 'Vos visuels' : 'Votre visuel'}
      hint="En bonne définition, à la taille du marquage ou du format choisi. Notre équipe vérifie chaque fichier avant impression."
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        {fileSlots.map((s) => (
          <FileField
            key={s.slot}
            slot={s.slot}
            label={s.label.replace(/^Visuel — /, '')}
            formats={s.formats}
            file={files[s.slot]}
            busy={!!uploading[s.slot]}
            onFile={(f) => upload(s.slot, f, s.formats)}
          />
        ))}
      </div>
    </Section>
  );

  // ── Prix ──────────────────────────────────────────────────────────────────
  const days = spec.productionDays ?? 0;
  const ship = shipDateLabel(shown?.price.shipDate);
  const pricePanel = (
    <div
      style={{
        background:
          'linear-gradient(160deg, rgba(47,111,237,0.16), rgba(47,111,237,0.05))',
        border: '1px solid rgba(47,111,237,0.3)',
        borderRadius: '16px',
        padding: 'var(--peg-pad-20)',
      }}
      aria-live="polite"
    >
      {shown ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#fff',
                opacity: price.status === 'ok' && price.key === key ? 1 : 0.55,
                transition: 'opacity .2s',
              }}
            >
              {fmtHT(shown.price.totalExclTax)}
            </span>
            <span style={{ fontSize: '13px', color: C.muted }}>
              {fmtTTC(toTTC(shown.price.totalExclTax))}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: C.muted }}>
            {shown.price.quantityLabel}
            {shown.price.unitPriceExclTax != null &&
              ` · ${fmtHT(shown.price.unitPriceExclTax)} / pièce`}
          </p>
          {(ship || (shown.price.workingDays ?? 0) > 0) && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '12.5px',
                color: C.text,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              <HiTruck style={{ color: C.accentText }} />
              {ship
                ? `Expédition estimée ${ship}`
                : `Fabrication en ${shown.price.workingDays} jour${(shown.price.workingDays || 0) > 1 ? 's' : ''} ouvré${(shown.price.workingDays || 0) > 1 ? 's' : ''}`}
            </p>
          )}
          {shown.price.detail.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                style={{
                  marginTop: '10px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: C.accentText,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {showDetail ? 'Masquer le détail' : 'Voir le détail du prix'}
              </button>
              {showDetail && (
                <ul
                  style={{
                    margin: '8px 0 0',
                    padding: 0,
                    listStyle: 'none',
                    display: 'grid',
                    gap: '4px',
                  }}
                >
                  {shown.price.detail.map((d, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontSize: '12px',
                        color: C.muted,
                      }}
                    >
                      <span>{d.label}</span>
                      <span style={{ color: C.text }}>{fmtHT(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '13.5px', color: C.muted }}>
          {price.status === 'loading'
            ? 'Calcul du prix…'
            : price.status === 'idle'
              ? price.blocker || 'Composez votre commande.'
              : ''}
        </p>
      )}
      {price.status === 'error' && (
        <p
          role="alert"
          style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.error }}
        >
          {price.message}
        </p>
      )}
      {price.status === 'idle' && price.blocker && shown && (
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.warn }}>
          {price.blocker}
        </p>
      )}
      {priced && missingFiles.length > 0 && !preview && (
        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.warn }}>
          Ajoutez {missingFiles.length > 1 ? 'vos visuels' : 'votre visuel'}{' '}
          pour continuer.
        </p>
      )}
      {!smaller.md && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            border: 'none',
            background: canAdd ? C.accent : 'rgba(255,255,255,0.08)',
            color: canAdd ? '#fff' : C.faint,
            fontWeight: 800,
            fontSize: '14px',
            cursor: canAdd ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <HiShoppingCart />{' '}
          {preview
            ? 'Aperçu — ajout au panier côté client'
            : editing
              ? 'Mettre à jour le panier'
              : 'Ajouter au panier'}
        </button>
      )}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        style={{
          flex: '1 1 380px',
          minWidth: '280px',
          padding: 'var(--peg-pad-20)',
          boxSizing: 'border-box',
          position: smaller.md ? 'static' : 'sticky',
          top: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="peg-media-cap"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #eef3fb 100%)',
              borderRadius: '16px',
              padding: '24px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: smaller.md ? '240px' : '320px',
            }}
          >
            <ProductImageCarousel
              images={product.images ?? []}
              alt={product.name}
              maxImageHeight={380}
              lensSize={200}
              zoomFactor={2.5}
            />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: smaller.md ? '20px' : '24px',
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
              }}
            >
              {product.name}
            </h1>
            {days > 0 && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '12.5px',
                  color: C.muted,
                }}
              >
                Fabrication en {days} jour{days > 1 ? 's' : ''} ouvré
                {days > 1 ? 's' : ''}, puis expédition.
              </p>
            )}
          </div>
          {!smaller.md && pricePanel}
        </div>
      </div>
      <div
        style={{
          flex: '1 1 460px',
          minWidth: '280px',
          padding: 'var(--peg-pad-20)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {!spec.ready && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: C.warn,
              fontSize: '13px',
            }}
          >
            Cette offre n’est pas disponible pour le moment.
          </p>
        )}
        {colorSection}
        {quantitySection}
        {formatSection}
        {markingSection}
        {piecesSection}
        {optionsSection}
        {includedSection}
        {filesSection}
        {smaller.md && pricePanel}
      </div>
      <ProductActionBar
        canGoNext={canAdd}
        onNext={handleAdd}
        label={editing ? 'Mettre à jour' : 'Ajouter au panier'}
        unitPrice={
          shown?.price.unitPriceExclTax ?? shown?.price.totalExclTax ?? 0
        }
        unitLabel={shown?.price.unitPriceExclTax != null ? '/ pièce' : ''}
        total={shown?.price.totalExclTax ?? 0}
        summary={shown?.price.quantityLabel ?? null}
      />
    </div>
  );
};

/** Dépôt d'un visuel pour un emplacement. */
const FileField = ({
  slot,
  label,
  formats,
  file,
  busy,
  onFile,
}: {
  slot: string;
  label: string;
  formats: string[];
  file?: OfferUploadedFile;
  busy: boolean;
  onFile: (f: File | undefined) => void;
}) => {
  const id = `offer-file-${slot.replace(/[^a-z0-9]/gi, '-')}`;
  const wrongFormat = !!file && !fileMatches(file.name, formats);
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1.5px ${file ? 'solid' : 'dashed'} ${file ? 'rgba(74,222,128,0.4)' : C.border}`,
        background: file ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <span
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: file ? 'rgba(74,222,128,0.15)' : C.accentSoft,
          color: file ? C.ok : C.accentText,
          flexShrink: 0,
        }}
      >
        {file ? <HiCheck /> : <HiUpload />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '13.5px',
            fontWeight: 700,
            color: C.text,
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '12px',
            color: C.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {busy
            ? 'Envoi…'
            : wrongFormat
              ? `${file?.name} — format ${formatsLabel(formats)} attendu`
              : file
                ? file.name
                : `Choisir un fichier (${formatsLabel(formats)})`}
        </span>
      </span>
      {file && !busy && (
        <span style={{ fontSize: '12px', color: C.accentText }}>Remplacer</span>
      )}
      <input
        id={id}
        type="file"
        accept={acceptAttr(formats)}
        style={{ display: 'none' }}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </label>
  );
};

export default OfferConfigurator;
