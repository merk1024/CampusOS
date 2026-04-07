export const SETTINGS_KEY = 'lms_app_settings';

export const DEFAULT_APP_SETTINGS = {
  language: 'English',
  defaultPage: 'dashboard',
  reminderMode: 'All notifications',
  density: 'Comfortable',
  theme: null
};

const SUPPORTED_LANGUAGES = ['English', 'Kyrgyz'];

const LANGUAGE_TO_LOCALE = {
  English: 'en-GB',
  Russian: 'ru-RU',
  Kyrgyz: 'ky-KG'
};

const LANGUAGE_TO_HTML_LANG = {
  English: 'en',
  Russian: 'ru',
  Kyrgyz: 'ky'
};

const LANGUAGE_LABELS = {
  English: {
    English: 'English',
    Kyrgyz: 'Англисче'
  },
  Kyrgyz: {
    English: 'Kyrgyz',
    Kyrgyz: 'Кыргызча'
  }
};

const normalizeLanguage = (language) => {
  if (language === 'Russian') {
    return 'Kyrgyz';
  }

  return SUPPORTED_LANGUAGES.includes(language) ? language : 'English';
};

const PAGE_LABELS = {
  dashboard: {
    English: 'Dashboard',
    Russian: 'Панель',
    Kyrgyz: 'Башкы бет'
  },
  courses: {
    English: 'Courses',
    Russian: 'Курсы',
    Kyrgyz: 'Курстар'
  },
  schedule: {
    English: 'Schedule',
    Russian: 'Расписание',
    Kyrgyz: 'Жадыбал'
  },
  profile: {
    English: 'Profile',
    Russian: 'Профиль',
    Kyrgyz: 'Профиль'
  },
  messages: {
    English: 'Messages',
    Russian: 'Сообщения',
    Kyrgyz: 'Билдирүүлөр'
  }
};

const SHELL_COPY = {
  English: {
    app: {
      loading: 'Loading...'
    },
    nav: {
      dashboard: 'Dashboard',
      courses: 'Courses',
      schedule: 'Schedule',
      exams: 'Exams',
      grades: 'Grades',
      assignments: 'Assignments',
      attendance: 'Attendance',
      messages: 'Messages',
      profile: 'Profile',
      userManagement: 'User Management',
      integrations: 'Integrations'
    },
    header: {
      openNavigation: 'Open navigation',
      openDashboard: 'Open dashboard',
      portal: 'Portal',
      searchPlaceholder: 'Search courses, assignments...',
      searchLabel: 'Search CampusOS content',
      light: 'Light',
      dark: 'Dark',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      openMessages: 'Open messages',
      messages: 'Messages',
      installApp: 'Install CampusOS app',
      openSettings: 'Open settings',
      settings: 'Settings',
      openUserMenu: 'Open user menu',
      profile: 'Profile',
      logout: 'Logout'
    },
    footer: {
      copyright: 'Copyright {year} CampusOS by Alatoo University. All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      support: 'Support'
    },
    login: {
      brandTitle: 'Academic operations, unified.',
      brandBody: 'CampusOS brings courses, grading, attendance, and scheduling into one calm workspace for students, instructors, and campus teams.',
      welcome: 'Welcome Back',
      subtitle: 'Sign in with your email or student number',
      loginLabel: 'Email or Student ID',
      passwordLabel: 'Password',
      rememberMe: 'Remember me',
      signingIn: 'Signing In...',
      signIn: 'Sign In',
      features: [
        {
          badge: 'CRS',
          title: 'Courses in one place',
          body: 'Materials, assignments, and semester progress stay aligned.'
        },
        {
          badge: 'GRD',
          title: 'Live academic progress',
          body: 'Check grades, results, and performance signals without friction.'
        },
        {
          badge: 'SCH',
          title: 'Schedule visibility',
          body: 'Stay on top of classes, exams, and attendance from one dashboard.'
        },
        {
          badge: 'MSG',
          title: 'Clear communication',
          body: 'Announcements and updates reach the right people at the right time.'
        }
      ]
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage workspace preferences, interface density, theme, and quick navigation.',
      saveSuccess: 'Settings saved successfully.',
      saveError: 'Settings could not be saved locally.',
      saveErrorTitle: 'Settings could not be saved',
      saveSuccessTitle: 'Settings updated',
      summaryTheme: 'Theme',
      summaryLanguage: 'Language',
      summaryDefaultPage: 'Default page',
      summaryDensity: 'Density',
      summaryMobile: 'Mobile pilot',
      workspaceTitle: 'Workspace preferences',
      workspaceSubtitle: 'Choose how CampusOS should feel when you open it every day.',
      language: 'Language',
      defaultPage: 'Default page',
      notifications: 'Notifications',
      density: 'Layout density',
      theme: 'Theme',
      saveButton: 'Save settings',
      quickActions: 'Quick actions',
      quickActionsBody: 'Signed in as {role}. Jump straight into your most-used workspace pages.',
      openProfile: 'Open profile',
      openMessages: 'Open messages',
      openSchedule: 'Open schedule',
      reminderAll: 'All notifications',
      reminderImportant: 'Only important',
      reminderExam: 'Only exams',
      reminderOff: 'Off',
      densityComfortable: 'Comfortable',
      densityCompact: 'Compact',
      mobileTitle: 'Mobile pilot',
      mobileSubtitle: 'CampusOS now supports a PWA-first mobile install flow for Android-style home screen access.',
      mobileDirection: 'Direction',
      mobileDirectionValue: 'PWA-first, Capacitor-ready',
      mobileDirectionBody: 'We are using the web app as the first mobile pilot so the same product can be installed now and wrapped later if store distribution becomes necessary.',
      mobileStatus: 'Install status',
      mobileInstalled: 'Installed',
      mobileReady: 'Ready to install',
      mobileBrowser: 'Use a supported mobile browser',
      mobileInstalledBody: 'CampusOS is already installed on this device.',
      mobileReadyBody: 'Use the install button below to add CampusOS to the home screen.',
      mobileBrowserBody: 'If the install button is missing, open CampusOS in Chrome or Edge on Android and use the browser install option.',
      mobileInstallButton: 'Install CampusOS app',
      mobileInstalling: 'Installing...',
      mobileInstalledButton: 'Already installed',
      mobileBrowserButton: 'Install from mobile browser'
    }
  },
  Russian: {
    app: {
      loading: 'Загрузка...'
    },
    nav: {
      dashboard: 'Панель',
      courses: 'Курсы',
      schedule: 'Расписание',
      exams: 'Экзамены',
      grades: 'Оценки',
      assignments: 'Задания',
      attendance: 'Посещаемость',
      messages: 'Сообщения',
      profile: 'Профиль',
      userManagement: 'Пользователи',
      integrations: 'Интеграции'
    },
    header: {
      openNavigation: 'Открыть навигацию',
      openDashboard: 'Открыть панель',
      portal: 'Портал',
      searchPlaceholder: 'Поиск курсов, заданий...',
      searchLabel: 'Поиск по CampusOS',
      light: 'Светлая',
      dark: 'Тёмная',
      switchToLight: 'Переключить на светлую тему',
      switchToDark: 'Переключить на тёмную тему',
      openMessages: 'Открыть сообщения',
      messages: 'Сообщения',
      installApp: 'Установить CampusOS',
      openSettings: 'Открыть настройки',
      settings: 'Настройки',
      openUserMenu: 'Открыть меню пользователя',
      profile: 'Профиль',
      logout: 'Выйти'
    },
    footer: {
      copyright: 'Copyright {year} CampusOS by Alatoo University. Все права защищены.',
      privacy: 'Политика конфиденциальности',
      terms: 'Условия использования',
      support: 'Поддержка'
    },
    login: {
      brandTitle: 'Учебные процессы в одном месте.',
      brandBody: 'CampusOS объединяет курсы, оценки, посещаемость и расписание в одном удобном рабочем пространстве для студентов, преподавателей и администрации.',
      welcome: 'С возвращением',
      subtitle: 'Войдите с помощью email или студенческого номера',
      loginLabel: 'Email или Student ID',
      passwordLabel: 'Пароль',
      rememberMe: 'Запомнить меня',
      signingIn: 'Вход...',
      signIn: 'Войти',
      features: [
        {
          badge: 'CRS',
          title: 'Курсы в одном месте',
          body: 'Материалы, задания и прогресс семестра остаются синхронизированными.'
        },
        {
          badge: 'GRD',
          title: 'Живой академический прогресс',
          body: 'Проверяйте оценки, результаты и сигналы успеваемости без лишних шагов.'
        },
        {
          badge: 'SCH',
          title: 'Понятное расписание',
          body: 'Следите за занятиями, экзаменами и посещаемостью из одной панели.'
        },
        {
          badge: 'MSG',
          title: 'Чёткая коммуникация',
          body: 'Объявления и обновления доходят до нужных людей вовремя.'
        }
      ]
    },
    settings: {
      title: 'Настройки',
      subtitle: 'Управляйте параметрами рабочего пространства, плотностью интерфейса, темой и быстрыми переходами.',
      saveSuccess: 'Настройки успешно сохранены.',
      saveError: 'Не удалось сохранить настройки локально.',
      saveErrorTitle: 'Настройки не сохранены',
      saveSuccessTitle: 'Настройки обновлены',
      summaryTheme: 'Тема',
      summaryLanguage: 'Язык',
      summaryDefaultPage: 'Стартовая страница',
      summaryDensity: 'Плотность',
      summaryMobile: 'Мобильный режим',
      workspaceTitle: 'Параметры рабочего пространства',
      workspaceSubtitle: 'Выберите, как должен ощущаться CampusOS при ежедневной работе.',
      language: 'Язык',
      defaultPage: 'Стартовая страница',
      notifications: 'Уведомления',
      density: 'Плотность интерфейса',
      theme: 'Тема',
      saveButton: 'Сохранить настройки',
      quickActions: 'Быстрые действия',
      quickActionsBody: 'Вы вошли как {role}. Быстро переходите в самые нужные разделы.',
      openProfile: 'Открыть профиль',
      openMessages: 'Открыть сообщения',
      openSchedule: 'Открыть расписание',
      reminderAll: 'Все уведомления',
      reminderImportant: 'Только важные',
      reminderExam: 'Только экзамены',
      reminderOff: 'Выключено',
      densityComfortable: 'Обычная',
      densityCompact: 'Компактная',
      mobileTitle: 'Мобильный режим',
      mobileSubtitle: 'CampusOS уже поддерживает PWA-first установку на Android и похожий app-опыт.',
      mobileDirection: 'Направление',
      mobileDirectionValue: 'Сначала PWA, затем Capacitor',
      mobileDirectionBody: 'Сейчас мы используем веб-версию как первый мобильный пилот, чтобы один и тот же продукт можно было установить уже сейчас, а позже упаковать в store-формат.',
      mobileStatus: 'Статус установки',
      mobileInstalled: 'Установлено',
      mobileReady: 'Готово к установке',
      mobileBrowser: 'Нужен поддерживаемый мобильный браузер',
      mobileInstalledBody: 'CampusOS уже установлен на этом устройстве.',
      mobileReadyBody: 'Используйте кнопку ниже, чтобы добавить CampusOS на главный экран.',
      mobileBrowserBody: 'Если кнопки установки нет, откройте CampusOS в Chrome или Edge на Android и используйте установку из меню браузера.',
      mobileInstallButton: 'Установить CampusOS',
      mobileInstalling: 'Установка...',
      mobileInstalledButton: 'Уже установлено',
      mobileBrowserButton: 'Установить из браузера'
    }
  },
  Kyrgyz: {
    app: {
      loading: 'Жүктөлүүдө...'
    },
    nav: {
      dashboard: 'Башкы бет',
      courses: 'Курстар',
      schedule: 'Жадыбал',
      exams: 'Экзамендер',
      grades: 'Баалар',
      assignments: 'Тапшырмалар',
      attendance: 'Катышуу',
      messages: 'Билдирүүлөр',
      profile: 'Профиль',
      userManagement: 'Колдонуучулар',
      integrations: 'Интеграциялар'
    },
    header: {
      openNavigation: 'Навигацияны ачуу',
      openDashboard: 'Башкы бетти ачуу',
      portal: 'Портал',
      searchPlaceholder: 'Курстарды, тапшырмаларды издөө...',
      searchLabel: 'CampusOS боюнча издөө',
      light: 'Жарык',
      dark: 'Караңгы',
      switchToLight: 'Жарык темага өтүү',
      switchToDark: 'Караңгы темага өтүү',
      openMessages: 'Билдирүүлөрдү ачуу',
      messages: 'Билдирүүлөр',
      installApp: 'CampusOS колдонмосун орнотуу',
      openSettings: 'Жөндөөлөрдү ачуу',
      settings: 'Жөндөөлөр',
      openUserMenu: 'Колдонуучу менюсун ачуу',
      profile: 'Профиль',
      logout: 'Чыгуу'
    },
    footer: {
      copyright: 'Copyright {year} CampusOS by Alatoo University. Бардык укуктар корголгон.',
      privacy: 'Купуялык саясаты',
      terms: 'Колдонуу шарттары',
      support: 'Колдоо'
    },
    login: {
      brandTitle: 'Окуу процесстери бир жерде.',
      brandBody: 'CampusOS курстарды, бааларды, катышууну жана жадыбалды студенттер, окутуучулар жана администрация үчүн бир ыңгайлуу мейкиндикке бириктирет.',
      welcome: 'Кош келиңиз',
      subtitle: 'Email же студенттик номер менен кириңиз',
      loginLabel: 'Email же Student ID',
      passwordLabel: 'Сырсөз',
      rememberMe: 'Эсимде сакта',
      signingIn: 'Кирүүдө...',
      signIn: 'Кирүү',
      features: [
        {
          badge: 'CRS',
          title: 'Курстар бир жерде',
          body: 'Материалдар, тапшырмалар жана семестрдик прогресс бир нукта турат.'
        },
        {
          badge: 'GRD',
          title: 'Жандуу академиялык прогресс',
          body: 'Бааларды, жыйынтыктарды жана окуу көрсөткүчтөрүн тез көрүңүз.'
        },
        {
          badge: 'SCH',
          title: 'Түшүнүктүү жадыбал',
          body: 'Сабактарды, экзамендерди жана катышууну бир панелден көзөмөлдөңүз.'
        },
        {
          badge: 'MSG',
          title: 'Так байланыш',
          body: 'Жаңылыктар жана эскертүүлөр керектүү адамдарга өз убагында жетет.'
        }
      ]
    },
    settings: {
      title: 'Жөндөөлөр',
      subtitle: 'Жумуш мейкиндигинин параметрлерин, интерфейс тыгыздыгын, теманы жана тез өтүүлөрдү башкарыңыз.',
      saveSuccess: 'Жөндөөлөр ийгиликтүү сакталды.',
      saveError: 'Жөндөөлөрдү локалдуу сактоо мүмкүн болгон жок.',
      saveErrorTitle: 'Жөндөөлөр сакталган жок',
      saveSuccessTitle: 'Жөндөөлөр жаңырды',
      summaryTheme: 'Тема',
      summaryLanguage: 'Тил',
      summaryDefaultPage: 'Баштапкы бет',
      summaryDensity: 'Тыгыздык',
      summaryMobile: 'Мобилдик режим',
      workspaceTitle: 'Жумуш мейкиндигинин параметрлери',
      workspaceSubtitle: 'CampusOS күн сайын ачылганда кандай көрүнүштө болушун тандаңыз.',
      language: 'Тил',
      defaultPage: 'Баштапкы бет',
      notifications: 'Билдирүүлөр',
      density: 'Интерфейс тыгыздыгы',
      theme: 'Тема',
      saveButton: 'Жөндөөлөрдү сактоо',
      quickActions: 'Тез аракеттер',
      quickActionsBody: 'Сиз {role} болуп кирдиңиз. Көп колдонулган бөлүмдөргө тез өтүңүз.',
      openProfile: 'Профилди ачуу',
      openMessages: 'Билдирүүлөрдү ачуу',
      openSchedule: 'Жадыбалды ачуу',
      reminderAll: 'Бардык билдирүүлөр',
      reminderImportant: 'Маанилүүлөр гана',
      reminderExam: 'Экзамендер гана',
      reminderOff: 'Өчүк',
      densityComfortable: 'Кадимки',
      densityCompact: 'Ыкчам',
      mobileTitle: 'Мобилдик режим',
      mobileSubtitle: 'CampusOS азыр Android үчүн PWA-first орнотууну колдойт.',
      mobileDirection: 'Багыт',
      mobileDirectionValue: 'Алгач PWA, кийин Capacitor',
      mobileDirectionBody: 'Азыр веб-версия биринчи мобилдик пилот болуп кызмат кылат, кийинчерээк ошол эле продуктту store форматына ороп чыгарууга болот.',
      mobileStatus: 'Орнотуу абалы',
      mobileInstalled: 'Орнотулган',
      mobileReady: 'Орнотууга даяр',
      mobileBrowser: 'Колдоого алынган мобилдик браузер керек',
      mobileInstalledBody: 'CampusOS бул түзмөктө мурунтан эле орнотулган.',
      mobileReadyBody: 'Төмөнкү баскыч менен CampusOSту башкы экранга кошуңуз.',
      mobileBrowserBody: "Эгер орнотуу баскычы көрүнбөсө, CampusOSту Android'деги Chrome же Edge аркылуу ачып, браузер менюсунан орнотуңуз.",
      mobileInstallButton: 'CampusOSту орнотуу',
      mobileInstalling: 'Орнотулууда...',
      mobileInstalledButton: 'Мурунтан орнотулган',
      mobileBrowserButton: 'Браузерден орнотуу'
    }
  }
};

export const readAppSettings = () => {
  try {
    const stored = { ...DEFAULT_APP_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
    return {
      ...stored,
      language: normalizeLanguage(stored.language)
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const writeAppSettings = (patch) => {
  const nextSettings = { ...readAppSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  return nextSettings;
};

export const resolveStoredTheme = (storedTheme) => {
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

export const resolveAppSettings = (settings = DEFAULT_APP_SETTINGS) => ({
  ...DEFAULT_APP_SETTINGS,
  ...settings,
  language: normalizeLanguage(settings.language),
  theme: resolveStoredTheme(settings.theme)
});

export const getLocaleCode = (language) => LANGUAGE_TO_LOCALE[normalizeLanguage(language)] || LANGUAGE_TO_LOCALE.English;
export const getHtmlLangCode = (language) => LANGUAGE_TO_HTML_LANG[normalizeLanguage(language)] || LANGUAGE_TO_HTML_LANG.English;
export const getShellCopy = (language) => SHELL_COPY[normalizeLanguage(language)] || SHELL_COPY.English;
export const getDefaultPageLabel = (pageId, language) => PAGE_LABELS[pageId]?.[normalizeLanguage(language)] || PAGE_LABELS[pageId]?.English || pageId;
export const getLanguageLabel = (language, uiLanguage = 'English') => (
  LANGUAGE_LABELS[normalizeLanguage(language)]?.[normalizeLanguage(uiLanguage)]
  || LANGUAGE_LABELS[normalizeLanguage(language)]?.English
  || normalizeLanguage(language)
);

export const getReminderUnreadCount = (notifications = [], reminderMode = DEFAULT_APP_SETTINGS.reminderMode) => {
  const unreadNotifications = notifications.filter((notification) => !notification.is_read);

  if (reminderMode === 'Off') {
    return 0;
  }

  if (reminderMode === 'Only exams') {
    return unreadNotifications.filter((notification) => {
      const type = String(notification?.metadata?.type || '').toLowerCase();
      return type === 'exam';
    }).length;
  }

  if (reminderMode === 'Only important') {
    return unreadNotifications.filter((notification) => {
      const type = String(notification?.metadata?.type || '').toLowerCase();
      return type === 'important'
        || Boolean(notification?.metadata?.isPinned)
        || String(notification?.source_type || '').toLowerCase() === 'import';
    }).length;
  }

  return unreadNotifications.length;
};
