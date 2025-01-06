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
};

export type ForgotPassword = {
  email: string;
};

export type ResetPassword = {
  password: string;
};
