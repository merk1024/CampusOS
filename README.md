# CampusOS

CampusOS — это веб-платформа для управления учебным процессом университета.  
Проект объединяет курсы, расписание, экзамены, оценки, задания, посещаемость, объявления и управление пользователями в одной системе с ролями для студентов, преподавателей и администрации.

## Что уже умеет платформа

- авторизация по email или student ID
- роли `student`, `teacher`, `admin`, `superadmin`
- управление курсами и назначение преподавателя на предмет
- запись студентов на предметы
- групповое, подгрупповое и индивидуальное расписание
- экзамены и выставление оценок
- домашние задания и академические записи
- attendance management для преподавателя и история посещаемости для студента
- объявления и сообщения для пользователей
- профиль, настройки, светлая и тёмная тема
- админ-панель управления пользователями

## Текущий стек

**Frontend**

- React 19
- Vite
- CSS modules / global CSS without UI framework

**Backend**

- Node.js
- Express
- JWT authentication

**Database**

- SQLite для локальной разработки
- PostgreSQL для онлайн-развёртывания

**Security / quality**

- `helmet`
- `cors`
- `express-rate-limit`
- `eslint-plugin-security`
- `npm audit`
- локальный secret scan
- OWASP ZAP baseline script

## Структура проекта

```text
CampusOS/
├── backend/                 # API, auth, routes, seed, database adapters
├── frontend/                # React/Vite client
├── docs/                    # exported reports and documents
├── scripts/                 # security and reporting scripts
├── render.yaml              # Render blueprint
├── POSTGRES_DEPLOY.md       # краткие заметки по PostgreSQL deploy
├── ROADMAP.md               # product and technical roadmap
└── README.md
```

## Быстрый старт

### 1. Клонирование

```bash
git clone <repository_url>
cd CampusOS
```

### 2. Установка зависимостей

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 3. Настройка backend `.env`

Создайте `backend/.env` на основе `backend/.env.example`.

Минимальный локальный пример:

```env
PORT=5000
NODE_ENV=development
DB_CLIENT=sqlite
JWT_SECRET=change_me_for_local_dev
FRONTEND_URL=http://localhost:5173

SUPERADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_TEACHER_PASSWORD=ChangeMe123!
SEED_STUDENT_PASSWORD=ChangeMe123!
```

Важно:

- seed больше не содержит пароли в репозитории
- все seed-аккаунты создаются только из переменных окружения
- для production обязательно задайте новый сильный `JWT_SECRET`

### 4. Запуск backend

```bash
cd backend
npm run dev
```

API по умолчанию запускается на:

```text
http://localhost:5000
```

Проверка health endpoint:

```text
http://localhost:5000/health
```

### 5. Запуск frontend

```bash
cd frontend
npm run dev
```

Frontend по умолчанию доступен на:

```text
http://localhost:5173
```

### 6. Заполнение демо-данных

Перед сидированием задайте пароли в `backend/.env`, затем выполните:

```bash
cd backend
npm run seed
```

Что создаётся:

- супер-аккаунт владельца
- admin-аккаунт
- несколько преподавателей
- 13 студентов
- набор предметов
- записи студентов на курсы
- расписание для групп, подгрупп и индивидуальных занятий

Логин поддерживает:

- email
- student ID

## Работа с базой данных

### SQLite

Используется по умолчанию локально:

```env
DB_CLIENT=sqlite
```

Файл базы:

```text
backend/database.db
```

### PostgreSQL

Для Render или другого онлайн-хостинга переключение идёт через:

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

При запуске backend автоматически:

1. подключается к выбранной базе
2. применяет схему
3. добирает отсутствующие колонки миграцией адаптера

## Render deploy

В репозитории уже есть `render.yaml` для production и `render.staging.yaml` для staging:

- `web-table-exam-db` — PostgreSQL
- `web-table-exam-api` — backend service
- `web-table-exam-frontend` — static frontend
- `campusos-staging-db` — staging PostgreSQL
- `campusos-staging-api` — staging backend service
- `campusos-staging-frontend` — staging static frontend

Что важно перед первым deploy:

1. Указать production-пароли для:
   - `SUPERADMIN_BOOTSTRAP_PASSWORD`
   - `SEED_ADMIN_PASSWORD`
   - `SEED_TEACHER_PASSWORD`
   - `SEED_STUDENT_PASSWORD`
2. Убедиться, что `FRONTEND_URL` у backend совпадает с frontend domain
3. Убедиться, что `VITE_API_BASE_URL` у frontend указывает на backend `/api`

Blueprint уже использует:

- `DB_CLIENT=postgres`
- `DATABASE_URL` из Render database
- `preDeployCommand: npm run seed`

## Ключевые backend scripts

В `backend/package.json` доступны:

- `npm run dev` — локальная разработка
- `npm start` — production start
- `npm run seed` — создание демо-данных
- `npm run cleanup-demo-data` — очистка старых временных данных
- `npm run import:pilot` — preview/import студентов, преподавателей, курсов, записей на предметы и расписания из CSV / Excel
- `npm run import:pilot:apply` — применение импорта к текущей БД
- `npm run import:pilot:preview` — read-only preview файлов из `backend/imports/inbox`, включая enrollments и schedule
- `npm run reconcile:pilot` — read-only reconciliation отчёт по внешним выгрузкам против текущей БД CampusOS

## Security scripts

В корневом `package.json` доступны:

- `npm run test:backend`
- `npm run audit:backend`
- `npm run audit:frontend`
- `npm run scan:secrets`
- `npm run scan:zap`
- `npm run export:security-docx`

## Product direction

Сейчас CampusOS развивается как **web-first academic portal**.  
Приоритет — завершить и стабилизировать веб-платформу, а уже после этого делать Android-версию.

Отдельная продуктовая идея проекта — не обязательно заменять существующие университетские системы целиком, а при необходимости выступать как единый удобный интерфейс поверх уже существующих источников данных.

## Ближайшие продуктовые задачи

- импорт реальных университетских данных из CSV / Excel / SQL dump
- улучшение admin workflow для массового управления пользователями и курсами
- ускорение сценариев для преподавателя в attendance и schedule
- стабилизация API и подготовка к staging / pilot launch

Подробный план находится в `ROADMAP.md`.

## Автор

Erbol Abdusaitov

- Email: [erbolabdusaito@gmail.com](mailto:erbolabdusaito@gmail.com)
- Telegram: `@merk1024`

## Лицензия

Copyright (c) 2026 Erbol Abdusaitov

All rights reserved.  
Проект CampusOS является интеллектуальной собственностью автора.
