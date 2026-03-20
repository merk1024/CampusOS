# CampusOS

CampusOS — это веб-система для управления учебным процессом университета.
Платформа объединяет расписание занятий, экзамены, курсы, оценки и управление пользователями в одной цифровой среде.

Система предназначена для университетов, колледжей и образовательных центров, которые хотят централизовать управление академическими данными.

---

# Основные возможности

• управление расписанием занятий
• управление экзаменами
• управление курсами и предметами
• система оценок студентов
• роли пользователей (студент, преподаватель, администратор)
• поиск и фильтрация данных
• импорт и экспорт информации
• современный адаптивный интерфейс

---

# Архитектура системы

CampusOS использует современный стек веб-разработки.

Frontend:
React + Vite

Backend:
Node.js + Express

Database:
MongoDB

Authentication:
JWT (JSON Web Token)

---

# Структура проекта

```
CampusOS/
│
├── backend/        серверная часть (API, база данных, авторизация)
│
├── frontend/       React-приложение
│
└── README.md
```

---

# Быстрый старт

## 1. Клонирование проекта

```
git clone <repository_url>
cd CampusOS
```

---

# Установка зависимостей

## Backend

```
cd backend
npm install
```

## Frontend

```
cd ../frontend
npm install
```

---

# Запуск системы

## Запуск backend

```
cd backend
npm run dev
```

Сервер будет доступен по адресу:

```
http://localhost:3001
```

---

## Запуск frontend

```
cd frontend
npm run dev
```

Открыть в браузере:

```
http://localhost:5173
```

---

# База данных

CampusOS использует MongoDB.

Подключение настраивается в backend:

```
mongoose.connect("mongodb://localhost:27017/campusos")
```

Можно использовать:

• локальную MongoDB
• MongoDB Atlas (облачную)

---

# Основные коллекции базы данных

## users

```
{
  name: "Student Name",
  login: "student",
  password: "hashed_password",
  role: "student",
  group: "COMSE-25",
  email: "student@university.edu",
  createdAt: "2026-01-01"
}
```

---

## schedule

```
{
  day: "Monday",
  group: "COMSE-25",
  time: "10:00-10:40",
  subject: "Calculus",
  teacher: "Professor Name",
  room: "B107"
}
```

---

## exams

```
{
  group: "COMSE-25",
  subject: "Programming",
  date: "2026-02-10",
  time: "10:00",
  room: "BIGLAB",
  teacher: "Teacher Name",
  semester: "Spring 2026",
  students: [],
  grades: {}
}
```

---

# Аутентификация

Система использует JWT для авторизации пользователей.

Backend использует библиотеки:

```
jsonwebtoken
bcrypt
```

Это обеспечивает безопасную авторизацию и хранение паролей.

---

# Развертывание (Deployment)

Backend можно разместить на:

• Railway
• Render
• VPS сервер

База данных:

• MongoDB Atlas
• Supabase
• Firebase

---

# Будущие функции (Roadmap)

• мобильное приложение
• push-уведомления
• интеграция с университетской почтой
• аналитика успеваемости студентов
• система уведомлений о экзаменах

---

# Автор

Erbol Abdusaitov

Email: [erbolabdusaito@gmail.com](mailto:erbolabdusaito@gmail.com)
Telegram: @merk1024

---

# Лицензия

Copyright (c) 2026 Erbol Abdusaitov

All rights reserved.

Проект CampusOS является интеллектуальной собственностью автора.
Копирование, распространение или использование исходного кода без разрешения автора запрещено.
