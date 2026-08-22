import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import ProductCard from '../../components/products/ProductCard';
import { productService } from '../../services';
import { categories, locations, mockProducts } from '../../utils/mockData';
import './ProductsPage.css';

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQ);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedLoc, setSelectedLoc] = useState('All Locations');
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getAll();
      const apiProducts = res.data?.data || [];
      if (apiProducts.length > 0) {
        setProducts(apiProducts);
      } else {
        setProducts(mockProducts);
      }
    } catch (err) {
      console.error('Failed to load live products, using default products:', err);
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const pid = (p.productId || p.id || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        const farmerName = (p.farmer?.farmName || p.farmer?.name || p.farmerName || '').toLowerCase();
        return name.includes(q) || pid.includes(q) || loc.includes(q) || farmerName.includes(q);
      });
    }

    if (selectedCat !== 'all') {
      const catUpper = selectedCat.toUpperCase().replace(/\s+/g, '_');
      list = list.filter((p) => {
        const pCat = (p.category || '').toUpperCase().replace(/\s+/g, '_');
        return pCat === catUpper || (selectedCat === 'milk' && pCat === 'MILK') || (selectedCat === 'milk_product' && pCat === 'MILK_PRODUCT');
      });
    }

    if (selectedLoc !== 'All Locations') {
      list = list.filter((p) => (p.location || '').toLowerCase().includes(selectedLoc.toLowerCase()));
    }

    if (availability === 'available') {
      list = list.filter((p) => p.status === 'AVAILABLE' || p.status === 'available' || p.status === 'LIMITED');
    }
    if (availability === 'organic') {
      list = list.filter((p) => p.isOrganic);
    }

    if (sortBy === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === 'rating') list.sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));

    return list;
  }, [products, query, selectedCat, selectedLoc, availability, sortBy]);

  return (
    <CustomerLayout>
      <div className="products-page">
        {/* Header */}
        <div className="products-page-header">
          <div>
            <h1 className="section-title">Daily Products</h1>
            <p className="section-subtitle">{filtered.length} products available today</p>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} id="sort-products">
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* Search bar */}
        <div className="products-search-bar">
          <span className="products-search-icon">🔍</span>
          <input
            type="text"
            className="products-search-input"
            placeholder="Search by product name, ID (e.g. DM-MILK-001), or location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="product-search"
          />
          {query && (
            <button className="products-search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        <div className="products-layout">
          {/* Filters */}
          <aside className="products-filters">
            <div className="filter-section">
              <div className="filter-title">Category</div>
              <div className="filter-options">
                <label className="filter-option">
                  <input type="radio" name="category" value="all" checked={selectedCat === 'all'} onChange={() => setSelectedCat('all')} /> All Products
                </label>
                {categories.map((cat) => (
                  <label key={cat.id} className="filter-option">
                    <input type="radio" name="category" value={cat.id} checked={selectedCat === cat.id} onChange={() => setSelectedCat(cat.id)} />
                    {cat.emoji} {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-title">Location</div>
              <select className="form-select" value={selectedLoc} onChange={(e) => setSelectedLoc(e.target.value)} id="filter-location">
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <div className="filter-title">Availability</div>
              <div className="filter-options">
                {[['all', 'All Items'], ['available', 'In Stock Only'], ['organic', 'Organic Only']].map(([val, label]) => (
                  <label key={val} className="filter-option">
                    <input type="radio" name="avail" value={val} checked={availability === val} onChange={() => setAvailability(val)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn btn-ghost btn-full btn-sm" onClick={() => { setQuery(''); setSelectedCat('all'); setSelectedLoc('All Locations'); setAvailability('all'); setSortBy('default'); }}>
              🔄 Clear Filters
            </button>
          </aside>

          {/* Grid */}
          <div className="products-results">
            {loading ? (
              <div className="card p-8 text-center">
                <div className="animate-spin text-3xl mb-2">🔄</div>
                <p className="text-muted">Loading fresh products...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="products-grid">
                {filtered.map((p) => <ProductCard key={p._id || p.productId || p.id} product={p} />)}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No products found</div>
                <div className="empty-state-desc">Try different search terms or adjust filters</div>
                <button className="btn btn-primary mt-4" onClick={() => { setQuery(''); setSelectedCat('all'); }}>Clear Search</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
