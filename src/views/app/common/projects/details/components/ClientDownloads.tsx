import { useEffect, useState } from 'react';
import Container from '@/components/shared/Container';
import { Loading } from '@/components/shared';
import Empty from '@/components/shared/Empty';
import { useAppSelector } from '../store';
import { apiGetPegFiles } from '@/services/FileServices';
import { PegFile } from '@/@types/pegFile';
import { HiDownload, HiDocumentText, HiArchive, HiCode, HiDocument, HiPhotograph } from 'react-icons/hi';
import { GoTasklist } from 'react-icons/go';

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
const isPdfUrl = (url: string) => /\.pdf$/i.test(url);
const isZipUrl = (url: string) => /\.(zip|rar|7z|tar|gz)$/i.test(url);
const isPsdUrl = (url: string) => /\.(psd|ai|eps|ps)$/i.test(url);
const getFileExtension = (url: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : 'FILE';
};

type FileSection = {
  title: string;
  files: PegFile[];
  icon: React.ReactNode;
};

const FileCard = ({ file }: { file: PegFile }) => (
  <div
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
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '6px',
          background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
          color: '#6b9eff', textDecoration: 'none', fontSize: '11px', fontWeight: 600,
        }}
      >
        <HiDownload size={12} />
        Télécharger
      </a>
    </div>
  </div>
);

const ClientDownloads = () => {
  const [loading, setLoading] = useState(true);
  const [projectFiles, setProjectFiles] = useState<PegFile[]>([]);
  const [devisFiles, setDevisFiles] = useState<PegFile[]>([]);

  const { project } = useAppSelector((state) => state.projectDetails.data);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const [loadedImages, loadedDevis] = await Promise.all([
          project?.images?.length > 0 ? apiGetPegFiles(project.images) : Promise.resolve([]),
          project?.devis?.length > 0 ? apiGetPegFiles(project.devis) : Promise.resolve([]),
        ]);
        setProjectFiles(loadedImages.filter((f) => f.url));
        setDevisFiles(loadedDevis.filter((f) => f.url));
      } catch (err) {
        console.error('[ClientDownloads] Error loading files:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFiles();
  }, [project]);

  const invoiceFiles: PegFile[] = (project?.invoices || [])
    .filter((inv) => inv.file?.url)
    .map((inv) => ({
      documentId: inv.file!.documentId,
      id: inv.file!.documentId,
      url: inv.file!.url,
      name: inv.file!.name || `${inv.name}.pdf`,
      file: new File([], ''),
    }));

  const sections: FileSection[] = [
    {
      title: 'Fichiers du projet',
      files: projectFiles,
      icon: <HiPhotograph size={16} style={{ color: '#6b9eff' }} />,
    },
    {
      title: 'Devis',
      files: devisFiles,
      icon: <HiDocumentText size={16} style={{ color: '#34d399' }} />,
    },
    {
      title: 'Factures',
      files: invoiceFiles,
      icon: <HiDocumentText size={16} style={{ color: '#fbbf24' }} />,
    },
  ].filter((s) => s.files.length > 0);

  const totalFiles = sections.reduce((sum, s) => sum + s.files.length, 0);

  return (
    <Container className="h-full">
      <div style={{ paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <Loading loading={loading}>
            {totalFiles === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <Empty icon={<GoTasklist size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>
                    Aucun fichier disponible pour ce projet
                  </p>
                </Empty>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {sections.map((section) => (
                  <div key={section.title}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: '12px',
                    }}>
                      {section.icon}
                      <p style={{
                        color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
                      }}>
                        {section.title} ({section.files.length})
                      </p>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                      gap: '12px',
                    }}>
                      {section.files.map((file) => (
                        <FileCard key={file.documentId || file.name} file={file} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Loading>
        </div>
      </div>
    </Container>
  );
};

export default ClientDownloads;
