export const statusColorData = {
  pending: 'bg-blue-500',
  completed: 'bg-green-500',
  waiting: 'bg-yellow-500',
  canceled: 'bg-red-500',
};
export const statusColorText = {
  pending: 'text-blue-500',
  completed: 'text-green-500',
  waiting: 'text-yellow-500',
  canceled: 'text-red-500',
};
export const statusTextData = {
  pending: 'En cours',
  completed: 'Terminé',
  waiting: 'En attente',
  canceled: 'Annulé',
};

export const priorityColorData = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};
export const priorityColorText = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};
export const priorityTextData = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Elevé',
};

export const priorityData = [
  {
    value: 'low',
    label: 'Faible',
  },
  {
    value: 'medium',
    label: 'Moyen',
  },
  {
    value: 'high',
    label: 'Elevé',
  },
];

export const stateData = [
  {
    value: 'pending',
    label: 'En attente',
  },
  {
    value: 'fulfilled',
    label: 'Payée',
  },
  {
    value: 'canceled',
    label: 'Annulée',
  },
];

export const paymentStateData = [
  {
    value: 'pending',
    label: 'En attente',
  },
  {
    value: 'fulfilled',
    label: 'Payé',
  },
];

export const paymentModeData = [
  {
    value: 'cash',
    label: 'Espèces',
  },
  {
    value: 'cheque',
    label: 'Chèque',
  },
  {
    value: 'transfer',
    label: 'Virement',
  },
  {
    value: 'card',
    label: 'Carte bancaire',
  },
];
