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
  apiUpdateClientFile,
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
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineFolder,
  HiOutlineCloud,
  HiOutlineClock,
  HiOutlineShare,
  HiOutlineLightBulb,
  HiOutlineInformationCircle,
  HiOutlineLink,
  HiOutlineLockClosed,
  HiOutlinePhotograph,
  HiOutlineColorSwatch,
  HiOutlineClipboardList,
  HiOutlineCollection,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlinePlus,
} from 'react-icons/hi'

/*
 * « Mes fichiers » côté client — volontairement simple : les fichiers d'abord, et une fenêtre
 * d'envoi (plusieurs fichiers d'un coup, glisser-déposer n'importe où sur la page).
 */

/* ---------- Helpers ---------- */

type Category = ClientFile['category']

const CATEGORIES: { value: Category; label: string; plural: string; color: string }[] = [
  { value: 'logo', label: 'Logo', plural: 'logos', color: '#22d3ee' },
  { value: 'charte', label: 'Charte graphique', plural: 'chartes graphiques', color: '#a78bfa' },
  { value: 'brief', label: 'Brief', plural: 'briefs', color: '#fbbf24' },
  { value: 'asset', label: 'Asset', plural: 'assets', color: '#34d399' },
  { value: 'autre', label: 'Autre', plural: 'autres', color: '#94a3b8' },
]

const categoryOf = (c?: string) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[4]

const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024 // 10 Go
const fileBytes = (f: ClientFile) => (f.file?.size ?? 0) * 1024

function formatStorage(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2).replace('.', ',')} Go`
  return formatSize(bytes)
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`
  return `le ${formatDate(iso)}`
}

const VIEW_KEY = 'peg_myfiles_view'
const readView = (): 'grid' | 'list' => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

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

const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

const extOf = (f: ClientFile) => f.file?.ext?.replace('.', '').toUpperCase() || 'FICHIER'

/*
 * Qualité d'impression, pour guider le client : un format vectoriel s'imprime à toute taille ;
 * une image matricielle s'imprime nettement jusqu'à (pixels / 300 dpi). Seuil « haute déf. » :
 * 10 cm de large à 300 dpi, la taille d'un marquage cœur/poitrine courant.
 */
const VECTOR_EXTS = ['SVG', 'AI', 'EPS', 'PDF']
type Quality = { level: 'vector' | 'hd' | 'ld'; label: string; detail: string; color: string }
function qualityOf(f: ClientFile): Quality | null {
  const ext = extOf(f)
  if (VECTOR_EXTS.includes(ext)) {
    return {
      level: 'vector',
      label: 'Vectoriel',
      detail: ext === 'PDF' ? 'Généralement vectoriel : s’imprime à toute taille sans perte' : 'S’imprime à toute taille sans perte de qualité',
      color: '#34d399',
    }
  }
  const w = f.file?.width
  const h = f.file?.height
  if (!isImage(f.file) || !w || !h) return null
  const cmW = (w / 300) * 2.54
  const cmH = (h / 300) * 2.54
  const size = `${Math.round(cmW)} × ${Math.round(cmH)} cm à 300 dpi`
  return cmW >= 10
    ? { level: 'hd', label: 'Haute déf.', detail: `Impression nette jusqu’à ${size}`, color: '#60a5fa' }
    : { level: 'ld', label: 'Basse déf.', detail: `Seulement ${size} : privilégiez un fichier vectoriel ou plus grand`, color: '#f59e0b' }
}

type SortKey = 'recent' | 'old' | 'name' | 'size'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'old', label: 'Plus anciens' },
  { value: 'name', label: 'Nom (A → Z)' },
  { value: 'size', label: 'Taille' },
]

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
  const [sort, setSort] = useState<SortKey>('recent')
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = files.find((f) => f.documentId === detailId) ?? null
  const [view, setViewState] = useState<'grid' | 'list'>(readView)
  const setView = (v: 'grid' | 'list') => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* stockage indisponible : préférence non retenue */
    }
  }

  const [showUpload, setShowUpload] = useState(false)
  // Type choisi depuis une carte « Logo », « Charte graphique »… : appliqué aux fichiers ajoutés.
  const [presetCategory, setPresetCategory] = useState<Category | null>(null)
  const openUpload = (category?: Category) => {
    setPresetCategory(category ?? null)
    setShowUpload(true)
  }
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

  const summary = useMemo(() => {
    const totalBytes = files.reduce((s, f) => s + fileBytes(f), 0)
    return {
      totalBytes,
      usedPct: Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100),
      shared: files.filter((f) => f.shared).length,
      last: sorted[0],
    }
  }, [files, sorted])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    files.forEach((f) => { c[f.category || 'autre'] = (c[f.category || 'autre'] ?? 0) + 1 })
    return c
  }, [files])

  const dossier = useMemo(() => {
    const logos = files.filter((f) => f.category === 'logo')
    return [
      { key: 'logo', label: 'Un logo', hint: 'Indispensable pour tout marquage', done: logos.length > 0, category: 'logo' as Category },
      {
        key: 'vector',
        label: 'Un logo vectoriel',
        hint: 'AI, EPS, SVG ou PDF : net à toutes les tailles',
        done: logos.some((f) => qualityOf(f)?.level === 'vector'),
        category: 'logo' as Category,
      },
      { key: 'charte', label: 'Votre charte graphique', hint: 'Couleurs (Pantone, HEX) et typographies', done: !!counts.charte, category: 'charte' as Category },
    ]
  }, [files, counts])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = sorted.filter(
      (f) =>
        (filter === 'all' || (f.category || 'autre') === filter) &&
        (!q ||
          f.name.toLowerCase().includes(q) ||
          f.file?.name?.toLowerCase().includes(q) ||
          f.notes?.toLowerCase().includes(q)),
    )
    if (sort === 'old') return [...list].reverse()
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    if (sort === 'size') return [...list].sort((a, b) => fileBytes(b) - fileBytes(a))
    return list
  }, [sorted, filter, search, sort])

  const handleSave = async (
    cf: ClientFile,
    patch: { name: string; category: Category; notes: string; shared: boolean },
  ): Promise<boolean> => {
    try {
      await apiUpdateClientFile(cf.documentId, patch)
      setFiles((prev) => prev.map((f) => (f.documentId === cf.documentId ? { ...f, ...patch } : f)))
      toast.success('Modifications enregistrées')
      return true
    } catch {
      toast.error("Les modifications n'ont pas pu être enregistrées")
      return false
    }
  }

  const copyLink = async (cf: ClientFile) => {
    try {
      await navigator.clipboard.writeText(fileUrl(cf.file))
      toast.success('Lien copié')
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

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
        category: presetCategory ?? guessCategory(file),
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
    setPresetCategory(null)
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
      setPresetCategory(null)
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
      if (detailId === cf.documentId) setDetailId(null)
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
    <Container className="pb-28">
      <div {...dragHandlers} className="relative min-h-[60vh]">
        {/* EN-TÊTE */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Mes fichiers</h1>
            <p className="text-sm text-white/40 mt-1 max-w-xl">
              Logos, chartes graphiques et documents à utiliser pour vos commandes. Les fichiers
              partagés sont accessibles à l’équipe PEG et aux producteurs de vos projets.
            </p>
          </div>
          <button
            onClick={() => openUpload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/25"
          >
            <HiOutlineUpload className="w-4 h-4" />
            Envoyer des fichiers
          </button>
        </div>

        {/* RÉSUMÉ */}
        {!loading && files.length > 0 && (
          <div className="grid gap-2 sm:gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}>
            <SummaryItem
              icon={<HiOutlineFolder className="w-5 h-5" />}
              color="#a78bfa"
              label="Fichiers"
              value={String(files.length)}
              sub={CATEGORIES.filter((c) => counts[c.value]).map((c) => `${counts[c.value]} ${counts[c.value] > 1 ? c.plural : c.label.toLowerCase()}`).join(' · ')}
            />
            <SummaryItem
              icon={<HiOutlineCloud className="w-5 h-5" />}
              color="#60a5fa"
              label="Espace utilisé"
              value={formatStorage(summary.totalBytes)}
              sub={`sur 10 Go`}
              bar={summary.usedPct}
            />
            <SummaryItem
              icon={<HiOutlineShare className="w-5 h-5" />}
              color="#34d399"
              label="Partagés avec l'atelier"
              value={`${summary.shared} / ${files.length}`}
              sub="Accessibles aux producteurs"
            />
            <SummaryItem
              icon={<HiOutlineClock className="w-5 h-5" />}
              color="#fbbf24"
              label="Dernier ajout"
              value={summary.last ? timeAgo(summary.last.createdAt) : '—'}
              sub={summary.last?.name ?? ''}
            />
          </div>
        )}

        {/* DOSSIER : CE QUI MANQUE */}
        {!loading && files.length > 0 && dossier.some((d) => !d.done) && (
          <DossierPanel items={dossier} onAdd={openUpload} />
        )}

        {/* RECHERCHE + FILTRES */}
        {files.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                enterKeyHint="search" placeholder="Rechercher un fichier"
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier les fichiers"
              className="ml-auto bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 outline-none focus:border-indigo-500/40"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>
              ))}
            </select>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              <ViewButton active={view === 'grid'} onClick={() => setView('grid')} label="Vue en grille">
                <HiOutlineViewGrid className="w-4 h-4" />
              </ViewButton>
              <ViewButton active={view === 'list'} onClick={() => setView('list')} label="Vue en liste">
                <HiOutlineViewList className="w-4 h-4" />
              </ViewButton>
            </div>
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
          <EmptyState onUpload={openUpload} />
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-12">Aucun fichier ne correspond à votre recherche.</p>
        ) : view === 'list' ? (
          <FileList
            files={visible}
            onOpen={(f) => setDetailId(f.documentId)}
            onPreview={setPreview}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {visible.map((f) => (
              <FileCard
                key={f.documentId}
                file={f}
                onOpen={() => setDetailId(f.documentId)}
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
          preset={presetCategory}
        />
      )}

      {/* FICHE DÉTAILLÉE */}
      {detail && (
        <FileDetail
          key={detail.documentId}
          file={detail}
          onClose={() => setDetailId(null)}
          onPreview={() => setPreview(detail)}
          onDownload={() => handleDownload(detail)}
          onCopyLink={() => copyLink(detail)}
          onDelete={() => handleDelete(detail)}
          onSave={(patch) => handleSave(detail, patch)}
        />
      )}

      {/* APERÇU */}
      {preview && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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

/* Ce que PEG attend du client, type par type — sert de guide quand la bibliothèque est vide. */
const STARTERS: { category: Category; icon: React.ReactNode; title: string; text: string; formats: string }[] = [
  {
    category: 'logo',
    icon: <HiOutlinePhotograph className="w-5 h-5" />,
    title: 'Logo',
    text: 'La base de tout marquage : broderie, impression, gravure.',
    formats: 'Idéal : AI, EPS, SVG, PDF · sinon PNG HD sur fond transparent',
  },
  {
    category: 'charte',
    icon: <HiOutlineColorSwatch className="w-5 h-5" />,
    title: 'Charte graphique',
    text: 'Vos couleurs (Pantone, HEX) et typographies, pour un rendu fidèle.',
    formats: 'PDF de préférence',
  },
  {
    category: 'brief',
    icon: <HiOutlineClipboardList className="w-5 h-5" />,
    title: 'Brief',
    text: 'Maquette, emplacement et taille du marquage, quantités souhaitées.',
    formats: 'PDF, Word, image',
  },
  {
    category: 'asset',
    icon: <HiOutlineCollection className="w-5 h-5" />,
    title: 'Asset',
    text: 'Photos, pictogrammes, slogans et autres visuels complémentaires.',
    formats: 'Tous formats',
  },
]

const EmptyState = ({ onUpload }: { onUpload: (category?: Category) => void }) => (
  <div className="space-y-5">
    {/* Invitation principale */}
    <button
      onClick={() => onUpload()}
      className="w-full rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-indigo-500/[0.04] transition p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)' }}
    >
      <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-300 shrink-0">
        <HiOutlineUpload className="w-8 h-8" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-lg font-bold text-white">Constituez votre dossier graphique</span>
        <span className="block text-sm text-white/50 mt-1 leading-relaxed">
          Envoyez une fois vos logos et votre charte : ils serviront à toutes vos commandes, sans avoir à
          les renvoyer. Cliquez ici ou glissez vos fichiers n’importe où sur la page.
        </span>
      </span>
      <span className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/25">
        <HiOutlineUpload className="w-4 h-4" /> Choisir des fichiers
      </span>
    </button>

    {/* Ce dont PEG a besoin */}
    <div>
      <h2 className="text-base font-bold text-white mb-1">Ce dont nous avons besoin</h2>
      <p className="text-xs text-white/40 mb-3">Choisissez un type : vos fichiers seront classés directement.</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        {STARTERS.map((st) => {
          const c = categoryOf(st.category)
          return (
            <button
              key={st.category}
              onClick={() => onUpload(st.category)}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition p-4 text-left flex flex-col gap-2"
            >
              <span className="flex items-center justify-between">
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{ background: `${c.color}1f`, color: c.color }}
                >
                  {st.icon}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-white/40 group-hover:text-white/80 transition">
                  <HiOutlinePlus className="w-3.5 h-3.5" /> Ajouter
                </span>
              </span>
              <span className="text-sm font-bold text-white">{st.title}</span>
              <span className="text-xs text-white/50 leading-relaxed">{st.text}</span>
              <span className="mt-auto pt-1 text-[11px] text-white/35">{st.formats}</span>
            </button>
          )
        })}
      </div>
    </div>

    {/* Repères */}
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
      {[
        { icon: <HiOutlineRefresh className="w-5 h-5" />, color: '#a78bfa', title: 'Réutilisables', text: 'Vos fichiers restent disponibles pour toutes vos prochaines commandes.' },
        { icon: <HiOutlineShare className="w-5 h-5" />, color: '#34d399', title: 'Partagés avec l’atelier', text: 'Les producteurs de vos projets y accèdent directement, sans échange d’e-mails.' },
        { icon: <HiOutlineCloud className="w-5 h-5" />, color: '#60a5fa', title: '10 Go d’espace', text: 'Envoyez plusieurs fichiers d’un coup, jusqu’aux fichiers sources volumineux.' },
      ].map((r) => (
        <div key={r.title} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: `${r.color}1f`, color: r.color }}>
            {r.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white/85">{r.title}</span>
            <span className="block text-xs text-white/40 mt-0.5 leading-relaxed">{r.text}</span>
          </span>
        </div>
      ))}
    </div>
  </div>
)

const DossierPanel = ({
  items,
  onAdd,
}: {
  items: { key: string; label: string; hint: string; done: boolean; category: Category }[]
  onAdd: (category?: Category) => void
}) => {
  const done = items.filter((i) => i.done).length
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 mb-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-bold text-white">
          Votre dossier graphique <span className="text-white/40 font-medium">· {done}/{items.length} complet</span>
        </p>
        <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden shrink-0">
          <div className="h-full rounded-full bg-amber-400" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        {items.map((i) => (
          <div key={i.key} className="flex items-center gap-2.5 rounded-xl bg-black/15 px-3 py-2.5 min-w-0">
            {i.done ? (
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-dashed border-amber-300/60 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className={`block text-xs font-semibold ${i.done ? 'text-white/50 line-through' : 'text-white/85'}`}>{i.label}</span>
              {!i.done && <span className="block text-[11px] text-white/40 truncate">{i.hint}</span>}
            </span>
            {!i.done && (
              <button
                onClick={() => onAdd(i.category)}
                className="shrink-0 text-xs font-semibold text-amber-200 hover:text-amber-100 px-2 py-1 rounded-lg hover:bg-amber-400/10 transition"
              >
                Ajouter
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

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

const SummaryItem = ({
  icon,
  color,
  label,
  value,
  sub,
  bar,
}: {
  icon: React.ReactNode
  color: string
  label: string
  value: string
  sub: string
  bar?: number
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 flex items-center gap-3 min-w-0">
    <span
      className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
      style={{ background: `${color}1f`, color }}
    >
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-white/40 font-medium">{label}</p>
      <p className="text-lg font-bold text-white leading-tight truncate">{value}</p>
      {bar !== undefined && (
        <div className="h-1 rounded-full bg-white/[0.07] mt-1.5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.max(bar, bar > 0 ? 2 : 0)}%`, background: color }} />
        </div>
      )}
      {sub && <p className="text-[11px] text-white/30 truncate mt-0.5" title={sub}>{sub}</p>}
    </div>
  </div>
)

const CategoryBadge = ({ category }: { category?: string }) => {
  const c = categoryOf(category)
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: c.color, background: `${c.color}14`, borderColor: `${c.color}40` }}
    >
      {c.label}
    </span>
  )
}

const SharedBadge = ({ shared }: { shared: boolean }) =>
  shared ? (
    <span
      title="Accessible à l'équipe PEG et aux producteurs de vos projets"
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
    >
      <HiOutlineShare className="w-3 h-3" /> Partagé
    </span>
  ) : (
    <span
      title="Visible par vous et l'équipe PEG uniquement — les producteurs ne le voient pas"
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-white/50"
    >
      <HiOutlineLockClosed className="w-3 h-3" /> Non partagé
    </span>
  )

const ViewButton = ({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`p-1.5 rounded-lg transition ${active ? 'bg-indigo-500/25 text-indigo-200' : 'text-white/40 hover:text-white/80'}`}
  >
    {children}
  </button>
)

const QualityBadge = ({ file }: { file: ClientFile }) => {
  const q = qualityOf(file)
  if (!q) return null
  return (
    <span
      title={q.detail}
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: q.color, background: `${q.color}14`, borderColor: `${q.color}40` }}
    >
      {q.label}
    </span>
  )
}

const dimensionsOf = (f: ClientFile) =>
  f.file?.width && f.file?.height ? `${f.file.width} × ${f.file.height} px` : null

const FileList = ({
  files,
  onOpen,
  onPreview,
  onDownload,
  onDelete,
}: {
  files: ClientFile[]
  onOpen: (f: ClientFile) => void
  onPreview: (f: ClientFile) => void
  onDownload: (f: ClientFile) => void
  onDelete: (f: ClientFile) => void
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
    {/* En-têtes de colonnes — masqués sur petit écran, où chaque ligne s'empile */}
    <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_150px_130px_110px_150px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wide text-white/35">
      <span>Nom</span>
      <span>Type · qualité</span>
      <span>Format · taille</span>
      <span>Ajouté le</span>
      <span className="text-right">Actions</span>
    </div>
    {files.map((f) => {
      const img = isImage(f.file)
      const ext = extOf(f)
      const dims = dimensionsOf(f)
      return (
        <div
          key={f.documentId}
          className="grid grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_150px_130px_110px_150px] gap-x-3 gap-y-1 items-center px-4 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition"
        >
          <button onClick={() => onOpen(f)} title="Voir le détail" className="flex items-center gap-3 min-w-0 text-left">
            <span className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
              {img ? (
                <img src={fileUrl(f.file)} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
              ) : (
                <span className="text-[9px] font-bold text-indigo-200">{ext.slice(0, 4)}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white/90 truncate">{f.name}</span>
              <span className="block text-[11px] text-white/35 truncate">
                {f.file?.name ?? ext}
                {f.shared ? <span className="text-emerald-300/80"> · Partagé</span> : <span> · Non partagé</span>}
                {f.notes && <span className="italic"> · « {f.notes} »</span>}
              </span>
              {/* Détails repliés sous le nom sur petit écran */}
              <span className="xl:hidden flex items-center gap-1.5 flex-wrap text-[11px] text-white/40 mt-0.5">
                <span>{categoryOf(f.category).label} · {ext} · {formatSize(fileBytes(f))} · {formatDate(f.createdAt)}</span>
                <QualityBadge file={f} />
              </span>
            </span>
          </button>
          <span className="hidden xl:flex flex-col items-start gap-1">
            <CategoryBadge category={f.category} />
            <QualityBadge file={f} />
          </span>
          <span className="hidden xl:block text-xs text-white/60">
            {ext} · {formatSize(fileBytes(f))}
            {dims && <span className="block text-[11px] text-white/35">{dims}</span>}
          </span>
          <span className="hidden xl:block text-xs text-white/60">{formatDate(f.createdAt)}</span>
          <div className="flex items-center justify-end gap-0.5">
            <IconAction label="Détails" onClick={() => onOpen(f)}><HiOutlineInformationCircle className="w-4 h-4" /></IconAction>
            {img && (
              <IconAction label="Aperçu" onClick={() => onPreview(f)}><HiOutlineEye className="w-4 h-4" /></IconAction>
            )}
            <IconAction label="Télécharger" onClick={() => onDownload(f)}><HiOutlineDownload className="w-4 h-4" /></IconAction>
            <IconAction label="Supprimer" onClick={() => onDelete(f)} danger><HiOutlineTrash className="w-4 h-4" /></IconAction>
          </div>
        </div>
      )
    })}
  </div>
)

const FileCard = ({
  file: f,
  onOpen,
  onPreview,
  onDownload,
  onDelete,
}: {
  file: ClientFile
  onOpen: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}) => {
  const img = isImage(f.file)
  const ext = extOf(f)
  const dims = dimensionsOf(f)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col hover:border-white/20 transition">
      <button
        onClick={onOpen}
        title="Voir le détail"
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
      <div className="p-3 flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={f.category} />
          <QualityBadge file={f} />
          <SharedBadge shared={f.shared} />
        </div>
        <button onClick={onOpen} className="text-left text-sm font-semibold text-white/90 truncate hover:text-white" title={f.name}>
          {f.name}
        </button>
        {f.file?.name && f.file.name !== f.name && (
          <p className="text-[11px] text-white/30 truncate" title={f.file.name}>{f.file.name}</p>
        )}
        <p className="text-[11px] text-white/40">
          {ext} · {formatSize(fileBytes(f))}
          {dims && <> · {dims}</>}
        </p>
        <p className="text-[11px] text-white/40">Ajouté le {formatDate(f.createdAt)}</p>
        {f.notes && (
          <p className="text-[11px] text-white/55 italic line-clamp-2" title={f.notes}>« {f.notes} »</p>
        )}
        <div className="flex items-center gap-1 mt-auto pt-1">
          <IconAction label="Détails" onClick={onOpen}><HiOutlineInformationCircle className="w-4 h-4" /></IconAction>
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
  preset,
}: {
  preset: Category | null
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Envoyer des fichiers"
        className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-white/10 bg-[#11141f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">Envoyer des fichiers</h3>
            {preset && (
              <p className="text-xs text-white/40 mt-0.5">
                Classés comme <strong style={{ color: categoryOf(preset).color }}>{categoryOf(preset).label}</strong> — modifiable pour chaque fichier
              </p>
            )}
          </div>
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
          <div className="flex gap-2 mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
            <HiOutlineLightBulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/55 leading-relaxed">
              Pour un marquage net, privilégiez un logo <strong className="text-white/80">vectoriel</strong>{' '}
              (AI, EPS, SVG ou PDF). À défaut, un PNG en haute définition, idéalement sur fond transparent.
            </p>
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

/**
 * Fiche d'un fichier : aperçu, toutes les informations connues, qualité d'impression, et
 * modification du nom, du type, de la note et du partage (la garde Strapi n'autorise un client
 * qu'à modifier ses propres fichiers).
 */
const FileDetail = ({
  file: f,
  onClose,
  onPreview,
  onDownload,
  onCopyLink,
  onDelete,
  onSave,
}: {
  file: ClientFile
  onClose: () => void
  onPreview: () => void
  onDownload: () => void
  onCopyLink: () => void
  onDelete: () => void
  onSave: (patch: { name: string; category: Category; notes: string; shared: boolean }) => Promise<boolean>
}) => {
  const [name, setName] = useState(f.name)
  const [category, setCategory] = useState<Category>(f.category || 'autre')
  const [notes, setNotes] = useState(f.notes ?? '')
  const [shared, setShared] = useState(!!f.shared)
  const [saving, setSaving] = useState(false)

  const img = isImage(f.file)
  const ext = extOf(f)
  const q = qualityOf(f)
  const dims = dimensionsOf(f)
  const dirty =
    name.trim() !== f.name || category !== (f.category || 'autre') || notes !== (f.notes ?? '') || shared !== !!f.shared

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    if (!name.trim()) {
      toast.warning('Le nom ne peut pas être vide')
      return
    }
    setSaving(true)
    await onSave({ name: name.trim(), category, notes, shared })
    setSaving(false)
  }

  const rows: [string, React.ReactNode][] = [
    ['Fichier d’origine', f.file?.name ?? '—'],
    ['Format', `${ext}${f.file?.mime ? ` (${f.file.mime})` : ''}`],
    ['Taille', formatSize(fileBytes(f))],
    ...(dims ? [['Dimensions', dims] as [string, React.ReactNode]] : []),
    ['Ajouté le', formatDateTime(f.createdAt)],
    ...(f.updatedAt && f.updatedAt !== f.createdAt
      ? [['Modifié le', formatDateTime(f.updatedAt)] as [string, React.ReactNode]]
      : []),
  ]

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={`Détail du fichier ${f.name}`}
        className="h-full w-full max-w-[480px] flex flex-col bg-[#11141f] border-l border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 pb-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35">Détail du fichier</p>
            <h3 className="text-lg font-bold text-white truncate">{f.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-white/30 hover:text-white/70 transition peg-tap-target">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Aperçu */}
          <button
            onClick={img ? onPreview : onDownload}
            title={img ? 'Agrandir' : 'Ouvrir le fichier'}
            className="w-full h-[220px] rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden"
            style={{ background: 'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}
          >
            {img ? (
              <img src={fileUrl(f.file)} alt={f.name} className="max-w-full max-h-full object-contain p-3" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <span className="flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-500/15 text-indigo-200 text-base font-bold">
                  {ext.slice(0, 4)}
                </span>
                <span className="text-xs text-white/40">Cliquer pour ouvrir le fichier</span>
              </span>
            )}
          </button>

          {/* Badges + qualité */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryBadge category={f.category} />
            <QualityBadge file={f} />
            <SharedBadge shared={f.shared} />
          </div>
          {q && (
            <div
              className="rounded-xl border p-3 text-xs leading-relaxed"
              style={{ borderColor: `${q.color}40`, background: `${q.color}0f`, color: 'rgba(255,255,255,0.7)' }}
            >
              <strong style={{ color: q.color }}>Qualité d’impression — {q.label}</strong>
              <br />
              {q.detail}.
            </div>
          )}

          {/* Informations */}
          <dl className="rounded-xl border border-white/10 divide-y divide-white/[0.06]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 px-3 py-2.5">
                <dt className="text-xs text-white/40 shrink-0">{k}</dt>
                <dd className="text-xs text-white/80 text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Modification */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/35">Modifier</p>
            <label className="block">
              <span className="text-xs text-white/50">Nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/50">Type</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="mt-1 w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/50">Note / consigne d’utilisation</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ex. : version blanche à utiliser sur les textiles foncés"
                className="mt-1 w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/40 resize-y"
              />
            </label>
            <button
              type="button"
              onClick={() => setShared(!shared)}
              aria-pressed={shared}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                shared ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <span
                className={`w-9 h-5 rounded-full relative shrink-0 transition ${shared ? 'bg-emerald-500' : 'bg-white/15'}`}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: shared ? 18 : 2 }}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white/85">Partagé avec l’atelier</span>
                <span className="block text-[11px] text-white/40">
                  {shared
                    ? 'Les producteurs de vos projets peuvent utiliser ce fichier.'
                    : 'Seuls vous et l’équipe PEG voyez ce fichier.'}
                </span>
              </span>
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-white/[0.06]">
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-semibold text-white/80 transition"
          >
            <HiOutlineDownload className="w-4 h-4" /> Télécharger
          </button>
          <button
            onClick={onCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-semibold text-white/80 transition"
          >
            <HiOutlineLink className="w-4 h-4" /> Copier le lien
          </button>
          <button
            onClick={onDelete}
            aria-label="Supprimer le fichier"
            title="Supprimer"
            className="flex items-center justify-center w-11 h-11 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] hover:bg-rose-500/15 text-rose-300 transition"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      </aside>
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
