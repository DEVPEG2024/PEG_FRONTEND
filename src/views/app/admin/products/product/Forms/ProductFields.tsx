import RichTextEditor from '@/components/app/RichTextEditor';
import Input from '@/components/ui/Input';
import {
  Controller,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { Select, Switcher } from '@/components/ui';
import type { ProductFormModel } from './ProductForm';
import { PriceTier } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import { HiOutlineTrash, HiOutlinePlus, HiOutlineLockClosed, HiOutlineDocumentText, HiOutlineUpload, HiX } from 'react-icons/hi';
import { MdOutlineVerifiedUser } from 'react-icons/md';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { SUPER_ADMIN, ADMIN, PRODUCER } from '@/constants/roles.constant';

type Options = {
  label: string;
  value: string;
};

type ProductFieldsProps = {
  errors: FieldErrors<ProductFormModel>;
  type: string;
  sizes: Options[];
  colors: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  checklists: Options[];
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (productCategoryDocumentId: string) => void;
  control: any;
  watch: UseFormWatch<ProductFormModel>;
  setValue: UseFormSetValue<ProductFormModel>;
  batFile: PegFile | null;
  setBatFile: (f: PegFile | null) => void;
  currentBatUrl?: string | null;
};

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1.5px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '20px 22px',
  marginBottom: '16px',
  fontFamily: 'Inter, sans-serif',
};

const sectionTitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '14px',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '7px',
};

const fieldError: React.CSSProperties = {
  color: '#f87171',
  fontSize: '11px',
  marginTop: '4px',
};

const ProductFields = (props: ProductFieldsProps) => {
  const {
    errors,
    type,
    sizes,
    colors,
    customerCategories,
    categories,
    customers,
    forms,
    checklists,
    filterSizesListByProductCategory,
    filterColorsListByProductCategory,
    control,
    watch,
    setValue,
    batFile,
    setBatFile,
    currentBatUrl,
  } = props;

  const requiresBat = watch('requiresBat');

  const userAuthority: string[] = useSelector(
    (state: RootState) => (state.auth as any)?.user?.user?.authority ?? []
  );
  const canSeeProductRef =
    userAuthority.includes(SUPER_ADMIN) ||
    userAuthority.includes(ADMIN) ||
    userAuthority.includes(PRODUCER);

  const handleBatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF.');
      return;
    }
    setBatFile({ file, name: file.name } as unknown as PegFile);
  };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ paddingTop: '28px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Produits
        </p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          {type === 'edit' ? 'Modifier le produit' : 'Nouveau produit'}
        </h2>
      </div>

      {/* ── Section 1 : Infos de base ── */}
      <div style={card}>
        <p style={sectionTitle}>Informations générales</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <label style={fieldLabel}>Nom du produit</label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input {...field} type="text" autoComplete="off" placeholder="Donnez un nom au produit" />
              )}
            />
            {errors.name && <p style={fieldError}>{errors.name.message}</p>}
          </div>
          <div style={{ paddingTop: '2px' }}>
            <label style={fieldLabel}>Dans le catalogue</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <Controller
                name="inCatalogue"
                control={control}
                render={({ field }) => (
                  <Switcher checked={field.value} onChange={(val) => field.onChange(!val)} />
                )}
              />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                {watch('inCatalogue') ? 'Visible' : 'Masqué'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label style={fieldLabel}>Description</label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextEditor value={field.value} onChange={(val) => field.onChange(val)} />
            )}
          />
          {errors.description && <p style={fieldError}>{errors.description.message}</p>}
        </div>
      </div>

      {/* ── Section 2 : Paliers de prix ── */}
      <div style={card}>
        <p style={sectionTitle}>Paliers de prix</p>
        {errors.priceTiers && <p style={{ ...fieldError, marginBottom: '10px' }}>{errors.priceTiers.message}</p>}
        <Controller
          name="priceTiers"
          control={control}
          render={({ field }) => {
            const priceTiers: PriceTier[] = field.value || [];
            return (
              <div>
                {priceTiers.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    Aucun palier — cliquez sur "Ajouter un palier"
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {priceTiers.map((tier, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <label style={fieldLabel}>Prix (€)</label>
                          <Input
                            type="number"
                            value={tier.price}
                            min={0}
                            step={0.01}
                            placeholder="Ex: 10.99"
                            onChange={(e) => {
                              const updated = [...priceTiers];
                              updated[index].price = parseFloat(e.target.value) || 0;
                              field.onChange(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label style={fieldLabel}>Qté minimale</label>
                          <Input
                            type="number"
                            value={tier.minQuantity}
                            min={1}
                            placeholder="Ex: 1"
                            onChange={(e) => {
                              const updated = [...priceTiers];
                              updated[index].minQuantity = parseInt(e.target.value) || 0;
                              field.onChange(updated);
                            }}
                            onBlur={() => {
                              field.onChange([...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity));
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => field.onChange(priceTiers.filter((_, i) => i !== index))}
                          style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <HiOutlineTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newTier: PriceTier = {
                      minQuantity: priceTiers.length > 0 ? Math.max(...priceTiers.map((t) => t.minQuantity)) + 1 : 1,
                      price: 0,
                    };
                    field.onChange([...priceTiers, newTier].sort((a, b) => a.minQuantity - b.minQuantity));
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: 'rgba(47,111,237,0.08)', border: '1px solid rgba(47,111,237,0.2)', borderRadius: '9px', padding: '8px 14px', color: '#6b9eff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  <HiOutlinePlus size={13} /> Ajouter un palier
                </button>
              </div>
            );
          }}
        />
      </div>

      {/* ── Section 3 : Catégories & clients ── */}
      <div style={card}>
        <p style={sectionTitle}>Catégories & clients</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={fieldLabel}>Catégorie client</label>
            <Controller
              name="customerCategories"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  value={customerCategories.filter((o) => field.value?.includes(o.value))}
                  placeholder="Catégories..."
                  options={customerCategories}
                  onChange={(sel) => field.onChange(sel.map((o) => o.value))}
                />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Catégorie produit</label>
            <Controller
              name="productCategory"
              control={control}
              render={({ field }) => (
                <Select
                  value={categories.find((o) => field.value === o.value)}
                  placeholder="Catégorie..."
                  options={categories}
                  onChange={(sel) => {
                    const value = sel?.value || '';
                    field.onChange(value);
                    filterSizesListByProductCategory(value);
                    filterColorsListByProductCategory(value);
                  }}
                />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Client(s)</label>
            <Controller
              name="customers"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  value={customers.filter((o) => field.value?.includes(o.value))}
                  placeholder="Clients..."
                  options={customers}
                  onChange={(sel) => field.onChange(sel.map((o) => o.value))}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Section 4 : Options produit ── */}
      <div style={card}>
        <p style={sectionTitle}>Options produit</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={fieldLabel}>Tailles</label>
            <Controller
              name="sizes"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  value={sizes.filter((o) => field.value?.includes(o.value))}
                  placeholder="Tailles..."
                  options={sizes}
                  onChange={(sel) => field.onChange(sel.map((o) => o.value))}
                />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Couleurs</label>
            <Controller
              name="colors"
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  value={colors.filter((o) => field.value?.includes(o.value))}
                  placeholder="Couleurs..."
                  options={colors}
                  onChange={(sel) => field.onChange(sel.map((o) => o.value))}
                />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Formulaire</label>
            <Controller
              name="form"
              control={control}
              render={({ field }) => (
                <Select
                  isClearable
                  value={forms.find((o) => field.value === o.value)}
                  placeholder="Formulaire..."
                  options={forms}
                  onChange={(sel) => field.onChange(sel?.value ?? null)}
                />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Checklist</label>
            <Controller
              name="checklist"
              control={control}
              render={({ field }) => (
                <Select
                  isClearable
                  value={checklists.find((o) => field.value === o.value) ?? null}
                  placeholder="Checklist..."
                  options={checklists}
                  onChange={(sel) => field.onChange(sel?.value ?? null)}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Section 5 : BAT ── */}
      <div style={{ ...card, border: requiresBat ? '1.5px solid rgba(168,85,247,0.3)' : '1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: requiresBat ? '18px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: requiresBat ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${requiresBat ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <MdOutlineVerifiedUser size={18} style={{ color: requiresBat ? '#c084fc' : 'rgba(255,255,255,0.3)' }} />
            </div>
            <div>
              <p style={{ color: requiresBat ? '#c084fc' : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '13px', margin: 0, transition: 'color 0.2s' }}>
                BAT (Bon À Tirer)
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: 0 }}>
                Le client doit valider le BAT avant de commander
              </p>
            </div>
          </div>
          <Controller
            name="requiresBat"
            control={control}
            render={({ field }) => (
              <Switcher
                checked={!!field.value}
                onChange={(val) => field.onChange(!val)}
              />
            )}
          />
        </div>

        {requiresBat && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <label style={{ ...fieldLabel, color: 'rgba(168,85,247,0.7)' }}>Fichier BAT (PDF)</label>

            {/* Current BAT */}
            {(batFile || currentBatUrl) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px' }}>
                <HiOutlineDocumentText size={18} style={{ color: '#c084fc', flexShrink: 0 }} />
                <span style={{ color: '#c084fc', fontSize: '13px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {batFile ? batFile.name : 'BAT actuel'}
                </span>
                {currentBatUrl && !batFile && (
                  <a href={currentBatUrl} target="_blank" rel="noreferrer" style={{ color: 'rgba(192,132,252,0.7)', fontSize: '11px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Voir PDF →
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setBatFile(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: '2px' }}
                  title="Retirer le fichier"
                >
                  <HiX size={14} />
                </button>
              </div>
            )}

            {/* Upload zone */}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(168,85,247,0.04)', border: '1.5px dashed rgba(168,85,247,0.25)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
              <HiOutlineUpload size={22} style={{ color: 'rgba(192,132,252,0.5)' }} />
              <span style={{ color: 'rgba(192,132,252,0.7)', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                {batFile ? 'Remplacer le PDF' : 'Déposer ou cliquer pour choisir un PDF'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>PDF uniquement</span>
              <input type="file" accept="application/pdf" onChange={handleBatFileChange} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* ── Section 6 : Référence interne (admin/producteur) ── */}
      {canSeeProductRef && (
        <div style={{ ...card, border: '1.5px solid rgba(251,191,36,0.2)', background: 'linear-gradient(160deg, #1e2a14 0%, #111a0c 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <HiOutlineLockClosed style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Référence produit — Admin &amp; Producteur uniquement
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ ...fieldLabel, color: 'rgba(251,191,36,0.5)' }}>Référence interne</label>
              <Controller
                name="productRef"
                control={control}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ''} type="text" autoComplete="off" placeholder="Ex: REF-2024-001" />
                )}
              />
            </div>
            <div>
              <label style={{ ...fieldLabel, color: 'rgba(251,191,36,0.5)' }}>Visible par le client</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <Controller
                  name="refVisibleToCustomer"
                  control={control}
                  render={({ field }) => (
                    <Switcher checked={!!field.value} onChange={(val) => field.onChange(!val)} />
                  )}
                />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                  Afficher sur la fiche client
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductFields;
