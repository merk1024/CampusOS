import { useEffect, useState } from 'react';

import { api } from './api';
import './UserManagement.css';
import { getRoleKey, getRoleLabel, hasAdminAccess } from './roles';

const EMPTY_USER = {
  email: '',
  password: '',
  name: '',
  role: 'student',
  student_id: '',
  group_name: '',
  subgroup_name: '',
  phone: '',
  date_of_birth: '',
  faculty: '',
  major: '',
  year_of_study: '',
  address: '',
  emergency_contact: ''
};

function UserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load users');
      console.error(err);
    }
  };

  useEffect(() => {
    if (hasAdminAccess(user)) {
      loadUsers();
    }
  }, [user]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.createUser(newUser);
      setNewUser(EMPTY_USER);
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewUser((prev) => {
      if (name === 'role' && value !== 'student') {
        return {
          ...prev,
          role: value,
          student_id: '',
          group_name: '',
          subgroup_name: ''
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const filteredUsers = users.filter((item) => {
    const matchesRole = roleFilter === 'all' || getRoleKey(item) === roleFilter;
    const haystack = [item.name, item.email, item.student_id, item.group_name, item.subgroup_name, item.faculty]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesRole && haystack.includes(searchTerm.toLowerCase());
  });

  const counts = {
    total: users.length,
    students: users.filter((item) => getRoleKey(item) === 'student').length,
    teachers: users.filter((item) => getRoleKey(item) === 'teacher').length,
    admins: users.filter((item) => item.role === 'admin' && getRoleKey(item) !== 'superadmin').length,
    superAdmins: users.filter((item) => getRoleKey(item) === 'superadmin').length
  };

  if (!hasAdminAccess(user)) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Access Denied</h1>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Create student, teacher and admin accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
          Create New User
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">Total accounts</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Students</span>
          <strong>{counts.students}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Teachers</span>
          <strong>{counts.teachers}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Admins</span>
          <strong>{counts.admins}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Super admins</span>
          <strong>{counts.superAdmins}</strong>
        </div>
      </div>

      <div className="management-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder="Search by name, email, student ID or faculty"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {['all', 'student', 'teacher', 'admin', 'superadmin'].map((role) => (
            <button
              key={role}
              type="button"
              className={`management-filter-chip ${roleFilter === role ? 'active' : ''}`}
              onClick={() => setRoleFilter(role)}
            >
              {role === 'all' ? 'All roles' : role === 'superadmin' ? 'Super admin' : role}
            </button>
          ))}
        </div>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="management-form-intro">
                <p>Select a role first. Student fields stay optional for teachers and admins.</p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="name" value={newUser.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={newUser.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" name="password" value={newUser.password} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select name="role" value={newUser.role} onChange={handleInputChange} required>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    name="student_id"
                    value={newUser.student_id}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. 240141052' : 'Only for students'}
                  />
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <input
                    type="text"
                    name="group_name"
                    value={newUser.group_name}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. CYB-23' : 'Only for students'}
                  />
                </div>
                <div className="form-group">
                  <label>Subgroup</label>
                  <input
                    type="text"
                    name="subgroup_name"
                    value={newUser.subgroup_name}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. 1-Group' : 'Only for students'}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" name="phone" value={newUser.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" name="date_of_birth" value={newUser.date_of_birth} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Faculty</label>
                  <input type="text" name="faculty" value={newUser.faculty} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Major</label>
                  <input type="text" name="major" value={newUser.major} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Year of Study</label>
                  <input type="number" name="year_of_study" value={newUser.year_of_study} onChange={handleInputChange} min="1" max="6" />
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea name="address" value={newUser.address} onChange={handleInputChange} rows="2" />
                </div>
                <div className="form-group full-width">
                  <label>Emergency Contact</label>
                  <input type="text" name="emergency_contact" value={newUser.emergency_contact} onChange={handleInputChange} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Student ID</th>
              <th>Group</th>
              <th>Subgroup</th>
              <th>Faculty</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>
                  <span className={`role-badge role-${getRoleKey(item)}`}>{getRoleLabel(item)}</span>
                </td>
                <td>{item.student_id || '-'}</td>
                <td>{item.group_name || '-'}</td>
                <td>{item.subgroup_name || '-'}</td>
                <td>{item.faculty || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="users-empty-state">
            <p>No users match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
