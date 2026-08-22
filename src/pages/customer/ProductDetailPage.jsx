import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { productService, orderService, subscriptionService } from '../../services';
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

  const [product, setProduct] = useState(null);
  const [fetchingProduct, setFetchingProduct] = useState(true);
  const [qty, setQty] = useState(1);
  const [frequency, setFrequency] = useState('daily');
  const [deliveryTime, setDeliveryTime] = useState('morning');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  const fetchProductDetail = async () => {
    try {
      setFetchingProduct(true);
      const res = await productService.getById(id);
      if (res.data?.data) {
        setProduct(res.data.data);
      } else {
        const mock = mockProducts.find((p) => p.id === id || p.productId === id) || mockProducts[0];
        setProduct(mock);
      }
    } catch (err) {
      console.error('Failed to fetch product detail from backend:', err);
      const mock = mockProducts.find((p) => p.id === id || p.productId === id) || mockProducts[0];
      setProduct(mock);
    } finally {
      setFetchingProduct(false);
    }
  };

  if (fetchingProduct) {
    return (
      <CustomerLayout>
        <div className="product-detail-page p-8 text-center">
          <div className="animate-spin text-3xl mb-2">🔄</div>
          <p className="text-muted">Loading product details...</p>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) return null;

  const estimate = calcBillEstimate(product.price, qty, frequency, duration);
  const isMilk = (product.category || '').toUpperCase().includes('MILK');
  const farmerName = product.farmer?.farmName || product.farmer?.name || product.farmerName || 'Local Farmer';
  const locationName = product.farmer?.city || product.location || 'Dindigul';
  const unit = product.unit || 'L';
  const availCap = product.availableCapacity || 50;

  const handleOrder = async () => {
    try {
      setLoading(true);
      if (frequency === 'monthly' || frequency === 'once') {
        // One-time order
        await orderService.create({
          productId: product._id || product.productId || product.id,
          quantity: qty,
          deliverySlot: deliveryTime.toUpperCase(),
          deliveryDate: startDate,
        });
        toast.success('Order Placed!', `Your ${product.name} order has been confirmed.`);
        navigate('/customer/orders');
      } else {
        // Recurring subscription
        await subscriptionService.create({
          productId: product._id || product.productId || product.id,
          quantity: qty,
          frequency: frequency.toUpperCase(),
          deliverySlot: deliveryTime.toUpperCase(),
          startDate,
          durationDays: duration,
        });
        toast.success('Subscription Created!', `Your recurring subscription for ${product.name} has been set up.`);
        navigate('/customer/subscriptions');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      toast.error('Order Failed', err.response?.data?.message || err.message || 'Could not place order');
    } finally {
      setLoading(false);
    }
  };

  const statusClass = getStatusBadgeClass(product.status || 'available');
  const isSoldOut = product.status === 'sold-out' || product.status === 'SOLD_OUT';

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
              <div className="product-detail-emoji">{product.emoji || '🥛'}</div>
              {product.isOrganic && (
                <div className="product-detail-organic">🌿 Certified Organic</div>
              )}
            </div>

            {/* Product info */}
            <div className="product-detail-info card">
              <div className="card-body">
                <div className="product-detail-id">Product ID: #{product.productId || product.id}</div>
                <h1 className="product-detail-name">{product.name}</h1>

                <div className="flex items-center gap-2 mt-2 mb-3">
                  <span className={`badge ${statusClass}`}>{formatStatus(product.status || 'AVAILABLE')}</span>
                  {product.isOrganic && <span className="badge badge-paid">Organic</span>}
                  {product.isA2 && <span className="badge badge-paid">A2 Pure</span>}
                </div>

                {product.rating && (
                  <div className="product-detail-rating">
                    <span style={{ color: 'var(--gold-500)', fontSize: '16px', letterSpacing: '-1px' }}>
                      {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
                    </span>
                    <span className="text-sm font-semibold">{product.rating}</span>
                    <span className="text-muted text-sm">({product.reviewCount || 50} reviews)</span>
                  </div>
                )}

                <p className="product-detail-desc">{product.description || 'Fresh pure farm product directly from trusted local farmers.'}</p>

                {/* Farmer */}
                <div className="product-detail-farmer-card">
                  <div className="avatar avatar-md avatar-green" style={{ fontSize: '20px' }}>
                    {farmerName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{farmerName}</div>
                    <div className="text-xs text-muted">📍 {locationName}</div>
                  </div>
                  <span className="badge badge-paid" style={{ marginLeft: 'auto' }}>✓ Verified Farmer</span>
                </div>

                {/* Capacity */}
                <div className="product-detail-capacity">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Today's Availability</span>
                    <span className="font-semibold text-green">{availCap} {unit} remaining</span>
                  </div>
                </div>

                <div className="product-detail-price">
                  <span className="product-detail-price-val">{formatCurrency(product.price)}</span>
                  <span className="text-muted">/{unit}</span>
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
                  <div className="config-label">Quantity ({unit})</div>
                  <div className="qty-selector">
                    <button className="qty-btn" onClick={() => setQty(Math.max(0.5, qty - (isMilk ? 0.5 : 1)))}>−</button>
                    <span className="qty-val">{qty} {unit}</span>
                    <button className="qty-btn" onClick={() => setQty(Math.min(availCap, qty + (isMilk ? 0.5 : 1)))}>+</button>
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
                {frequency !== 'monthly' && frequency !== 'once' && (
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
                    <span>{qty} {unit} × {formatCurrency(product.price)}</span>
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
                  {loading ? '⟳ Processing Order…' : isSoldOut ? 'Currently Sold Out' : isMilk ? '🥛 Subscribe Now' : '🛒 Place Order'}
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
