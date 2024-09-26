export type IMarket = {
  _id: string; // Identifiant unique du produit`
  title: string; // Nom du produit
  address: string; // Adresse du magasin
  city: string; // Ville du magasin
  state: string; // État du magasin
  zip: string; // Code postal du magasin
  country: string; // Pays du magasin
  phone: string; // Numéro de téléphone du magasin
  email: string; // Adresse e-mail du magasin
  code: string; // Code du magasin
  status: boolean; // Statut du magasin
  openingHours: {
    lundi: string;
    mardi: string;
    mercredi: string;
    jeudi: string;
    vendredi: string;
    samedi: string;
    dimanche: string;
  }; // Horaires d'ouverture du magasin
};
