import { IoIosCheckbox } from "react-icons/io";
import { IoMdRadioButtonOn } from "react-icons/io";
import { GoSingleSelect } from "react-icons/go";
import { LuFormInput, LuUploadCloud, LuCalendar } from "react-icons/lu";
import { VscSymbolColor } from "react-icons/vsc";
import { IconType } from 'react-icons';
import { GoNumber } from "react-icons/go";

export type Form = {
    id: string;
    type: string;
    label: string;
    placeholder: string;
    icon: IconType;
    options?: string[];
    inputType?: string;
    rows?: number;
    defaultDate?: Date | null;
    acceptedFileTypes?: string;
    min?: number;
    max?: number;
    defaultColor?: string;
}

export const Forms: Form[] = [
    {
        id: "1",
        type: "input",
        label: "Texte court",
        placeholder: "Entrez un texte court",
        icon: LuFormInput,
        inputType: "text"
    },
    {
        id: "2",
        type: "textarea",
        label: "Texte long",
        placeholder: "Entrez un texte long",
        icon: LuFormInput,
        rows: 4
    },
    {
        id: "3",
        type: "select",
        label: "Sélection",
        placeholder: "Choisissez une option",
        icon: GoSingleSelect,
        options: ["Option 1", "Option 2", "Option 3"]
    },
    {
        id: "4",
        type: "checkbox",
        label: "Cases à cocher",
        placeholder: "Sélectionnez une ou plusieurs options",
        icon: IoIosCheckbox,
        options: ["Option 1", "Option 2", "Option 3"]
    },
    {
        id: "5",
        type: "radio",
        label: "Boutons radio",
        placeholder: "Sélectionnez une seule option",
        icon: IoMdRadioButtonOn,
        options: ["Option 1", "Option 2", "Option 3"]
    },
    {
        id: "6",
        type: "date",
        label: "Date",
        placeholder: "Sélectionnez une date",
        icon: LuCalendar,
        defaultDate: null
    },
    {
        id: "7",
        type: "file",
        label: "Fichier",
        placeholder: "Téléchargez un fichier",
        icon: LuUploadCloud,
        acceptedFileTypes: ".pdf,.doc,.docx,.jpg,.png,.jpeg"
    },
    {
        id: "8",
        type: "number",
        label: "Nombre",
        placeholder: "Entrez un nombre",
        icon: GoNumber,
        min: 0,
        max: 100
    },
    {
        id: "9",
        type: "color",
        label: "Couleur",
        placeholder: "Choisissez une couleur",
        icon: VscSymbolColor,
        defaultColor: "#000000"
    },
];
