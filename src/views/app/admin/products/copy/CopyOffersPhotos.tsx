/**
 * Étape 3 — photos des offres CACHÉES d'un client, puis « Publier ».
 * Rouvrable plus tard (/admin/products/copy-offers?to=<client>) : l'état de
 * chaque photo se déduit des fichiers (voir copyOffers.photoStatus).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiExclamation } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import { Loading } from '@/components/shared';
import WatermarkModal from '@/components/ui/Upload/WatermarkModal';
import {
  apiGetClientHiddenOffers,
  apiGetClientOwnOffers,
  CopyClient,
} from '@/services/OfferCopyServices';
import { apiUpdateProduct } from '@/services/ProductServices';
import { apiGetPegFiles, apiUploadFile } from '@/services/FileServices';
import { unwrapData } from '@/utils/serviceHelper';
import { buildPegOrigName, parsePegOrigRef } from '@/utils/pegOrigRef';
import {
  copiesOf,
  copySourceOf,
  forgetCopy,
  keptKey,
  keptPhotosOf,
  offerIsReady,
  photoStatus,
  PhotoStatus,
  setPhotoKept,
} from './offerCopy';
import CopySteps, { buttonStyle, CARD, MUTED } from './CopySteps';

const STATUS_CHIP: Record<
  PhotoStatus,
  { label: string; bg: string; fg: string } | null
> = {
  todo: {
    label: 'Logo du client d’origine',
    bg: 'rgba(251,191,36,0.16)',
    fg: '#fcd34d',
  },
  done: { label: 'Changée', bg: 'rgba(74,222,128,0.16)', fg: '#86efac' },
  kept: {
    label: 'Gardée',
    bg: 'rgba(255,255,255,0.10)',
    fg: 'rgba(255,255,255,0.8)',
  },
  unknown: null,
};

type Props = {
  target: CopyClient;
  /** Client d'origine des copies ; sinon relu dans la mémoire de cet appareil */
  sourceDocumentId?: string | null;
};

type Busy = { productId: string; label: string } | null;

const CopyOffersPhotos = ({ target, sourceDocumentId }: Props) => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceImages, setSourceImages] = useState<Set<string> | null>(null);
  const [kept, setKept] = useState<Set<string>>(() =>
    keptPhotosOf(target.documentId)
  );
  const [selectedPhoto, setSelectedPhoto] = useState<Record<string, number>>(
    {}
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [publishing, setPublishing] = useState(false);
  const [stamping, setStamping] = useState<{
    offer: Product;
    index: number;
    file: File;
  } | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ offer: Product; index: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { products_connection } = await unwrapData(
        apiGetClientHiddenOffers(target.documentId)
      );
      // Seulement les copies : les autres offres inactives du client ont pu
      // être désactivées exprès, « Publier » ne doit pas les réactiver
      const copies = copiesOf(target.documentId);
      setOffers(
        (products_connection?.nodes ?? []).filter((o) =>
          copies.has(o.documentId)
        )
      );
      const from = sourceDocumentId || copySourceOf(target.documentId);
      if (from) {
        const source = await unwrapData(apiGetClientOwnOffers(from));
        setSourceImages(
          new Set(
            (source.products_connection?.nodes ?? []).flatMap((p) =>
              (p.images ?? []).map((i) => i.documentId)
            )
          )
        );
      }
    } catch (err) {
      console.error('[Copie d’offres] Chargement des offres cachées :', err);
      toast.error('Impossible de charger les offres cachées de ce client');
    } finally {
      setLoading(false);
    }
  }, [target.documentId, sourceDocumentId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusesOf = useCallback(
    (offer: Product) =>
      (offer.images ?? []).map((img) =>
        photoStatus(img.documentId, sourceImages, kept, offer.documentId)
      ),
    [sourceImages, kept]
  );

  const readyCount = useMemo(
    () => offers.filter((o) => offerIsReady(statusesOf(o))).length,
    [offers, statusesOf]
  );
  const todoPhotos = useMemo(
    () =>
      offers.reduce(
        (n, o) => n + statusesOf(o).filter((s) => s === 'todo').length,
        0
      ),
    [offers, statusesOf]
  );

  // Remplace la photo n° `index` de l'offre par un nouveau fichier (envoyé ici)
  const replacePhoto = async (
    offer: Product,
    index: number,
    file: File,
    label: string
  ) => {
    setBusy({ productId: offer.documentId, label });
    try {
      const uploaded = await apiUploadFile(file);
      // Média Strapi : l'écriture attend les ids numériques
      const current = await apiGetPegFiles(offer.images ?? []);
      const idByDoc = new Map(current.map((f) => [f.documentId, f.id]));
      const ids = (offer.images ?? [])
        .map((img, i) =>
          i === index ? uploaded.id : idByDoc.get(img.documentId)
        )
        .filter((id): id is string => id !== undefined && id !== null);
      await unwrapData(
        apiUpdateProduct({
          documentId: offer.documentId,
          images: ids as unknown as PegFile[],
        })
      );
      setOffers((list) =>
        list.map((o) =>
          o.documentId !== offer.documentId
            ? o
            : {
                ...o,
                images: (o.images ?? []).map((img, i) =>
                  i === index ? uploaded : img
                ),
              }
        )
      );
    } catch (err) {
      console.error('[Copie d’offres] Remplacement de photo :', err);
      toast.error('La photo n’a pas pu être enregistrée');
    } finally {
      setBusy(null);
    }
  };

  const pickFile = (offer: Product, index: number) => {
    uploadTarget.current = { offer, index };
    uploadInput.current?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetPhoto = uploadTarget.current;
    e.target.value = '';
    if (!file || !targetPhoto) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choisissez une image (JPG, PNG ou WebP)');
      return;
    }
    replacePhoto(
      targetPhoto.offer,
      targetPhoto.index,
      file,
      'Envoi de la photo…'
    );
  };

  const openStamp = (offer: Product, index: number) => {
    const img = offer.images?.[index];
    if (!img?.url) return;
    // Fichier vide + previewUrl : l'outil logo relit l'image depuis le stockage
    const file = new File([], img.name || 'photo.png') as File & {
      previewUrl?: string;
    };
    file.previewUrl = img.url;
    setStamping({ offer, index, file });
  };

  const onStamped = (stamped: File) => {
    if (!stamping) return;
    const { offer, index } = stamping;
    const original = offer.images?.[index] as PegFile | undefined;
    setStamping(null);
    // Même marqueur que la fiche produit : « Remettre l'image d'origine » reste possible
    const ref =
      parsePegOrigRef(original?.name) ??
      (original?.id && original.documentId
        ? { id: String(original.id), documentId: original.documentId }
        : null);
    const named = ref
      ? new File([stamped], buildPegOrigName(stamped.name, ref), {
          type: stamped.type,
        })
      : stamped;
    replacePhoto(offer, index, named, 'Logo posé, enregistrement…');
  };

  const toggleKept = (offer: Product, index: number) => {
    const img = offer.images?.[index];
    if (!img) return;
    const key = keptKey(offer.documentId, img.documentId);
    const next = !kept.has(key);
    setPhotoKept(target.documentId, key, next);
    setKept((set) => {
      const copy = new Set(set);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
  };

  const publish = async () => {
    setPublishing(true);
    let published = 0;
    for (const offer of offers) {
      try {
        await unwrapData(
          apiUpdateProduct({ documentId: offer.documentId, active: true })
        );
        published += 1;
      } catch (err) {
        console.error('[Copie d’offres] Publication :', offer.name, err);
      }
    }
    setPublishing(false);
    if (published === offers.length) {
      forgetCopy(target.documentId);
      toast.success(
        `${published} offre${published > 1 ? 's' : ''} publiée${published > 1 ? 's' : ''} pour ${target.name}`
      );
      navigate('/admin/products');
    } else {
      toast.error(
        `${offers.length - published} offre(s) n’ont pas pu être publiées, réessayez`
      );
      load();
    }
  };

  const later = () => {
    toast.info(
      'Les copies restent cachées. Reprenez depuis la liste des clients (« offres à publier »).'
    );
    navigate('/admin/customers');
  };

  return (
    <>
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
          Photos des offres de {target.name}
        </h2>
        <CopySteps current={2} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            ...CARD,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
          }}
        >
          {target.logo?.url ? (
            <img
              src={target.logo.url}
              alt=""
              style={{
                width: '56px',
                height: '56px',
                flex: 'none',
                borderRadius: '999px',
                background: '#fff',
                objectFit: 'contain',
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: '56px',
                height: '56px',
                flex: 'none',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              {target.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span
            style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}
          >
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
              Logo de {target.name}
            </span>
            <span style={{ color: MUTED, fontSize: '13px' }}>
              {target.logo?.url
                ? 'Proposé d’office par « Poser le logo du club »'
                : 'Aucun logo dans la fiche du client : vous le choisirez dans l’outil logo'}
            </span>
          </span>
        </div>
        <div
          style={{
            ...CARD,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '10px',
            padding: '16px 20px',
          }}
        >
          <span
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            {readyCount} offre{readyCount > 1 ? 's' : ''} prête
            {readyCount > 1 ? 's' : ''} sur {offers.length}
            <span style={{ color: MUTED, fontSize: '13px', fontWeight: 600 }}>
              copies cachées au client
            </span>
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
                borderRadius: '999px',
                background: '#4ade80',
                width: `${offers.length ? (readyCount / offers.length) * 100 : 0}%`,
                transition: 'width 0.3s',
              }}
            />
          </span>
        </div>
      </div>

      <Loading loading={loading}>
        {!loading && offers.length === 0 ? (
          <div
            style={{ ...CARD, padding: '28px', color: MUTED, fontSize: '14px' }}
          >
            Aucune copie en attente pour {target.name} sur cet appareil. Une
            copie faite ailleurs reste dans Produits, marquée « Inactif » :
            activez-la depuis la liste.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
              gap: '16px',
            }}
          >
            {offers.map((offer) => {
              const statuses = statusesOf(offer);
              const index = Math.min(
                selectedPhoto[offer.documentId] ?? 0,
                Math.max(0, (offer.images?.length ?? 1) - 1)
              );
              const photo = offer.images?.[index];
              const status = statuses[index];
              const chip = status ? STATUS_CHIP[status] : null;
              const ready = offerIsReady(statuses);
              const isBusy = busy?.productId === offer.documentId;
              return (
                <div
                  key={offer.documentId}
                  style={{
                    ...CARD,
                    display: 'flex',
                    gap: '14px',
                    padding: '14px',
                    border: `1px solid ${ready ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      flex: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '14px',
                        background: '#fff',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {photo?.url ? (
                        <img
                          src={photo.url}
                          alt={offer.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          Sans photo
                        </span>
                      )}
                    </div>
                    {(offer.images?.length ?? 0) > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                          maxWidth: '140px',
                        }}
                      >
                        {offer.images.map((img, i) => (
                          <button
                            key={img.documentId + i}
                            type="button"
                            aria-label={`Photo ${i + 1}`}
                            aria-pressed={i === index}
                            onClick={() =>
                              setSelectedPhoto((s) => ({
                                ...s,
                                [offer.documentId]: i,
                              }))
                            }
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#fff',
                              cursor: 'pointer',
                              border: `2px solid ${i === index ? '#2f6fed' : statuses[i] === 'todo' ? '#fbbf24' : 'transparent'}`,
                            }}
                          >
                            <img
                              src={img.url}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {offer.name}
                    </span>
                    {chip && (
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: chip.bg,
                          color: chip.fg,
                        }}
                      >
                        {(offer.images?.length ?? 0) > 1
                          ? `Photo ${index + 1} · `
                          : ''}
                        {chip.label}
                      </span>
                    )}
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {isBusy ? (
                        <span
                          style={{
                            color: MUTED,
                            fontSize: '13px',
                            padding: '12px 0',
                          }}
                        >
                          {busy?.label}
                        </span>
                      ) : photo ? (
                        <>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle(false),
                              justifyContent: 'flex-start',
                              fontSize: '13px',
                            }}
                            onClick={() => pickFile(offer, index)}
                          >
                            Déposer une photo
                          </button>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle(false),
                              justifyContent: 'flex-start',
                              fontSize: '13px',
                            }}
                            onClick={() => openStamp(offer, index)}
                          >
                            Poser le logo du club
                          </button>
                          <button
                            type="button"
                            aria-pressed={status === 'kept'}
                            style={{
                              ...buttonStyle(false),
                              justifyContent: 'flex-start',
                              fontSize: '13px',
                              ...(status === 'kept'
                                ? {
                                    background: 'rgba(74,222,128,0.16)',
                                    border: '1px solid rgba(74,222,128,0.5)',
                                  }
                                : {}),
                            }}
                            onClick={() => toggleKept(offer, index)}
                          >
                            {status === 'kept'
                              ? 'Gardée telle quelle'
                              : 'Garder cette photo'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Loading>

      <input
        ref={uploadInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={onFilePicked}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: todoPhotos ? '#fcd34d' : MUTED,
            fontSize: '14px',
          }}
        >
          {todoPhotos > 0 && <HiExclamation size={18} />}
          {todoPhotos > 0
            ? `${todoPhotos} photo${todoPhotos > 1 ? 's montrent' : ' montre'} encore le logo du client d’origine`
            : sourceImages
              ? 'Toutes les photos sont prêtes'
              : 'Vérifiez les photos avant de publier'}
        </span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={buttonStyle(false)}
            onClick={later}
            disabled={publishing}
          >
            Terminer plus tard
          </button>
          <button
            type="button"
            style={buttonStyle(
              true,
              publishing || offers.length === 0 || !!busy
            )}
            disabled={publishing || offers.length === 0 || !!busy}
            onClick={publish}
          >
            {publishing
              ? 'Publication…'
              : todoPhotos > 0
                ? 'Publier quand même'
                : `Publier pour ${target.name}`}
          </button>
        </div>
      </div>

      {stamping && (
        <WatermarkModal
          file={stamping.file}
          initialLogoUrl={target.logo?.url}
          onApply={onStamped}
          onClose={() => setStamping(null)}
        />
      )}
    </>
  );
};

export default CopyOffersPhotos;
