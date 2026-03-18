import { useState } from 'react';
import { api } from '../api';

// Login Page
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        studentId: response.user.student_id,
        group: response.user.group_name,
        avatar: response.user.avatar || response.user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        token: response.token
      };

      // Store token
      if (rememberMe) {
        localStorage.setItem('token', response.token);
      } else {
        sessionStorage.setItem('token', response.token);
      }
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-brand">
            <span className="brand-icon">🎓</span>
            <h1>Alatoo University</h1>
            <h2>Learning Management System</h2>
          </div>
          <div className="login-features">
            <div className="feature">
              <span className="feature-icon">✅</span>
              <span>Access all your courses</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Track your progress</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📅</span>
              <span>Manage your schedule</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Connect with teachers</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Sign in to continue to your dashboard</p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-field">
              <label>Email</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="demo-hint">
              <p><strong>Demo Accounts:</strong></p>
              <p>👨‍🎓 Student: student@alatoo.edu.kg / student</p>
              <p>👩‍🏫 Teacher: teacher@alatoo.edu.kg / teacher</p>
              <p>👤 Admin: admin@alatoo.edu.kg / admin</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;