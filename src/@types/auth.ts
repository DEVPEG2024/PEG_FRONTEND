export type SignInCredential = {
  identifier: string;
  password: string;
};

export type SignInResponse = {
  jwt: string;
  user: {
    _id: string; // Identifiant unique
    firstName: string; // Prénom
    lastName: string; // Nom
    expoPushToken: string | null; // ID du client Stripe
    stripeCustomerId: string; // ID du client Stripe
    phone: string; // Numéro de téléphone
    address: string; // Adresse
    zip: string; // Code postal
    city: string; // Ville
    email: string; // Adresse e-mail
    password: string; // Mot de passe
    userName: string;
    authority: string[];
    role: string; // Rôle
    qrCode: string; // Code QR
    card_number: string; // Numéro de carte fidélité
    createdAt: Date; // Date de création
    updatedAt: Date; // Date de mise à jour
    deletedAt: Date | null; // Date de suppression
    deleted: boolean; // Indique si le produit est supprimé
  };
};

export type SignUpResponse = SignInResponse;

export type SignUpCredential = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type ForgotPassword = {
  email: string;
};

export type ResetPassword = {
  password: string;
};
