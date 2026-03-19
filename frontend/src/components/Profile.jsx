import { useEffect, useState } from 'react';

import { api } from '../api';

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        setProfile(response.user);
        setFormData(response.user);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      const response = await api.updateProfile(formData);
      setProfile(response.user);
      setFormData(response.user);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);
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
          <h1>Profile</h1>
          <p>Failed to load profile</p>
        </div>
      </div>
    );
  }

  const demoDefaults = profile.role === 'student'
    ? {
        father_name: 'Iliiaz',
        program_class: 'Киберкоопсуздук жана этикалык хакердик - Бкл.-EN - 3',
        advisor: 'Нурайым Кулетова',
        study_status: 'Studying',
        balance_info: 'No debt [ 1.33 USD advance payment ]',
        grant_type: 'Not available',
        last_login_ip: '192.168.11.35',
        registration_date: '2024-08-15'
      }
    : {};

  const getField = (fieldName, fallback = 'Not available') => (
    profile[fieldName] ?? demoDefaults[fieldName] ?? fallback
  );

  const rows = [
    { label: 'Student №', value: getField('student_id') },
    { label: 'Name, surname', value: getField('name'), field: 'name' },
    { label: 'Group', value: getField('group_name'), field: 'group_name' },
    { label: 'Subgroup', value: getField('subgroup_name') },
    { label: 'Father', value: getField('father_name'), field: 'father_name' },
    { label: 'Birth date', value: formatDate(getField('date_of_birth', null)), field: 'date_of_birth', type: 'date' },
    { label: 'Program / Class', value: getField('program_class', profile.major || 'Not available'), field: 'program_class' },
    { label: 'Advisor', value: getField('advisor'), field: 'advisor' },
    { label: 'Status', value: getField('study_status'), field: 'study_status' },
    { label: 'Balance [ 2025 - 2026 ]', value: getField('balance_info'), field: 'balance_info' },
    { label: 'Grant type', value: getField('grant_type'), field: 'grant_type' },
    { label: 'Email', value: getField('email') },
    { label: 'Phone', value: getField('phone'), field: 'phone' },
    { label: 'Last login date', value: formatDate(getField('last_login_at', null)) },
    { label: 'Last login ip', value: getField('last_login_ip') },
    { label: 'Registration date', value: formatDate(getField('registration_date', null)), field: 'registration_date', type: 'date' }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Student Portal Profile</h1>
          <p>University-style academic card</p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      <div className="portal-profile">
        <div className="portal-summary-card">
          <div className="profile-avatar-large">
            {profile.avatar || profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="portal-summary-copy">
            <span className="portal-kicker">Home page</span>
            <h2>{profile.name}</h2>
            <p>{getField('program_class', profile.major || profile.role)}</p>
          </div>
        </div>

        <div className="portal-records">
          {rows.map((row) => (
            <div key={row.label} className="portal-row">
              <div className="portal-label">{row.label}</div>
              <div className="portal-separator">:</div>
              <div className="portal-value">
                {editing && row.field ? (
                  <input
                    type={row.type || 'text'}
                    value={formData[row.field] || ''}
                    onChange={(event) => setFormData({ ...formData, [row.field]: event.target.value })}
                  />
                ) : (
                  <span>{row.value}</span>
                )}
              </div>
            </div>
          ))}

          <div className="portal-row portal-row-block">
            <div className="portal-label">Address</div>
            <div className="portal-separator">:</div>
            <div className="portal-value">
              {editing ? (
                <textarea
                  value={formData.address || ''}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                  rows="3"
                />
              ) : (
                <span>{getField('address')}</span>
              )}
            </div>
          </div>

          <div className="portal-row portal-row-block">
            <div className="portal-label">Emergency contact</div>
            <div className="portal-separator">:</div>
            <div className="portal-value">
              {editing ? (
                <input
                  type="text"
                  value={formData.emergency_contact || ''}
                  onChange={(event) => setFormData({ ...formData, emergency_contact: event.target.value })}
                />
              ) : (
                <span>{getField('emergency_contact')}</span>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="portal-actions">
            <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
