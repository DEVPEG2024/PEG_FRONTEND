import { FieldDef } from './types';

export const FIELD_DEFS: FieldDef[] = [
  // Basique
  { type: 'textfield',    label: 'Texte',           iconChar: 'T',  color: '#6b9eff', category: 'basic' },
  { type: 'textarea',     label: 'Zone de texte',   iconChar: '¶',  color: '#a78bfa', category: 'basic' },
  { type: 'number',       label: 'Nombre',           iconChar: '#',  color: '#34d399', category: 'basic' },
  { type: 'password',     label: 'Mot de passe',    iconChar: '⬤',  color: '#94a3b8', category: 'basic' },
  { type: 'checkbox',     label: 'Case à cocher',   iconChar: '✓',  color: '#4ade80', category: 'basic' },
  { type: 'checkboxgroup',label: 'Cases à cocher',  iconChar: '☑',  color: '#22c55e', category: 'basic' },
  { type: 'select',       label: 'Sélection',       iconChar: '▾',  color: '#fbbf24', category: 'basic' },
  { type: 'radio',        label: 'Boutons radio',   iconChar: '◉',  color: '#f472b6', category: 'basic' },
  { type: 'file',         label: 'Fichier',          iconChar: '↑',  color: '#a3e635', category: 'basic' },
  // Avancé
  { type: 'email',        label: 'Email',            iconChar: '@',  color: '#fb923c', category: 'advanced' },
  { type: 'url',          label: 'URL',              iconChar: '⛓',  color: '#38bdf8', category: 'advanced' },
  { type: 'phoneNumber',  label: 'Téléphone',       iconChar: '☎',  color: '#60a5fa', category: 'advanced' },
  { type: 'datetime',     label: 'Date / Heure',    iconChar: '⊙',  color: '#22d3ee', category: 'advanced' },
  { type: 'day',          label: 'Jour',             iconChar: '◫',  color: '#818cf8', category: 'advanced' },
  { type: 'time',         label: 'Heure',            iconChar: '⏱',  color: '#c084fc', category: 'advanced' },
  { type: 'currency',     label: 'Devise',           iconChar: '€',  color: '#f59e0b', category: 'advanced' },
  { type: 'address',      label: 'Adresse',          iconChar: '⌂',  color: '#f87171', category: 'advanced' },
  { type: 'signature',    label: 'Signature',        iconChar: '✍',  color: '#e879f9', category: 'advanced' },
  // Mise en page
  { type: 'content',      label: 'Contenu',          iconChar: '≡',  color: '#64748b', category: 'layout' },
  { type: 'columns',      label: 'Colonnes',         iconChar: '⊞',  color: '#0ea5e9', category: 'layout' },
  { type: 'panel',        label: 'Panneau',          iconChar: '▣',  color: '#8b5cf6', category: 'layout' },
  { type: 'table',        label: 'Tableau',          iconChar: '⊟',  color: '#10b981', category: 'layout' },
  { type: 'tabs',         label: 'Onglets',          iconChar: '⊠',  color: '#f59e0b', category: 'layout' },
];

export const getFieldDef = (type: string): FieldDef =>
  FIELD_DEFS.find((d) => d.type === type) ?? FIELD_DEFS[0];

export const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basique',
  advanced: 'Avancé',
  layout: 'Mise en page',
};
