import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './AuthPages.css';

const productCategories = [
  { id: 'milk', label: '🥛 Milk' },
  { id: 'dairy', label: '🧈 Dairy' },
  { id: 'vegetables', label: '🥬 Vegetables' },
  { id: 'chicken', label: '🐔 Chicken' },
  { id: 'meat', label: '🥩 Meat' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', farmName: '', email: '', phone: '',
    password: '', confirmPassword: '', location: '',
    address: '', categories: [], upiId: '',
  });

  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const toggleCategory = (id) => setForm((p) => ({
    ...p,
    categories: p.categories.includes(id) ? p.categories.filter((c) => c !== id) : [...p.categories, id],
  }));

  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (role === 'farmer' && !form.farmName.trim()) errs.farmName = 'Farm name is required';
    if (role === 'farmer') {
      if (!form.upiId.trim()) errs.upiId = 'UPI ID is required for farmers';
      else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(form.upiId.trim()))
        errs.upiId = 'Invalid UPI ID. Example: name@oksbi, 9876543210@okaxis';
    }
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.phone) errs.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = 'Enter valid 10-digit phone number';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Minimum 6 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (role === 'farmer' && form.categories.length === 0) errs.categories = 'Select at least one product category';
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(form, role);
      toast.success('Account Created!', `Welcome to DailyMarts, ${form.name.split(' ')[0]}!`);
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Hero */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌿</span>
            <span className="auth-logo-text">DailyMarts</span>
          </div>
          <h1 className="auth-hero-title">
            {role === 'farmer' ? (
              <>Grow Your Business<br /><span className="auth-hero-accent">with DailyMarts</span></>
            ) : (
              <>Get Fresh Products<br /><span className="auth-hero-accent">Every Day</span></>
            )}
          </h1>
          <p className="auth-hero-desc">
            {role === 'farmer'
              ? 'Manage your daily products, track sales, manage customers, and connect with nearby farmers — all in one place.'
              : 'Order fresh milk, vegetables, dairy and more directly from local farmers. Recurring subscriptions, easy payments.'}
          </p>
          <div className="auth-hero-features">
            {(role === 'farmer' ? [
              { icon: '📊', text: 'Sales Dashboard' },
              { icon: '💰', text: 'Payment Tracking' },
              { icon: '🤝', text: 'Farmer Exchange' },
              { icon: '🔔', text: 'Smart Reminders' },
            ] : [
              { icon: '🔄', text: 'Daily Subscriptions' },
              { icon: '📍', text: 'Local Farmers' },
              { icon: '💳', text: 'Easy Payments' },
              { icon: '❌', text: 'Flexible Cancellation' },
            ]).map((f) => (
              <div key={f.text} className="auth-hero-feature">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-hero-bg-elements">
          <div className="auth-leaf auth-leaf-1">🌿</div>
          <div className="auth-leaf auth-leaf-2">🍃</div>
          <div className="auth-leaf auth-leaf-3">🌾</div>
          <div className="auth-leaf auth-leaf-4">🌱</div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <div className="auth-form-card anim-slide-up">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create Account</h2>
            <p className="auth-form-subtitle">Join DailyMarts as a {role}</p>
          </div>

          {/* Role Toggle */}
          <div className="auth-role-toggle">
            <button className={`auth-role-btn ${role === 'customer' ? 'active' : ''}`} onClick={() => { setRole('customer'); setStep(1); setErrors({}); }} type="button">
              👤 Customer
            </button>
            <button className={`auth-role-btn ${role === 'farmer' ? 'active' : ''}`} onClick={() => { setRole('farmer'); setStep(1); setErrors({}); }} type="button">
              🌾 Farmer
            </button>
          </div>

          {/* Step Indicator */}
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              <div className="auth-step-circle">{step > 1 ? '✓' : '1'}</div>
              <span>Account</span>
            </div>
            <div className={`auth-step-line ${step > 1 ? 'done' : ''}`} />
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>
              <div className="auth-step-circle">2</div>
              <span>Details</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">{role === 'farmer' ? 'Farmer Name' : 'Full Name'}</label>
                <input type="text" className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Your full name" value={form.name} onChange={set('name')} id="reg-name" />
                {errors.name && <span className="form-error">⚠ {errors.name}</span>}
              </div>

              {role === 'farmer' && (
                <div className="form-group">
                  <label className="form-label">Farm / Business Name</label>
                  <input type="text" className={`form-input ${errors.farmName ? 'error' : ''}`} placeholder="e.g., Ravi Farm" value={form.farmName} onChange={set('farmName')} id="reg-farmname" />
                  {errors.farmName && <span className="form-error">⚠ {errors.farmName}</span>}
                </div>
              )}

              {/* UPI ID — farmer only, collected here so customers never need to type it */}
              {role === 'farmer' && (
                <div className="form-group">
                  <label className="form-label">💳 Your UPI ID (VPA)</label>
                  <input
                    type="text"
                    className={`form-input ${errors.upiId ? 'error' : ''}`}
                    placeholder="e.g. yourname@oksbi, 9876543210@okaxis"
                    value={form.upiId}
                    onChange={set('upiId')}
                    id="reg-upi-id"
                  />
                  {errors.upiId && <span className="form-error">⚠ {errors.upiId}</span>}
                  <span style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Customers will scan a QR code generated from this UPI ID to pay you.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="you@example.com" value={form.email} onChange={set('email')} id="reg-email" />
                {errors.email && <span className="form-error">⚠ {errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="10-digit mobile number" value={form.phone} onChange={set('phone')} id="reg-phone" />
                {errors.phone && <span className="form-error">⚠ {errors.phone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="auth-pw-wrapper">
                  <input type={showPw ? 'text' : 'password'} className={`form-input ${errors.password ? 'error' : ''}`} placeholder="At least 6 characters" value={form.password} onChange={set('password')} id="reg-password" />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</button>
                </div>
                {errors.password && <span className="form-error">⚠ {errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="auth-pw-wrapper">
                  <input type={showCPw ? 'text' : 'password'} className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} id="reg-confirm-password" />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowCPw(!showCPw)}>{showCPw ? '🙈' : '👁️'}</button>
                </div>
                {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
              </div>

              <button type="button" className="btn btn-primary btn-full btn-lg" onClick={handleNext} id="reg-next">
                Continue →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">{role === 'farmer' ? 'Farm Location' : 'Location'}</label>
                <input type="text" className={`form-input ${errors.location ? 'error' : ''}`} placeholder="City / Town" value={form.location} onChange={set('location')} id="reg-location" />
                {errors.location && <span className="form-error">⚠ {errors.location}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Full Address</label>
                <textarea className={`form-textarea ${errors.address ? 'error' : ''}`} placeholder="Street, area, pin code" value={form.address} onChange={set('address')} id="reg-address" rows={3} />
                {errors.address && <span className="form-error">⚠ {errors.address}</span>}
              </div>

              {role === 'farmer' && (
                <div className="form-group">
                  <label className="form-label">Product Categories</label>
                  <div className="auth-categories">
                    {productCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`auth-category-chip ${form.categories.includes(cat.id) ? 'selected' : ''}`}
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {errors.categories && <span className="form-error">⚠ {errors.categories}</span>}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn btn-primary flex-1 btn-lg" disabled={loading} id="reg-submit">
                  {loading ? '⟳ Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <div className="auth-form-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="auth-link font-semibold">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
