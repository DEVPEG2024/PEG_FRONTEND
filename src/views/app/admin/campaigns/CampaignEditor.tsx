import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiArrowLeft, HiOutlineBell, HiOutlineTrash, HiOutlineClock, HiOutlineMail, HiOutlinePaperAirplane, HiOutlineSave, HiOutlineBeaker, HiOutlineViewGridAdd } from 'react-icons/hi';
import type { AudienceDirectory, AudiencePreview, Campaign, CampaignInput } from '@/@types/campaign';
import {
  apiCreateCampaign,
  apiDeleteCampaign,
  apiGetAudienceDirectory,
  apiGetCampaign,
  apiPreviewAudience,
  apiSendCampaign,
  apiSendCampaignTest,
  apiUnscheduleCampaign,
  apiUpdateCampaign,
} from '@/services/CampaignServices';
import { CAMPAIGN_TAGS, CTA_PRESETS, CtaMode, deleteConfirmText, LIMITS, TAG_META, categoryLink, ctaTargetOf, emptyCampaign, fmtDateTime, fmtInt, fromLocalInput, isSafeCtaUrl, productLink, toLocalInput } from '@/utils/campaignFormat';
import AudiencePicker from './components/AudiencePicker';
import { CategoryPicker, ProductPicker } from './components/CtaTargetPicker';
import ImagesField from './components/ImagesField';
import PopupTiming from './components/PopupTiming';
import PreviewPanel from './components/PreviewPanel';
import useResponsive from '@/utils/hooks/useResponsive';
import { PANEL, StatusBadge, Toggle, btn, chip, errorMessage, hintStyle, inputStyle, isBackendMissing, labelStyle } from './ui';

/**
 * Éditeur de campagne : contenu (type, titre, message, photos, bouton), ciblage,
 * canaux et programmation, avec aperçu en direct. Création : /admin/campaigns/new ;
 * modification (brouillon ou programmée) : /admin/campaigns/:id/edit.
 */

const Section = ({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section style={{ ...PANEL, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(96,165,250,0.15)', color: '#93c5fd', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>{title}</h3>
      {aside && <div style={{ marginLeft: 'auto' }}>{aside}</div>}
    </div>
    {children}
  </section>
);

const Field = ({ label, counter, children, hint }: { label: string; counter?: string; children: React.ReactNode; hint?: React.ReactNode }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={labelStyle}>{label}</span>
      {counter && <span style={{ ...hintStyle, fontSize: '11px' }}>{counter}</span>}
    </span>
    {children}
    {hint && <span style={hintStyle}>{hint}</span>}
  </label>
);

const ChannelRow = ({ icon, title, text, on, onChange, locked, disabled }: {
  icon: React.ReactNode; title: string; text: string; on: boolean; onChange?: (v: boolean) => void; locked?: boolean; disabled?: boolean;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <span style={{ color: on ? '#60a5fa' : 'rgba(255,255,255,0.35)', flexShrink: 0, display: 'flex' }}>{icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{title}</div>
      <div style={hintStyle}>{text}</div>
    </div>
    <Toggle on={on} onChange={(v) => onChange?.(v)} disabled={locked || disabled} label={title} />
  </div>
);

/** Vérifications avant l'envoi (le serveur refait les mêmes). */
const sendProblems = (form: CampaignInput, preview: AudiencePreview | null, later: boolean, sendAt: string) => {
  const out: string[] = [];
  if (!form.title.trim()) out.push('Ajoutez un titre.');
  if (!form.message.trim() && form.images.length === 0) out.push('Ajoutez un message ou une photo.');
  if (form.ctaLabel && !form.ctaUrl) out.push('Choisissez la destination du bouton (page, produit, catégorie ou lien) ou retirez-le.');
  if (!form.ctaLabel && form.ctaUrl) out.push('Donnez un libellé au bouton ou retirez-le.');
  if (form.ctaUrl && !isSafeCtaUrl(form.ctaUrl)) out.push('Le lien du bouton doit être un chemin de l’espace client (/…) ou une adresse https://.');
  if (form.audience.type === 'selection' && form.audience.customers.length === 0) out.push('Sélectionnez au moins un client.');
  if (preview && preview.users === 0) out.push('Aucun destinataire ne correspond à ce ciblage.');
  if (later) {
    const at = fromLocalInput(sendAt);
    if (!at) out.push('Choisissez la date d’envoi.');
    else if (new Date(at).getTime() < Date.now() + 2 * 60_000) out.push('La date d’envoi doit être dans le futur.');
  }
  if (form.expiresAt) {
    const ref = later && fromLocalInput(sendAt) ? new Date(fromLocalInput(sendAt) as string).getTime() : Date.now();
    if (new Date(form.expiresAt).getTime() <= ref) out.push('La date de retrait doit être postérieure à l’envoi.');
  }
  return out;
};

const CampaignEditor = () => {
  const { id: idParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignInput>(emptyCampaign());
  const [loading, setLoading] = useState(!!idParam);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | 'send' | null>(null);
  const [directory, setDirectory] = useState<AudienceDirectory | null>(null);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [later, setLater] = useState(false);
  const [sendAt, setSendAt] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [missing, setMissing] = useState(false);
  // Destination choisie dans la liste ; null = déduite du lien enregistré.
  const [ctaMode, setCtaMode] = useState<CtaMode | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // Téléphone : barre d'actions sur une ligne, libellés courts.
  const compact = useResponsive().smaller.sm;

  const update = useCallback((patch: Partial<CampaignInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }, []);

  // Chargement de la campagne (modification)
  useEffect(() => {
    if (!idParam) { titleRef.current?.focus(); return; }
    const id = Number(idParam);
    apiGetCampaign(id)
      .then((res) => {
        const c = res.data.campaign;
        if (c.status === 'sent' || c.status === 'sending') {
          navigate(`/admin/campaigns/${c.id}`, { replace: true });
          return;
        }
        setCampaign(c);
        setCtaMode(null);
        setForm({
          title: c.title, message: c.message, tag: c.tag, images: c.images, ctaLabel: c.ctaLabel, ctaUrl: c.ctaUrl,
          channelPopup: c.channelPopup, channelEmail: c.channelEmail, audience: c.audience, expiresAt: c.expiresAt,
          popupDelay: c.popupDelay ?? 0, popupDuration: c.popupDuration ?? null, popupDays: c.popupDays ?? null,
          popupAnimation: c.popupAnimation ?? 'zoom',
        });
        if (c.status === 'scheduled' && c.sendAt) { setLater(true); setSendAt(toLocalInput(c.sendAt)); }
      })
      .catch((e) => {
        if (isBackendMissing(e)) setMissing(true);
        else { toast.error(errorMessage(e, 'Campagne introuvable')); navigate('/admin/campaigns', { replace: true }); }
      })
      .finally(() => setLoading(false));
  }, [idParam, navigate]);

  useEffect(() => {
    apiGetAudienceDirectory()
      .then((res) => setDirectory(res.data))
      .catch((e) => { if (isBackendMissing(e)) setMissing(true); });
  }, []);

  // Compteur de destinataires (serveur), recalculé après une pause.
  const audienceKey = JSON.stringify(form.audience);
  useEffect(() => {
    if (missing) return;
    setPreviewLoading(true);
    const t = setTimeout(() => {
      apiPreviewAudience(form.audience)
        .then((res) => setPreview(res.data.audience))
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(t);
    // Dépendance volontaire sur la forme sérialisée : l'objet change à chaque frappe.
  }, [audienceKey, missing]);

  // Modifications non enregistrées : avertissement à la fermeture de l'onglet.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /** Enregistre (création ou mise à jour) et renvoie la campagne à jour. */
  const save = async (): Promise<Campaign | null> => {
    if (!form.title.trim()) {
      toast.error('Ajoutez un titre avant d’enregistrer.');
      titleRef.current?.focus();
      return null;
    }
    try {
      const res = campaign ? await apiUpdateCampaign(campaign.id, form) : await apiCreateCampaign(form);
      const saved = res.data.campaign;
      setCampaign(saved);
      setDirty(false);
      if (!campaign) navigate(`/admin/campaigns/${saved.id}/edit`, { replace: true });
      return saved;
    } catch (e: any) {
      toast.error(errorMessage(e, 'Enregistrement impossible'));
      return null;
    }
  };

  const onSave = async () => {
    setBusy('save');
    const saved = await save();
    setBusy(null);
    if (saved) toast.success('Brouillon enregistré');
  };

  const onTest = async () => {
    setBusy('test');
    try {
      const saved = await save();
      if (!saved) return;
      const res = await apiSendCampaignTest(saved.id);
      const t = res.data.test;
      const parts = [t.bell ? 'cloche ✓' : 'cloche ✗ (backend notifications injoignable)'];
      if (t.email === 'sent') parts.push(`e-mail envoyé à ${t.to}`);
      if (t.email === 'failed') parts.push(`e-mail en échec${t.emailError ? ` : ${t.emailError}` : ''}`);
      if (t.email === 'noemail') parts.push('pas d’adresse e-mail sur votre compte');
      toast[t.bell && t.email !== 'failed' ? 'success' : 'warning'](`Test envoyé — ${parts.join(', ')}`);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Test impossible'));
    } finally {
      setBusy(null);
    }
  };

  const problems = useMemo(() => sendProblems(form, preview, later, sendAt), [form, preview, later, sendAt]);

  const onAskSend = () => {
    if (problems.length) { toast.error(problems[0]); return; }
    setConfirm(true);
  };

  const onSend = async () => {
    setBusy('send');
    try {
      const saved = await save();
      if (!saved) return;
      const res = await apiSendCampaign(saved.id, later ? fromLocalInput(sendAt) : null);
      setConfirm(false);
      if (res.data.scheduled) {
        toast.success(`Campagne programmée pour le ${fmtDateTime(res.data.campaign.sendAt)}`);
        navigate('/admin/campaigns');
      } else {
        toast.success(`Envoi lancé vers ${fmtInt(res.data.recipients)} destinataire(s)`);
        navigate(`/admin/campaigns/${saved.id}`);
      }
    } catch (e: any) {
      toast.error(errorMessage(e, 'Envoi impossible'));
    } finally {
      setBusy(null);
    }
  };

  const onUnschedule = async () => {
    if (!campaign) return;
    try {
      const res = await apiUnscheduleCampaign(campaign.id);
      setCampaign(res.data.campaign);
      setLater(false);
      toast.success('Programmation annulée : la campagne est revenue en brouillon');
    } catch (e: any) {
      toast.error(errorMessage(e, 'Action impossible'));
    }
  };

  if (loading) return <div style={{ padding: '24px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>;

  const target = ctaTargetOf(form.ctaUrl);
  const mode: CtaMode = ctaMode ?? (target.mode === 'none' ? 'preset' : target.mode);
  const selectValue = mode === 'preset' ? form.ctaUrl : mode;
  const hasCta = !!(form.ctaLabel || form.ctaUrl);
  const onDestination = (value: string) => {
    if (value === 'product' || value === 'category') { setCtaMode(value); update({ ctaUrl: '' }); return; }
    if (value === 'custom') { setCtaMode('custom'); update({ ctaUrl: 'https://' }); return; }
    setCtaMode('preset');
    update({ ctaUrl: value });
  };
  const generic = (label: string) => !label || label === 'Découvrir';
  const channels = ['cloche + push', form.channelPopup && 'pop-up', form.channelEmail && 'e-mail'].filter(Boolean).join(' + ');
  const sandbox = !!directory?.sandbox;

  return (
    <div style={{ padding: '24px 16px 0', maxWidth: '1240px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Link to="/admin/campaigns" style={{ ...btn('rgba(255,255,255,0.7)'), padding: '7px 10px' }} aria-label="Retour aux campagnes">
          <HiArrowLeft size={16} />
        </Link>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{campaign ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
        {campaign && <StatusBadge status={campaign.status} />}
        {campaign?.status === 'scheduled' && (
          <span style={{ ...hintStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlineClock size={14} /> envoi prévu le {fmtDateTime(campaign.sendAt)}
            <button type="button" style={{ ...btn('#fbbf24'), padding: '4px 10px', fontSize: '12px' }} onClick={onUnschedule}>Déprogrammer</button>
          </span>
        )}
        {dirty && <span style={{ ...hintStyle, marginLeft: 'auto' }}>Modifications non enregistrées</span>}
        {campaign && (
          <button
            type="button"
            style={{ ...btn('#f87171'), padding: '6px 10px', fontSize: '12px', marginLeft: dirty ? undefined : 'auto' }}
            disabled={!!busy}
            onClick={async () => {
              if (!window.confirm(deleteConfirmText([campaign]))) return;
              try {
                await apiDeleteCampaign(campaign.id);
                setDirty(false);
                toast.success('Campagne supprimée');
                navigate('/admin/campaigns', { replace: true });
              } catch (e: any) {
                toast.error(errorMessage(e, 'Suppression impossible'));
              }
            }}
          >
            <HiOutlineTrash size={14} /> Supprimer
          </button>
        )}
      </div>

      {missing && (
        <div style={{ ...PANEL, padding: '14px 16px', color: '#fca5a5', fontSize: '13px' }}>
          Module indisponible : le serveur (Strapi) n’a pas encore été déployé avec les campagnes.
        </div>
      )}
      {sandbox && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fde68a', fontSize: '13px', borderColor: 'rgba(251,191,36,0.3)' }}>
          Environnement de test : l’envoi ne notifiera aucun client (ni cloche, ni e-mail). Utilisez « M’envoyer un test » pour vérifier le rendu.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* ── Formulaire ── */}
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Section n={1} title="Message">
            <div>
              <div style={{ ...labelStyle, marginBottom: '6px' }}>Type</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CAMPAIGN_TAGS.map((t) => (
                  <button key={t} type="button" style={chip(form.tag === t, TAG_META[t].color)} onClick={() => update({ tag: t })}>
                    <span aria-hidden>{TAG_META[t].emoji}</span> {TAG_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Titre" counter={`${form.title.length} / ${LIMITS.title}`}>
              <input
                ref={titleRef}
                value={form.title}
                maxLength={LIMITS.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Ex. : Nouvelle collection textile personnalisé"
                style={inputStyle}
              />
            </Field>

            <Field
              label="Message"
              counter={`${form.message.length} / ${LIMITS.message}`}
              hint={<>Une ligne vide sépare les paragraphes. <strong style={{ color: 'rgba(255,255,255,0.7)' }}>**texte**</strong> pour mettre en gras ; les adresses https:// deviennent des liens.</>}
            >
              <textarea
                value={form.message}
                maxLength={LIMITS.message}
                onChange={(e) => update({ message: e.target.value })}
                rows={7}
                placeholder="Bonjour, découvrez…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, minHeight: '140px' }}
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={labelStyle}>Photos</span>
              <ImagesField images={form.images} onChange={(images) => update({ images })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Toggle on={hasCta} label="Bouton d’action" onChange={(v) => { setCtaMode(null); update(v ? { ctaLabel: 'Découvrir', ctaUrl: '/customer/catalogue' } : { ctaLabel: '', ctaUrl: '' }); }} />
                <div>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Bouton d’action</div>
                  <div style={hintStyle}>Mène le client vers un produit, une catégorie, une page de son espace ou un lien externe — ses clics sont comptés.</div>
                </div>
              </div>
              {hasCta && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <Field label="Libellé" counter={`${form.ctaLabel.length} / ${LIMITS.ctaLabel}`}>
                    <input value={form.ctaLabel} maxLength={LIMITS.ctaLabel} onChange={(e) => update({ ctaLabel: e.target.value })} placeholder="Découvrir" style={inputStyle} />
                  </Field>
                  <Field label="Destination">
                    <select
                      value={selectValue}
                      onChange={(e) => onDestination(e.target.value)}
                      style={{ ...inputStyle, appearance: 'auto' }}
                    >
                      <option value="product" style={{ color: '#000' }}>Un produit…</option>
                      <option value="category" style={{ color: '#000' }}>Une catégorie du catalogue…</option>
                      <optgroup label="Pages de l’espace client">
                        {CTA_PRESETS.map((p) => <option key={p.url} value={p.url} style={{ color: '#000' }}>{p.label}</option>)}
                      </optgroup>
                      <option value="custom" style={{ color: '#000' }}>Autre lien…</option>
                    </select>
                  </Field>
                  {mode === 'product' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <ProductPicker
                        selectedId={target.mode === 'product' ? target.id : null}
                        onPick={(p) => update({ ctaUrl: productLink(p.documentId), ctaLabel: generic(form.ctaLabel) ? 'Voir le produit' : form.ctaLabel })}
                        hasPhoto={(url) => form.images.some((i) => i.url === url)}
                        onUsePhoto={form.images.length < LIMITS.images
                          ? (p) => p.imageUrl && update({ images: [...form.images, { id: null, url: p.imageUrl, width: null, height: null, name: p.name }] })
                          : null}
                      />
                    </div>
                  )}
                  {mode === 'category' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <CategoryPicker
                        selectedId={target.mode === 'category' ? target.id : null}
                        onPick={(c) => update({ ctaUrl: categoryLink(c.documentId), ctaLabel: form.ctaLabel || 'Découvrir' })}
                      />
                    </div>
                  )}
                  {mode === 'custom' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field label="Lien" hint={form.ctaUrl && !isSafeCtaUrl(form.ctaUrl) ? <span style={{ color: '#fca5a5' }}>Chemin interne (/customer/…) ou adresse https:// uniquement.</span> : 'Chemin de l’espace client (/customer/…) ou adresse https://'}>
                        <input value={form.ctaUrl} onChange={(e) => update({ ctaUrl: e.target.value.trim() })} placeholder="https://" style={inputStyle} />
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section n={2} title="Destinataires">
            <AudiencePicker
              audience={form.audience}
              onChange={(audience) => update({ audience })}
              directory={directory}
              preview={preview}
              previewLoading={previewLoading}
              channelEmail={form.channelEmail}
            />
          </Section>

          <Section n={3} title="Diffusion">
            <ChannelRow icon={<HiOutlineBell size={20} />} title="Cloche et notification push" text="Toujours active : son, pastille, notification du téléphone ou du navigateur." on locked />
            <ChannelRow
              icon={<HiOutlineViewGridAdd size={20} />}
              title="Pop-up à la prochaine visite"
              text="Une fois par client, une pop-up par visite au plus, jamais pendant un paiement."
              on={form.channelPopup}
              onChange={(v) => update({ channelPopup: v })}
            />
            {form.channelPopup && (
              <PopupTiming
                delay={form.popupDelay}
                duration={form.popupDuration}
                days={form.popupDays}
                animation={form.popupAnimation}
                onChange={(patch) => update(patch)}
              />
            )}
            <ChannelRow
              icon={<HiOutlineMail size={20} />}
              title="E-mail"
              text={directory && !directory.emailConfigured ? 'Envoi d’e-mails non configuré sur ce serveur.' : 'Avec lien de désinscription ; les désinscrits sont exclus automatiquement.'}
              on={form.channelEmail}
              onChange={(v) => update({ channelEmail: v })}
              disabled={!!directory && !directory.emailConfigured}
            />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={labelStyle}>Envoi</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" style={chip(!later)} onClick={() => setLater(false)}>Dès maintenant</button>
                <button type="button" style={chip(later, '#fbbf24')} onClick={() => { setLater(true); if (!sendAt) setSendAt(toLocalInput(new Date(Date.now() + 3600_000).toISOString())); }}>
                  <HiOutlineClock size={13} /> Programmer
                </button>
              </div>
              {later && (
                <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} min={toLocalInput(new Date().toISOString())} style={{ ...inputStyle, maxWidth: '260px', colorScheme: 'dark' }} aria-label="Date d’envoi" />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Toggle
                  on={!!form.expiresAt}
                  label="Retrait automatique"
                  onChange={(v) => update({ expiresAt: v ? new Date(Date.now() + 14 * 86_400_000).toISOString() : null })}
                />
                <div>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Retrait automatique</div>
                  <div style={hintStyle}>Après cette date, la pop-up et l’actualité disparaissent (promotion limitée…).</div>
                </div>
              </div>
              {form.expiresAt && (
                <input type="datetime-local" value={toLocalInput(form.expiresAt)} onChange={(e) => update({ expiresAt: fromLocalInput(e.target.value) })} style={{ ...inputStyle, maxWidth: '260px', colorScheme: 'dark' }} aria-label="Date de retrait" />
              )}
            </div>
          </Section>
        </div>

        {/* ── Aperçu ── */}
        <aside style={{ flex: '1 1 340px', maxWidth: '100%', minWidth: 0, position: 'sticky', top: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={labelStyle}>Aperçu</span>
          <PreviewPanel form={form} />
        </aside>
      </div>

      {/* ── Actions (collées en bas) ── */}
      <div
        style={{
          position: 'sticky', bottom: 'calc(var(--peg-dock-lift, 0px) + env(safe-area-inset-bottom, 0px))', zIndex: 5,
          // À droite : place du bouton flottant « retour en haut » (ScrollToTop).
          margin: '0 -16px', padding: compact ? '10px 68px 10px 12px' : '12px 76px 12px 16px', background: 'rgba(11,18,32,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: compact ? '6px' : '8px', flexWrap: compact ? 'nowrap' : 'wrap', alignItems: 'center',
        }}
      >
        {!compact && (
          <span style={{ ...hintStyle, flex: '1 1 220px', minWidth: 0 }}>
            {preview ? `${fmtInt(preview.users)} destinataire${preview.users > 1 ? 's' : ''} · ${channels}` : channels}
          </span>
        )}
        <button type="button" style={{ ...btn('rgba(255,255,255,0.75)'), ...(compact ? { flex: 1, padding: '9px 6px' } : {}) }} onClick={onSave} disabled={!!busy || missing}>
          <HiOutlineSave size={15} /> {busy === 'save' ? 'Enregistrement…' : compact ? 'Brouillon' : 'Enregistrer le brouillon'}
        </button>
        <button type="button" style={{ ...btn('#a78bfa'), ...(compact ? { flex: 1, padding: '9px 6px' } : {}) }} onClick={onTest} disabled={!!busy || missing} title="Vous recevez la campagne (cloche, et e-mail si le canal est actif) ; rien n’est compté">
          <HiOutlineBeaker size={15} /> {busy === 'test' ? 'Envoi du test…' : compact ? 'Test' : 'M’envoyer un test'}
        </button>
        <button type="button" style={{ ...btn(later ? '#d97706' : '#2563eb', true), ...(compact ? { flex: 1, padding: '9px 6px' } : {}) }} onClick={onAskSend} disabled={!!busy || missing}>
          {later ? <HiOutlineClock size={15} /> : <HiOutlinePaperAirplane size={15} style={{ transform: 'rotate(90deg)' }} />}
          {later ? 'Programmer' : 'Envoyer'}
        </button>
      </div>

      {/* ── Confirmation ── */}
      {confirm && (
        <div
          onClick={() => busy !== 'send' && setConfirm(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(3,7,18,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div role="dialog" aria-modal="true" aria-label="Confirmer l’envoi" onClick={(e) => e.stopPropagation()} style={{ ...PANEL, padding: '20px', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>{later ? 'Programmer la campagne ?' : 'Envoyer la campagne ?'}</h3>
            <div style={{ color: 'rgba(226,232,240,0.85)', fontSize: '14px', lineHeight: 1.6 }}>
              « <strong style={{ color: '#fff' }}>{form.title}</strong> »
              {' '}sera {later ? `envoyée le ${fmtDateTime(fromLocalInput(sendAt))}` : 'envoyée maintenant'} à{' '}
              <strong style={{ color: '#fff' }}>{preview ? `${fmtInt(preview.users)} compte${preview.users > 1 ? 's' : ''} (${fmtInt(preview.customers)} client${preview.customers > 1 ? 's' : ''})` : 'les destinataires'}</strong>
              {' '}par {channels}{form.channelEmail && preview ? ` — ${fmtInt(preview.emails)} e-mail${preview.emails > 1 ? 's' : ''}` : ''}.
            </div>
            <div style={hintStyle}>Une fois envoyée, la campagne ne peut plus être modifiée (vous pourrez la retirer ou la dupliquer).</div>
            {sandbox && <div style={{ ...hintStyle, color: '#fde68a' }}>Environnement de test : aucun client ne sera réellement notifié.</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" style={btn('rgba(255,255,255,0.75)')} onClick={() => setConfirm(false)} disabled={busy === 'send'}>Annuler</button>
              <button type="button" style={btn(later ? '#d97706' : '#2563eb', true)} onClick={onSend} disabled={busy === 'send'}>
                {busy === 'send' ? 'Envoi…' : later ? 'Confirmer la programmation' : 'Confirmer l’envoi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignEditor;
