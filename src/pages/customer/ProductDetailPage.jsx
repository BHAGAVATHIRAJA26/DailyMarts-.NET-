import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockProducts } from '../../utils/mockData';
import { formatCurrency, calcBillEstimate, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import './ProductDetailPage.css';

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', icon: '📅' },
  { id: 'weekly', label: 'Weekly', icon: '📆' },
  { id: 'monthly', label: 'Monthly (once)', icon: '🗓️' },
];

const DELIVERY_TIMES = [
  { id: 'morning', label: 'Morning', icon: '🌅', time: '6 - 9 AM' },
  { id: 'evening', label: 'Evening', icon: '🌇', time: '4 - 7 PM' },
  { id: 'morning-evening', label: 'Both', icon: '☀️', time: 'AM + PM' },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const product = mockProducts.find((p) => p.id === id) || mockProducts[0];

  const [qty, setQty] = useState(1);
  const [frequency, setFrequency] = useState('daily');
  const [deliveryTime, setDeliveryTime] = useState('morning');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const estimate = calcBillEstimate(product.price, qty, frequency, duration);
  const isMilk = product.category === 'milk';

  const handleOrder = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Order Placed!', `Your ${product.name} order has been confirmed.`);
    setLoading(false);
    navigate('/customer/orders');
  };

  const statusClass = getStatusBadgeClass(product.status);
  const isSoldOut = product.status === 'sold-out';

  return (
    <CustomerLayout>
      <div className="product-detail-page">
        {/* Breadcrumb */}
        <div className="product-detail-breadcrumb">
          <Link to="/customer/products">Products</Link>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-layout">
          {/* Left: Image + Info */}
          <div className="product-detail-left">
            <div className="product-detail-img-card">
              <div className="product-detail-emoji">{product.emoji}</div>
              {product.isOrganic && (
                <div className="product-detail-organic">🌿 Certified Organic</div>
              )}
            </div>

            {/* Product info */}
            <div className="product-detail-info card">
              <div className="card-body">
                <div className="product-detail-id">Product ID: {product.id}</div>
                <h1 className="product-detail-name">{product.name}</h1>

                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className={`badge ${statusClass}`}>{formatStatus(product.status)}</span>
                  {product.isOrganic && <span className="badge badge-paid">Organic</span>}
                </div>

                {product.rating && (
                  <div className="product-detail-rating">
                    <span style={{ color: 'var(--gold-500)', fontSize: '16px', letterSpacing: '-1px' }}>
                      {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
                    </span>
                    <span className="text-sm font-semibold">{product.rating}</span>
                    <span className="text-muted text-sm">({product.reviewCount} reviews)</span>
                  </div>
                )}

                <p className="product-detail-desc">{product.description}</p>

                {/* Farmer */}
                <div className="product-detail-farmer-card">
                  <div className="avatar avatar-md avatar-green" style={{ fontSize: '20px' }}>
                    {product.farmerName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{product.farmerName}</div>
                    <div className="text-xs text-muted">{product.farmName} · 📍 {product.location}</div>
                  </div>
                  <span className="badge badge-paid" style={{ marginLeft: 'auto' }}>✓ Verified</span>
                </div>

                {/* Capacity */}
                <div className="product-detail-capacity">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Today's Availability</span>
                    <span className="font-semibold text-green">{product.availableCapacity} {product.unit} remaining</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round(product.soldCapacity / product.totalCapacity * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>Sold: {product.soldCapacity} {product.unit}</span>
                    <span>Total: {product.totalCapacity} {product.unit}</span>
                  </div>
                </div>

                <div className="product-detail-price">
                  <span className="product-detail-price-val">{formatCurrency(product.price)}</span>
                  <span className="text-muted">/{product.unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order configurator */}
          <div className="product-detail-right">
            <div className="order-configurator card">
              <div className="card-header">
                <h2 className="text-lg font-bold">{isMilk ? 'Milk Subscription' : 'Place Order'}</h2>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Quantity */}
                <div className="config-section">
                  <div className="config-label">Quantity ({product.unit})</div>
                  <div className="qty-selector">
                    <button className="qty-btn" onClick={() => setQty(Math.max(0.5, qty - (isMilk ? 0.5 : 1)))}>−</button>
                    <span className="qty-val">{qty} {product.unit}</span>
                    <button className="qty-btn" onClick={() => setQty(Math.min(product.availableCapacity, qty + (isMilk ? 0.5 : 1)))}>+</button>
                  </div>
                  {isMilk && (
                    <div className="config-presets">
                      {[0.5, 1, 1.5, 2].map((v) => (
                        <button key={v} className={`config-preset ${qty === v ? 'active' : ''}`} onClick={() => setQty(v)}>
                          {v} L
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Frequency */}
                <div className="config-section">
                  <div className="config-label">Frequency</div>
                  <div className="config-options">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.id}
                        className={`config-option ${frequency === f.id ? 'active' : ''}`}
                        onClick={() => setFrequency(f.id)}
                      >
                        {f.icon} {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery time (milk only) */}
                {isMilk && (
                  <div className="config-section">
                    <div className="config-label">Delivery Time</div>
                    <div className="config-options">
                      {DELIVERY_TIMES.map((t) => (
                        <button
                          key={t.id}
                          className={`config-option ${deliveryTime === t.id ? 'active' : ''}`}
                          onClick={() => setDeliveryTime(t.id)}
                        >
                          {t.icon} {t.label}
                          <span className="config-option-sub">{t.time}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start date */}
                <div className="config-section">
                  <div className="config-label">Start Date</div>
                  <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} id="start-date" />
                </div>

                {/* Duration (for recurring) */}
                {frequency !== 'once' && (
                  <div className="config-section">
                    <div className="config-label">Duration</div>
                    <div className="config-options">
                      {[15, 30, 60, 90].map((d) => (
                        <button key={d} className={`config-option ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>
                          {d} days
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estimate */}
                <div className="bill-estimate">
                  <div className="bill-estimate-title">Estimated Bill</div>
                  <div className="bill-estimate-row">
                    <span>{qty} {product.unit} × {formatCurrency(product.price)}</span>
                    <span>{frequency === 'daily' ? `× ${duration} days` : ''}</span>
                  </div>
                  <div className="bill-estimate-total">
                    <span>Total Estimate</span>
                    <span className="bill-estimate-amount">{formatCurrency(estimate)}</span>
                  </div>
                  <div className="bill-estimate-note">Final bill based on actual supply</div>
                </div>

                <button
                  className="btn btn-primary btn-full btn-lg"
                  onClick={handleOrder}
                  disabled={isSoldOut || loading}
                  id="place-order-btn"
                >
                  {loading ? '⟳ Placing Order…' : isSoldOut ? 'Currently Sold Out' : isMilk ? '🥛 Subscribe Now' : '🛒 Place Order'}
                </button>

                {!isSoldOut && (
                  <Link to="/customer/subscriptions/milk" className="btn btn-secondary btn-full">
                    View Milk Subscription Wizard →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
