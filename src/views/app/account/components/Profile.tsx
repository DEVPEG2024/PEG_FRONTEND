import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FormContainer } from '@/components/ui/Form';
import FormDescription from './FormDescription';
import FormRow from './FormRow';
import { Field, Form, Formik } from 'formik';

import * as Yup from 'yup';
import { updateOwnUser, useAppDispatch, useAppSelector } from '@/store';
import { Avatar, Upload } from '@/components/ui';
import { HiOutlineUser } from 'react-icons/hi';
import { User } from '@/@types/user';
import { useEffect, useState } from 'react';
import { Image } from '@/@types/image';
import { apiLoadImagesAndFiles, apiUploadFile } from '@/services/FileServices';
import { useNavigate } from 'react-router-dom';

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
  username: Yup.string().required("Nom d'utilisateur Requis"),
  firstName: Yup.string().required('Nom Requis'),
  lastName: Yup.string().required('Prénom Requis'),
  email: Yup.string().email('Email invalide').required('Email Requis'),
});

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const [avatar, setAvatar] = useState<Image | undefined>(undefined);
  const initialData: UserFormModel = {
    username: user.username || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
  };

  useEffect(() => {
    fetchAvatar();
  }, []);

  const fetchAvatar = async (): Promise<void> => {
    if (user?.avatar) {
      const imageLoaded: Image = (
        await apiLoadImagesAndFiles([user.avatar])
      )[0];

      setAvatar(imageLoaded);
    }
  };

  const onFormSubmit = async (
    values: UserFormModel,
    setSubmitting: (isSubmitting: boolean) => void
  ) => {
    let newAvatar = undefined;

    if (avatar) {
      if (avatar.id) {
        newAvatar = avatar;
      } else {
        const avatarUploaded: Image = await apiUploadFile(avatar.file);
        newAvatar = avatarUploaded;
      }
    }
    const data: User = {
      ...values,
      avatar: newAvatar ? newAvatar.id : undefined,
    };

    dispatch(updateOwnUser({ user: data, id: user.id }));
    setSubmitting(false);
    navigate('/settings/profile');
  };

  const onFileAdd = async (file: File) => {
    setAvatar({ file, name: file.name });
  };

  const beforeUpload = (files: FileList | null) => {
    let valid: string | boolean = true;

    const allowedFileType = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Veuillez télécharger un fichier .jpeg ou .png!';
        }
      }
    }

    return valid;
  };

  return (
    <>
      <Formik
        initialValues={{
          ...initialData,
        }}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          setTimeout(() => {
            onFormSubmit(values, setSubmitting);
          }, 1000);
        }}
      >
        {({ touched, errors, isSubmitting }) => {
          const validatorProps = { touched, errors };
          return (
            <Form>
              <FormContainer>
                <FormDescription
                  title="Informations personnelles"
                  desc="Vos informations personnelles"
                />
                <div className="flex items-center justify-between mb-4 mt-4">
                  <div className="ml-0 font-semibold">Avatar</div>
                  <Upload
                    className="cursor-pointer absolute left-1/2"
                    showList={true}
                    uploadLimit={1}
                    beforeUpload={beforeUpload}
                    onFileAdd={(file) => onFileAdd(file)}
                    onFileRemove={() => setAvatar(undefined)}
                    fileList={avatar ? [avatar?.file] : []}
                  >
                    <Avatar
                      className="border-2 border-white dark:border-gray-800 shadow-lg"
                      size={100}
                      shape="circle"
                      icon={<HiOutlineUser />}
                      src={avatar?.url}
                    />
                  </Upload>
                </div>
                <FormRow
                  name="username"
                  label="Nom d'utilisateur"
                  {...validatorProps}
                >
                  <Field
                    type="text"
                    autoComplete="off"
                    name="username"
                    placeholder="Nom d'utilisateur"
                    component={Input}
                  />
                </FormRow>
                <FormRow name="lastName" label="Nom" {...validatorProps}>
                  <Field
                    type="text"
                    autoComplete="off"
                    name="lastName"
                    placeholder="Nom"
                    component={Input}
                  />
                </FormRow>
                <FormRow name="firstName" label="Prénom" {...validatorProps}>
                  <Field
                    type="text"
                    autoComplete="off"
                    name="firstName"
                    placeholder="Prénom"
                    component={Input}
                  />
                </FormRow>
                <FormRow name="email" label="Email" {...validatorProps}>
                  <Field
                    type="email"
                    autoComplete="off"
                    name="email"
                    placeholder="Email"
                    component={Input}
                  />
                </FormRow>

                <div className="mt-4 ltr:text-right">
                  <Button variant="solid" loading={isSubmitting} type="submit">
                    {isSubmitting ? 'Modification...' : 'Modifier'}
                  </Button>
                </div>
              </FormContainer>
            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default Profile;
