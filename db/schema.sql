-- ════════════════════════════════════════════════════════════════════════════
-- NetGo Redes — schema do banco PRÓPRIO (PostgreSQL + PostGIS)
-- ════════════════════════════════════════════════════════════════════════════
-- Este banco guarda a PLANTA FÍSICA que o SGP não tem. O SGP (dbconect) é só
-- leitura e é consultado em tempo real; aqui nada do SGP é duplicado, exceto a
-- chave de junção: o id do splitter (CTO).
--
-- SRID 4326 (WGS84 lat/lng) em tudo, para casar com OpenStreetMap/Leaflet.
-- Rodar uma vez no banco novo:  psql "$APP_DATABASE_URL" -f db/schema.sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── CTO: coordenada LIMPA ────────────────────────────────────────────────────
-- A CTO em si (portas, ocupação, clientes) vive no SGP (netcore_splitter).
-- Aqui guardamos só a geolocalização confiável, amarrada pelo id do splitter.
-- Resolve o gap: ~73% das CTOs sem coordenada válida no SGP.
CREATE TABLE IF NOT EXISTS cto_geo (
  splitter_id   BIGINT PRIMARY KEY,            -- = netcore_splitter.id no SGP
  geom          geometry(Point, 4326) NOT NULL,
  endereco      TEXT,
  fonte         TEXT NOT NULL DEFAULT 'manual', -- manual | importado_sgp | kmz
  observacao    TEXT,
  revisado_por  TEXT,
  revisado_em   TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cto_geo_gix ON cto_geo USING GIST (geom);

-- ── Poste ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poste (
  id             BIGSERIAL PRIMARY KEY,
  codigo         TEXT UNIQUE,
  geom           geometry(Point, 4326) NOT NULL,
  tipo           TEXT,                          -- concreto | madeira | metalico...
  altura_m       NUMERIC(5,2),
  dono           TEXT NOT NULL DEFAULT 'proprio', -- proprio | alugado
  concessionaria TEXT,                          -- se alugado (ex.: Neoenergia/Cosern)
  observacao     TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poste_gix ON poste USING GIST (geom);

-- ── Cabo de fibra ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cabo (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT UNIQUE,
  tipo          TEXT NOT NULL,                  -- backbone | distribuicao | drop
  fibras        INT NOT NULL,                   -- capacidade (ex.: 12, 24, 72...)
  fabricante    TEXT,
  geom          geometry(LineString, 4326),     -- traçado no mapa
  comprimento_m NUMERIC(10,2),                  -- pode derivar de ST_Length(geom::geography)
  observacao    TEXT,
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

-- ── CEO: Caixa de Emenda Óptica ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ceo (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT UNIQUE,
  geom          geometry(Point, 4326),
  poste_id      BIGINT REFERENCES poste(id) ON DELETE SET NULL,
  tipo          TEXT,
  capacidade    INT,                            -- nº de fusões suportadas
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ceo_gix ON ceo USING GIST (geom);

-- ── Fusão / emenda (fibra-a-fibra) ───────────────────────────────────────────
-- A base do "grafo óptico": cada fusão liga uma fibra de entrada a uma de saída
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
