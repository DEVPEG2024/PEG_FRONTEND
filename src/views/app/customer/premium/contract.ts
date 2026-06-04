// Contrat d'abonnement PEG Premium — texte affiché et accepté par le client avant paiement.
// La version doit être incrémentée à chaque modification du texte (trace juridique côté backend).
import { PREMIUM_PRICE_HT } from '@/services/PremiumServices';

export const PREMIUM_CONTRACT_VERSION = '1.0';

const priceTTC = Math.round(PREMIUM_PRICE_HT * 1.2);

export const PREMIUM_CONTRACT_TITLE = "Contrat d'abonnement « PEG Premium »";

// Texte du contrat. Les mentions entre crochets sont à compléter avec les informations légales réelles.
export const PREMIUM_CONTRACT_TEXT = `CONTRAT D'ABONNEMENT « PEG PREMIUM » — version ${PREMIUM_CONTRACT_VERSION}

Conditions particulières d'abonnement au service Premium, à accepter par le Client avant tout paiement.

ENTRE :
PEG — [dénomination sociale], [forme juridique], immatriculée sous le numéro [SIREN], siège social [adresse], représentée par [représentant légal] (ci-après « PEG » ou « le Prestataire »),
ET :
Le client professionnel identifié dans son espace personnel sur app.mypeg.fr (ci-après « le Client »).

PRÉAMBULE
PEG exploite une plateforme professionnelle (B2B) de commande de produits et services personnalisés et propose une formule d'abonnement payante « Premium ». L'acceptation des présentes est un préalable obligatoire au paiement et à l'activation de l'abonnement. Le Client agissant dans le cadre de son activité professionnelle, le droit de rétractation des consommateurs ne s'applique pas.

ARTICLE 1 — OBJET
Le présent contrat définit les conditions de souscription, d'exécution, de facturation et de résiliation de l'abonnement PEG Premium.

ARTICLE 2 — DESCRIPTION DE L'OFFRE
La souscription confère, pendant la durée de validité de l'abonnement :
1. Une remise automatique de quinze pour cent (-15 %) sur l'ensemble du catalogue standard, appliquée aux prix affichés et aux montants facturés ;
2. L'accès aux offres personnalisées (« Mes offres ») préparées par PEG ;
3. Un accompagnement prioritaire des projets du Client.
Les avantages sont strictement personnels et non cessibles. PEG peut faire évoluer le contenu des avantages en informant le Client par écrit dans un délai raisonnable ; toute évolution substantiellement défavorable ouvre un droit de résiliation (article 7).

ARTICLE 3 — TARIF
L'abonnement est facturé ${PREMIUM_PRICE_HT} € HT par mois, soit ${priceTTC} € TTC par mois (TVA au taux légal de 20 %). Le tarif est ferme pendant la durée d'engagement (article 5). Toute révision ultérieure fait l'objet d'un préavis écrit de trente (30) jours ouvrant, à défaut d'acceptation, un droit de résiliation.

ARTICLE 4 — MODALITÉS DE PAIEMENT
Le paiement s'effectue en ligne par carte bancaire via le prestataire sécurisé Stripe, sous forme d'un prélèvement mensuel automatique récurrent à la date anniversaire de la souscription. L'activation des avantages intervient après confirmation du paiement. En cas d'échec ou de défaut de paiement, PEG peut suspendre immédiatement l'accès aux avantages, voire résilier de plein droit, sans préjudice du recouvrement des sommes dues.

ARTICLE 5 — DURÉE ET ENGAGEMENT
L'abonnement est souscrit pour une durée d'engagement minimale de six (6) mois à compter de l'activation. À l'issue de cette période, il se renouvelle par tacite reconduction par périodes successives d'un (1) mois, sauf résiliation (article 7).

ARTICLE 6 — OBLIGATIONS DES PARTIES
PEG met à disposition les avantages décrits à l'article 2, dans les limites de disponibilité de la plateforme. Le Client s'engage à fournir des informations exactes, à utiliser les avantages conformément à leur destination professionnelle, à s'acquitter des sommes dues aux échéances, et à ne pas céder ni partager le bénéfice de son abonnement.

ARTICLE 7 — RÉSILIATION
Le Client peut résilier à tout moment après l'expiration de la période d'engagement de six (6) mois, depuis son espace personnel ; la résiliation prend effet à la fin de la période mensuelle en cours déjà payée, sans remboursement au prorata. Une demande formulée avant la fin de l'engagement ne prend effet qu'au terme de celui-ci, les mensualités restant dues. PEG peut résilier de plein droit, sans indemnité, en cas de manquement non régularisé dans les quinze (15) jours suivant mise en demeure. À la prise d'effet de la résiliation, le Client perd l'accès à l'ensemble des avantages Premium.

ARTICLE 8 — DONNÉES PERSONNELLES
Les données sont traitées par PEG (responsable de traitement) aux fins de gestion de l'abonnement, de facturation et de relation commerciale. Les données de paiement sont traitées par Stripe (certifié PCI-DSS) ; PEG n'a pas accès aux numéros de carte. Conformément au RGPD, le Client dispose des droits d'accès, de rectification, d'effacement et de portabilité, exerçables à [e-mail de contact].

ARTICLE 9 — RESPONSABILITÉ
La responsabilité de PEG ne saurait être engagée en cas d'indisponibilité temporaire de la plateforme, de force majeure ou d'utilisation non conforme. En tout état de cause, elle est limitée au montant des sommes versées au titre de l'abonnement sur les douze (12) derniers mois.

ARTICLE 10 — DROIT APPLICABLE ET LITIGES
Le présent contrat est soumis au droit français. À défaut de résolution amiable, compétence exclusive est attribuée aux tribunaux du ressort du siège social de PEG.

ACCEPTATION
En cochant la case d'acceptation et en procédant au paiement, le Client déclare avoir pris connaissance de l'intégralité des présentes conditions, les accepter sans réserve, et disposer du pouvoir d'engager la société qu'il représente.`;

// Déclenche le téléchargement du contrat en .txt côté navigateur
export function downloadPremiumContract() {
  const blob = new Blob([PREMIUM_CONTRACT_TEXT], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Contrat-PEG-Premium-v${PREMIUM_CONTRACT_VERSION}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
