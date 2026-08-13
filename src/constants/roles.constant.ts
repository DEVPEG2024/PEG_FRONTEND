export const SUPER_ADMIN = 'super_admin'
export const ADMIN = 'admin'
export const USER = 'user'
export const CUSTOMER = 'customer'
export const PRODUCER = 'producer'
export const ACCOUNTANT = 'accountant'
export const PUBLISHER = 'publisher'
/** Générateur = apporteur d'affaires (parrainage + commissions). */
export const GENERATOR = 'generator'


export const roleToText: Record<string, string> = {
    [SUPER_ADMIN]: 'Super Administrateur',
    [ADMIN]: 'Administrateur',
    [USER]: 'Utilisateur',
    [CUSTOMER]: 'Client',
    [PRODUCER]: 'Producteur',
    [ACCOUNTANT]: 'Comptable',
    [PUBLISHER]: 'Éditeur',
    [GENERATOR]: 'Générateur',
  }

  export const ROLES_OPTIONS = [
    {
        label : 'Super Administrateur',
        value : SUPER_ADMIN
    },
    {
        label : 'Administrateur',
        value : ADMIN
    },
    {
        label : 'Comptable',
        value : ACCOUNTANT
    },
    {
        label : 'Éditeur',
        value : PUBLISHER
    },
    
  ]
  
  export function getUserRoleText(authorities: string[]): string {
    return authorities.map(role => roleToText[role] || role).join(', ')
  }

