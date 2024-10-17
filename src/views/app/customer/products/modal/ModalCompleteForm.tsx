import {
    Button,
    Dialog,
    Spinner,
    Notification,
    toast
} from "@/components/ui";
import { t } from "i18next";
import {
    useAppDispatch,
    useAppSelector,
    setFormCompleted,
    setFormDialog,
    setFormAnswer
} from "../show/store";
import { IField, IForm } from "@/@types/form";
import InputSection from "@/views/app/admin/forms/builder/components/fields/input";
import TextAreaSection from "@/views/app/admin/forms/builder/components/fields/textArea";
import CheckBoxSection from "@/views/app/admin/forms/builder/components/fields/checkBox";
import SelectSection from "@/views/app/admin/forms/builder/components/fields/select";
import DateSection from "@/views/app/admin/forms/builder/components/fields/date";
import UploadSection from "@/views/app/admin/forms/builder/components/fields/uplaodSection";
import ColorSection from "@/views/app/admin/forms/builder/components/fields/color";
import RadioSection from "@/views/app/admin/forms/builder/components/fields/radio";
import { useEffect, useState } from "react";
import { FileItem, IFormAnswer, IFieldAnswer } from "@/@types/formAnswer";
import { CartItemFormAnswerEdition, editFormAnswerCartItem } from "@/store/slices/base/cartSlice";
import { apiDeleteFile, apiGetFile, apiUploadFile } from "@/services/FileServices";

type FileItemAndField = {
    field: string,
    fileItem: FileItem
}

function ModalCompleteForm({ form, onEdition }: { form: IForm, onEdition: boolean }) {
    const dispatch = useAppDispatch();
    const { formDialog, formAnswer, cartItemId } = useAppSelector((state) => state.showProduct.data)
    const [newFormAnswer, setNewFormAnswer] = useState<IFormAnswer>(formAnswer ? structuredClone(formAnswer) : {
        form: form._id,
        answers: []
    })
    const [filesLoaded, setFilesLoaded] = useState<FileItem[]>([])
    const [tempFiles, setTempFiles] = useState<FileItemAndField[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        const fetchFiles = async (): Promise<void> => {
            const fieldsFileTypedId: string[] = form.fields.filter(({ type }) => type === 'file').map(({ id }) => id)
            const filesToLoad: string[] = formAnswer?.answers
                .filter((answer) => fieldsFileTypedId.includes(answer.fieldId))
                .map((answer) => answer.value)
                .flat()
                .filter((value) => typeof value === 'string') ?? []
            const fileNamesLoaded: string[] = filesLoaded.map(({ fileName }) => fileName)
            const filesNotLoaded: string[] = filesToLoad?.filter((fileToLoad) => !fileNamesLoaded.includes(fileToLoad))
            if (filesNotLoaded.length > 0) {
                setLoading(true)
                const newFilesLoaded = await loadFiles(filesNotLoaded)
                const currentFilesLoaded = filesLoaded
                currentFilesLoaded.push(...newFilesLoaded)
                setFilesLoaded(currentFilesLoaded)
            }
            setLoading(false)
        }

        fetchFiles()
    }, [])

    const loadFile = async (
        fileName: string
    ): Promise<File | null> => {
        try {
            return await apiGetFile(fileName)
        } catch (error) {
            console.error("Erreur lors de la récupération du fichier :", error);
        }
        return null
    };

    const loadFiles = async (fileNames: string[]): Promise<FileItem[]> => {
        const files: FileItem[] = []
        for (const fileName of fileNames) {
            const file = await loadFile(fileName)
            if (file) {
                files.push({ fileName, file })
            }
        }
        return files
    }

    const handleSubmit = async (e: any): Promise<void> => {
        e.preventDefault();
        await uploadFiles(tempFiles)
        if (onEdition) {
            handleEditFormAnswerCartItem()
        }
        dispatch(setFormAnswer(newFormAnswer))
        dispatch(setFormCompleted(true));
        handleClose();
    };

    const handleEditFormAnswerCartItem = (): void => {
        dispatch(editFormAnswerCartItem({ cartItemId, formAnswer: newFormAnswer } as CartItemFormAnswerEdition));
        toast.push(
            <Notification type="success" title="Modifié">
                Formulaire modifié
            </Notification>
        )
    }

    const uploadFiles = async (fileItemsAndField: FileItemAndField[]): Promise<void> => {
        const currentFilesLoaded = filesLoaded
        for (const fileItemAndField of fileItemsAndField) {
            const fileItem: FileItem = fileItemAndField.fileItem,
                fileName: string | undefined = await uploadFile(fileItem.file),
                newAnswer: IFieldAnswer | undefined = newFormAnswer.answers.find(({ fieldId }) => fieldId === fileItemAndField.field)

            if (newAnswer && fileName) {
                const newValue: string[] = [...newAnswer.value.filter((name: string) => name !== fileItem.fileName), fileName]
                newAnswer.value = newValue
                newFormAnswer.answers = [...newFormAnswer.answers.filter(({ fieldId }) => fieldId !== fileItemAndField.field), newAnswer]
                currentFilesLoaded.push({ file: fileItem.file, fileName })
            }
        }
        setFilesLoaded(currentFilesLoaded)
        setTempFiles([])
    }

    const handleClose = (): void => {
        dispatch(setFormDialog(false));
    };

    const uploadFile = async (
        file: File
    ): Promise<string | undefined> => {
        try {
            const data = await apiUploadFile(file)

            return data.fileName
        } catch (error) {
            console.error("Erreur lors de l'upload du fichier :", error);
        }
    };

    const onFileRemove = async (
        fileName: string, field: string
    ): Promise<void> => {
        const fileFromFilesLoaded: FileItem | undefined = filesLoaded.find((fileLoaded) => fileLoaded.fileName === fileName)

        if (fileFromFilesLoaded) {
            try {
                await apiDeleteFile(fileName)
                const currentFilesLoaded: FileItem[] = filesLoaded
                setFilesLoaded(currentFilesLoaded.filter(({ fileName: fileNameCurrentFile }) => fileNameCurrentFile !== fileName))
            } catch (error) {
                console.error("Erreur lors de la suppression du fichier :", error);
            }
        } else {
            setTempFiles(tempFiles.filter((tempFile) => tempFile.field !== field || tempFile.fileItem.fileName !== fileName))
        }

        const currentFiles: string[] = newFormAnswer.answers.find((answer) => answer.fieldId === field)?.value as string[] ?? []
        const newAswer = [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field), { fieldId: field, value: currentFiles.filter((file: string) => file !== fileName) }]
        setNewFormAnswer({ ...newFormAnswer, answers: newAswer })
    };

    const determineNewAnswers = async (field: IField, value: string | string[] | File | { label: string, value: string } | Date): Promise<IFieldAnswer[]> => {
        switch (field.type) {
            case 'date':
                const dateSelected: Date = value as Date
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value: dateSelected?.toISOString() ?? null }]
            case 'file':
                const file: File = value as File
                const newTempFiles: FileItemAndField[] = [...tempFiles]
                newTempFiles.push({ field: field.id, fileItem: { fileName: file.name, file } })
                setTempFiles(newTempFiles)
                const currentFiles: string[] = newFormAnswer.answers.find((answer) => answer.fieldId === field.id)?.value as string[] ?? []
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value: [...currentFiles, file.name] }]
            default:
                const valueSelected: string | string[] = value as string | string[]
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value: valueSelected }]
        }
    }

    const renderField = (field: IField): React.ReactElement | null => {
        const optionsSelect = field.options?.map((option) => ({
            label: option,
            value: option
        })),
            fieldAnswer = newFormAnswer.answers.find((answer) => answer.fieldId === field.id),
            onChange = async (value: string | string[] | File) => {
                setNewFormAnswer({ ...newFormAnswer, answers: await determineNewAnswers(field, value) })
            }

        switch (field.type) {
            case 'input':
                return <InputSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string} />
            case 'textarea':
                return <TextAreaSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string} />
            case 'checkbox':
                return <CheckBoxSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} value={fieldAnswer?.value as string[]} />
            case 'select':
                return <SelectSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} value={fieldAnswer?.value as string} />
            case 'date':
                return <DateSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string} />
            case 'file':
                if (loading) {
                    return <Spinner className="mr-4" size={30} />
                } else {
                    const fileNamesConcerned: string[] = fieldAnswer?.value as string[] ?? [],
                        tempFilesItem: FileItem[] = tempFiles.map(({ fileItem }) => fileItem),
                        files: File[] = []
                    for (const fileNameConcerned of fileNamesConcerned) {
                        const file: File | undefined = [...filesLoaded, ...tempFilesItem].find((fileItem) => fileNameConcerned === fileItem.fileName)?.file

                        if (file) {
                            files.push(file)
                        }
                    }
                    return <UploadSection {...field} className="mb-4" acceptedFileTypes={field.acceptedFileTypes || ''} onFileAdd={onChange} onFileRemove={(file: string) => onFileRemove(file, field.id)} value={files} />
                }

            case 'color':
                return <ColorSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string} />
            case 'radio':
                return <RadioSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} value={fieldAnswer?.value as string} />
            default:
                return null
        }
    }

    //TODO: voir pour mutualiser avec renderField de /offers/details/forms
    return (
        <div>
            <Dialog isOpen={formDialog} onClose={handleClose} width={1200} className="h-full overflow-y-auto">
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
                            {t("cancel")}
                        </Button>
                        <Button variant="solid" onClick={handleSubmit}>
                            {t("save")}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

export default ModalCompleteForm;
