import{as as o,aO as n}from"./index-DDLlf-Qe.js";async function i(t={pagination:{page:1,pageSize:1e3},searchTerm:""}){const e=`
    query GetCustomerCategories($searchTerm: String, $pagination: PaginationArg) {
        customerCategories_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                customers (pagination: {limit: 100}){
                    documentId
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,a={...t};return o.fetchData({url:n,method:"post",data:{query:e,variables:a}})}async function m(t){const e=`
    mutation CreateCustomerCategory($data: CustomerCategoryInput!) {
        createCustomerCategory(data: $data) {
            documentId
            name
            customers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,a={data:t};return o.fetchData({url:n,method:"post",data:{query:e,variables:a}})}async function d(t){const e=`
    mutation UpdateCustomerCategory($documentId: ID!, $data: CustomerCategoryInput!) {
        updateCustomerCategory(documentId: $documentId, data: $data) {
            documentId
            name
            customers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,{documentId:a,...r}=t,u={documentId:a,data:r};return o.fetchData({url:n,method:"post",data:{query:e,variables:u}})}async function c(t){const e=`
    mutation DeleteCustomerCategory($documentId: ID!) {
        deleteCustomerCategory(documentId: $documentId) {
            documentId
        }
    }
  `,a={documentId:t};return o.fetchData({url:n,method:"post",data:{query:e,variables:a}})}export{i as a,d as b,m as c,c as d};
