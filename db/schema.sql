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

CREATE TABLE IF NOT EXISTS photos (
    id         serial PRIMARY KEY,
    visit_id   int NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    file       text NOT NULL,
    kind       text NOT NULL DEFAULT 'other',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_visit_idx ON photos (visit_id);
