import { useEffect, useState } from 'react';
import type { CampaignInput } from '@/@types/campaign';
import CampaignContent from '@/components/campaign/CampaignContent';
import { apiPreviewCampaignEmail } from '@/services/CampaignServices';
import { TAG_META, excerpt } from '@/utils/campaignFormat';
import { PANEL, chip, hintStyle } from '../ui';

/**
 * Aperçu en direct de la campagne telle que le client la verra : pop-up (et page
 * Actualités), ligne de la cloche, e-mail (rendu par le serveur, même gabarit
 * que l'envoi réel).
 */

type View = 'popup' | 'bell' | 'email';

const PreviewPanel = ({ form }: { form: CampaignInput }) => {
  const [view, setView] = useState<View>('popup');
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [emailError, setEmailError] = useState(false);
  const meta = TAG_META[form.tag] || TAG_META.info;

  // E-mail : rendu serveur, à la demande, avec un temps de pause pendant la frappe.
  useEffect(() => {
    if (view !== 'email') return;
    const t = setTimeout(() => {
      apiPreviewCampaignEmail(form)
        .then((res) => { setEmailHtml(res.data.html || ''); setEmailError(false); })
        .catch(() => setEmailError(true));
    }, 500);
    return () => clearTimeout(t);
  }, [view, form]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type="button" style={chip(view === 'popup')} onClick={() => setView('popup')}>Pop-up / Actualités</button>
        <button type="button" style={chip(view === 'bell')} onClick={() => setView('bell')}>Cloche</button>
        <button type="button" style={chip(view === 'email')} onClick={() => setView('email')} disabled={!form.channelEmail} title={form.channelEmail ? undefined : 'Canal e-mail désactivé'}>
          E-mail
        </button>
      </div>

      {view === 'popup' && (
        <div style={{ ...PANEL, overflow: 'hidden', borderRadius: '18px', boxShadow: '0 18px 40px rgba(0,0,0,0.4)' }}>
          <CampaignContent campaign={form} dateLabel="aujourd’hui" coverMaxHeight={260} />
        </div>
      )}

      {view === 'bell' && (
        <div style={{ background: '#1f2937', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #374151', color: '#f3f4f6', fontSize: '13px', fontWeight: 600 }}>Notifications</div>
          <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', background: 'rgba(30,58,138,0.18)' }}>
            {form.images[0] ? (
              <img src={form.images[0].url} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{meta.emoji}</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 500, overflowWrap: 'anywhere' }}>{form.title || 'Titre de la campagne'}</div>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px', overflowWrap: 'anywhere' }}>{excerpt(form.message) || 'Nouvelle actualité PEG'}</div>
              <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '4px' }}>À l’instant</div>
            </div>
          </div>
          <div style={{ ...hintStyle, padding: '10px 14px' }}>Accompagnée d’une notification push et du son de la cloche. Un clic ouvre l’actualité.</div>
        </div>
      )}

      {view === 'email' && (
        emailError ? (
          <div style={{ ...PANEL, padding: '16px', ...hintStyle }}>Aperçu de l’e-mail indisponible.</div>
        ) : (
          <iframe
            title="Aperçu de l’e-mail"
            sandbox=""
            srcDoc={emailHtml}
            style={{ width: '100%', height: '640px', border: 'none', borderRadius: '12px', background: '#f4f4f7' }}
          />
        )
      )}
    </div>
  );
};

export default PreviewPanel;
