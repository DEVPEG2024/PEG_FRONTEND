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
  HiOutlineFolderOpen,
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

// Affichage adaptatif Ko/Mo/Go — évite d'arrondir quelques Mo à « 0 Go »
function formatStorage(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 o'
  const KB = 1024, MB = KB * 1024, GB = MB * 1024
  if (bytes < MB) return `${Math.round(bytes / KB)} Ko`
  if (bytes < GB) return `${(bytes / MB).toFixed(1).replace('.', ',')} Mo`
  return `${(bytes / GB).toFixed(2).replace('.', ',')} Go`
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
      { key: 'logos', label: 'Logos', count: logos, icon: <HiOutlineFolder className="w-6 h-6" />, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
      { key: 'chartes', label: 'Chartes graphiques', count: chartes, icon: <HiOutlineColorSwatch className="w-6 h-6" />, color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
      { key: 'photos', label: 'Photos', count: photos, icon: <HiOutlinePhotograph className="w-6 h-6" />, color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
      { key: 'videos', label: 'Vidéos', count: videos, icon: <HiOutlineVideoCamera className="w-6 h-6" />, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
      { key: 'documents', label: 'Documents', count: documents, icon: <HiOutlineDocument className="w-6 h-6" />, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
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
      <Container>
        <div className="text-center py-20">
          <p className="text-white/40">Aucun compte client associé.</p>
        </div>
      </Container>
    )
  }

  const isEmpty = !loading && files.length === 0

  return (
    <Container className="pb-10">
      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes fichiers</h1>
          <p className="text-sm text-white/40 mt-1 max-w-xl">
            Gérez vos logos, chartes graphiques et documents. Les fichiers partagés
            seront accessibles par les producteurs assignés à vos projets.
          </p>
        </div>
        <button
          onClick={() => openUploadWith()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/25"
        >
          <HiOutlineUpload className="w-4 h-4" />
          Ajouter un fichier
        </button>
      </div>

      {/* HERO + STORAGE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Hero */}
        <div
          className="xl:col-span-2 relative overflow-hidden rounded-2xl border border-white/10 p-8"
          style={{
            background:
              'radial-gradient(120% 140% at 80% 10%, rgba(99,102,241,0.28) 0%, rgba(79,70,229,0.10) 35%, rgba(15,18,32,0.4) 70%), linear-gradient(160deg, #14172a 0%, #0d1020 100%)',
          }}
        >
          <div className="relative z-10 max-w-md">
            <p className="text-[11px] font-bold tracking-[0.18em] text-indigo-300 mb-3">
              VOS FICHIERS
            </p>
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              CENTRALISÉS.{' '}
              <span className="text-indigo-400">SÉCURISÉS.</span>
            </h2>
            <p className="text-sm text-white/50 mt-4 leading-relaxed">
              Logos, chartes graphiques, photos, vidéos et documents accessibles à
              tout moment.
            </p>
          </div>
          {/* Decorative folder illustration */}
          <FolderArt />
        </div>

        {/* Storage */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300">
              <HiOutlineCloud className="w-5 h-5" />
            </span>
            <span className="text-sm font-semibold text-white/80">Stockage utilisé</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <Donut pct={stats.usedPct} />
            <div className="mt-4 text-center">
              <p className="text-base font-bold text-white">
                {formatStorage(stats.totalBytes)}{' '}
                <span className="text-white/30 font-medium">/ 10 Go</span>
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Espace disponible : {formatStorage(STORAGE_LIMIT_BYTES - stats.totalBytes)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLibrary(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm text-white/70 font-medium transition"
          >
            Gérer le stockage <HiOutlineChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
        <StatCard
          icon={<HiOutlineFolder className="w-5 h-5" />}
          color="#a78bfa"
          bg="rgba(167,139,250,0.12)"
          label="Total fichiers"
          value={loading ? '—' : String(stats.total)}
          sub="Fichiers au total"
        />
        <StatCard
          icon={<HiOutlineChartPie className="w-5 h-5" />}
          color="#60a5fa"
          bg="rgba(96,165,250,0.12)"
          label="Taille utilisée"
          value={loading ? '—' : formatStorage(stats.totalBytes)}
          sub="Sur 10 Go"
        />
        <StatCard
          icon={<HiOutlineShare className="w-5 h-5" />}
          color="#4ade80"
          bg="rgba(74,222,128,0.12)"
          label="Partagés"
          value={loading ? '—' : String(stats.shared)}
          sub="Fichiers partagés"
        />
        <StatCard
          icon={<HiOutlineClock className="w-5 h-5" />}
          color="#fbbf24"
          bg="rgba(251,191,36,0.12)"
          label="Dernier ajout"
          value={loading ? '—' : stats.last ? timeAgo(stats.last.createdAt) : 'Aucun'}
          sub={stats.last ? stats.last.name : 'Aucun fichier ajouté'}
        />
      </div>

      {/* QUICK ACCESS + EMPTY/PREVIEW */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        {/* Accès rapide */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Accès rapide</h3>
            <button
              onClick={() => setShowLibrary(true)}
              className="text-white/40 hover:text-white/80 transition"
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {quickAccess.map((q) => (
              <button
                key={q.key}
                onClick={() => setShowLibrary(true)}
                className="flex flex-col items-center text-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition"
              >
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{ background: q.bg, color: q.color }}
                >
                  {q.icon}
                </span>
                <span className="text-[12px] font-semibold text-white/80 leading-tight">
                  {q.label}
                </span>
                <span className="text-[10px] text-white/35">
                  {q.count} fichier{q.count > 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Empty / drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDropFile}
          className={`rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center text-center transition ${
            dragOver
              ? 'border-indigo-400/60 bg-indigo-500/[0.06]'
              : 'border-white/15 bg-white/[0.01]'
          }`}
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-300 mb-4">
            <HiOutlineInbox className="w-8 h-8" />
          </span>
          <p className="text-base font-bold text-white">
            {isEmpty ? 'Vos fichiers apparaîtront ici' : `${stats.total} fichier${stats.total > 1 ? 's' : ''} dans votre bibliothèque`}
          </p>
          <p className="text-xs text-white/40 mt-1.5 max-w-xs">
            {isEmpty
              ? 'Ajoutez votre premier fichier pour commencer à constituer votre bibliothèque.'
              : 'Ajoutez un nouveau fichier ou parcourez votre bibliothèque.'}
          </p>
          <button
            onClick={() => openUploadWith()}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/25"
          >
            <HiOutlineUpload className="w-4 h-4" />
            Ajouter un fichier
          </button>
          <p className="text-[11px] text-white/30 mt-3">
            ou glisser-déposer un fichier ici
          </p>
        </div>
      </div>

      {/* RECENT FILES + ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Fichiers récents */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Fichiers récents</h3>
            <button
              onClick={() => setShowLibrary(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              Voir tout
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-white/[0.06]" />
                    <div className="h-2 w-20 rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="text-center py-12">
              <HiOutlineFolderOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/50 font-medium">Aucun fichier pour le moment.</p>
              <p className="text-xs text-white/30 mt-1">
                Ajoutez votre premier fichier ou explorez votre bibliothèque.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.recent.map((f) => {
                const url = fileUrl(f.file)
                return (
                  <div
                    key={f.documentId}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition"
                  >
                    {isImage(f.file) ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] shrink-0">
                        <img src={url} alt={f.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <HiOutlineDocumentText className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/80 truncate">{f.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span>{f.file?.ext?.replace('.', '').toUpperCase()}</span>
                        <span>·</span>
                        <span>{formatSize(clientFileBytes(f.file))}</span>
                        <span>·</span>
                        <span>{timeAgo(f.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Activité récente</h3>
            <button
              onClick={() => setShowLibrary(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              Voir tout
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-10 rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="text-center py-12">
              <TbActivity className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/50 font-medium">Aucune activité récente</p>
              <p className="text-xs text-white/30 mt-1">
                Les dernières actions sur vos fichiers apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent.map((f) => (
                <div key={f.documentId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/12 text-emerald-400 shrink-0">
                    <HiOutlineUpload className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0 text-sm text-white/70">
                    <span className="text-white/85 font-medium">{f.name}</span> ajouté
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">{timeAgo(f.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={resetUpload}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11141f] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Ajouter un fichier</h3>
              <button onClick={resetUpload} className="text-white/30 hover:text-white/70 transition">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropFile}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition ${
                dragOver ? 'border-indigo-400/60 bg-indigo-500/[0.05]' : 'border-white/10 hover:border-indigo-500/30'
              }`}
            >
              {uploadFile ? (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <HiOutlineDocumentText className="w-5 h-5 text-indigo-400" />
                  {uploadFile.name}
                  <span className="text-[10px] text-white/30">({formatSize(uploadFile.size)})</span>
                </div>
              ) : (
                <>
                  <HiOutlineUpload className="w-7 h-7 text-white/20" />
                  <span className="text-xs text-white/40">Cliquer ou glisser-déposer un fichier</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelect} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Nom du fichier"
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/40 transition"
              />
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40 transition"
              >
                {UPLOAD_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-gray-900">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadName.trim()}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
            >
              {uploading ? 'Envoi…' : 'Enregistrer le fichier'}
            </button>
          </div>
        </div>
      )}

      {/* LIBRARY MODAL (gestion complète) */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => {
            setShowLibrary(false)
            fetchFiles()
          }}
        >
          <div
            className="w-full max-w-3xl my-8 rounded-2xl border border-white/10 bg-[#11141f] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Ma bibliothèque</h3>
              <button
                onClick={() => {
                  setShowLibrary(false)
                  fetchFiles()
                }}
                className="text-white/30 hover:text-white/70 transition"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <ClientFilesPanel customerDocumentId={customerDocumentId} mode="customer" />
          </div>
        </div>
      )}
    </Container>
  )
}

/* ---------- Sub components ---------- */

const StatCard = ({
  icon,
  color,
  bg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  color: string
  bg: string
  label: string
  value: string
  sub: string
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4">
    <span
      className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
      style={{ background: bg, color }}
    >
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[11px] text-white/40 font-medium">{label}</p>
      <p className="text-2xl font-bold text-white leading-tight truncate">{value}</p>
      <p className="text-[11px] text-white/30 truncate">{sub}</p>
    </div>
  </div>
)

const Donut = ({ pct }: { pct: number }) => {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="relative w-[130px] h-[130px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{pct > 0 && pct < 1 ? '<1' : Math.round(pct)}%</span>
      </div>
    </div>
  )
}

const FolderArt = () => (
  <div className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 w-[260px] h-[200px] z-0 pointer-events-none">
    {/* Folder body */}
    <div
      className="absolute right-6 bottom-4 w-[170px] h-[120px] rounded-2xl"
      style={{
        background: 'linear-gradient(160deg, #6366f1 0%, #4338ca 100%)',
        boxShadow: '0 20px 50px rgba(79,70,229,0.4)',
      }}
    />
    <div
      className="absolute right-6 bottom-[104px] w-[80px] h-[24px] rounded-t-xl"
      style={{ background: 'linear-gradient(160deg, #818cf8 0%, #6366f1 100%)' }}
    />
    {/* File badges */}
    <Badge label="PNG" color="#7c3aed" style={{ right: 150, top: 30 }} />
    <Badge label="Ai" color="#1f2937" accent="#f59e0b" style={{ right: 120, bottom: 18 }} />
    <Badge label="PDF" color="#dc2626" style={{ right: 0, top: 10 }} />
    <Badge label="DOC" color="#2563eb" style={{ right: 56, top: -4 }} />
    {/* Check */}
    <div
      className="absolute flex items-center justify-center w-8 h-8 rounded-full text-white text-sm"
      style={{ right: 24, bottom: 8, background: '#3b82f6', boxShadow: '0 6px 16px rgba(59,130,246,0.5)' }}
    >
      ✓
    </div>
  </div>
)

const Badge = ({
  label,
  color,
  accent,
  style,
}: {
  label: string
  color: string
  accent?: string
  style: React.CSSProperties
}) => (
  <div
    className="absolute flex items-center justify-center rounded-xl text-white text-[11px] font-bold"
    style={{
      width: 44,
      height: 44,
      background: color,
      boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
      ...(accent ? { color: accent } : {}),
      ...style,
    }}
  >
    {label}
  </div>
)

export default MyFiles
