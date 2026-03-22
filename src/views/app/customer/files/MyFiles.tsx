import Container from '@/components/shared/Container'
import ClientFilesPanel from '@/components/shared/ClientFiles/ClientFilesPanel'
import { useAppSelector } from '@/store'
import { User } from '@/@types/user'

const MyFiles = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)
  const customerDocumentId = user?.customer?.documentId

  if (!customerDocumentId) {
    return (
      <Container>
        <div className="text-center py-20">
          <p className="text-white/40">Aucun compte client associé.</p>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mes fichiers</h1>
        <p className="text-sm text-white/40 mt-1">
          Gérez vos logos, chartes graphiques et documents. Les fichiers partagés seront accessibles par les producteurs assignés à vos projets.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <ClientFilesPanel customerDocumentId={customerDocumentId} mode="customer" />
      </div>
    </Container>
  )
}

export default MyFiles
