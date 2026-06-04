import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import Container from '@/components/shared/Container'
import ClientFilesPanel from '@/components/shared/ClientFiles/ClientFilesPanel'
import { useAppSelector } from '@/store'
import { User } from '@/@types/user'
import { env } from '@/configs/env.config'
import {
  apiGetCustomerVisibleFiles,
  apiCreateClientFile,
  apiUploadFile,
  ClientFile,
} from '@/services/ClientFileServices'
import {
  HiOutlineUpload,
  HiOutlineCloud,
  HiOutlineFolder,
  HiOutlineChartPie,
  HiOutlineShare,
  HiOutlineClock,
  HiOutlinePhotograph,
  HiOutlineColorSwatch,
  HiOutlineVideoCamera,
  HiOutlineDocument,
  HiOutlineDocumentText,
  HiOutlineX,
  HiOutlineChevronRight,
  HiOutlineInbox,
} from 'react-icons/hi'
import { TbActivity } from 'react-icons/tb'

/* ---------- Helpers ---------- */

const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024 // 10 Go

function fileUrl(file: ClientFile['file']): string {
  if (!file?.url) return ''
  if (file.url.startsWith('http')) return file.url
  return (env?.API_ENDPOINT_URL ?? '') + file.url
}

function isImage(file: ClientFile['file']): boolean {
  return file?.mime?.startsWith('image/') ?? false
}

function isVideo(file: ClientFile['file']): boolean {
  return file?.mime?.startsWith('video/') ?? false
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// Strapi stocke la taille des médias en kilo-octets (KB) — on convertit en octets.
function clientFileBytes(file: ClientFile['file']): number {
  return (file?.size ?? 0) * 1024
}

function formatGo(bytes: number): string {
  const go = bytes / (1024 * 1024 * 1024)
  if (go === 0) return '0'
  if (go < 0.01) return go.toFixed(3)
  return go.toFixed(2)
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const UPLOAD_CATEGORIES: { value: string; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'charte', label: 'Charte graphique' },
  { value: 'brief', label: 'Brief' },
  { value: 'asset', label: 'Asset' },
  { value: 'autre', label: 'Autre' },
]

/* ---------- Design system (aligné sur la page Factures) ---------- */

const PRIMARY_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px', borderRadius: '11px',
  background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', border: 'none', cursor: 'pointer', color: '#fff',
  fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(109,93,252,0.35)',
  transition: 'transform 0.15s', whiteSpace: 'nowrap',
}

const Panel = ({ title, action, children, style }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '22px', ...style }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
)

const KpiCard = ({ icon, iconBg, iconBorder, iconColor, label, value, hint }: any) => (
  <div style={{ flex: '1 1 200px', minWidth: 0, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</p>
    </div>
  </div>
)

const SeeAll = ({ onClick }: { onClick: () => void }) => (
  <a href="#" onClick={(e) => { e.preventDefault(); onClick() }} style={{ color: '#6b9eff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Voir tout</a>
)

/* ---------- Page ---------- */

const MyFiles = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)
  const customerDocumentId = user?.customer?.documentId

  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)

  // Upload modal
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('autre')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    if (!customerDocumentId) return
    try {
      setLoading(true)
      const res = await apiGetCustomerVisibleFiles(customerDocumentId)
      const data = (res as any)?.data?.data ?? []
      setFiles(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Erreur lors du chargement des fichiers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerDocumentId) fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDocumentId])

  /* ---------- Derived stats ---------- */

  const stats = useMemo(() => {
    const totalBytes = files.reduce((s, f) => s + clientFileBytes(f.file), 0)
    const shared = files.filter((f) => f.shared).length
    const sorted = [...files].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const last = sorted[0]
    const usedPct = Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100)
    return {
      total: files.length,
      totalBytes,
      shared,
      last,
      recent: sorted.slice(0, 5),
      usedPct,
    }
  }, [files])

  const quickAccess = useMemo(() => {
    const logos = files.filter((f) => f.category === 'logo').length
    const chartes = files.filter((f) => f.category === 'charte').length
    const photos = files.filter((f) => isImage(f.file) && f.category !== 'logo').length
    const videos = files.filter((f) => isVideo(f.file)).length
    const documents = files.filter(
      (f) => !isImage(f.file) && !isVideo(f.file)
    ).length
    return [
      { key: 'logos', label: 'Logos', count: logos, icon: <HiOutlineFolder size={22} />, color: '#a99bff', bg: 'rgba(139,125,255,0.12)' },
      { key: 'chartes', label: 'Chartes graphiques', count: chartes, icon: <HiOutlineColorSwatch size={22} />, color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
      { key: 'photos', label: 'Photos', count: photos, icon: <HiOutlinePhotograph size={22} />, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
      { key: 'videos', label: 'Vidéos', count: videos, icon: <HiOutlineVideoCamera size={22} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
      { key: 'documents', label: 'Documents', count: documents, icon: <HiOutlineDocument size={22} />, color: '#6b9eff', bg: 'rgba(107,158,255,0.12)' },
    ]
  }, [files])

  /* ---------- Upload ---------- */

  const openUploadWith = (f?: File) => {
    if (f) {
      setUploadFile(f)
      setUploadName(f.name.replace(/\.[^.]+$/, ''))
      if (f.type.startsWith('image/')) setUploadCategory('logo')
    }
    setShowUpload(true)
  }

  const resetUpload = () => {
    setShowUpload(false)
    setUploadFile(null)
    setUploadName('')
    setUploadCategory('autre')
    setUploading(false)
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadFile(f)
    if (!uploadName.trim()) setUploadName(f.name.replace(/\.[^.]+$/, ''))
    if (f.type.startsWith('image/')) setUploadCategory('logo')
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.warning('Nom et fichier requis')
      return
    }
    try {
      setUploading(true)
      const uploadRes = await apiUploadFile(uploadFile)
      const uploadData = (uploadRes as any)?.data
      const fileEntry = Array.isArray(uploadData) ? uploadData[0] : uploadData
      const fileId = fileEntry?.id
      if (!fileId) {
        toast.error("Erreur lors de l'upload du fichier")
        return
      }
      await apiCreateClientFile({
        name: uploadName.trim(),
        category: uploadCategory,
        shared: true,
        visibleToCustomer: true,
        notes: '',
        customer: customerDocumentId!,
        fileId,
      })
      toast.success('Fichier ajouté !')
      resetUpload()
      fetchFiles()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || ''
      toast.error(msg ? `Erreur upload : ${msg}` : "Erreur lors de l'ajout du fichier")
    } finally {
      setUploading(false)
    }
  }

  const onDropFile = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) openUploadWith(f)
  }

  /* ---------- Guard ---------- */

  if (!customerDocumentId) {
    return (
      <Container style={{ fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>Aucun compte client associé.</div>
      </Container>
    )
  }

  const isEmpty = !loading && files.length === 0

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Hero ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', paddingTop: '24px', marginBottom: '24px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#8b7dff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Fichiers</p>
          <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            Mes fichiers <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, borderRadius: '100px', padding: '3px 11px' }}>{stats.total}</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 16px', maxWidth: '460px' }}>
            Gérez vos logos, chartes graphiques et documents. Les fichiers partagés seront accessibles par les producteurs assignés à vos projets.
          </p>
          <button onClick={() => openUploadWith()} style={PRIMARY_BTN}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <HiOutlineUpload size={16} /> Ajouter un fichier
          </button>
        </div>
        <FilesArt />
      </div>

      {/* ── KPI ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <KpiCard icon={<HiOutlineFolder size={24} />} iconBg="rgba(139,125,255,0.12)" iconBorder="rgba(139,125,255,0.28)" iconColor="#a99bff"
          label="Total fichiers" value={loading ? '—' : String(stats.total)} hint="Fichiers au total" />
        <KpiCard icon={<HiOutlineChartPie size={24} />} iconBg="rgba(107,158,255,0.12)" iconBorder="rgba(107,158,255,0.28)" iconColor="#6b9eff"
          label="Taille utilisée" value={loading ? '—' : `${formatGo(stats.totalBytes)} Go`} hint="Sur 10 Go" />
        <KpiCard icon={<HiOutlineShare size={24} />} iconBg="rgba(52,211,153,0.12)" iconBorder="rgba(52,211,153,0.28)" iconColor="#34d399"
          label="Partagés" value={loading ? '—' : String(stats.shared)} hint="Fichiers partagés" />
        <KpiCard icon={<HiOutlineClock size={24} />} iconBg="rgba(251,191,36,0.12)" iconBorder="rgba(251,191,36,0.28)" iconColor="#fbbf24"
          label="Dernier ajout" value={loading ? '—' : stats.last ? timeAgo(stats.last.createdAt) : 'Aucun'} hint={stats.last ? stats.last.name : 'Aucun fichier ajouté'} />
      </div>

      {/* ── Grille : fichiers récents + stockage ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', marginBottom: '18px' }}>
        {/* Fichiers récents */}
        <Panel title="Fichiers récents" action={<SeeAll onClick={() => setShowLibrary(true)} />}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: '56px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
            </div>
          ) : stats.recent.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropFile}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px', borderRadius: '16px', border: `1.5px dashed ${dragOver ? 'rgba(109,93,252,0.6)' : 'rgba(139,125,255,0.35)'}`, background: dragOver ? 'rgba(109,93,252,0.06)' : 'transparent', transition: 'all 0.15s' }}
            >
              <div style={{ width: '74px', height: '74px', borderRadius: '18px', background: 'rgba(139,125,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', color: '#8b7dff' }}>
                <HiOutlineInbox size={34} />
              </div>
              <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                {isEmpty ? 'Vos fichiers apparaîtront ici' : 'Aucun fichier récent'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px', maxWidth: '320px', lineHeight: 1.5 }}>
                Ajoutez votre premier fichier pour commencer à constituer votre bibliothèque.
              </p>
              <button onClick={() => openUploadWith()} style={PRIMARY_BTN}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <HiOutlineUpload size={16} /> Ajouter un fichier
              </button>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '12px' }}>ou glisser-déposer un fichier ici</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.recent.map((f) => {
                const url = fileUrl(f.file)
                return (
                  <div key={f.documentId}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {isImage(f.file) ? (
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                        <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(107,158,255,0.12)', border: '1px solid rgba(107,158,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#6b9eff' }}>
                        <HiOutlineDocumentText size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>
                        <span>{f.file?.ext?.replace('.', '').toUpperCase()}</span><span>·</span>
                        <span>{formatSize(clientFileBytes(f.file))}</span><span>·</span>
                        <span>{timeAgo(f.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        {/* Stockage */}
        <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(139,125,255,0.12)', color: '#a99bff' }}><HiOutlineCloud size={17} /></span>Stockage utilisé</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Donut pct={stats.usedPct} />
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                {formatGo(stats.totalBytes)} Go <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>/ 10 Go</span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>
                Espace disponible : {formatGo(STORAGE_LIMIT_BYTES - stats.totalBytes)} Go
              </p>
            </div>
            <button onClick={() => setShowLibrary(true)}
              style={{ marginTop: '18px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '42px', borderRadius: '11px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              Gérer le stockage <HiOutlineChevronRight size={16} />
            </button>
          </div>
        </Panel>
      </div>

      {/* ── Grille : accès rapide + activité ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', paddingBottom: '40px' }}>
        {/* Accès rapide */}
        <Panel title="Accès rapide" action={<SeeAll onClick={() => setShowLibrary(true)} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
            {quickAccess.map((q) => (
              <button key={q.key} onClick={() => setShowLibrary(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', padding: '16px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '13px', background: q.bg, color: q.color }}>{q.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 600, lineHeight: 1.2 }}>{q.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{q.count} fichier{q.count > 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* Activité récente */}
        <Panel title="Activité récente" action={<SeeAll onClick={() => setShowLibrary(true)} />}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map((i) => <div key={i} style={{ height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }} />)}
            </div>
          ) : stats.recent.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                {[
                  { c: '#34d399', bg: 'rgba(52,211,153,0.12)', Icon: HiOutlineUpload },
                  { c: '#a99bff', bg: 'rgba(139,125,255,0.12)', Icon: HiOutlineFolder },
                  { c: '#6b9eff', bg: 'rgba(107,158,255,0.12)', Icon: HiOutlineDocumentText },
                ].map((it, i) => (
                  <div key={i} style={{ width: '34px', height: '34px', borderRadius: '10px', background: it.bg, border: `1px solid ${it.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.c }}>
                    <it.Icon size={16} />
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <TbActivity size={30} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }} />
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Aucune activité récente</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>Les dernières actions sur vos fichiers apparaîtront ici.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recent.map((f) => (
                <div key={f.documentId} style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(52,211,153,0.12)', color: '#34d399', flexShrink: 0 }}>
                    <HiOutlineUpload size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{f.name}</span> ajouté
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', flexShrink: 0 }}>{timeAgo(f.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }} onClick={resetUpload}>
          <div style={{ width: '100%', maxWidth: '440px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f1c2e', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>Ajouter un fichier</h3>
              <button onClick={resetUpload} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}><HiOutlineX size={20} /></button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropFile}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: `2px dashed ${dragOver ? 'rgba(109,93,252,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '14px', padding: '32px 16px', cursor: 'pointer', background: dragOver ? 'rgba(109,93,252,0.05)' : 'transparent', transition: 'all 0.15s' }}
            >
              {uploadFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  <HiOutlineDocumentText size={20} style={{ color: '#8b7dff' }} />
                  {uploadFile.name}
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>({formatSize(uploadFile.size)})</span>
                </div>
              ) : (
                <>
                  <HiOutlineUpload size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Cliquer ou glisser-déposer un fichier</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileSelect} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <input type="text" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Nom du fichier"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', color: '#fff', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(109,93,252,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', color: '#fff', outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
              >
                {UPLOAD_CATEGORIES.map((c) => <option key={c.value} value={c.value} style={{ background: '#16263d' }}>{c.label}</option>)}
              </select>
            </div>

            <button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadName.trim()}
              style={{ ...PRIMARY_BTN, width: '100%', justifyContent: 'center', marginTop: '18px', opacity: uploading || !uploadFile || !uploadName.trim() ? 0.4 : 1, cursor: uploading || !uploadFile || !uploadName.trim() ? 'not-allowed' : 'pointer' }}
            >
              {uploading ? 'Envoi…' : 'Enregistrer le fichier'}
            </button>
          </div>
        </div>
      )}

      {/* LIBRARY MODAL */}
      {showLibrary && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px', overflowY: 'auto' }} onClick={() => { setShowLibrary(false); fetchFiles() }}>
          <div style={{ width: '100%', maxWidth: '768px', margin: '32px 0', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f1c2e', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>Ma bibliothèque</h3>
              <button onClick={() => { setShowLibrary(false); fetchFiles() }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}><HiOutlineX size={20} /></button>
            </div>
            <ClientFilesPanel customerDocumentId={customerDocumentId} mode="customer" />
          </div>
        </div>
      )}
    </Container>
  )
}

/* ---------- Sub components ---------- */

const Donut = ({ pct }: { pct: number }) => {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div style={{ position: 'relative', width: '130px', height: '130px' }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke="url(#donutGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b7dff" />
            <stop offset="100%" stopColor="#6b9eff" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

/* Illustration hero — dossier + badges fichiers + check (style page Factures) */
const FilesArt = () => (
  <svg width="300" height="180" viewBox="0 0 300 180" fill="none" style={{ flexShrink: 0, maxWidth: '38%', height: 'auto' }} aria-hidden>
    <defs>
      <linearGradient id="folderG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6d5dfc" /><stop offset="1" stopColor="#4534c9" />
      </linearGradient>
      <linearGradient id="folderTab" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8b7dff" /><stop offset="1" stopColor="#6d5dfc" />
      </linearGradient>
    </defs>
    {/* dossier */}
    <rect x="96" y="78" width="150" height="92" rx="16" fill="url(#folderG)" opacity="0.95" />
    <rect x="104" y="62" width="74" height="24" rx="8" fill="url(#folderTab)" />
    {/* badges fichiers flottants */}
    <g>
      <rect x="118" y="20" width="42" height="42" rx="11" fill="#7c3aed" />
      <text x="139" y="46" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">PNG</text>
    </g>
    <g>
      <rect x="170" y="8" width="42" height="42" rx="11" fill="#2563eb" />
      <text x="191" y="34" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">DOC</text>
    </g>
    <g>
      <rect x="224" y="26" width="42" height="42" rx="11" fill="#dc2626" />
      <text x="245" y="52" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">PDF</text>
    </g>
    <g>
      <rect x="66" y="58" width="42" height="42" rx="11" fill="#1f2937" />
      <text x="87" y="84" fill="#f59e0b" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">Ai</text>
    </g>
    {/* check */}
    <circle cx="232" cy="150" r="17" fill="#34d399" />
    <path d="M224 150 l5 5 l10 -11" stroke="#0f1c2e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)

export default MyFiles
