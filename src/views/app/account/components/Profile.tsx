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
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFile, apiLoadPegFilesAndFiles, apiUploadFile } from '@/services/FileServices';
import { useNavigate } from 'react-router-dom';
import { Loading, StickyFooter } from '@/components/shared';
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
  username: Yup.string().required("Nom d'utilisateur Requis"),
  firstName: Yup.string().required('Nom Requis'),
  lastName: Yup.string().required('Prénom Requis'),
  email: Yup.string().email('Email invalide').required('Email Requis'),
});

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const [avatar, setAvatar] = useState<PegFile | undefined>(undefined);
  const [newAvatar, setNewAvatar] = useState<PegFile | undefined>(undefined);
  const [avatarToDelete, setAvatarToDelete] = useState<PegFile | undefined>(undefined);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
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
    setAvatarLoading(true)
    if (user?.avatar) {
      const imageLoaded: PegFile = (
        await apiLoadPegFilesAndFiles([user.avatar])
      )[0];

      setAvatar(imageLoaded);
    }
    setAvatarLoading(false)
  };

  const onFormSubmit = async (
    values: UserFormModel,
    setSubmitting: (isSubmitting: boolean) => void
  ) => {
    /*let newAvatar = undefined;

    if (newAvatar) {
      if (avatar.id) {
        newAvatar = avatar;
      } else {
        const avatarUploaded: PegFile = await apiUploadFile(avatar.file);
        newAvatar = avatarUploaded;
      }
    } else if (user.avatar) {
      apiDeleteFile(user.avatar.id)
    }*/

    if (newAvatar) {
      const newAvatarUploaded: PegFile = await apiUploadFile(newAvatar.file);

      if (avatar) {
        apiDeleteFile(avatar.id)
      }
      values.avatar = newAvatarUploaded.id
    } else if (avatarToDelete) {
      apiDeleteFile(avatarToDelete.id)
      values.avatar = null
    }

    dispatch(updateOwnUser({ user: values, id: user.id }));
    setSubmitting(false);
    navigate('/home');
  };

  const onFileAdd = async (file: File) => {
    setNewAvatar({ file, name: file.name });
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

  const handleDiscard = () => {
    navigate('/home');
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
                  <Loading loading={avatarLoading}>
                    <Upload
                      className="cursor-pointer absolute left-1/2"
                      showList={true}
                      uploadLimit={1}
                      beforeUpload={beforeUpload}
                      onFileAdd={(file) => onFileAdd(file)}
                      onFileRemove={() => {
                        setAvatarToDelete(avatar)
                        setAvatar(undefined)
                        setNewAvatar(undefined)
                      }}
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
                  </Loading>
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

                <StickyFooter
                  className="-mx-8 px-8 flex items-center justify-end py-4"
                  stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <Button
                    size="sm"
                    className="ltr:mr-3 rtl:ml-3"
                    type="button"
                    onClick={() => handleDiscard()}
                  >
                    Annuler
                  </Button>

                  <Button
                    size="sm"
                    variant="solid"
                    loading={isSubmitting}
                    icon={<AiOutlineSave />}
                    type="submit"
                  >
                    Enregistrer
                  </Button>
                </StickyFooter>
              </FormContainer>
            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default Profile;
