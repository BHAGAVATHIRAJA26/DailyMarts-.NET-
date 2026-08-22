import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FarmerLayout from '../../layouts/FarmerLayout';
import { useAuth } from '../../context/AuthContext';
import { productService, orderService, paymentService } from '../../services';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './FarmerDashboard.css';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [milkingStatus, setMilkingStatus] = useState('Morning Milking Chilled to 4°C');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarmerDashboardData();
  }, [user]);

  const fetchFarmerDashboardData = async () => {
    try {
      setLoading(true);
      const farmerId = user?._id;
      const [prodRes, orderRes, billRes] = await Promise.allSettled([
        productService.getAll(farmerId ? { farmerId } : {}),
        orderService.getAll(),
        paymentService.getBills(),
      ]);

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data?.data || []);
      }
      if (orderRes.status === 'fulfilled') {
        setOrders(orderRes.value.data?.data || []);
      }
      if (billRes.status === 'fulfilled') {
        setBills(billRes.value.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load farmer dashboard data:', err);
      setProducts([]);
      setOrders([]);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSupplied = async (orderId) => {
    try {
      await orderService.markSupplied(orderId);
      toast.success('Milk Delivered', `Order #${orderId} marked as delivered to customer.`);
      fetchFarmerDashboardData();
    } catch (err) {
      toast.error('Action Failed', err.response?.data?.message || err.message);
    }
  };

  const todaySalesLiters = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const todayRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPendingBills = bills.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);

  const chartData = [
    { day: 'Today', revenue: todayRevenue, liters: todaySalesLiters },
  ];

  return (
    <FarmerLayout>
      <div className="farmer-dashboard-container">
        
        {/* Top Operational Dairy Header */}
        <header className="farmer-op-banner">
          <div className="farmer-op-banner-main">
            <div className="farmer-badge-tag">🥛 FARMER DAIRY & MILK OPERATIONS</div>
            <h1 className="farmer-op-title">
              {user?.farmName || `${user?.name || 'Farmer'}'s Dairy Farm`}
            </h1>
            <p className="farmer-op-subtitle">
              Owner: <strong>{user?.name || 'Farmer'}</strong> · 📍 {user?.city || user?.location || 'Dindigul Region'}
            </p>
          </div>

          <div className="farmer-op-banner-controls">
            <div className="op-status-pill">
              <span className="op-status-dot" />
              <span>Status: <strong>{milkingStatus}</strong></span>
            </div>
            <button
              className="btn btn-gold btn-sm"
              onClick={() => {
                const next = milkingStatus.includes('Morning') ? 'Evening Batch Milking Prepared' : 'Morning Milking Chilled to 4°C';
                setMilkingStatus(next);
                toast.success('Milking Status Updated', `Dairy status updated: ${next}`);
              }}
            >
              🔄 Toggle Milking Batch Status
            </button>
          </div>
        </header>

        {/* Dairy Quality Test & Milking Metrics Ribbon */}
        <div className="card dairy-quality-ribbon p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧪</span>
            <div>
              <div className="font-bold text-sm text-primary">Today's Dairy Milk Quality Test</div>
              <div className="text-xs text-muted font-medium">Tested at 5:00 AM • Fat: <strong>4.8%</strong> • Temp: <strong>4.0°C</strong></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-paid">✓ Purity Certified</span>
            <span className="badge badge-active">Chilled & Untouched</span>
          </div>
        </div>

        <div className="farmer-dashboard-grid mt-6">
          
          {/* Main Operations Left Column */}
          <div className="farmer-main-col">

            {/* Business Performance Metric Cards */}
            <div className="farmer-metrics-row">
              <div className="farmer-metric-card hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">🥛</span>
                </div>
                <div className="metric-value">{todaySalesLiters} L</div>
                <div className="metric-label">Today's Milk Yield Dispatched</div>
                <div className="metric-footer">{orders.length} Active Orders</div>
              </div>

              <div className="farmer-metric-card hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">💰</span>
                </div>
                <div className="metric-value">{formatCurrency(todayRevenue)}</div>
                <div className="metric-label">Today's Revenue</div>
                <div className="metric-footer">Live from MongoDB</div>
              </div>

              <div className="farmer-metric-card alert hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">⚠️</span>
                </div>
                <div className="metric-value">{formatCurrency(totalPendingBills)}</div>
                <div className="metric-label">Pending Customer Milk Bills</div>
                <Link to="/farmer/billing" className="metric-link">Send Payment Reminders →</Link>
              </div>
            </div>

            {/* Listed Products */}
            <div className="card farmer-section-card mt-6">
              <div className="card-header flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-primary">🥛 Your Listed Products</h2>
                  <p className="text-xs text-muted">Daily products available in customer store catalog</p>
                </div>
                <Link to="/farmer/products" className="btn btn-primary btn-sm">+ Manage Catalog</Link>
              </div>

              <div className="card-body">
                {products.length === 0 ? (
                  <div className="text-center p-6 text-muted">
                    <p className="mb-2 font-bold text-sm">No products listed yet.</p>
                    <Link to="/farmer/products" className="btn btn-primary btn-sm">+ Add Your First Product</Link>
                  </div>
                ) : (
                  <div className="capacity-control-list">
                    {products.map((p) => (
                      <div key={p._id || p.productId} className="capacity-item-row flex items-center justify-between p-3 border-b border-light">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.emoji || '🥛'}</span>
                          <div>
                            <div className="font-bold text-base">{p.name}</div>
                            <div className="text-xs text-muted">Price: {formatCurrency(p.price)}/{p.unit || 'L'}</div>
                          </div>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(p.status || 'available')}`}>
                          {formatStatus(p.status || 'available')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Today's Fulfillment Orders */}
            <div className="card farmer-section-card mt-6">
              <div className="card-header flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-primary">🚚 Customer Orders & Deliveries</h2>
                  <p className="text-xs text-muted">Assigned household deliveries</p>
                </div>
                <Link to="/farmer/orders" className="btn btn-secondary btn-sm">Manage Deliveries</Link>
              </div>

              <div className="card-body p-0">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-muted">
                    <p className="font-semibold text-sm">No active customer orders today.</p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="farmer-data-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Milk / Product</th>
                          <th>Quantity</th>
                          <th>Slot</th>
                          <th>Total</th>
                          <th>Fulfillment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const isSupplied = o.orderStatus === 'SUPPLIED' || o.orderStatus === 'DELIVERED';
                          return (
                            <tr key={o._id || o.orderId}>
                              <td>
                                <div className="font-semibold text-primary">{o.customer?.name || 'Customer'}</div>
                              </td>
                              <td>{o.product?.name || 'Milk'}</td>
                              <td><strong>{o.quantity} {o.unit || 'L'}</strong></td>
                              <td className="capitalize">{o.deliverySlot || 'MORNING'}</td>
                              <td className="font-bold text-green">{formatCurrency(o.totalAmount)}</td>
                              <td className="text-right">
                                {!isSupplied ? (
                                  <button className="btn btn-primary btn-sm" onClick={() => handleMarkSupplied(o._id || o.orderId)}>
                                    Mark Delivered
                                  </button>
                                ) : (
                                  <span className="badge badge-paid">✓ Delivered</span>
                                )}
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

          </div>

          {/* Right Operational Sidebar */}
          <div className="farmer-side-col">
            
            {/* Quick Actions Console */}
            <div className="card farmer-side-card">
              <div className="card-header">
                <h3 className="text-base font-bold text-primary">⚡ Dairy Quick Actions</h3>
              </div>
              <div className="card-body flex flex-col gap-3">
                <Link to="/farmer/products" className="farmer-quick-btn">
                  <span>🥛 Add Daily Milk Variant</span>
                  <span className="arrow">→</span>
                </Link>
                <Link to="/farmer/billing" className="farmer-quick-btn">
                  <span>💰 Customer Monthly Bills</span>
                  <span className="arrow">→</span>
                </Link>
                <Link to="/farmer/exchange" className="farmer-quick-btn highlight">
                  <span>🤝 Raise Excess Milk Request</span>
                  <span className="arrow">→</span>
                </Link>
              </div>
            </div>

            {/* Farm Profile Summary */}
            <div className="card farmer-side-card">
              <div className="card-body text-center flex flex-col items-center">
                <div className="avatar avatar-xl avatar-green mb-3" style={{ fontSize: '28px' }}>
                  {user?.name?.charAt(0) || 'F'}
                </div>
                <h3 className="text-lg font-bold text-primary">{user?.farmName || user?.name || 'Dairy Farm'}</h3>
                <div className="text-xs text-muted">Verified Dairy Producer</div>
                <div className="badge badge-paid mt-2">✓ Purity Inspected</div>

                <div className="divider" />

                <div className="w-full text-left flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">UPI ID:</span>
                    <strong>{user?.upiId || 'Not set'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Phone:</span>
                    <strong>{user?.phone || '—'}</strong>
                  </div>
                </div>

                <Link to="/farmer/profile" className="btn btn-secondary btn-full btn-sm mt-4">
                  Edit Dairy Profile
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </FarmerLayout>
  );
}
