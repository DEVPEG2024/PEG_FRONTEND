import { User } from "@/@types/user";

export const hasRole = (user: User, roles: string[]) => {
  if (!user || !user.role) return false;
  return roles.includes(user.role.name);
};