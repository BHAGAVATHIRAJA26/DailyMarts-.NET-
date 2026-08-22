import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { mockFarmerProducts } from '../../utils/mockData';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export default function ProductManagementPage() {
  const toast = useToast();
  const [products, setProducts] = useState(mockFarmerProducts);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'milk', price: 60, unit: 'L', totalCapacity: 30, location: 'Dindigul',
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    const created = {
      ...newProduct,
      id: `DM-${newProduct.category.toUpperCase().slice(0,3)}-00${products.length + 1}`,
      emoji: newProduct.category === 'milk' ? '🥛' : newProduct.category === 'dairy' ? '🧈' : '🥬',
      soldCapacity: 0,
      status: 'available',
    };
    setProducts([...products, created]);
    setIsAddOpen(false);
    toast.success('Product Added Successfully', `${created.name} has been added to your products.`);
  };

  return (
    <FarmerLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="section-title">🌾 Daily Product Management</h1>
            <p className="section-subtitle">Manage your daily agricultural & dairy catalog, prices, and status</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            + Add New Product
          </button>
        </div>

        <div className="grid grid-col gap-4">
          {products.map((p) => {
            const remCapacity = p.totalCapacity - p.soldCapacity;
            return (
              <div key={p.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{p.emoji}</div>
                  <div>
                    <div className="font-bold text-lg">{p.name} <span className="text-xs text-muted font-normal">({p.id})</span></div>
                    <div className="text-sm text-muted">Price: <strong>{formatCurrency(p.price)} / {p.unit}</strong> · Location: {p.location}</div>
                    <div className="text-xs text-green mt-1">
                      Today's Capacity: {p.totalCapacity} {p.unit} (Sold: {p.soldCapacity} | Remaining: <strong>{remCapacity} {p.unit}</strong>)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`badge ${getStatusBadgeClass(p.status)}`}>{formatStatus(p.status)}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => toast.info('Edit Mode', `Editing ${p.name}`)}>
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Daily Product">
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input type="text" className="form-input" required placeholder="e.g. Fresh Cow Milk" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}>
                <option value="milk">🥛 Milk</option>
                <option value="dairy">🧈 Dairy</option>
                <option value="vegetables">🥬 Vegetables</option>
                <option value="chicken">🐔 Chicken</option>
                <option value="meat">🥩 Meat</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input type="text" className="form-input" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Price per Unit (₹)</label>
              <input type="number" className="form-input" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Today's Initial Capacity</label>
              <input type="number" className="form-input" value={newProduct.totalCapacity} onChange={(e) => setNewProduct({ ...newProduct, totalCapacity: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Product</button>
          </div>
        </form>
      </Modal>
    </FarmerLayout>
  );
}
