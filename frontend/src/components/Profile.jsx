import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { getRoleLabel } from '../roles';

function formatDate(value) {
  if (!value) return 'Not available';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  }).toUpperCase();
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getProfile();
      setProfile(response.user);
      setFormData(response.user);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setNotice('');
      const response = await api.updateProfile(formData);
      setProfile(response.user);
      setFormData(response.user);
      setEditing(false);
      setNotice('Profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);
    setError('');
    setNotice('');
  };

  const getField = useCallback((fieldName, fallback = 'Not available') => (
    profile?.[fieldName] ?? fallback
  ), [profile]);

  const roleLabel = useMemo(() => getRoleLabel(profile || {}), [profile]);

  const summaryCards = useMemo(() => ([
    { label: 'Role', value: roleLabel },
    { label: 'Student ID', value: getField('student_id') },
    { label: 'Group', value: getField('group_name') },
    { label: 'Last login', value: formatDate(getField('last_login_at', null)) }
  ]), [getField, roleLabel]);

  const sections = useMemo(() => ([
    {
      key: 'academic',
      title: 'Academic details',
      description: 'Core study identity and enrollment information.',
      rows: [
        { label: 'Student ID', value: getField('student_id') },
        { label: 'Full name', value: getField('name'), field: 'name' },
        { label: 'Group', value: getField('group_name'), field: 'group_name' },
        { label: 'Subgroup', value: getField('subgroup_name'), field: 'subgroup_name' },
        { label: 'Program / Class', value: getField('program_class', profile?.major || 'Not available'), field: 'program_class' },
        { label: 'Advisor', value: getField('advisor'), field: 'advisor' },
        { label: 'Status', value: getField('study_status'), field: 'study_status' },
        { label: 'Grant type', value: getField('grant_type'), field: 'grant_type' },
        { label: 'Balance 2025-2026', value: getField('balance_info'), field: 'balance_info' }
      ]
    },
    {
      key: 'personal',
      title: 'Personal and contact details',
      description: 'Main profile data used for communication and support.',
      rows: [
        { label: 'Father name', value: getField('father_name'), field: 'father_name' },
        { label: 'Birth date', value: formatDate(getField('date_of_birth', null)), field: 'date_of_birth', type: 'date' },
        { label: 'Email', value: getField('email') },
        { label: 'Phone', value: getField('phone'), field: 'phone' },
        { label: 'Address', value: getField('address'), field: 'address', control: 'textarea' },
        { label: 'Emergency contact', value: getField('emergency_contact'), field: 'emergency_contact' }
      ]
    },
    {
      key: 'access',
      title: 'Access history',
      description: 'Operational data for session and account tracking.',
      rows: [
        { label: 'Registration date', value: formatDate(getField('registration_date', null)), field: 'registration_date', type: 'date' },
        { label: 'Last login date', value: formatDate(getField('last_login_at', null)) },
        { label: 'Last login IP', value: getField('last_login_ip') }
      ]
    }
  ]), [getField, profile]);

  const renderField = (row) => {
    if (!(editing && row.field)) {
      return <span>{row.value}</span>;
    }

    if (row.control === 'textarea') {
      return (
        <textarea
          value={formData[row.field] || ''}
          onChange={(event) => setFormData({ ...formData, [row.field]: event.target.value })}
          rows="3"
        />
      );
    }

    return (
      <input
        type={row.type || 'text'}
        value={formData[row.field] || ''}
        onChange={(event) => setFormData({ ...formData, [row.field]: event.target.value })}
      />
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Profile</h1>
          <p>Loading profile...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Profile</h1>
            <p>CampusOS could not load the account profile.</p>
          </div>
        </div>
        <StatusBanner tone="error" title="Profile unavailable" message={error} />
        <EmptyState
          eyebrow="Account profile"
          title="We could not load your profile"
          description="Try loading the page again. Once the API responds, your academic card will appear here."
          actionLabel="Retry"
          onAction={loadProfile}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Account Profile</h1>
          <p>Review and update your academic identity, contact details, and account history.</p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      <StatusBanner tone="error" title="Profile could not be updated" message={error} />
      <StatusBanner tone="success" title="Profile updated" message={notice} />

      <div className="management-summary-grid">
        {summaryCards.map((item) => (
          <div key={item.label} className="management-summary-card">
            <span className="management-summary-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="portal-profile">
        <div className="portal-summary-card">
          <div className="profile-avatar-large">
            {profile.avatar || profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="portal-summary-copy">
            <span className="portal-kicker">CampusOS account</span>
            <h2>{profile.name}</h2>
            <p>{getField('program_class', profile.major || profile.role)}</p>
            <div className="portal-summary-meta">
              <span>{roleLabel}</span>
              <span>{getField('email')}</span>
              <span>{getField('group_name')}</span>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.key} className="portal-section-card">
            <div className="portal-section-header">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>

            <div className="portal-records portal-records-section">
              {section.rows.map((row) => (
                <div key={row.label} className="portal-row">
                  <div className="portal-label">{row.label}</div>
                  <div className="portal-separator">:</div>
                  <div className="portal-value">
                    {renderField(row)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {editing && (
          <div className="portal-actions">
            <button className="btn-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
