import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { mockSalesData, mockFarmerProducts } from '../../utils/mockData';
import { formatCurrency } from '../../utils/formatters';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function SalesDashboardPage() {
  const [period, setPeriod] = useState('weekly');

  return (
    <FarmerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">📈 Sales & Revenue Analytics</h1>
            <p className="section-subtitle">Comprehensive performance metrics, revenue trends, and product breakdowns</p>
          </div>
          <div className="tabs">
            <button className={`tab-btn ${period === 'weekly' ? 'active' : ''}`} onClick={() => setPeriod('weekly')}>Weekly</button>
            <button className={`tab-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>Monthly</button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-2 gap-6 mb-8">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Revenue Trend</h2>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={period === 'weekly' ? mockSalesData.weekly : mockSalesData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={period === 'weekly' ? 'day' : 'month'} stroke="#7a8296" fontSize={12} />
                  <YAxis stroke="#7a8296" fontSize={12} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(142, 68%, 38%)" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Product Volume Sold</h2>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={period === 'weekly' ? mockSalesData.weekly : mockSalesData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={period === 'weekly' ? 'day' : 'month'} stroke="#7a8296" fontSize={12} />
                  <YAxis stroke="#7a8296" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey={period === 'weekly' ? 'orders' : 'revenue'} fill="hsl(43, 90%, 52%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Product-wise Sales Table */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Product-wise Sales Breakdown</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-light text-xs text-muted uppercase">
                <th className="py-2">Product Name</th>
                <th className="py-2">Category</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Units Sold Today</th>
                <th className="py-2">Est. Daily Revenue</th>
              </tr>
            </thead>
            <tbody>
              {mockFarmerProducts.map((p) => (
                <tr key={p.id} className="border-b border-light hover:bg-cream">
                  <td className="py-3 font-semibold">{p.emoji} {p.name}</td>
                  <td className="py-3 capitalize">{p.category}</td>
                  <td className="py-3">{formatCurrency(p.price)} / {p.unit}</td>
                  <td className="py-3 font-bold">{p.soldCapacity} {p.unit}</td>
                  <td className="py-3 font-extrabold text-green">{formatCurrency(p.soldCapacity * p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FarmerLayout>
  );
}
