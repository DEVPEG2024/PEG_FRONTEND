import{as as r,aO as o}from"./index-DDLlf-Qe.js";async function u(e={pagination:{page:1,pageSize:1e3},searchTerm:""}){const t=`
    query GetProducers($searchTerm: String, $pagination: PaginationArg) {
        producers_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                active
                producerCategory {
                    documentId
                    name
                }
                companyInformations {
                    email
                    phoneNumber
                    city
                    address
                    zipCode
                    country
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
  `,a={...e};return r.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function i(e){const t=`
    mutation DeleteProducer($documentId: ID!) {
        deleteProducer(documentId: $documentId) {
            documentId
        }
    }
  `,a={documentId:e};return r.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function s(e){const t=`
    query GetProducerForEditById($documentId: ID!) {
        producer(documentId: $documentId) {
            documentId
            producerCategory {
                documentId
                name
            }
            companyInformations {
                email
                phoneNumber
                siretNumber
                vatNumber
                website
                zipCode
                city
                country
                address
            }
            name
            productCategories
            strengths
            weaknesses
            certifications
            minOrderQuantity
            maxMonthlyQuantity
            averageDeliveryDays
            expressDeliveryDays
            deliveryZone
            reliabilityScore
            customerSatisfactionRate
            completedOrdersCount
            internalComments
            priceRange
            volumeDiscountAvailable
            volumeDiscountRate
        }
    }
  `,a={documentId:e};return r.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function m(e){const t=`
    mutation CreateProducer($data: ProducerInput!) {
        createProducer(data: $data) {
            documentId
            name
            active
            producerCategory {
                documentId
                name
            }
        }
    }
  `,a={data:e};return r.fetchData({url:o,method:"post",data:{query:t,variables:a}})}async function p(e){const t=`
    mutation UpdateProducer($documentId: ID!, $data: ProducerInput!) {
        updateProducer(documentId: $documentId, data: $data) {
            documentId
            name
            active
            producerCategory {
                documentId
                name
            }
        }
    }
  `,{documentId:a,...n}=e,d={documentId:a,data:n};return r.fetchData({url:o,method:"post",data:{query:t,variables:d}})}export{p as a,m as b,u as c,i as d,s as e};
