// Actions du BAT d'un projet, partagées par l'onglet BAT et le bloc BAT de
// l'Accueil : dépôt et suppression (admin), réponse du client. Une seule
// implémentation → mêmes écritures, mêmes notifications, partout.
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAppSelector, getProjectById, useAppDispatch } from '../../store';
import { RootState, useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN, ADMIN, CUSTOMER } from '@/constants/roles.constant';
import { apiUploadFile } from '@/services/FileServices';
import { apiUpdateBatFile, apiUpdateBatStatus } from '@/services/ProductServices';
import { apiUpdateProject, apiUpdateProjectBat } from '@/services/ProjectServices';
import { apiCreateComment } from '@/services/CommentServices';
import { triggerNotification } from '@/services/NotificationService';
import { unwrapData } from '@/utils/serviceHelper';
import { batRefusalCommentContent, getProjectBat } from '@/utils/projectBat';

export const useProjectBatActions = () => {
  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  // Seul le client répond au BAT (le producteur le consulte).
  const isCustomer = hasRole(user, [CUSTOMER]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Commande d'un produit à BAT : fichier sur le produit, statut sur la commande.
  // Tout autre projet (devis, création admin) : BAT porté par le projet.
  const bat = getProjectBat(project);
  const orderItem = project?.orderItem;
  const product = orderItem?.product;
  const onProduct = bat?.source === 'product';
  // Le client valide depuis l'Accueil ; l'admin traite un refus dans « Modifications ».
  const projectUrl = `/common/projects/details/${project?.documentId}`;
  const rawSenderId = user?.documentId || user?.id || user?._id;
  const senderId = rawSenderId != null ? String(rawSenderId) : undefined;

  /** Admin : dépose (ou remplace) le BAT et le soumet au client. */
  const uploadBat = async (file: File): Promise<boolean> => {
    if (!project || !bat) return false;
    setUploading(true);
    try {
      // Relation média Strapi : id NUMÉRIQUE du fichier envoyé, jamais son documentId.
      const uploaded = await apiUploadFile(file);
      if (onProduct) {
        await apiUpdateBatFile(product!.documentId, orderItem!.documentId, uploaded.id);
      } else {
        await apiUpdateProjectBat(project.documentId, { batFile: uploaded.id, batStatus: 'pending', batComment: null });
      }
      await dispatch(getProjectById(project.documentId));
      toast.success('Nouveau BAT soumis au client');
      if (senderId && project.customer?.documentId) {
        triggerNotification({
          eventType: 'new_file',
          senderId,
          customerRecipient: project.customer.documentId,
          title: 'BAT à valider',
          message: `Un bon à tirer attend votre validation pour le projet "${project.name}"`,
          link: `${projectUrl}?tab=Accueil`,
          metadata: { projectId: project.documentId },
        });
      }
      return true;
    } catch {
      toast.error("Échec de l'envoi du BAT");
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Admin : suppression à tout moment, BAT validé compris. Sur une commande, le
  // BAT est celui du produit commandé : il quitte aussi sa fiche (dit avant).
  const deleteBat = async (): Promise<boolean> => {
    if (!project || !bat?.file) return false;
    const message = onProduct
      ? `Supprimer le BAT « ${bat.file.name} » ?\n\nC'est le BAT du produit « ${product?.name} » : il sera aussi retiré de sa fiche.`
      : `Supprimer le BAT « ${bat.file.name} » ?`;
    if (!window.confirm(message)) return false;
    setDeleting(true);
    try {
      if (onProduct) {
        await apiUpdateBatFile(product!.documentId, orderItem!.documentId, null);
      } else {
        await apiUpdateProjectBat(project.documentId, { batFile: null, batStatus: null, batComment: null });
      }
      await dispatch(getProjectById(project.documentId));
      toast.success('BAT supprimé');
      return true;
    } catch {
      toast.error('Échec de la suppression du BAT');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  // Refus : la demande (texte + photos) devient aussi un commentaire du projet.
  // Sans effet bloquant : si le commentaire échoue, le refus part quand même.
  const postRefusalComment = async (text: string, photos: File[]) => {
    if (!project) return;
    try {
      const imageIds: (string | number)[] = [];
      for (const photo of photos) imageIds.push((await apiUploadFile(photo)).id);
      const { createComment } = await unwrapData(apiCreateComment({
        content: batRefusalCommentContent(text),
        user,
        images: imageIds,
        visibility: 'customer',
      } as any));
      await apiUpdateProject({
        documentId: project.documentId,
        comments: [...(project.comments ?? []), createComment],
      });
    } catch {
      if (photos.length) toast.warning("Vos photos n'ont pas pu être jointes : ajoutez-les dans les commentaires.");
    }
  };

  /** Réponse du client. Lève en cas d'échec (l'écran garde la saisie). */
  const submitDecision = async (status: 'approved' | 'rejected', comment: string | null, photos: File[] = []) => {
    if (!project || !bat) return;
    if (status === 'rejected' && comment) await postRefusalComment(comment, photos);
    if (onProduct) {
      await apiUpdateBatStatus(orderItem!.documentId, status, comment);
    } else {
      await apiUpdateProjectBat(project.documentId, { batStatus: status, batComment: comment });
    }
    toast.success(status === 'approved' ? 'BAT approuvé' : 'BAT refusé');
    await dispatch(getProjectById(project.documentId));
    if (senderId) {
      triggerNotification({
        eventType: 'project_status_change',
        senderId,
        notifyAdmins: true,
        title: status === 'approved' ? 'BAT validé' : 'BAT refusé',
        message: status === 'approved'
          ? `Le client a validé le BAT du projet "${project.name}"`
          : `Le client a refusé le BAT du projet "${project.name}" : ${comment}`,
        link: status === 'approved' ? `${projectUrl}?tab=Accueil` : `${projectUrl}?tab=Modifications`,
        metadata: { projectId: project.documentId },
      });
    }
  };

  return {
    project,
    bat,
    onProduct,
    product,
    isAdmin,
    isCustomer,
    uploading,
    deleting,
    uploadBat,
    deleteBat,
    submitDecision,
  };
};
