import { useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockBills } from '../../utils/mockData';
import { formatCurrency, formatDate, getStatusBadgeClass, formatStatus } from '../../utils/formatters';

export default function BillsPage() {
  const [bills] = useState(mockBills);

  return (
    <CustomerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">📄 Monthly Bills & Invoices</h1>
            <p className="section-subtitle">Track payments, remaining balances, and invoice breakdown</p>
          </div>
        </div>

        <div className="grid grid-col gap-4">
          {bills.map((bill) => (
            <div key={bill.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-muted uppercase">Invoice #{bill.invoiceNo}</span>
                  <h2 className="text-xl font-bold text-primary mt-1">{bill.productName} ({bill.period})</h2>
                  <div className="text-sm text-muted">🌾 Farmer: {bill.farmerName}</div>
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
                  <div className="text-lg font-bold text-green">{formatCurrency(bill.paidAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Remaining Balance</div>
                  <div className="text-lg font-bold text-gold">{formatCurrency(bill.remainingAmount)}</div>
                </div>
              </div>

              {/* Transactions */}
              {bill.transactions.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted uppercase mb-2">Transaction History</div>
                  <div className="flex flex-col gap-2">
                    {bill.transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-light">
                        <span>💳 {tx.mode} Payment ({formatDate(tx.date)})</span>
                        <span className="font-semibold text-green">+{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-light">
                <div className="text-xs text-muted">Due Date: <strong>{formatDate(bill.dueDate)}</strong></div>
                {bill.remainingAmount > 0 ? (
                  <Link to={`/customer/payments?billId=${bill.id}`} className="btn btn-primary btn-sm">
                    💳 Pay Remaining ({formatCurrency(bill.remainingAmount)})
                  </Link>
                ) : (
                  <span className="text-xs text-green font-semibold">✓ Fully Paid</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
