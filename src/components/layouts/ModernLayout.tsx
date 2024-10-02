import Header from "@/components/template/Header";
import UserDropdown from "@/components/template/UserDropdown";
import SideNavToggle from "@/components/template/SideNavToggle";
import MobileNav from "@/components/template/MobileNav";
import SideNav from "@/components/template/SideNav";
import View from "@/views";
import LanguageSelector from "../template/LanguageSelector";
import { MdOnlinePrediction, MdShoppingCart } from "react-icons/md";
import { Alert } from "../ui";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/configs/api.config";
import { RootState, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { AuthorityCheck } from "../shared";
import { Link } from "react-router-dom";

const HeaderActionsStart = () => {
  return (
    <>
      <MobileNav />
      <SideNavToggle />
    </>
  );
};

const HeaderActionsEnd = () => {
  const { t } = useTranslation();
  const { _id } = useAppSelector((state: RootState) => state.auth.user);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  useEffect(() => {
    const clientId = _id;

    const newSocket = io(API_BASE_URL, {
      query: { clientId },
    });
    setSocket(newSocket);
    newSocket.on("userCountUpdate", (count: unknown) => {
      console.log("Received count:", count, "Type:", typeof count);
      if (typeof count === "number") {
        setUserCount(count);
      } else if (typeof count === "object" && count !== null) {
        // Si c'est un objet, on peut essayer d'extraire la taille
        const size = Object.keys(count).length;
        setUserCount(size);
      } else {
        console.error("Unexpected userCount type:", typeof count);
        setUserCount(null);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const renderUserCount = () => {
    if (userCount === null) return "0";
    return userCount;
  };
  const text = (userCount ?? 0) > 1 ? "online_users" : "online_user";
  const userAuthority = useAppSelector((state) => state.auth.user.authority)
  return (
    <>
      <AuthorityCheck
        userAuthority={userAuthority as string[]}
        authority={["super_admin"]}
      >
        <Alert
          showIcon
          type="black"
          customIcon={<MdOnlinePrediction color="text-emerald" />}
          className="bg-slate-600"
        >
          <span className="text-white">
            {renderUserCount()} {t(text)}
          </span>
        </Alert>
      </AuthorityCheck>
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
