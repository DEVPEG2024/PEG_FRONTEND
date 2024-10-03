import { lazy } from "react";
import authRoute from "./authRoute";
import type { Routes } from "@/@types/routes";
import { SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER } from "@/constants/roles.constant";

export const publicRoutes: Routes = [...authRoute];

const protectedAdminRoutes = [
  // customers
  {
    key: "admin.customers.list",
    path: "/admin/customers/list",
    component: lazy(() => import("@/views/app/admin/customers/lists")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.add",
    path: "/admin/customers/add",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/NewCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.edit",
    path: "/admin/customers/edit/:id",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/EditCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.categories",
    path: "/admin/customers/categories",
    component: lazy(() => import("@/views/app/admin/customers/categories")),
    authority: [SUPER_ADMIN],
  },
  // producers
  {
    key: "admin.producers.list",
    path: "/admin/producers/list",
    component: lazy(() => import("@/views/app/admin/producers/lists")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.add",
    path: "/admin/producers/add",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/NewProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.edit",
    path: "/admin/producers/edit/:id",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/EditProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.categories",
    path: "/admin/producers/categories",
    component: lazy(() => import("@/views/app/admin/producers/categories")),
    authority: [SUPER_ADMIN],
  },
  // projects
  {
    key: "admin.projects.list",
    path: "/admin/projects/list",
    component: lazy(() => import("@/views/app/admin/projects")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.projects.details",
    path: "/admin/projects/details/:id",
    component: lazy(() => import("@/views/app/admin/projects/details")),
    authority: [SUPER_ADMIN],
    meta: {
      pageContainerType: "gutterless",
    },
  },

  // products
  {
    key: "admin.store.lists",
    path: "/admin/store/lists",
    component: lazy(() => import("@/views/app/admin/products/lists")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.new",
    path: "/admin/store/new",
    component: lazy(() => import("@/views/app/admin/products/lists/new")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.edit",
    path: "/admin/store/edit/:id",
    component: lazy(() => import("@/views/app/admin/products/lists/edit")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.categories",
    path: "/admin/store/categories",
    component: lazy(() => import("@/views/app/admin/products/categories")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.categories.products",
    path: "/admin/store/categories/:id",
    component: lazy(() => import("@/views/app/admin/products/categories/ProductsLists")),
    authority: [SUPER_ADMIN],
  },
  // offers
  {
    key: "admin.offers.list",
    path: "/admin/offers/list",
    component: lazy(() => import("@/views/app/admin/offers/lists")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.offers.new",
    path: "/admin/offers/new",
    component: lazy(() => import("@/views/app/admin/offers/lists/new")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.offers.edit",
    path: "/admin/offers/edit/:id",
    component: lazy(() => import("@/views/app/admin/offers/lists/edit")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.offers.details",
    path: "/admin/offers/details/:id",
    component: lazy(() => import("@/views/app/admin/offers/details")),
    authority: [SUPER_ADMIN],
  },
  //forms
  {
    key: "admin.forms",
    path: "/admin/forms",
    component: lazy(() => import("@/views/app/admin/forms")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.forms.add",
    path: "/admin/forms/add",
    component: lazy(
      () => import("@/views/app/admin/forms/add")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.forms.edit",
    path: "/admin/forms/edit/:id",
    component: lazy(
      () => import("@/views/app/admin/forms/edit")
    ),
    authority: [SUPER_ADMIN],
  },
  //teams
  {
    key: "admin.teams",
    path: "/admin/teams",
    component: lazy(() => import("@/views/app/admin/teams")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.teams.add",
    path: "/admin/teams/add",
    component: lazy(() => import("@/views/app/admin/teams/NewTeam")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.teams.edit",
    path: "/admin/teams/edit/:id",
    component: lazy(() => import("@/views/app/admin/teams/EditTeam")),
    authority: [SUPER_ADMIN],
  },
  //invoices
  {
    key: "admin.invoices",
    path: "/admin/invoices",
    component: lazy(() => import("@/views/app/admin/invoices")),
    authority: [SUPER_ADMIN],
  },
  //banners
  {
    key: "admin.banners",
    path: "/admin/banners",
    component: lazy(() => import("@/views/app/admin/banners")),
    authority: [SUPER_ADMIN],
  },
];
const protectedCustomersRoutes = [
  {
    key: "customer.home",
    path: "/customer/home",
    component: lazy(() => import("@/views/Home")),
    authority: [CUSTOMER],
  },
  {
    key: "default.support",
    path: "/support",
    component: lazy(() => import("@/views/app/admin/tickets")),
    authority: [],
  },
  {
    key: "default.support.details",
    path: "/support/details/:id",
    component: lazy(() => import("@/views/app/admin/tickets/detail")),
    authority: [],
  },
  {
    key: "customer.products",
    path: "/customer/products",
    component: lazy(() => import("@/views/app/customer/products/lists")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.product",
    path: "/customer/product/:id",
    component: lazy(() => import("@/views/app/customer/products/show")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.projects",
    path: "/customer/projects",
    component: lazy(() => import("@/views/app/customer/projects")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.projects.details",
    path: "/customer/projects/details/:id",
    component: lazy(() => import("@/views/app/customer/projects/details")),
    authority: [CUSTOMER],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "customer.catalogue",
    path: "/customer/catalogue",
    component: lazy(() => import("@/views/app/customer/catalogue")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.catalogue.categories.products",
    path: "/customer/catalogue/categories/:id",
    component: lazy(() => import("@/views/app/customer/catalogue/ProductsLists")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.cart",
    path: "/customer/cart",
    component: lazy(() => import("@/views/app/customer/cart")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.invoices",
    path: "/customer/invoices",
    component: lazy(() => import("@/views/app/customer/invoices")),
    authority: [CUSTOMER],
  },
];
const protectedProducerRoutes = [
  {
    key: "producer.projects",
    path: "/producer/projects",
    component: lazy(() => import("@/views/app/producer/projects")),
    authority: [PRODUCER],
  },
  {
    key: "producer.projects.details",
    path: "/producer/projects/details/:id",
    component: lazy(() => import("@/views/app/producer/projects/details")),
    authority: [PRODUCER],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "producer.piscine",
    path: "/producer/piscine",
    component: lazy(() => import("@/views/app/producer/piscine")),
    authority: [PRODUCER],
  },
  {
    key: "producer.wallet",
    path: "/producer/wallet",
    component: lazy(() => import("@/views/app/producer/wallet")),
    authority: [PRODUCER],
  },
];
const protectedDefaultRoutes = [
  {
    key: "home",
    path: "/home",
    component: lazy(() => import("@/views/Home")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "default.settings",  
    path: "/settings/profile",
    component: lazy(() => import("@/views/app/account/Settings")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
  },
  {
    key: "default.settings.password",
    path: "/settings/password",
    component: lazy(() => import("@/views/app/account/Settings")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
  },
];
export const protectedRoutes = [
  ...protectedAdminRoutes,
  ...protectedCustomersRoutes,
  ...protectedProducerRoutes,
  ...protectedDefaultRoutes,
];
