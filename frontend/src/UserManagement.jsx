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
const USER_MANAGEMENT_COPY = {
  English: {
    accessDenied: 'Access Denied',
    noPermission: 'You do not have permission to access this page.',
    title: 'User Management',
    subtitle: 'Create student, teacher and admin accounts',
    createUser: 'Create New User',
    loadErrorTitle: 'Could not load the user directory',
    totalAccounts: 'Total accounts',
    students: 'Students',
    active: 'Active',
    inactive: 'Inactive',
    teachers: 'Teachers',
    admins: 'Admins',
    superAdmins: 'Super admins',
    bulkTitle: 'Bulk create users',
    bulkSubtitle: 'Paste CSV or TSV rows to preview student, teacher, and admin account creation before applying it.',
    bulkFailed: 'Bulk import failed',
    bulkReady: 'Bulk import ready',
    supportedColumns: 'Supported columns',
    csvContent: 'CSV / TSV content',
    pastePlaceholder: 'Paste CSV or TSV content here',
    loadTemplate: 'Load sample template',
    clear: 'Clear',
    previewImport: 'Preview import',
    preparing: 'Preparing...',
    applyBulk: 'Apply bulk create',
    rowsParsed: 'Rows parsed',
    readyToCreate: 'Ready to create',
    willBeSkipped: 'Will be skipped',
    errors: 'Errors',
    generatedPasswords: 'Generated passwords',
    bulkPreviewTitle: 'Bulk import preview',
    bulkPreviewMeta: 'Review each row before applying the import.',
    tempPasswordsTitle: 'Generated temporary passwords',
    tempPasswordsMeta: 'These passwords are shown only now. Share them securely with the affected users.',
    searchPlaceholder: 'Search by name, email, student ID or faculty',
    allRoles: 'All roles',
    superAdmin: 'Super admin',
    createDialogTitle: 'Create New User',
    createIntro: 'Select a role first. Student fields stay optional for teachers and admins.',
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    studentId: 'Student ID',
    group: 'Group',
    subgroup: 'Subgroup',
    phone: 'Phone',
    dateOfBirth: 'Date of Birth',
    faculty: 'Faculty',
    major: 'Major',
    yearOfStudy: 'Year of Study',
    address: 'Address',
    emergencyContact: 'Emergency Contact',
    onlyForStudents: 'Only for students',
    cancel: 'Cancel',
    creating: 'Creating...',
    createUserAction: 'Create User',
    directoryTitle: 'User directory',
    directoryMeta: (filtered, total) => `Showing ${filtered} of ${total} accounts`,
    directoryEmptyTitle: 'No users match the current filters',
    directoryEmptyDescription: 'Try another role chip or clear the search term to show the full directory again.',
    clearFilters: 'Clear filters',
    status: 'Status',
    actions: 'Actions',
    disable: 'Disable',
    restore: 'Restore',
    updating: 'Updating...',
    activeLabel: 'Active',
    inactiveLabel: 'Inactive'
  },
  Kyrgyz: {
    accessDenied: 'Кирүүгө тыюу салынган',
    noPermission: 'Бул бетке кирүүгө уруксатыңыз жок.',
    title: 'Колдонуучуларды башкаруу',
    subtitle: 'Студент, окутуучу жана админ аккаунттарын түзүңүз',
    createUser: 'Жаңы колдонуучу түзүү',
    loadErrorTitle: 'Колдонуучулар каталогу жүктөлгөн жок',
    totalAccounts: 'Жалпы аккаунттар',
    students: 'Студенттер',
    active: 'Активдүү',
    inactive: 'Активдүү эмес',
    teachers: 'Окутуучулар',
    admins: 'Админдер',
    superAdmins: 'Башкы админдер',
    bulkTitle: 'Колдонуучуларды топтук түзүү',
    bulkSubtitle: 'Колдонууга чейин студент, окутуучу жана админ аккаунттарын алдын ала көрүү үчүн CSV же TSV саптарын чаптаңыз.',
    bulkFailed: 'Топтук импорт ишке ашкан жок',
    bulkReady: 'Топтук импорт даяр',
    supportedColumns: 'Колдоого алынган мамычалар',
    csvContent: 'CSV / TSV мазмуну',
    pastePlaceholder: 'CSV же TSV мазмунун бул жерге чаптаңыз',
    loadTemplate: 'Үлгү шаблонду жүктөө',
    clear: 'Тазалоо',
    previewImport: 'Импортту алдын ала көрүү',
    preparing: 'Даярдалып жатат...',
    applyBulk: 'Топтук түзүүнү колдонуу',
    rowsParsed: 'Окулган саптар',
    readyToCreate: 'Түзүүгө даяр',
    willBeSkipped: 'Өткөрүлүп жиберилет',
    errors: 'Каталар',
    generatedPasswords: 'Жаратылган сырсөздөр',
    bulkPreviewTitle: 'Топтук импорттун алдын ала көрүнүшү',
    bulkPreviewMeta: 'Колдонууга чейин ар бир сапты текшериңиз.',
    tempPasswordsTitle: 'Жаратылган убактылуу сырсөздөр',
    tempPasswordsMeta: 'Бул сырсөздөр азыр гана көрсөтүлөт. Аларды тиешелүү колдонуучуларга коопсуз түрдө бөлүшүңүз.',
    searchPlaceholder: 'Аты, email, студент ID же факультет боюнча издөө',
    allRoles: 'Бардык ролдор',
    superAdmin: 'Башкы админ',
    createDialogTitle: 'Жаңы колдонуучу түзүү',
    createIntro: 'Алгач ролду тандаңыз. Студент талаалары окутуучулар жана админдер үчүн милдеттүү эмес.',
    fullName: 'Толук аты',
    email: 'Email',
    password: 'Сырсөз',
    role: 'Роль',
    studentId: 'Студент ID',
    group: 'Топ',
    subgroup: 'Подтоп',
    phone: 'Телефон',
    dateOfBirth: 'Туулган күнү',
    faculty: 'Факультет',
    major: 'Адистик',
    yearOfStudy: 'Окуу жылы',
    address: 'Дарек',
    emergencyContact: 'Шашылыш байланыш',
    onlyForStudents: 'Студенттер үчүн гана',
    cancel: 'Жокко чыгаруу',
    creating: 'Түзүлүп жатат...',
    createUserAction: 'Колдонуучу түзүү',
    directoryTitle: 'Колдонуучулар каталогу',
    directoryMeta: (filtered, total) => `${total} аккаунттун ичинен ${filtered} көрсөтүлүүдө`,
    directoryEmptyTitle: 'Учурдагы чыпкаларга ылайык колдонуучу табылган жок',
    directoryEmptyDescription: 'Башка роль чыпкасын тандаңыз же толук каталогду көрсөтүү үчүн издөө сөзүн тазалаңыз.',
    clearFilters: 'Чыпкаларды тазалоо',
    status: 'Статус',
    actions: 'Аракеттер',
    disable: 'Өчүрүү',
    restore: 'Калыбына келтирүү',
    updating: 'Жаңыртылууда...',
    activeLabel: 'Активдүү',
    inactiveLabel: 'Активдүү эмес'
  }
};

function UserManagement({ user, language = 'English' }) {
  const copy = USER_MANAGEMENT_COPY[language] || USER_MANAGEMENT_COPY.English;
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
          <h1>{copy.accessDenied}</h1>
          <p>{copy.noPermission}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
          {copy.createUser}
        </button>
      </div>

      <StatusBanner tone="error" title={copy.loadErrorTitle} message={error} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.totalAccounts}</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.students}</span>
          <strong>{counts.students}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.active}</span>
          <strong>{counts.active}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.inactive}</span>
          <strong>{counts.inactive}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.teachers}</span>
          <strong>{counts.teachers}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.admins}</span>
          <strong>{counts.admins}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.superAdmins}</span>
          <strong>{counts.superAdmins}</strong>
        </div>
      </div>

      <div className="exam-form-card bulk-import-card">
        <div className="exam-form-header">
          <div>
            <h3>{copy.bulkTitle}</h3>
            <p>{copy.bulkSubtitle}</p>
          </div>
        </div>

        <StatusBanner tone="error" title={copy.bulkFailed} message={bulkError} />
        <StatusBanner tone="success" title={copy.bulkReady} message={bulkNotice} />

        <div className="bulk-import-note">
          <strong>{copy.supportedColumns}</strong>
          <span>
            `name`, `email`, `role`, optional `password`, plus student fields like `student_id`, `group_name`, and `subgroup_name`.
            If `password` is empty, CampusOS will generate a temporary one and show it once after apply.
          </span>
        </div>

        <label className="bulk-import-field">
          <span className="exam-form-label">{copy.csvContent}</span>
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
            placeholder={copy.pastePlaceholder}
          />
        </label>

        <div className="portal-actions bulk-import-actions">
          <button type="button" className="btn-secondary" onClick={handleInsertBulkTemplate}>
            {copy.loadTemplate}
          </button>
          <button type="button" className="btn-secondary" onClick={handleClearBulkImport}>
            {copy.clear}
          </button>
          <button type="button" className="btn-secondary" onClick={handlePreviewBulkImport} disabled={bulkLoading || !bulkCsvText.trim()}>
            {bulkLoading ? copy.preparing : copy.previewImport}
          </button>
          <button type="button" className="btn-primary" onClick={handleApplyBulkImport} disabled={!canApplyBulkImport}>
            {copy.applyBulk}
          </button>
        </div>
      </div>

      {bulkPreview && (
        <>
          <div className="management-summary-grid bulk-preview-summary">
            <div className="management-summary-card">
              <span className="management-summary-label">{copy.rowsParsed}</span>
              <strong>{bulkPreview.summary.total}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">{copy.readyToCreate}</span>
              <strong>{bulkPreview.summary.create}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">{copy.willBeSkipped}</span>
              <strong>{bulkPreview.summary.skip}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">{copy.errors}</span>
              <strong>{bulkPreview.summary.error}</strong>
            </div>
            <div className="management-summary-card">
              <span className="management-summary-label">{copy.generatedPasswords}</span>
              <strong>{bulkPreview.summary.generatedPasswords}</strong>
            </div>
          </div>

          <div className="data-table-card users-table">
            <div className="data-table-header">
              <div>
                <h3>{copy.bulkPreviewTitle}</h3>
                <p className="data-table-meta">{copy.bulkPreviewMeta}</p>
              </div>
            </div>
            <div className="data-table-scroll">
              <table className="data-table">
                <caption className="sr-only">Bulk import preview rows for user creation</caption>
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Action</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Student ID</th>
                    <th scope="col">Group</th>
                    <th scope="col">Note</th>
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
              <h3>{copy.tempPasswordsTitle}</h3>
              <p className="data-table-meta">{copy.tempPasswordsMeta}</p>
            </div>
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <caption className="sr-only">Generated temporary passwords after bulk user creation</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Student ID</th>
                  <th scope="col">Temporary password</th>
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
            placeholder={copy.searchPlaceholder}
            aria-label={copy.title}
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
              {role === 'all'
                ? copy.allRoles
                : role === 'superadmin'
                  ? copy.superAdmin
                  : (language === 'Kyrgyz'
                    ? (role === 'student' ? 'Студент' : role === 'teacher' ? 'Окутуучу' : 'Админ')
                    : role)}
            </button>
          ))}
        </div>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-user-dialog-title">
            <div className="modal-header">
              <h2 id="create-user-dialog-title">{copy.createDialogTitle}</h2>
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
                <p>{copy.createIntro}</p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>{copy.fullName} *</label>
                  <input type="text" name="name" value={newUser.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>{copy.email} *</label>
                  <input type="email" name="email" value={newUser.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>{copy.password} *</label>
                  <input type="password" name="password" value={newUser.password} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>{copy.role} *</label>
                  <select name="role" value={newUser.role} onChange={handleInputChange} required>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{copy.studentId}</label>
                  <input
                    type="text"
                    name="student_id"
                    value={newUser.student_id}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. 240141052' : copy.onlyForStudents}
                  />
                </div>
                <div className="form-group">
                  <label>{copy.group}</label>
                  <input
                    type="text"
                    name="group_name"
                    value={newUser.group_name}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. CYB-23' : copy.onlyForStudents}
                  />
                </div>
                <div className="form-group">
                  <label>{copy.subgroup}</label>
                  <input
                    type="text"
                    name="subgroup_name"
                    value={newUser.subgroup_name}
                    onChange={handleInputChange}
                    disabled={newUser.role !== 'student'}
                    placeholder={newUser.role === 'student' ? 'e.g. 1-Group' : copy.onlyForStudents}
                  />
                </div>
                <div className="form-group">
                  <label>{copy.phone}</label>
                  <input type="text" name="phone" value={newUser.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>{copy.dateOfBirth}</label>
                  <input type="date" name="date_of_birth" value={newUser.date_of_birth} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>{copy.faculty}</label>
                  <input type="text" name="faculty" value={newUser.faculty} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>{copy.major}</label>
                  <input type="text" name="major" value={newUser.major} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>{copy.yearOfStudy}</label>
                  <input type="number" name="year_of_study" value={newUser.year_of_study} onChange={handleInputChange} min="1" max="6" />
                </div>
                <div className="form-group full-width">
                  <label>{copy.address}</label>
                  <textarea name="address" value={newUser.address} onChange={handleInputChange} rows="2" />
                </div>
                <div className="form-group full-width">
                  <label>{copy.emergencyContact}</label>
                  <input type="text" name="emergency_contact" value={newUser.emergency_contact} onChange={handleInputChange} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                  {copy.cancel}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? copy.creating : copy.createUserAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="data-table-card users-table">
        <div className="data-table-header">
          <div>
            <h3>{copy.directoryTitle}</h3>
            <p className="data-table-meta">{copy.directoryMeta(filteredUsers.length, users.length)}</p>
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <EmptyState
            eyebrow="Directory"
            title={copy.directoryEmptyTitle}
            description={copy.directoryEmptyDescription}
            actionLabel={hasActiveFilters ? copy.clearFilters : ''}
            onAction={() => {
              setSearchTerm('');
              setRoleFilter('all');
            }}
            compact
          />
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <caption className="sr-only">CampusOS user directory table</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Student ID</th>
                  <th scope="col">Group</th>
                  <th scope="col">Subgroup</th>
                  <th scope="col">Faculty</th>
                  <th scope="col">Actions</th>
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
                        {item.is_active ? copy.activeLabel : copy.inactiveLabel}
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
                            ? copy.updating
                            : item.is_active
                              ? copy.disable
                              : copy.restore}
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
