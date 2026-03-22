import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { PegFile } from '@/@types/pegFile';
import { Upload } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { updateCurrentProject, useAppSelector } from '../store';
import {
  apiDeleteFile,
  apiGetPegFiles,
  apiUploadFile,
} from '@/services/FileServices';
import { Loading } from '@/components/shared';
import { HiDownload, HiTrash, HiPhotograph, HiDocumentText } from 'react-icons/hi';

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);

const Files = () => {
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [pegFilesIdToDelete, setPegFilesIdToDelete] = useState<string[]>([]);
  const [pegFilesChanged, setPegFilesChanged] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { project } = useAppSelector(
    (state) => state.projectDetails.data
  );

  useEffect(() => {
    fetchFiles();
  }, [project]);

  const fetchFiles = async (): Promise<void> => {
    setFilesLoading(true);
    if (project?.images?.length > 0) {
      const pegFilesLoaded: PegFile[] = await apiGetPegFiles(project.images);
      const pegFilesWithFile = pegFilesLoaded.map((pegFile) => ({
        ...pegFile,
        file: new File([], pegFile.name),
      }));
      setPegFiles(pegFilesWithFile);
    }
    setFilesLoading(false);
  };

  const onFileAdd = async (file: File) => {
    setPegFiles([...pegFiles, { file, name: file.name } as PegFile]);
    setPegFilesChanged(true);
  };

  const onFileRemove = (fileName: string) => {
    const pegFileToDelete: PegFile | undefined = pegFiles.find(
      ({ name }) => name === fileName
    );

    if (pegFileToDelete) {
      setPegFilesIdToDelete([...pegFilesIdToDelete, pegFileToDelete.id]);
      setPegFiles(pegFiles.filter(({ name }) => name !== fileName));
      setPegFilesChanged(true);
    }
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

  const handleSubmit = async () => {
    const newPegFiles: PegFile[] = [];

    setFilesLoading(true);
    try {
      for (const pegFile of pegFiles) {
        if (pegFile.id) {
          newPegFiles.push(pegFile);
        } else {
          const pegFileUploaded: PegFile = await apiUploadFile(pegFile.file);
          newPegFiles.push(pegFileUploaded);
        }
      }

      for (const pegFileIdToDelete of pegFilesIdToDelete) {
        apiDeleteFile(pegFileIdToDelete);
      }

      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: newPegFiles.map(({ id }) => id) as unknown as PegFile[],
        })
      );
      setPegFilesChanged(false);
    } finally {
      setFilesLoading(false);
    }
  };

  // Separate existing files (with URL) for thumbnail display
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
            {/* Upload zone */}
            <Upload
              multiple
              showList={false}
              draggable
              beforeUpload={beforeUpload}
              onFileAdd={(file) => onFileAdd(file)}
              onFileRemove={(file) => onFileRemove(file)}
              field={{ name: 'images' }}
              fileList={pegFiles.map((pegFile) => {
                const file = pegFile.file as File & { previewUrl?: string };
                file.previewUrl = pegFile.url;
                return file;
              })}
              clickable
            />

            {/* Thumbnails grid */}
            {existingFiles.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Fichiers ({existingFiles.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {existingFiles.map((file) => (
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
                      {/* Preview */}
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                        {isImageUrl(file.url) ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%', height: '100px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.02)',
                          }}>
                            <HiDocumentText size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                          </div>
                        )}
                      </a>
                      {/* Info */}
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
                          <button
                            onClick={() => onFileRemove(file.name)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: '26px', height: '26px', borderRadius: '6px',
                              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                              color: '#f87171', cursor: 'pointer',
                            }}
                          >
                            <HiTrash size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
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
