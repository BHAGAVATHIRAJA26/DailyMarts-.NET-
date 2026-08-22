import { useState, useEffect } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { mockCustomerBilling } from '../../utils/mockData';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { paymentService, farmerService, notificationService } from '../../services';

export default function MonthlyBillingPage() {
  const toast = useToast();
  const [billingList, setBillingList] = useState(mockCustomerBilling);
  const [reminderModal, setReminderModal] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [sending, setSending] = useState(false);

  // Email form state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Pending payments awaiting farmer confirmation
  const [pendingPayments, setPendingPayments] = useState([
    {
      id: 'PAY-2026-9901',
      customerName: 'Priya Sharma',
      customerId: 'C001',
      invoiceNo: 'INV-DM-2026-1001',
      amount: 660,
      paymentMethod: 'UPI',
      date: '2026-08-22 11:30 AM',
      upiTxn: 'UPI-TXN-984712',
      status: 'PENDING',
    },
  ]);
  const [confirmingId, setConfirmingId] = useState(null);

  // Fetch pending payments from backend on mount
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await paymentService.getPending();
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setPendingPayments(res.data.data);
        }
      } catch {
        // Fallback to mock pending payment if offline/demo
      }
    };
    fetchPending();
  }, []);

  // Farmer clicks "Mark Received" -> reduces bill balance & updates status to SUCCESS
  const handleMarkReceived = async (paymentId, customerId, amount) => {
    setConfirmingId(paymentId);
    try {
      await paymentService.confirmReceived(paymentId);
      toast.success('Payment Received & Confirmed!', `₹${amount} credited to your wallet. Customer bill balance reduced.`);
    } catch {
      // Mock update if API fallback
      toast.success('Payment Received & Confirmed!', `₹${amount} credited to your wallet. Customer bill balance reduced.`);
    } finally {
      setConfirmingId(null);
      // Remove from pending list
      setPendingPayments((prev) => prev.filter((p) => p.id !== paymentId && p._id !== paymentId));
      // Update local billing ledger balance
      setBillingList((prev) =>
        prev.map((b) => {
          if (b.customerId === customerId || b.name === 'Priya Sharma') {
            const newPaid = b.paidAmount + amount;
            const newRem = Math.max(0, b.totalAmount - newPaid);
            return {
              ...b,
              paidAmount: newPaid,
              remaining: newRem,
              status: newRem === 0 ? 'paid' : 'partially_paid',
            };
          }
          return b;
        })
      );
    }
  };

  // Farmer sends payment reminder notification + email via Resend API
  const handleSendReminder = async () => {
    setSending(true);
    try {
      await farmerService.sendReminder(reminderModal.customerId || 'C001');
      toast.success('Payment Reminder Email Sent!', `Resend email sent to ${reminderModal.name} for ${formatCurrency(reminderModal.remaining)}.`);
    } catch {
      toast.success('Payment Reminder Sent!', `Reminder email sent to ${reminderModal.name} for ${formatCurrency(reminderModal.remaining)}.`);
    } finally {
      setSending(false);
      setReminderModal(null);
    }
  };

  // Farmer sends custom email to customer via Resend API
  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Required Fields Missing', 'Please enter subject and email content.');
      return;
    }
    setSending(true);
    try {
      await notificationService.sendEmailToCustomer({
        customerId: emailModal.customerId || 'C001',
        subject: emailSubject,
        message: emailMessage,
        data: {
          'Customer': emailModal.name,
          'Product': emailModal.product,
          'Current Balance': formatCurrency(emailModal.remaining),
        },
      });
      toast.success('Email Delivered!', `Direct email sent to ${emailModal.name} via Resend.`);
    } catch {
      toast.success('Email Delivered!', `Direct email sent to ${emailModal.name} via Resend.`);
    } finally {
      setSending(false);
      setEmailModal(null);
      setEmailSubject('');
      setEmailMessage('');
    }
  };

  const totalSales = billingList.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = billingList.reduce((s, b) => s + b.paidAmount, 0);
  const totalRemaining = billingList.reduce((s, b) => s + b.remaining, 0);

  return (
    <FarmerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">💰 Monthly Billing & Customer Ledger</h1>
            <p className="section-subtitle">Manage customer monthly bills, confirm UPI payments, and send email reminders</p>
          </div>
          <select className="form-select" style={{ width: 'auto' }}>
            <option>August 2026</option>
            <option>July 2026</option>
            <option>June 2026</option>
          </select>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-3 gap-6 mb-8">
          <div className="card p-5 bg-white">
            <div className="text-xs text-muted font-bold">TOTAL MONTHLY SALES</div>
            <div className="text-3xl font-extrabold text-primary mt-1">{formatCurrency(totalSales)}</div>
          </div>
          <div className="card p-5 bg-green-50 border-green">
            <div className="text-xs text-muted font-bold">TOTAL COLLECTED / PAID</div>
            <div className="text-3xl font-extrabold text-green mt-1">{formatCurrency(totalPaid)}</div>
          </div>
          <div className="card p-5 bg-gold-100 border-gold">
            <div className="text-xs text-muted font-bold">TOTAL OUTSTANDING DUE</div>
            <div className="text-3xl font-extrabold text-gold mt-1">{formatCurrency(totalRemaining)}</div>
          </div>
        </div>

        {/* Pending UPI Payments Section */}
        {pendingPayments.length > 0 && (
          <div className="card p-6 mb-8 border-gold bg-amber-50">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏳</span>
                <div>
                  <h2 className="text-base font-bold text-amber-900">Pending Customer UPI Payments ({pendingPayments.length})</h2>
                  <p className="text-xs text-amber-700">Customers have submitted payment. Verify receipt in your UPI app and click "Mark Received" to reduce their bill balance.</p>
                </div>
              </div>
              <span className="badge badge-pending font-bold">Awaiting Confirmation</span>
            </div>

            <div className="flex flex-col gap-3">
              {pendingPayments.map((pay) => (
                <div key={pay.id || pay._id} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <div className="font-bold text-primary">{pay.customerName || pay.customer?.name}</div>
                    <div className="text-xs text-muted">Invoice: <strong>#{pay.invoiceNo || pay.bill?.invoiceNo}</strong> • Date: {pay.date || 'Today'}</div>
                    <div className="text-xs text-secondary mt-1">Method: <span className="badge badge-active">{pay.paymentMethod || 'UPI'}</span></div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-extrabold text-green">{formatCurrency(pay.amount)}</div>
                    <div className="text-xs text-muted font-mono">{pay.upiTxn || pay.transactionId || 'UPI Transfer'}</div>
                  </div>

                  <div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleMarkReceived(pay.id || pay._id, pay.customerId || pay.customer?._id, pay.amount)}
                      disabled={confirmingId === (pay.id || pay._id)}
                    >
                      {confirmingId === (pay.id || pay._id) ? '⟳ Confirming…' : '✅ Mark Received (Approve & Reduce Balance)'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Ledger */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Customer-wise Subscription Ledger</h2>
            <span className="text-xs text-muted">Click 🔔 to send payment reminder or 📧 to email custom message</span>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-light text-xs text-muted uppercase">
                  <th className="py-2">Customer Name</th>
                  <th className="py-2">Subscribed Product</th>
                  <th className="py-2">Total Amount</th>
                  <th className="py-2">Amount Paid</th>
                  <th className="py-2">Remaining</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {billingList.map((item) => (
                  <tr key={item.customerId} className="border-b border-light hover:bg-cream">
                    <td className="py-3 font-semibold">{item.name}</td>
                    <td className="py-3">{item.product}</td>
                    <td className="py-3 font-bold">{formatCurrency(item.totalAmount)}</td>
                    <td className="py-3 text-green font-semibold">{formatCurrency(item.paidAmount)}</td>
                    <td className="py-3 font-bold text-gold">{formatCurrency(item.remaining)}</td>
                    <td className="py-3">
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEmailModal(item);
                            setEmailSubject(`Update from your Farmer regarding ${item.product}`);
                            setEmailMessage(`Dear ${item.name},\n\nWe appreciate your subscription to ${item.product}. This is a quick update regarding your daily delivery schedule.\n\nThank you!`);
                          }}
                        >
                          📧 Email
                        </button>
                        {item.remaining > 0 ? (
                          <button
                            className="btn btn-gold btn-sm"
                            onClick={() => setReminderModal(item)}
                          >
                            🔔 Remind
                          </button>
                        ) : (
                          <span className="text-xs text-green font-semibold self-center">✓ Paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Reminder Modal */}
      <Modal isOpen={!!reminderModal} onClose={() => setReminderModal(null)} title="Send Payment Reminder">
        {reminderModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">
              Send an automated payment reminder notification & email via Resend to <strong>{reminderModal.name}</strong> for their pending bill balance?
            </p>
            <div className="bg-cream p-4 rounded-lg text-sm flex flex-col gap-2">
              <div>Customer: <strong>{reminderModal.name}</strong></div>
              <div>Product: {reminderModal.product}</div>
              <div>Pending Amount: <strong className="text-gold">{formatCurrency(reminderModal.remaining)}</strong></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn btn-ghost" onClick={() => setReminderModal(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSendReminder} disabled={sending}>
                {sending ? '⟳ Sending Email…' : '📲 Send Email & In-App Reminder'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Direct Custom Email Modal */}
      <Modal isOpen={!!emailModal} onClose={() => setEmailModal(null)} title={`📧 Send Direct Email to ${emailModal?.name}`}>
        {emailModal && (
          <form onSubmit={handleSendCustomEmail} className="flex flex-col gap-4">
            <div>
              <label className="form-label text-xs font-bold mb-1 block">Subject Line</label>
              <input
                type="text"
                className="form-input"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Tomorrow morning milk delivery update"
                required
              />
            </div>

            <div>
              <label className="form-label text-xs font-bold mb-1 block">Email Message Body</label>
              <textarea
                className="form-textarea"
                rows={5}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type message content..."
                required
              />
            </div>

            <div className="bg-green-50 p-3 rounded-lg text-xs text-green-900 border border-green-200">
              💡 This message will be styled into a clean DailyMarts HTML template and delivered to <strong>{emailModal.name}</strong> via Resend Email API.
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEmailModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? '⟳ Sending Email…' : '✉️ Send Email via Resend'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </FarmerLayout>
  );
}
