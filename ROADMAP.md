# CampusOS Roadmap

## Текущее состояние проекта

CampusOS уже вышел за рамки учебного каркаса и сейчас выглядит как рабочий MVP академического портала.

### Уже реализовано

- авторизация по email и student ID
- роли `student`, `teacher`, `admin`, `superadmin`
- управление пользователями и профилями
- управление курсами и назначение преподавателя
- запись студентов на курсы
- экзамены и выставление оценок
- объявления / messages
- задания и академические записи
- расписание для групп, подгрупп и индивидуальных занятий
- drag-to-copy сценарий в расписании
- attendance management для преподавателя и история посещаемости для студента
- тёмная и светлая тема
- Render deploy blueprint
- SQLite / PostgreSQL dual database support
- security scripts: audit, secret scan, ZAP baseline

---

## Ближайший приоритет

### 1. Stabilization

- [√] покрыть критические backend-маршруты тестами
- [√] проверить сценарии ролей на регрессии после последних UI-изменений
- [√] привести root API response и служебные тексты к бренду `CampusOS`
- [√] убрать оставшиеся точечные CSS-конфликты в старых страницах
- [√] подготовить staging-конфигурацию отдельно от production

### 2. Data readiness

- [√] добавить безопасный импорт студентов, преподавателей и предметов из CSV / Excel
- [√] подготовить read-only pipeline для тестовых университетских выгрузок
- [√] нормализовать сиды под более реалистичный pilot dataset
- [√] описать карту соответствия внешних данных и текущей схемы БД

### 3. Teacher workflow polish

- [ ] сделать табличный режим attendance с ещё более быстрым массовым вводом
- [ ] добавить batch edit для schedule
- [ ] улучшить teacher-view assignments и exam flows
- [ ] добавить audit trail для изменений оценок и attendance

---

## Product roadmap

### Phase 1 — Web MVP hardening

Цель: довести текущую веб-платформу до стабильного pilot-ready состояния.

- [ ] завершить UI polish по основным страницам
- [ ] унифицировать формы, таблицы и фильтры
- [ ] улучшить пустые состояния и системные сообщения
- [ ] сделать предсказуемую работу со staging и production env
- [ ] формализовать seed / cleanup / deploy flow

### Phase 2 — Admin and academic operations

Цель: усилить ежедневную работу администрации и преподавателей.

- [ ] массовое создание пользователей
- [ ] массовое назначение преподавателей на курсы
- [ ] массовая запись студентов на предметы
- [ ] генерация академических списков и operational reports
- [ ] import/export для управленческих сценариев

### Phase 3 — Integration layer

Цель: превратить CampusOS в удобный единый портал поверх существующих систем университета.

- [ ] read-only integration с системами выбора предметов
- [ ] read-only integration с системами оценок и посещаемости
- [ ] единый dashboard поверх нескольких источников
- [ ] reconciliation layer для конфликтующих данных
- [ ] ручные override-сценарии для администрации

### Phase 4 — Analytics and communication

Цель: сделать продукт не только учётным, но и аналитическим.

- [ ] performance dashboards по студентам и группам
- [ ] attendance analytics
- [ ] risk flags для академических проблем
- [ ] расширенные announcements / notification flows
- [ ] экспорт отчётов для факультета и деканата

### Phase 5 — Mobile direction

Цель: перейти к скачиваемому мобильному приложению после стабилизации web.

- [ ] подготовить web API contract под mobile client
- [ ] решить, идти через PWA / Capacitor / отдельный Android client
- [ ] собрать мобильный pilot после стабилизации web MVP

---

## Technical roadmap

### Backend

- [x] Node.js + Express API
- [x] JWT auth
- [x] SQLite support
- [x] PostgreSQL support
- [x] seed and cleanup scripts
- [ ] полноценные миграции версий схемы
- [ ] audit logging
- [ ] background jobs / queue for imports and notifications

### Frontend

- [x] React + Vite SPA
- [x] role-based navigation
- [x] theme switcher
- [x] branded UI
- [x] optimized attendance workspace
- [ ] stronger form consistency across all admin pages
- [ ] better table mode for data-heavy pages
- [ ] broader accessibility pass

### Security

- [x] `helmet`
- [x] `cors`
- [x] rate limiting
- [x] `npm audit` flow
- [x] `eslint-plugin-security`
- [x] local secret scan
- [x] OWASP ZAP baseline
- [ ] remove remaining risky defaults from production configuration
- [ ] harden token storage strategy
- [ ] add security checklist to release process

### DevOps

- [x] Render blueprint
- [x] PostgreSQL deployment path
- [x] health endpoint
- [ ] CI pipeline
- [ ] automated tests in deploy gate
- [ ] error monitoring
- [ ] backup and restore playbook

---

## Product principles

### 1. Web first

Сначала стабилизируем и завершаем веб-платформу.  
Android-версия идёт после того, как web MVP перестанет быстро меняться.

### 2. Replace carefully

CampusOS не обязан сразу заменять существующие университетские платформы.  
Более реалистичная стратегия — сначала стать единым удобным интерфейсом поверх текущих систем.

### 3. Operator-friendly UX

Приоритет не только в красоте интерфейса, а в скорости повседневной работы:

- меньше лишнего скролла
- меньше повторяющихся действий
- быстрее массовые операции
- понятнее роли и доступы

---

## Success criteria for next milestone

- [ ] pilot-ready web version without critical auth/data issues
- [ ] актуальная документация без расхождений с кодом
- [ ] staging dataset, похожий на реальные университетские данные
- [ ] готовность показать систему преподавателям и администрации
