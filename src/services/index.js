import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('dm_user') || '{}');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export const authService = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

export const productService = {
  getAll:   (params) => api.get('/products', { params }),
  getById:  (id)     => api.get(`/products/${id}`),
  create:   (data)   => api.post('/products', data),
  update:   (id, data) => api.put(`/products/${id}`, data),
  delete:   (id)     => api.delete(`/products/${id}`),
  updateCapacity: (id, data) => api.patch(`/products/${id}/capacity`, data),
};

export const orderService = {
  getAll:   (params) => api.get('/orders', { params }),
  getById:  (id)     => api.get(`/orders/${id}`),
  create:   (data)   => api.post('/orders', data),
  cancel:   (id, data) => api.patch(`/orders/${id}/cancel`, data),
  markSupplied: (id) => api.patch(`/orders/${id}/supplied`),
  markCompleted: (id) => api.patch(`/orders/${id}/completed`),
};

export const subscriptionService = {
  getAll:  ()      => api.get('/subscriptions'),
  create:  (data)  => api.post('/subscriptions', data),
  skip:    (id, data) => api.post(`/subscriptions/${id}/skip`, data),
  cancel:  (id, data) => api.patch(`/subscriptions/${id}/cancel`, data),
  update:  (id, data) => api.put(`/subscriptions/${id}`, data),
};

export const paymentService = {
  getBills:        (params) => api.get('/bills', { params }),
  getBillById:     (id)     => api.get(`/bills/${id}`),
  // Customer records UPI payment (PENDING — balance not changed yet)
  recordPayment:   (data)   => api.post('/payments', data),
  // Fetch farmer's UPI ID from DB (no input from customer needed)
  getFarmerUpi:    (farmerId) => api.get(`/payments/farmer-upi/${farmerId}`),
  // Farmer: get payments awaiting their confirmation
  getPending:      ()       => api.get('/payments/pending'),
  // Farmer: confirm received → balance updated
  confirmReceived: (paymentId) => api.patch(`/payments/${paymentId}/confirm`),
  // Both: payment history
  getHistory:      ()       => api.get('/payments/history'),
};

export const farmerService = {
  getStats:    ()      => api.get('/reports/farmer/stats'),
  getOrders:   (params)=> api.get('/orders', { params }),
  getMonthlyBill: (month, year) => api.get(`/bills`),
  sendReminder: (customerId) => api.post(`/notifications/remind/${customerId}`),
  getExchangeRequests: () => api.get('/exchanges/requests'),
  raiseExchange: (data) => api.post('/exchanges/requests', data),
  acceptExchange: (id)  => api.patch(`/exchanges/requests/${id}/accept`),
  getSalesData:  (period) => api.get('/reports/farmer/stats'),
};

export const notificationService = {
  getAll:  () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  sendEmailToCustomer: (data) => api.post('/notifications/send-email', data),
};
