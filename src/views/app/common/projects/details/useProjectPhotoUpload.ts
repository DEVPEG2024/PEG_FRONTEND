// Photo d'un projet sans commande (admin) : envoi du fichier puis rattachement.
// Partagé par l'onglet Accueil (ordinateur) et l'en-tête du téléphone.
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Project } from '@/@types/project';
import { PegFile } from '@/@types/pegFile';
import { useAppDispatch } from '@/store';
import { apiUploadFile } from '@/services/FileServices';
import { getProjectById, updateCurrentProject } from './store';

export function useProjectPhotoUpload(project: Project) {
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const pegFile = await apiUploadFile(file);
      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          // L'API attend des IDs de fichiers (number) pour la relation images en écriture GraphQL, pas des PegFile complets.
          images: [pegFile.id] as unknown as PegFile[],
        })
      ).unwrap();
      await dispatch(getProjectById(project.documentId));
    } catch (err) {
      toast.error("Échec de l'envoi de la photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return { uploading, inputRef, onFileChange };
}
