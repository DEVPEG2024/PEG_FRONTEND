import {
    Button,
    Dialog
} from "@/components/ui";
import { t } from "i18next";
import {
    useAppDispatch,
    useAppSelector,
    setFormCompleted,
    setFormDialog
} from "../store";
import { IForm, IFormList } from "@/@types/forms";
import InputSection from "@/views/app/admin/forms/builder/components/fields/input";
import TextAreaSection from "@/views/app/admin/forms/builder/components/fields/textArea";
import CheckBoxSection from "@/views/app/admin/forms/builder/components/fields/checkBox";
import SelectSection from "@/views/app/admin/forms/builder/components/fields/select";
import DateSection from "@/views/app/admin/forms/builder/components/fields/date";
import UploadSection from "@/views/app/admin/forms/builder/components/fields/uplaodSection";
import ColorSection from "@/views/app/admin/forms/builder/components/fields/color";
import RadioSection from "@/views/app/admin/forms/builder/components/fields/radio";

function ModalCompleteForm({ form }: { form: IFormList }) {
    const dispatch = useAppDispatch();
    const { formDialog } = useAppSelector((state) => state.showProduct.data)

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        dispatch(setFormCompleted(true));
        handleClose();
    };

    const handleClose = () => {
        dispatch(setFormDialog(false));
    };

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

const renderField = (field: IForm) => {
    const optionsSelect = field.options?.map((option) => ({
        label: option,
        value: option
    }))
    switch (field.type) {
        case 'input':
            return <InputSection {...field} className="mb-4" />
        case 'textarea':
            return <TextAreaSection {...field} className="mb-4" />
        case 'checkbox':
            return <CheckBoxSection {...field} className="mb-4" options={optionsSelect} />
        case 'select':
            return <SelectSection {...field} className="mb-4" options={optionsSelect} />
        case 'date':
            return <DateSection {...field} className="mb-4" />
        case 'file':
            return <UploadSection {...field} className="mb-4" acceptedFileTypes={field.acceptedFileTypes || ''} />
        case 'color':
            return <ColorSection {...field} className="mb-4" />
        case 'radio':
            return <RadioSection {...field} className="mb-4" options={optionsSelect} />
        default:
            return null
    }
}

export default ModalCompleteForm;
