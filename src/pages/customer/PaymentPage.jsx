import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { paymentService } from '../../services';
import './PaymentPage.css';

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const billId   = searchParams.get('billId')   || 'BILL-2026-890123';
  const farmerId = searchParams.get('farmerId') || null;

  // Bill data (would be fetched via API in production)
  const [bill] = useState({
    id: billId,
    invoiceNo: 'INV-DM-2026-1001',
    productName: 'Pure Fresh Cow Milk Subscription (1L Daily)',
    totalAmount: 1860,
    paidAmount: 1200,
    remainingAmount: 660,
  });

  // Farmer UPI \u2014 fetched from DB
  const [farmerUpi, setFarmerUpi]   = useState(null);
  const [farmerName, setFarmerName] = useState('');
  const [loadingUpi, setLoadingUpi] = useState(true);
  const [upiError, setUpiError]     = useState(false);

  // Steps: 'qr' \u2192 'confirming' \u2192 'success'
  const [step, setStep]         = useState('qr');
  const [confirming, setConfirming] = useState(false);
  const [savedPaymentId, setSavedPaymentId] = useState(null);

  // Fetch farmer's UPI ID from DB on mount
  useEffect(() => {
    const fetchFarmerUpi = async () => {
      setLoadingUpi(true);
      try {
        if (farmerId) {
          const res = await paymentService.getFarmerUpi(farmerId);
          setFarmerUpi(res.data.data.upiId);
          setFarmerName(res.data.data.farmerName);
        } else {
          // Fallback mock for demo (when no farmerId in URL)
          setFarmerUpi('ravi.dairyfarm@oksbi');
          setFarmerName('Ravi Kumar (Ravi Dairy Farm)');
        }
      } catch {
        setUpiError(true);
        toast.error('Could not load farmer UPI', 'Please try again later.');
      } finally {
        setLoadingUpi(false);
      }
    };
    fetchFarmerUpi();
  }, [farmerId]);

  const upiPaymentString = farmerUpi
    ? `upi://pay?pa=${farmerUpi}&pn=${encodeURIComponent(farmerName)}&am=${bill.remainingAmount}&cu=INR&tn=${encodeURIComponent('DailyMarts ' + bill.invoiceNo)}`
    : '';

  // Customer clicks "I've Paid" \u2014 records PENDING entry, balance NOT changed yet
  const handleIPaid = async () => {
    setConfirming(true);
    try {
      const res = await paymentService.recordPayment({
        billId: bill.id,
        amount: bill.remainingAmount,
      });
      setSavedPaymentId(res.data.data?.payment?.paymentId);
      setStep('success');
      toast.success('Payment Recorded', 'Your payment is recorded. Farmer will confirm receipt.');
    } catch (err) {
      toast.error('Failed', err?.response?.data?.message || 'Could not record payment. Try again.');
    } finally {
      setConfirming(false);
    }
  };

  /* \u2500\u2500\u2500 Loading / Error state \u2500\u2500\u2500 */
  if (loadingUpi) {
    return (
      <CustomerLayout>
        <div className="pay-page">
          <div className="pay-card pay-loading">
            <div className="pay-spinner" />
            <p>Loading payment details\u2026</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (upiError) {
    return (
      <CustomerLayout>
        <div className="pay-page">
          <div className="pay-card" style={{ textAlign: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>\u26a0\ufe0f</div>
            <h2 style={{ color: '#ef4444' }}>Unable to Load Payment</h2>
            <p style={{ color: '#6b7280' }}>Could not retrieve the farmer\u2019s UPI ID. Please contact support.</p>
            <Link to="/customer/bills" className="btn btn-primary">Go Back to Bills</Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  /* \u2500\u2500\u2500 Success Screen \u2500\u2500\u2500 */
  if (step === 'success') {
    return (
      <CustomerLayout>
        <div className="pay-page">
          <div className="pay-success-card">
            <div className="pay-success-icon">\ud83d\udc9a</div>
            <h1 className="pay-success-title">Payment Sent!</h1>
            <p className="pay-success-subtitle">
              Your payment of <strong>{formatCurrency(bill.remainingAmount)}</strong> is recorded.<br />
              <span style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginTop: '0.4rem' }}>
                \ud83d\udca1 The bill balance will be updated once the farmer confirms receipt.
              </span>
            </p>

            <div className="pay-receipt">
              <div className="pay-receipt-row"><span>Invoice</span><strong>#{bill.invoiceNo}</strong></div>
              <div className="pay-receipt-row"><span>Product</span><strong>{bill.productName.split('(')[0].trim()}</strong></div>
              <div className="pay-receipt-row"><span>Paid to (Farmer UPI)</span><strong>{farmerUpi}</strong></div>
              <div className="pay-receipt-row"><span>Amount</span><strong className="pay-amount-green">{formatCurrency(bill.remainingAmount)}</strong></div>
              <div className="pay-receipt-row"><span>Status</span><strong style={{ color: '#f59e0b' }}>\u23f3 Pending Farmer Confirmation</strong></div>
              {savedPaymentId && (
                <div className="pay-receipt-row"><span>Payment Ref</span><strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{savedPaymentId}</strong></div>
              )}
            </div>

            <div className="pay-pending-info">
              \ud83d\udd14 You will be notified once the farmer marks the payment as received and updates your bill.
            </div>

            <div className="pay-actions">
              <Link to="/customer/bills" className="btn btn-primary btn-full">\ud83d\udcc4 View All Bills</Link>
              <Link to="/customer/dashboard" className="btn btn-ghost btn-full">\ud83c\udfe0 Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  /* \u2500\u2500\u2500 QR Code Payment Screen \u2500\u2500\u2500 */
  return (
    <CustomerLayout>
      <div className="pay-page">
        <div className="pay-card">

          {/* Header */}
          <div className="pay-qr-header">
            <div className="pay-qr-icon">\ud83d\udcf2</div>
            <h1 className="pay-qr-title">Scan to Pay via UPI</h1>
            <p className="pay-qr-subtitle">
              Open GPay, PhonePe, Paytm or any UPI app and scan the QR below
            </p>
          </div>

          {/* Farmer UPI destination */}
          <div className="pay-upi-banner">
            <div className="pay-upi-banner-row">
              <span className="pay-upi-label">\ud83c\udf3e Farmer / Payee</span>
              <span className="pay-upi-value">{farmerName}</span>
            </div>
            <div className="pay-upi-banner-row">
              <span className="pay-upi-label">UPI ID (from DB)</span>
              <span className="pay-upi-value">{farmerUpi}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="pay-qr-wrapper">
            <div className="pay-qr-frame">
              <QRCodeSVG
                value={upiPaymentString}
                size={220}
                fgColor="#14532d"
                bgColor="#ffffff"
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="pay-qr-amount-badge">
              <span className="pay-qr-amount-label">Amount Due</span>
              <span className="pay-qr-amount-value">{formatCurrency(bill.remainingAmount)}</span>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="pay-summary">
            <div className="pay-summary-row">
              <span>Invoice</span><strong>#{bill.invoiceNo}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Product</span><strong>{bill.productName.split('(')[0].trim()}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Total Bill</span><strong>{formatCurrency(bill.totalAmount)}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Already Paid</span>
              <span className="text-green font-semibold">{formatCurrency(bill.paidAmount)}</span>
            </div>
            <div className="pay-summary-row pay-summary-row--due">
              <span>Outstanding Due</span>
              <strong className="pay-amount-green">{formatCurrency(bill.remainingAmount)}</strong>
            </div>
          </div>

          <p className="pay-hint">
            \ud83d\udca1 After scanning and paying in your UPI app, tap <strong>"I've Paid"</strong> below.
            The bill balance will update <em>after the farmer confirms receipt</em>.
          </p>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleIPaid}
            disabled={confirming}
          >
            {confirming ? '\u27f3 Recording\u2026' : "\u2705 I\u2019ve Paid \u2014 Confirm Payment"}
          </button>

        </div>
      </div>
    </CustomerLayout>
  );
}
