# Ertis Classroom

Современная система управления обучением (LMS) для образовательных центров.

## Возможности

- 8 ролей пользователей с гибкими правами доступа
- Управление курсами, уроками и расписанием
- Система домашних заданий и тестирования
- Финансовый модуль (платежи и договоры)
- Внутренняя валюта и магазин вознаграждений
- Библиотека учебных материалов
- Чаты и уведомления
- Подробная аналитика и отчеты

## Технологический стек

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Роли пользователей

1. **SUPERADMIN** - Полный доступ к системе
2. **ADMIN** - Расширенный доступ с возможностью экспорта данных
3. **DEPARTMENT_HEAD** - Управление отделом
4. **CURATOR** - Работа с обратной связью студентов
5. **COORDINATOR** - Управление продажами
6. **TEACHER** - Преподаватель
7. **PARENT** - Родитель студента
8. **ONLINE_MENTOR** - Онлайн ментор

## Установка и запуск

### Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Настройка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd ertis-classroom
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ertis_classroom?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. Примените миграции базы данных:
```bash
npx prisma migrate dev
```

5. (Опционально) Заполните базу данных тестовыми данными:
```bash
npx prisma db seed
```

6. Запустите сервер разработки:
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Структура проекта

```
ertis-classroom/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Dashboard pages
├── components/            # React components
├── lib/                   # Utility functions and configs
│   ├── prisma.ts         # Prisma client
│   └── auth.ts           # NextAuth configuration
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma     # Database schema
├── types/                # TypeScript type definitions
└── public/               # Static files
```

## База данных

Проект использует PostgreSQL с Prisma ORM. Схема базы данных включает:

- Пользователи и роли
- Студенты, преподаватели, родители
- Курсы, темы, уроки
- Группы и расписание
- Домашние задания и тесты
- Платежи и договоры
- Библиотека ресурсов
- Магазин и валюта
- Чаты и уведомления

Для просмотра базы данных в GUI:
```bash
npx prisma studio
```

## Разработка

### Генерация Prisma Client
```bash
npx prisma generate
```

### Создание новой миграции
```bash
npx prisma migrate dev --name migration-name
```

### Форматирование кода
```bash
npm run format
```

### Линтинг
```bash
npm run lint
```

## Деплой

Проект готов к деплою на Vercel, Railway, или любой другой платформе с поддержкой Next.js.

### Vercel
1. Загрузите проект на GitHub
2. Импортируйте проект в Vercel
3. Настройте переменные окружения
4. Деплой произойдет автоматически

### База данных в продакшене
Рекомендуемые провайдеры:
- Vercel Postgres
- Supabase
- Neon
- Railway

## Документация

Подробная документация доступна в директории `docs/`:
- [Архитектура системы](docs/architecture.md)
- [API документация](docs/api.md)
- [Роли и права доступа](docs/roles.md)

## Лицензия

Проприетарный проект для Ertis Educational Center.

## Контакты

Для вопросов и поддержки: info@ertis.kz
