// Formatting utilities for DailyMarts

export const formatCurrency = (amount, symbol = '₹') => {
  if (amount === null || amount === undefined) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const defaultOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} • ${formatTime(dateStr)}`;
};

export const timeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
};

export const formatFrequency = (freq) => {
  const map = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', once: 'One-time' };
  return map[freq] || freq;
};

export const formatDeliveryTime = (time) => {
  const map = { morning: '🌅 Morning', evening: '🌇 Evening', 'morning-evening': '🌅🌇 Morning & Evening' };
  return map[time] || time || '—';
};

export const formatStatus = (status) => {
  const map = {
    available: 'Available',
    'sold-out': 'Sold Out',
    limited: 'Limited',
    active: 'Active',
    upcoming: 'Upcoming',
    completed: 'Completed',
    cancelled: 'Cancelled',
    paid: 'Paid',
    pending: 'Pending',
    partial: 'Partially Paid',
    overdue: 'Overdue',
    supplied: 'Supplied',
    open: 'Open',
    accepted: 'Accepted',
  };
  return map[status] || status;
};

export const getStatusBadgeClass = (status) => {
  const map = {
    available: 'badge-active',
    active: 'badge-active',
    upcoming: 'badge-active',
    paid: 'badge-paid',
    completed: 'badge-paid',
    supplied: 'badge-paid',
    accepted: 'badge-paid',
    pending: 'badge-pending',
    open: 'badge-pending',
    partial: 'badge-partial',
    overdue: 'badge-overdue',
    cancelled: 'badge-cancelled',
    'sold-out': 'badge-cancelled',
    limited: 'badge-pending',
  };
  return map[status] || 'badge-pending';
};

export const calcBillEstimate = (pricePerUnit, quantity, frequency, days = 30) => {
  const freqMultiplier = { daily: days, weekly: Math.ceil(days / 7), monthly: 1, once: 1 };
  const multiplier = freqMultiplier[frequency] || days;
  return pricePerUnit * quantity * multiplier;
};

export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const truncate = (str, length = 60) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '…' : str;
};

export const productIdFromName = (name) => {
  return 'DM-' + name.replace(/\s+/g, '-').toUpperCase().slice(0, 8) + '-' + Math.floor(Math.random() * 900 + 100);
};
