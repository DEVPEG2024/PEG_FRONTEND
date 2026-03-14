import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container } from '@/components/shared'
import ApiService from '@/services/ApiService'
import { API_GRAPHQL_URL, EXPRESS_BACKEND_URL } from '@/configs/api.config'
import { HiArrowLeft, HiCheckCircle, HiClipboardCopy, HiClipboardCheck } from 'react-icons/hi'
import { Invoice } from '@/@types/invoice'

const IBAN = 'FR76 1679 8000 0100 0178 1163 397'
const BIC = 'TRZOFR21XXX'
const BANK = 'TIIME'
const HOLDER = 'NOVA 2.0'

const PAY_STATE_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:           { label: 'En attente de paiement',          bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
  pending_transfer:  { label: 'Virement en attente de réception', bg: 'rgba(234,179,8,0.1)',  color: '#fbbf24', border: 'rgba(234,179,8,0.3)'   },
  transfer_received: { label: 'Virement reçu ✓',                  bg: 'rgba(34,197,94,0.1)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  fulfilled:         { label: 'Payé',                              bg: 'rgba(34,197,94,0.1)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
    <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{value}</p>
  </div>
)

const BankTransferPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    ApiService.fetchData<{ data: { invoice: Invoice } }>({
      url: API_GRAPHQL_URL,
      method: 'post',
      data: {
        query: `
          query GetInvoice($documentId: ID!) {
            invoice(documentId: $documentId) {
              documentId
              name
              amount
              vatAmount
              totalAmount
              paymentState
              state
              date
              dueDate
            }
          }
        `,
        variables: { documentId: id },
      },
    })
      .then((res) => setInvoice(res.data.data.invoice))
      .catch(() => setError('Impossible de charger la facture.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCopy = () => {
    navigator.clipboard.writeText(IBAN.replace(/\s/g, '')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleVirement = async () => {
    if (!id || submitting) return
    setSubmitting(true)
    try {
      await ApiService.fetchData({
        url: `${EXPRESS_BACKEND_URL}/invoices/${id}/payment-status`,
        method: 'put',
        data: { paymentStatus: 'pending_transfer' },
      })
      setInvoice((prev) => prev ? { ...prev, paymentState: 'pending_transfer' } : prev)
    } catch {
      setError('Erreur lors de la mise à jour du statut.')
    } finally {
      setSubmitting(false)
    }
  }

  const payState = invoice?.paymentState ?? 'pending'
  const stateCfg = PAY_STATE_CFG[payState] ?? PAY_STATE_CFG.pending
  const reference = invoice ? `PEG-INV-${invoice.name}` : '—'

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '32px', paddingBottom: '48px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('/customer/invoices')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '24px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <HiArrowLeft size={16} /> Retour aux factures
        </button>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Finance</p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
          Paiement par virement
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[200, 60, 220, 56].map((h, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: `${h}px`, border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '20px', color: '#f87171', fontSize: '14px' }}>
            {error}
          </div>
        ) : invoice ? (
          <>
            {/* Invoice summary */}
            <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Référence de virement</p>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{reference}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Montant à payer</p>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '22px' }}>{invoice.totalAmount?.toFixed(2)} €</p>
                  {invoice.vatAmount > 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>dont TVA {invoice.vatAmount?.toFixed(2)} €</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ background: stateCfg.bg, border: `1px solid ${stateCfg.border}`, borderRadius: '100px', padding: '4px 14px', color: stateCfg.color, fontSize: '12px', fontWeight: 700 }}>
                {stateCfg.label}
              </span>
            </div>

            {/* Bank details card */}
            <div style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2441 100%)', border: '1.5px solid rgba(47,111,237,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(107,158,255,0.7)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
                Coordonnées bancaires
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Row label="Banque" value={BANK} />
                <Row label="Titulaire du compte" value={HOLDER} />
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>IBAN</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{IBAN}</span>
                    <button
                      onClick={handleCopy}
                      title="Copier l'IBAN"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(47,111,237,0.15)',
                        border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(47,111,237,0.35)'}`,
                        borderRadius: '8px', padding: '6px 12px',
                        color: copied ? '#4ade80' : '#6b9eff',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s', flexShrink: 0, fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {copied ? <HiClipboardCheck size={14} /> : <HiClipboardCopy size={14} />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
                <Row label="BIC / SWIFT" value={BIC} />
              </div>

              {/* Important notice */}
              <div style={{ marginTop: '22px', padding: '12px 16px', background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '10px' }}>
                <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>Important</p>
                <p style={{ color: 'rgba(255,220,100,0.65)', fontSize: '12px', lineHeight: 1.5 }}>
                  Indiquez impérativement la référence{' '}
                  <strong style={{ color: '#fbbf24' }}>{reference}</strong>{' '}
                  dans le libellé de votre virement.
                </p>
              </div>
            </div>

            {/* CTA / confirmation */}
            {payState === 'transfer_received' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', padding: '20px 22px' }}>
                <HiCheckCircle size={28} style={{ color: '#4ade80', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>Virement reçu ✓</p>
                  <p style={{ color: 'rgba(34,197,94,0.6)', fontSize: '13px' }}>Votre virement a bien été reçu et validé. Merci !</p>
                </div>
              </div>
            ) : payState === 'pending_transfer' ? (
              <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '14px', padding: '20px 22px' }}>
                <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Virement signalé</p>
                <p style={{ color: 'rgba(255,200,60,0.55)', fontSize: '13px' }}>
                  Nous avons bien pris note de votre virement. Nous vous confirmerons sa réception sous 1 à 2 jours ouvrés.
                </p>
              </div>
            ) : (
              <button
                onClick={handleVirement}
                disabled={submitting}
                style={{
                  width: '100%', padding: '15px 24px',
                  background: submitting ? 'rgba(47,111,237,0.4)' : 'rgba(47,111,237,0.85)',
                  border: '1px solid rgba(47,111,237,0.55)',
                  borderRadius: '12px', color: '#fff',
                  fontSize: '15px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'rgba(47,111,237,1)' }}
                onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'rgba(47,111,237,0.85)' }}
              >
                {submitting ? 'Envoi en cours…' : "J'ai effectué le virement"}
              </button>
            )}
          </>
        ) : null}
      </div>
    </Container>
  )
}

export default BankTransferPage
