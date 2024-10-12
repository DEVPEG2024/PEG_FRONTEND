import {
    Button,
    Dialog
} from "@/components/ui";
import { t } from "i18next";
import {
    useAppDispatch,
    useAppSelector,
    setFormCompleted,
    setFormDialog,
    setFormAnswer,
    setFilesUploaded,
    loadFiles
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
import { IFormAnswer } from "@/@types/formAnswer";
import { API_BASE_URL } from "@/configs/api.config";

function ModalCompleteForm({ form }: { form: IForm }) {
    const dispatch = useAppDispatch();
    const { formDialog, formAnswer, filesUploaded } = useAppSelector((state) => state.showProduct.data)
    const [newFormAnswer, setNewFormAnswer] = useState<IFormAnswer>(formAnswer ? structuredClone(formAnswer) : {
        formId: form._id,
        answers: []
    })

    useEffect(() => {
        const fieldsFileTypedId: string[] = form.fields.filter(({type}) => type === 'file').map(({id}) => id)
        const updloadedFileNames: string[] | undefined= formAnswer?.answers
            .filter((answer) => fieldsFileTypedId.includes(answer.fieldId))
            .map((answer) => answer.value)
            .flat()
            .filter((value) => typeof value === 'string')
        
        if (Array.isArray(updloadedFileNames) && updloadedFileNames?.length > 0) {
            dispatch(loadFiles(updloadedFileNames))
        }
    }, [])

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        dispatch(setFormAnswer(newFormAnswer))
        dispatch(setFormCompleted(true));
        handleClose();
    };

    const handleClose = () => {
        dispatch(setFormDialog(false));
    };

    const uploadFile = async (
        file: File
      ) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(API_BASE_URL + "/upload", {
            method: "POST",
            body: formData,
            });
            const data = await response.json();
            return data.fileName
        } catch (error) {
            console.error("Erreur lors de l'upload du fichier :", error);
        }
      };

    const onFileRemove = async (
        fileName: string
      ) => {
        try {
            await fetch(API_BASE_URL + "/upload/delete/" + fileName, {
                method: "DELETE"
            });
        } catch (error) {
            console.error("Erreur lors de la suppression du fichier :", error);
        }
      };

    const determineNewAnswers = async (field: IField, value: string | string[] | File | {label: string, value: string} | Date) => {
        switch (field.type) {
            case 'checkbox':
                const selection : string[] = value as string[]
                const currentAnswer: [] = newFormAnswer.answers.find((answer) => answer.fieldId === field.id)?.value ?? []
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), {fieldId: field.id, value: [...currentAnswer, ...selection]}]
            case 'date':
                const dateSelected : Date = value as Date
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value: dateSelected.toISOString() }]
            case 'input':
                const file : File = value as File
                const fileName = await uploadFile(file)
                const newFilesUploaded = filesUploaded
                newFilesUploaded.set(fileName, file)
                setFilesUploaded(newFilesUploaded)
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value: file }]
            default:
                return [...newFormAnswer.answers.filter((answer) => answer.fieldId !== field.id), { fieldId: field.id, value }]
        }
    }

    const renderField = (field: IField) => {
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
                return <SelectSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} value={fieldAnswer?.value as string}/>
            case 'date':
                return <DateSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string}/>
            case 'file':
                const files: File[] | [] = (fieldAnswer?.value as string[])?.map((fileName) => filesUploaded.get(fileName)).filter((file) => file) ?? []
                return <UploadSection {...field} className="mb-4" acceptedFileTypes={field.acceptedFileTypes || ''} onFileAdd={onChange} value={files} />
            case 'color':
                return <ColorSection {...field} className="mb-4" onChange={onChange} value={fieldAnswer?.value as string}/>
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
