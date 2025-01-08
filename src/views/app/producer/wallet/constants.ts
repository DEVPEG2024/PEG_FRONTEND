


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

export const paymentAddTypes = [
  {
    value: 'projectPayment',
    label: 'Règlement du projet',
    type: 'add',
  },
  {
    value: 'advancePayment',
    label: 'Paiement d\'avance',
    type: 'add',
  },
  {
    value: 'bonus',
    label: 'Bonus',
    type: 'add',
  },
  {
    value: 'milestonePayment',
    label: 'Paiement d\'étape',
    type: 'add',
  },
]

export const paymentRemoveTypes = [
  
  {
    value: 'withdrawal',
    label: 'Retrait',
    type: 'remove',
  },
  {
    value: 'adjustmentCredit',
    label: 'Ajustement créditeur',
    type: 'add',
  },
  {
    value: 'adjustmentDebit',
    label: 'Ajustement débiteur',
    type: 'add',
  },
  {
    value: 'chargeBack',
    label: 'Charge back',
    type: 'add',
  },
];

export const paymentTypes = [...paymentAddTypes, ...paymentRemoveTypes];