import Header from "@/components/template/Header";
import UserDropdown from "@/components/template/UserDropdown";
import SideNavToggle from "@/components/template/SideNavToggle";
import MobileDock from "@/components/template/MobileDock";
import SideNav from "@/components/template/SideNav";
import Logo from "@/components/template/Logo";
import View from "@/views";
import OnlineUsersCount, { OnlinePing } from "../template/OnlineUsersCount";
import NotificationBell from "../template/NotificationBell";
import PwaInstallPrompt from "../template/PwaInstallPrompt";
import CampaignPopup from "../template/CampaignPopup";
import { MdShoppingCart } from "react-icons/md";
import { Alert } from "../ui";
import { RootState, useAppSelector } from "@/store";
import { AuthorityCheck } from "../shared";
import { Link } from "react-router-dom";
import useUserCart from "@/utils/hooks/useUserCart";
import useResponsive from "@/utils/hooks/useResponsive";

// Téléphone : le logo remplace le bouton de menu, passé dans la barre d'onglets
// (MobileDock). Au-delà de md, la barre latérale porte le logo.
const HeaderActionsStart = () => {
  const { smaller } = useResponsive();
  const mode = useAppSelector((state) => state.theme.mode);
  return (
    <>
      {smaller.md && (
        <Link to="/home" className="peg-header-brand" aria-label="Accueil">
          <Logo mode={mode} type="wordmark" imgStyle={{ height: 28, width: 'auto', display: 'block' }} />
        </Link>
      )}
      <SideNavToggle />
    </>
  );
};

const HeaderActionsEnd = () => {
  const { documentId } = useAppSelector((state: RootState) => state.auth.user.user);
  const cart = useUserCart(documentId);
  const userAuthority = useAppSelector((state) => state.auth.user.user.authority)
  const { smaller } = useResponsive();
  return (
    <>
      <AuthorityCheck
        userAuthority={userAuthority as string[]}
        authority={["customer"]}
      >
        {smaller.md ? (
          <>
          {/* Emplacement du bouton de l'assistant (ChatWidget y rend son bouton par
              portail, à gauche du panier). `display: contents` : aucune boîte, rien
              ne bouge tant que le bouton est replié. */}
          <span id="peg-chat-header-slot" style={{ display: 'contents' }} />
          {/* Téléphone : l'icône et son compteur, comme dans une app */}
          <Link
            to="/customer/cart"
            className="header-action-item peg-header-cart"
            aria-label={`Mon panier (${cart.length})`}
          >
            <MdShoppingCart size={22} />
            {cart.length > 0 && <span className="peg-header-cart-count">{cart.length}</span>}
          </Link>
          </>
        ) : (
          <Link to="/customer/cart">
            <Alert
              showIcon
              type="success"
              customIcon={<MdShoppingCart size={20} />}
              className="bg-slate-600"
            >
              <span >{cart.length} | Mon panier</span>
            </Alert>
          </Link>
        )}
      </AuthorityCheck>
      <AuthorityCheck
        userAuthority={userAuthority as string[]}
        authority={["admin", "super_admin"]}
      >
        <OnlineUsersCount />
      </AuthorityCheck>
      <OnlinePing />
      <NotificationBell />
      <UserDropdown hoverable={false} />
    </>
  );
};

// Pop-up des campagnes : clients uniquement.
const CustomerCampaignPopup = () => {
  const userAuthority = useAppSelector((state) => state.auth.user.user.authority);
  return (
    <AuthorityCheck userAuthority={userAuthority as string[]} authority={["customer"]}>
      <CampaignPopup />
    </AuthorityCheck>
  );
};

const ModernLayout = () => {
  return (
    <div className="app-layout-modern flex flex-auto flex-col">
      <div className="flex flex-auto min-w-0">
        <SideNav />
        <div className="peg-app-main flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <Header
            className="border-b border-gray-200 dark:border-gray-700"
            headerEnd={<HeaderActionsEnd />}
            headerStart={<HeaderActionsStart />}
          />
          <View />
        </div>
      </div>
      <MobileDock />
      <PwaInstallPrompt />
      <CustomerCampaignPopup />
    </div>
  );
};

export default ModernLayout;
