import{as as o,aO as n}from"./index-DDLlf-Qe.js";async function u(t={pagination:{page:1,pageSize:1e3},searchTerm:""}){const a=`
    query GetColors($searchTerm: String, $pagination: PaginationArg) {
        colors_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                value
                description
                productCategory {
                    documentId
                    name
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
  `,e={...t};return o.fetchData({url:n,method:"post",data:{query:a,variables:e}})}async function i(t){const a=`
    mutation CreateColor($data: ColorInput!) {
        createColor(data: $data) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,e={data:t};return o.fetchData({url:n,method:"post",data:{query:a,variables:e}})}async function s(t){const a=`
    mutation DeleteColor($documentId: ID!) {
        deleteColor(documentId: $documentId) {
            documentId
        }
    }
  `,e={documentId:t};return o.fetchData({url:n,method:"post",data:{query:a,variables:e}})}async function m(t){const a=`
    mutation UpdateColor($documentId: ID!, $data: ColorInput!) {
        updateColor(documentId: $documentId, data: $data) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,{documentId:e,...r}=t,d={documentId:e,data:r};return o.fetchData({url:n,method:"post",data:{query:a,variables:d}})}async function p(t){const a=`
    query getProductColors($productCategoryDocumentId: ID!) {
        colors(filters: {productCategory: {documentId: {contains: $productCategoryDocumentId}}}) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,e={productCategoryDocumentId:t};return o.fetchData({url:n,method:"post",data:{query:a,variables:e}})}export{p as a,u as b,i as c,s as d,m as e};
