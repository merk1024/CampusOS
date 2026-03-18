import { useState, useEffect } from 'react';
import { api } from '../api';

// Profile
function Profile({ user }) {
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
          <h1>👤 Profile</h1>
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
          <h1>👤 Profile</h1>
          <p>Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👤 Profile</h1>
          <p>Manage your personal information</p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-large">{profile.avatar}</div>
          <h2>{profile.name}</h2>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-role">{profile.role}</p>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>📋 Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                ) : (
                  <span>{profile.name}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Email</label>
                <span>{profile.email}</span>
              </div>

              {profile.student_id && (
                <div className="detail-item">
                  <label>Student ID</label>
                  <span>{profile.student_id}</span>
                </div>
              )}

              {profile.group_name && (
                <div className="detail-item">
                  <label>Group</label>
                  <span>{profile.group_name}</span>
                </div>
              )}

              <div className="detail-item">
                <label>Date of Birth</label>
                {editing ? (
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                ) : (
                  <span>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Phone</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                ) : (
                  <span>{profile.phone || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>🎓 Academic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Faculty</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.faculty || ''}
                    onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                  />
                ) : (
                  <span>{profile.faculty || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Major/Specialty</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.major || ''}
                    onChange={(e) => setFormData({...formData, major: e.target.value})}
                  />
                ) : (
                  <span>{profile.major || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Year of Study</label>
                {editing ? (
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={formData.year_of_study || ''}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                  />
                ) : (
                  <span>{profile.year_of_study ? `${profile.year_of_study} year` : 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>🏠 Contact Information</h3>
            <div className="detail-grid">
              <div className="detail-item full-width">
                <label>Address</label>
                {editing ? (
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                  />
                ) : (
                  <span>{profile.address || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item full-width">
                <label>Emergency Contact</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.emergency_contact || ''}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                  />
                ) : (
                  <span>{profile.emergency_contact || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="profile-actions">
              <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;