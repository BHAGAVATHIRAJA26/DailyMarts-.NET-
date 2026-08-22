import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { subscriptionService } from '../../services';
import { formatCurrency, formatFrequency, formatDeliveryTime } from '../../utils/formatters';
import { ConfirmationDialog } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export default function SubscriptionsPage() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionType, setActionType] = useState('skip'); // 'skip' or 'cancel'

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await subscriptionService.getAll();
      setSubscriptions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!selectedSub) return;
    try {
      if (actionType === 'skip') {
        await subscriptionService.skip(selectedSub._id || selectedSub.subscriptionId, { reason: 'Customer skip request' });
        toast.success('Delivery Skipped', `Next delivery for ${selectedSub.product?.name || 'product'} has been skipped.`);
      } else {
        await subscriptionService.cancel(selectedSub._id || selectedSub.subscriptionId, { reason: 'Customer cancel request' });
        toast.success('Subscription Cancelled', `${selectedSub.product?.name || 'product'} subscription has been cancelled.`);
      }
      fetchSubscriptions();
    } catch (err) {
      toast.error('Action Failed', err.response?.data?.message || err.message);
    } finally {
      setSelectedSub(null);
    }
  };

  return (
    <CustomerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🔄 Active Subscriptions</h1>
            <p className="section-subtitle">Manage your recurring daily products and deliveries</p>
          </div>
          <Link to="/customer/subscriptions/milk" className="btn btn-primary">
            + New Milk Subscription
          </Link>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading your active subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">🥛</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Active Subscriptions</div>
            <div className="empty-state-desc text-muted mb-4">You don't have any active recurring milk or daily product subscriptions right now.</div>
            <Link to="/customer/subscriptions/milk" className="btn btn-primary">
              Set Up Daily Milk Delivery
            </Link>
          </div>
        ) : (
          <div className="grid grid-col gap-4">
            {subscriptions.map((sub) => {
              const productName = sub.product?.name || 'Milk Subscription';
              const productEmoji = sub.product?.emoji || '🥛';
              const farmerName = sub.farmer?.farmName || sub.farmer?.name || 'Local Farmer';
              const unit = sub.unit || sub.product?.unit || 'L';
              const price = sub.pricePerUnit || sub.product?.price || 0;

              return (
                <div key={sub._id || sub.subscriptionId} className="card p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{productEmoji}</div>
                    <div>
                      <div className="font-bold text-lg">{productName}</div>
                      <div className="text-sm text-muted">
                        🌾 {farmerName} · {sub.quantity} {unit} / {formatFrequency(sub.frequency)}
                      </div>
                      <div className="text-xs text-green font-medium mt-1">
                        {formatDeliveryTime(sub.deliverySlot)} · Status: <span className="uppercase font-bold">{sub.status || 'ACTIVE'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xl font-bold text-green">
                      {formatCurrency(price * sub.quantity)}
                      <span className="text-xs text-muted">/delivery</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedSub(sub); setActionType('skip'); }}
                      >
                        Skip One Day
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setSelectedSub(sub); setActionType('cancel'); }}
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        onConfirm={handleActionConfirm}
        title={actionType === 'skip' ? `Skip Next Delivery` : 'Cancel Subscription'}
        confirmLabel={actionType === 'skip' ? 'Skip Delivery' : 'Cancel Subscription'}
        dangerous={actionType === 'cancel'}
      >
        {selectedSub && (
          <p className="text-sm text-secondary">
            Are you sure you want to {actionType === 'skip' ? 'skip the next upcoming delivery' : 'permanently cancel the subscription'} for <strong>{selectedSub.product?.name || 'this item'}</strong>?
          </p>
        )}
      </ConfirmationDialog>
    </CustomerLayout>
  );
}
