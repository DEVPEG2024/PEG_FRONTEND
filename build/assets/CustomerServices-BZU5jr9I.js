import{as as a,aO as c}from"./index-DDLlf-Qe.js";const u=e=>{var r,o;const t=((r=e.pagination)==null?void 0:r.page)??1,i=((o=e.pagination)==null?void 0:o.pageSize)??10,n=(e.searchTerm??"").trim(),s=new URLSearchParams;return s.set("pagination[page]",String(t)),s.set("pagination[pageSize]",String(i)),s.set("sort[0]","createdAt:desc"),n&&s.set("filters[name][$containsi]",n),s.set("populate","*"),s.toString()},p=e=>{const t=new URLSearchParams;return t.set("filters[documentId][$eq]",e),t.set("pagination[page]","1"),t.set("pagination[pageSize]","1"),t.set("populate","*"),t.toString()};async function g(e={pagination:{page:1,pageSize:1e3},searchTerm:""}){return a.fetchData({url:c,method:"post",data:{query:`
    query GetCustomers($searchTerm: String, $pagination: PaginationArg) {
      customers_connection(filters: { name: { containsi: $searchTerm } }, pagination: $pagination) {
        nodes {
          documentId
          name
        }
        pageInfo {
          page
          pageCount
          pageSize
          total
        }
      }
    }
  `,variables:{searchTerm:e.searchTerm??"",pagination:e.pagination??{page:1,pageSize:1e3}}}})}const d=e=>{const t=u(e);return a.fetchData({url:`/customers?${t}`,method:"get"})},h=e=>{const t=p(e);return a.fetchData({url:`/customers?${t}`,method:"get"})},l=async e=>a.fetchData({url:`/customers/${e}`,method:"delete"}),f=e=>a.fetchData({url:"/customers",method:"post",data:{data:e}}),y=async(e,t)=>a.fetchData({url:`/customers/${e}`,method:"put",data:{data:t}}),S=e=>{const t=new FormData;return t.append("files",e),a.fetchData({url:"/upload",method:"post",data:t,headers:{"Content-Type":"multipart/form-data"}})};export{d as a,l as b,h as c,S as d,y as e,f,g};
