import { useState } from 'react';

import { api } from '../api';
import { getShellCopy } from '../appPreferences';
import campusosHero from '../assets/campusos-hero.svg';

function LoginPage({ onLogin, notice = '', language = 'English' }) {
  const copy = getShellCopy(language).login;
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
        lastLoginAt: response.user.last_login_at ?? response.user.lastLoginAt,
        lastLoginIp: response.user.last_login_ip ?? response.user.lastLoginIp,
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
              <strong>{copy.brandTitle}</strong>
              <p>{copy.brandBody}</p>
            </div>
          </div>
          <div className="login-features">
            {copy.features.map((feature) => (
              <div key={feature.badge} className="feature">
                <span className="feature-badge">{feature.badge}</span>
                <div className="feature-copy">
                  <strong>{feature.title}</strong>
                  <span>{feature.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>{copy.welcome}</h2>
            <p className="login-subtitle">{copy.subtitle}</p>

            {(error || notice) && <div className="error-message">{error || notice}</div>}

            <div className="form-field">
              <label htmlFor="campusos-login">{copy.loginLabel}</label>
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
              <label htmlFor="campusos-password">{copy.passwordLabel}</label>
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
                <span>{copy.rememberMe}</span>
              </label>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? copy.signingIn : copy.signIn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
