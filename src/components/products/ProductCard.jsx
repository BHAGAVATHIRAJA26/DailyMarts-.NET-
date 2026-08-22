import { Link } from 'react-router-dom';
import { formatCurrency, getStatusBadgeClass, formatStatus } from '../../utils/formatters';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const {
    id, name, emoji, farmerName, location, availableCapacity,
    totalCapacity, price, unit, status, rating, reviewCount, isOrganic, isA2,
    fatContent, snfContent, packaging
  } = product;

  const statusClass = getStatusBadgeClass(status);
  const statusLabel = formatStatus(status);
  const soldPercent = totalCapacity > 0 ? Math.round(((totalCapacity - availableCapacity) / totalCapacity) * 100) : 100;
  const isSoldOut = status === 'sold-out';
  const isMilk = product.category === 'milk';

  return (
    <div className={`product-card hover-lift ${isSoldOut ? 'sold-out' : ''} ${isMilk ? 'milk-featured-card' : ''}`}>
      {/* Image / Emoji */}
      <div className="product-card-img">
        <div className="product-card-emoji">{emoji}</div>
        
        <div className="product-card-badges-top">
          {isA2 && <span className="product-card-badge a2-badge">✨ A2 Pure</span>}
          {isOrganic && <span className="product-card-badge organic-badge">🌿 100% Farm Fresh</span>}
        </div>

        <span className={`product-card-status badge ${statusClass}`}>{statusLabel}</span>
      </div>

      {/* Body */}
      <div className="product-card-body">
        <div className="product-card-id">ID: {id}</div>
        <h3 className="product-card-name">{name}</h3>

        <div className="product-card-meta">
          <span className="product-card-farmer">🏡 {farmerName}</span>
          <span className="product-card-location">📍 {location}</span>
        </div>

        {/* Specialized Milk Attributes */}
        {isMilk && fatContent && (
          <div className="milk-spec-pill-row">
            <span className="milk-spec-pill">🧪 {fatContent}</span>
            {snfContent && <span className="milk-spec-pill">🥛 {snfContent}</span>}
            {packaging && <span className="milk-spec-pill">🍼 {packaging.split(' ')[0]}</span>}
          </div>
        )}

        {rating && (
          <div className="product-card-rating">
            <span className="product-card-stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
            <span className="product-card-rating-val">{rating}</span>
            <span className="product-card-review-count">({reviewCount})</span>
          </div>
        )}

        {/* Capacity */}
        <div className="product-card-capacity">
          <div className="product-card-capacity-label">
            <span>Available: <strong>{availableCapacity} {unit}</strong></span>
            <span className="text-muted text-xs">{soldPercent}% booked</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${soldPercent}%`,
                background: isMilk ? 'linear-gradient(90deg, #3b82f6, #10b981)' : undefined
              }}
            />
          </div>
        </div>

        {/* Price + Actions */}
        <div className="product-card-footer">
          <div className="product-card-price">
            <span className="product-card-price-val">{formatCurrency(price)}</span>
            <span className="product-card-price-unit">/{unit}</span>
          </div>
          <div className="product-card-actions">
            <Link to={`/customer/products/${id}`} className="btn btn-secondary btn-sm">
              Details
            </Link>
            {!isSoldOut && (
              <Link
                to={isMilk ? '/customer/subscriptions/milk' : `/customer/products/${id}`}
                className={`btn btn-sm ${isMilk ? 'btn-gold' : 'btn-primary'}`}
                id={`order-${id}`}
              >
                {isMilk ? '🥛 Subscribe' : 'Buy Now'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
