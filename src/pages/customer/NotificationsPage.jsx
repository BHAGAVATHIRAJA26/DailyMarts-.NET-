import { useState, useEffect } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { notificationService } from '../../services';
import { timeAgo } from '../../utils/formatters';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      setNotifs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <CustomerLayout>
      <div className="page-container max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🔔 Notifications</h1>
            <p className="section-subtitle">Delivery updates, payment reminders, and order status</p>
          </div>
          {notifs.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              ✓ Mark All Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading notifications...</p>
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">🔔</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Notifications Yet</div>
            <div className="empty-state-desc text-muted">You have no new notifications or delivery updates right now.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifs.map((n) => (
              <div
                key={n._id || n.id}
                className={`card p-4 flex items-start gap-4 ${!n.isRead && !n.read ? 'border-green bg-green-50' : ''}`}
              >
                <div className="text-3xl">{n.icon || '🔔'}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-base text-primary">{n.title}</div>
                    <span className="text-xs text-muted">{timeAgo(n.createdAt || n.time)}</span>
                  </div>
                  <div className="text-sm text-secondary mt-1">{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
