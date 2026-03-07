import Header from "@/components/template/Header";
import UserDropdown from "@/components/template/UserDropdown";
import SideNavToggle from "@/components/template/SideNavToggle";
import MobileNav from "@/components/template/MobileNav";
import SideNav from "@/components/template/SideNav";
import View from "@/views";
import LanguageSelector from "../template/LanguageSelector";
import OnlineUsersCount from "../template/OnlineUsersCount";
import { MdShoppingCart } from "react-icons/md";
import { Alert } from "../ui";
import { RootState, useAppSelector } from "@/store";
import { AuthorityCheck } from "../shared";
import { Link } from "react-router-dom";
import useUserCart from "@/utils/hooks/useUserCart";

const HeaderActionsStart = () => {
  return (
    <>
      <MobileNav />
      <SideNavToggle />
    </>
  );
};

const HeaderActionsEnd = () => {
  const { documentId } = useAppSelector((state: RootState) => state.auth.user.user);
  const cart = useUserCart(documentId);
  const userAuthority = useAppSelector((state) => state.auth.user.user.authority)
  return (
    <>
      <AuthorityCheck
        userAuthority={userAuthority as string[]}
        authority={["customer"]}
      >
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
      </AuthorityCheck>
      <AuthorityCheck
        userAuthority={userAuthority as string[]}
        authority={["admin"]}
      >
        <OnlineUsersCount />
      </AuthorityCheck>
      <LanguageSelector />
      <UserDropdown hoverable={false} />
    </>
  );
};

const ModernLayout = () => {
  return (
    <div className="app-layout-modern flex flex-auto flex-col">
      <div className="flex flex-auto min-w-0">
        <SideNav />
        <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <Header
            className="border-b border-gray-200 dark:border-gray-700"
            headerEnd={<HeaderActionsEnd />}
            headerStart={<HeaderActionsStart />}
          />
          <View />
        </div>
      </div>
    </div>
  );
};

export default ModernLayout;
