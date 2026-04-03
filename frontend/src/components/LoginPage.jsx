import { useState } from 'react';

import { api } from '../api';
import campusosHero from '../assets/campusos-hero.svg';

function LoginPage({ onLogin, notice = '' }) {
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
      const response = await api.login(login, password, rememberMe);
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        isSuperadmin: response.user.is_superadmin ?? response.user.isSuperadmin ?? 0,
        studentId: response.user.student_id ?? response.user.studentId,
        group: response.user.group_name ?? response.user.groupName,
        subgroup: response.user.subgroup_name ?? response.user.subgroupName,
        avatar: response.user.avatar || response.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
      };

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
            <img
              src={campusosHero}
              alt="CampusOS Unified Academic Portal"
              className="login-brand-image"
            />
            <div className="login-brand-copy">
              <strong>Academic operations, unified.</strong>
              <p>
                CampusOS brings courses, grading, attendance, and scheduling
                into one calm workspace for students, instructors, and campus teams.
              </p>
            </div>
          </div>
          <div className="login-features">
            <div className="feature">
              <span className="feature-badge">CRS</span>
              <div className="feature-copy">
                <strong>Courses in one place</strong>
                <span>Materials, assignments, and semester progress stay aligned.</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-badge">GRD</span>
              <div className="feature-copy">
                <strong>Live academic progress</strong>
                <span>Check grades, results, and performance signals without friction.</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-badge">SCH</span>
              <div className="feature-copy">
                <strong>Schedule visibility</strong>
                <span>Stay on top of classes, exams, and attendance from one dashboard.</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-badge">MSG</span>
              <div className="feature-copy">
                <strong>Clear communication</strong>
                <span>Announcements and updates reach the right people at the right time.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Sign in with your email or student number</p>

            {(error || notice) && <div className="error-message">{error || notice}</div>}

            <div className="form-field">
              <label htmlFor="campusos-login">Email or Student ID</label>
              <input
                id="campusos-login"
                type="text"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="campusos-password">Password</label>
              <input
                id="campusos-password"
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
                  id="campusos-remember-me"
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
