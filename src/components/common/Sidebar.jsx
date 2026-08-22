import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const customerNav = [
  { path: '/customer/dashboard',    label: 'Dashboard',      icon: '🏠' },
  { path: '/customer/products',     label: 'Products',       icon: '🛒' },
  { path: '/customer/orders',       label: 'My Orders',      icon: '📦' },
  { path: '/customer/subscriptions',label: 'Subscriptions',  icon: '🔄' },
  { path: '/customer/bills',        label: 'Bills',          icon: '📄' },
  { path: '/customer/payments',     label: 'Payments',       icon: '💳' },
  { path: '/customer/notifications',label: 'Notifications',  icon: '🔔' },
  { path: '/customer/profile',      label: 'Profile',        icon: '👤' },
];

const farmerNav = [
  { path: '/farmer/dashboard',    label: 'Dashboard',        icon: '🏠' },
  { path: '/farmer/products',     label: 'My Products',      icon: '🌾' },
  { path: '/farmer/capacity',     label: 'Daily Capacity',   icon: '📊' },
  { path: '/farmer/orders',       label: 'Orders',           icon: '📦' },
  { path: '/farmer/sales',        label: 'Sales & Revenue',  icon: '📈' },
  { path: '/farmer/billing',      label: 'Monthly Billing',  icon: '💰' },
  { path: '/farmer/exchange',     label: 'Farmer Exchange',  icon: '🤝' },
  { path: '/farmer/notifications',label: 'Notifications',    icon: '🔔' },
  { path: '/farmer/profile',      label: 'Profile',          icon: '👤' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, isFarmer } = useAuth();
  const navigate = useNavigate();
  const navItems = isFarmer ? farmerNav : customerNav;
  const currentPath = window.location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="DailyMarts Logo" className="sidebar-logo-img" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">DailyMarts</span>
            <span className="sidebar-role">{isFarmer ? 'Farmer Portal' : 'Customer Portal'}</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar avatar avatar-md avatar-green">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-location">📍 {user.location}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${currentPath === item.path ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            {currentPath === item.path && !collapsed && <span className="sidebar-nav-active-dot" />}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
