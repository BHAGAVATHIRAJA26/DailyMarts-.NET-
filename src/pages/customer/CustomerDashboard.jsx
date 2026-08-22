import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CustomerLayout from '../../layouts/CustomerLayout';
import ProductCard from '../../components/products/ProductCard';
import { productService, subscriptionService, paymentService, notificationService } from '../../services';
import { mockProducts, categories } from '../../utils/mockData';
import { formatCurrency, calcBillEstimate } from '../../utils/formatters';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('milk');

  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bills, setBills] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Interactive Live Calculator Widget State
  const [calcVolume, setCalcVolume] = useState(1);
  const [calcFreq, setCalcFreq] = useState('daily');
  const [calcMilkType, setCalcMilkType] = useState('cow');

  const calcPrice = calcMilkType === 'a2' ? 85 : 60;
  const estimatedMonthlyBill = calcBillEstimate(calcPrice, calcVolume, calcFreq, 30);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [prodRes, subRes, billRes, notifRes] = await Promise.allSettled([
        productService.getAll(),
        subscriptionService.getAll(),
        paymentService.getBills(),
        notificationService.getAll(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.data?.data?.length > 0) {
        setProducts(prodRes.value.data.data);
      } else {
        setProducts(mockProducts);
      }

      if (subRes.status === 'fulfilled') {
        setSubscriptions(subRes.value.data?.data || []);
      }
      if (billRes.status === 'fulfilled') {
        setBills(billRes.value.data?.data || []);
      }
      if (notifRes.status === 'fulfilled') {
        const notifs = notifRes.value.data?.data || [];
        setUnreadNotifCount(notifs.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setProducts(mockProducts);
    }
  };

  const filteredProducts = useMemo(() => {
    const list = products.length > 0 ? products : mockProducts;
    if (activeCategory === 'all') return list;
    return list.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      if (activeCategory === 'milk') return cat === 'milk';
      if (activeCategory === 'milk_product') return cat.includes('product') || cat === 'ghee';
      return cat === activeCategory;
    });
  }, [products, activeCategory]);

  const pendingBillTotal = bills.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);

  return (
    <CustomerLayout>
      <div className="customer-dashboard">

        {/* Milk Purity & Delivery Announcement Bar */}
        <div className="milk-purity-bar">
          <div className="purity-item">🥛 <strong>100% Pure Raw Milk</strong></div>
          <span className="dot">•</span>
          <div className="purity-item">❄️ <strong>Chilled to 4°C Immediately</strong></div>
          <span className="dot">•</span>
          <div className="purity-item">🏡 <strong>Direct from Local Farmers</strong></div>
          <span className="dot">•</span>
          <div className="purity-item">🚚 <strong>Delivered Before 7:00 AM Daily</strong></div>
        </div>

        {/* Hero Section */}
        <section className="dashboard-hero">
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-badge">
              <span>🥛 Pure Daily Milk Marketplace</span>
            </div>
            <h1 className="dashboard-hero-title">
              Farm-Fresh Milk & Dairy<br />
              <span className="dashboard-hero-accent">Delivered to Your Door Every Morning</span>
            </h1>
            <p className="dashboard-hero-desc">
              Subscribe to pure unpasteurized cow milk, A2 Gir cow milk, buffalo milk, and traditional bilona ghee directly from verified local dairy farmers.
            </p>
            <div className="dashboard-hero-actions">
              <Link to="/customer/subscriptions/milk" className="btn btn-gold btn-lg" id="explore-milk">
                🥛 Set Up Milk Subscription
              </Link>
              <Link to="/customer/products" className="btn btn-secondary btn-lg">
                🛒 Browse All Products
              </Link>
            </div>

            {/* Quick stats */}
            <div className="dashboard-hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-val">{subscriptions.length}</span>
                <span className="hero-stat-label">Active Milk Subscriptions</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-val">{formatCurrency(pendingBillTotal)}</span>
                <span className="hero-stat-label">Pending Milk Bill</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-val">{unreadNotifCount}</span>
                <span className="hero-stat-label">Notifications</span>
              </div>
            </div>
          </div>

          <div className="dashboard-hero-visual">
            <div className="hero-visual-grid">
              {[
                { emoji: '🥛', label: 'Cow Milk', sub: 'Pure & fresh daily' },
                { emoji: '✨', label: 'A2 Gir Milk', sub: 'Native breed A2' },
                { emoji: '🥛', label: 'Buffalo Milk', sub: 'Rich 7.2% fat' },
                { emoji: '🧈', label: 'Bilona Ghee', sub: 'Wooden churned' },
              ].map((item) => (
                <div key={item.label} className="hero-visual-item hover-scale">
                  <div className="hero-visual-emoji">{item.emoji}</div>
                  <div className="hero-visual-label">{item.label}</div>
                  <div className="hero-visual-sub">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Milk Subscription Estimator Calculator Section */}
        <section className="dashboard-section bg-cream">
          <div className="card milk-calc-card">
            <div className="milk-calc-left">
              <span className="badge badge-paid mb-2">🧮 Instant Milk Estimator</span>
              <h2 className="text-xl font-bold text-primary">Calculate Your Monthly Milk Bill</h2>
              <p className="text-xs text-muted mt-1">Select your daily milk requirements to get a live estimated monthly invoice.</p>

              <div className="milk-calc-controls mt-4">
                <div className="form-group mb-3">
                  <label className="form-label text-xs">Milk Variant</label>
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm ${calcMilkType === 'cow' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCalcMilkType('cow')}
                    >
                      🥛 Pure Cow Milk (₹60/L)
                    </button>
                    <button
                      className={`btn btn-sm ${calcMilkType === 'a2' ? 'btn-gold' : 'btn-secondary'}`}
                      onClick={() => setCalcMilkType('a2')}
                    >
                      ✨ A2 Gir Milk (₹85/L)
                    </button>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label text-xs">Daily Quantity (Liters)</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 1.5, 2, 3].map((v) => (
                      <button
                        key={v}
                        className={`config-preset ${calcVolume === v ? 'active' : ''}`}
                        onClick={() => setCalcVolume(v)}
                      >
                        {v} L
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Delivery Frequency</label>
                  <div className="flex gap-2">
                    {[['daily', 'Every Day (30 days)'], ['weekly', 'Weekly Once (4 days)']].map(([f, label]) => (
                      <button
                        key={f}
                        className={`btn btn-sm ${calcFreq === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCalcFreq(f)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="milk-calc-right">
              <div className="text-xs text-muted uppercase font-bold tracking-wider">Estimated Monthly Invoice</div>
              <div className="calc-total-amount">{formatCurrency(estimatedMonthlyBill)}</div>
              <div className="text-xs text-green font-semibold mt-1">✓ Doorstep Morning Delivery Included</div>
              <div className="text-xs text-muted mt-2">Pause or skip any day anytime with zero cancellation fees.</div>

              <Link to="/customer/subscriptions/milk" className="btn btn-gold btn-full btn-lg mt-4">
                🥛 Start Milk Subscription
              </Link>
            </div>
          </div>
        </section>

        {/* Active Subscriptions Strip */}
        {subscriptions.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">🥛 Active Daily Subscriptions</h2>
                <p className="section-subtitle">Your active recurring daily milk deliveries</p>
              </div>
              <Link to="/customer/subscriptions" className="btn btn-secondary btn-sm">View All Subscriptions</Link>
            </div>
            <div className="active-orders-strip">
              {subscriptions.map((sub) => {
                const productName = sub.product?.name || 'Milk Subscription';
                const productEmoji = sub.product?.emoji || '🥛';
                const farmerName = sub.farmer?.farmName || sub.farmer?.name || 'Local Farmer';
                const price = sub.pricePerUnit || sub.product?.price || 60;
                const unit = sub.unit || sub.product?.unit || 'L';

                return (
                  <div key={sub._id || sub.subscriptionId} className="active-order-card">
                    <div className="active-order-emoji">{productEmoji}</div>
                    <div className="active-order-info">
                      <div className="active-order-name">{productName}</div>
                      <div className="active-order-meta">{sub.quantity} {unit} · {sub.frequency} · {farmerName}</div>
                      <div className="active-order-delivery">
                        Delivery Slot: <strong>{sub.deliverySlot || 'MORNING'}</strong>
                      </div>
                    </div>
                    <div className="active-order-right">
                      <div className="active-order-amount">{formatCurrency(price * sub.quantity)}/day</div>
                      <span className="badge badge-active">{sub.status || 'ACTIVE'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Explore Fresh Categories</h2>
              <p className="section-subtitle">Select a category to view fresh available items today</p>
            </div>
          </div>
          <div className="category-strip">
            <button
              className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              🌾 All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {activeCategory === 'milk' ? '🥛 Fresh Farm Milk & Dairy Today' : 'Today\'s Fresh Harvest'}
              </h2>
              <p className="section-subtitle">Chilled and packed fresh from local farmers</p>
            </div>
            <Link to="/customer/products" className="btn btn-secondary btn-sm">View Full Catalog →</Link>
          </div>
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product._id || product.productId || product.id} product={product} />
            ))}
          </div>
        </section>

      </div>
    </CustomerLayout>
  );
}
