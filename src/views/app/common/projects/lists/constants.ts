import {
  ADMIN,
  CUSTOMER,
  PRODUCER,
  SUPER_ADMIN,
} from '@/constants/roles.constant';
import { paymentTypes } from '@/views/app/producer/wallet/constants';

export const statusColorData = {
  pending: 'bg-blue-500',
  fulfilled: 'bg-green-500',
  waiting: 'bg-yellow-500',
  canceled: 'bg-red-500',
};
export const statusColorText = {
  pending: 'text-blue-500',
  fulfilled: 'text-green-500',
  waiting: 'text-yellow-500',
  canceled: 'text-red-500',
};
export const statusTextData = {
  pending: 'En cours',
  fulfilled: 'Terminé',
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
export const statsDataTask = [
  {
    value: 'pending',
    label: 'En cours',
  },
  {
    value: 'fulfilled',
    label: 'Terminé',
  },
];
export const stateData = [
  {
    value: 'pending',
    label: 'En cours',
  },
  {
    value: 'fulfilled',
    label: 'Terminé',
  },
  {
    value: 'waiting',
    label: 'En attente',
  },
  {
    value: 'canceled',
    label: 'Annulé',
  },
];
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

export const paymentProducerProjectTypes = paymentTypes.filter(({ value }) =>
  ['projectPayment', 'advancePayment', 'milestonePayment'].includes(value)
);

export const visibilityData = [
  {
    value: 'all',
    label: 'Tous les utilisateurs',
  },
  {
    value: PRODUCER,
    label: 'Producteur uniquement',
  },
  {
    value: CUSTOMER,
    label: 'Client uniquement',
  },
  {
    value: ADMIN,
    label: 'Administrateur uniquement',
  },
  {
    value: SUPER_ADMIN,
    label: 'Super administrateur uniquement',
  },
];
