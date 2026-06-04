export type PegFile = {
  documentId: string;
  id: string;
  url: string;
  name: string;
  file: File;
};

/**
 * Image manipulée par le composant d'upload : soit un fichier fraîchement
 * sélectionné côté client ({ file, name }, sans champs serveur), soit une image
 * déjà présente sur Strapi (documentId/id/url). Sépare ce cas de PegFile pour
 * ne pas rendre PegFile partiel partout.
 */
export type UploadImage = {
  documentId?: string;
  id?: string;
  url?: string;
  name: string;
  file?: File;
};