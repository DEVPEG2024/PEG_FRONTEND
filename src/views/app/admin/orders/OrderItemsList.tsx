import { Container } from '@/components/shared';
import { useEffect, useState } from 'react';
import { injectReducer, useAppDispatch, RootState } from '@/store';
import reducer, {
  getOrderItems,
  useAppSelector,
  updateOrderItem,
  deleteOrderItem,
} from './store';
import { OrderItem } from '@/@types/orderItem';
import { SizeAndColorSelection } from '@/@types/product';
import { User } from '@/@types/user';
import { useNavigate } from 'react-router-dom';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { apiCreateProject } from '@/services/ProjectServices';
import { apiUpdateOrderItem } from '@/services/OrderItemServices';
import { ChecklistItem } from '@/@types/checklist';
import { Project } from '@/@types/project';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import { hasRole } from '@/utils/permissions';
import {
  HiOutlineSearch,
  HiInformationCircle,
  HiPlus,
  HiTrash,
  HiCheck,
  HiBan,
  HiExternalLink,
  HiShoppingBag,
} from 'react-icons/hi';

injectReducer('orders', reducer);

const STATE_CONFIG: Record<string, { label: string; bg: string; border: string; color: string; dot: string }> = {
  pending: { label: 'En attente', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#fbbf24', dot: '#f59e0b' },
  fulfilled: { label: 'Terminée', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', dot: '#22c55e' },
};

const StatusBadge = ({ state }: { state: string }) => {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: '100px', padding: '3px 10px',
      color: cfg.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const ActionBtn = ({ onClick, icon, color, title, disabled = false }: {
  onClick: () => void; icon: React.ReactNode; color: string; title: string; disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '32px', height: '32px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
      transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = color + '22'; e.currentTarget.style.borderColor = color + '55'; e.currentTarget.style.color = color; } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
  >
    {icon}
  </button>
);

const TAB_STATES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'fulfilled', label: 'Terminées' },
];

const OrderItemsList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1000;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [creatingProject, setCreatingProject] = useState<string | null>(null);

  const { orderItems, total, loading } = useAppSelector((state) => state.orders.data);
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    dispatch(getOrderItems({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, searchTerm]);

  const handleFinishOrder = async (orderItem: OrderItem) => {
    await dispatch(updateOrderItem({ documentId: orderItem.documentId, state: 'fulfilled' })).unwrap();
  };

  const handlePendOrder = async (orderItem: OrderItem) => {
    await dispatch(updateOrderItem({ documentId: orderItem.documentId, state: 'pending' })).unwrap();
  };

  const handleShowProject = (orderItem: OrderItem) => {
    navigate(`/common/projects/details/${orderItem.project.documentId}`);
  };

  const handleCreateProject = async (orderItem: OrderItem) => {
    setCreatingProject(orderItem.documentId);
    try {
      const { product } = await unwrapData(apiGetProductForShowById(orderItem.product.documentId));
      const checklistItems: ChecklistItem[] =
        product?.checklist?.items?.map((label: string) => ({ label, done: false })) ?? [];
      const { createProject }: { createProject: Project } = await unwrapData(
        apiCreateProject({
          name: `Projet - ${orderItem.product.name}`,
          description: '',
          startDate: new Date(),
          endDate: new Date(),
          state: 'pending',
          customer: orderItem.customer,
          producer: null,
          priority: 'low',
          price: orderItem.price,
          producerPrice: 0,
          paidPrice: 0,
          producerPaidPrice: 0,
          comments: [],
          images: [],
          tasks: [],
          invoices: [],
          poolable: false,
          orderItem: orderItem,
          checklistItems,
        })
      );
      await apiUpdateOrderItem({
        documentId: orderItem.documentId,
        project: { documentId: createProject.documentId } as any,
      });
      dispatch(getOrderItems({ pagination: { page: currentPage, pageSize }, searchTerm }));
      navigate(`/common/projects/details/${createProject.documentId}`);
    } finally {
      setCreatingProject(null);
    }
  };

  const handleDeleteOrderItem = (orderItem: OrderItem) => {
    dispatch(deleteOrderItem(orderItem.documentId));
  };

  // Filter
  const filtered = orderItems.filter((o) => {
    const matchState = activeTab === 'all' || o.state === activeTab;
    const matchSearch =
      !searchTerm ||
      o.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchState && matchSearch;
  });

  const countByState = (key: string) =>
    key === 'all' ? orderItems.length : orderItems.filter((o) => o.state === key).length;

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ paddingTop: '28px', paddingBottom: '24px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Boutique</p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Commandes <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
        </h2>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
                background: activeTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent',
                color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: '6px', background: activeTab === tab.key ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)',
                borderRadius: '100px', padding: '1px 7px', fontSize: '10px',
                color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.3)',
              }}>
                {countByState(tab.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <HiOutlineSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Rechercher produit ou client…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '9px 14px 9px 34px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '64px' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <HiShoppingBag size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune commande</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '40px' }}>
          {filtered.map((order) => {
            const selections: SizeAndColorSelection[] = order.sizeAndColorSelections ?? [];
            const img = order.product?.images?.[0]?.url;
            const totalQty = selections.reduce((sum, s) => sum + (s.quantity || 0), 0);

            return (
              <div
                key={order.documentId}
                style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                {/* Product image */}
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {img ? (
                    <img src={img} alt={order.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <HiShoppingBag size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  )}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.product?.name ?? 'Produit supprimé'}
                    </span>
                    <StatusBadge state={order.state} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Client */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#6b9eff', flexShrink: 0 }}>
                        {(order.customer?.name ?? '?')[0].toUpperCase()}
                      </span>
                      {order.customer?.name ?? 'Client supprimé'}
                    </span>

                    {/* Sélections tailles/couleurs */}
                    {selections.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selections.map((sel, i) => (
                          <span
                            key={i}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '2px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
                          >
                            {sel.color?.value && (
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sel.color.value, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                            )}
                            {sel.size?.name}
                            {sel.color?.name ? ` · ${sel.color.name}` : ''}
                            <span style={{ fontWeight: 700, color: '#fff' }}>×{sel.quantity}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {totalQty > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
                        {totalQty} article{totalQty > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                    {order.price?.toFixed(2)} €
                  </span>
                </div>

                {/* Project badge */}
                <div style={{ flexShrink: 0 }}>
                  {order.project ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '100px', padding: '3px 10px', color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>
                      <HiExternalLink size={11} /> Projet lié
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '3px 10px', color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontWeight: 600 }}>
                      Sans projet
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <ActionBtn
                    onClick={() => navigate('/common/orderItem/' + order.documentId)}
                    icon={<HiInformationCircle size={15} />}
                    color="#6b9eff"
                    title="Voir les détails"
                  />

                  {order.project ? (
                    <ActionBtn
                      onClick={() => handleShowProject(order)}
                      icon={<HiExternalLink size={15} />}
                      color="#4ade80"
                      title="Voir le projet"
                    />
                  ) : (
                    <ActionBtn
                      onClick={() => handleCreateProject(order)}
                      icon={creatingProject === order.documentId ? <span style={{ fontSize: 10 }}>…</span> : <HiPlus size={15} />}
                      color="#a78bfa"
                      title="Créer un projet"
                      disabled={!hasRole(user, [SUPER_ADMIN]) || creatingProject === order.documentId}
                    />
                  )}

                  <ActionBtn
                    onClick={() => order.state === 'pending' ? handleFinishOrder(order) : handlePendOrder(order)}
                    icon={order.state === 'pending' ? <HiCheck size={15} /> : <HiBan size={15} />}
                    color={order.state === 'pending' ? '#4ade80' : '#fbbf24'}
                    title={order.state === 'pending' ? 'Marquer comme terminée' : 'Remettre en attente'}
                  />

                  <ActionBtn
                    onClick={() => handleDeleteOrderItem(order)}
                    icon={<HiTrash size={15} />}
                    color="#f87171"
                    title="Supprimer"
                    disabled={!hasRole(user, [SUPER_ADMIN])}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default OrderItemsList;
