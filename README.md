# AIU Schedule System

Веб-система для управления расписанием, экзаменами и учебным процессом в университете.

## Возможности
- Управление экзаменами, расписанием, курсами, оценками
- Роли: студент, преподаватель, администратор
- Современный адаптивный интерфейс (React + Vite)
- Сервер на Node.js (Express) + SQLite
- JWT-аутентификация
- Импорт/экспорт данных, фильтрация, поиск

---

## Структура проекта

```
Web_table_exam/
├── backend/      # Сервер Express, база данных, API
├── frontend/     # React-приложение (Vite)
└── README.md
```

---

## Быстрый старт

### 1. Клонирование репозитория
```bash
git clone <repo_url>
cd Web_table_exam
```

### 2. Запуск backend
```bash
cd backend
npm install
npm start
# Сервер будет доступен на http://localhost:5001
```

### 3. Запуск frontend
```bash
cd frontend
npm install
npm run dev
# Откройте http://localhost:5173 (или порт, указанный в консоли)
```

---

## .env и переменные окружения
Создайте файл `.env` в папке backend для настройки БД и секретов JWT.

---

## Основные команды
- `npm start` — запуск backend
- `npm run dev` — запуск frontend (Vite)

---

## Контакты
Для вопросов и предложений: [your-email@example.com]

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## 2. Запуск

### Запуск backend

```bash
cd backend
npm run dev
```

Сервер будет доступен на:

```
http://localhost:3001
```

### Запуск frontend

```bash
cd frontend
npm run dev
```

Откройте:

```
http://localhost:5173
```

---

# 🗄 База данных

Используется **MongoDB (локальная установка или MongoDB Atlas)**.

Подключение в `backend/index.js`:

```js
mongoose.connect('mongodb://localhost:27017/aiu_schedule');
```

---

# 📦 Структура базы данных

## Коллекция `exams`

```json
{
  "group": "COMSE-25",
  "subject": "Programming Language 2",
  "date": "2026-02-10",
  "time": "10:00",
  "room": "BIGLAB",
  "teacher": "Azhar Kazakbaeva",
  "type": "Экзамен",
  "semester": "Spring 2025-2026",
  "students": ["Student 1"],
  "grades": {
    "Student 1": 85
  },
  "createdAt": "2026-01-15T10:00:00Z"
}
```

---

## Коллекция `schedule`

```json
{
  "classes": [
    {
      "day": "Понедельник",
      "group": "COMSE-25",
      "time": "10:00-10:40",
      "subject": "Calculus 2",
      "teacher": "Hussien Chebsi",
      "room": "B107"
    }
  ],
  "groups": ["COMSE-25"],
  "semester": "Spring 2025-2026",
  "uploadDate": "2026-01-15T10:00:00Z"
}
```

---

## Коллекция `users`

```json
{
  "name": "Student Name",
  "login": "student",
  "password": "hashed_password",
  "role": "student",
  "group": "COMSE-25",
  "email": "student@aiu.edu",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

# 🔐 Аутентификация (JWT)

Backend использует JWT:

```js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
```

### Backend (Railway/Render - бесплатно):

1. Зарегистрироваться на https://railway.app или https://render.com
2. Подключить GitHub репозиторий
3. Выбрать `server/` как root directory
4. Deploy!

### База данных:
- MongoDB Atlas - бесплатно до 512MB
- Firebase - бесплатно до 1GB
- Supabase - бесплатно до 500MB

## 📱 Мобильное приложение

Можно обернуть в React Native:

```bash
npx react-native init AIUScheduleApp
# Скопировать логику из App.jsx
```

Или использовать Capacitor для PWA:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap add ios
```

## 🤝 Поддержка

Возникли вопросы? 
<<<<<<< HEAD
- 📧 Email: erbolabdusaito@gmail.com
=======
- 💬 Telegram: @merk1024

## 📝 Лицензия

MIT License

---

Сделано с ❤️ для AIU
