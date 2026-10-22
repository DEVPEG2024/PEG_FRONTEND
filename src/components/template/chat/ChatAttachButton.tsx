import { useRef, useState } from 'react';
import { MdAttachFile } from 'react-icons/md';
import { apiUploadFile } from '@/services/FileServices';
import { env } from '@/configs/env.config';
import type {
  ChatFormAsk,
  ChatFormFileValue,
  ChatFormInput,
} from './chatFormTypes';

type Props = {
  /** Champ fichier demandé (clé, extensions acceptées, envoi multiple). */
  ask: ChatFormAsk;
  disabled?: boolean;
  /** Renvoie false si l'envoi n'a pas pu partir (requête déjà en cours). */
  onAct: (input: ChatFormInput, text: string) => boolean;
  /** `button` : « 📎 Joindre un fichier » sous la question ; `icon` : trombone de la zone de saisie. */
  variant?: 'button' | 'icon';
};

const resolveFileUrl = (url: string) =>
  url.startsWith('http') ? url : env.API_ENDPOINT_URL + url;

const ATTACH_CSS = `
.pca { position: relative; display: inline-flex; flex-direction: column; gap: 6px; white-space: normal; }
.pca-icon { width: 40px; height: 40px; border-radius: 50%; border: none; flex-shrink: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center; background: transparent; color: rgba(255,255,255,0.75); }
.pca-icon:hover, .pca-icon:focus-visible { background: rgba(255,255,255,0.1); color: #fff; outline: none; }
.pca-icon:disabled { opacity: .35; cursor: not-allowed; }
.pca-note { font-size: 12px; line-height: 1.4; }
.pca--icon .pca-note { position: absolute; left: 0; bottom: calc(100% + 12px); white-space: nowrap; max-width: 260px;
  overflow: hidden; text-overflow: ellipsis; padding: 6px 10px; border-radius: 10px; background: rgba(11,17,32,0.95);
  border: 1px solid rgba(255,255,255,0.12); }
.pca-note--busy { color: #a0c4ff; }
.pca-note--error { color: #fcd34d; }
`;

/**
 * Joindre un fichier (logo…) à la personnalisation remplie dans le chat. Le
 * fichier est réellement téléversé (même envoi que la fiche produit :
 * `/upload-single`, S3 direct au-delà de 5 Mo) ; seule son URL part au
 * serveur, qui n'accepte que les fichiers stockés chez PEG.
 */
const ChatAttachButton = ({
  ask,
  disabled,
  onAct,
  variant = 'button',
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const busy = sending.length > 0;

  const handleFiles = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (!picked.length) return;
    const toSend = ask.multiple ? picked.slice(0, 10) : picked.slice(0, 1);
    setFailed(null);
    setSending(toSend.map((f) => f.name));
    const files: ChatFormFileValue[] = [];
    let lastFailure: string | null = null;
    for (const file of toSend) {
      try {
        const uploaded = await apiUploadFile(file);
        if (!uploaded?.url) throw new Error('Réponse sans URL');
        files.push({
          storage: 'url',
          name: uploaded.name ?? file.name,
          originalName: file.name,
          url: resolveFileUrl(uploaded.url),
          size: file.size,
          type: file.type,
        });
      } catch {
        lastFailure = file.name;
      }
    }
    setSending([]);
    if (files.length) {
      const names = files.map((f) => f.originalName).join(', ');
      const sent = onAct({ kind: 'file', key: ask.key, files }, `📎 ${names}`);
      if (!sent) lastFailure = files[0].originalName;
    }
    setFailed(lastFailure);
  };

  return (
    <span className={`pca pca--${variant}`}>
      <style>{ATTACH_CSS}</style>
      <input
        ref={inputRef}
        type="file"
        accept={ask.accept ?? undefined}
        multiple={!!ask.multiple}
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      {variant === 'icon' ? (
        <button
          type="button"
          className="pca-icon"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          aria-label="📎 Joindre un fichier"
          title="Joindre un fichier"
        >
          <MdAttachFile size={20} />
        </button>
      ) : (
        <button
          type="button"
          className="pcf-btn pcf-btn--primary"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          📎 Joindre un fichier
        </button>
      )}
      {sending.map((name) => (
        <span key={name} role="status" className="pca-note pca-note--busy">
          Envoi de « {name} »…
        </span>
      ))}
      {failed && !busy && (
        <span role="alert" className="pca-note pca-note--error">
          L&apos;envoi de « {failed} » a échoué. Réessayez.
        </span>
      )}
    </span>
  );
};

export default ChatAttachButton;
