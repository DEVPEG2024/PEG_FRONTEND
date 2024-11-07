import { Button, Dialog, Spinner } from '@/components/ui';
import { useAppDispatch, useAppSelector, setFormDialog } from '../store';
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
import { FileItem, FileNameBackFront } from '@/@types/file';
import { loadFiles } from '@/services/FileServices';

function ModalShowForm({ form }: { form: IForm }) {
  const dispatch = useAppDispatch();
  const { formDialog, formAnswer } = useAppSelector(
    (state) => state.showOrder.data
  );
  const [filesLoaded, setFilesLoaded] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleClose = (): void => {
    dispatch(setFormDialog(false));
  };

  const renderField = (field: IField): React.ReactElement | null => {
    const optionsSelect = field.options?.map((option) => ({
        label: option,
        value: option,
      })),
      fieldAnswer = formAnswer?.answers.find(
        (answer) => answer.fieldId === field.id
      ),
      onChange = () => {};

    switch (field.type) {
      case 'input':
        return (
          <InputSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
            disabled={true}
          />
        );
      case 'textarea':
        return (
          <TextAreaSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
            disabled={true}
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
            disabled={true}
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
            disabled={true}
          />
        );
      case 'date':
        return (
          <DateSection
            {...field}
            className="mb-4"
            onChange={onChange}
            value={fieldAnswer?.value as string}
            disabled={true}
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
              onFileRemove={() => {}}
              value={files}
              disabled={true}
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
            disabled={true}
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
            disabled={true}
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
              Fermer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalShowForm;
