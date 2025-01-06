import {
  NAV_ITEM_TYPE_ITEM,
  NAV_ITEM_TYPE_TITLE,
} from "@/constants/navigation.constant";
import type { NavigationTree } from "@/@types/navigation";
import { ADMIN,  SUPER_ADMIN } from "@/constants/roles.constant";

const navigationAdmin: NavigationTree[] = [
  {
    key: "admin.home",
    path: "/home",
    title: "ACCUEIL",
    translateKey: "nav.home",
    icon: "home",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
  {
    key: "admin.projects.list",
    path: "/common/projects",
    title: "Projets",
    translateKey: "nav.projects",
    icon: "projects",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
  {
    key: "admin.banners",
    path: "/admin/banners",
    title: "Bannières",
    translateKey: "nav.banners",
    icon: "banners",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
  {
    key: "admin.store",
    path: "/admin/store",
    title: "",
    translateKey: "",
    icon: "store",
    type: NAV_ITEM_TYPE_TITLE,
    authority: [SUPER_ADMIN],
    subMenu: [
      {
        key: "admin.store",
        path: "/admin/store",
        title: "Boutique",
        translateKey: "nav.store",
        icon: "store",
        type: NAV_ITEM_TYPE_ITEM,
        authority: [SUPER_ADMIN],
        subMenu: [
          {
            key: "admin.forms",
            path: "/admin/forms",
            title: "Formulaire des offres",
            translateKey: "nav.forms",
            icon: "forms",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
          {
            key: "admin.products",
            path: "/admin/products",
            title: "Liste des produits",
            translateKey: "nav.storeList",
            icon: "store",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
          {
            key: "admin.products.categories",
            path: "/admin/products/categories",
            title: "Catégories",
            translateKey: "nav.storeCategories",
            icon: "store",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
          {
            key: "admin.store.orders",
            path: "/admin/store/orders",
            title: "Commandes",
            translateKey: "nav.storeOrders",
            icon: "store",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
        ],
      },
    ],
  },

 
  {
    key: "admin.customers",
    path: "/admin/customers",
    title: "",
    translateKey: "",
    icon: "customers",
    type: NAV_ITEM_TYPE_TITLE,
    authority: [SUPER_ADMIN],
    subMenu: [
      {
        key: "admin.customers",
        path: "/admin/customers",
        title: "Clients",
        translateKey: "nav.customers",
        icon: "customers",
        type: NAV_ITEM_TYPE_ITEM,
        authority: [SUPER_ADMIN],
        subMenu: [
          {
            key: "admin.customers.list",
            path: "/admin/customers/list",
            title: "Liste des clients",
            translateKey: "nav.customersList",
            icon: "customers",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
          {
            key: "admin.customers.categories",
            path: "/admin/customers/categories",
            title: "Catégories",
            translateKey: "nav.customersCategories",
            icon: "customers",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
        ],
      },
    ],
  },

  {
    key: "admin.producers",
    path: "/admin/producers",
    title: "",
    translateKey: "",
    icon: "producers",
    type: NAV_ITEM_TYPE_TITLE,
    authority: [SUPER_ADMIN],
    subMenu: [
      {
        key: "admin.producers",
        path: "/admin/producers",
        title: "Producteurs",
        translateKey: "nav.producers",
        icon: "producers",
        type: NAV_ITEM_TYPE_ITEM,
        authority: [SUPER_ADMIN],
        subMenu: [
          {
            key: "admin.producers.list",
            path: "/admin/producers/list",
            title: "Liste des producteurs",
            translateKey: "nav.producersList",
            icon: "producers",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
          {
            key: "admin.producers.categories",
            path: "/admin/producers/categories",
            title: "Catégories",
            translateKey: "nav.producersCategories",
            icon: "producers",
            type: NAV_ITEM_TYPE_ITEM,
            authority: [SUPER_ADMIN],
            subMenu: [],
          },
        ],
      },
    ],
  },
  {
    key: "admin.invoices",
    path: "/admin/invoices",
    title: "Factures",
    translateKey: "nav.invoices",
    icon: "invoices",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
  {
    key: "admin.users",
    path: "/admin/users",
    title: "Utilisateurs",
    translateKey: "nav.users",
    icon: "users",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
  
  {
    key: "default.support",
    path: "/support",
    title: "Support",
    translateKey: "nav.support",
    icon: "support",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN, ADMIN],
    subMenu: [],
  },
  {
    key: "admin.settings",
    path: "/settings/profile",
    title: "PARAMÈTRES",
    translateKey: "nav.settings",
    icon: "settings",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [SUPER_ADMIN],
    subMenu: [],
  },
];

export default navigationAdmin;
