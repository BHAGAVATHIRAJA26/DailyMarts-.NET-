import { useState } from 'react';
import { Link } from 'react-router-dom';
import FarmerLayout from '../../layouts/FarmerLayout';
import { useAuth } from '../../context/AuthContext';
import { mockFarmerStats, mockFarmerOrders, mockFarmerProducts, mockExchangeRequests } from '../../utils/mockData';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './FarmerDashboard.css';

const salesChartData = [
  { day: 'Mon', revenue: 6200, liters: 98 },
  { day: 'Tue', revenue: 5800, liters: 92 },
  { day: 'Wed', revenue: 6600, liters: 104 },
  { day: 'Thu', revenue: 7100, liters: 112 },
  { day: 'Fri', revenue: 6900, liters: 108 },
  { day: 'Sat', revenue: 8200, liters: 130 },
  { day: 'Sun', revenue: 7800, liters: 124 },
];

export default function FarmerDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  // Dairy Operational State
  const [milkingStatus, setMilkingStatus] = useState('Morning Milking Chilled to 4°C');
  const [products, setProducts] = useState(mockFarmerProducts);
  const [orders, setOrders] = useState(mockFarmerOrders);

  // Quick capacity update right from dashboard
  const handleQuickCapacityChange = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newTotal = Math.max(p.soldCapacity, p.totalCapacity + delta);
          return { ...p, totalCapacity: newTotal };
        }
        return p;
      })
    );
    toast.info('Yield Updated', 'Daily milk & dairy capacity updated.');
  };

  // Quick order mark supplied
  const handleMarkSupplied = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: 'supplied' } : o))
    );
    toast.success('Milk Delivered', `Order #${orderId} marked as delivered to customer.`);
  };

  return (
    <FarmerLayout>
      <div className="farmer-dashboard-container">
        
        {/* Top Operational Dairy Header */}
        <header className="farmer-op-banner">
          <div className="farmer-op-banner-main">
            <div className="farmer-badge-tag">🥛 FARMER DAIRY & MILK OPERATIONS</div>
            <h1 className="farmer-op-title">
              {user?.farmName || 'Ravi Dairy Farm'} Operations
            </h1>
            <p className="farmer-op-subtitle">
              Owner: <strong>{user?.name || 'Ravi Kumar'}</strong> · 🐄 28 Dairy Cows · 📍 {user?.location || 'Dindigul Region'}
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
              <div className="text-xs text-muted">Tested at 5:00 AM • Fat: <strong>4.8%</strong> • SNF: <strong>9.0%</strong> • Temp: <strong>4.0°C</strong></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-paid">✓ Purity Certified</span>
            <span className="badge badge-active">Chilled & Untouched</span>
          </div>
        </div>

        <div className="farmer-dashboard-grid">
          
          {/* Main Operations Left Column */}
          <div className="farmer-main-col">

            {/* Business Performance Metric Cards */}
            <div className="farmer-metrics-row">
              <div className="farmer-metric-card hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">🥛</span>
                  <span className="metric-trend green">140 L</span>
                </div>
                <div className="metric-value">{mockFarmerStats.todaySales} L</div>
                <div className="metric-label">Today's Milk Yield Dispatched</div>
                <div className="metric-footer">42 Daily Household Subscriptions</div>
              </div>

              <div className="farmer-metric-card hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">💰</span>
                  <span className="metric-trend green">+12%</span>
                </div>
                <div className="metric-value">{formatCurrency(mockFarmerStats.todayRevenue)}</div>
                <div className="metric-label">Today's Milk Revenue</div>
                <div className="metric-footer">85% collected via UPI</div>
              </div>

              <div className="farmer-metric-card hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">📈</span>
                  <span className="metric-trend amber">Aug 2026</span>
                </div>
                <div className="metric-value">{formatCurrency(mockFarmerStats.monthlyRevenue)}</div>
                <div className="metric-label">Monthly Gross Revenue</div>
                <div className="metric-footer">3,420 Liters total milk sold</div>
              </div>

              <div className="farmer-metric-card alert hover-lift">
                <div className="metric-header">
                  <span className="metric-icon">⚠️</span>
                  <span className="metric-trend red">Due</span>
                </div>
                <div className="metric-value">{formatCurrency(mockFarmerStats.pendingPayments)}</div>
                <div className="metric-label">Pending Customer Milk Bills</div>
                <Link to="/farmer/billing" className="metric-link">Send Payment Reminders →</Link>
              </div>
            </div>

            {/* Interactive Capacity & Yield Control Center */}
            <div className="card farmer-section-card">
              <div className="card-header flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-primary">🥛 Daily Milk & Dairy Yield Capacity Control</h2>
                  <p className="text-xs text-muted">Adjust total available liters and dairy products as morning & evening milking yield changes</p>
                </div>
                <Link to="/farmer/capacity" className="btn btn-secondary btn-sm">Full Capacity Page →</Link>
              </div>

              <div className="card-body">
                <div className="capacity-control-list">
                  {products.map((p) => {
                    const remaining = p.totalCapacity - p.soldCapacity;
                    const soldPct = Math.round((p.soldCapacity / p.totalCapacity) * 100);

                    return (
                      <div key={p.id} className="capacity-item-row">
                        <div className="capacity-item-info">
                          <span className="text-2xl">{p.emoji}</span>
                          <div>
                            <div className="font-bold text-base">{p.name}</div>
                            <div className="text-xs text-muted">Price: {formatCurrency(p.price)}/{p.unit}</div>
                          </div>
                        </div>

                        <div className="capacity-item-progress">
                          <div className="flex justify-between text-xs mb-1 font-semibold">
                            <span className="text-green">Subscribed/Sold: {p.soldCapacity} {p.unit}</span>
                            <span className="text-gold">Remaining Available: {remaining} {p.unit}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${soldPct}%` }} />
                          </div>
                        </div>

                        <div className="capacity-item-actions">
                          <span className="text-xs text-muted">Milking Capacity:</span>
                          <div className="yield-stepper">
                            <button
                              className="stepper-btn"
                              onClick={() => handleQuickCapacityChange(p.id, -1)}
                              disabled={p.totalCapacity <= p.soldCapacity}
                            >−</button>
                            <span className="stepper-val">{p.totalCapacity} {p.unit}</span>
                            <button className="stepper-btn" onClick={() => handleQuickCapacityChange(p.id, 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="card farmer-section-card">
              <div className="card-header flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-primary">📊 Weekly Milk Supply Volume & Revenue</h2>
                  <p className="text-xs text-muted">Liters sold and daily income trends for current week</p>
                </div>
                <Link to="/farmer/sales" className="btn btn-secondary btn-sm">Full Analytics →</Link>
              </div>
              <div className="card-body">
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e6f5eb" />
                      <XAxis dataKey="day" stroke="#556b60" fontSize={12} />
                      <YAxis stroke="#556b60" fontSize={12} />
                      <Tooltip formatter={(val, name) => [name === 'revenue' ? `₹${val}` : `${val} L`, name === 'revenue' ? 'Revenue' : 'Volume (Liters)']} />
                      <Bar dataKey="revenue" fill="hsl(142, 68%, 32%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Today's Fulfillment Orders */}
            <div className="card farmer-section-card">
              <div className="card-header flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-primary">🚚 Morning Milk Deliveries & Customer Route</h2>
                  <p className="text-xs text-muted">Assigned household morning (6:00 - 8:00 AM) and evening deliveries</p>
                </div>
                <Link to="/farmer/orders" className="btn btn-secondary btn-sm">Manage All Deliveries</Link>
              </div>

              <div className="card-body p-0">
                <div className="overflow-auto">
                  <table className="farmer-data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Milk / Dairy Product</th>
                        <th>Quantity</th>
                        <th>Slot</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th className="text-right">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <div className="font-semibold text-primary">{o.customerName}</div>
                            <div className="text-xs text-muted">ID: {o.customerId}</div>
                          </td>
                          <td>{o.product}</td>
                          <td><strong>{o.quantity} {o.unit}</strong></td>
                          <td className="capitalize">
                            <span className="badge badge-active">{o.deliveryTime || 'Morning'}</span>
                          </td>
                          <td className="font-bold text-green">{formatCurrency(o.amount)}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(o.paymentStatus)}`}>
                              {formatStatus(o.paymentStatus)}
                            </span>
                          </td>
                          <td className="text-right">
                            {o.orderStatus === 'active' ? (
                              <button className="btn btn-primary btn-sm" onClick={() => handleMarkSupplied(o.id)}>
                                Mark Delivered
                              </button>
                            ) : (
                              <span className="badge badge-paid">✓ Delivered</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                <Link to="/farmer/capacity" className="farmer-quick-btn">
                  <span>📊 Daily Milking Capacity Entry</span>
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

            {/* Nearby Farmer Exchange Alert */}
            <div className="card farmer-side-card exchange-widget">
              <div className="card-header bg-gold-100 flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <div>
                  <h3 className="text-sm font-bold text-earth">Nearby Dairy Farmer Network</h3>
                  <div className="text-xs text-muted">2 excess milk requests in area</div>
                </div>
              </div>
              <div className="card-body flex flex-col gap-3">
                {mockExchangeRequests.map((req) => (
                  <div key={req.id} className="exchange-mini-item">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-xs text-primary">{req.farmerName}</div>
                      <span className="badge badge-pending text-xs">{req.distance}</span>
                    </div>
                    <div className="text-xs text-secondary mt-1">Needs: <strong>{req.requiredQty} {req.unit} {req.product}</strong></div>
                    <Link to="/farmer/exchange" className="text-xs text-green font-semibold mt-2 block">
                      Supply Excess Milk →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Farm Profile Summary */}
            <div className="card farmer-side-card">
              <div className="card-body text-center flex flex-col items-center">
                <div className="avatar avatar-xl avatar-green mb-3" style={{ fontSize: '28px' }}>
                  {user?.name?.charAt(0) || 'R'}
                </div>
                <h3 className="text-lg font-bold text-primary">{user?.farmName || 'Ravi Dairy Farm'}</h3>
                <div className="text-xs text-muted">Verified Commercial Dairy Producer</div>
                <div className="badge badge-paid mt-2">✓ Milking & Purity Inspected</div>

                <div className="divider" />

                <div className="w-full text-left flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Dairy Cattle:</span>
                    <strong>28 Cows</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Milking Yield:</span>
                    <strong>140 Liters / Day</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Customer Rating:</span>
                    <strong className="text-gold">★ 4.9 / 5.0</strong>
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
