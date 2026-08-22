import { useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockOrders } from '../../utils/mockData';
import { formatCurrency, formatDate, formatFrequency, formatDeliveryTime } from '../../utils/formatters';
import { ConfirmationDialog } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export default function SubscriptionsPage() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState(mockOrders.filter((o) => o.frequency !== 'once'));
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionType, setActionType] = useState('skip'); // 'skip' or 'cancel'

  const handleActionConfirm = () => {
    if (actionType === 'skip') {
      toast.success('Delivery Skipped', `Next delivery for ${selectedSub.productName} has been skipped.`);
    } else {
      setSubscriptions((prev) => prev.filter((s) => s.id !== selectedSub.id));
      toast.success('Subscription Cancelled', `${selectedSub.productName} subscription has been cancelled.`);
    }
    setSelectedSub(null);
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

        {subscriptions.length === 0 ? (
          <div className="empty-state card p-8">
            <div className="empty-state-icon">🥛</div>
            <div className="empty-state-title">No Active Subscriptions</div>
            <div className="empty-state-desc">You don't have any active recurring milk or daily product subscriptions right now.</div>
            <Link to="/customer/subscriptions/milk" className="btn btn-primary mt-4">
              Set Up Daily Milk Delivery
            </Link>
          </div>
        ) : (
          <div className="grid grid-col gap-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{sub.productEmoji}</div>
                  <div>
                    <div className="font-bold text-lg">{sub.productName}</div>
                    <div className="text-sm text-muted">🌾 {sub.farmerName} · {sub.quantity} {sub.unit} / {formatFrequency(sub.frequency)}</div>
                    <div className="text-xs text-green font-medium mt-1">
                      {formatDeliveryTime(sub.deliveryTime)} · Next delivery: {formatDate(sub.nextDelivery)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-xl font-bold text-green">{formatCurrency(sub.pricePerUnit * sub.quantity)}<span className="text-xs text-muted">/delivery</span></div>
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
            ))}
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
            Are you sure you want to {actionType === 'skip' ? 'skip the next upcoming delivery' : 'permanently cancel the subscription'} for <strong>{selectedSub.productName}</strong>?
          </p>
        )}
      </ConfirmationDialog>
    </CustomerLayout>
  );
}
