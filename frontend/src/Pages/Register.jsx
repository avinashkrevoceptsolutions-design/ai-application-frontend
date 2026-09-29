import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import Toast from './Toast';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const values = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password,
    };
    const nextFieldErrors = {};
    if (!values.firstName || values.firstName.length > 50) nextFieldErrors.firstName = 'Enter a first name with 1–50 characters.';
    if (!values.lastName || values.lastName.length > 50) nextFieldErrors.lastName = 'Enter a last name with 1–50 characters.';
    if (values.username.length < 3 || values.username.length > 30) nextFieldErrors.username = 'Username must be 3–30 characters.';
    if (!/^\S+@\S+\.\S+$/.test(values.email)) nextFieldErrors.email = 'Enter a valid email address.';
    if (values.phoneNumber.length < 7 || values.phoneNumber.length > 20) nextFieldErrors.phoneNumber = 'Phone number must be 7–20 characters.';
    if (values.password.length < 6 || values.password.length > 128) nextFieldErrors.password = 'Password must be 6–128 characters.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      setToast({ type: 'error', message: 'Please correct the highlighted fields.' });
      return;
    }
    setLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          username: values.username,
          phone_number: values.phoneNumber,
          password: values.password,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail?.[0]?.msg || data.detail || 'Registration failed');
      }
      
      navigate('/login', { state: { toast: { type: 'success', message: 'Account created successfully.' } } });
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
          <h2>Create an Account</h2>
          <p>Join us for the best grocery shopping experience.</p>
          
          {error && <div className="auth-error" role="alert">{error}</div>}
          
          <form onSubmit={handleSubmit} className="auth-form">
            
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text" 
                id="first_name" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your First Name"
                required
              />
              {fieldErrors.firstName && <span className="field-error">{fieldErrors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input 
                type="text" 
                id="last_name" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your Last Name"
                required
              />
              {fieldErrors.lastName && <span className="field-error">{fieldErrors.lastName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input 
                type="text" 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a Username"
                required
                minLength="3"
                maxLength="30"
              />
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>

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
              <label htmlFor="phone_number">Phone Number</label>
              <input 
                type="tel" 
                id="phone_number" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your Phone Number"
                required
                minLength="7"
                maxLength="20"
              />
              {fieldErrors.phoneNumber && <span className="field-error">{fieldErrors.phoneNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength="6"
                maxLength="128"
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
