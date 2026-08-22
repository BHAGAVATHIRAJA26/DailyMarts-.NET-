import { useState, useEffect } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { paymentService, farmerService, notificationService } from '../../services';

export default function MonthlyBillingPage() {
  const toast = useToast();
  const [billingList, setBillingList] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderModal, setReminderModal] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [sending, setSending] = useState(false);

  // Email form state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [billsRes, pendingRes] = await Promise.allSettled([
        paymentService.getBills(),
        paymentService.getPending(),
      ]);

      if (billsRes.status === 'fulfilled') {
        setBillingList(billsRes.value.data?.data || []);
      }
      if (pendingRes.status === 'fulfilled') {
        setPendingPayments(pendingRes.value.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setBillingList([]);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Farmer clicks "Mark Received" -> reduces bill balance & updates status to SUCCESS
  const handleMarkReceived = async (paymentId, amount) => {
    setConfirmingId(paymentId);
    try {
      await paymentService.confirmReceived(paymentId);
      toast.success('Payment Received & Confirmed!', `₹${amount} credited to your wallet. Customer bill balance reduced.`);
      fetchBillingData();
    } catch (err) {
      toast.error('Confirmation Failed', err.response?.data?.message || err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  // Farmer sends payment reminder notification + email via Resend API
  const handleSendReminder = async () => {
    if (!reminderModal) return;
    setSending(true);
    try {
      const custId = reminderModal.customer?._id || reminderModal.customer;
      await farmerService.sendReminder(custId);
      toast.success('Payment Reminder Email Sent!', `Reminder sent for ${formatCurrency(reminderModal.remainingAmount || 0)}.`);
    } catch (err) {
      toast.error('Reminder Failed', err.response?.data?.message || err.message);
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
      const custId = emailModal.customer?._id || emailModal.customer;
      await notificationService.sendEmailToCustomer({
        customerId: custId,
        subject: emailSubject,
        message: emailMessage,
        data: {
          'Customer': emailModal.customer?.name || 'Customer',
          'Product': emailModal.productName || 'Milk',
          'Current Balance': formatCurrency(emailModal.remainingAmount || 0),
        },
      });
      toast.success('Email Delivered!', `Direct email sent via Resend.`);
    } catch (err) {
      toast.error('Email Failed', err.response?.data?.message || err.message);
    } finally {
      setSending(false);
      setEmailModal(null);
      setEmailSubject('');
      setEmailMessage('');
    }
  };

  const totalSales = billingList.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalPaid = billingList.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalRemaining = billingList.reduce((s, b) => s + (b.remainingAmount || 0), 0);

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
              {pendingPayments.map((pay) => {
                const payId = pay._id || pay.paymentId;
                const custName = pay.customer?.name || 'Customer';
                const invoiceNo = pay.bill?.invoiceNo || pay.bill?.billId || 'INV-DM';

                return (
                  <div key={payId} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <div className="font-bold text-primary">{custName}</div>
                      <div className="text-xs text-muted">Invoice: <strong>#{invoiceNo}</strong></div>
                      <div className="text-xs text-secondary mt-1">Method: <span className="badge badge-active">{pay.paymentMethod || 'UPI'}</span></div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-extrabold text-green">{formatCurrency(pay.amount)}</div>
                      <div className="text-xs text-muted font-mono">{pay.transactionId || 'UPI Transfer'}</div>
                    </div>

                    <div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMarkReceived(payId, pay.amount)}
                        disabled={confirmingId === payId}
                      >
                        {confirmingId === payId ? '⟳ Confirming…' : '✅ Mark Received (Approve & Reduce Balance)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Ledger */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Customer-wise Subscription Ledger</h2>
            <span className="text-xs text-muted">Click 🔔 to send payment reminder or 📧 to email custom message</span>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin text-3xl mb-2">🔄</div>
              <p className="text-muted">Loading customer ledger...</p>
            </div>
          ) : billingList.length === 0 ? (
            <div className="p-8 text-center">
              <div className="empty-state-icon text-5xl mb-2">📄</div>
              <div className="font-bold text-lg mb-1">No Monthly Bills Generated</div>
              <div className="text-xs text-muted">Generated monthly customer bills and ledgers will be listed here.</div>
            </div>
          ) : (
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
                  {billingList.map((item) => {
                    const custName = item.customer?.name || 'Customer';
                    const productName = item.productName || 'Milk Subscription';
                    const remAmount = item.remainingAmount || 0;

                    return (
                      <tr key={item._id || item.billId} className="border-b border-light hover:bg-cream">
                        <td className="py-3 font-semibold">{custName}</td>
                        <td className="py-3">{productName}</td>
                        <td className="py-3 font-bold">{formatCurrency(item.totalAmount)}</td>
                        <td className="py-3 text-green font-semibold">{formatCurrency(item.paidAmount || 0)}</td>
                        <td className="py-3 font-bold text-gold">{formatCurrency(remAmount)}</td>
                        <td className="py-3">
                          <span className={`badge ${getStatusBadgeClass(item.paymentStatus)}`}>
                            {formatStatus(item.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEmailModal(item);
                                setEmailSubject(`Update regarding your ${productName} subscription`);
                                setEmailMessage(`Dear ${custName},\n\nWe appreciate your subscription to ${productName}.\n\nThank you!`);
                              }}
                            >
                              📧 Email
                            </button>
                            {remAmount > 0 ? (
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Reminder Modal */}
      <Modal isOpen={!!reminderModal} onClose={() => setReminderModal(null)} title="Send Payment Reminder">
        {reminderModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">
              Send an automated payment reminder notification & email via Resend to <strong>{reminderModal.customer?.name}</strong> for their pending bill balance?
            </p>
            <div className="bg-cream p-4 rounded-lg text-sm flex flex-col gap-2">
              <div>Customer: <strong>{reminderModal.customer?.name}</strong></div>
              <div>Product: {reminderModal.productName}</div>
              <div>Pending Amount: <strong className="text-gold">{formatCurrency(reminderModal.remainingAmount || 0)}</strong></div>
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
      <Modal isOpen={!!emailModal} onClose={() => setEmailModal(null)} title={`📧 Send Direct Email to ${emailModal?.customer?.name || 'Customer'}`}>
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
              💡 This message will be styled into a clean DailyMarts HTML template and delivered to <strong>{emailModal.customer?.name || 'Customer'}</strong> via Resend Email API.
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
