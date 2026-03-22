import{as as n,aO as i}from"./index-DDLlf-Qe.js";async function d(t){const e=`
    mutation CreateChecklist($data: ChecklistInput!) {
        createChecklist(data: $data) {
            documentId
            name
            items
        }
    }
  `,a={data:t};return n.fetchData({url:i,method:"post",data:{query:e,variables:a}})}async function r(t){const e=`
    mutation UpdateChecklist($documentId: ID!, $data: ChecklistInput!) {
        updateChecklist(documentId: $documentId, data: $data) {
            documentId
            name
            items
        }
    }
  `,{documentId:a,...c}=t,s={documentId:a,data:c};return n.fetchData({url:i,method:"post",data:{query:e,variables:s}})}async function u(t={pagination:{page:1,pageSize:1e3},searchTerm:""}){const e=`
    query getChecklists($searchTerm: String, $pagination: PaginationArg) {
        checklists_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                items
            }
            pageInfo {
                page
                pageSize
                pageCount
                total
            }
        }
    }
  `,a={...t};return n.fetchData({url:i,method:"post",data:{query:e,variables:a}})}async function m(t){const e=`
    mutation DeleteChecklist($documentId: ID!) {
        deleteChecklist(documentId: $documentId) {
            documentId
        }
    }
  `,a={documentId:t};return n.fetchData({url:i,method:"post",data:{query:e,variables:a}})}export{u as a,d as b,m as c,r as d};
