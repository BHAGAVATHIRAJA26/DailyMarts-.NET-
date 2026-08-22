import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { orderService } from '../../services';
import { formatCurrency, formatDate, formatFrequency, formatDeliveryTime, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { ConfirmationDialog } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import './OrdersPage.css';

const TABS = ['all', 'active', 'confirmed', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelType, setCancelType] = useState('day');
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getAll();
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['CONFIRMED', 'PREPARING', 'READY', 'PENDING'].includes(o.orderStatus?.toUpperCase());
    return o.orderStatus?.toLowerCase() === activeTab;
  });

  const handleCancelConfirm = async () => {
    if (!cancelDialog) return;
    try {
      const reason = cancelReason === 'Other' ? otherReason : cancelReason;
      await orderService.cancel(cancelDialog._id || cancelDialog.orderId, { reason });
      toast.success(
        cancelType === 'day' ? 'Delivery Skipped' : 'Order Cancelled',
        cancelType === 'day' ? 'Your delivery for today has been skipped.' : 'Your order has been cancelled.'
      );
      fetchOrders();
    } catch (err) {
      toast.error('Action Failed', err.response?.data?.message || err.message);
    } finally {
      setCancelDialog(null);
      setCancelReason('');
      setOtherReason('');
    }
  };

  return (
    <CustomerLayout>
      <div className="orders-page">
        <div className="orders-page-header flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">📦 My Orders</h1>
            <p className="section-subtitle">Track and manage all your orders</p>
          </div>
          <Link to="/customer/products" className="btn btn-primary">
            + Order Products
          </Link>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '24px' }}>
          {TABS.map((tab) => {
            const count = tab === 'all'
              ? orders.length
              : tab === 'active'
              ? orders.filter((o) => ['CONFIRMED', 'PREPARING', 'READY', 'PENDING'].includes(o.orderStatus?.toUpperCase())).length
              : orders.filter((o) => o.orderStatus?.toLowerCase() === tab).length;
            return (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                id={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 && <span className="tab-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Orders list */}
        <div className="orders-list">
          {loading ? (
            <div className="card p-8 text-center">
              <div className="animate-spin text-3xl mb-2">🔄</div>
              <p className="text-muted">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state card p-8 text-center">
              <div className="empty-state-icon text-5xl mb-3">📦</div>
              <div className="empty-state-title font-bold text-xl mb-1">No {activeTab} orders</div>
              <div className="empty-state-desc text-muted mb-4">You have not placed any {activeTab === 'all' ? '' : activeTab} orders yet.</div>
              <Link to="/customer/products" className="btn btn-primary">
                Browse Fresh Products
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const productName = order.product?.name || 'Fresh Product';
              const productEmoji = order.product?.emoji || '🥛';
              const farmerName = order.farmer?.farmName || order.farmer?.name || 'Local Farmer';
              const unit = order.unit || order.product?.unit || 'L';
              const orderIdStr = order.orderId || order._id;

              return (
                <div key={orderIdStr} className="order-card">
                  <div className="order-card-left">
                    <div className="order-card-emoji">{productEmoji}</div>
                    <div className="order-card-info">
                      <div className="order-card-name">{productName}</div>
                      <div className="order-card-id">Order ID: #{orderIdStr}</div>
                      <div className="order-card-meta">
                        🌾 {farmerName} · {order.quantity} {unit}
                      </div>
                      {order.deliverySlot && (
                        <div className="order-card-delivery">{formatDeliveryTime(order.deliverySlot)}</div>
                      )}
                      {order.deliveryDate && (
                        <div className="order-card-next">📅 Delivery Date: {formatDate(order.deliveryDate)}</div>
                      )}
                    </div>
                  </div>

                  <div className="order-card-right">
                    <div className="order-card-badges">
                      <span className={`badge ${getStatusBadgeClass(order.orderStatus)}`}>{formatStatus(order.orderStatus)}</span>
                      <span className={`badge ${getStatusBadgeClass(order.paymentStatus)}`}>{formatStatus(order.paymentStatus)}</span>
                    </div>
                    <div className="order-card-amount">{formatCurrency(order.totalAmount)}</div>
                    {['CONFIRMED', 'PENDING'].includes(order.orderStatus) && (
                      <div className="order-card-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setCancelDialog(order); setCancelType('day'); }}
                          id={`skip-${orderIdStr}`}
                        >
                          Skip Delivery
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { setCancelDialog(order); setCancelType('all'); }}
                          id={`cancel-${orderIdStr}`}
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <ConfirmationDialog
        isOpen={!!cancelDialog}
        onClose={() => { setCancelDialog(null); setCancelReason(''); }}
        onConfirm={handleCancelConfirm}
        title={cancelType === 'day' ? `Skip Delivery Today` : 'Cancel Order'}
        confirmLabel={cancelType === 'day' ? 'Skip Today' : 'Cancel Order'}
        dangerous={cancelType === 'all'}
      >
        {cancelDialog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="order-cancel-info flex items-center gap-3">
              <span className="text-2xl">{cancelDialog.product?.emoji || '📦'}</span>
              <div>
                <div className="font-semibold">{cancelDialog.product?.name || 'Product'}</div>
                <div className="text-sm text-muted">{cancelDialog.quantity} {cancelDialog.unit}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for cancellation</label>
              <select className="form-select" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} id="cancel-reason">
                <option value="">Select reason…</option>
                <option>Not required today</option>
                <option>Going out of town</option>
                <option>Product not required</option>
                <option>Other</option>
              </select>
            </div>

            {cancelReason === 'Other' && (
              <div className="form-group">
                <label className="form-label">Please specify</label>
                <textarea className="form-textarea" placeholder="Enter your reason…" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} rows={3} />
              </div>
            )}
          </div>
        )}
      </ConfirmationDialog>
    </CustomerLayout>
  );
}
