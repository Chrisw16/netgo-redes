-- ════════════════════════════════════════════════════════════════════════════
-- NetGo Redes — schema do banco PRÓPRIO (PostgreSQL + PostGIS)
-- ════════════════════════════════════════════════════════════════════════════
-- O NetGo Redes é a FONTE DA VERDADE da planta. CTO, poste, cabo, CEO e fusão
-- são entidades NATIVAS, criadas e editadas com as ferramentas do próprio
-- sistema. Tudo funciona sem o SGP.
--
-- O SGP é um ACRÉSCIMO opcional: pode SEMEAR estas tabelas (import do mapaftth)
-- e ENRIQUECER a visão (ocupação/sinal em tempo real). O vínculo é uma coluna
-- anulável (`cto.sgp_splitter_id`), nunca uma dependência.
--
-- SRID 4326 (WGS84 lat/lng), para casar com OpenStreetMap/Leaflet.
-- `geom` é anulável em tudo: dá pra cadastrar primeiro e localizar depois.
-- Rodar no banco:  psql "$APP_DATABASE_URL" -f db/schema.sql  (ou /api/migrate)
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;

-- Remove o modelo antigo dependente do SGP (cto_geo era keyed pelo splitter_id).
-- Seguro: tabela vazia, recém-criada. A CTO agora é nativa (ver tabela `cto`).
DROP TABLE IF EXISTS cto_geo;

-- ── POP: Ponto de Presença ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pop (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT UNIQUE NOT NULL,
  nome          TEXT,
  geom          geometry(Point, 4326),
  endereco      TEXT,
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pop_gix ON pop USING GIST (geom);

-- ── Poste ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poste (
  id             BIGSERIAL PRIMARY KEY,
  codigo         TEXT UNIQUE,
  geom           geometry(Point, 4326),
  tipo           TEXT,                          -- concreto | madeira | metalico...
  altura_m       NUMERIC(5,2),
  dono           TEXT NOT NULL DEFAULT 'proprio', -- proprio | alugado
  concessionaria TEXT,                          -- se alugado (ex.: Neoenergia/Cosern)
  observacao     TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poste_gix ON poste USING GIST (geom);

-- ── CEO: Caixa de Emenda Óptica ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ceo (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT UNIQUE,
  nome          TEXT,
  geom          geometry(Point, 4326),
  poste_id      BIGINT REFERENCES poste(id) ON DELETE SET NULL,
  tipo          TEXT,
  capacidade    INT,                            -- nº de fusões suportadas
  observacao    TEXT,
  origem        TEXT NOT NULL DEFAULT 'manual', -- manual | mapaftth | kmz
  sgp_ceo_id    BIGINT,                         -- vínculo opcional (mapaftth_ceo.id)
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ceo_gix ON ceo USING GIST (geom);

-- ── CTO: Caixa de Terminação Óptica (entidade NATIVA) ────────────────────────
-- O coração da planta. Existe por si só. O `sgp_splitter_id` é OPCIONAL: quando
-- preenchido, o sistema enriquece a CTO com portas/ocupação/sinal lidos do SGP.
CREATE TABLE IF NOT EXISTS cto (
  id              BIGSERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,         -- ident/nome da CTO
  geom            geometry(Point, 4326),        -- nula até georreferenciar
  tipo_splitter   TEXT,                          -- 1:8 | 1:16 | 1:32
  capacidade      INT,                           -- nº de portas
  ceo_id          BIGINT REFERENCES ceo(id) ON DELETE SET NULL,
  poste_id        BIGINT REFERENCES poste(id) ON DELETE SET NULL,
  endereco        TEXT,
  observacao      TEXT,
  origem          TEXT NOT NULL DEFAULT 'manual', -- manual | mapaftth | mapll | kmz
  sgp_splitter_id BIGINT UNIQUE,                 -- vínculo OPCIONAL (netcore_splitter.id)
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cto_gix ON cto USING GIST (geom);
CREATE INDEX IF NOT EXISTS cto_sgp_ix ON cto (sgp_splitter_id);

-- ── Cabo de fibra ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cabo (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT UNIQUE,
  tipo          TEXT,                           -- backbone | distribuicao | drop
  fibras        INT,                            -- capacidade (ex.: 6, 12, 24, 72...)
  fabricante    TEXT,
  geom          geometry(LineString, 4326),     -- traçado no mapa
  comprimento_m NUMERIC(10,2),                  -- pode derivar de ST_Length(geom::geography)
  observacao    TEXT,
  origem        TEXT NOT NULL DEFAULT 'manual', -- manual | mapaftth | kmz
  sgp_cabo_id   BIGINT,                         -- vínculo opcional (mapaftth_cabo.id)
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cabo_gix ON cabo USING GIST (geom);

-- Por quais postes o cabo passa (ordenado ao longo da rota).
CREATE TABLE IF NOT EXISTS cabo_poste (
  cabo_id  BIGINT NOT NULL REFERENCES cabo(id) ON DELETE CASCADE,
  poste_id BIGINT NOT NULL REFERENCES poste(id) ON DELETE CASCADE,
  ordem    INT NOT NULL,
  PRIMARY KEY (cabo_id, poste_id)
);

-- ── Fusão / emenda (fibra-a-fibra) ───────────────────────────────────────────
-- Base do "grafo óptico": cada fusão liga uma fibra de entrada a uma de saída
-- dentro de uma CEO. O caminho óptico ponta-a-ponta é a travessia desse grafo.
CREATE TABLE IF NOT EXISTS fusao (
  id            BIGSERIAL PRIMARY KEY,
  ceo_id        BIGINT NOT NULL REFERENCES ceo(id) ON DELETE CASCADE,
  bandeja       INT,
  cabo_in_id    BIGINT REFERENCES cabo(id) ON DELETE SET NULL,
  tubo_in       TEXT,                           -- cor do tubo de entrada
  fibra_in      TEXT,                           -- cor da fibra de entrada
  cabo_out_id   BIGINT REFERENCES cabo(id) ON DELETE SET NULL,
  tubo_out      TEXT,
  fibra_out     TEXT,
  perda_db      NUMERIC(5,2),                   -- atenuação medida
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fusao_ceo_ix ON fusao (ceo_id);

-- ── Migrações idempotentes ───────────────────────────────────────────────────
-- Colunas adicionadas depois da criação inicial das tabelas. CREATE TABLE IF NOT
-- EXISTS não altera tabelas já existentes, então garantimos as colunas aqui.
ALTER TABLE cabo ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE cabo ADD COLUMN IF NOT EXISTS sgp_cabo_id BIGINT;

ALTER TABLE ceo ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE ceo ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE ceo ADD COLUMN IF NOT EXISTS sgp_ceo_id BIGINT;

ALTER TABLE cto ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE cto ADD COLUMN IF NOT EXISTS sgp_splitter_id BIGINT;
ALTER TABLE cto ADD COLUMN IF NOT EXISTS poste_id BIGINT REFERENCES poste(id) ON DELETE SET NULL;
ALTER TABLE cto ADD COLUMN IF NOT EXISTS ceo_id BIGINT REFERENCES ceo(id) ON DELETE SET NULL;

-- ── Racks dos POPs (construção visual: racks com U's e equipamentos) ──────────
CREATE TABLE IF NOT EXISTS rack (
  id            BIGSERIAL PRIMARY KEY,
  pop_id        BIGINT NOT NULL REFERENCES pop(id) ON DELETE CASCADE,
  nome          TEXT,
  altura_u      INT NOT NULL DEFAULT 42,        -- nº de U's do rack
  ordem         INT NOT NULL DEFAULT 0,
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rack_pop_ix ON rack (pop_id);

CREATE TABLE IF NOT EXISTS rack_item (
  id            BIGSERIAL PRIMARY KEY,
  rack_id       BIGINT NOT NULL REFERENCES rack(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'outro',  -- olt | switch | dio | patch | servidor | nobreak | outro
  modelo        TEXT,
  fabricante    TEXT,
  u_inicio      INT NOT NULL DEFAULT 1,         -- U onde começa (1 = base do rack)
  u_tamanho     INT NOT NULL DEFAULT 1,         -- altura em U's
  cor           TEXT,
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rack_item_rack_ix ON rack_item (rack_id);
