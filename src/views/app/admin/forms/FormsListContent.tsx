import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteForm,
  duplicateForm,
  getForm,
  getForms,
  setForm,
  setNewFormDialog,
  useAppSelector,
} from './store';
import { useEffect, useRef, useState } from 'react';
import { Form } from '@/@types/form';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiDuplicate, HiSparkles, HiX } from 'react-icons/hi';
import { TbForms } from 'react-icons/tb';
import { toast } from 'react-toastify';
import { apiAiGenerateForm } from '@/services/ChatbotServices';

// Slug déterministe pour la `value` d'une option (le label reste lisible).
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

injectReducer('forms', reducer);

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
);


function FormsListContent() {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { forms, total, loading } = useAppSelector((state) => state.forms.data);

  useEffect(() => {
    dispatch(getForms({ pagination: { page: currentPage, pageSize }, searchTerm: debouncedSearch }));
  }, [dispatch, currentPage, pageSize, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const handleEdit = async (form: Form) => {
    await dispatch(getForm(form.documentId));
    dispatch(setNewFormDialog(true));
  };

  const handleDuplicate = (form: Form) => {
    dispatch(duplicateForm(form));
    toast.success('Formulaire dupliqué');
  };

  // ── Génération IA ──
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDesc, setAiDesc] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerateAi = async () => {
    const description = aiDesc.trim();
    if (!description) return;
    setAiLoading(true);
    try {
      const res = await apiAiGenerateForm(description);
      const data = res.data;
      if (!data?.result || !Array.isArray(data.fields) || data.fields.length === 0) {
        toast.error(data?.message || "L'IA n'a pas pu générer le formulaire. Réessayez.");
        return;
      }
      // Conversion vers la structure attendue par l'éditeur (options string[] -> {label,value}[]).
      const structure = {
        fields: data.fields.map((f) => ({
          type: f.type,
          label: f.label,
          required: !!f.required,
          ...(f.options && f.options.length
            ? { options: f.options.map((o) => ({ label: o, value: slugify(o) })) }
            : {}),
        })),
      };
      // Brouillon SANS documentId → l'éditeur créera un nouveau formulaire à l'enregistrement.
      dispatch(setForm({ documentId: '', name: data.name, fields: JSON.stringify(structure) } as Form));
      setAiOpen(false);
      setAiDesc('');
      dispatch(setNewFormDialog(true));
    } catch {
      toast.error('Erreur pendant la génération IA. Réessayez.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Administration</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Formulaires <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { setAiDesc(''); setAiOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.4)', fontFamily: 'Inter, sans-serif' }}>
            <HiSparkles size={16} /> Créer un formulaire IA
          </button>
          <button onClick={() => dispatch(setNewFormDialog(true))}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
            <HiPlus size={16} /> Créer un formulaire
          </button>
        </div>
      </div>

      {/* Modal génération IA */}
      {aiOpen && (
        <div onClick={() => !aiLoading && setAiOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: 'linear-gradient(160deg, #1a2440, #0f1526)', borderRadius: '18px', width: '100%', maxWidth: '520px', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.55)', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiSparkles size={20} style={{ color: '#c084fc' }} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>Générer un formulaire par IA</h3>
              </div>
              <button onClick={() => !aiLoading && setAiOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '9px', padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                <HiX size={16} />
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 16px' }}>
              Décris le produit ou le service. L'IA propose les champs adaptés à la commande (tu pourras tout ajuster avant d'enregistrer).
            </p>
            <textarea
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              autoFocus
              placeholder="ex : Création d'un site internet vitrine pour une entreprise locale"
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '11px', padding: '12px 14px', color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateAi(); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => setAiOpen(false)} disabled={aiLoading}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 18px', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 600, cursor: aiLoading ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Annuler
              </button>
              <button onClick={handleGenerateAi} disabled={aiLoading || !aiDesc.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: aiLoading || !aiDesc.trim() ? 'rgba(139,92,246,0.4)' : 'linear-gradient(90deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: aiLoading || !aiDesc.trim() ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <HiSparkles size={15} /> {aiLoading ? 'Génération…' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher un formulaire…" value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <TbForms size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600 }}>Aucun formulaire</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', marginTop: '6px' }}>Créez votre premier formulaire pour commencer</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {forms.map((form: Form) => {
            return (
              <div key={form.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TbForms size={22} style={{ color: '#6b9eff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', display: 'block' }}>{form.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <Btn onClick={() => handleEdit(form)} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => handleDuplicate(form)} icon={<HiDuplicate size={13} />} hoverBg="rgba(168,85,247,0.12)" hoverColor="#c084fc" hoverBorder="rgba(168,85,247,0.35)" title="Dupliquer" />
                  <Btn onClick={() => dispatch(deleteForm(form.documentId))} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FormsListContent;
