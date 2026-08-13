import { User } from "./user";

export type SignInCredential = {
  identifier: string;
  password: string;
};

export type SignInResponse = {
  jwt: string;
  user: User
};

export type SignUpResponse = SignInResponse;

export type SignUpCredential = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  jobTitle?: string;
  companyName?: string;
  customerCategoryId?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  /** Code de parrainage d'un Générateur — rattache définitivement le nouveau client. */
  referralCode?: string;
};

/**
 * Inscription d'un apporteur d'affaires (« Générateur ») depuis la page de
 * connexion. Pas de secteur d'activité ni de code de parrainage : un Générateur
 * n'est pas un client et ne peut pas être parrainé.
 */
export type GeneratorSignUpCredential = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName?: string;
  phoneNumber?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  /** Version du contrat d'apport d'affaires acceptée — obligatoire, tracée en base. */
  contractVersion: string;
};

export type GeneratorSignUpResponse = {
  ok: boolean;
  requiresVerification: boolean;
  email: string;
  /** Code de parrainage attribué — affiché au Générateur après validation. */
  referralCode: string;
  referralLink: string;
};

export type ForgotPassword = {
  email: string;
};

export type ResetPassword = {
  code: string;
  password: string;
  passwordConfirmation: string;
};
