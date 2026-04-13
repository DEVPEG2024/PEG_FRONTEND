import { Container, EmptyState } from '@/components/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import reducer, { getCustomers, deleteCustomer } from '../store'
import { Customer } from '@/@types/customer'
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiUsers, HiMail, HiLocationMarker } from 'react-icons/hi'
import { env } from '@/configs/env.config'
import QuickAddCustomerWizard from './QuickAddCustomerWizard'

const resolveUrl = (url: string) => url?.startsWith('http') ? url : (env?.API_ENDPOINT_URL ?? '') + url

injectReducer('customers', reducer)

const AVATAR_COLORS = [
  'rgba(47,111,237,0.3)', 'rgba(168,85,247,0.3)', 'rgba(34,197,94,0.25)',
  'rgba(234,179,8,0.25)', 'rgba(239,68,68,0.25)', 'rgba(20,184,166,0.25)',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
)

const CustomersList = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)

  const customers: Customer[] = useAppSelector((state: any) => state.customers?.customers ?? [])
  const total: number = useAppSelector((state: any) => state.customers?.total ?? 0)
  const loading: boolean = useAppSelector((state: any) => state.customers?.loading ?? false)

  useEffect(() => {
    dispatch(getCustomers({ pagination: { page: currentPage, pageSize }, searchTerm }))
  }, [dispatch, currentPage, pageSize, searchTerm])

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Gestion</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Clients <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => setWizardOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouveau client
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher un client…" value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Ajoutez votre premier client pour commencer"
          icon={<HiUsers size={48} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {customers.map((c: any) => {
            const name: string = c?.name ?? '?'
            const docId = c?.documentId ?? c?.id
            return (
              <div key={docId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                {c?.logo?.url ? (
                  <img src={resolveUrl(c.logo.url)} alt={name} style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: avatarColor(name), border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{initials(name)}</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{name}</span>
                    {c?.customerCategory?.name && (
                      <span style={{ background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '100px', padding: '1px 8px', color: '#6b9eff', fontSize: '11px', fontWeight: 600 }}>{c.customerCategory.name}</span>
                    )}
                    {c?.deferredPayment && (
                      <span style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '100px', padding: '1px 8px', color: '#c084fc', fontSize: '11px', fontWeight: 600 }}>Paiement différé</span>
                    )}
                    {c?.catalogAccess === false && (
                      <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '100px', padding: '1px 8px', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>Sans catalogue</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {c?.companyInformations?.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}><HiMail size={12} />{c.companyInformations.email}</span>
                    )}
                    {c?.companyInformations?.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}><HiLocationMarker size={12} />{c.companyInformations.city}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Btn onClick={() => navigate(`/admin/customers/edit/${docId}`)} icon={<HiPencil size={14} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => dispatch(deleteCustomer(String(docId)))} icon={<HiTrash size={14} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <QuickAddCustomerWizard open={wizardOpen} onClose={() => { setWizardOpen(false); dispatch(getCustomers({ pagination: { page: currentPage, pageSize }, searchTerm })); }} />
    </Container>
  )
}

export default CustomersList
