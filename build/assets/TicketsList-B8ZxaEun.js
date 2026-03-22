import{as as f,aO as h,at as k,F as V,E as X,aP as x,au as ee,b2 as te,b3 as ae,r as m,a as P,j as e,a$ as D,J as se,u as re,aW as ne,aD as oe,d_ as ie,b as le,aZ as ce,a_ as de,aN as pe}from"./index-DDLlf-Qe.js";import{e as q,c as j}from"./Upload-DAVGCvj8.js";import{C as ue}from"./Views-fuoJmY5n.js";import{I as O,B as N}from"./FormContainer-C6O5c1RL.js";import"./SvgIcon-Cvxwf_77.js";import{E as ge}from"./EmptyState-oKul9XxK.js";import"./Drawer-3Sngc8KI.js";import{c as me,a as xe}from"./FileServices-CLgc3uVd.js";import{h as fe}from"./permissions-D8m5aUW-.js";import{R as G}from"./RichTextEditor-F73kGWT6.js";import{F as U}from"./index-DbtTwzvb.js";import{S as he}from"./index-BbxT4a8T.js";import"./index-Bc4f0VqU.js";import"./CloseButton-BGTHBJzt.js";import"./setPrototypeOf-DmCoXCJf.js";import"./useThemeClass-CAGO4S6t.js";import"./index-Cjh9_OuB.js";async function be(a={pagination:{page:1,pageSize:1e3},searchTerm:""}){const t=`
    query GetTickets($searchTerm: String, $pagination: PaginationArg) {
        tickets_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                description
                state
                priority
                image {
                    documentId
                    url
                    name
                }
                user {
                    documentId
                    firstName
                    lastName
                }
                type
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,s={...a};return f.fetchData({url:h,method:"post",data:{query:t,variables:s}})}async function ye(a={pagination:{page:1,pageSize:1e3},searchTerm:"",userDocumentId:""}){const t=`
    query GetUserTickets($userDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        tickets_connection(filters: {
            and: [
                {name: {containsi: $searchTerm}},
                {user: {documentId: {eq: $userDocumentId}}}
            ]}, 
            pagination: $pagination) {
            nodes {
                documentId
                name
                description
                state
                priority
                image {
                    documentId
                    url
                    name
                }
                user {
                    documentId
                    firstName
                    lastName
                }
                type
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,s={...a};return f.fetchData({url:h,method:"post",data:{query:t,variables:s}})}async function ve(a){const t=`
    query GetTicketForEditById($documentId: ID!) {
        ticket(documentId: $documentId) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,s={documentId:a};return f.fetchData({url:h,method:"post",data:{query:t,variables:s}})}async function je(a){const t=`
    mutation UpdateTicket($documentId: ID!, $data: TicketInput!) {
        updateTicket(documentId: $documentId, data: $data) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,{documentId:s,...l}=a,d={documentId:s,data:l};return f.fetchData({url:h,method:"post",data:{query:t,variables:d}})}async function ke(a){const t=`
    mutation CreateTicket($data: TicketInput!) {
        createTicket(data: $data) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,s={data:a};return f.fetchData({url:h,method:"post",data:{query:t,variables:s}})}async function Ie(a){const t=`
    mutation DeleteTicket($documentId: ID!) {
        deleteTicket(documentId: $documentId) {
            documentId
        }
    }
  `,s={documentId:a};return f.fetchData({url:h,method:"post",data:{query:t,variables:s}})}const b="tickets",T=k(b+"/getTickets",async a=>{if(fe(a.user,[V,X])){const{tickets_connection:s}=await x(be(a.request));return s}const{tickets_connection:t}=await x(ye({...a.request,userDocumentId:a.user.documentId}));return t}),z=k(b+"/getTicketById",async a=>await x(ve(a))),C=k(b+"/createTicket",async a=>{let t;a.image&&(t=await me(a.image.file));const{createTicket:s}=await x(ke({...a,image:(t==null?void 0:t.id)??void 0}));return s}),S=k(b+"/deleteTicket",async a=>{const{deleteTicket:t}=await x(Ie(a));return t}),w=k(b+"/updateTicket",async a=>{const{updateTicket:t}=await x(je(a));return t}),Te={tickets:[],selectedTicket:null,newTicketDialog:!1,editTicketDialog:!1,loading:!1,total:0},H=ee({name:`${b}/state`,initialState:Te,reducers:{setNewTicketDialog:(a,t)=>{a.newTicketDialog=t.payload},setEditTicketDialog:(a,t)=>{a.editTicketDialog=t.payload},setSelectedTicket:(a,t)=>{a.selectedTicket=t.payload}},extraReducers:a=>{a.addCase(T.pending,t=>{t.loading=!0}),a.addCase(T.fulfilled,(t,s)=>{t.loading=!1,t.tickets=s.payload.nodes,t.total=s.payload.pageInfo.total}),a.addCase(T.rejected,t=>{t.loading=!0}),a.addCase(z.pending,t=>{t.loading=!0}),a.addCase(z.fulfilled,(t,s)=>{t.loading=!1,t.selectedTicket=s.payload.ticket}),a.addCase(z.rejected,t=>{t.loading=!1}),a.addCase(C.pending,t=>{t.loading=!0}),a.addCase(C.fulfilled,(t,s)=>{t.loading=!1,t.tickets.push(s.payload),t.total+=1}),a.addCase(C.rejected,t=>{t.loading=!1}),a.addCase(w.pending,t=>{t.loading=!0}),a.addCase(w.fulfilled,(t,s)=>{t.loading=!1,t.tickets=t.tickets.map(l=>l.documentId===s.payload.documentId?s.payload:l)}),a.addCase(w.rejected,t=>{t.loading=!1}),a.addCase(S.pending,t=>{t.loading=!0}),a.addCase(S.fulfilled,(t,s)=>{t.loading=!1,t.tickets=t.tickets.filter(l=>l.documentId!==s.payload.documentId),t.total-=1}),a.addCase(S.rejected,t=>{t.loading=!1})}}),{setNewTicketDialog:Y,setEditTicketDialog:J,setSelectedTicket:Q}=H.actions,Ce=H.reducer,Se=ae({data:Ce}),A=te,B=[{value:"pending",label:"Ouvert"},{value:"fulfilled",label:"Fermé"},{value:"canceled",label:"Rejeté"}],E=[{value:"low",label:"Faible"},{value:"medium",label:"Moyen"},{value:"high",label:"Elevé"}],F=[{value:"accounts",label:"Comptes et sécurité"},{value:"features",label:"Demandes de fonctionnalités"},{value:"subscriptions",label:"Gestion des abonnements"},{value:"integrations",label:"Intégrations et API"},{value:"technical",label:"Problèmes techniques"},{value:"content",label:"Rapports de contenu"},{value:"refunds",label:"Retours et remboursements"},{value:"support",label:"Support client"}];function we(){const{user:a}=A(i=>i.auth.user),{newTicketDialog:t}=A(i=>i.tickets.data),[s,l]=m.useState(void 0),d=P(),[g,o]=m.useState({name:"",user:a.documentId,description:"",state:"pending",priority:"",type:""}),p=async i=>{i.preventDefault(),d(C({...g,image:s})),o({name:"",user:"",description:"",state:"",priority:"",type:""}),u()},u=()=>{d(Y(!1))};return e.jsx("div",{children:e.jsx(q,{isOpen:t,onClose:u,width:1200,children:e.jsxs("div",{className:"flex flex-col justify-between",children:[e.jsx("div",{className:"flex flex-col gap-2",children:e.jsx("div",{className:"flex flex-col gap-2 ",children:e.jsx(O,{value:g.name,placeholder:"Titre",onChange:i=>{o({...g,name:i.target.value})}})})}),e.jsxs("div",{className:"flex flex-row gap-2",children:[e.jsxs("div",{className:"flex flex-col gap-2 w-1/2",children:[e.jsx("p",{className:"text-sm text-white/50 mb-2 mt-4",children:"Priorité"}),e.jsx(j,{placeholder:"Priorité",options:E,noOptionsMessage:()=>"Aucune priorité trouvée",onChange:i=>{o({...g,priority:(i==null?void 0:i.value)||""})}})]}),e.jsxs("div",{className:"flex flex-col gap-2 w-1/2",children:[e.jsx("p",{className:"text-sm text-white/50 mb-2 mt-4",children:"Type du ticket"}),e.jsx(j,{placeholder:"Type du ticket",options:F,noOptionsMessage:()=>"Aucun type de ticket trouvé",onChange:i=>{o({...g,type:(i==null?void 0:i.value)||""})}})]})]}),e.jsx("div",{className:"flex flex-col gap-2 mt-4",children:e.jsx(G,{value:g.description,onChange:i=>{o({...g,description:i})}})}),e.jsx("div",{className:"flex flex-col gap-2 mt-4",children:e.jsx(U,{setImage:l})}),e.jsxs("div",{className:"text-right mt-6 flex flex-row items-center justify-end gap-2",children:[e.jsx(N,{className:"ltr:mr-2 rtl:ml-2",variant:"plain",onClick:u,children:D("cancel")}),e.jsx(N,{variant:"solid",onClick:p,children:D("save")})]})]})})})}function De(){var I;const a=P(),{editTicketDialog:t,selectedTicket:s}=A(n=>n.tickets.data),[l,d]=m.useState(void 0),[g,o]=m.useState(!1),[p,u]=m.useState({documentId:(s==null?void 0:s.documentId)??"",name:(s==null?void 0:s.name)||"",user:((I=s==null?void 0:s.user)==null?void 0:I.documentId)||null,description:(s==null?void 0:s.description)||"",state:(s==null?void 0:s.state)||"",priority:(s==null?void 0:s.priority)||"",type:(s==null?void 0:s.type)||""});m.useEffect(()=>{i()},[s]);const i=async()=>{if(o(!0),s!=null&&s.image){const n=(await xe([s.image]))[0];d(n)}o(!1)},R=async n=>{n.preventDefault(),a(w({...p,image:(l==null?void 0:l.id)??null})),u({documentId:"",name:"",priority:"low",description:"",state:"pending",user:"",type:""}),y()},y=()=>{a(J(!1)),a(Q(null))};return e.jsx("div",{children:e.jsx(q,{isOpen:t,onClose:y,width:1200,children:e.jsxs("div",{className:"flex flex-col justify-between",children:[e.jsx("div",{className:"flex flex-col gap-2",children:e.jsx("div",{className:"flex flex-col gap-2 ",children:e.jsx(O,{value:p.name,placeholder:"Titre",onChange:n=>{u({...p,name:n.target.value})}})})}),e.jsxs("div",{className:"flex flex-row gap-2",children:[e.jsxs("div",{className:"flex flex-col gap-2 w-1/4",children:[e.jsx("p",{className:"text-sm text-white/50 mb-2 mt-4",children:"Statut"}),e.jsx(j,{placeholder:"Statut",options:B,noOptionsMessage:()=>"Aucun statut trouvé",value:B.find(n=>n.value===p.state),onChange:n=>{u({...p,state:(n==null?void 0:n.value)||""})}})]}),e.jsxs("div",{className:"flex flex-col gap-2 w-1/4",children:[e.jsx("p",{className:"text-sm text-white/50 mb-2 mt-4",children:"Priorité"}),e.jsx(j,{placeholder:"Priorité",options:E,noOptionsMessage:()=>"Aucune priorité trouvée",value:E.find(n=>n.value===p.priority),onChange:n=>{u({...p,priority:(n==null?void 0:n.value)||""})}})]}),e.jsxs("div",{className:"flex flex-col gap-2 w-1/2",children:[e.jsx("p",{className:"text-sm text-white/50 mb-2 mt-4",children:"Type du ticket"}),e.jsx(j,{placeholder:"Type du ticket",options:F,noOptionsMessage:()=>"Aucun type de ticket trouvé",value:F.find(n=>n.value===p.type),onChange:n=>{u({...p,type:(n==null?void 0:n.value)||""})}})]})]}),e.jsx("div",{className:"flex flex-col gap-2 mt-4",children:e.jsx(G,{value:p.description,onChange:n=>{u({...p,description:n})}})}),e.jsxs("div",{className:"text-right mt-6 flex flex-row items-center justify-end gap-2",children:[e.jsx(se,{loading:g,children:e.jsx(U,{image:l,setImage:d})}),e.jsx(N,{className:"ltr:mr-2 rtl:ml-2",variant:"plain",onClick:y,children:D("cancel")}),e.jsx(N,{variant:"solid",onClick:R,children:D("save")})]})]})})})}pe("tickets",Se);const W={low:{label:"Faible",bg:"rgba(34,197,94,0.1)",border:"rgba(34,197,94,0.25)",color:"#4ade80",bar:"#22c55e"},medium:{label:"Moyenne",bg:"rgba(234,179,8,0.1)",border:"rgba(234,179,8,0.25)",color:"#fbbf24",bar:"#f59e0b"},high:{label:"Élevée",bg:"rgba(239,68,68,0.12)",border:"rgba(239,68,68,0.25)",color:"#f87171",bar:"#ef4444"}},L={pending:{label:"Ouvert",bg:"rgba(47,111,237,0.12)",color:"#6b9eff"},open:{label:"Ouvert",bg:"rgba(47,111,237,0.12)",color:"#6b9eff"},closed:{label:"Fermé",bg:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.45)"},canceled:{label:"Annulé",bg:"rgba(239,68,68,0.1)",color:"#f87171"}},_=({onClick:a,icon:t,hoverBg:s,hoverColor:l,hoverBorder:d,title:g})=>e.jsx("button",{title:g,onClick:a,style:{display:"flex",alignItems:"center",justifyContent:"center",width:"30px",height:"30px",borderRadius:"8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",color:"rgba(255,255,255,0.5)",transition:"all 0.15s"},onMouseEnter:o=>{o.currentTarget.style.background=s,o.currentTarget.style.color=l,o.currentTarget.style.borderColor=d},onMouseLeave:o=>{o.currentTarget.style.background="rgba(255,255,255,0.05)",o.currentTarget.style.color="rgba(255,255,255,0.5)",o.currentTarget.style.borderColor="rgba(255,255,255,0.1)"},children:t}),Ne=[{key:"all",label:"Tous"},{key:"open",label:"Ouverts"},{key:"closed",label:"Fermés"},{key:"canceled",label:"Annulés"}],Ye=()=>{const a=P(),[t,s]=m.useState(1),[l]=m.useState(50),[d,g]=m.useState(""),[o,p]=m.useState("all"),{tickets:u,total:i,loading:R,newTicketDialog:y,editTicketDialog:I}=A(r=>r.tickets.data),{user:n}=re(r=>r.auth.user);m.useEffect(()=>{a(T({request:{pagination:{page:t,pageSize:l},searchTerm:d},user:n}))},[t,d]);const M=u.filter(r=>{const c=o==="all"||r.state===o||o==="open"&&r.state==="pending",v=!d||r.name.toLowerCase().includes(d.toLowerCase());return c&&v}),Z=r=>r==="all"?u.length:r==="open"?u.filter(c=>c.state==="open"||c.state==="pending").length:u.filter(c=>c.state===r).length;return e.jsxs(ue,{style:{fontFamily:"Inter, sans-serif"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"16px",paddingTop:"28px",paddingBottom:"24px",flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("p",{style:{color:"rgba(255,255,255,0.55)",fontSize:"11px",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"4px"},children:"Assistance"}),e.jsxs("h2",{style:{color:"#fff",fontSize:"22px",fontWeight:700,letterSpacing:"-0.02em",margin:0},children:["Support ",e.jsxs("span",{style:{color:"rgba(255,255,255,0.25)",fontSize:"16px",fontWeight:500},children:["(",i,")"]})]})]}),e.jsxs("button",{onClick:()=>a(Y(!0)),style:{display:"flex",alignItems:"center",gap:"6px",background:"linear-gradient(90deg, #2f6fed, #1f4bb6)",border:"none",borderRadius:"10px",padding:"10px 18px",color:"#fff",fontSize:"13px",fontWeight:600,cursor:"pointer",boxShadow:"0 4px 14px rgba(47,111,237,0.4)",fontFamily:"Inter, sans-serif"},children:[e.jsx(ne,{size:16})," Nouveau ticket"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap"},children:[e.jsx("div",{style:{display:"flex",gap:"4px",background:"rgba(255,255,255,0.04)",borderRadius:"12px",padding:"4px",border:"1px solid rgba(255,255,255,0.07)"},children:Ne.map(r=>e.jsxs("button",{onClick:()=>p(r.key),style:{padding:"6px 12px",borderRadius:"9px",border:"none",cursor:"pointer",fontFamily:"Inter, sans-serif",fontSize:"12px",fontWeight:600,background:o===r.key?"rgba(47,111,237,0.2)":"transparent",color:o===r.key?"#6b9eff":"rgba(255,255,255,0.6)",transition:"all 0.15s"},children:[r.label,e.jsx("span",{style:{marginLeft:"5px",background:o===r.key?"rgba(47,111,237,0.3)":"rgba(255,255,255,0.08)",borderRadius:"100px",padding:"1px 6px",fontSize:"10px",color:o===r.key?"#6b9eff":"rgba(255,255,255,0.55)"},children:Z(r.key)})]},r.key))}),e.jsxs("div",{style:{position:"relative",flex:1,minWidth:"180px",maxWidth:"340px"},children:[e.jsx(oe,{size:14,style:{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.55)",pointerEvents:"none"}}),e.jsx("input",{type:"text",placeholder:"Rechercher un ticket…",value:d,onChange:r=>{g(r.target.value),s(1)},style:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"10px",padding:"8px 14px 8px 33px",color:"#fff",fontSize:"13px",fontFamily:"Inter, sans-serif",outline:"none",boxSizing:"border-box"},onFocus:r=>{r.target.style.borderColor="rgba(47,111,237,0.5)"},onBlur:r=>{r.target.style.borderColor="rgba(255,255,255,0.09)"}})]})]}),R?e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"8px"},children:Array.from({length:5}).map((r,c)=>e.jsx("div",{style:{background:"rgba(255,255,255,0.03)",borderRadius:"14px",height:"72px",border:"1px solid rgba(255,255,255,0.06)"}},c))}):M.length===0?e.jsx(ge,{title:"Aucun ticket",description:"Aucun ticket à afficher pour le moment",icon:e.jsx(he,{size:44})}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"8px",paddingBottom:"40px"},children:M.map(r=>{const c=W[r.priority]??W.low,v=L[r.state]??L.pending,K=r.user?`${r.user.firstName??""} ${r.user.lastName??""}`.trim()||r.user.username:"?";return e.jsxs("div",{style:{background:"linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)",border:"1.5px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",overflow:"hidden",position:"relative",transition:"border-color 0.15s"},onMouseEnter:$=>$.currentTarget.style.borderColor="rgba(255,255,255,0.14)",onMouseLeave:$=>$.currentTarget.style.borderColor="rgba(255,255,255,0.07)",children:[e.jsx("span",{style:{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:c.bar,borderRadius:"14px 0 0 14px"}}),e.jsx("div",{style:{width:"42px",height:"42px",borderRadius:"11px",background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsx(ie,{size:18,style:{color:c.color}})}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"},children:[e.jsx("span",{style:{color:"#fff",fontWeight:700,fontSize:"14px"},children:r.name}),e.jsx("span",{style:{background:v.bg,borderRadius:"100px",padding:"1px 8px",color:v.color,fontSize:"11px",fontWeight:600},children:v.label}),e.jsx("span",{style:{background:c.bg,border:`1px solid ${c.border}`,borderRadius:"100px",padding:"1px 8px",color:c.color,fontSize:"11px",fontWeight:600},children:c.label})]}),e.jsxs("div",{style:{display:"flex",gap:"12px",flexWrap:"wrap"},children:[e.jsxs("span",{style:{color:"rgba(255,255,255,0.38)",fontSize:"12px"},children:["Par ",K]}),e.jsx("span",{style:{color:"rgba(255,255,255,0.25)",fontSize:"12px"},children:le(r.createdAt).format("DD/MM/YYYY")})]})]}),e.jsxs("div",{style:{display:"flex",gap:"5px",flexShrink:0},children:[e.jsx(_,{onClick:()=>{a(Q(r)),a(J(!0))},icon:e.jsx(ce,{size:13}),hoverBg:"rgba(47,111,237,0.15)",hoverColor:"#6b9eff",hoverBorder:"rgba(47,111,237,0.4)",title:"Modifier"}),e.jsx(_,{onClick:()=>a(S(r.documentId)),icon:e.jsx(de,{size:13}),hoverBg:"rgba(239,68,68,0.12)",hoverColor:"#f87171",hoverBorder:"rgba(239,68,68,0.3)",title:"Supprimer"})]})]},r.documentId)})}),y&&e.jsx(we,{}),I&&e.jsx(De,{})]})};export{Ye as default};
