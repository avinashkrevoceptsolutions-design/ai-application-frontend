import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Auth.css';
import Toast from './Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.state?.toast) return;
    setToast(location.state.toast);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const nextFieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) nextFieldErrors.email = 'Enter a valid email address.';
    if (!password) nextFieldErrors.password = 'Enter your password.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      setToast({ type: 'error', message: 'Enter a valid email and password.' });
      return;
    }
    setLoading(true);
    
    try {
      // 1. Login to get token
      const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      
      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
        throw new Error(loginData.detail?.[0]?.msg || loginData.detail || 'Login failed');
      }
      
      localStorage.setItem('token', loginData.access_token);
      
      // 2. Fetch user profile to get role
      const meRes = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${loginData.access_token}` }
      });
      
      const meData = await meRes.json();
      
      if (!meRes.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      // 3. Redirect based on role
      if (meData.role === 'ADMIN') {
        navigate('/admin-dashboard');
      } else {
        navigate('/customer-dashboard');
      }
    } catch (err) {
      setError(err.message);
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="auth-card">

        <div className="auth-form-container">
          <h2>Welcome Back!</h2>
          <p>Sign in to continue your grocery shopping.</p>
          
          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
