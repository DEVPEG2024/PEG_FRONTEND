import { FieldWidth, Option } from './types';

/**
 * Modèles de formulaires prêts à l'emploi.
 *
 * Un clic sur « Modèles » dans l'éditeur insère ces champs (avec des id frais)
 * et pré-remplit le nom du formulaire s'il est vide. L'admin ajuste ensuite
 * librement, puis attache le formulaire à un produit.
 */

export type TemplateField = {
  type: string;
  label: string;
  required?: boolean;
  width?: FieldWidth;
  placeholder?: string;
  description?: string;
  options?: Option[];
};

export type FormTemplate = {
  key: string;
  label: string;
  description: string;
  formName: string;
  fields: TemplateField[];
};

const opt = (labels: string[]): Option[] =>
  labels.map((l) => ({ label: l, value: l.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') }));

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: 'site-vitrine',
    label: 'Site internet vitrine',
    description: 'Brief complet pour la création d’un site vitrine',
    formName: 'Brief — Site internet vitrine',
    fields: [
      { type: 'textfield', label: "Nom de l'entreprise / du projet", required: true, width: 50 },
      { type: 'textfield', label: "Secteur d'activité", width: 50 },
      { type: 'textfield', label: 'Nom de domaine souhaité', placeholder: 'ex : mon-entreprise.fr', width: 50 },
      { type: 'select', label: 'Avez-vous déjà un logo ?', width: 50, options: opt(['Oui', 'Non', 'À créer']) },
      { type: 'file', label: 'Logo (si disponible)', description: 'Formats acceptés : PNG, SVG, JPG' },
      {
        type: 'checkboxgroup', label: 'Pages souhaitées',
        options: opt(['Accueil', 'À propos', 'Services / Prestations', 'Galerie / Réalisations', 'Tarifs', 'Blog / Actualités', 'Contact']),
      },
      {
        type: 'checkboxgroup', label: 'Fonctionnalités souhaitées',
        options: opt(['Formulaire de contact', 'Carte Google Maps', 'Liens réseaux sociaux', 'Galerie photos', 'Espace téléchargement', 'Site multilingue', 'Prise de rendez-vous']),
      },
      { type: 'textarea', label: 'Présentez votre activité', description: 'Le texte à mettre en avant sur le site' },
      { type: 'textfield', label: 'Couleurs / charte graphique souhaitées', placeholder: 'ex : bleu marine + doré', width: 50 },
      { type: 'select', label: 'Fournissez-vous les textes et photos ?', width: 50, options: opt(['Oui, tout est prêt', 'Partiellement', 'Non, à créer']) },
      { type: 'textarea', label: 'Sites qui vous inspirent', placeholder: 'Collez les liens de sites que vous aimez' },
      { type: 'select', label: 'Délai souhaité', width: 50, options: opt(['Moins de 2 semaines', '2 à 4 semaines', '1 à 2 mois', 'Flexible']) },
      { type: 'select', label: 'Budget indicatif', width: 50, options: opt(['Moins de 500 €', '500 – 1000 €', '1000 – 2000 €', 'Plus de 2000 €', 'À définir ensemble']) },
      { type: 'email', label: 'Email de contact', required: true, width: 50 },
      { type: 'phoneNumber', label: 'Téléphone', width: 50 },
      { type: 'textarea', label: 'Précisions / demandes particulières' },
    ],
  },
];
