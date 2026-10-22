-- Garaggio: схема базы. Применяется скриптом scripts/db-init.mjs (безопасно перезапускать).
CREATE TABLE IF NOT EXISTS cars (
    id          serial PRIMARY KEY,
    plate       text NOT NULL DEFAULT '',
    plate_norm  text NOT NULL DEFAULT '',
    vin         text NOT NULL DEFAULT '',
    brand       text NOT NULL DEFAULT '',
    model       text NOT NULL DEFAULT '',
    year        int,
    color       text NOT NULL DEFAULT '',
    owner_name  text NOT NULL DEFAULT '',
    owner_phone text NOT NULL DEFAULT '',
    notes       text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cars_plate_norm_idx ON cars (plate_norm);
-- тип силовой установки: ice (ДВС), hybrid, ev (электро) — от него зависит набор типовых работ
ALTER TABLE cars ADD COLUMN IF NOT EXISTS powertrain text NOT NULL DEFAULT 'ice';

CREATE TABLE IF NOT EXISTS visits (
    id              serial PRIMARY KEY,
    car_id          int NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    visit_date      date NOT NULL DEFAULT current_date,
    mileage         int,
    works           text NOT NULL DEFAULT '',
    parts           jsonb NOT NULL DEFAULT '[]',
    labor_cost      int NOT NULL DEFAULT 0,
    notes           text NOT NULL DEFAULT '',
    recommendations text NOT NULL DEFAULT '',
    declined        boolean NOT NULL DEFAULT false,
    next_date       date,
    next_mileage    int,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visits_car_idx ON visits (car_id, visit_date DESC);
-- секретная ссылка «отчёт клиенту» (/r/<token>), создаётся по кнопке
ALTER TABLE visits ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
-- оплачен ли визит (старые считаем оплаченными); неоплаченные видны на странице «Деньги»
ALTER TABLE visits ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS photos (
    id         serial PRIMARY KEY,
    visit_id   int NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    file       text NOT NULL,
    kind       text NOT NULL DEFAULT 'other',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_visit_idx ON photos (visit_id);

-- Telegram-бот: машина привязана к чату клиента (подписка по ссылке/QR или по номеру телефона)
ALTER TABLE cars ADD COLUMN IF NOT EXISTS tg_chat_id bigint;
CREATE INDEX IF NOT EXISTS cars_tg_chat_idx ON cars (tg_chat_id);
CREATE TABLE IF NOT EXISTS tg_chats (
    chat_id    bigint PRIMARY KEY,
    name       text NOT NULL DEFAULT '',
    username   text NOT NULL DEFAULT '',
    phone      text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
-- переписка: out = от мастера клиенту; master_msg_id — копия у мастера в Telegram (ответ на неё уходит клиенту)
CREATE TABLE IF NOT EXISTS tg_messages (
    id            serial PRIMARY KEY,
    chat_id       bigint NOT NULL,
    out           boolean NOT NULL DEFAULT false,
    text          text NOT NULL DEFAULT '',
    seen          boolean NOT NULL DEFAULT false,
    master_msg_id bigint,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tg_messages_chat_idx ON tg_messages (chat_id, id DESC);
CREATE TABLE IF NOT EXISTS settings (
    key   text PRIMARY KEY,
    value text NOT NULL DEFAULT ''
);

-- Календарь записи: кто и когда приезжает. Машина может быть ещё не заведена — тогда имя и телефон клиента.
-- status: planned (ждём), done (приехал, визит начат), cancelled (отменили). Время — московское, без часового пояса.
CREATE TABLE IF NOT EXISTS appointments (
    id           serial PRIMARY KEY,
    car_id       int REFERENCES cars(id) ON DELETE SET NULL,
    client_name  text NOT NULL DEFAULT '',
    client_phone text NOT NULL DEFAULT '',
    day          date NOT NULL,
    start_time   time NOT NULL,
    duration_min int NOT NULL DEFAULT 60,
    work         text NOT NULL DEFAULT '',
    status       text NOT NULL DEFAULT 'planned',
    visit_id     int REFERENCES visits(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_day_idx ON appointments (day, start_time);
CREATE INDEX IF NOT EXISTS appointments_car_idx ON appointments (car_id);
-- самозапись: заявки клиентов со страницы /zapis приходят со status = 'pending' и source = 'client';
-- client_car — машина словами («Zeekr 001»), если клиента ещё нет в базе
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'master';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_car text NOT NULL DEFAULT '';

-- Несколько мастеров в Telegram: всем приходят сообщения клиентов и заявки, ответить может любой.
CREATE TABLE IF NOT EXISTS tg_masters (
    chat_id    bigint PRIMARY KEY,
    name       text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
-- старый единственный мастер (settings.tg_master_chat) переезжает в список
INSERT INTO tg_masters (chat_id) SELECT value::bigint FROM settings WHERE key = 'tg_master_chat' AND value ~ '^-?[0-9]+$' ON CONFLICT DO NOTHING;
-- какая копия у какого мастера соответствует какому клиенту (ответ Reply на копию уходит клиенту)
CREATE TABLE IF NOT EXISTS tg_relay (
    master_chat   bigint NOT NULL,
    master_msg_id bigint NOT NULL,
    client_chat   bigint NOT NULL,
    PRIMARY KEY (master_chat, master_msg_id)
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_plate text NOT NULL DEFAULT ''; -- госномер из самозаписи
-- владелец: где живёт (город, район) и чем занимается — чтобы мастер помнил клиента
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_address text NOT NULL DEFAULT '';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_job text NOT NULL DEFAULT '';

-- масло двигателя (окошко в карточке машины): вязкость (можно несколько через запятую), объём в литрах, слив/откачка, примечание
ALTER TABLE cars ADD COLUMN IF NOT EXISTS oil_spec text NOT NULL DEFAULT '';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS oil_volume text NOT NULL DEFAULT '';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS oil_method text NOT NULL DEFAULT ''; -- '' | 'drain' (слив) | 'suck' (откачка)
ALTER TABLE cars ADD COLUMN IF NOT EXISTS oil_note text NOT NULL DEFAULT '';

-- Страница владельца машины (/c/<token>): вся история ТО + пожелания к следующему ТО. Ссылка секретная, без входа.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_token text UNIQUE;
CREATE TABLE IF NOT EXISTS car_wishes (
    id         serial PRIMARY KEY,
    car_id     int NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    text       text NOT NULL,
    done       boolean NOT NULL DEFAULT false, -- мастер отметил «учтено»
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS car_wishes_car_idx ON car_wishes (car_id, created_at DESC);
