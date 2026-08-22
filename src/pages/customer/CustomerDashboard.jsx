import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CustomerLayout from '../../layouts/CustomerLayout';
import ProductCard from '../../components/products/ProductCard';
import { mockProducts, mockOrders, mockNotifications, categories } from '../../utils/mockData';
import { formatCurrency, formatDate, calcBillEstimate } from '../../utils/formatters';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('milk');

  // Interactive Live Calculator Widget State
  const [calcVolume, setCalcVolume] = useState(1);
  const [calcFreq, setCalcFreq] = useState('daily');
  const [calcMilkType, setCalcMilkType] = useState('cow'); // 'cow' or 'a2'

  const calcPrice = calcMilkType === 'a2' ? 85 : 60;
  const estimatedMonthlyBill = calcBillEstimate(calcPrice, calcVolume, calcFreq, 30);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return mockProducts;
    return mockProducts.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const activeMilkOrders = mockOrders.filter((o) => o.orderStatus === 'active');
  const unreadNotifs = mockNotifications.filter((n) => !n.read).length;

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

            {/* Live Delivery Status Tracker Widget */}
            <div className="milk-live-tracker card">
              <div className="tracker-header">
                <span className="tracker-dot-pulsing" />
                <span className="font-bold text-xs uppercase tracking-wider text-green">Today's Morning Delivery Status</span>
              </div>
              <div className="tracker-body flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚚</span>
                  <div>
                    <div className="font-bold text-sm text-primary">1L Pure Fresh Cow Milk</div>
                    <div className="text-xs text-muted">Dispatched from Ravi Dairy Farm</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="badge badge-active">On the Way</div>
                  <div className="text-xs font-bold text-green mt-1">ETA: 6:30 AM</div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="dashboard-hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-val">{activeMilkOrders.length}</span>
                <span className="hero-stat-label">Active Milk Subscriptions</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-val">₹{mockOrders.reduce((s, o) => s + o.remainingAmount, 0).toLocaleString('en-IN')}</span>
                <span className="hero-stat-label">Pending Milk Bill</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-val">{unreadNotifs}</span>
                <span className="hero-stat-label">Delivery Notifications</span>
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
        {activeMilkOrders.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">🥛 Active Daily Subscriptions</h2>
                <p className="section-subtitle">Your active recurring daily milk deliveries</p>
              </div>
              <Link to="/customer/orders" className="btn btn-secondary btn-sm">View All Subscriptions</Link>
            </div>
            <div className="active-orders-strip">
              {activeMilkOrders.map((order) => (
                <div key={order.id} className="active-order-card">
                  <div className="active-order-emoji">{order.productEmoji}</div>
                  <div className="active-order-info">
                    <div className="active-order-name">{order.productName}</div>
                    <div className="active-order-meta">{order.quantity} {order.unit} · {order.frequency} · {order.farmerName}</div>
                    <div className="active-order-delivery">
                      Next Delivery: <strong>{order.nextDelivery}</strong>
                    </div>
                  </div>
                  <div className="active-order-right">
                    <div className="active-order-amount">{formatCurrency(order.pricePerUnit * order.quantity)}/day</div>
                    <span className="badge badge-active">Active</span>
                  </div>
                </div>
              ))}
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

      </div>
    </CustomerLayout>
  );
}
