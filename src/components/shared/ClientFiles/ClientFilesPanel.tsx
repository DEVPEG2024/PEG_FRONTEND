import { useEffect, useState, useRef } from 'react'
import { toast } from 'react-toastify'
import {
  apiGetClientFiles,
  apiGetSharedClientFiles,
  apiGetCustomerVisibleFiles,
  apiCreateClientFile,
  apiUpdateClientFile,
  apiDeleteClientFile,
  apiUploadFile,
  ClientFile,
} from '@/services/ClientFileServices'
import { env } from '@/configs/env.config'
import {
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineFolder,
  HiOutlinePhotograph,
  HiOutlineDocumentText,
  HiOutlineColorSwatch,
  HiOutlineClipboardList,
  HiOutlinePaperClip,
  HiOutlineX,
  HiOutlineShieldExclamation,
} from 'react-icons/hi'

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  logo: { label: 'Logo', icon: <HiOutlinePhotograph className="w-4 h-4" />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  charte: { label: 'Charte graphique', icon: <HiOutlineColorSwatch className="w-4 h-4" />, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  brief: { label: 'Brief', icon: <HiOutlineClipboardList className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  asset: { label: 'Asset', icon: <HiOutlineFolder className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  autre: { label: 'Autre', icon: <HiOutlinePaperClip className="w-4 h-4" />, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
}

function fileUrl(file: ClientFile['file']): string {
  if (!file?.url) return ''
  if (file.url.startsWith('http')) return file.url
  return (env?.API_ENDPOINT_URL ?? '') + file.url
}

function isImage(file: ClientFile['file']): boolean {
  return file?.mime?.startsWith('image/') ?? false
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface Props {
  customerDocumentId: string
  /** 'admin' = full CRUD, 'customer' = upload + delete own, 'producer' = read-only shared */
  mode: 'admin' | 'customer' | 'producer'
}

export default function ClientFilesPanel({ customerDocumentId, mode }: Props) {
  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload form state
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState<string>('autre')
  const [uploadShared, setUploadShared] = useState(true)
  const [uploadVisibleToCustomer, setUploadVisibleToCustomer] = useState(false)
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const canWrite = mode === 'admin'

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let res
      if (mode === 'customer') {
        res = await apiGetCustomerVisibleFiles(customerDocumentId)
      } else if (mode === 'producer') {
        res = await apiGetSharedClientFiles(customerDocumentId)
      } else {
        res = await apiGetClientFiles(customerDocumentId)
      }
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
  }, [customerDocumentId])

  const resetUploadForm = () => {
    setUploadName('')
    setUploadCategory('autre')
    setUploadShared(true)
    setUploadVisibleToCustomer(false)
    setUploadNotes('')
    setUploadFile(null)
    setShowUpload(false)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.warning('Nom et fichier requis')
      return
    }

    try {
      setUploading(true)

      // 1. Upload file to S3 via Strapi upload plugin (returns array)
      const uploadRes = await apiUploadFile(uploadFile)
      const uploadData = (uploadRes as any)?.data
      const fileEntry = Array.isArray(uploadData) ? uploadData[0] : uploadData
      const fileId = fileEntry?.id

      if (!fileId) {
        toast.error("Erreur lors de l'upload du fichier")
        return
      }

      // 2. Create client-file entry
      await apiCreateClientFile({
        name: uploadName.trim(),
        category: uploadCategory,
        shared: uploadShared,
        visibleToCustomer: uploadVisibleToCustomer,
        notes: uploadNotes.trim(),
        customer: customerDocumentId,
        fileId,
      })

      toast.success('Fichier ajouté !')
      resetUploadForm()
      fetchFiles()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || ''
      toast.error(msg ? `Erreur upload : ${msg}` : "Erreur lors de l'ajout du fichier")
      console.error('[ClientFiles] Upload error:', err?.response?.status, err?.response?.data)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (cf: ClientFile) => {
    if (!confirm(`Supprimer "${cf.name}" ?`)) return
    try {
      await apiDeleteClientFile(cf.documentId)
      toast.success('Fichier supprimé')
      fetchFiles()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleToggleShared = async (cf: ClientFile) => {
    try {
      await apiUpdateClientFile(cf.documentId, { shared: !cf.shared })
      setFiles(prev => prev.map(f => f.documentId === cf.documentId ? { ...f, shared: !f.shared } : f))
      toast.success(cf.shared ? 'Fichier masqué aux producteurs' : 'Fichier partagé avec les producteurs')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleToggleVisibleToCustomer = async (cf: ClientFile) => {
    try {
      await apiUpdateClientFile(cf.documentId, { visibleToCustomer: !cf.visibleToCustomer })
      setFiles(prev => prev.map(f => f.documentId === cf.documentId ? { ...f, visibleToCustomer: !f.visibleToCustomer } : f))
      toast.success(cf.visibleToCustomer ? 'Fichier masqué au client' : 'Fichier visible par le client')
    } catch {
      toast.error('Erreur lors de la mise à jour')
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

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadFile(f)
    if (!uploadName.trim()) {
      // Auto-fill name from filename (without extension)
      const nameWithoutExt = f.name.replace(/\.[^.]+$/, '')
      setUploadName(nameWithoutExt)
    }
    // Auto-detect category from mime
    if (f.type.startsWith('image/')) {
      setUploadCategory('logo')
    }
  }

  // Group files by category
  const grouped = files.reduce<Record<string, ClientFile[]>>((acc, f) => {
    const cat = f.category || 'autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(f)
    return acc
  }, {})

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HiOutlineFolder className="w-5 h-5 text-white/50" />
          <h3 className="text-base font-semibold text-white">
            {mode === 'producer' ? 'Fichiers du client' : 'Fichiers'}
          </h3>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{files.length}</span>
        </div>

        {canWrite && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition shadow-lg shadow-cyan-500/15"
          >
            <HiOutlineUpload className="w-3.5 h-3.5" />
            Ajouter un fichier
          </button>
        )}
      </div>

      {/* UPLOAD FORM */}
      {showUpload && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Nouveau fichier</h4>
            <button onClick={resetUploadForm} className="text-white/30 hover:text-white/60 transition">
              <HiOutlineX className="w-4 h-4" />
            </button>
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-6 cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition"
          >
            {uploadFile ? (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <HiOutlineDocumentText className="w-5 h-5 text-cyan-400" />
                {uploadFile.name}
                <span className="text-[10px] text-white/30">({formatSize(uploadFile.size)})</span>
              </div>
            ) : (
              <>
                <HiOutlineUpload className="w-6 h-6 text-white/20" />
                <span className="text-xs text-white/30">Cliquer pour choisir un fichier</span>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelect} />

          {/* Name + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="Nom du fichier"
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-500/40 transition"
            />
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value)}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40 transition"
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-gray-900">{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <input
            type="text"
            value={uploadNotes}
            onChange={e => setUploadNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-500/40 transition"
          />

          {/* Visibility toggles + Submit */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {mode === 'admin' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setUploadVisibleToCustomer(!uploadVisibleToCustomer)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                    uploadVisibleToCustomer
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-white/[0.03] border-white/10 text-white/40'
                  }`}
                >
                  {uploadVisibleToCustomer ? <HiOutlineEye className="w-3.5 h-3.5" /> : <HiOutlineShieldExclamation className="w-3.5 h-3.5" />}
                  {uploadVisibleToCustomer ? 'Visible par le client' : 'Masqué au client'}
                </button>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadName.trim()}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/15"
            >
              {uploading ? 'Envoi...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <div className="w-10 h-10 rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-white/[0.06]" />
                <div className="h-2 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && files.length === 0 && (
        <div className="text-center py-10">
          <HiOutlineFolder className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">
            {mode === 'producer' ? 'Aucun fichier partagé par ce client' : 'Aucun fichier pour ce client'}
          </p>
          {canWrite && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-3 text-xs text-cyan-400/70 hover:text-cyan-300 transition"
            >
              + Ajouter le premier fichier
            </button>
          )}
        </div>
      )}

      {/* FILE LIST grouped by category */}
      {!loading && files.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catFiles]) => {
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.autre
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-md border ${cfg.color}`}>{cfg.icon}</span>
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">{cfg.label}</span>
                  <span className="text-[10px] text-white/25">{catFiles.length}</span>
                </div>

                <div className="space-y-1.5">
                  {catFiles.map(cf => {
                    const url = fileUrl(cf.file)
                    const img = isImage(cf.file)
                    return (
                      <div
                        key={cf.documentId}
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition"
                      >
                        {/* Thumbnail or icon */}
                        {img ? (
                          <button
                            onClick={() => setPreviewUrl(url)}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] shrink-0 hover:border-cyan-500/30 transition"
                          >
                            <img src={url} alt={cf.name} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                            <HiOutlineDocumentText className="w-5 h-5 text-white/30" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white/80 truncate">{cf.name}</div>
                          <div className="flex items-center gap-2 text-[10px] text-white/30">
                            <span>{cf.file?.ext?.replace('.', '').toUpperCase()}</span>
                            <span>·</span>
                            <span>{formatSize(cf.file?.size ?? 0)}</span>
                            {cf.notes && <><span>·</span><span className="truncate">{cf.notes}</span></>}
                          </div>
                        </div>

                        {/* Visible to customer toggle (admin only) */}
                        {mode === 'admin' && (
                          <button
                            onClick={() => handleToggleVisibleToCustomer(cf)}
                            title={cf.visibleToCustomer ? 'Visible par le client — cliquer pour masquer' : 'Masqué au client — cliquer pour rendre visible'}
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition ${
                              cf.visibleToCustomer
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                                : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/50'
                            }`}
                          >
                            {cf.visibleToCustomer ? '👁 Client' : 'Masqué'}
                          </button>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          {img && (
                            <button onClick={() => setPreviewUrl(url)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition" title="Aperçu">
                              <HiOutlineEye className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDownload(cf)} className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.05] transition" title="Télécharger">
                            <HiOutlineDownload className="w-4 h-4" />
                          </button>
                          {canWrite && (
                            <button onClick={() => handleDelete(cf)} className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/[0.05] transition" title="Supprimer">
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              <HiOutlineX className="w-5 h-5" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
