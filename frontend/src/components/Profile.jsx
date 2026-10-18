import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, AUTH_SESSION_EXPIRED_EVENT, clearAuthSession } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import AvatarBadge from './AvatarBadge';
import { getRoleLabel, hasAdminAccess } from '../roles';
import MfaSettings from './MfaSettings';

const PERSONAL_PROFILE_FIELDS = [
  'name', 'phone', 'avatar', 'date_of_birth', 'address', 'emergency_contact', 'father_name'
];

const getPersonalProfileFields = (profile = {}) => Object.fromEntries(
  PERSONAL_PROFILE_FIELDS.map((field) => [field, profile[field] ?? ''])
);

const PROFILE_COPY = {
  English: {
    loadingTitle: 'Profile',
    loadingBody: 'Loading profile...',
    unavailableBody: 'CampusOS could not load the account profile.',
    unavailableTitle: 'Profile unavailable',
    emptyEyebrow: 'Account profile',
    emptyTitle: 'We could not load your profile',
    emptyDescription: 'Try loading the page again. Once the API responds, your academic card will appear here.',
    retry: 'Retry',
    pageTitle: 'Account Profile',
    pageSubtitle: 'Update your personal and contact details. Academic records are read-only.',
    editProfile: 'Edit Profile',
    updateErrorTitle: 'Profile could not be updated',
    updateSuccessTitle: 'Profile updated',
    saveSuccess: 'Profile updated successfully.',
    role: 'Role',
    studentId: 'Student ID',
    group: 'Group',
    lastLogin: 'Last login',
    accountKicker: 'CampusOS account',
    notAvailable: 'Not available',
    academicTitle: 'Academic details',
    academicDescription: 'Academic records are managed by administrators and cannot be edited here.',
    fullName: 'Full name',
    subgroup: 'Subgroup',
    programClass: 'Program / Class',
    advisor: 'Advisor',
    status: 'Status',
    grantType: 'Grant type',
    balance: 'Balance 2025-2026',
    personalTitle: 'Personal and contact details',
    personalDescription: 'Main profile data used for communication and support.',
    fatherName: 'Father name',
    birthDate: 'Birth date',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    emergencyContact: 'Emergency contact',
    accessTitle: 'Access history',
    accessDescription: 'Operational data for session and account tracking.',
    registrationDate: 'Registration date',
    lastLoginDate: 'Last login date',
    lastLoginIp: 'Last login IP',
    avatarTitle: 'Avatar',
    avatarBody: 'Paste an image URL or keep a generated initials badge for your account.',
    avatarInputLabel: 'Image URL or initials',
    useInitials: 'Use initials',
    useGenerated: 'Use generated',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    passwordTitle: 'Change password',
    passwordDescription: 'Changing your password signs you out of all sessions.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordPolicy: 'Use at least 12 characters and no more than 72 UTF-8 bytes. Some characters use multiple bytes.',
    passwordMismatch: 'New passwords do not match.',
    passwordFailed: 'Password could not be changed',
    passwordChanged: 'Password changed. Sign in again.',
    changingPassword: 'Changing password...',
    changePassword: 'Change password'
  },
  Kyrgyz: {
    loadingTitle: 'Профиль',
    loadingBody: 'Профиль жүктөлүүдө...',
    unavailableBody: 'CampusOS аккаунт профилин жүктөй алган жок.',
    unavailableTitle: 'Профиль жеткиликсиз',
    emptyEyebrow: 'Аккаунт профили',
    emptyTitle: 'Профилиңизди жүктөй алган жокпуз',
    emptyDescription: 'Кайра аракет кылып көрүңүз. API жооп берери менен академиялык картаңыз ушул жерде көрүнөт.',
    retry: 'Кайра аракет кылуу',
    pageTitle: 'Аккаунт профили',
    pageSubtitle: 'Жеке жана байланыш маалыматын жаңыртыңыз. Академиялык маалыматты окууга гана болот.',
    editProfile: 'Профилди оңдоо',
    updateErrorTitle: 'Профиль жаңыртылган жок',
    updateSuccessTitle: 'Профиль жаңырды',
    saveSuccess: 'Профиль ийгиликтүү жаңырды.',
    role: 'Роль',
    studentId: 'Студент ID',
    group: 'Топ',
    lastLogin: 'Акыркы кирүү',
    accountKicker: 'CampusOS аккаунту',
    notAvailable: 'Жеткиликтүү эмес',
    academicTitle: 'Академиялык маалымат',
    academicDescription: 'Академиялык маалыматты администраторлор башкарат. Бул жерде аны өзгөртүүгө болбойт.',
    fullName: 'Толук аты-жөнү',
    subgroup: 'Подгруппа',
    programClass: 'Программа / Класс',
    advisor: 'Куратор',
    status: 'Статус',
    grantType: 'Грант түрү',
    balance: 'Баланс 2025-2026',
    personalTitle: 'Жеке жана байланыш маалыматы',
    personalDescription: 'Байланыш жана колдоо үчүн колдонулуучу негизги профиль маалыматы.',
    fatherName: 'Атасынын аты',
    birthDate: 'Туулган күнү',
    email: 'Email',
    phone: 'Телефон',
    address: 'Дарек',
    emergencyContact: 'Шашылыш байланыш',
    accessTitle: 'Кирүү тарыхы',
    accessDescription: 'Сеанс жана аккаунтка байланышкан операциялык маалыматтар.',
    registrationDate: 'Катталган күнү',
    lastLoginDate: 'Акыркы кирүү күнү',
    lastLoginIp: 'Акыркы кирүү IP',
    avatarTitle: 'Аватар',
    avatarBody: 'Сүрөттүн URL дарегин киргизиңиз же аккаунтуңуз үчүн generated initials аватарын калтырыңыз.',
    avatarInputLabel: 'Сүрөт URL же инициалдар',
    useInitials: 'Инициалдарды колдонуу',
    useGenerated: 'Generated вариантты колдонуу',
    cancel: 'Жокко чыгаруу',
    saving: 'Сакталып жатат...',
    saveChanges: 'Өзгөртүүлөрдү сактоо',
    passwordTitle: 'Сырсөздү өзгөртүү',
    passwordDescription: 'Сырсөз өзгөргөндө бардык сеанстардан чыгасыз.',
    currentPassword: 'Учурдагы сырсөз',
    newPassword: 'Жаңы сырсөз',
    confirmPassword: 'Жаңы сырсөздү кайталоо',
    passwordPolicy: 'Кеминде 12 белги жана эң көп 72 UTF-8 байт колдонуңуз. Айрым белгилер бир нече байт ээлейт.',
    passwordMismatch: 'Жаңы сырсөздөр дал келбейт.',
    passwordFailed: 'Сырсөз өзгөртүлгөн жок',
    passwordChanged: 'Сырсөз өзгөрдү. Кайра кириңиз.',
    changingPassword: 'Сырсөз өзгөртүлүүдө...',
    changePassword: 'Сырсөздү өзгөртүү'
  }
};

function formatDate(value, locale = 'en-GB', fallback = 'Not available') {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  }).toUpperCase();
}

function buildInitials(name, email) {
  const source = String(name || email || '').trim();
  if (!source) {
    return 'CO';
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function Profile({ onUserChange, language = 'English', locale = 'en-GB' }) {
  const copy = PROFILE_COPY[language] || PROFILE_COPY.English;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (changingPassword) return;
    setPasswordError('');
    if (Array.from(passwordForm.newPassword).length < 12
      || new TextEncoder().encode(passwordForm.newPassword).length > 72) {
      setPasswordError(copy.passwordPolicy);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(copy.passwordMismatch);
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      clearAuthSession();
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
        detail: { message: copy.passwordChanged }
      }));
    } catch (err) {
      setPasswordError(err.message || copy.passwordFailed);
    } finally {
      setChangingPassword(false);
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getProfile();
      setProfile(response.user);
      setFormData(getPersonalProfileFields(response.user));
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
      const response = await api.updateProfile(getPersonalProfileFields(formData));
      setProfile(response.user);
      setFormData(getPersonalProfileFields(response.user));
      onUserChange?.(response.user);
      setEditing(false);
      setNotice(copy.saveSuccess);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(getPersonalProfileFields(profile));
    setEditing(false);
    setError('');
    setNotice('');
  };

  const getField = useCallback((fieldName, fallback = copy.notAvailable) => (
    profile?.[fieldName] ?? fallback
  ), [copy.notAvailable, profile]);

  const roleLabel = useMemo(() => getRoleLabel(profile || {}, language), [language, profile]);
  const previewUser = useMemo(() => ({ ...profile, ...formData }), [formData, profile]);
  const generatedInitials = useMemo(() => (
    buildInitials(formData?.name || profile?.name, profile?.email)
  ), [formData?.name, profile?.email, profile?.name]);

  const summaryCards = useMemo(() => ([
    { label: copy.role, value: roleLabel },
    { label: copy.studentId, value: getField('student_id') },
    { label: copy.group, value: getField('group_name') },
    { label: copy.lastLogin, value: formatDate(getField('last_login_at', null), locale, copy.notAvailable) }
  ]), [copy.group, copy.lastLogin, copy.notAvailable, copy.role, copy.studentId, getField, locale, roleLabel]);

  const sections = useMemo(() => ([
    {
      key: 'academic',
      title: copy.academicTitle,
      description: copy.academicDescription,
      rows: [
        { label: copy.studentId, value: getField('student_id') },
        { label: copy.fullName, value: getField('name'), field: 'name' },
        { label: copy.group, value: getField('group_name') },
        { label: copy.subgroup, value: getField('subgroup_name') },
        { label: copy.programClass, value: getField('program_class', profile?.major || copy.notAvailable) },
        { label: copy.advisor, value: getField('advisor') },
        { label: copy.status, value: getField('study_status') },
        { label: copy.grantType, value: getField('grant_type') },
        { label: copy.balance, value: getField('balance_info') }
      ]
    },
    {
      key: 'personal',
      title: copy.personalTitle,
      description: copy.personalDescription,
      rows: [
        { label: copy.fatherName, value: getField('father_name'), field: 'father_name' },
        { label: copy.birthDate, value: formatDate(getField('date_of_birth', null), locale, copy.notAvailable), field: 'date_of_birth', type: 'date' },
        { label: copy.email, value: getField('email') },
        { label: copy.phone, value: getField('phone'), field: 'phone' },
        { label: copy.address, value: getField('address'), field: 'address', control: 'textarea' },
        { label: copy.emergencyContact, value: getField('emergency_contact'), field: 'emergency_contact' }
      ]
    },
    {
      key: 'access',
      title: copy.accessTitle,
      description: copy.accessDescription,
      rows: [
        { label: copy.registrationDate, value: formatDate(getField('registration_date', null), locale, copy.notAvailable) },
        { label: copy.lastLoginDate, value: formatDate(getField('last_login_at', null), locale, copy.notAvailable) },
        { label: copy.lastLoginIp, value: getField('last_login_ip') }
      ]
    }
  ]), [copy.accessDescription, copy.accessTitle, copy.academicDescription, copy.academicTitle, copy.address, copy.advisor, copy.balance, copy.birthDate, copy.email, copy.emergencyContact, copy.fatherName, copy.fullName, copy.grantType, copy.group, copy.lastLoginDate, copy.lastLoginIp, copy.notAvailable, copy.personalDescription, copy.personalTitle, copy.phone, copy.programClass, copy.registrationDate, copy.status, copy.studentId, copy.subgroup, getField, locale, profile]);

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
          <h1>{copy.loadingTitle}</h1>
          <p>{copy.loadingBody}</p>
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
            <h1>{copy.loadingTitle}</h1>
            <p>{copy.unavailableBody}</p>
          </div>
        </div>
        <StatusBanner tone="error" title={copy.unavailableTitle} message={error} />
        <EmptyState
          eyebrow={copy.emptyEyebrow}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          actionLabel={copy.retry}
          onAction={loadProfile}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.pageSubtitle}</p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            {copy.editProfile}
          </button>
        )}
      </div>

      <StatusBanner tone="error" title={copy.updateErrorTitle} message={error} />
      <StatusBanner tone="success" title={copy.updateSuccessTitle} message={notice} />

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
          <AvatarBadge user={previewUser} className="profile-avatar-large" title={previewUser.name} />
          <div className="portal-summary-copy">
            <span className="portal-kicker">{copy.accountKicker}</span>
            <h2>{previewUser.name}</h2>
            <p>{previewUser.program_class || previewUser.major || previewUser.role}</p>
            <div className="portal-summary-meta">
              <span>{roleLabel}</span>
              <span>{previewUser.email || copy.notAvailable}</span>
              <span>{previewUser.group_name || copy.notAvailable}</span>
            </div>

            {editing && (
              <div className="profile-avatar-editor">
                <div className="profile-avatar-editor-header">
                  <strong>{copy.avatarTitle}</strong>
                  <span>{copy.avatarBody}</span>
                </div>
                <div className="profile-avatar-editor-body">
                  <AvatarBadge user={previewUser} className="profile-avatar-editor-preview" title={previewUser.name} />
                  <div className="profile-avatar-editor-fields">
                    <label htmlFor="profile-avatar-input">{copy.avatarInputLabel}</label>
                    <input
                      id="profile-avatar-input"
                      type="text"
                      value={formData.avatar || ''}
                      onChange={(event) => setFormData({ ...formData, avatar: event.target.value })}
                      placeholder={`https://example.com/avatar.jpg or ${generatedInitials}`}
                    />
                    <div className="profile-avatar-editor-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setFormData({ ...formData, avatar: generatedInitials })}
                      >
                        {copy.useInitials}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setFormData({ ...formData, avatar: '' })}
                      >
                        {copy.useGenerated}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            <button className="btn-secondary" onClick={handleCancel} disabled={saving}>{copy.cancel}</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? copy.saving : copy.saveChanges}
            </button>
          </div>
        )}
        {hasAdminAccess(profile) && <MfaSettings language={language} />}
        <form className="portal-section-card" onSubmit={handleChangePassword}>
          <div className="portal-section-header">
            <h3>{copy.passwordTitle}</h3>
            <p>{copy.passwordDescription}</p>
          </div>
          <StatusBanner tone="error" title={copy.passwordFailed} message={passwordError} />
          <p id="profile-password-policy" className="page-context-note">{copy.passwordPolicy}</p>
          <div className="exam-form-grid">
            {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
              <label key={field} className="exam-form-field">
                <span className="exam-form-label">{copy[field]}</span>
                <input
                  type="password"
                  name={field}
                  value={passwordForm[field]}
                  onChange={(event) => setPasswordForm({ ...passwordForm, [field]: event.target.value })}
                  autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                  minLength={field === 'currentPassword' ? undefined : 12}
                  aria-describedby={field === 'currentPassword' ? undefined : 'profile-password-policy'}
                  disabled={changingPassword}
                  required
                />
              </label>
            ))}
          </div>
          <div className="portal-actions">
            <button type="submit" className="btn-primary" disabled={changingPassword || saving}>
              {changingPassword ? copy.changingPassword : copy.changePassword}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;
