import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { mockFarmerOrders } from '../../utils/mockData';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function FarmerOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState(mockFarmerOrders);

  const handleMarkSupplied = (id) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, orderStatus: 'supplied' } : o))
    );
    toast.success('Order Marked Supplied', `Order #${id} has been marked as supplied to customer.`);
  };

  return (
    <FarmerLayout>
      <div className="page-container">
        <h1 className="section-title mb-2">📦 Customer Orders & Deliveries</h1>
        <p className="section-subtitle mb-6">Track daily supply, mark products as delivered/sold, and manage fulfillment</p>

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
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-light hover:bg-cream">
                    <td className="py-3 font-mono text-xs">{o.id}</td>
                    <td className="py-3 font-semibold">{o.customerName}</td>
                    <td className="py-3">{o.product}</td>
                    <td className="py-3">{o.quantity} {o.unit}</td>
                    <td className="py-3 capitalize">{o.deliveryTime || '—'}</td>
                    <td className="py-3 font-bold">{formatCurrency(o.amount)}</td>
                    <td className="py-3">
                      <span className={`badge ${getStatusBadgeClass(o.paymentStatus)}`}>
                        {formatStatus(o.paymentStatus)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {o.orderStatus === 'active' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => handleMarkSupplied(o.id)}>
                          Mark Supplied
                        </button>
                      ) : (
                        <span className="badge badge-paid">✓ Supplied</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
