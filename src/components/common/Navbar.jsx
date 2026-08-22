import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar({ onMenuToggle, notifCount = 0 }) {
  const { user, logout, isFarmer } = useAuth();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/${isFarmer ? 'farmer' : 'customer'}/products?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <span />
          <span />
          <span />
        </button>

        <Link to={isFarmer ? '/farmer/dashboard' : '/customer/dashboard'} className="navbar-logo">
          <img src="/logo.svg" alt="DailyMarts Logo" className="navbar-logo-img" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
          <span className="navbar-logo-text">DailyMarts</span>
        </Link>
      </div>

      {!isFarmer && (
        <form className="navbar-search" onSubmit={handleSearch}>
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, ID, or location…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="navbar-search-input"
          />
          {searchVal && (
            <button type="button" className="navbar-search-clear" onClick={() => setSearchVal('')}>×</button>
          )}
        </form>
      )}

      <div className="navbar-right">
        {/* Notifications */}
        <Link
          to={`/${isFarmer ? 'farmer' : 'customer'}/notifications`}
          className="navbar-icon-btn"
          aria-label="Notifications"
        >
          🔔
          {notifCount > 0 && <span className="navbar-badge">{notifCount > 9 ? '9+' : notifCount}</span>}
        </Link>

        {/* Cart (customers only) */}
        {!isFarmer && (
          <Link to="/customer/orders" className="navbar-icon-btn" aria-label="Orders">
            📦
          </Link>
        )}

        {/* Profile */}
        <div className="navbar-profile" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <div className="avatar avatar-sm avatar-green navbar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="navbar-profile-name hide-mobile">{user?.name?.split(' ')[0]}</span>
          <span className="navbar-chevron">▾</span>

          {dropdownOpen && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-header">
                <div className="font-semibold text-sm">{user?.name}</div>
                <div className="text-xs text-muted">{user?.email}</div>
              </div>
              <Link
                to={`/${isFarmer ? 'farmer' : 'customer'}/profile`}
                className="navbar-dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >👤 My Profile</Link>
              <Link
                to={`/${isFarmer ? 'farmer' : 'customer'}/notifications`}
                className="navbar-dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >🔔 Notifications</Link>
              <div className="navbar-dropdown-divider" />
              <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
