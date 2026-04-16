import Container from '@/components/shared/Container';
import { SavTicket, SavMessage } from '@/@types/sav';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { useAppSelector, updateCurrentProject } from '../store';
import { useAppDispatch } from '@/store';
import DetailsRight from './DetailsRight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetProjectSavTickets, apiUpdateProjectSavTickets } from '@/services/ProjectServices';
import { apiUploadFile } from '@/services/FileServices';
import { toast } from 'react-toastify';
import { HiPlus, HiX, HiCheck, HiChevronDown, HiChevronUp, HiPhotograph, HiArrowRight, HiArrowLeft } from 'react-icons/hi';
import { MdBuildCircle, MdSend, MdMic, MdStop, MdPlayArrow, MdPause, MdDelete } from 'react-icons/md';
import { env } from '@/configs/env.config';

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return (env?.API_ENDPOINT_URL || '') + url;
};

// ─── Wizard Step Indicator ───
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: i === current ? '36px' : '10px',
          height: '10px',
          borderRadius: '100px',
          background: i < current
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : i === current
              ? 'linear-gradient(90deg, #fb923c, #ea580c)'
              : 'rgba(255,255,255,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: i === current ? '0 0 12px rgba(251,146,60,0.4)' : 'none',
        }} />
      </div>
    ))}
  </div>
);

// ─── Voice Recorder Hook ───
const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playPause = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const clear = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  return { isRecording, audioBlob, audioUrl, duration, isPlaying, startRecording, stopRecording, playPause, clear, formatDuration };
};

// ─── Main Component ───
const ProjectSav = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isCustomer = hasRole(user, [CUSTOMER]);
  const isProducer = hasRole(user, [PRODUCER]);

  const getUserRole = () => isAdmin ? 'admin' : isCustomer ? 'customer' : isProducer ? 'producer' : 'admin';
  const getDisplayName = () => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilisateur';

  const [tickets, setTickets] = useState<SavTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closureNote, setClosureNote] = useState('');
  const closureRef = useRef<HTMLTextAreaElement>(null);

  // ─── Wizard State ───
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0); // 0=photos, 1=description, 2=confirm
  const [wizardFiles, setWizardFiles] = useState<File[]>([]);
  const [wizardTitle, setWizardTitle] = useState('');
  const [wizardDescription, setWizardDescription] = useState('');
  const wizardFileRef = useRef<HTMLInputElement>(null);
  const wizardTitleRef = useRef<HTMLInputElement>(null);
  const recorder = useVoiceRecorder();

  // ─── Message State ───
  const [messageText, setMessageText] = useState<Record<string, string>>({});
  const [messageFiles, setMessageFiles] = useState<Record<string, File[]>>({});
  const messageFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const messagesEndRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Load
  useEffect(() => {
    if (!project?.documentId) return;
    setLoading(true);
    apiGetProjectSavTickets(project.documentId)
      .then((res: any) => setTickets(res?.data?.data?.project?.savTickets ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [project?.documentId]);

  useEffect(() => { if (closingId && closureRef.current) closureRef.current.focus(); }, [closingId]);
  useEffect(() => {
    if (expandedId && messagesEndRef.current[expandedId]) {
      setTimeout(() => messagesEndRef.current[expandedId]?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [expandedId]);

  // Focus title on step 1
  useEffect(() => {
    if (wizardOpen && wizardStep === 1 && wizardTitleRef.current) wizardTitleRef.current.focus();
  }, [wizardOpen, wizardStep]);

  // Persist
  const persistTickets = useCallback(async (newTickets: SavTicket[]) => {
    if (!project?.documentId) return;
    setSaving(true);
    try { await apiUpdateProjectSavTickets(project.documentId, newTickets); }
    catch { toast.error('Erreur sauvegarde SAV'); }
    finally { setSaving(false); }
  }, [project?.documentId]);

  const saveTickets = useCallback((t: SavTicket[]) => { setTickets(t); persistTickets(t); }, [persistTickets]);

  // Upload helper
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      try {
        const uploaded = await apiUploadFile(file);
        if (uploaded?.url) urls.push(ensureAbsoluteUrl(uploaded.url));
      } catch { toast.error('Erreur upload: ' + file.name); }
    }
    return urls;
  };

  const uploadBlob = async (blob: Blob, name: string): Promise<string | null> => {
    try {
      const file = new File([blob], name, { type: blob.type });
      const uploaded = await apiUploadFile(file);
      return uploaded?.url ? ensureAbsoluteUrl(uploaded.url) : null;
    } catch { toast.error('Erreur upload vocal'); return null; }
  };

  // ─── Wizard Submit ───
  const submitWizard = async () => {
    const title = wizardTitle.trim();
    if (!title) { toast.error('Donnez un titre au ticket'); return; }

    setUploading(true);

    let imageUrls: string[] = [];
    if (wizardFiles.length > 0) imageUrls = await uploadFiles(wizardFiles);

    let voiceUrl: string | undefined;
    if (recorder.audioBlob) {
      const url = await uploadBlob(recorder.audioBlob, 'vocal-sav-' + Date.now() + '.webm');
      if (url) voiceUrl = url;
    }

    const newTicket: SavTicket = {
      id: 'sav-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title,
      description: wizardDescription.trim(),
      openDate: new Date().toISOString(),
      status: 'open',
      createdBy: getDisplayName(),
      createdByRole: getUserRole(),
      images: imageUrls.length > 0 ? imageUrls : undefined,
      audioUrl: voiceUrl,
      messages: [],
    };

    const newTickets = [newTicket, ...tickets];
    saveTickets(newTickets);

    if (project && project.state !== 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'sav' }));
      toast.info('Projet pass\u00e9 en statut SAV');
    }

    // Reset wizard
    setWizardOpen(false);
    setWizardStep(0);
    setWizardFiles([]);
    setWizardTitle('');
    setWizardDescription('');
    recorder.clear();
    setUploading(false);
    setExpandedId(newTicket.id);
    toast.success('Ticket SAV ouvert');
  };

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(0);
    setWizardFiles([]);
    setWizardTitle('');
    setWizardDescription('');
    recorder.clear();
  };

  // ─── Messages ───
  const sendMessage = async (ticketId: string) => {
    const text = (messageText[ticketId] || '').trim();
    const files = messageFiles[ticketId] || [];
    if (!text && files.length === 0) return;

    setUploading(true);
    let imageUrls: string[] = [];
    if (files.length > 0) imageUrls = await uploadFiles(files);

    const msg: SavMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      content: text,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      createdBy: getDisplayName(),
      createdByRole: getUserRole(),
      createdAt: new Date().toISOString(),
    };

    saveTickets(tickets.map((t) => t.id === ticketId ? { ...t, messages: [...(t.messages || []), msg] } : t));
    setMessageText((p) => ({ ...p, [ticketId]: '' }));
    setMessageFiles((p) => ({ ...p, [ticketId]: [] }));
    setUploading(false);
    setTimeout(() => messagesEndRef.current[ticketId]?.scrollIntoView({ behavior: 'smooth' }), 150);
  };

  // ─── Ticket Actions ───
  const closeTicket = async (id: string) => {
    const updated = tickets.map((t) => t.id === id ? { ...t, status: 'closed' as const, closeDate: new Date().toISOString(), closureNote: closureNote.trim() || undefined } : t);
    saveTickets(updated);
    setClosingId(null);
    setClosureNote('');
    if (updated.filter((t) => t.status === 'open').length === 0 && project?.state === 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
      toast.info('Tous les tickets ferm\u00e9s — projet termin\u00e9');
    }
    toast.success('Ticket ferm\u00e9');
  };

  const reopenTicket = async (id: string) => {
    saveTickets(tickets.map((t) => t.id === id ? { ...t, status: 'open' as const, closeDate: undefined, closureNote: undefined } : t));
    if (project && project.state !== 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'sav' }));
    }
    toast.info('Ticket r\u00e9ouvert');
  };

  const deleteTicket = async (id: string) => {
    const remaining = tickets.filter((t) => t.id !== id);
    saveTickets(remaining);
    if (remaining.filter((t) => t.status === 'open').length === 0 && project?.state === 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
    }
    toast.success('Ticket supprim\u00e9');
  };

  // ─── Helpers ───
  const openTickets = tickets.filter((t) => t.status === 'open');
  const closedTickets = tickets.filter((t) => t.status === 'closed');
  const canOpenTicket = isAdmin || isCustomer;

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Hier ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Admin', color: '#6fa3f5', bg: 'rgba(47,111,237,0.15)' };
      case 'customer': return { label: 'Client', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
      case 'producer': return { label: 'Producteur', color: '#c084fc', bg: 'rgba(168,85,247,0.15)' };
      default: return { label: role, color: '#fff', bg: 'rgba(255,255,255,0.08)' };
    }
  };

  // ─── Wizard Render ───
  const renderWizard = () => {
    if (!wizardOpen) return null;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) resetWizard(); }}
      >
        <div style={{
          width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
          background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
          borderRadius: '20px', padding: '32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={resetWizard} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
          }}><HiX size={16} /></button>

          <StepIndicator current={wizardStep} total={3} />

          {/* ═══ Step 0: Photos ═══ */}
          {wizardStep === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))',
                border: '1px solid rgba(251,146,60,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HiPhotograph size={28} style={{ color: '#fb923c' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
                Photos du problème
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 24px' }}>
                Prenez ou importez des photos pour illustrer le problème
              </p>

              <input ref={wizardFileRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) setWizardFiles((p) => [...p, ...Array.from(files)]);
                  setTimeout(() => { e.target.value = ''; }, 100);
                }}
              />

              {/* Drop zone */}
              <div
                onClick={() => wizardFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(251,146,60,0.6)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  if (e.dataTransfer.files.length > 0) setWizardFiles((p) => [...p, ...Array.from(e.dataTransfer.files)]);
                }}
                style={{
                  border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px',
                  padding: wizardFiles.length > 0 ? '16px' : '40px 20px',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {wizardFiles.length === 0 ? (
                  <div>
                    <HiPlus size={24} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>
                      Cliquez ou glissez vos photos ici
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {wizardFiles.map((f, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={URL.createObjectURL(f)} alt={f.name} style={{
                          height: '80px', width: '80px', objectFit: 'cover', borderRadius: '10px',
                          border: '2px solid rgba(255,255,255,0.08)',
                        }} />
                        <button onClick={(e) => { e.stopPropagation(); setWizardFiles((p) => p.filter((_, idx) => idx !== i)); }}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#ef4444', border: '2px solid #0f1c2e', color: '#fff',
                            fontSize: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        ><HiX size={10} /></button>
                      </div>
                    ))}
                    <div onClick={() => wizardFileRef.current?.click()} style={{
                      height: '80px', width: '80px', borderRadius: '10px',
                      border: '2px dashed rgba(255,255,255,0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <HiPlus size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button onClick={resetWizard} style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>Annuler</button>
                <button onClick={() => setWizardStep(1)} style={{
                  padding: '10px 24px', borderRadius: '10px',
                  background: 'linear-gradient(90deg, #fb923c, #ea580c)',
                  border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 16px rgba(251,146,60,0.3)',
                }}>
                  {wizardFiles.length > 0 ? 'Suivant' : 'Passer cette étape'} <HiArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ═══ Step 1: Description ═══ */}
          {wizardStep === 1 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))',
                  border: '1px solid rgba(47,111,237,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MdSend size={24} style={{ color: '#6fa3f5' }} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
                  Décrivez le problème
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                  Titre + description écrite ou message vocal
                </p>
              </div>

              {/* Title */}
              <input ref={wizardTitleRef} type="text" placeholder="Titre du problème *"
                value={wizardTitle} onChange={(e) => setWizardTitle(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600,
                  padding: '14px 16px', outline: 'none', fontFamily: 'inherit',
                  marginBottom: '12px', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              {/* Tabs: text or voice */}
              <div style={{
                display: 'flex', gap: '0', marginBottom: '12px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <button
                  onClick={() => {}}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: !recorder.audioBlob && !recorder.isRecording ? 'rgba(47,111,237,0.15)' : 'transparent',
                    color: !recorder.audioBlob && !recorder.isRecording ? '#6fa3f5' : 'rgba(255,255,255,0.4)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <MdSend size={14} /> Texte
                </button>
                <button
                  onClick={() => { if (!recorder.isRecording && !recorder.audioBlob) recorder.startRecording(); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: recorder.audioBlob || recorder.isRecording ? 'rgba(239,68,68,0.15)' : 'transparent',
                    color: recorder.audioBlob || recorder.isRecording ? '#f87171' : 'rgba(255,255,255,0.4)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <MdMic size={14} /> Vocal
                </button>
              </div>

              {/* Text area */}
              <textarea
                placeholder="Expliquez le problème en détail..."
                value={wizardDescription} onChange={(e) => setWizardDescription(e.target.value)}
                rows={4}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                  padding: '14px 16px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                  marginBottom: '12px', boxSizing: 'border-box',
                }}
              />

              {/* Voice recorder */}
              {recorder.isRecording && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px', marginBottom: '12px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  <span style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, flex: 1 }}>
                    Enregistrement... {recorder.formatDuration(recorder.duration)}
                  </span>
                  <button onClick={recorder.stopRecording} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}>
                    <MdStop size={16} /> Arrêter
                  </button>
                </div>
              )}

              {recorder.audioBlob && !recorder.isRecording && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px', marginBottom: '12px',
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                }}>
                  <button onClick={recorder.playPause} style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                  }}>
                    {recorder.isPlaying ? <MdPause size={18} /> : <MdPlayArrow size={18} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '4px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: recorder.isPlaying ? '100%' : '0%', background: '#22c55e', borderRadius: '100px', transition: 'width ' + recorder.duration + 's linear' }} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Vocal — {recorder.formatDuration(recorder.duration)}
                    </span>
                  </div>
                  <button onClick={recorder.clear} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', cursor: 'pointer',
                  }}>
                    <MdDelete size={16} />
                  </button>
                </div>
              )}

              {/* Nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={() => setWizardStep(0)} style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}><HiArrowLeft size={14} /> Retour</button>
                <button onClick={() => { if (wizardTitle.trim()) setWizardStep(2); else toast.error('Titre obligatoire'); }} style={{
                  padding: '10px 24px', borderRadius: '10px',
                  background: wizardTitle.trim() ? 'linear-gradient(90deg, #fb923c, #ea580c)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: wizardTitle.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: wizardTitle.trim() ? '0 4px 16px rgba(251,146,60,0.3)' : 'none',
                }}>Suivant <HiArrowRight size={14} /></button>
              </div>
            </div>
          )}

          {/* ═══ Step 2: Confirmation ═══ */}
          {wizardStep === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HiCheck size={28} style={{ color: '#4ade80' }} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
                  Confirmer le ticket
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                  Vérifiez les informations avant envoi
                </p>
              </div>

              {/* Summary card */}
              <div style={{
                borderRadius: '14px', padding: '20px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Titre</span>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '4px 0 0' }}>{wizardTitle}</p>
                </div>

                {wizardDescription && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Description</span>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{wizardDescription}</p>
                  </div>
                )}

                {wizardFiles.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {wizardFiles.length} photo{wizardFiles.length > 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {wizardFiles.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} alt={f.name} style={{
                          height: '56px', width: '56px', objectFit: 'cover', borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {recorder.audioBlob && (
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vocal</span>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0' }}>
                      Message vocal — {recorder.formatDuration(recorder.duration)}
                    </p>
                  </div>
                )}
              </div>

              {/* Nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button onClick={() => setWizardStep(1)} style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}><HiArrowLeft size={14} /> Modifier</button>
                <button onClick={submitWizard} disabled={uploading} style={{
                  padding: '12px 28px', borderRadius: '12px',
                  background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: uploading ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
                }}>
                  {uploading ? 'Envoi en cours...' : 'Envoyer le ticket'} <HiCheck size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes savPulse {
            0% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 0 rgba(251,146,60,0.5); }
            70% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 12px rgba(251,146,60,0); }
            100% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 0 rgba(251,146,60,0); }
          }
        `}</style>
      </div>
    );
  };

  // ─── Ticket Render ───
  const renderTicket = (ticket: SavTicket) => {
    const isExpanded = expandedId === ticket.id;
    const isOpen = ticket.status === 'open';
    const msgs = ticket.messages || [];

    return (
      <div key={ticket.id} style={{
        borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s',
        background: isOpen ? 'rgba(251,146,60,0.05)' : 'rgba(34,197,94,0.03)',
        border: '1.5px solid ' + (isOpen ? 'rgba(251,146,60,0.15)' : 'rgba(34,197,94,0.1)'),
      }}>
        {/* Header */}
        <div onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            background: isOpen ? '#fb923c' : '#4ade80',
            boxShadow: '0 0 8px ' + (isOpen ? 'rgba(251,146,60,0.4)' : 'rgba(34,197,94,0.3)'),
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ticket.title}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: isOpen ? 'rgba(251,146,60,0.12)' : 'rgba(34,197,94,0.1)',
                color: isOpen ? '#fb923c' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{isOpen ? 'Ouvert' : 'Fermé'}</span>
              {msgs.length > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{msgs.length} msg</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '3px' }}>
              {formatDate(ticket.openDate)} — {ticket.createdBy}
              {ticket.closeDate && (' — Fermé le ' + formatDate(ticket.closeDate))}
            </div>
          </div>
          {isExpanded ? <HiChevronUp size={18} style={{ color: 'rgba(255,255,255,0.25)' }} /> : <HiChevronDown size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />}
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {ticket.description && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Détails</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.description}</p>
              </div>
            )}
            {ticket.images && ticket.images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                {ticket.images.map((url, i) => (
                  <a key={i} href={ensureAbsoluteUrl(url)} target="_blank" rel="noreferrer">
                    <img src={ensureAbsoluteUrl(url)} alt={'SAV-' + i} style={{ height: '90px', width: '90px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }} />
                  </a>
                ))}
              </div>
            )}
            {ticket.audioUrl && (
              <div style={{ marginTop: '12px' }}>
                <audio controls src={ensureAbsoluteUrl(ticket.audioUrl)} style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
              </div>
            )}
            {ticket.closureNote && (
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <p style={{ color: 'rgba(34,197,94,0.6)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Note de fermeture</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.closureNote}</p>
              </div>
            )}

            {/* Chat */}
            {(msgs.length > 0 || isOpen) && (
              <div style={{ marginTop: '18px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  {'Échanges (' + msgs.length + ')'}
                </p>
                <div style={{
                  maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.12)',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}>
                  {msgs.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>Aucun message</p>}
                  {msgs.map((msg) => {
                    const isMe = msg.createdBy === getDisplayName();
                    const badge = getRoleBadge(msg.createdByRole);
                    return (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '80%', padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMe ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (isMe ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.06)'),
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: badge.color }}>{msg.createdBy}</span>
                            <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color }}>{badge.label}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{formatShortDate(msg.createdAt)}</span>
                          </div>
                          {msg.content && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>}
                          {msg.images && msg.images.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {msg.images.map((url, i) => (
                                <a key={i} href={ensureAbsoluteUrl(url)} target="_blank" rel="noreferrer">
                                  <img src={ensureAbsoluteUrl(url)} alt={'msg-' + i} style={{ height: '72px', width: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {msg.audioUrl && <audio controls src={ensureAbsoluteUrl(msg.audioUrl)} style={{ width: '100%', height: '32px', marginTop: '6px' }} />}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={(el) => { messagesEndRef.current[ticket.id] = el; }} />
                </div>

                {/* Message input */}
                {isOpen && (
                  <div style={{ marginTop: '10px' }}>
                    {(messageFiles[ticket.id] || []).length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {(messageFiles[ticket.id] || []).map((f, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={URL.createObjectURL(f)} alt={f.name} style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                            <button onClick={() => setMessageFiles((p) => ({ ...p, [ticket.id]: (p[ticket.id] || []).filter((_, idx) => idx !== i) }))}
                              style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0f1c2e', color: '#fff', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <HiX size={8} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                      <input ref={(el) => { messageFileRefs.current[ticket.id] = el; }} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = e.target.files;
                          const tid = ticket.id;
                          if (files && files.length > 0) {
                            const arr = Array.from(files);
                            setMessageFiles((p) => ({ ...p, [tid]: [...(p[tid] || []), ...arr] }));
                          }
                          setTimeout(() => { e.target.value = ''; }, 100);
                        }}
                      />
                      <button onClick={() => messageFileRefs.current[ticket.id]?.click()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
                        title="Photo">
                        <HiPhotograph size={18} />
                      </button>
                      <input type="text" placeholder="Votre message..."
                        value={messageText[ticket.id] || ''}
                        onChange={(e) => setMessageText((p) => ({ ...p, [ticket.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(ticket.id); } }}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', padding: '9px 14px', outline: 'none', fontFamily: 'inherit' }}
                      />
                      <button onClick={() => sendMessage(ticket.id)}
                        disabled={uploading || (!(messageText[ticket.id] || '').trim() && !(messageFiles[ticket.id] || []).length)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                          background: (messageText[ticket.id] || '').trim() || (messageFiles[ticket.id] || []).length ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.04)',
                          border: 'none', color: '#fff', cursor: 'pointer',
                          boxShadow: (messageText[ticket.id] || '').trim() || (messageFiles[ticket.id] || []).length ? '0 4px 12px rgba(47,111,237,0.3)' : 'none',
                        }}>
                        <MdSend size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                {isOpen && closingId !== ticket.id && (
                  <button onClick={(e) => { e.stopPropagation(); setClosingId(ticket.id); setClosureNote(''); }} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    <HiCheck size={13} /> Fermer le ticket
                  </button>
                )}
                {!isOpen && (
                  <button onClick={(e) => { e.stopPropagation(); reopenTicket(ticket.id); }} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Rouvrir
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  <HiX size={13} /> Supprimer
                </button>
              </div>
            )}

            {closingId === ticket.id && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea ref={closureRef} placeholder="Note de fermeture (optionnelle)..."
                  value={closureNote} onChange={(e) => setClosureNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setClosingId(null); setClosureNote(''); } }}
                  rows={3}
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => closeTicket(ticket.id)}
                    style={{ padding: '9px 18px', borderRadius: '10px', background: 'linear-gradient(90deg, #22c55e, #16a34a)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Confirmer
                  </button>
                  <button onClick={() => { setClosingId(null); setClosureNote(''); }}
                    style={{ padding: '9px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ───
  return (
    <Container className="h-full">
      {renderWizard()}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '20px', padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tickets SAV</p>
            {tickets.length > 0 && (
              <span style={{ color: saving ? '#fbbf24' : 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                {saving ? 'Sauvegarde...' : (openTickets.length + ' ouvert' + (openTickets.length > 1 ? 's' : '') + ' — ' + closedTickets.length + ' fermé' + (closedTickets.length > 1 ? 's' : ''))}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Chargement...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '14px' }}>
              <MdBuildCircle size={56} style={{ color: 'rgba(255,255,255,0.07)' }} />
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>Aucun ticket SAV</p>
              {canOpenTicket && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>Cliquez sur le bouton pour signaler un problème</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {openTickets.length > 0 && (
                <>
                  <p style={{ color: 'rgba(251,146,60,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                    {'En cours (' + openTickets.length + ')'}
                  </p>
                  {openTickets.map(renderTicket)}
                </>
              )}
              {closedTickets.length > 0 && (
                <>
                  <p style={{ color: 'rgba(34,197,94,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: openTickets.length > 0 ? '16px' : '0', marginBottom: '2px' }}>
                    {'Fermés (' + closedTickets.length + ')'}
                  </p>
                  {closedTickets.map(renderTicket)}
                </>
              )}
            </div>
          )}
          {/* Bouton SAV — en bas, centré */}
          {canOpenTicket && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button onClick={() => setWizardOpen(true)} disabled={saving || uploading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '14px 28px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
                  border: '2px solid rgba(251,146,60,0.4)',
                  color: '#fff', fontSize: '15px', fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.03em',
                  animation: 'savBtnPulse 2s ease-in-out infinite',
                  transition: 'transform 0.2s ease, filter 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                <HiPlus size={17} /> Ouvrir un ticket SAV
              </button>
            </div>
          )}
        </div>
        <DetailsRight />
      </div>
      <style>{`
        @keyframes savBtnPulse {
          0% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 0 rgba(251,146,60,0.5); }
          70% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 14px rgba(251,146,60,0); }
          100% { box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 0 0 0 rgba(251,146,60,0); }
        }
      `}</style>
    </Container>
  );
};

function getDuration(openDate: string, closeDate: string): string {
  const diff = new Date(closeDate).getTime() - new Date(openDate).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + 'j ' + (h % 24) + 'h';
  if (h > 0) return h + 'h ' + (m % 60) + 'min';
  return m + 'min';
}

export default ProjectSav;
