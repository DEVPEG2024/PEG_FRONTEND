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
    component: lazy(() => import("@/views/app/admin/customers/lists/CustomersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.add",
    path: "/admin/customers/add",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/EditCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.edit",
    path: "/admin/customers/edit/:documentId",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/EditCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.categories",
    path: "/admin/customers/categories",
    component: lazy(() => import("@/views/app/admin/customers/categories/CustomerCategoriesList")),
    authority: [SUPER_ADMIN],
  },
  // producers
  {
    key: "admin.producers.list",
    path: "/admin/producers/list",
    component: lazy(() => import("@/views/app/admin/producers/lists/ProducersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.add",
    path: "/admin/producers/add",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/EditProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.edit",
    path: "/admin/producers/edit/:documentId",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/EditProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.categories",
    path: "/admin/producers/categories",
    component: lazy(() => import("@/views/app/admin/producers/categories/ProducerCategoriesList")),
    authority: [SUPER_ADMIN],
  },
  // projects
  {
    key: "admin.projects.list",
    path: "/admin/projects/list",
    component: lazy(() => import("@/views/app/common/projects/ProjectsList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.projects.details",
    path: "/admin/projects/details/:documentId",
    component: lazy(() => import("@/views/app/common/projects/details/ProjectDetails")),
    authority: [SUPER_ADMIN],
    meta: {
      pageContainerType: "gutterless",
    },
  },

  // products
  {
    key: "admin.store.lists",
    path: "/admin/store/lists",
    component: lazy(() => import("@/views/app/admin/products/ProductsList")),
    authority: [SUPER_ADMIN],
  },


  {
    key: "admin.store.new",
    path: "/admin/store/new",
    component: lazy(() => import("@/views/app/admin/products/product/EditProduct")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.edit",
    path: "/admin/store/edit/:documentId",
    component: lazy(() => import("@/views/app/admin/products/product/EditProduct")),
    authority: [SUPER_ADMIN],
  },


  /*{
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
  },*/
  {
    key: "admin.store.categories",
    path: "/admin/store/categories",
    component: lazy(() => import("@/views/app/admin/products/categories/ProductCategories")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.store.categories.products",
    path: "/admin/store/categories/:documentId",
    component: lazy(() => import("@/views/app/admin/products/categories/ProductsLists")),
    authority: [SUPER_ADMIN],
  },
  //orders
  {
    key: "admin.store.orders",
    path: "/admin/store/orders",
    component: lazy(() => import("@/views/app/admin/orders/OrderItemsList")),
    authority: [SUPER_ADMIN],
  },
  //forms
  {
    key: "admin.forms",
    path: "/admin/forms",
    component: lazy(() => import("@/views/app/admin/forms/FormsList")),
    authority: [SUPER_ADMIN],
  },
  //users
  {
    key: "admin.users",
    path: "/admin/users",
    component: lazy(() => import("@/views/app/admin/users/UsersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.users.add",
    path: "/admin/users/add",
    component: lazy(() => import("@/views/app/admin/users/EditUser")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.users.edit",
    path: "/admin/users/edit/:documentId",
    component: lazy(() => import("@/views/app/admin/users/EditUser")),
    authority: [SUPER_ADMIN],
  },
  //invoices
  {
    key: "admin.invoices",
    path: "/admin/invoices",
    component: lazy(() => import("@/views/app/common/invoices/InvoicesList")),
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
    component: lazy(() => import("@/views/app/admin/tickets/TicketsList")),
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
    path: "/customer/product/:documentId",
    component: lazy(() => import("@/views/app/customer/products/show/ShowProduct")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.product",
    path: "/customer/product/:id/edit",
    component: lazy(() => import("@/views/app/customer/products/show/ShowProduct")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.projects",
    path: "/customer/projects",
    component: lazy(() => import("@/views/app/common/projects/ProjectsList")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.projects.details",
    path: "/customer/projects/details/:documentId",
    component: lazy(() => import("@/views/app/common/projects/details/ProjectDetails")),
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
    path: "/customer/catalogue/categories/:documentId",
    component: lazy(() => import("@/views/app/customer/catalogue/ProductsOfCategory")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.cart",
    path: "/customer/cart",
    component: lazy(() => import("@/views/app/customer/cart/Cart")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.invoices",
    path: "/customer/invoices",
    component: lazy(() => import("@/views/app/common/invoices/InvoicesList")),
    authority: [CUSTOMER],
  },
];
const protectedProducerRoutes = [
  {
    key: "producer.projects",
    path: "/producer/projects",
    component: lazy(() => import("@/views/app/common/projects/ProjectsList")),
    authority: [PRODUCER],
  },
  {
    key: "producer.projects.details",
    path: "/producer/projects/details/:documentId",
    component: lazy(() => import("@/views/app/common/projects/details/ProjectDetails")),
    authority: [PRODUCER],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  /*{
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
  },*/
];

const protectedCommonRoutes = [
  {
    key: "common.order.show",
    path: "/common/orderItem/:documentId",
    component: lazy(() => import("@/views/app/common/orderItem/ShowOrderItem")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, ADMIN],
    meta: {
      pageContainerType: "gutterless",
    },
  }
]

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
  ...protectedCommonRoutes,
  ...protectedDefaultRoutes,
];
