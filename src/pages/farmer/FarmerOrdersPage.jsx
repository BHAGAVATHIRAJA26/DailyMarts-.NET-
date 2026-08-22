import { useState, useEffect } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { orderService } from '../../services';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function FarmerOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getAll();
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load farmer orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSupplied = async (id) => {
    try {
      await orderService.markSupplied(id);
      toast.success('Order Marked Supplied', `Order #${id} has been marked as supplied to customer.`);
      fetchOrders();
    } catch (err) {
      toast.error('Action Failed', err.response?.data?.message || err.message);
    }
  };

  return (
    <FarmerLayout>
      <div className="page-container">
        <h1 className="section-title mb-2">📦 Customer Orders & Deliveries</h1>
        <p className="section-subtitle mb-6">Track daily supply, mark products as delivered/sold, and manage fulfillment</p>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading customer orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">📦</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Orders Yet</div>
            <div className="empty-state-desc text-muted">When customers order your milk or products, their orders will appear here.</div>
          </div>
        ) : (
          <div className="card p-6">
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-light text-xs text-muted uppercase">
                    <th className="py-3">Order ID</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Product</th>
                    <th className="py-3">Qty</th>
                    <th className="py-3">Slot</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Payment</th>
                    <th className="py-3 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const orderIdStr = o.orderId || o._id;
                    const customerName = o.customer?.name || 'Customer';
                    const productName = o.product?.name || 'Product';
                    const isSupplied = o.orderStatus === 'SUPPLIED' || o.orderStatus === 'DELIVERED' || o.orderStatus === 'COMPLETED';

                    return (
                      <tr key={orderIdStr} className="border-b border-light hover:bg-cream">
                        <td className="py-3 font-mono text-xs">#{orderIdStr}</td>
                        <td className="py-3 font-semibold">{customerName}</td>
                        <td className="py-3">{productName}</td>
                        <td className="py-3">{o.quantity} {o.unit || 'L'}</td>
                        <td className="py-3 capitalize">{o.deliverySlot || 'MORNING'}</td>
                        <td className="py-3 font-bold">{formatCurrency(o.totalAmount)}</td>
                        <td className="py-3">
                          <span className={`badge ${getStatusBadgeClass(o.paymentStatus)}`}>
                            {formatStatus(o.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {!isSupplied ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleMarkSupplied(o._id || o.orderId)}>
                              Mark Supplied
                            </button>
                          ) : (
                            <span className="badge badge-paid">✓ Supplied</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
