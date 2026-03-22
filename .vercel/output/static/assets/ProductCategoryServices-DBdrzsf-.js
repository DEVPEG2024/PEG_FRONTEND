import{as as o,aO as r}from"./index-DDLlf-Qe.js";async function u(t){const a=`
    mutation DeleteProductCategory($documentId: ID!) {
        deleteProductCategory(documentId: $documentId) {
            documentId
        }
    }
  `,e={documentId:t};return o.fetchData({url:r,method:"post",data:{query:a,variables:e}})}async function i(t){const a=`
    mutation CreateProductCategory($data: ProductCategoryInput!) {
        createProductCategory(data: $data) {
            documentId
            image {
                url
                documentId
            }
            name
            active
            order
            products (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,e={data:t};return o.fetchData({url:r,method:"post",data:{query:a,variables:e}})}async function m(t){const a=`
    mutation UpdateProductCategory($documentId: ID!, $data: ProductCategoryInput!) {
        updateProductCategory(documentId: $documentId, data: $data) {
            documentId
            image {
                url
                documentId
            }
            name
            active
            order
            products (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,{documentId:e,...d}=t,n={documentId:e,data:d};return o.fetchData({url:r,method:"post",data:{query:a,variables:n}})}async function s(t={pagination:{page:1,pageSize:1e3},searchTerm:""}){const a=`
    query GetProductCategories($searchTerm: String, $pagination: PaginationArg) {
        productCategories_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination, sort: "order:asc") {
            nodes {
                documentId
                image {
                    url
                    documentId
                }
                name
                active
                order
                products (pagination: {limit: 100}){
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
  `,e={...t};return o.fetchData({url:r,method:"post",data:{query:a,variables:e}})}async function g(t){const a=`
    query GetProductCategory($documentId: ID!) {
        productCategory(documentId: $documentId) {
            documentId
            name
        }
    }
  `,e={documentId:t};return o.fetchData({url:r,method:"post",data:{query:a,variables:e}})}export{s as a,g as b,m as c,i as d,u as e};
