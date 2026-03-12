import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { updateOwnUser, useAppDispatch, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import { useEffect, useRef, useState } from 'react';
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFile, apiLoadPegFilesAndFiles, apiUploadFile } from '@/services/FileServices';
import { useNavigate } from 'react-router-dom';
import { HiCamera, HiOutlineUser } from 'react-icons/hi';
import { AiOutlineSave } from 'react-icons/ai';

type UserFormModel = Omit<
  User,
  | 'role'
  | 'customer'
  | 'producer'
  | 'authority'
  | 'id'
  | 'documentId'
  | 'blocked'
  | 'avatar'
>;

const validationSchema = Yup.object().shape({
  username: Yup.string().required("Nom d'utilisateur requis"),
  firstName: Yup.string().required('Nom requis'),
  lastName: Yup.string().required('Prénom requis'),
  email: Yup.string().email('Email invalide').required('Email requis'),
  jobTitle: Yup.string(),
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const [avatar, setAvatar] = useState<PegFile | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [newAvatarFile, setNewAvatarFile] = useState<File | undefined>(undefined);
  const [avatarToDelete, setAvatarToDelete] = useState<PegFile | undefined>(undefined);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData: UserFormModel = {
    username: user.username || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    jobTitle: user.jobTitle || '',
  };

  useEffect(() => {
    fetchAvatar();
  }, []);

  const fetchAvatar = async () => {
    setAvatarLoading(true);
    if (user?.avatar) {
      const loaded: PegFile = (await apiLoadPegFilesAndFiles([user.avatar]))[0];
      setAvatar(loaded);
      setPreviewUrl(loaded.url);
    }
    setAvatarLoading(false);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) return;
    setNewAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    if (avatar) setAvatarToDelete(avatar);
    setAvatar(undefined);
    setPreviewUrl(undefined);
    setNewAvatarFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFormSubmit = async (values: UserFormModel) => {
    const updatedValues = { ...values } as any;
    if (newAvatarFile) {
      const uploaded = await apiUploadFile(newAvatarFile);
      if (avatar) apiDeleteFile(avatar.id);
      updatedValues.avatar = uploaded.id;
    } else if (avatarToDelete) {
      apiDeleteFile(avatarToDelete.id);
      updatedValues.avatar = null;
    }
    await dispatch(updateOwnUser({ user: updatedValues, id: user.documentId }));
    navigate('/home');
  };

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserFormModel>({
    resolver: yupResolver(validationSchema),
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div onClick={handleAvatarClick} style={{ position: 'relative', cursor: 'pointer', width: '96px', height: '96px' }}>
          {avatarLoading ? (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '3px solid rgba(255,255,255,0.08)' }} />
          ) : previewUrl ? (
            <img src={previewUrl} alt="avatar" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(47,111,237,0.5)', display: 'block' }} />
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(47,111,237,0.12)', border: '3px solid rgba(47,111,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineUser size={40} style={{ color: '#6b9eff' }} />
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2f6fed, #1f4bb6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', border: '2.5px solid #0f1c2e' }}>
            <HiCamera size={13} style={{ color: '#fff' }} />
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '10px', marginBottom: 0 }}>
          Cliquer pour changer la photo
        </p>
        {previewUrl && (
          <button type="button" onClick={handleRemoveAvatar}
            style={{ marginTop: '5px', background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}
          >
            Supprimer la photo
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }} />

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Nom d'utilisateur *</label>
          <Controller name="username" control={control} render={({ field }) => (
            <input {...field} type="text" placeholder="Nom d'utilisateur"
              style={{ ...inputStyle, borderColor: errors.username ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = errors.username ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'; field.onBlur() }}
            />
          )} />
          {errors.username && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.username.message}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Nom *</label>
            <Controller name="lastName" control={control} render={({ field }) => (
              <input {...field} type="text" placeholder="Nom"
                style={{ ...inputStyle, borderColor: errors.lastName ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
                onBlur={(e) => { e.target.style.borderColor = errors.lastName ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'; field.onBlur() }}
              />
            )} />
            {errors.lastName && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.lastName.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Prénom *</label>
            <Controller name="firstName" control={control} render={({ field }) => (
              <input {...field} type="text" placeholder="Prénom"
                style={{ ...inputStyle, borderColor: errors.firstName ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
                onBlur={(e) => { e.target.style.borderColor = errors.firstName ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'; field.onBlur() }}
              />
            )} />
            {errors.firstName && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.firstName.message}</p>}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Email *</label>
          <Controller name="email" control={control} render={({ field }) => (
            <input {...field} type="email" placeholder="Email"
              style={{ ...inputStyle, borderColor: errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'; field.onBlur() }}
            />
          )} />
          {errors.email && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Rôle dans l'entreprise</label>
          <Controller name="jobTitle" control={control} render={({ field }) => (
            <input {...field} type="text" placeholder="Directeur commercial, CEO..."
              style={{ ...inputStyle, borderColor: 'rgba(255,255,255,0.09)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur() }}
            />
          )} />
        </div>

      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '28px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => navigate('/home')}
          style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          Annuler
        </button>
        <button type="submit" disabled={isSubmitting}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: isSubmitting ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}
        >
          <AiOutlineSave size={15} />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

    </form>
  );
};

export default Profile;
