import{as as o,aO as n}from"./index-DDLlf-Qe.js";async function c(a){const t=`
    mutation CreateForm($data: FormInput!) {
        createForm(data: $data) {
            documentId,
            name,
            fields
        }
    }
  `,e={data:a};return o.fetchData({url:n,method:"post",data:{query:t,variables:e}})}async function u(a){const t=`
    mutation UpdateForm($documentId: ID!, $data: FormInput!) {
        updateForm(documentId: $documentId, data: $data) {
            documentId
            name,
            fields
        }
    }
  `,{documentId:e,...r}=a,d={documentId:e,data:r};return o.fetchData({url:n,method:"post",data:{query:t,variables:d}})}async function i(a={pagination:{page:1,pageSize:1e3},searchTerm:""}){const t=`
    query getForms($searchTerm: String, $pagination: PaginationArg) {
        forms_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
            }
            pageInfo {
                page
                pageSize
                pageCount
                total
            }
        }
    }
  `,e={...a};return o.fetchData({url:n,method:"post",data:{query:t,variables:e}})}async function s(a){const t=`
    query getForm($documentId: ID!) {
        form(documentId: $documentId) {
            documentId
            name
            fields
        }
    }
  `,e={documentId:a};return o.fetchData({url:n,method:"post",data:{query:t,variables:e}})}async function p(a){const t=`
    mutation DeleteForm($documentId: ID!) {
        deleteForm(documentId: $documentId) {
            documentId
        }
    }
  `,e={documentId:a};return o.fetchData({url:n,method:"post",data:{query:t,variables:e}})}export{i as a,p as b,s as c,c as d,u as e};
