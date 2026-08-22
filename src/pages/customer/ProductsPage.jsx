import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import ProductCard from '../../components/products/ProductCard';
import { mockProducts, categories, locations } from '../../utils/mockData';
import './ProductsPage.css';

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedLoc, setSelectedLoc] = useState('All Locations');
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const filtered = useMemo(() => {
    let list = [...mockProducts];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q)
      );
    }
    if (selectedCat !== 'all') list = list.filter((p) => p.category === selectedCat);
    if (selectedLoc !== 'All Locations') list = list.filter((p) => p.location === selectedLoc);
    if (availability === 'available') list = list.filter((p) => p.status === 'available');
    if (availability === 'organic') list = list.filter((p) => p.isOrganic);

    if (sortBy === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sortBy === 'rating')     list.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return list;
  }, [query, selectedCat, selectedLoc, availability, sortBy]);

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
            {filtered.length > 0 ? (
              <div className="products-grid">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
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
