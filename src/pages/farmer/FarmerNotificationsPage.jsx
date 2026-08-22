import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { timeAgo } from '../../utils/formatters';

const mockFarmerNotifs = [
  { id: 'FN01', icon: '📦', title: 'New Milk Subscription', message: 'Priya Sharma subscribed to 1L Fresh Cow Milk daily (Morning slot).', time: '2026-08-22T08:00:00', read: false },
  { id: 'FN02', icon: '💰', title: 'Payment Received', message: 'Received ₹1,200 payment from Priya Sharma via UPI.', time: '2026-08-21T14:30:00', read: true },
  { id: 'FN03', icon: '🤝', title: 'Exchange Request Accepted', message: 'Suresh Pandi accepted your 2L milk exchange request.', time: '2026-08-21T10:15:00', read: true },
];

export default function FarmerNotificationsPage() {
  const [notifs, setNotifs] = useState(mockFarmerNotifs);

  return (
    <FarmerLayout>
      <div className="page-container max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🔔 Farmer Notifications</h1>
            <p className="section-subtitle">New customer subscriptions, payment alerts, and exchange updates</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setNotifs(notifs.map((n) => ({ ...n, read: true })))}>
            ✓ Mark All Read
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {notifs.map((n) => (
            <div key={n.id} className={`card p-4 flex items-start gap-4 ${!n.read ? 'border-green bg-green-50' : ''}`}>
              <div className="text-3xl">{n.icon}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-base text-primary">{n.title}</div>
                  <span className="text-xs text-muted">{timeAgo(n.time)}</span>
                </div>
                <div className="text-sm text-secondary mt-1">{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FarmerLayout>
  );
}
