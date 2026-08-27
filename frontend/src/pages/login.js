import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import './login.css';
import logo from '../images/logo.png';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login...');
      console.log('Sending credentials to server...');
      
      // Login button triggers API call which fetches password_hash from database
      // The server reads password_hash from employees table and verifies using bcrypt
      const response = await login(formData.email, formData.password);
      
      console.log('Login response received:', response);
      
      if (response.success && response.user) {
        // Store user data: admin (and main-table logins) from admin; employees from employees table
        const isAdmin = response.user.userType === 'admin';
        const userData = isAdmin
          ? {
              id: response.user.id,
              username: response.user.username,
              userType: 'admin',
              full_name: response.user.username
            }
          : {
              id: response.user.id,
              username: response.user.username || response.user.email,
              email: response.user.email,
              full_name: response.user.full_name,
              phone: response.user.phone,
              position: response.user.position,
              department: response.user.department,
              status: response.user.status,
              userType: response.user.userType || 'employee'
            };

        console.log('Storing user data:', userData);
        
        // Store user data in browser storage
        if (formData.rememberMe) {
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('User data saved to localStorage');
        } else {
          sessionStorage.setItem('user', JSON.stringify(userData));
          console.log('User data saved to sessionStorage');
        }
        
        // Redirect based on user type and department
        console.log('Redirecting based on user type and department...');
        if (userData.userType === 'employee') {
          // Redirect by department name
          if (userData.department === 'Manager' || userData.department === 'Administration') {
            console.log('Redirecting Manager to manager dashboard...');
            navigate('/manager/dashboard');
          } else if (userData.department === 'Finance') {
            if (userData.position === 'Accountant') {
              console.log('Redirecting Finance Accountant to accountant dashboard...');
              navigate('/finance/accountant/dashboard');
            } else if (userData.position === 'Cashier') {
              console.log('Redirecting Finance Cashier to cashier dashboard...');
              navigate('/finance/cashier/dashboard');
            } else {
              console.log('Redirecting Finance employee to cashier dashboard...');
              navigate('/finance/cashier/dashboard');
            }
          } else if (userData.department === 'Sales') {
            console.log('Redirecting Sales employee to sales dashboard...');
            navigate('/sales/dashboard');
          } else {
            console.log('Redirecting employee to sales dashboard...');
            navigate('/sales/dashboard');
          }
        } else {
          // Admin: redirect to admin dashboard (/admin or /admin/dashboard)
          navigate('/admin/dashboard');
        }
      } else {
        throw new Error('Login failed: Invalid response from server');
      }
    } catch (err) {
      // Provide more helpful error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.message.includes('non-JSON response') || err.message.includes('Network error') || err.message.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 5000.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Header Band */}
      <header className="header-band"></header>

      {/* Main Content */}
      <main className="login-main-content">
        <div className="login-container">
          

          {/* Login Form Card */}
          <div className="login-card">
            {/* Logo */}
            <div className="login-logo-container">
              <img src={logo} alt="Mamuya Auto Spare Parts Logo" className="login-logo" />
            </div>
            <h2 className="login-title">Login</h2>
            <p className="login-subtitle">Sign in to your account</p>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Username/Email/Position Field */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Username / Position
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter username"
                  required
                />
                <small className="form-text" style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                  Admins: use your username. Finance: use position (Accountant or Cashier).
                </small>
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    className="form-control password-input"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="password-icon" />
                    ) : (
                      <FaEye className="password-icon" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-options">
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    className="form-check-input"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <label htmlFor="rememberMe" className="form-check-label">
                    Remember me
                  </label>
                </div>
                <a href="#forgot-password" className="forgot-password-link">
                  Forgot Password?
                </a>
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Additional Info */}
            <div className="login-footer-text">
              <p>
                Don't have an account?{' '}
                <a href="#register" className="register-link">
                  Contact Administrator
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Band */}
      <footer className="footer-band">
        <p>
          Copyright &copy; 2026. <b>Mamuya Auto Spares Parts Management System</b>
        </p>
      </footer>
    </div>
  );
}

export default Login;




