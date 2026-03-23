import { useState } from 'react';

import { api } from '../api';

function LoginPage({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(login, password);
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        studentId: response.user.student_id ?? response.user.studentId,
        group: response.user.group_name ?? response.user.groupName,
        subgroup: response.user.subgroup_name ?? response.user.subgroupName,
        avatar: response.user.avatar || response.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        token: response.token
      };

      if (rememberMe) {
        localStorage.setItem('token', response.token);
        sessionStorage.removeItem('token');
      } else {
        sessionStorage.setItem('token', response.token);
        localStorage.removeItem('token');
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
              <span className="feature-icon">🗓️</span>
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
            <p className="login-subtitle">Sign in with your email or student number</p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-field">
              <label>Email or Student ID</label>
              <input
                type="text"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
