const { SUPERADMIN_EMAIL } = require('../utils/access');

const FACULTY = 'School of Engineering and Applied Sciences';
const DEFAULT_STUDY_STATUS = 'active';
const PRESENTATION_SEMESTER = 'Spring 2025-2026';

const STAFF_PILOT_PROFILE = {
  [process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL]: {
    phone: '+996700000001',
    address: 'CampusOS Owner Desk',
    registration_date: '2024-09-01'
  },
  'admin@alatoo.edu.kg': {
    phone: '+996700000002',
    address: 'Academic Operations Office',
    registration_date: '2024-09-01'
  },
  'teacher@alatoo.edu.kg': {
    phone: '+996700210001',
    address: 'Office A-301',
    registration_date: '2021-09-01'
  },
  'askar.eskendirov@alatoo.edu.kg': {
    phone: '+996700210002',
    address: 'Office A-204',
    registration_date: '2020-09-01'
  },
  'diana.sadykova@alatoo.edu.kg': {
    phone: '+996700210003',
    address: 'Data Lab 2',
    registration_date: '2022-09-01'
  },
  'nurlan.toktonaliev@alatoo.edu.kg': {
    phone: '+996700210004',
    address: 'Office B-110',
    registration_date: '2021-09-01'
  }
};

const STUDENT_PILOT_PROFILE = {
  'erbol.abdusaitov1@alatoo.edu.kg': {
    phone: '+996700310001',
    advisor: 'Azhar Kazakbaeva',
    grant_type: 'contract',
    program_class: 'CYB-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2004-05-12',
    address: 'Bishkek',
    father_name: 'Abdusait Abdusaitov'
  },
  'aida.bekmuratova@alatoo.edu.kg': {
    phone: '+996700310002',
    advisor: 'Azhar Kazakbaeva',
    grant_type: 'grant',
    program_class: 'CYB-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2005-02-18',
    address: 'Bishkek',
    father_name: 'Bekmurat Bekmuratov'
  },
  'nursultan.omurzakov@alatoo.edu.kg': {
    phone: '+996700310003',
    advisor: 'Azhar Kazakbaeva',
    grant_type: 'contract',
    program_class: 'CYB-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2004-11-03',
    address: 'Tokmok',
    father_name: 'Omurzak Omurzakov'
  },
  'elina.toktosunova@alatoo.edu.kg': {
    phone: '+996700310004',
    advisor: 'Azhar Kazakbaeva',
    grant_type: 'grant',
    program_class: 'CYB-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2005-07-21',
    address: 'Karakol',
    father_name: 'Toktosun Toktosunov'
  },
  'timur.asanov@alatoo.edu.kg': {
    phone: '+996700310005',
    advisor: 'Askar Eskendirov',
    grant_type: 'contract',
    program_class: 'CYB-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2004-09-15',
    address: 'Kant',
    father_name: 'Asan Asanov'
  },
  'madina.saparova@alatoo.edu.kg': {
    phone: '+996700310006',
    advisor: 'Askar Eskendirov',
    grant_type: 'grant',
    program_class: 'CYB-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2005-01-29',
    address: 'Balykchy',
    father_name: 'Sapar Saparov'
  },
  'daniyar.kasymov@alatoo.edu.kg': {
    phone: '+996700310007',
    advisor: 'Askar Eskendirov',
    grant_type: 'contract',
    program_class: 'CYB-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2004-03-07',
    address: 'Bishkek',
    father_name: 'Kasym Kasymov'
  },
  'aizirek.iskakova@alatoo.edu.kg': {
    phone: '+996700310008',
    advisor: 'Askar Eskendirov',
    grant_type: 'grant',
    program_class: 'CYB-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2005-06-30',
    address: 'Naryn',
    father_name: 'Iskak Iskakov'
  },
  'bekzat.umetaliev@alatoo.edu.kg': {
    phone: '+996700320001',
    advisor: 'Nurlan Toktonaliev',
    grant_type: 'contract',
    program_class: 'SE-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2004-08-11',
    address: 'Bishkek',
    father_name: 'Umetal Umetaliev'
  },
  'alina.janybekova@alatoo.edu.kg': {
    phone: '+996700320002',
    advisor: 'Diana Sadykova',
    grant_type: 'grant',
    program_class: 'SE-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2005-04-26',
    address: 'Bishkek',
    father_name: 'Janybek Janybekov'
  },
  'ruslan.kudaibergenov@alatoo.edu.kg': {
    phone: '+996700320003',
    advisor: 'Nurlan Toktonaliev',
    grant_type: 'contract',
    program_class: 'SE-23-A',
    registration_date: '2023-09-01',
    date_of_birth: '2004-10-09',
    address: 'Osh',
    father_name: 'Kudaibergen Kudaibergenov'
  },
  'meerim.ryskulova@alatoo.edu.kg': {
    phone: '+996700320004',
    advisor: 'Diana Sadykova',
    grant_type: 'grant',
    program_class: 'SE-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2005-12-01',
    address: 'Talas',
    father_name: 'Ryskul Ryskulov'
  },
  'adilet.turgunbaev@alatoo.edu.kg': {
    phone: '+996700320005',
    advisor: 'Nurlan Toktonaliev',
    grant_type: 'contract',
    program_class: 'SE-23-B',
    registration_date: '2023-09-01',
    date_of_birth: '2004-02-14',
    address: 'Jalal-Abad',
    father_name: 'Turgun Turgunbaev'
  }
};

const enrichPilotAccount = (account) => {
  if (account.role === 'student') {
    const profile = STUDENT_PILOT_PROFILE[account.email] || {};
    return {
      ...account,
      study_status: DEFAULT_STUDY_STATUS,
      registration_date: profile.registration_date || '2023-09-01',
      program_class: profile.program_class || account.group_name || null,
      phone: profile.phone || null,
      advisor: profile.advisor || null,
      grant_type: profile.grant_type || null,
      date_of_birth: profile.date_of_birth || null,
      address: profile.address || null,
      father_name: profile.father_name || null
    };
  }

  const profile = STAFF_PILOT_PROFILE[account.email] || {};
  return {
    ...account,
    study_status: DEFAULT_STUDY_STATUS,
    phone: profile.phone || null,
    address: profile.address || null,
    registration_date: profile.registration_date || '2024-09-01'
  };
};

const ACCOUNTS = [
  {
    email: process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL,
    password_env: 'SUPERADMIN_BOOTSTRAP_PASSWORD',
    name: process.env.SUPERADMIN_NAME || 'Erbol Abdusatov',
    role: 'admin',
    avatar: 'EA',
    is_superadmin: 1
  },
  {
    email: 'admin@alatoo.edu.kg',
    password_env: 'SEED_ADMIN_PASSWORD',
    name: 'CampusOS Admin',
    role: 'admin',
    avatar: 'CA'
  },
  {
    email: 'teacher@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Azhar Kazakbaeva',
    role: 'teacher',
    avatar: 'AK',
    faculty: FACULTY,
    major: 'Cybersecurity'
  },
  {
    email: 'askar.eskendirov@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Askar Eskendirov',
    role: 'teacher',
    avatar: 'AE',
    faculty: FACULTY,
    major: 'Networks and Infrastructure'
  },
  {
    email: 'diana.sadykova@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Diana Sadykova',
    role: 'teacher',
    avatar: 'DS',
    faculty: FACULTY,
    major: 'Data Science'
  },
  {
    email: 'nurlan.toktonaliev@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Nurlan Toktonaliev',
    role: 'teacher',
    avatar: 'NT',
    faculty: FACULTY,
    major: 'Software Engineering'
  },
  {
    student_id: '240141052',
    email: 'erbol.abdusaitov1@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Erbol Abdusaitov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'EA',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141053',
    email: 'aida.bekmuratova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Aida Bekmuratova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'AB',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141054',
    email: 'nursultan.omurzakov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Nursultan Omurzakov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'NO',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141055',
    email: 'elina.toktosunova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Elina Toktosunova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'ET',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141056',
    email: 'timur.asanov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Timur Asanov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'TA',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141057',
    email: 'madina.saparova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Madina Saparova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'MS',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141058',
    email: 'daniyar.kasymov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Daniyar Kasymov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'DK',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141059',
    email: 'aizirek.iskakova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Aizirek Iskakova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'AI',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141060',
    email: 'bekzat.umetaliev@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Bekzat Umetaliev',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'BU',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141061',
    email: 'alina.janybekova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Alina Janybekova',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'AJ',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141062',
    email: 'ruslan.kudaibergenov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Ruslan Kudaibergenov',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'RK',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141063',
    email: 'meerim.ryskulova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Meerim Ryskulova',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '2-Group',
    avatar: 'MR',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141064',
    email: 'adilet.turgunbaev@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Adilet Turgunbaev',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '2-Group',
    avatar: 'AT',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  }
].map(enrichPilotAccount);

const COURSES = [
  {
    code: 'CYB201',
    name: 'Cybersecurity Fundamentals',
    description: 'Core security principles, threat modeling, and applied defense workflows.',
    credits: 4,
    semester: 'Spring 2026',
    teacherEmail: 'teacher@alatoo.edu.kg'
  },
  {
    code: 'NET220',
    name: 'Network Defense',
    description: 'Monitoring, segmentation, incident response, and secure network design.',
    credits: 4,
    semester: 'Spring 2026',
    teacherEmail: 'askar.eskendirov@alatoo.edu.kg'
  },
  {
    code: 'WEB310',
    name: 'Secure Web Development',
    description: 'Building resilient web apps with secure auth, input validation, and testing.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'nurlan.toktonaliev@alatoo.edu.kg'
  },
  {
    code: 'DAT305',
    name: 'Academic Data Analytics',
    description: 'Practical analytics, dashboards, and data interpretation for campus systems.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'diana.sadykova@alatoo.edu.kg'
  },
  {
    code: 'DEV230',
    name: 'DevOps Fundamentals',
    description: 'Version control, CI/CD, environments, and deployment basics for web teams.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'nurlan.toktonaliev@alatoo.edu.kg'
  },
  {
    code: 'UX210',
    name: 'Human-Computer Interaction',
    description: 'User journeys, interface critiques, prototyping, and accessibility basics.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'diana.sadykova@alatoo.edu.kg'
  }
];

const ENROLLMENTS = {
  'erbol.abdusaitov1@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'aida.bekmuratova@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'nursultan.omurzakov@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'elina.toktosunova@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'timur.asanov@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'madina.saparova@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'daniyar.kasymov@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'aizirek.iskakova@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'bekzat.umetaliev@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'alina.janybekova@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'ruslan.kudaibergenov@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'meerim.ryskulova@alatoo.edu.kg': ['DEV230', 'UX210'],
  'adilet.turgunbaev@alatoo.edu.kg': ['DEV230', 'UX210']
};

const SCHEDULE_BLUEPRINTS = [
  {
    courseCode: 'CYB201',
    day: 'Monday',
    slots: ['08:00-08:40', '08:45-09:25'],
    group_name: 'CYB-23',
    audience_type: 'group',
    room: 'A-301'
  },
  {
    courseCode: 'NET220',
    day: 'Tuesday',
    slots: ['10:15-10:55', '11:00-11:40'],
    group_name: 'CYB-23',
    audience_type: 'group',
    room: 'A-204'
  },
  {
    courseCode: 'WEB310',
    day: 'Wednesday',
    slots: ['13:10-13:55', '14:00-14:40'],
    group_name: 'CYB-23',
    audience_type: 'subgroup',
    subgroup_name: '1-Group',
    room: 'Lab-2'
  },
  {
    courseCode: 'DAT305',
    day: 'Thursday',
    slots: ['13:10-13:55', '14:00-14:40'],
    group_name: 'CYB-23',
    audience_type: 'subgroup',
    subgroup_name: '2-Group',
    room: 'Data-1'
  },
  {
    courseCode: 'DEV230',
    day: 'Monday',
    slots: ['11:45-12:25', '12:30-13:10'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'B-110'
  },
  {
    courseCode: 'UX210',
    day: 'Friday',
    slots: ['09:30-10:10', '10:15-10:55'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'Media-3'
  },
  {
    courseCode: 'DAT305',
    day: 'Wednesday',
    slots: ['15:30-16:10'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'Analytics Hub'
  },
  {
    courseCode: 'CYB201',
    day: 'Thursday',
    slots: ['16:15-16:55'],
    group_name: 'CYB-23',
    audience_type: 'individual',
    studentEmail: 'erbol.abdusaitov1@alatoo.edu.kg',
    room: 'Mentor Room'
  },
  {
    courseCode: 'UX210',
    day: 'Friday',
    slots: ['14:45-15:25'],
    group_name: 'SE-23',
    audience_type: 'individual',
    studentEmail: 'alina.janybekova@alatoo.edu.kg',
    room: 'Design Studio'
  }
];

const ASSIGNMENT_BLUEPRINTS = [
  {
    courseCode: 'CYB201',
    title: 'Threat Model Review',
    description: 'Map assets, attack paths, and mitigations for the campus portal login flow.',
    dueOffsetDays: -3,
    dueTime: '17:00',
    maxGrade: 100
  },
  {
    courseCode: 'NET220',
    title: 'SOC Incident Timeline',
    description: 'Build an incident timeline from firewall, IDS, and endpoint alerts.',
    dueOffsetDays: 1,
    dueTime: '18:00',
    maxGrade: 100
  },
  {
    courseCode: 'WEB310',
    title: 'Secure Auth Hardening Lab',
    description: 'Document auth risks, validation gaps, and remediation steps for the demo app.',
    dueOffsetDays: 3,
    dueTime: '16:30',
    maxGrade: 100
  },
  {
    courseCode: 'DAT305',
    title: 'Attendance Analytics Snapshot',
    description: 'Prepare a short analytics brief with attendance trends, risks, and summary metrics.',
    dueOffsetDays: 6,
    dueTime: '12:00',
    maxGrade: 100
  },
  {
    courseCode: 'DEV230',
    title: 'Deployment Runbook Draft',
    description: 'Write a concise release checklist for the Render deployment and rollback path.',
    dueOffsetDays: -1,
    dueTime: '19:00',
    maxGrade: 100
  },
  {
    courseCode: 'UX210',
    title: 'Accessibility Critique',
    description: 'Review the teacher dashboard and propose focused usability and accessibility fixes.',
    dueOffsetDays: 2,
    dueTime: '15:00',
    maxGrade: 100
  },
  {
    courseCode: 'DAT305',
    title: 'Grade Audit Storyboard',
    description: 'Explain how grade changes move through audit trail, analytics, and reporting.',
    dueOffsetDays: 9,
    dueTime: '11:00',
    maxGrade: 100
  },
  {
    courseCode: 'DEV230',
    title: 'CI Health Check Memo',
    description: 'Summarize pipeline status, deploy blockers, and the next stabilization actions.',
    dueOffsetDays: 12,
    dueTime: '17:30',
    maxGrade: 100
  }
];

const EXAM_BLUEPRINTS = [
  {
    key: 'cyb23-midterm',
    courseCode: 'CYB201',
    group_name: 'CYB-23',
    subject: 'Cybersecurity Fundamentals',
    type: 'Midterm',
    room: 'A-301',
    examOffsetDays: -20,
    exam_time: '09:00',
    audience: { group_name: 'CYB-23', courseCode: 'CYB201' }
  },
  {
    key: 'cyb23-net-lab',
    courseCode: 'NET220',
    group_name: 'CYB-23',
    subject: 'Network Defense',
    type: 'Lab Quiz',
    room: 'A-204',
    examOffsetDays: -11,
    exam_time: '11:00',
    audience: { group_name: 'CYB-23', courseCode: 'NET220' }
  },
  {
    key: 'cyb23-web-practical',
    courseCode: 'WEB310',
    group_name: 'CYB-23 / 1-Group',
    subject: 'Secure Web Development',
    type: 'Practical',
    room: 'Lab-2',
    examOffsetDays: -4,
    exam_time: '14:00',
    audience: { group_name: 'CYB-23', subgroup_name: '1-Group', courseCode: 'WEB310' }
  },
  {
    key: 'cyb23-data-defense',
    courseCode: 'DAT305',
    group_name: 'CYB-23 / 2-Group',
    subject: 'Academic Data Analytics',
    type: 'Project Defense',
    room: 'Data-1',
    examOffsetDays: 2,
    exam_time: '13:30',
    audience: { group_name: 'CYB-23', subgroup_name: '2-Group', courseCode: 'DAT305' }
  },
  {
    key: 'se23-devops-review',
    courseCode: 'DEV230',
    group_name: 'SE-23',
    subject: 'DevOps Fundamentals',
    type: 'Sprint Review',
    room: 'B-110',
    examOffsetDays: -8,
    exam_time: '12:00',
    audience: { group_name: 'SE-23', courseCode: 'DEV230' }
  },
  {
    key: 'se23-ux-pitch',
    courseCode: 'UX210',
    group_name: 'SE-23',
    subject: 'Human-Computer Interaction',
    type: 'Prototype Pitch',
    room: 'Media-3',
    examOffsetDays: 1,
    exam_time: '10:00',
    audience: { group_name: 'SE-23', courseCode: 'UX210' }
  },
  {
    key: 'se23-data-midterm',
    courseCode: 'DAT305',
    group_name: 'SE-23 / Analytics Track',
    subject: 'Academic Data Analytics',
    type: 'Midterm',
    room: 'Analytics Hub',
    examOffsetDays: 6,
    exam_time: '15:00',
    audience: { group_name: 'SE-23', courseCode: 'DAT305' }
  },
  {
    key: 'se23-devops-final',
    courseCode: 'DEV230',
    group_name: 'SE-23 / 2-Group',
    subject: 'DevOps Fundamentals',
    type: 'Final Exam',
    room: 'B-112',
    examOffsetDays: 10,
    exam_time: '09:30',
    audience: { group_name: 'SE-23', subgroup_name: '2-Group', courseCode: 'DEV230' }
  }
];

const GRADE_BLUEPRINTS = {
  'cyb23-midterm': [
    {
      studentId: '240141052',
      grade: 92,
      comments: 'Strong threat modeling and clear mitigation priorities.',
      initialGrade: 88,
      initialComments: 'Solid first pass before rubric normalization.'
    },
    {
      studentId: '240141053',
      grade: 95,
      comments: 'Excellent depth, clean evidence trail, and precise controls.'
    },
    {
      studentId: '240141054',
      grade: 84,
      comments: 'Good structure with a few missing response details.'
    },
    {
      studentId: '240141055',
      grade: 90,
      comments: 'Consistent reasoning and well-organized submission.'
    },
    {
      studentId: '240141056',
      grade: 78,
      comments: 'Understands the core flow but needs tighter risk prioritization.'
    },
    {
      studentId: '240141057',
      grade: 88,
      comments: 'Clear analysis with minor gaps in attack surface coverage.'
    },
    {
      studentId: '240141058',
      grade: 71,
      comments: 'Passing result, but documentation needs more precision.'
    },
    {
      studentId: '240141059',
      grade: 93,
      comments: 'Balanced technical detail and strong incident reasoning.'
    }
  ],
  'cyb23-net-lab': [
    {
      studentId: '240141052',
      grade: 89,
      comments: 'Accurate incident triage and strong packet analysis.'
    },
    {
      studentId: '240141053',
      grade: 91,
      comments: 'Very good segmentation logic and clean incident notes.'
    },
    {
      studentId: '240141054',
      grade: 82,
      comments: 'Reliable result with minor escalation gaps.'
    },
    {
      studentId: '240141055',
      grade: 86,
      comments: 'Good work overall with clearer handoff notes needed.'
    },
    {
      studentId: '240141056',
      grade: 74,
      comments: 'Needs stronger evidence linkage between alerts and action.',
      initialGrade: 69,
      initialComments: 'Initial scoring before the log appendix was reviewed.'
    },
    {
      studentId: '240141057',
      grade: 87,
      comments: 'Confident analysis and strong response timeline.'
    },
    {
      studentId: '240141058',
      grade: 68,
      comments: 'Multiple correct findings, but the final response was incomplete.'
    },
    {
      studentId: '240141059',
      grade: 90,
      comments: 'Strong technical signal correlation and good recommendations.'
    }
  ],
  'se23-devops-review': [
    {
      studentId: '240141060',
      grade: 93,
      comments: 'Clean deployment reasoning and strong rollback plan.'
    },
    {
      studentId: '240141061',
      grade: 88,
      comments: 'Good operational judgment and consistent release notes.'
    },
    {
      studentId: '240141062',
      grade: 85,
      comments: 'Solid delivery with a few missing observability checks.'
    },
    {
      studentId: '240141063',
      grade: 79,
      comments: 'Understands the flow, but execution details need more polish.'
    },
    {
      studentId: '240141064',
      grade: 83,
      comments: 'Good runbook coverage with smaller gaps in failure handling.'
    }
  ]
};

const ATTENDANCE_SCENARIOS = [
  {
    schedule: {
      courseCode: 'CYB201',
      day: 'Monday',
      time_slot: '08:00-08:40',
      group_name: 'CYB-23',
      audience_type: 'group'
    },
    recentOccurrences: 2
  },
  {
    schedule: {
      courseCode: 'NET220',
      day: 'Tuesday',
      time_slot: '10:15-10:55',
      group_name: 'CYB-23',
      audience_type: 'group'
    },
    recentOccurrences: 2
  },
  {
    schedule: {
      courseCode: 'WEB310',
      day: 'Wednesday',
      time_slot: '13:10-13:55',
      group_name: 'CYB-23',
      audience_type: 'subgroup',
      subgroup_name: '1-Group'
    },
    recentOccurrences: 1
  },
  {
    schedule: {
      courseCode: 'DEV230',
      day: 'Monday',
      time_slot: '11:45-12:25',
      group_name: 'SE-23',
      audience_type: 'group'
    },
    recentOccurrences: 2
  },
  {
    schedule: {
      courseCode: 'UX210',
      day: 'Friday',
      time_slot: '09:30-10:10',
      group_name: 'SE-23',
      audience_type: 'group'
    },
    recentOccurrences: 2
  },
  {
    schedule: {
      courseCode: 'DAT305',
      day: 'Wednesday',
      time_slot: '15:30-16:10',
      group_name: 'SE-23',
      audience_type: 'group'
    },
    recentOccurrences: 1
  },
  {
    schedule: {
      courseCode: 'CYB201',
      day: 'Thursday',
      time_slot: '16:15-16:55',
      group_name: 'CYB-23',
      audience_type: 'individual',
      studentEmail: 'erbol.abdusaitov1@alatoo.edu.kg'
    },
    recentOccurrences: 1
  }
];

const ATTENDANCE_STUDENT_PATTERNS = {
  '240141052': ['present', 'late', 'present', 'present'],
  '240141056': ['present', 'excused', 'present', 'late'],
  '240141058': ['absent', 'late', 'present', 'absent'],
  '240141061': ['present', 'present', 'excused', 'present'],
  '240141063': ['late', 'absent', 'present', 'present'],
  '240141064': ['present', 'present', 'late', 'present']
};

const FALLBACK_ATTENDANCE_PATTERN = ['present', 'present', 'present', 'late', 'present'];
const WEEKDAY_INDEX_BY_NAME = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

const COURSE_BLUEPRINTS_BY_CODE = new Map(COURSES.map((course) => [course.code, course]));

module.exports = {
  ACCOUNTS,
  ASSIGNMENT_BLUEPRINTS,
  ATTENDANCE_SCENARIOS,
  ATTENDANCE_STUDENT_PATTERNS,
  COURSES,
  COURSE_BLUEPRINTS_BY_CODE,
  ENROLLMENTS,
  EXAM_BLUEPRINTS,
  FALLBACK_ATTENDANCE_PATTERN,
  GRADE_BLUEPRINTS,
  PRESENTATION_SEMESTER,
  SCHEDULE_BLUEPRINTS,
  WEEKDAY_INDEX_BY_NAME
};
