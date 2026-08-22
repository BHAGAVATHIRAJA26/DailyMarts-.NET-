import { useState, useEffect } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { farmerService } from '../../services';
import './FarmerExchangePage.css';

export default function FarmerExchangePage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Request Form State
  const [requestMode, setRequestMode] = useState('exchange');
  const [newRequest, setNewRequest] = useState({
    product: 'Pure Fresh Cow Milk',
    quantity: 5,
    unit: 'L',
    offeredProduct: '1 Jar (500g) Bilona Ghee',
    offeredAmount: 300,
    notes: '',
  });

  useEffect(() => {
    fetchExchangeRequests();
  }, []);

  const fetchExchangeRequests = async () => {
    try {
      setLoading(true);
      const res = await farmerService.getExchangeRequests();
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load exchange requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = (req) => {
    setSelectedRequest(req);
  };

  const handleConfirmAccept = async () => {
    if (!selectedRequest) return;
    try {
      await farmerService.acceptExchange(selectedRequest._id || selectedRequest.id);
      toast.success(
        'Transaction Confirmed!',
        selectedRequest.type === 'paid'
          ? `Agreed to supply ${selectedRequest.requiredQty} ${selectedRequest.unit} for ${formatCurrency(selectedRequest.requiredQty * (selectedRequest.pricePerUnit || 60))}.`
          : `Agreed to swap ${selectedRequest.product} for ${selectedRequest.offeredProduct}.`
      );
      fetchExchangeRequests();
    } catch (err) {
      toast.error('Action Failed', err.response?.data?.message || err.message);
    } finally {
      setSelectedRequest(null);
    }
  };

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await farmerService.raiseExchange({
        type: requestMode,
        product: newRequest.product,
        requiredQty: newRequest.quantity,
        unit: newRequest.unit,
        offeredProduct: requestMode === 'exchange' ? newRequest.offeredProduct : null,
        offeredAmount: requestMode === 'paid' ? newRequest.offeredAmount : null,
        notes: newRequest.notes,
      });

      toast.success('Request Published', `Your ${requestMode === 'paid' ? 'Paid Supply' : 'Product Exchange'} request is now live for nearby farmers.`);
      setIsRaiseOpen(false);
      fetchExchangeRequests();
    } catch (err) {
      toast.error('Failed to Raise Request', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FarmerLayout>
      <div className="page-container">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🤝 Nearby Farmer Product Exchange & Supply</h1>
            <p className="section-subtitle">Request product supply from neighboring farmers by paying money or swapping products</p>
          </div>
          <button className="btn btn-gold" onClick={() => setIsRaiseOpen(true)}>
            + Raise Exchange / Paid Request
          </button>
        </div>

        {/* Transaction Type Summary Ribbon */}
        <div className="grid grid-2 gap-4 mb-8">
          <div className="card p-4 bg-green-50 border-green flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              <div className="font-bold text-sm text-green">Option 1: Product Barter Swap</div>
              <div className="text-xs text-muted">Exchange excess milk for ghee, paneer, vegetables, or chicken without cash.</div>
            </div>
          </div>

          <div className="card p-4 bg-gold-100 border-gold flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <div className="font-bold text-sm text-earth">Option 2: Direct Paid Purchase</div>
              <div className="text-xs text-muted">Buy required product from nearby farmer at wholesale price with instant UPI pay.</div>
            </div>
          </div>
        </div>

        {/* Nearby Requests List */}
        <h2 className="text-lg font-bold mb-4">Active Nearby Requests ({requests.length})</h2>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading nearby farmer exchange requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">🤝</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Active Exchange Requests</div>
            <div className="empty-state-desc text-muted mb-4">Click "+ Raise Exchange / Paid Request" to swap excess milk or request products from neighboring dairy farmers.</div>
            <button className="btn btn-gold" onClick={() => setIsRaiseOpen(true)}>
              + Raise First Request
            </button>
          </div>
        ) : (
          <div className="grid grid-2 gap-6">
            {requests.map((req) => {
              const reqId = req._id || req.id;
              const farmerName = req.farmer?.name || req.farmerName || 'Nearby Farmer';
              const farmName = req.farmer?.farmName || req.farmName || 'Local Dairy';

              return (
                <div key={reqId} className="card p-6 flex flex-col justify-between hover-lift">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-md avatar-green">{farmerName.charAt(0)}</div>
                        <div>
                          <div className="font-bold text-base text-primary">{farmerName}</div>
                          <div className="text-xs text-muted">🏡 {farmName}</div>
                        </div>
                      </div>

                      <span className={`badge ${req.type === 'paid' ? 'badge-pending' : 'badge-active'}`}>
                        {req.type === 'paid' ? '💰 Paid Purchase' : '🔄 Product Swap'}
                      </span>
                    </div>

                    <div className="bg-cream p-4 rounded-lg mb-3 border border-light">
                      <div className="text-xs text-muted font-bold uppercase">Requested Product</div>
                      <div className="text-base font-bold text-primary mt-1">
                        {req.product} — <span className="text-green">{req.requiredQty || req.quantity} {req.unit || 'L'}</span>
                      </div>

                      <div className="divider" style={{ margin: '8px 0' }} />

                      {req.type === 'paid' ? (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted">Offered Payment:</span>
                          <strong className="text-sm text-gold">
                            {formatCurrency(req.offeredAmount || (req.requiredQty * (req.pricePerUnit || 60)))}
                          </strong>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted">Offered Product Swap:</span>
                          <strong className="text-sm text-green">🎁 {req.offeredProduct}</strong>
                        </div>
                      )}

                      {req.notes && <div className="text-xs text-muted mt-2 italic">"{req.notes}"</div>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-light mt-2">
                    <span className="text-xs text-muted">Status: <strong className="uppercase">{req.status || 'OPEN'}</strong></span>
                    {req.status === 'open' || req.status === 'OPEN' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => handleAcceptRequest(req)}>
                        {req.type === 'paid' ? '💵 Sell & Collect Payment' : '🔄 Swap Product'}
                      </button>
                    ) : (
                      <span className="badge badge-paid">✓ Transaction Confirmed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Raise Request Modal */}
      <Modal isOpen={isRaiseOpen} onClose={() => setIsRaiseOpen(false)} title="Raise Farmer Product Request">
        <form onSubmit={handleRaiseSubmit} className="flex flex-col gap-4">
          
          {/* Mode Selector */}
          <div className="form-group">
            <label className="form-label font-bold">Select Transaction Mode</label>
            <div className="grid grid-2 gap-3">
              <button
                type="button"
                className={`config-option ${requestMode === 'exchange' ? 'active' : ''}`}
                onClick={() => setRequestMode('exchange')}
              >
                <div className="font-bold">🔄 Product Exchange (Swap)</div>
                <div className="config-option-sub">Swap products directly without cash</div>
              </button>

              <button
                type="button"
                className={`config-option ${requestMode === 'paid' ? 'active' : ''}`}
                onClick={() => setRequestMode('paid')}
              >
                <div className="font-bold">💰 Paid Purchase</div>
                <div className="config-option-sub">Buy product by paying agreed amount</div>
              </button>
            </div>
          </div>

          {/* Requested Product */}
          <div className="form-group">
            <label className="form-label font-bold">Product Needed</label>
            <select className="form-select" value={newRequest.product} onChange={(e) => setNewRequest({ ...newRequest, product: e.target.value })}>
              <option>Pure Fresh Cow Milk</option>
              <option>A2 Native Gir Cow Milk</option>
              <option>Creamy Buffalo Milk</option>
              <option>Traditional Bilona Ghee</option>
              <option>Fresh Farm Paneer</option>
              <option>Thick Matka Curd</option>
              <option>Organic Tomatoes</option>
            </select>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Quantity Needed</label>
              <input type="number" className="form-input" value={newRequest.quantity} onChange={(e) => setNewRequest({ ...newRequest, quantity: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label font-bold">Unit</label>
              <input type="text" className="form-input" value={newRequest.unit} onChange={(e) => setNewRequest({ ...newRequest, unit: e.target.value })} />
            </div>
          </div>

          {/* Conditional Mode Inputs */}
          {requestMode === 'exchange' ? (
            <div className="form-group bg-green-50 p-4 rounded-lg border border-green">
              <label className="form-label font-bold text-green">Product Offered in Exchange</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1 Jar (500g) Bilona Ghee or 3kg Organic Tomatoes"
                value={newRequest.offeredProduct}
                onChange={(e) => setNewRequest({ ...newRequest, offeredProduct: e.target.value })}
              />
              <span className="text-xs text-muted mt-1">Specify what item you will give to the nearby farmer in return.</span>
            </div>
          ) : (
            <div className="form-group bg-gold-100 p-4 rounded-lg border border-gold">
              <label className="form-label font-bold text-earth">Total Offered Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 300"
                value={newRequest.offeredAmount}
                onChange={(e) => setNewRequest({ ...newRequest, offeredAmount: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea className="form-textarea" placeholder="Explain urgency or preferred pickup time..." value={newRequest.notes} onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })} rows={2} />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setIsRaiseOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? 'Publishing...' : requestMode === 'exchange' ? '🔄 Post Product Exchange' : '💰 Post Paid Purchase Request'}
            </button>
          </div>

        </form>
      </Modal>

      {/* Accept Confirmation Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Confirm Farmer Transaction">
        {selectedRequest && (
          <div className="flex flex-col gap-4">
            <div className="bg-cream p-4 rounded-lg">
              <div className="text-xs text-muted uppercase font-bold">Request Details</div>
              <div className="text-lg font-bold text-primary mt-1">{selectedRequest.product}</div>
              <div className="text-sm text-secondary">Farmer: {selectedRequest.farmer?.name || selectedRequest.farmerName}</div>
              <div className="text-sm text-green font-bold mt-2">Quantity: {selectedRequest.requiredQty || selectedRequest.quantity} {selectedRequest.unit || 'L'}</div>

              <div className="divider" />

              {selectedRequest.type === 'paid' ? (
                <div>
                  <div className="text-xs text-muted">You will receive:</div>
                  <div className="text-xl font-extrabold text-gold">
                    {formatCurrency(selectedRequest.offeredAmount || ((selectedRequest.requiredQty || 1) * 60))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted">You will receive in return:</div>
                  <div className="text-lg font-extrabold text-green">
                    🎁 {selectedRequest.offeredProduct}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button className="btn btn-ghost" onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmAccept}>
                {selectedRequest.type === 'paid' ? 'Confirm & Collect Cash/UPI' : 'Confirm Product Swap'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </FarmerLayout>
  );
}
