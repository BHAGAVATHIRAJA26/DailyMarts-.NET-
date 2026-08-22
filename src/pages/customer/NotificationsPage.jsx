import { useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockNotifications } from '../../utils/mockData';
import { timeAgo } from '../../utils/formatters';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <CustomerLayout>
      <div className="page-container max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🔔 Notifications</h1>
            <p className="section-subtitle">Delivery updates, payment reminders, and order status</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            ✓ Mark All Read
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {notifs.map((n) => (
            <div
              key={n.id}
              className={`card p-4 flex items-start gap-4 ${!n.read ? 'border-green bg-green-50' : ''}`}
            >
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
    </CustomerLayout>
  );
}
