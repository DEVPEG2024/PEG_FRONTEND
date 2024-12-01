import { Button, Dialog, Spinner, Notification, toast } from '@/components/ui';
import { t } from 'i18next';
import {
  useAppDispatch,
  useAppSelector,
  setFormCompleted,
  setFormDialog,
  setFormAnswer,
} from '../show/store';
import { IField, IForm } from '@/@types/form';
import InputSection from '@/views/app/admin/forms/builder/components/fields/input';
import TextAreaSection from '@/views/app/admin/forms/builder/components/fields/textArea';
import CheckBoxSection from '@/views/app/admin/forms/builder/components/fields/checkBox';
import SelectSection from '@/views/app/admin/forms/builder/components/fields/select';
import DateSection from '@/views/app/admin/forms/builder/components/fields/date';
import UploadSection from '@/views/app/admin/forms/builder/components/fields/uplaodSection';
import ColorSection from '@/views/app/admin/forms/builder/components/fields/color';
import RadioSection from '@/views/app/admin/forms/builder/components/fields/radio';
import { useEffect, useState } from 'react';
import { IFormAnswer, IFieldAnswer } from '@/@types/formAnswer';
import {
  CartItemFormAnswerEdition,
  editFormAnswerCartItem,
} from '@/store/slices/base/cartSlice';
import {
  apiDeleteFile,
  apiUploadFile,
  loadFiles,
} from '@/services/FileServices';
import { FileItem, FileNameBackFront } from '@/@types/file';

function ModalCompleteForm({
  form,
  onEdition,
}: {
  form: IForm;
  onEdition: boolean;
}) {
  const dispatch = useAppDispatch();
  const { formDialog, formAnswer, cartItemId } = useAppSelector(
    (state) => state.showProduct.data
  );
  const [newFormAnswer, setNewFormAnswer] = useState<IFormAnswer>(
    formAnswer
      ? structuredClone(formAnswer)
      : {
          form: form._id,
          answers: [],
        }
  );
  const [filesLoaded, setFilesLoaded] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [waitToStore, setWaitToStore] = useState<boolean>(false);

  useEffect(() => {
    const fetchFiles = async (): Promise<void> => {
      const fieldsFileTypedId: string[] = form.fields
        .filter(({ type }) => type === 'file')
        .map(({ id }) => id);
      const filesToLoad: FileNameBackFront[] =
        formAnswer?.answers
          .filter((answer) => fieldsFileTypedId.includes(answer.fieldId))
          .map((answer) => answer.value as FileNameBackFront[])
          .flat()
          .map((fileNames) => fileNames) ?? [];

      if (filesToLoad.length > 0) {
        setLoading(true);
        const newFilesLoaded: FileItem[] = await loadFiles(filesToLoad);
        const currentFilesLoaded = filesLoaded;
        currentFilesLoaded.push(...newFilesLoaded);
        setFilesLoaded(currentFilesLoaded);
      }
      setLoading(false);
    };

    fetchFiles();
  }, []);

  const handleSubmit = async (e: any): Promise<void> => {
    e.preventDefault();
    if (onEdition) {
      handleEditFormAnswerCartItem();
    }
    dispatch(setFormAnswer(newFormAnswer));
    dispatch(setFormCompleted(true));
    handleClose();
  };

  const handleEditFormAnswerCartItem = (): void => {
    dispatch(
      editFormAnswerCartItem({
        cartItemId,
        formAnswer: newFormAnswer,
      } as CartItemFormAnswerEdition)
    );
    toast.push(
      <Notification type="success" title="Modifié">
        Formulaire modifié
      </Notification>
    );
  };

  const handleClose = (): void => {
    dispatch(setFormDialog(false));
  };

  const uploadFile = async (file: File): Promise<string | undefined> => {
    try {
      const data = await apiUploadFile(file);

      return data.fileUrl;
    } catch (error) {
      console.error("Erreur lors de l'upload du fichier :", error);
    }
  };

  const onFileRemove = async (
    fileNameFront: string,
    field: string
  ): Promise<void> => {
    const fileFromFilesLoaded: FileItem | undefined = filesLoaded.find(
      (fileLoaded) =>
        fileLoaded.fileNameBackFront.fileNameFront === fileNameFront
    );

    if (fileFromFilesLoaded) {
      try {
        await apiDeleteFile(fileFromFilesLoaded.fileNameBackFront.fileNameBack);
        const currentFilesLoaded: FileItem[] = filesLoaded;
        setFilesLoaded(
          currentFilesLoaded.filter(
            ({ fileNameBackFront: { fileNameFront: fileNameCurrentFile } }) =>
              fileNameCurrentFile !== fileNameFront
          )
        );
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier :', error);
      }
    }

    const currentFiles: FileNameBackFront[] =
      (newFormAnswer.answers.find((answer) => answer.fieldId === field)
        ?.value as FileNameBackFront[]) ?? [];
    const newAswer = [
      ...newFormAnswer.answers.filter((answer) => answer.fieldId !== field),
      {
        fieldId: field,
        value: currentFiles.filter(
          (file: FileNameBackFront) => file.fileNameFront !== fileNameFront
        ),
      },
    ];
    setNewFormAnswer({ ...newFormAnswer, answers: newAswer });
  };

  const determineNewAnswers = async (
    field: IField,
    value: string | string[] | File | { label: string; value: string } | Date
  ): Promise<IFieldAnswer[]> => {
    switch (field.type) {
      case 'date':
        const dateSelected: Date = value as Date;
        return [
          ...newFormAnswer.answers.filter(
            (answer) => answer.fieldId !== field.id
          ),
          { fieldId: field.id, value: dateSelected?.toISOString() ?? null },
        ];
      case 'file':
        setWaitToStore(true);
        const file: File = value as File,
          fileNameBack: string = (await uploadFile(file)) as string,
          currentFiles: FileNameBackFront[] =
            (newFormAnswer.answers.find((answer) => answer.fieldId === field.id)
              ?.value as FileNameBackFront[]) ?? [];

        setFilesLoaded([
          ...filesLoaded,
          {
            file,
            fileNameBackFront: { fileNameBack, fileNameFront: file.name },
          },
        ]);
        setWaitToStore(false);
        return [
          ...newFormAnswer.answers.filter(
            (answer) => answer.fieldId !== field.id
          ),
          {
            fieldId: field.id,
            value: [
              ...currentFiles,
              { fileNameBack, fileNameFront: file.name },
            ],
          },
        ];
      default:
        const valueSelected: string | string[] = value as string | string[];
        return [
          ...newFormAnswer.answers.filter(
            (answer) => answer.fieldId !== field.id
          ),
          { fieldId: field.id, value: valueSelected },
        ];
    }
  };

  const renderField = (field: IField): React.ReactElement | null => {
    const optionsSelect = field.options?.map((option) => ({
        label: option,
        value: option,
      })),
      fieldAnswer = newFormAnswer.answers.find(
        (answer) => answer.fieldId === field.id
      ),
      onChange = async (value: string | string[] | File) => {
        setNewFormAnswer({
          ...newFormAnswer,
          answers: await determineNewAnswers(field, value),
        });
      };

    switch (field.type) {
      case 'input':
        return (
          <InputSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      case 'textarea':
        return (
          <TextAreaSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      case 'checkbox':
        return (
          <CheckBoxSection
            {...field}
            className="mb-4"
            options={optionsSelect}
            onChange={onChange}
            value={fieldAnswer?.value as string[]}
          />
        );
      case 'select':
        return (
          <SelectSection
            {...field}
            className="mb-4"
            options={optionsSelect}
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      case 'date':
        return (
          <DateSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      case 'file':
        if (loading) {
          return <Spinner className="mr-4" size={30} />;
        } else {
          const fileNamesConcerned: FileNameBackFront[] =
              (fieldAnswer?.value as FileNameBackFront[]) ?? [],
            files: File[] = [];

          for (const fileNameConcerned of fileNamesConcerned) {
            const file: File | undefined = filesLoaded.find(
              (fileItem) =>
                fileNameConcerned.fileNameBack ===
                fileItem.fileNameBackFront.fileNameBack
            )?.file;

            if (file) {
              files.push(file);
            }
          }
          return (
            <UploadSection
              {...field}
              className="mb-4"
              acceptedFileTypes={field.acceptedFileTypes || ''}
              onFileAdd={onChange}
              onFileRemove={(file: string) => onFileRemove(file, field.id)}
              value={files}
            />
          );
        }

      case 'color':
        return (
          <ColorSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      case 'radio':
        return (
          <RadioSection
            {...field}
            className="mb-4"
            options={optionsSelect}
            onChange={onChange}
            value={fieldAnswer?.value as string}
          />
        );
      default:
        return null;
    }
  };

  //TODO: voir pour mutualiser avec renderField de /offers/details/forms
  return (
    <div>
      <Dialog
        isOpen={formDialog}
        onClose={handleClose}
        width={1200}
        className="h-full overflow-y-auto"
      >
        <h3>{form.title}</h3>
        {form.fields.map((field) => (
          <div key={field.id}>{renderField(field)}</div>
        ))}
        <div className="flex flex-col justify-between">
          <div className="text-right mt-6 flex flex-row items-center justify-end gap-2">
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="solid"
              onClick={handleSubmit}
              loading={waitToStore}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalCompleteForm;
