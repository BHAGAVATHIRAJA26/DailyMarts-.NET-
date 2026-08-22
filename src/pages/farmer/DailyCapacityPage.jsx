import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { mockFarmerProducts } from '../../utils/mockData';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function DailyCapacityPage() {
  const toast = useToast();
  const [products, setProducts] = useState(mockFarmerProducts);

  const handleCapacityChange = (id, newTotal) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, totalCapacity: Math.max(p.soldCapacity, newTotal) } : p))
    );
  };

  const handleSave = () => {
    toast.success('Capacity Updated', "Today's product available capacities have been updated.");
  };

  return (
    <FarmerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">📊 Changing Daily Product Capacity</h1>
            <p className="section-subtitle">Update available quantities dynamically as your supply changes each day</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save Today's Capacities
          </button>
        </div>

        <div className="grid grid-col gap-4">
          {products.map((p) => {
            const remaining = p.totalCapacity - p.soldCapacity;
            const soldPct = Math.round((p.soldCapacity / p.totalCapacity) * 100);

            return (
              <div key={p.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.emoji}</span>
                    <div>
                      <h2 className="text-lg font-bold">{p.name}</h2>
                      <div className="text-xs text-muted">ID: {p.id} · Price: {formatCurrency(p.price)}/{p.unit}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green">{remaining} {p.unit} Available</div>
                    <div className="text-xs text-muted">{p.soldCapacity} {p.unit} Already Sold</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="progress-bar" style={{ height: '10px' }}>
                    <div className="progress-fill" style={{ width: `${soldPct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-cream p-4 rounded-lg">
                  <span className="text-sm font-semibold text-primary">Edit Today's Total Capacity ({p.unit})</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="qty-btn"
                      onClick={() => handleCapacityChange(p.id, p.totalCapacity - 1)}
                      disabled={p.totalCapacity <= p.soldCapacity}
                    >−</button>
                    <input
                      type="number"
                      className="form-input text-center font-bold"
                      style={{ width: '90px' }}
                      value={p.totalCapacity}
                      onChange={(e) => handleCapacityChange(p.id, Number(e.target.value))}
                    />
                    <button className="qty-btn" onClick={() => handleCapacityChange(p.id, p.totalCapacity + 1)}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FarmerLayout>
  );
}
