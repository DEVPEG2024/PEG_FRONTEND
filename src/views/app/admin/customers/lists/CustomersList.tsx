import { Container, DataTable, Loading } from '@/components/shared'
import HeaderTitle from '@/components/template/HeaderTitle'
import { useEffect, useState } from 'react'
import { useColumns } from './CustomerColumns'
import { Input } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { CUSTOMERS_NEW } from '@/constants/navigation.constant'
import { useNavigate } from 'react-router-dom'
import { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import reducer, { getCustomers } from '../store'
import { Customer } from '@/@types/customer'

injectReducer('customers', reducer)

const CustomersList = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  const customersState = useAppSelector((state: any) => state.customers?.data)

  const customers = customersState?.customers ?? []
  const total = customersState?.total ?? 0
  const loading = customersState?.loading ?? false

  useEffect(() => {
    dispatch(
      getCustomers({
        pagination: { page: currentPage, pageSize },
        searchTerm,
      })
    )
  }, [dispatch, currentPage, pageSize, searchTerm])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleEditCustomer = (customer: Customer) => {
    navigate(`/admin/customers/edit/${(customer as any).documentId || (customer as any).id}`, {
      state: { customerData: customer },
    })
  }

  const columns = useColumns(handleEditCustomer)

  return (
    <Container>
      <HeaderTitle
        title="cust.customers"
        buttonTitle="cust.add"
        description="cust.description"
        link={CUSTOMERS_NEW}
        addAction
        total={total}
      />

      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('cust.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={customers}
            onPaginationChange={(page: number) => setCurrentPage(page)}
            onSelectChange={(value = 10) => {
              setPageSize(Number(value))
              setCurrentPage(1)
            }}
            pagingData={{
              total,
              pageIndex: currentPage,
              pageSize,
            }}
          />
        </Loading>
      </div>
    </Container>
  )
}

export default CustomersList