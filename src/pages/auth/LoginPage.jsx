import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const user = await login(email, password, role);
      toast.success('Welcome back!', `Logged in as ${user.name}`);
      navigate(user.role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid email or password';
      toast.error('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌿</span>
            <span className="auth-logo-text">DailyMarts</span>
          </div>
          <h1 className="auth-hero-title">
            Fresh from Farmers<br />
            <span className="auth-hero-accent">to Your Door</span>
          </h1>
          <p className="auth-hero-desc">
            Connect directly with trusted local farmers for fresh milk, vegetables,
            dairy products, chicken and meat — delivered daily.
          </p>
          <div className="auth-hero-features">
            {[
              { icon: '🥛', text: 'Fresh Daily Milk' },
              { icon: '🥬', text: 'Organic Vegetables' },
              { icon: '🐔', text: 'Farm-raised Chicken' },
              { icon: '🧈', text: 'Pure Dairy Products' },
            ].map((f) => (
              <div key={f.text} className="auth-hero-feature">
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          <div className="auth-hero-stats">
            <div className="auth-stat"><span className="auth-stat-num">500+</span><span>Farmers</span></div>
            <div className="auth-stat"><span className="auth-stat-num">10K+</span><span>Customers</span></div>
            <div className="auth-stat"><span className="auth-stat-num">50+</span><span>Locations</span></div>
          </div>
        </div>
        <div className="auth-hero-bg-elements">
          <div className="auth-leaf auth-leaf-1">🌿</div>
          <div className="auth-leaf auth-leaf-2">🍃</div>
          <div className="auth-leaf auth-leaf-3">🌾</div>
          <div className="auth-leaf auth-leaf-4">🌱</div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card anim-slide-up">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome Back</h2>
            <p className="auth-form-subtitle">Sign in to your DailyMarts account</p>
          </div>

          {/* Role Toggle */}
          <div className="auth-role-toggle">
            <button
              className={`auth-role-btn ${role === 'customer' ? 'active' : ''}`}
              onClick={() => setRole('customer')}
              type="button"
            >
              👤 Customer
            </button>
            <button
              className={`auth-role-btn ${role === 'farmer' ? 'active' : ''}`}
              onClick={() => setRole('farmer')}
              type="button"
            >
              🌾 Farmer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                id="login-email"
              />
              {errors.email && <span className="form-error">⚠ {errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-pw-wrapper">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  id="login-password"
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="form-error">⚠ {errors.password}</span>}
            </div>

            <div className="auth-form-row">
              <label className="auth-checkbox">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} id="remember-me" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="login-submit">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="anim-spin" style={{ display: 'inline-block', fontSize: 16 }}>⟳</span> Signing in…
                </span>
              ) : `Sign in as ${role === 'farmer' ? 'Farmer' : 'Customer'}`}
            </button>
          </form>

          <div className="auth-form-footer">
            <span>Don't have an account?</span>
            <Link to="/register" className="auth-link font-semibold">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
