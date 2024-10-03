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
import { useEffect } from "react";

function ModalCompleteForm({ form }: { form: string }) {
    const dispatch = useAppDispatch();
    const { formDialog } = useAppSelector((state) => state.products.data)

    useEffect(() => {
        dispatch(getForm(form))
    }, [dispatch])

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
