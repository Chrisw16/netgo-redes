# NetGo Redes

Sistema de gestão da **infraestrutura de rede / planta externa (OSP)** de um
provedor de internet: mapeamento de postes, cabos de fibra, CTOs, CEOs, POPs,
controle de fusões/emendas e caminho óptico ponta-a-ponta.

## Arquitetura

Dois bancos, papéis distintos:

| Banco | Acesso | O que tem |
|---|---|---|
| **SGP** (`dbconect`) | somente leitura (`src/lib/db.ts`) | CTO/portas/ocupação, ONU, sinal, status, cliente, contrato |
| **Próprio** (PostGIS) | leitura/escrita (`src/lib/appdb.ts`) | postes, cabos, CEOs, fusões e **coordenada limpa das CTOs** (`cto_geo`) |

O SGP nunca é alterado. A planta física vive no banco próprio, amarrada à CTO
pelo id do splitter (`netcore_splitter.id` ⇄ `cto_geo.splitter_id`).

> Projeto independente do **netgo-bi** (BI transversal do provedor). O netgo-bi
> (pasta irmã) serve só como referência de queries/schema do SGP.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · PostgreSQL + PostGIS · `pg`.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher senhas (SGP + banco próprio)

# criar o schema da planta no banco próprio (uma vez):
psql "$APP_DATABASE_URL" -f db/schema.sql

npm run dev                  # http://localhost:3000
```

## Schema da planta

Ver [`db/schema.sql`](db/schema.sql): `cto_geo`, `poste`, `cabo`, `cabo_poste`,
`ceo`, `fusao`.

## Roadmap (rascunho)

1. **Fundação** ✅ scaffold, conexões, schema PostGIS.
2. **Georreferenciamento de CTOs** — colocar no mapa as ~73% sem coordenada.
3. **Mapa da planta** — postes, cabos e CTOs em camadas.
4. **Fusões / caminho óptico** — grafo de continuidade fibra-a-fibra.
5. **Painel** — totais, ocupação, capacidade por região.
