import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { TransactionsListColumns } from './TransactionsListColumns';
import { Button, Input } from '@/components/ui';
import {
  injectReducer,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
  RootState,
} from '@/store';
import reducer, { getOwnTransactions, useAppSelector } from './store';
import { User } from '@/@types/user';

injectReducer('transactions', reducer);

// TODO : rendre accessible depuis admin: ensemble des wallets de chaque producteur et quand on clique sur un wallet on voit les transactions
const TransactionsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const { amount, transactions, total, loading } = useAppSelector(
    (state) => state.transactions.data
  );

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, searchTerm]);

  const fetchTransactions = async () => {
    dispatch(
      getOwnTransactions({
        request: { pagination: { page: currentPage, pageSize }, searchTerm },
        user,
      })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns = TransactionsListColumns();
  const onPaginationChange = (page: number) => {
    setCurrentPage(page);
  };

  const onSelectChange = (value = 10) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleTakeDeposit = () => {
    // TODO: Voir comment implémenter la fonctionnalité de retrait de fonds: mail dans un premier temps ?
    console.log('Take deposit');
  };

  return (
    <Container>
      <div className="mb-4 flex gap-4 items-center">
        <h1 className="text-2xl font-bold">{`Montant disponible : ${amount}€`}</h1>
        <Button variant="solid" size="sm" onClick={handleTakeDeposit}>
          Retirer les fonds
        </Button>
      </div>
      <HeaderTitle
        title="Transactions du wallet"
        description="Voir les transactions du wallet"
        total={total}
        buttonTitle=""
        link=""
        addAction={false}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une transaction'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={transactions}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total: total,
              pageIndex: currentPage,
              pageSize: pageSize,
            }}
          />
        </Loading>
      </div>
    </Container>
  );
};

export default TransactionsList;
