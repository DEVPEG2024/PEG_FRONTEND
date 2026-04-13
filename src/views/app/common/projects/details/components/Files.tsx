import { useEffect, useState, useRef } from 'react';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { PegFile } from '@/@types/pegFile';
import { useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import { updateCurrentProject, useAppSelector } from '../store';
import {
  apiDeleteFile,
  apiGetPegFiles,
  apiUploadFile,
} from '@/services/FileServices';
import { toast } from 'react-toastify';
import {
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineFolder,
  HiOutlinePhotograph,
  HiOutlineDocumentText,
  HiOutlineX,
} from 'react-icons/hi';
import { hasRole } from '@/utils/permissions';
import { CUSTOMER } from '@/constants/roles.constant';

/* ── Helpers ── */
const isImageFile = (name: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);
const isPdf = (name: string) => /\.pdf$/i.test(name);
const isZip = (name: string) => /\.(zip|rar|7z|tar|gz)$/i.test(name);
const isPsd = (name: string) => /\.(psd|ai|eps|ps)$/i.test(name);
const getExt = (name: string) => {
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toUpperCase() : 'FILE';
};

const formatSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const getFileTypeConfig = (name: string): { label: string; icon: React.ReactNode; colorClass: string } => {
  if (isImageFile(name)) return { label: 'Image', icon: <HiOutlinePhotograph className="w-4 h-4" />, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  if (isPdf(name)) return { label: 'PDF', icon: <HiOutlineDocumentText className="w-4 h-4" />, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  if (isZip(name)) return { label: 'Archive', icon: <HiOutlineFolder className="w-4 h-4" />, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (isPsd(name)) return { label: 'Design', icon: <HiOutlineDocumentText className="w-4 h-4" />, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  return { label: 'Fichier', icon: <HiOutlineDocumentText className="w-4 h-4" />, colorClass: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
};

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
  'application/pdf', 'application/x-pdf',
  'application/zip', 'application/x-zip-compressed',
  'image/vnd.adobe.photoshop', 'application/postscript', 'application/illustrator',
];

const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

const Files = () => {
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myFileIds, setMyFileIds] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user } = useRootAppSelector((state) => state.auth.user);
  const isCustomer = hasRole(user, [CUSTOMER]);
  const userId = user?.documentId || user?.id || user?._id;

  /* ── Load files ── */
  useEffect(() => {
    fetchFiles();
  }, [project]);

  useEffect(() => {
    if (!isCustomer || !project?.documentId) return;
    fetch(`${PEG_BACKEND_URL}/projects/files/ownership/${project.documentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.files) {
          const mine = data.files
            .filter((f: any) => f.user_id === userId)
            .map((f: any) => f.file_id);
          setMyFileIds(mine);
        }
      })
      .catch((err) => console.error('[FileOwnership] GET error:', err));
  }, [isCustomer, project?.documentId, userId]);

  const fetchFiles = async () => {
    setFilesLoading(true);
    if (project?.images?.length > 0) {
      const loaded = await apiGetPegFiles(project.images);
      setPegFiles(loaded);
    } else {
      setPegFiles([]);
    }
    setFilesLoading(false);
  };

  /* ── File select ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (ALLOWED_TYPES.includes(files[i].type)) {
        valid.push(files[i]);
      } else {
        toast.warning(`Format non pris en charge : ${files[i].name}`);
      }
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── Upload pending files ── */
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    try {
      const newPegFiles: PegFile[] = [...pegFiles];
      const newlyUploadedIds: string[] = [];

      for (const file of pendingFiles) {
        const uploaded = await apiUploadFile(file);
        newPegFiles.push(uploaded);
        if (isCustomer) newlyUploadedIds.push(uploaded.id);
      }

      if (isCustomer && newlyUploadedIds.length > 0) {
        setMyFileIds((prev) => [...prev, ...newlyUploadedIds]);
        fetch(`${PEG_BACKEND_URL}/projects/files/ownership`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: newlyUploadedIds, projectId: project.documentId, userId }),
        }).catch((err) => console.error('[FileOwnership] POST error:', err));
      }

      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: newPegFiles.map(({ id }) => id) as unknown as PegFile[],
        })
      );

      setPendingFiles([]);
      toast.success('Fichiers ajoutés !');
    } catch (err) {
      console.error('Erreur upload:', err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete file ── */
  const handleDelete = async (file: PegFile) => {
    if (!confirm(`Supprimer "${file.name}" ?`)) return;
    setFilesLoading(true);
    try {
      apiDeleteFile(file.id);
      const remaining = pegFiles.filter((f) => f.id !== file.id);
      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: remaining.map(({ id }) => id) as unknown as PegFile[],
        })
      );
      toast.success('Fichier supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setFilesLoading(false);
    }
  };

  /* ── Download ── */
  const handleDownload = (file: PegFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const canDelete = (file: PegFile) => {
    if (!isCustomer) return true;
    return !file.id || myFileIds.includes(file.id);
  };

  /* ── Group files by type ── */
  const grouped = pegFiles.reduce<Record<string, PegFile[]>>((acc, f) => {
    const name = f.name || f.url || '';
    const cat = isImageFile(name) ? 'image' : isPdf(name) ? 'pdf' : isZip(name) ? 'zip' : isPsd(name) ? 'psd' : 'autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const categoryOrder = ['image', 'pdf', 'psd', 'zip', 'autre'];
  const categoryLabels: Record<string, string> = { image: 'Images', pdf: 'Documents PDF', psd: 'Fichiers design', zip: 'Archives', autre: 'Autres' };

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '20px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <HiOutlineFolder className="w-5 h-5 text-white/50" />
              <h3 className="text-base font-semibold text-white">Fichiers du projet</h3>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{pegFiles.length}</span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition shadow-lg shadow-cyan-500/15"
            >
              <HiOutlineUpload className="w-3.5 h-3.5" />
              Ajouter un fichier
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf,application/zip,.psd,.ai"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* PENDING FILES (not yet uploaded) */}
          {pendingFiles.length > 0 && (
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">
                  Fichiers à envoyer ({pendingFiles.length})
                </h4>
                <button onClick={() => setPendingFiles([])} className="text-white/30 hover:text-white/60 transition">
                  <HiOutlineX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]">
                    {file.type.startsWith('image/') ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] shrink-0">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <HiOutlineDocumentText className="w-4 h-4 text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/70 truncate">{file.name}</div>
                      <div className="text-[10px] text-white/30">{formatSize(file.size)}</div>
                    </div>
                    <button onClick={() => removePending(idx)} className="p-1 rounded-lg text-white/30 hover:text-rose-400 transition shrink-0">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/15"
                >
                  {uploading ? 'Envoi...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* LOADING */}
          {filesLoading && pegFiles.length === 0 && (
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
          {!filesLoading && pegFiles.length === 0 && pendingFiles.length === 0 && (
            <div className="text-center py-10">
              <HiOutlineFolder className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Aucun fichier pour ce projet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs text-cyan-400/70 hover:text-cyan-300 transition"
              >
                + Ajouter le premier fichier
              </button>
            </div>
          )}

          {/* FILE LIST grouped by type */}
          {!filesLoading && pegFiles.length > 0 && (
            <div className="space-y-5">
              {categoryOrder.filter((cat) => grouped[cat]?.length > 0).map((cat) => {
                const catFiles = grouped[cat];
                const cfg = getFileTypeConfig(cat === 'image' ? 'x.jpg' : cat === 'pdf' ? 'x.pdf' : cat === 'zip' ? 'x.zip' : cat === 'psd' ? 'x.psd' : 'x.txt');
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-md border ${cfg.colorClass}`}>{cfg.icon}</span>
                      <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">{categoryLabels[cat]}</span>
                      <span className="text-[10px] text-white/25">{catFiles.length}</span>
                    </div>

                    <div className="space-y-1.5">
                      {catFiles.map((file) => {
                        const img = isImageFile(file.name || file.url || '');
                        return (
                          <div
                            key={file.id || file.documentId}
                            className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition"
                          >
                            {/* Thumbnail */}
                            {img ? (
                              <button
                                onClick={() => setPreviewUrl(file.url)}
                                className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] shrink-0 hover:border-cyan-500/30 transition"
                              >
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                                <HiOutlineDocumentText className="w-5 h-5 text-white/30" />
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/80 truncate">{file.name}</div>
                              <div className="text-[10px] text-white/30">
                                {getExt(file.name || file.url || '')}
                              </div>
                            </div>

                            {/* Actions (visible on hover) */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                              {img && (
                                <button onClick={() => setPreviewUrl(file.url)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition" title="Aperçu">
                                  <HiOutlineEye className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleDownload(file)} className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.05] transition" title="Télécharger">
                                <HiOutlineDownload className="w-4 h-4" />
                              </button>
                              {canDelete(file) && (
                                <button onClick={() => handleDelete(file)} className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/[0.05] transition" title="Supprimer">
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DetailsRight />
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              <HiOutlineX className="w-5 h-5" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </Container>
  );
};

export default Files;
