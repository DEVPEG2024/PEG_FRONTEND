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
    setFormAnswer
} from "../store";
import { IField, IForm } from "@/@types/form";
import InputSection from "@/views/app/admin/forms/builder/components/fields/input";
import TextAreaSection from "@/views/app/admin/forms/builder/components/fields/textArea";
import CheckBoxSection from "@/views/app/admin/forms/builder/components/fields/checkBox";
import SelectSection from "@/views/app/admin/forms/builder/components/fields/select";
import DateSection from "@/views/app/admin/forms/builder/components/fields/date";
import UploadSection from "@/views/app/admin/forms/builder/components/fields/uplaodSection";
import ColorSection from "@/views/app/admin/forms/builder/components/fields/color";
import RadioSection from "@/views/app/admin/forms/builder/components/fields/radio";
import { IFieldAnswer } from "@/@types/formAnswer";

function ModalCompleteForm({ form }: { form: IForm }) {
    const dispatch = useAppDispatch();
    const { formDialog } = useAppSelector((state) => state.showProduct.data)
    const formAnswer: {formId: string, answers: IFieldAnswer[]} = {
        formId: form._id,
        answers: []
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        dispatch(setFormAnswer(formAnswer))
        dispatch(setFormCompleted(true));
        handleClose();
    };

    const handleClose = () => {
        dispatch(setFormDialog(false));
    };

    const renderField = (field: IField) => {
        const optionsSelect = field.options?.map((option) => ({
            label: option,
            value: option
        })),
        onChange = (value: string) => {
            const newAnswers = [...formAnswer.answers.filter((answer) => answer.fieldId !== field.id), {fieldId: field.id, value}]

            formAnswer.answers = newAnswers
        }

        switch (field.type) {
            case 'input':
                return <InputSection {...field} className="mb-4" onChange={onChange} />
            case 'textarea':
                return <TextAreaSection {...field} className="mb-4" onChange={onChange} />
            case 'checkbox':
                return <CheckBoxSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} />
            case 'select':
                return <SelectSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} />
            case 'date':
                return <DateSection {...field} className="mb-4" onChange={onChange} />
            case 'file':
                return <UploadSection {...field} className="mb-4" acceptedFileTypes={field.acceptedFileTypes || ''} onChange={onChange} />
            case 'color':
                return <ColorSection {...field} className="mb-4" onChange={onChange} />
            case 'radio':
                return <RadioSection {...field} className="mb-4" options={optionsSelect} onChange={onChange} />
            default:
                return null
        }
    }

    return (
        <div>
            <Dialog isOpen={formDialog} onClose={handleClose} width={1200}>
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
