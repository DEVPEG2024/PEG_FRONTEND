import{as as r,aO as o}from"./index-DDLlf-Qe.js";async function u(e={pagination:{page:1,pageSize:1e3},searchTerm:""}){const a=`
    query GetProducerCategories($searchTerm: String, $pagination: PaginationArg) {
        producerCategories_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                producers (pagination: {limit: 100}){
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
  `,t={...e};return r.fetchData({url:o,method:"post",data:{query:a,variables:t}})}async function i(e){const a=`
    mutation CreateProducerCategory($data: ProducerCategoryInput!) {
        createProducerCategory(data: $data) {
            documentId
            name
            producers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,t={data:e};return r.fetchData({url:o,method:"post",data:{query:a,variables:t}})}async function s(e){const a=`
    mutation UpdateProducerCategory($documentId: ID!, $data: ProducerCategoryInput!) {
        updateProducerCategory(documentId: $documentId, data: $data) {
            documentId
            name
            producers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,{documentId:t,...n}=e,d={documentId:t,data:n};return r.fetchData({url:o,method:"post",data:{query:a,variables:d}})}async function m(e){const a=`
    mutation DeleteProducerCategory($documentId: ID!) {
        deleteProducerCategory(documentId: $documentId) {
            documentId
        }
    }
  `,t={documentId:e};return r.fetchData({url:o,method:"post",data:{query:a,variables:t}})}export{u as a,s as b,i as c,m as d};
