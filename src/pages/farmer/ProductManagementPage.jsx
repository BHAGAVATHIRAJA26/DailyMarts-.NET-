import { useState, useEffect } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { productService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export default function ProductManagementPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'MILK', price: 60, unit: 'L', description: 'Fresh farm product',
  });

  useEffect(() => {
    fetchFarmerProducts();
  }, [user]);

  const fetchFarmerProducts = async () => {
    try {
      setLoading(true);
      const farmerId = user?._id;
      const res = await productService.getAll(farmerId ? { farmerId } : {});
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load farmer products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error('Validation Error', 'Product name and price are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await productService.create({
        name: newProduct.name,
        category: newProduct.category,
        price: Number(newProduct.price),
        unit: newProduct.unit || 'L',
        description: newProduct.description,
      });

      toast.success('Product Added Successfully', `${res.data?.data?.name || 'Product'} has been added to your catalog.`);
      setIsAddOpen(false);
      setNewProduct({ name: '', category: 'MILK', price: 60, unit: 'L', description: 'Fresh farm product' });
      fetchFarmerProducts();
    } catch (err) {
      console.error('Add product error:', err);
      toast.error('Add Failed', err.response?.data?.message || err.message || 'Could not add product');
    } finally {
      setSubmitting(false);
    }
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

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-muted">Loading your product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state card p-8 text-center">
            <div className="empty-state-icon text-5xl mb-3">🥛</div>
            <div className="empty-state-title font-bold text-xl mb-1">No Products Listed Yet</div>
            <div className="empty-state-desc text-muted mb-4">Click "+ Add New Product" to list your fresh milk or products for local customers.</div>
            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
              + Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-col gap-4">
            {products.map((p) => {
              const productName = p.name || 'Product';
              const productIdStr = p.productId || p._id;
              const emoji = p.emoji || '🥛';
              const price = p.price || 0;
              const unit = p.unit || 'L';

              return (
                <div key={p._id || p.productId} className="card p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{emoji}</div>
                    <div>
                      <div className="font-bold text-lg">{productName} <span className="text-xs text-muted font-normal">(#{productIdStr})</span></div>
                      <div className="text-sm text-muted">Price: <strong>{formatCurrency(price)} / {unit}</strong> · Category: {p.category}</div>
                      <div className="text-xs text-green mt-1">
                        Status: <span className="uppercase font-bold">{p.status || 'AVAILABLE'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`badge ${getStatusBadgeClass(p.status || 'available')}`}>{formatStatus(p.status || 'available')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                <option value="MILK">🥛 Milk</option>
                <option value="MILK_PRODUCT">🧈 Dairy Product / Ghee</option>
                <option value="VEGETABLE">🥬 Vegetables</option>
                <option value="CHICKEN">🐔 Chicken</option>
                <option value="MEAT">🥩 Meat</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input type="text" className="form-input" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} placeholder="L, kg, 500g" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Price per Unit (₹)</label>
            <input type="number" className="form-input" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Brief description of product" />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </FarmerLayout>
  );
}
