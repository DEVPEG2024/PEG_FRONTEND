import{as as n,aO as o}from"./index-DDLlf-Qe.js";async function i(a){const e=`
    mutation CreateTransaction($data: TransactionInput!) {
        createTransaction(data: $data) {
            documentId
            description
            amount
            type
            date
            project {
                documentId
                name
            }
            producer {
                documentId
                name
            }
        }
    }
  `,t={data:{...a,producer:a.producer.documentId,project:a.project.documentId}};return n.fetchData({url:o,method:"post",data:{query:e,variables:t}})}async function d(a={pagination:{page:1,pageSize:1e3},searchTerm:""},e){const t=`
    query GetTransactions($searchTerm: String, $userDocumentId: ID, $pagination: PaginationArg) {
        transactions_connection(filters:
        {
            and: [
                {producer: {documentId: {eq: $userDocumentId}}},
                {project: {name : {containsi: $searchTerm}}},
            ]
        }
        , pagination: $pagination) {
            nodes {
                documentId
                description
                amount
                type
                date
                project {
                    documentId
                    name
                }
                producer {
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
  `,r={...a,userDocumentId:e};return n.fetchData({url:o,method:"post",data:{query:t,variables:r}})}export{i as a,d as b};
