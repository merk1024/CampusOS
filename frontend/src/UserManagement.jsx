import { useEffect, useState } from 'react';

import { api } from './api';
import EmptyState from './components/EmptyState';
import StatusBanner from './components/StatusBanner';
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

const BULK_IMPORT_TEMPLATE = [
  'name,email,role,password,student_id,group_name,subgroup_name,faculty,major,year_of_study,phone',
  'Ainur Sadykova,ainur.sadykova@alatoo.edu.kg,student,,240141099,CYB-23,1-Group,School of Engineering,Cybersecurity,2,+996700123456',
  'Azhar Kazakbaeva,azhar.kazakbaeva@alatoo.edu.kg,teacher,,,,School of Engineering,Cybersecurity,,+996700499001',
  'Operations Admin,ops.admin@alatoo.edu.kg,admin,,,,,,,'
].join('\n');

function UserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkPreviewText, setBulkPreviewText] = useState('');
  const [bulkCredentials, setBulkCredentials] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkNotice, setBulkNotice] = useState('');
  const [statusLoadingId, setStatusLoadingId] = useState(null);

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

  const handlePreviewBulkImport = async () => {
    try {
      setBulkLoading(true);
      setBulkError('');
      setBulkNotice('');
      setBulkCredentials([]);

      const preview = await api.previewBulkUsers(bulkCsvText);
      setBulkPreview(preview);
      setBulkPreviewText(bulkCsvText);
      setBulkNotice(`Preview ready: ${preview.summary.create} row(s) can be created.`);
    } catch (err) {
      setBulkError(err.message || 'Failed to preview the bulk import');
      setBulkPreview(null);
      setBulkPreviewText('');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApplyBulkImport = async () => {
    try {
      setBulkLoading(true);
      setBulkError('');
      setBulkNotice('');

      const result = await api.applyBulkUsers(bulkCsvText);
      setBulkPreview({
        summary: {
          total: result.summary.total,
          create: 0,
          skip: result.summary.skipped,
          error: result.summary.errors,
          generatedPasswords: result.summary.generatedPasswords
        },
        rows: result.rows
      });
      setBulkPreviewText(bulkCsvText);
      setBulkCredentials(result.credentials || []);
      setBulkNotice(`Bulk import finished: ${result.summary.created} account(s) created.`);
      await loadUsers();
    } catch (err) {
      setBulkError(err.message || 'Failed to apply the bulk import');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleInsertBulkTemplate = () => {
    setBulkCsvText(BULK_IMPORT_TEMPLATE);
    setBulkPreview(null);
    setBulkPreviewText('');
    setBulkCredentials([]);
    setBulkError('');
    setBulkNotice('');
  };

  const handleClearBulkImport = () => {
    setBulkCsvText('');
    setBulkPreview(null);
    setBulkPreviewText('');
    setBulkCredentials([]);
    setBulkError('');
    setBulkNotice('');
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

  const handleToggleUserStatus = async (account) => {
    try {
      setStatusLoadingId(account.id);
      setError('');
      const nextActiveState = !account.is_active;
      await api.updateUserStatus(account.id, nextActiveState);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to update account status');
    } finally {
      setStatusLoadingId(null);
    }
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
    active: users.filter((item) => item.is_active).length,
    inactive: users.filter((item) => !item.is_active).length,
    students: users.filter((item) => getRoleKey(item) === 'student').length,
    teachers: users.filter((item) => getRoleKey(item) === 'teacher').length,
    admins: users.filter((item) => item.role === 'admin' && getRoleKey(item) !== 'superadmin').length,
    superAdmins: users.filter((item) => getRoleKey(item) === 'superadmin').length
  };
  const hasActiveFilters = roleFilter !== 'all' || searchTerm.trim() !== '';
  const canApplyBulkImport = (
    bulkPreview
    && bulkPreviewText === bulkCsvText
    && Number(bulkPreview.summary?.create || 0) > 0
    && !bulkLoading
  );

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

      <StatusBanner tone="error" title="Could not load the user directory" message={error} />

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
          <span className="management-summary-label">Active</span>
          <strong>{counts.active}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Inactive</span>
          <strong>{counts.inactive}</strong>
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

      <div className="exam-form-card bulk-import-card">
        <div className="exam-form-header">
          <div>
            <h3>Bulk create users</h3>
            <p>Paste CSV or TSV rows to preview student, teacher, and admin account creation before applying it.</p>
          </div>
        </div>

        <StatusBanner tone="error" title="Bulk import failed" message={bulkError} />
        <StatusBanner tone="success" title="Bulk import ready" message={bulkNotice} />

        <div className="bulk-import-note">
          <strong>Supported columns</strong>
          <span>
            `name`, `email`, `role`, optional `password`, plus student fields like `student_id`, `group_name`, and `subgroup_name`.
            If `password` is empty, CampusOS will generate a temporary one and show it once after apply.
          </span>
        </div>

        <label className="bulk-import-field">
          <span className="exam-form-label">CSV / TSV content</span>
          <textarea
            className="bulk-import-textarea"
            value={bulkCsvText}
            onChange={(event) => {
              setBulkCsvText(event.target.value);
              setBulkPreview(null);
              setBulkPreviewText('');
              setBulkCredentials([]);
              setBulkError('');
              setBulkNotice('');
            }}
            rows="8"
            placeholder="Paste CSV or TSV content here"
          />
        </label>

        <div className="portal-actions bulk-import-actions">
          <button type="button" className="btn-secondary" onClick={handleInsertBulkTemplate}>
            Load sample template
          </button>
          <button type="button" className="btn-secondary" onClick={handleClearBulkImport}>
            Clear
          </button>
          <button type="button" className="btn-secondary" onClick={handlePreviewBulkImport} disabled={bulkLoading || !bulkCsvText.trim()}>
            {bulkLoading ? 'Preparing...' : 'Preview import'}
          </button>
          <button type="button" className="btn-primary" onClick={handleApplyBulkImport} disabled={!canApplyBulkImport}>
            Apply bulk create
          </button>
        </div>
      </div>

      {bulkPreview && (
        <>
          <div className="management-summary-grid bulk-preview-summary">
            <div className="management-summary-card">
              <span className="management-summary-label">Rows parsed</span>
              <strong>{bulkPreview.summary.total}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">Ready to create</span>
              <strong>{bulkPreview.summary.create}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">Will be skipped</span>
              <strong>{bulkPreview.summary.skip}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">Errors</span>
              <strong>{bulkPreview.summary.error}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">Generated passwords</span>
              <strong>{bulkPreview.summary.generatedPasswords}</strong>
            </div>
          </div>

          <div className="data-table-card users-table">
            <div className="data-table-header">
              <div>
                <h3>Bulk import preview</h3>
                <p className="data-table-meta">Review each row before applying the import.</p>
              </div>
            </div>
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Action</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Student ID</th>
                    <th>Group</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.email}-${row.name}`}>
                      <td>{row.rowNumber}</td>
                      <td>
                        <span className={`bulk-preview-action ${row.action}`}>{row.action}</span>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.role}</td>
                      <td>{row.student_id || '-'}</td>
                      <td>{row.group_name || '-'}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {bulkCredentials.length > 0 && (
        <div className="data-table-card users-table">
          <div className="data-table-header">
            <div>
              <h3>Generated temporary passwords</h3>
              <p className="data-table-meta">These passwords are shown only now. Share them securely with the affected users.</p>
            </div>
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Student ID</th>
                  <th>Temporary password</th>
                </tr>
              </thead>
              <tbody>
                {bulkCredentials.map((credential) => (
                  <tr key={`${credential.id}-${credential.email}`}>
                    <td>{credential.name}</td>
                    <td>{credential.email}</td>
                    <td>{credential.role}</td>
                    <td>{credential.student_id || '-'}</td>
                    <td className="bulk-password-cell">{credential.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close create user dialog"
              >
                X
              </button>
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

      <div className="data-table-card users-table">
        <div className="data-table-header">
          <div>
            <h3>User directory</h3>
            <p className="data-table-meta">Showing {filteredUsers.length} of {users.length} accounts</p>
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <EmptyState
            eyebrow="Directory"
            title="No users match the current filters"
            description="Try another role chip or clear the search term to show the full directory again."
            actionLabel={hasActiveFilters ? 'Clear filters' : ''}
            onAction={() => {
              setSearchTerm('');
              setRoleFilter('all');
            }}
            compact
          />
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Student ID</th>
                  <th>Group</th>
                  <th>Subgroup</th>
                  <th>Faculty</th>
                  <th>Actions</th>
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
                    <td>
                      <span className={`account-status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{item.student_id || '-'}</td>
                    <td>{item.group_name || '-'}</td>
                    <td>{item.subgroup_name || '-'}</td>
                    <td>{item.faculty || '-'}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          className={`btn-secondary btn-sm ${item.is_active ? 'danger-soft' : 'success-soft'}`}
                          onClick={() => handleToggleUserStatus(item)}
                          disabled={statusLoadingId === item.id || item.id === user?.id || getRoleKey(item) === 'superadmin'}
                          title={
                            item.id === user?.id
                              ? 'You cannot change your own account status here'
                              : getRoleKey(item) === 'superadmin'
                                ? 'Super admin account is protected'
                                : ''
                          }
                        >
                          {statusLoadingId === item.id
                            ? 'Updating...'
                            : item.is_active
                              ? 'Disable'
                              : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
