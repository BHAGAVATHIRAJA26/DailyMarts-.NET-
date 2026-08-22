import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { paymentService } from '../../services';
import { formatCurrency, formatDate, getStatusBadgeClass, formatStatus } from '../../utils/formatters';

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getBills();
      setBills(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load bills:', err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">📄 Monthly Bills & Invoices</h1>
            <p className="section-subtitle">Track payments, remaining balances, and invoice breakdown</p>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading your monthly bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">📄</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Monthly Bills</div>
            <div className="empty-state-desc text-muted mb-4">You have no active monthly bills or invoices yet. Your farmer will generate your monthly bill at the end of the billing period.</div>
            <Link to="/customer/products" className="btn btn-primary">
              Explore Fresh Dairy Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-col gap-4">
            {bills.map((bill) => {
              const farmerName = bill.farmer?.farmName || bill.farmer?.name || 'Local Farmer';
              const billIdStr = bill.invoiceNo || bill.billId || bill._id;

              return (
                <div key={bill._id || bill.billId} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-muted uppercase">Invoice #{bill.invoiceNo || bill.billId}</span>
                      <h2 className="text-xl font-bold text-primary mt-1">{bill.productName || 'Milk Subscription'} ({bill.billingPeriod || 'Monthly'})</h2>
                      <div className="text-sm text-muted">🌾 Farmer: {farmerName}</div>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(bill.paymentStatus)}`}>
                      {formatStatus(bill.paymentStatus)}
                    </span>
                  </div>

                  <div className="grid grid-3 gap-4 bg-cream p-4 rounded-lg mb-4">
                    <div>
                      <div className="text-xs text-muted">Total Bill</div>
                      <div className="text-lg font-bold text-primary">{formatCurrency(bill.totalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Amount Paid</div>
                      <div className="text-lg font-bold text-green">{formatCurrency(bill.paidAmount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Remaining Balance</div>
                      <div className="text-lg font-bold text-gold">{formatCurrency(bill.remainingAmount || 0)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-light">
                    <div className="text-xs text-muted">Due Date: <strong>{formatDate(bill.dueDate)}</strong></div>
                    {(bill.remainingAmount || 0) > 0 ? (
                      <Link to={`/customer/payments?billId=${bill._id || bill.billId}`} className="btn btn-primary btn-sm">
                        💳 Pay Remaining ({formatCurrency(bill.remainingAmount)})
                      </Link>
                    ) : (
                      <span className="text-xs text-green font-semibold">✓ Fully Paid</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
