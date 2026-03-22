import{as as n,aO as o}from"./index-DDLlf-Qe.js";async function c(e={pagination:{page:1,pageSize:1e3},searchTerm:""}){const t=`
    query GetSizes($searchTerm: String, $pagination: PaginationArg) {
        sizes_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
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
  `,a={...e};return n.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function u(e){const t=`
    mutation CreateSize($data: SizeInput!) {
        createSize(data: $data) {
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
  `,a={data:e};return n.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function s(e){const t=`
    mutation DeleteSize($documentId: ID!) {
        deleteSize(documentId: $documentId) {
            documentId
        }
    }
  `,a={documentId:e};return n.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function p(e){const t=`
    mutation UpdateSize($documentId: ID!, $data: SizeInput!) {
        updateSize(documentId: $documentId, data: $data) {
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
  `,{documentId:a,...i}=e,d={documentId:a,data:i};return n.fetchData({url:o,method:"post",data:{query:t,variables:d}})}async function m(e,t={page:1,pageSize:1e3}){const a=`
    query getProductSizes($productCategoryDocumentId: ID!, $pagination: PaginationArg) {
        sizes(filters: {productCategory: {documentId: {contains: $productCategoryDocumentId}}}, pagination: $pagination) {
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
  `,i={productCategoryDocumentId:e,pagination:t};return n.fetchData({url:o,method:"post",data:{query:a,variables:i}})}export{m as a,c as b,u as c,s as d,p as e};
