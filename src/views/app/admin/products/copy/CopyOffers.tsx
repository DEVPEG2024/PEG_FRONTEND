/**
 * Copier les offres d'un client vers un autre (demande du 23/10/2026) :
 * reproduire les offres complètes d'un club (ESDL DOUVAINE) pour un nouveau
 * club, renommées, puis changer les photos avant de les publier.
 * Maquette validée : https://claude.ai/artifact/WFycKGDJmm6azj4cSJsSM1
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiArrowRight, HiInformationCircle } from 'react-icons/hi';
import { Container, Loading } from '@/components/shared';
import { Select } from '@/components/ui';
import { Product } from '@/@types/product';
import {
  apiGetClientHiddenOffers,
  apiGetClientOwnOffers,
  apiGetCopyClients,
  CopyClient,
} from '@/services/OfferCopyServices';
import {
  apiCreateProduct,
  CreateProductRequest,
} from '@/services/ProductServices';
import { apiGetPegFiles } from '@/services/FileServices';
import { apiAreProductBadgesAvailable, loadProductBadges } from '@/services/ProductBadgeServices';
import { unwrapData } from '@/utils/serviceHelper';
import { getProductBasePrice } from '@/utils/productHelpers';
import { fmtNum } from '@/utils/priceHelpers';
import {
  buildOfferCopyInput,
  copiesOf,
  countTokenMatches,
  rememberCopy,
  replaceToken,
  suggestNameToken,
} from './offerCopy';
import CopySteps, { buttonStyle, CARD, MUTED } from './CopySteps';
import CopyOffersPhotos from './CopyOffersPhotos';

type Step = 'choose' | 'names' | 'creating' | 'photos';
type Option = { value: string; label: string };

const inputStyle = {
  height: '44px',
  boxSizing: 'border-box' as const,
  padding: '0 14px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: '#0b1626',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  fontSize: '15px',
  fontWeight: 600,
};

const priceLabel = (p: Product) => {
  if (p.pricingMode === 'm2') return `${fmtNum(p.pricePerM2 ?? 0)} € HT le m²`;
  const tiers = [...(p.priceTiers ?? [])].sort(
    (a, b) => a.minQuantity - b.minQuantity
  );
  const first = tiers[0]?.price ?? getProductBasePrice(p);
  const last = tiers[tiers.length - 1]?.price;
  return last !== undefined && last !== first
    ? `${fmtNum(first)} → ${fmtNum(last)} € HT`
    : `${fmtNum(first)} € HT`;
};

const Thumb = ({ product, size }: { product: Product; size: number }) => (
  <span
    style={{
      width: size,
      height: size,
      flex: 'none',
      borderRadius: '10px',
      background: '#fff',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {product.images?.[0]?.url && (
      <img
        src={product.images[0].url}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    )}
  </span>
);

const CopyOffers = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeTo = params.get('to');

  const [step, setStep] = useState<Step>(resumeTo ? 'photos' : 'choose');
  const [clients, setClients] = useState<CopyClient[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState(resumeTo ?? '');
  const [offers, setOffers] = useState<Product[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetHidden, setTargetHidden] = useState(0);
  const [token, setToken] = useState('');
  const [replacement, setReplacement] = useState('');
  const [manualNames, setManualNames] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    failed: [] as string[],
  });
  // Client d'origine des offres cachées montrées à l'étape Photos (connu juste
  // après la copie ; sinon relu dans la mémoire de l'appareil)
  const [photosSource, setPhotosSource] = useState<string | null>(null);

  const source = clients.find((c) => c.documentId === sourceId);
  const target = clients.find((c) => c.documentId === targetId);
  const options: Option[] = useMemo(
    () => clients.map((c) => ({ value: c.documentId, label: c.name })),
    [clients]
  );
  const chosen = offers.filter((o) => selected.has(o.documentId));
  const nameOf = (o: Product) =>
    manualNames[o.documentId] ?? replaceToken(o.name, token, replacement);

  useEffect(() => {
    unwrapData(apiGetCopyClients())
      .then(({ customers_connection }) =>
        setClients(customers_connection?.nodes ?? [])
      )
      .catch(() => toast.error('Impossible de charger la liste des clients'));
  }, []);

  // Offres réservées au client d'origine : les actives sont cochées d'office
  useEffect(() => {
    if (!sourceId) {
      setOffers([]);
      return;
    }
    setOffersLoading(true);
    unwrapData(apiGetClientOwnOffers(sourceId))
      .then(({ products_connection }) => {
        const list = products_connection?.nodes ?? [];
        setOffers(list);
        setSelected(
          new Set(list.filter((o) => o.active).map((o) => o.documentId))
        );
        setManualNames({});
        const name = clients.find((c) => c.documentId === sourceId)?.name ?? '';
        setToken(
          suggestNameToken(
            name,
            list.map((o) => o.name)
          )
        );
      })
      .catch(() => toast.error('Impossible de charger les offres de ce client'))
      .finally(() => setOffersLoading(false));
  }, [sourceId, clients]);

  // Client de destination : nom proposé en remplacement, copies déjà en attente
  useEffect(() => {
    setTargetHidden(0);
    if (!targetId) return;
    const name = clients.find((c) => c.documentId === targetId)?.name ?? '';
    setReplacement(name);
    const copies = copiesOf(targetId);
    if (copies.size === 0) return;
    unwrapData(apiGetClientHiddenOffers(targetId))
      .then(({ products_connection }) =>
        setTargetHidden(
          (products_connection?.nodes ?? []).filter((o) =>
            copies.has(o.documentId)
          ).length
        )
      )
      .catch(() => setTargetHidden(0));
  }, [targetId, clients]);

  const toggle = (id: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Copies créées une par une (le serveur de prod a peu de mémoire) ;
  // une offre en échec n'arrête pas les autres
  const createCopies = async () => {
    setStep('creating');
    const failed: string[] = [];
    const created: string[] = [];
    setProgress({ done: 0, total: chosen.length, failed });
    for (const [i, offer] of chosen.entries()) {
      try {
        const files = await apiGetPegFiles(offer.images ?? []);
        const badges = (await apiAreProductBadgesAvailable())
          ? await loadProductBadges(offer.documentId)
          : null;
        const input = buildOfferCopyInput(
          offer,
          files.map((f) => f.id),
          {
            name: nameOf(offer),
            customerDocumentId: targetId,
            badges,
          }
        );
        const { createProduct } = await unwrapData(
          apiCreateProduct(input as unknown as CreateProductRequest)
        );
        if (!createProduct) throw new Error('Copie refusée par le serveur');
        created.push(createProduct.documentId);
      } catch (err) {
        console.error('[Copie d’offres] Échec :', offer.name, err);
        failed.push(offer.name);
      }
      setProgress({ done: i + 1, total: chosen.length, failed: [...failed] });
    }
    rememberCopy(targetId, sourceId, created);
    setPhotosSource(sourceId);
    if (failed.length) {
      toast.error(
        `${failed.length} offre(s) non copiée(s) : ${failed.join(', ')}`
      );
    } else {
      toast.success(
        `${chosen.length} offres copiées pour ${target?.name ?? 'le client'}, cachées`
      );
    }
    setStep('photos');
  };

  const header = (current: number, title: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ color: MUTED, fontSize: '13px' }}>
        <Link to="/admin/products" style={{ color: MUTED }}>
          Produits
        </Link>{' '}
        / Copier les offres d’un client
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#fff',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <CopySteps current={current} />
      </div>
    </div>
  );

  const pageStyle = {
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '22px',
    paddingTop: '28px',
    paddingBottom: '40px',
  };

  if (step === 'photos') {
    return (
      <Container style={pageStyle}>
        <span style={{ color: MUTED, fontSize: '13px' }}>
          <Link to="/admin/products" style={{ color: MUTED }}>
            Produits
          </Link>{' '}
          / Copier les offres d’un client
        </span>
        {target ? (
          <CopyOffersPhotos target={target} sourceDocumentId={photosSource} />
        ) : (
          <Loading loading={clients.length === 0}>
            <p style={{ color: MUTED }}>Client introuvable.</p>
          </Loading>
        )}
      </Container>
    );
  }

  if (step === 'creating') {
    return (
      <Container style={pageStyle}>
        {header(1, `${source?.name ?? ''} → ${target?.name ?? ''}`)}
        <div
          role="status"
          style={{
            ...CARD,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
            Copie des offres… {progress.done} / {progress.total}
          </span>
          <span
            style={{
              display: 'block',
              height: '10px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                background: '#2f6fed',
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                transition: 'width 0.3s',
              }}
            />
          </span>
        </div>
      </Container>
    );
  }

  if (step === 'names') {
    const matches = countTokenMatches(
      chosen.map((o) => o.name),
      token
    );
    return (
      <Container style={pageStyle}>
        {header(1, `${source?.name} → ${target?.name}`)}

        <div
          style={{
            ...CARD,
            display: 'flex',
            alignItems: 'flex-end',
            gap: '14px',
            padding: '18px 22px',
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Remplacer
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{ ...inputStyle, width: '220px' }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            par
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              style={{
                ...inputStyle,
                width: '260px',
                border: '1px solid #2f6fed',
              }}
            />
          </label>
          <span
            style={{
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              color: MUTED,
              fontSize: '13px',
            }}
          >
            {token.trim()
              ? `trouvé dans ${matches} nom${matches > 1 ? 's' : ''} sur ${chosen.length} · chaque nom reste modifiable ci-dessous`
              : 'Chaque nom reste modifiable ci-dessous'}
          </span>
        </div>

        <div style={{ ...CARD, overflow: 'hidden' }}>
          {chosen.map((o) => {
            const next = nameOf(o);
            const same = next === o.name;
            return (
              // Une ligne sur ordinateur ; repliée sur téléphone (nom, champ, prix)
              <div
                key={o.documentId}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px 14px',
                  padding: '8px 22px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span
                  style={{
                    flex: '1 1 220px',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <Thumb product={o} size={48} />
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.name}
                  </span>
                </span>
                <span
                  style={{
                    flex: '1.2 1 260px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                  }}
                >
                  <input
                    aria-label={`Nouveau nom de ${o.name}`}
                    value={next}
                    onChange={(e) =>
                      setManualNames((m) => ({
                        ...m,
                        [o.documentId]: e.target.value,
                      }))
                    }
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                      height: '40px',
                      fontSize: '14px',
                      border: `1px solid ${same ? 'rgba(255,255,255,0.14)' : 'rgba(74,222,128,0.45)'}`,
                    }}
                  />
                  {same && (
                    <span
                      style={{
                        flex: 'none',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: MUTED,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      inchangé
                    </span>
                  )}
                </span>
                <span
                  style={{
                    flex: '0 0 170px',
                    marginLeft: 'auto',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  {priceLabel(o)}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(47,111,237,0.10)',
            border: '1px solid rgba(47,111,237,0.28)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13.5px',
            lineHeight: 1.5,
          }}
        >
          <HiInformationCircle
            size={20}
            style={{ flex: 'none', color: '#8fb6ff' }}
          />
          <span>
            Recopiés à l’identique : prix et paliers, tailles, couleurs,
            formulaire de personnalisation, checklist. Pas recopié : le BAT de{' '}
            {source?.name} (sa maquette) — l’obligation de BAT est gardée. Les
            copies sont créées <strong>cachées</strong> : {target?.name} ne les
            voit qu’après « Publier ».
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            style={buttonStyle(false)}
            onClick={() => setStep('choose')}
          >
            Retour
          </button>
          <button
            type="button"
            style={buttonStyle(
              true,
              chosen.some((o) => !nameOf(o).trim())
            )}
            disabled={chosen.some((o) => !nameOf(o).trim())}
            onClick={createCopies}
          >
            Créer{' '}
            {chosen.length > 1 ? `les ${chosen.length} copies` : 'la copie'},
            cachée{chosen.length > 1 ? 's' : ''} <HiArrowRight size={16} />
          </button>
        </div>
      </Container>
    );
  }

  // ── Étape 1 : choisir ──
  const canContinue =
    !!sourceId && !!targetId && sourceId !== targetId && chosen.length > 0;
  return (
    <Container style={pageStyle}>
      {header(0, 'Copier les offres d’un client')}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: '16px',
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Copier les offres de
          <Select
            placeholder="Choisir le client modèle…"
            options={options}
            value={options.find((o) => o.value === sourceId) ?? null}
            onChange={(o) => setSourceId((o as Option | null)?.value ?? '')}
          />
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Vers le client
          <Select
            placeholder="Choisir le nouveau client…"
            options={options.filter((o) => o.value !== sourceId)}
            value={options.find((o) => o.value === targetId) ?? null}
            onChange={(o) => setTargetId((o as Option | null)?.value ?? '')}
          />
        </label>
      </div>

      {target && targetHidden > 0 && (
        <div
          style={{
            ...CARD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 20px',
            flexWrap: 'wrap',
            border: '1px solid rgba(251,191,36,0.35)',
          }}
        >
          <span style={{ color: '#fcd34d', fontSize: '14px', fontWeight: 600 }}>
            {target.name} a déjà {targetHidden} copie
            {targetHidden > 1 ? 's' : ''} d’offre cachée
            {targetHidden > 1 ? 's' : ''}, en attente de photos.
          </span>
          <button
            type="button"
            style={buttonStyle(false)}
            onClick={() => {
              setPhotosSource(null);
              setStep('photos');
            }}
          >
            Reprendre les photos
          </button>
        </div>
      )}

      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 22px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
            Offres à copier
            {offers.length > 0 && (
              <span style={{ color: MUTED, fontWeight: 600 }}>
                {' '}
                · {chosen.length} sur {offers.length}
              </span>
            )}
          </span>
          {offers.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelected(
                  chosen.length === offers.length
                    ? new Set()
                    : new Set(offers.map((o) => o.documentId))
                )
              }
              style={{
                minHeight: '36px',
                padding: '0 12px',
                border: 0,
                background: 'transparent',
                color: '#8fb6ff',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {chosen.length === offers.length
                ? 'Tout décocher'
                : 'Tout cocher'}
            </button>
          )}
        </div>
        <Loading loading={offersLoading}>
          {!sourceId ? (
            <p
              style={{
                margin: 0,
                padding: '22px',
                color: MUTED,
                fontSize: '14px',
              }}
            >
              Choisissez le client dont vous voulez reprendre les offres.
            </p>
          ) : offers.length === 0 && !offersLoading ? (
            <p
              style={{
                margin: 0,
                padding: '22px',
                color: MUTED,
                fontSize: '14px',
              }}
            >
              {source?.name} n’a aucune offre réservée.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(min(420px, 100%), 1fr))',
                columnGap: '8px',
                padding: '8px 14px',
              }}
            >
              {offers.map((o) => (
                <label
                  key={o.documentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(o.documentId)}
                    onChange={() => toggle(o.documentId)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#2f6fed',
                    }}
                  />
                  <Thumb product={o} size={56} />
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: '14.5px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.name}
                    </span>
                    <span style={{ color: MUTED, fontSize: '12.5px' }}>
                      {o.productCategory?.name ?? 'Sans catégorie'}
                      {!o.active && ' · inactive'}
                    </span>
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {priceLabel(o)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Loading>
        <p
          style={{
            margin: 0,
            padding: '14px 22px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            color: MUTED,
            fontSize: '13px',
          }}
        >
          Seules les offres réservées au client sont proposées. Les offres de
          secteur ne se copient pas : un client du même secteur les voit déjà.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          style={buttonStyle(false)}
          onClick={() => navigate('/admin/products')}
        >
          Annuler
        </button>
        <button
          type="button"
          style={buttonStyle(true, !canContinue)}
          disabled={!canContinue}
          onClick={() => setStep('names')}
        >
          Suivant : les noms <HiArrowRight size={16} />
        </button>
      </div>
    </Container>
  );
};

export default CopyOffers;
