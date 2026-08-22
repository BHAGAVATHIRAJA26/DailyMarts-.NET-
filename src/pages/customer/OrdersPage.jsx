import { useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockOrders } from '../../utils/mockData';
import { formatCurrency, formatDate, formatFrequency, formatDeliveryTime, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { ConfirmationDialog } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import './OrdersPage.css';

const TABS = ['active', 'upcoming', 'completed', 'cancelled'];

export default function OrdersPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelType, setCancelType] = useState('day');
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const tabOrders = mockOrders.filter((o) => o.orderStatus === activeTab);

  const handleCancelConfirm = () => {
    const reason = cancelReason === 'Other' ? otherReason : cancelReason;
    toast.success(
      cancelType === 'day' ? 'Delivery Skipped' : 'Subscription Cancelled',
      cancelType === 'day' ? 'Your delivery for today has been skipped.' : 'Your subscription has been cancelled.'
    );
    setCancelDialog(null);
    setCancelReason('');
    setOtherReason('');
  };

  return (
    <CustomerLayout>
      <div className="orders-page">
        <div className="orders-page-header">
          <div>
            <h1 className="section-title">My Orders</h1>
            <p className="section-subtitle">Track and manage all your orders</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: '24px' }}>
          {TABS.map((tab) => {
            const count = mockOrders.filter((o) => o.orderStatus === tab).length;
            return (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                id={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 && (
                  <span className="tab-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders list */}
        <div className="orders-list">
          {tabOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No {activeTab} orders</div>
              <div className="empty-state-desc">Your {activeTab} orders will appear here</div>
            </div>
          ) : (
            tabOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-left">
                  <div className="order-card-emoji">{order.productEmoji}</div>
                  <div className="order-card-info">
                    <div className="order-card-name">{order.productName}</div>
                    <div className="order-card-id">Order: {order.id}</div>
                    <div className="order-card-meta">
                      🌾 {order.farmerName} · {order.quantity} {order.unit} · {formatFrequency(order.frequency)}
                    </div>
                    {order.deliveryTime && (
                      <div className="order-card-delivery">{formatDeliveryTime(order.deliveryTime)}</div>
                    )}
                    {order.nextDelivery && (
                      <div className="order-card-next">📅 Next delivery: {formatDate(order.nextDelivery)}</div>
                    )}
                    {order.cancellationReason && (
                      <div className="order-card-reason">Reason: {order.cancellationReason}</div>
                    )}
                  </div>
                </div>

                <div className="order-card-right">
                  <div className="order-card-badges">
                    <span className={`badge ${getStatusBadgeClass(order.orderStatus)}`}>{formatStatus(order.orderStatus)}</span>
                    <span className={`badge ${getStatusBadgeClass(order.paymentStatus)}`}>{formatStatus(order.paymentStatus)}</span>
                  </div>
                  <div className="order-card-amount">{formatCurrency(order.totalAmount)}</div>
                  {order.remainingAmount > 0 && (
                    <div className="order-card-remaining">₹{order.remainingAmount.toLocaleString('en-IN')} pending</div>
                  )}
                  {order.orderStatus === 'active' && (
                    <div className="order-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setCancelDialog(order); setCancelType('day'); }}
                        id={`skip-${order.id}`}
                      >
                        Skip Today
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setCancelDialog(order); setCancelType('all'); }}
                        id={`cancel-${order.id}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <ConfirmationDialog
        isOpen={!!cancelDialog}
        onClose={() => { setCancelDialog(null); setCancelReason(''); }}
        onConfirm={handleCancelConfirm}
        title={cancelType === 'day' ? `Skip Delivery Today` : 'Cancel Subscription'}
        confirmLabel={cancelType === 'day' ? 'Skip Today' : 'Cancel Subscription'}
        dangerous={cancelType === 'all'}
      >
        {cancelDialog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="order-cancel-info">
              <span className="text-2xl">{cancelDialog.productEmoji}</span>
              <div>
                <div className="font-semibold">{cancelDialog.productName}</div>
                <div className="text-sm text-muted">{cancelDialog.quantity} {cancelDialog.unit} · {formatFrequency(cancelDialog.frequency)}</div>
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
