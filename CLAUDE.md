# Garaggio

Учёт обслуживания машин для мастера Ильдара (garaggio.ru). Приложение только для мастера (вход по паролю);
клиенты видят лишь присланное им: сообщения/голосовые в Telegram-боте и отчёт по секретной ссылке `/r/<token>`.
Общаться с пользователем по-русски, простыми словами.

## Что уже умеет (план из 14 пунктов)
Сделано: машины с фото номера/СТС → поля; визиты (типовые работы, подсказки деталей, фото, голосовой ввод); история;
«Пора на ТО»; «Связаться с клиентом» (шаблоны, WhatsApp/Telegram/SMS, голосовое Chuck Miller, «Послушать»);
отчёт по ссылке; Telegram-бот и «Ящик»; «Деньги» (оплачено, долги, выручка); календарь записи.
Не сделано: работа без интернета, склад деталей, акт в PDF, несколько мастеров; автонапоминания ботом, самозапись клиентов.

## Стек
Next.js 14 (App Router, server actions), Tailwind 3, postgres-js, lucide-react, @anthropic-ai/sdk, qrcode.
- `lib/` — данные (`data.ts`), вход (`auth.ts`), форматирование (`format.ts`), шаблоны сообщений (`messages.ts`),
  ИИ для голосового ввода и распознавания фото (`ai.ts`), Telegram (`tg.ts`), озвучка ElevenLabs (`tts.ts`).
- `app/actions.ts` — все server actions; `app/(app)/` — страницы мастера; `app/r/` — публичный отчёт; `app/api/` — роуты.
- Схема — `db/schema.sql`, только добавочные изменения (`IF NOT EXISTS`); применять `node --env-file=.env scripts/db-init.mjs`.
  Локальный `.env` смотрит в боевую базу на сервере — осторожно.

## Сервер и деплой
VPS 168.222.192.167, `/var/www/garaggio`, pm2 `garaggio` (порт 3005) и `garaggio-tg-poller`; база `garaggio` на том же Postgres;
фото и кеш озвучки — `UPLOAD_DIR` (`/var/www/garaggio-data/uploads`), вне репозитория.

На том же сервере живут **ggege** и **asfalt-app** — никогда их не трогать и не перезапускать. Сборку garaggio не запускать,
пока идёт сборка ggege (не хватает памяти): проверка `pgrep -af "[n]ext build"`.

```bash
cd /var/www/garaggio && git checkout -q package-lock.json; git pull -q origin main && npm ci && npm run build && pm2 restart garaggio
```
Если менялась схема — перед сборкой `node --env-file=.env scripts/db-init.mjs`. Если менялись `lib/tg.ts` или
`scripts/tg-poller.mjs` — перезапустить и `garaggio-tg-poller`. Новые переменные `.env` — `pm2 restart … --update-env`.

## Внешние сервисы (с сервера в России напрямую недоступны)
- **Telegram** (@garaggio_app_bot): вебхук до сервера не доходит. Работает опросчик `scripts/tg-poller.mjs`: getUpdates через
  Cloudflare-прокси `TG_API_BASE` → отдаёт обновления в `http://127.0.0.1:3005/api/tg` с заголовком `TG_WEBHOOK_SECRET`.
  Вебхук не включать. Мастер подключает свой Telegram во вкладке «Ящик» и отвечает клиентам ответом (Reply) на их сообщения.
- **ElevenLabs**: только через прокси `ELEVENLABS_API_BASE` (Cloudflare-воркер `elevenlabs-proxy`, пропускает `/v1/*` с ключом).
  Голос Chuck Miller (`HIGUfNOdjuWQwwapnTRW`), модель `eleven_v4`, stability 0, пометки `[cheerful]`, `[laughs]`, `[warmly]`
  расставляет `voiceText()`. Оплата Pay as you go — озвучка один раз на текст, дальше из кеша `UPLOAD_DIR/tts/`.
- **Anthropic**: `ANTHROPIC_BASE_URL` (свой прокси); голосовой ввод — Haiku, распознавание номера/СТС — Haiku, при неудаче Sonnet.
  Прокси режет тела > ~30 КБ, поэтому фото отдаём ссылкой `/api/tmp-photo/<uuid>`.

Секреты (`TG_*`, `ELEVENLABS_*`, `ANTHROPIC_*`, `MASTER_PASSWORD`, `SESSION_SECRET`) — только в `.env`, в репозиторий не коммитить.

## Интерфейс
- Всё под телефон: крупные кнопки (`.btn`, min-h 52px), нижнее меню Машины · Запись · «+» · Пора на ТО · Ящик; «Деньги» — в шапке.
- Календарь записи (`/calendar`, `lib/appts.ts`, таблица `appointments`): день и время — московские `date` + `time`;
  наложения не запрещены, но форма сначала показывает, с кем пересекается. «Начать визит» из записи отмечает её «приехал».
- Палитра (`tailwind.config.ts`): тёмный асфальт `bg/card/line`; **basil** — главные действия (`.btn-primary`);
  **tomato** — только «внимание» (долги, просрочка, ошибки, непрочитанные); **gold** — акценты; синий `#2AABEE` — Telegram.
- Раскрывающиеся блоки — `details.fold > summary.fold-summary + .fold-body` (выглядят как кнопки, открываются плавно).
- `.btn-magic` — «волшебная» кнопка «Послушать» (градиент, блик, искры; `data-state` idle/busy/playing).
- Тон текстов клиентам — дружелюбный, с итальянской ноткой («Чао!», «Грацие», 🤌), Garaggio в голосе читается «Гараджио».

## Тесты в браузере
Первая кнопка на странице — «Выйти» в шапке: форму выбирать через её поле (`[name=plate]`.form), а не `form button`.
