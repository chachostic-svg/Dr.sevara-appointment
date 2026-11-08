# Dr. Sevara

Сайт невролога Хамидовой Севары Миржалиловны и Telegram-бот `@neoro_sevara_bot`. Запись с сайта, Mini App и из бота попадает в админку и в Telegram-группу.

Стек: JavaScript, Next.js, Tailwind, grammY. Живые данные (записи, клиенты, отзывы, язык группы) хранятся в Neon Postgres. Статичные тексты врача — в `data/`.

## Локальный запуск

Нужен Node.js 20+.

```bash
npm run install:all
npm install
copy .env.example .env
copy web\.env.example web\.env.local
```

Заполните `BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `ADMIN_PASSWORD`. `DATABASE_URL` с Neon можно не задавать локально — тогда используются JSON-файлы в `data/`.

```bash
npm run dev
```

- Сайт: http://localhost:3000
- Админка: http://localhost:3000/admin — пароль из `ADMIN_PASSWORD`
- Mini App: http://localhost:3000/mini (в Telegram только по HTTPS)

## Публикация

Сайт и Mini App — Vercel, база — Neon, бот работает webhook’ом на том же домене.

Админка **не отдельный сайт**. Это тот же адрес плюс `/admin`, например `https://ваш-домен.vercel.app/admin`.

Переменные на Vercel:

- `DATABASE_URL` — connection string Neon
- `BOT_TOKEN`, `TELEGRAM_GROUP_ID`
- `ADMIN_PASSWORD`, `ADMIN_SECRET`
- `WEBAPP_URL` — `https://ваш-домен/mini`
- `API_URL` — `https://ваш-домен`
- `TELEGRAM_WEBHOOK_SECRET` — любой секрет для webhook

После деплоя вызовите `POST /api/telegram/setup` с заголовком `x-medora-secret: ADMIN_SECRET`, чтобы повесить webhook и кнопку Mini App.

Напоминания: GitHub Action каждые 15 минут (`APP_URL` и `ADMIN_SECRET` в secrets репозитория).
