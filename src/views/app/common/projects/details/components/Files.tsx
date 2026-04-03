import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { PegFile } from '@/@types/pegFile';
import { Upload } from '@/components/ui';
import { useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import { updateCurrentProject, useAppSelector } from '../store';
import {
  apiDeleteFile,
  apiGetPegFiles,
  apiUploadFile,
} from '@/services/FileServices';
import { Loading } from '@/components/shared';
import { toast } from 'react-toastify';
import { HiDownload, HiTrash, HiDocumentText, HiArchive, HiCode, HiDocument } from 'react-icons/hi';
import { hasRole } from '@/utils/permissions';
import { CUSTOMER } from '@/constants/roles.constant';

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
const isPdfUrl = (url: string) => /\.pdf$/i.test(url);
const isZipUrl = (url: string) => /\.(zip|rar|7z|tar|gz)$/i.test(url);
const isPsdUrl = (url: string) => /\.(psd|ai|eps|ps)$/i.test(url);
const getFileExtension = (url: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : 'FILE';
};

const beforeUpload = (files: FileList | null) => {
  let valid: string | boolean = true;
  const allowedFileType = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/pdf', 'application/x-pdf',
    'application/zip', 'application/x-zip-compressed',
    'image/vnd.adobe.photoshop', 'application/postscript', 'application/illustrator',
  ];
  if (files) {
    for (const file of files) {
      if (!allowedFileType.includes(file.type)) {
        valid = "Le format du fichier n'est pas pris en compte !";
      }
    }
  }
  return valid;
};

const FileThumbnail = ({ file, canDelete, onRemove }: { file: PegFile; canDelete: boolean; onRemove: (name: string) => void }) => (
  <div
    key={file.id || file.name}
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)')}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
  >
    <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
      {isImageUrl(file.url) ? (
        <img
          src={file.url}
          alt={file.name}
          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '120px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: isPdfUrl(file.url)
            ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)'
            : isZipUrl(file.url)
            ? 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0.04) 100%)'
            : isPsdUrl(file.url)
            ? 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          gap: '6px',
        }}>
          {isPdfUrl(file.url) ? (
            <HiDocumentText size={36} style={{ color: '#f87171' }} />
          ) : isZipUrl(file.url) ? (
            <HiArchive size={36} style={{ color: '#facc15' }} />
          ) : isPsdUrl(file.url) ? (
            <HiCode size={36} style={{ color: '#60a5fa' }} />
          ) : (
            <HiDocument size={36} style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
            color: isPdfUrl(file.url) ? '#f87171'
              : isZipUrl(file.url) ? '#facc15'
              : isPsdUrl(file.url) ? '#60a5fa'
              : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
          }}>
            {getFileExtension(file.url)}
          </span>
        </div>
      )}
    </a>
    <div style={{ padding: '8px 10px' }}>
      <p style={{
        color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        margin: '0 0 6px',
      }}>
        {file.name}
      </p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '26px', height: '26px', borderRadius: '6px',
            background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
            color: '#6b9eff', textDecoration: 'none',
          }}
        >
          <HiDownload size={12} />
        </a>
        {canDelete && (
          <button
            onClick={() => onRemove(file.name)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '26px', height: '26px', borderRadius: '6px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', cursor: 'pointer',
            }}
          >
            <HiTrash size={12} />
          </button>
        )}
      </div>
    </div>
  </div>
);

const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

const Files = () => {
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [pegFilesIdToDelete, setPegFilesIdToDelete] = useState<string[]>([]);
  const [pegFilesChanged, setPegFilesChanged] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const [myFileIds, setMyFileIds] = useState<string[]>([]);
  const dispatch = useAppDispatch();
  const { project } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const { user } = useRootAppSelector((state) => state.auth.user);
  const isCustomer = hasRole(user, [CUSTOMER]);
  const userId = user?.documentId || user?.id || user?._id;

  useEffect(() => {
    fetchFiles();
  }, [project]);

  // Load file ownership from backend
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

  const fetchFiles = async (): Promise<void> => {
    setFilesLoading(true);
    if (project?.images?.length > 0) {
      const pegFilesLoaded: PegFile[] = await apiGetPegFiles(project.images);
      setPegFiles(pegFilesLoaded.map((f) => ({ ...f, file: new File([], f.name) })));
    } else {
      setPegFiles([]);
    }
    setFilesLoading(false);
  };

  const onFileAdd = (file: File) => {
    setPegFiles((prev) => [...prev, { file, name: file.name } as PegFile]);
    setPegFilesChanged(true);
  };

  const onFileRemove = (fileName: string) => {
    const f = pegFiles.find(({ name }) => name === fileName);
    if (f) {
      setPegFilesIdToDelete((prev) => [...prev, f.id]);
      setPegFiles((prev) => prev.filter(({ name }) => name !== fileName));
      setPegFilesChanged(true);
    }
  };

  const handleSubmit = async () => {
    setFilesLoading(true);
    try {
      const newPegFiles: PegFile[] = [];
      const newlyUploadedIds: string[] = [];
      for (const pf of pegFiles) {
        if (pf.id) {
          newPegFiles.push(pf);
        } else {
          const uploaded = await apiUploadFile(pf.file);
          newPegFiles.push(uploaded);
          if (isCustomer) newlyUploadedIds.push(uploaded.id);
        }
      }
      if (isCustomer && newlyUploadedIds.length > 0) {
        setMyFileIds((prev) => [...prev, ...newlyUploadedIds]);
        fetch(`${PEG_BACKEND_URL}/projects/files/ownership`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: newlyUploadedIds, projectId: project.documentId, userId }),
        }).catch((err) => console.error('[FileOwnership] POST error:', err));
      }

      for (const id of pegFilesIdToDelete) {
        apiDeleteFile(id);
      }

      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: newPegFiles.map(({ id }) => id) as unknown as PegFile[],
        })
      );
      setPegFilesChanged(false);
      toast.success('Fichiers enregistrés');
    } catch (err) {
      console.error('Erreur upload fichiers:', err);
      toast.error("Erreur lors de l'enregistrement des fichiers");
    } finally {
      setFilesLoading(false);
    }
  };

  const existingFiles = pegFiles.filter((f) => f.url);

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <Loading loading={filesLoading}>
            <Upload
              multiple
              showList={false}
              draggable
              beforeUpload={beforeUpload}
              onFileAdd={(file) => onFileAdd(file)}
              onFileRemove={(file) => onFileRemove(file)}
              field={{ name: 'images' }}
              fileList={pegFiles.map((pf) => {
                const file = pf.file as File & { previewUrl?: string };
                file.previewUrl = pf.url;
                return file;
              })}
              clickable
            />

            {existingFiles.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Fichiers ({existingFiles.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {existingFiles.map((file) => (
                    <FileThumbnail key={file.id || file.name} file={file} canDelete={isCustomer ? (!file.id || myFileIds.includes(file.id)) : true} onRemove={onFileRemove} />
                  ))}
                </div>
              </div>
            )}

            {pegFilesChanged && (
              <div style={{ marginTop: '16px' }}>
                <Button variant="solid" onClick={handleSubmit} loading={filesLoading}>
                  Enregistrer
                </Button>
              </div>
            )}
          </Loading>
        </div>
        <DetailsRight />
      </div>

    </Container>
  );
};

export default Files;
