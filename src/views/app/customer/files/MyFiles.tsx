import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import Container from '@/components/shared/Container'
import { useAppSelector } from '@/store'
import { User } from '@/@types/user'
import { env } from '@/configs/env.config'
import {
  apiGetCustomerVisibleFiles,
  apiCreateClientFile,
  apiDeleteClientFile,
  apiUploadFile,
  ClientFile,
} from '@/services/ClientFileServices'
import {
  HiOutlineUpload,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineExclamation,
} from 'react-icons/hi'

/*
 * « Mes fichiers » côté client — volontairement simple : les fichiers d'abord, et une fenêtre
 * d'envoi (plusieurs fichiers d'un coup, glisser-déposer n'importe où sur la page).
 */

/* ---------- Helpers ---------- */

type Category = ClientFile['category']

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'charte', label: 'Charte graphique' },
  { value: 'brief', label: 'Brief' },
  { value: 'asset', label: 'Asset' },
  { value: 'autre', label: 'Autre' },
]

const categoryLabel = (c?: string) => CATEGORIES.find((x) => x.value === c)?.label ?? 'Autre'

function fileUrl(file: ClientFile['file']): string {
  if (!file?.url) return ''
  if (file.url.startsWith('http')) return file.url
  return (env?.API_ENDPOINT_URL ?? '') + file.url
}

const isImage = (file: ClientFile['file']) => file?.mime?.startsWith('image/') ?? false

// Strapi stocke la taille des médias en kilo-octets.
function formatSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

const guessCategory = (f: File): Category => (f.type.startsWith('image/') ? 'logo' : 'autre')

const stripExt = (name: string) => name.replace(/\.[^.]+$/, '')

type QueuedFile = {
  key: string
  file: File
  name: string
  category: Category
  status: 'waiting' | 'sending' | 'done' | 'error'
}

/* ---------- Page ---------- */

const MyFiles = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)
  const customerDocumentId = user?.customer?.documentId

  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [preview, setPreview] = useState<ClientFile | null>(null)

  const [showUpload, setShowUpload] = useState(false)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [sending, setSending] = useState(false)
  const [pageDrag, setPageDrag] = useState(false)
  const dragDepth = useRef(0)

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

  const sorted = useMemo(
    () => [...files].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [files],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    files.forEach((f) => { c[f.category || 'autre'] = (c[f.category || 'autre'] ?? 0) + 1 })
    return c
  }, [files])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sorted.filter(
      (f) =>
        (filter === 'all' || (f.category || 'autre') === filter) &&
        (!q || f.name.toLowerCase().includes(q) || f.file?.name?.toLowerCase().includes(q)),
    )
  }, [sorted, filter, search])

  /* ---------- Envoi ---------- */

  const addToQueue = (list: FileList | File[] | null) => {
    const picked = Array.from(list ?? [])
    if (picked.length === 0) return
    setQueue((q) => [
      ...q,
      ...picked.map((file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: stripExt(file.name),
        category: guessCategory(file),
        status: 'waiting' as const,
      })),
    ])
    setShowUpload(true)
  }

  const updateQueued = (key: string, patch: Partial<QueuedFile>) =>
    setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  const closeUpload = () => {
    if (sending) return
    setShowUpload(false)
    setQueue([])
  }

  const sendAll = async () => {
    const toSend = queue.filter((x) => x.status === 'waiting' || x.status === 'error')
    if (toSend.length === 0 || !customerDocumentId) return
    setSending(true)
    let failed = 0
    for (const item of toSend) {
      updateQueued(item.key, { status: 'sending' })
      try {
        const uploadRes = await apiUploadFile(item.file)
        const uploaded: any = (uploadRes as any)?.data
        const fileId = (Array.isArray(uploaded) ? uploaded[0] : uploaded)?.id
        if (!fileId) throw new Error('upload sans identifiant')
        await apiCreateClientFile({
          name: item.name.trim() || stripExt(item.file.name),
          category: item.category,
          shared: true,
          visibleToCustomer: true,
          notes: '',
          customer: customerDocumentId,
          fileId,
        })
        updateQueued(item.key, { status: 'done' })
      } catch {
        failed++
        updateQueued(item.key, { status: 'error' })
      }
    }
    setSending(false)
    fetchFiles()
    if (failed === 0) {
      toast.success(toSend.length > 1 ? `${toSend.length} fichiers envoyés` : 'Fichier envoyé')
      setShowUpload(false)
      setQueue([])
    } else {
      toast.error(`${failed} fichier${failed > 1 ? 's' : ''} n'${failed > 1 ? 'ont' : 'a'} pas pu être envoyé${failed > 1 ? 's' : ''}. Réessayez.`)
      setQueue((q) => q.filter((x) => x.status !== 'done'))
    }
  }

  /* ---------- Actions fichier ---------- */

  const handleDelete = async (cf: ClientFile) => {
    if (!confirm(`Supprimer « ${cf.name} » ?`)) return
    try {
      await apiDeleteClientFile(cf.documentId)
      setFiles((prev) => prev.filter((f) => f.documentId !== cf.documentId))
      toast.success('Fichier supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleDownload = (cf: ClientFile) => {
    const url = fileUrl(cf.file)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = cf.file?.name ?? cf.name
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
  }

  /* ---------- Glisser-déposer sur toute la page ---------- */

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
  const dragHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current++
      setPageDrag(true)
    },
    onDragOver: (e: React.DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setPageDrag(false)
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setPageDrag(false)
      if (!sending) addToQueue(e.dataTransfer.files)
    },
  }

  /* ---------- Rendu ---------- */

  if (!customerDocumentId) {
    return (
      <Container>
        <div className="text-center py-20">
          <p className="text-white/40">Aucun compte client associé.</p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="pb-10">
      <div {...dragHandlers} className="relative min-h-[60vh]">
        {/* EN-TÊTE */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Mes fichiers</h1>
            <p className="text-sm text-white/40 mt-1 max-w-xl">
              Logos, chartes graphiques et documents à utiliser pour vos commandes.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/25"
          >
            <HiOutlineUpload className="w-4 h-4" />
            Envoyer des fichiers
          </button>
        </div>

        {/* RECHERCHE + FILTRES */}
        {files.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un fichier"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500/40 transition"
              />
            </div>
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Tous" count={files.length} />
            {CATEGORIES.filter((c) => counts[c.value]).map((c) => (
              <FilterChip
                key={c.value}
                active={filter === c.value}
                onClick={() => setFilter(c.value)}
                label={c.label}
                count={counts[c.value]}
              />
            ))}
          </div>
        )}

        {/* FICHIERS */}
        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] h-[210px]" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <button
            onClick={() => setShowUpload(true)}
            className="w-full flex flex-col items-center justify-center text-center gap-3 py-16 rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-indigo-500/[0.04] transition"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-300">
              <HiOutlineUpload className="w-7 h-7" />
            </span>
            <span className="text-base font-bold text-white">Aucun fichier pour le moment</span>
            <span className="text-sm text-white/40">Cliquez ou glissez vos fichiers ici pour les envoyer</span>
          </button>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-12">Aucun fichier ne correspond à votre recherche.</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {visible.map((f) => (
              <FileCard
                key={f.documentId}
                file={f}
                onPreview={() => setPreview(f)}
                onDownload={() => handleDownload(f)}
                onDelete={() => handleDelete(f)}
              />
            ))}
          </div>
        )}

        {/* VOILE DE DÉPÔT */}
        {pageDrag && !showUpload && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400/70 bg-indigo-500/10 backdrop-blur-[2px]">
            <p className="text-lg font-bold text-white">Déposez vos fichiers pour les envoyer</p>
          </div>
        )}
      </div>

      {/* FENÊTRE D'ENVOI */}
      {showUpload && (
        <UploadWindow
          queue={queue}
          sending={sending}
          onAdd={addToQueue}
          onChange={updateQueued}
          onRemove={(key) => setQueue((q) => q.filter((x) => x.key !== key))}
          onSend={sendAll}
          onClose={closeUpload}
        />
      )}

      {/* APERÇU */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              aria-label="Fermer l'aperçu"
              className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
            <img src={fileUrl(preview.file)} alt={preview.name} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </Container>
  )
}

/* ---------- Sous-composants ---------- */

const FilterChip = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
      active ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200' : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80'
    }`}
  >
    {label} <span className="opacity-60">{count}</span>
  </button>
)

const FileCard = ({
  file: f,
  onPreview,
  onDownload,
  onDelete,
}: {
  file: ClientFile
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}) => {
  const img = isImage(f.file)
  const ext = f.file?.ext?.replace('.', '').toUpperCase() || 'FICHIER'
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col hover:border-white/20 transition">
      <button
        onClick={img ? onPreview : onDownload}
        title={img ? 'Aperçu' : 'Ouvrir'}
        className="h-[120px] flex items-center justify-center bg-white/[0.03] border-b border-white/[0.06] overflow-hidden"
      >
        {img ? (
          <img src={fileUrl(f.file)} alt={f.name} className="w-full h-full object-contain p-2" loading="lazy" />
        ) : (
          <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-500/15 text-indigo-200 text-xs font-bold">
            {ext.slice(0, 4)}
          </span>
        )}
      </button>
      <div className="p-3 flex-1 flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate" title={f.name}>{f.name}</p>
        <p className="text-[11px] text-white/35 truncate">
          {categoryLabel(f.category)} · {ext} · {formatSize((f.file?.size ?? 0) * 1024)} · {formatDate(f.createdAt)}
        </p>
        <div className="flex items-center gap-1 mt-auto pt-1">
          {img && (
            <IconAction label="Aperçu" onClick={onPreview}><HiOutlineEye className="w-4 h-4" /></IconAction>
          )}
          <IconAction label="Télécharger" onClick={onDownload}><HiOutlineDownload className="w-4 h-4" /></IconAction>
          <span className="flex-1" />
          <IconAction label="Supprimer" onClick={onDelete} danger><HiOutlineTrash className="w-4 h-4" /></IconAction>
        </div>
      </div>
    </div>
  )
}

const IconAction = ({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`peg-tap-target p-1.5 rounded-lg text-white/40 transition ${
      danger ? 'hover:text-rose-400 hover:bg-rose-500/10' : 'hover:text-white hover:bg-white/[0.06]'
    }`}
  >
    {children}
  </button>
)

const UploadWindow = ({
  queue,
  sending,
  onAdd,
  onChange,
  onRemove,
  onSend,
  onClose,
}: {
  queue: QueuedFile[]
  sending: boolean
  onAdd: (list: FileList | null) => void
  onChange: (key: string, patch: Partial<QueuedFile>) => void
  onRemove: (key: string) => void
  onSend: () => void
  onClose: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const pending = queue.filter((x) => x.status !== 'done').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Envoyer des fichiers"
        className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-white/10 bg-[#11141f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-4">
          <h3 className="text-lg font-bold text-white">Envoyer des fichiers</h3>
          <button onClick={onClose} disabled={sending} aria-label="Fermer" className="text-white/30 hover:text-white/70 transition peg-tap-target disabled:opacity-30">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 overflow-y-auto">
          <div
            onClick={() => !sending && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOver(false)
              if (!sending) onAdd(e.dataTransfer.files)
            }}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition ${
              over ? 'border-indigo-400/60 bg-indigo-500/[0.06]' : 'border-white/15 hover:border-indigo-500/40'
            }`}
          >
            <HiOutlineUpload className="w-7 h-7 text-indigo-300" />
            <span className="text-sm font-semibold text-white/80">Cliquez ou glissez vos fichiers ici</span>
            <span className="text-[11px] text-white/35">Plusieurs fichiers possibles</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onAdd(e.target.files)
              e.target.value = ''
            }}
          />

          {queue.length > 0 && (
            <div className="mt-4 space-y-2">
              {queue.map((q) => (
                <div key={q.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={q.name}
                      onChange={(e) => onChange(q.key, { name: e.target.value })}
                      disabled={sending || q.status === 'done'}
                      aria-label="Nom du fichier"
                      className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none border-b border-transparent focus:border-indigo-500/50"
                    />
                    <StatusIcon status={q.status} />
                    {!sending && q.status !== 'done' && (
                      <button onClick={() => onRemove(q.key)} aria-label={`Retirer ${q.file.name}`} className="text-white/30 hover:text-white/70">
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] text-white/35 truncate">
                      {q.file.name} · {formatSize(q.file.size)}
                    </span>
                    <select
                      value={q.category}
                      onChange={(e) => onChange(q.key, { category: e.target.value as Category })}
                      disabled={sending || q.status === 'done'}
                      aria-label="Type de fichier"
                      className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 pt-4">
          <button
            onClick={onSend}
            disabled={sending || pending === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
          >
            {sending
              ? 'Envoi en cours…'
              : pending > 1
                ? `Envoyer ${pending} fichiers`
                : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const StatusIcon = ({ status }: { status: QueuedFile['status'] }) => {
  if (status === 'sending')
    return <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-transparent animate-spin shrink-0" aria-label="Envoi" />
  if (status === 'done') return <HiOutlineCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Envoyé" />
  if (status === 'error') return <HiOutlineExclamation className="w-4 h-4 text-rose-400 shrink-0" aria-label="Échec" />
  return null
}

export default MyFiles
