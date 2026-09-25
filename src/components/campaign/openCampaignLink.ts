import type { NavigateFunction } from 'react-router-dom';
import { isInternalLink, isSafeCtaUrl } from '@/utils/campaignFormat';

/** Bouton d'action : navigation dans l'app pour un chemin interne, nouvel onglet sinon. */
export function openCampaignLink(url: string, navigate: NavigateFunction) {
  if (!isSafeCtaUrl(url)) return;
  if (isInternalLink(url)) navigate(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
