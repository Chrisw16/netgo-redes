# NetGo Redes — Documento de Continuidade (Handoff)

> Última atualização: 17/jun/2026. Objetivo: permitir continuar o projeto em outra
> máquina/chat sem perder contexto. Leia inteiro antes de codar.

---

## 1. O que é o projeto

**NetGo Redes** é um sistema **autônomo** de documentação da **planta externa (OSP)** de
um provedor de internet FTTH: POPs (com racks), postes, CTOs, CEOs, cabos de fibra e,
futuramente, fusões/caminho óptico. Tudo é georreferenciado num mapa.

### Princípio de design (IMPORTANTE)
O sistema é a **fonte da verdade** e funciona **100% sem o SGP**. As entidades (CTO,
poste, cabo, CEO, POP) são **nativas**, criadas/editadas com as ferramentas do próprio
sistema. O **SGP é só um acréscimo opcional** (enriquecer com ocupação/sinal e/ou semear
dados via importação do módulo `mapaftth`). Nunca uma dependência obrigatória. O vínculo
ao SGP é uma coluna anulável (ex.: `cto.sgp_splitter_id`).

Provedor real: ~6.500 ativos, região de **Natal/RN**. ERP atual = **TSMX SGP**.

---

## 2. Stack e arquitetura

- **Next.js 16.2.9** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**.
- **PostgreSQL + PostGIS** (driver `pg`). Mapa com **Leaflet + react-leaflet 5** (OpenStreetMap).
- **DOIS bancos** (papéis distintos):
  | Banco | Acesso | Arquivo | Conteúdo |
  |---|---|---|---|
  | **SGP** (`dbconect`) | SOMENTE LEITURA | `src/lib/db.ts` (`sgpQuery`) | CTO/portas/ONU/sinal/cliente |
  | **Próprio** (PostGIS) | leitura/escrita | `src/lib/appdb.ts` (`appQuery`) | toda a planta nativa + usuários |
- Deploy: **Coolify** (Dockerfile, output `standalone`).

### ⚠️ Especificidades do Next 16 (diferente de versões antigas — o AGENTS.md avisa)
- `middleware` virou **`proxy`**: o arquivo é `src/proxy.ts` e exporta `export function proxy(req)`.
- Params de rota dinâmica são **assíncronos**: `export async function GET(req, ctx: RouteContext<"/api/x/[id]">) { const { id } = await ctx.params }`. O tipo `RouteContext<...>` é gerado no build.
- `dynamic(() => import(...), { ssr: false })` só pode ser usado em **Client Components**.
- `cookies()` e `headers()` são **async** (`await cookies()`).
- Antes de codar algo de Next, conferir os docs locais em `node_modules/next/dist/docs/`.

---

## 3. Repositório, deploy e ambiente

- **Repo:** github.com/Chrisw16/netgo-redes (branch `main`). Está **público** (pendência: tornar privado).
- **Domínio (Coolify):** `http://redes.netgo.net.br` (e um `*.sslip.io`). É **HTTP** — por isso o cookie de auth usa `secure` **dinâmico** (liga só em HTTPS via header `x-forwarded-proto`), senão o login quebra.
- **Servidor Coolify:** IP `72.60.53.164` (já liberado no whitelist do SGP).
- **App no Coolify:** build por **Dockerfile** (multi-stage, `node:22-alpine`, output standalone). O `Dockerfile` copia também `db/` para a imagem (usado pelo `/api/migrate`).
- **Banco próprio no Coolify:** recurso Postgres com imagem **`postgis/postgis:16-3.4`** (Running healthy). DB/user/senha = `netgo-redes`.
  - GOTCHA já vivido: trocar a imagem do banco no Coolify exige **Stop + Start** (não só "Restart") para recriar o container; senão continua a imagem antiga e dá `extension "postgis" is not available`.

### Variáveis de ambiente (Coolify → app → Environment Variables)
```env
# Banco SGP (somente leitura)
SGP_PGHOST=177.52.36.89
SGP_PGPORT=5432
SGP_PGDATABASE=dbconect
SGP_PGUSER=consulta_conect
SGP_PGPASSWORD=<senha do SGP — mesma do netgo-bi>
SGP_PGSSL=false
# Banco próprio (PostGIS) — copiar a "Postgres URL (internal)" do recurso de banco
APP_DATABASE_URL=postgres://netgo-redes:<senha>@<host-interno>:5432/netgo-redes
APP_PGSSL=false
# Auth
AUTH_TOKEN=<segredo longo aleatório p/ assinar o cookie>
ADMIN_USER=admin
ADMIN_PASSWORD=<senha do 1º admin — semeado no 1º login>
# Migração/exploração (rotas protegidas por token)
MIGRATE_TOKEN=<segredo p/ /api/migrate e /api/explore>
```
(Variáveis NÃO marcar como "Build Variable" — os pools são lazy, o build não precisa delas.)

### Rodar local
```bash
npm install
cp .env.example .env.local   # preencher (mesmas chaves acima)
npm run dev                  # http://localhost:3000
npm run build                # validar tipos antes de commitar (sempre fiz isso)
```

### Fluxo de trabalho usado
A cada mudança: `npm run build` (valida TS) → `git add -A` → `git commit` → `git push` →
usuário dá **Redeploy** no Coolify. Mensagens de commit terminam com
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## 4. Banco de dados próprio (`db/schema.sql`)

Aplicado via **`GET /api/migrate?token=<MIGRATE_TOKEN>`** (lê `db/schema.sql` de dentro da
imagem e executa). É **idempotente**.

> ⚠️ GOTCHA CRÍTICO: `CREATE TABLE IF NOT EXISTS` **não adiciona colunas** a tabelas que já
> existem. Ao incluir coluna nova num modelo já criado, adicione
> `ALTER TABLE x ADD COLUMN IF NOT EXISTS ...` no fim do `schema.sql` (já existe um bloco de
> "Migrações idempotentes") e rode o migrate de novo. Isso já causou
> `column "origem" of relation "cabo" does not exist`.

Tabelas (SRID 4326 em toda geometria; `geom` é anulável — cadastra primeiro, localiza depois):

- **`pop`** (id, codigo, nome, geom Point, endereco, observacao)
- **`poste`** (id, codigo, geom Point, tipo, altura_m, dono [proprio|alugado], concessionaria, observacao)
- **`ceo`** (id, codigo, nome, geom Point, poste_id, tipo, capacidade, observacao, origem, sgp_ceo_id)
- **`cto`** (id, codigo UNIQUE, geom Point, tipo_splitter, capacidade, ceo_id, poste_id, endereco, observacao, origem, **sgp_splitter_id** [vínculo opcional SGP])
- **`cabo`** (id, codigo, tipo [backbone|distribuicao|drop], fibras, fabricante, geom **LineString**, comprimento_m, observacao, origem, sgp_cabo_id)
- **`cabo_poste`** (cabo_id, poste_id, ordem) — postes-âncora da rota
- **`fusao`** (id, ceo_id, bandeja, cabo_in_id, tubo_in, fibra_in, cabo_out_id, tubo_out, fibra_out, perda_db, observacao) — **tabela existe mas o módulo ainda NÃO foi construído**
- **`rack`** (id, pop_id, nome, altura_u, ordem, observacao)
- **`rack_item`** (id, rack_id, tipo, modelo, fabricante, u_inicio, u_tamanho, cor, observacao)
- **`app_user`** (id, username, password_hash, is_admin, created_at) — criada/semeada pelo `src/lib/users.ts` (não está no schema.sql)

Pegadinha do driver `pg`: `numeric` chega como **string** → usar `::float8` no SQL.
Coordenadas: gravar com `ST_SetSRID(ST_MakePoint(lng,lat),4326)`, ler com `ST_Y(geom) AS lat, ST_X(geom) AS lng`.

---

## 5. Autenticação

- `src/lib/auth.ts` (Edge-safe, sem `node:crypto`): cookie `netgo_redes_auth` = payload b64url + HMAC-SHA256 (Web Crypto). Sessão = `{ u: username, a: isAdmin }`. `podeAcessar()` restringe `/configuracoes` e `/api/usuarios` a admin.
- `src/lib/users.ts` (Node): senha com **scrypt**; tabela `app_user` auto-criada; admin semeado de `ADMIN_USER`/`ADMIN_PASSWORD` no 1º acesso. CRUD de usuários (com trava de "último admin" e auto-exclusão).
- `src/proxy.ts`: protege tudo, exceto `PUBLICAS = [/login, /api/logout, /api/migrate, /api/explore, /api/diag, /api/health]`.
- Login: `src/app/login/` (page client com `useActionState` + server action `entrar`). Logout: `POST /api/logout`.
- `/configuracoes` (admin): cria/edita/exclui usuários, reseta senha, promove/rebaixa admin (`src/components/UsuariosManager.tsx`).

---

## 6. O mapa compartilhado (peça central)

Requisito do usuário: **um único mapa**, compartilhado entre as abas, porque os elementos
se integram (CTO fica em poste, cabo passa por postes, CEO no poste/vão...). Porém **cada
módulo mostra só as camadas que se integram** com ele.

- Route group **`src/app/(app)/(mapa)/`** com `layout.tsx` que renderiza **`src/components/MapaShell.tsx`**. O mapa vive no layout e **persiste ao trocar de aba** (não remonta); só o painel da esquerda muda.
- **`MapaShell`** (client) = provider de contexto `useMapa()`:
  - dados: `ctos, postes, cabos, ceos` + `recarregar()`
  - `vis`/`toggleVis` (visibilidade de camada), `sel`/`setSel` (seleção `{camada,id}`)
  - `pending` (ponto vermelho — novo), `pendingLine` (linha tracejada — desenho de cabo)
  - `setMapClick(fn)` — a aba ativa registra o que fazer ao clicar no mapa vazio
- **`src/components/PlantaMap.tsx`** = mapa puro (Leaflet). Props: `camadas` (pontos), `linhas` (polylines de cabo), `pontoAtivo`/`linhaAtiva` (camada do módulo ativo — fica por cima e destacada), `selecionado`, `pending`, `pendingLine`, `onMapClick`, `onSelect`. Pontos = `CircleMarker` (sem assets de ícone); a camada ativa tem anel branco e fica no topo do z-order.
- **Camadas relevantes por módulo** (em `MapaShell`): `ctos={cto,poste}`, `postes={poste,cto,cabo,ceo}`, `cabos={cabo,poste,ceo}`, `ceos={ceo,poste,cabo}`, `planta`(Mapa da Planta)=tudo.
- **Cores:** CTO verde `#16a34a`, Poste âmbar `#f59e0b`, Cabo azul-céu `#38bdf8`, CEO roxo `#a855f7`.
- **Padrão de interação** dos painéis (`useMapa`): no modo edição, clicar num elemento de OUTRA camada vincula (ex.: em CTO/CEO clicar num poste → vincula+herda coordenada; em Cabo clicar em postes → vira vértice da rota). O painel reage via `sel`.

Abas dentro de `(mapa)` (URLs reais): `/planta` (visão geral read-only, painel "Detalhes" + "Neste ponto"), `/ctos`, `/postes`, `/cabos`, `/ceos`.

---

## 7. Módulos (estado atual)

Padrão de cada módulo: `src/lib/<x>.ts` (camada de dados PostGIS) + `src/app/api/<x>/route.ts` e `/[id]/route.ts` (CRUD) + painel em `src/app/(app)/(mapa)/<x>/page.tsx` que usa `useMapa`.

- **CTOs** (`/ctos`): código, splitter (1:8/1:16/1:32), portas, observação. **A CTO herda a coordenada do POSTE** (vincula por seletor ou clicando no poste no mapa). NÃO tem campo endereço nem posicionamento livre. `cto.poste_id`.
- **Postes** (`/postes`): código, tipo (concreto/madeira/metálico), altura, propriedade (próprio/alugado → concessionária). Posiciona clicando no mapa.
- **Cabos** (`/cabos`): código, tipo, fibras, fabricante. **Traçado desenhado**: clicar em postes (vértices-âncora, gravados em `cabo_poste`) e em **pontos livres** no mapa para seguir a rua. Geom = LINESTRING via WKT; comprimento via `ST_Length(::geography)`. Linha em construção aparece tracejada (`pendingLine`). Em `/cabos` e `/postes` o **poste tem prioridade de clique** (`pontoAtivo='poste'`) — corrige o bug de não clicar poste que tem CTO em cima.
- **CEOs** (`/ceos`): código, tipo (aérea/subterrânea/pedestal), nº de fusões. Monta **no poste** (herda coord) OU em **ponto livre** (mid-span, clique no mapa). `ceo.poste_id`.
- **POPs** (`/pops`): **página DEDICADA, fora do mapa** (tela cheia). É o destaque visual:
  - Esquerda: lista de POPs + criar (código, nome, endereço).
  - Direita (POP selecionado): **construtor visual de rack**. `+ Rack` (nome, altura em U). Cada rack é desenhado com régua de U's; equipamentos são **faceplates** que lembram o aparelho real conforme o tipo (OLT=line cards, switch/patch=portas, DIO=adaptadores, servidor=bays, nobreak=display) — corpo metálico escuro + faixa na cor + LEDs.
  - Itens: tipo (tag aparece antes do modelo), modelo, fabricante, U inicial, tamanho (U), cor. **Arrastar** o item muda o U (snap-back se ocupado). Ao adicionar, sugere 1º U livre; ao salvar, valida sobreposição e limite do rack.
  - APIs: `/api/pop`, `/api/pop/[id]` (GET detalhe = pop+racks+itens), `/api/rack`, `/api/rack/[id]`, `/api/rack-item`, `/api/rack-item/[id]`.
  - PENDENTE: POP **não está no mapa** ainda (tem geom na tabela, falta UI de posicionar).

### Dashboard e visão geral
- `/dashboard`: KPIs (CTOs, sem coordenada, postes, CEOs, cabos, km de fibra) — `src/lib/stats.ts`.
- `/planta`: visão geral read-only; clica num ponto → "Neste ponto" lista todos co-localizados (CTO+poste+CEO) e mostra os detalhes; mostra também relações (CTOs/CEOs no poste, cabos passando).

---

## 8. Integração SGP (acréscimo — ainda NÃO ligada na UI)

- Conexão pronta em `src/lib/db.ts`. Endpoints de exploração já usados:
  - `GET /api/diag` — testa as duas conexões; mede gap de georref.
  - `GET /api/explore/mapaftth?token=...` — explora o módulo de mapa do SGP.
- **Descobertas (números reais):** SGP tem **2.246 CTOs** (`netcore_splitter`), só **608 (27,1%)** com coordenada válida (`map_ll`, texto sujo). Há um módulo **`mapaftth_*`** no SGP com **937 splitters mapeados** (coordenadas limpas), dos quais **612 casam por nome** (`netcore_splitter.ident`) com a CTO real, + **10 CEOs** e **23 cabos** com geometria. Schema do SGP documentado em `../netgo-bi/docs/NetGo_BD_Documentacao_Completa.md` (repo irmão, só consulta).
- **Plano futuro:** importador (semente) do `mapaftth` → grava nas tabelas nativas (preenchendo `sgp_*_id`); e enriquecimento em tempo real (ocupação/sinal) quando a CTO tiver `sgp_splitter_id`.
- Tabelas-chave do SGP: `netcore_splitter`(CTO; map_ll), `netcore_onu`(sinal em `info->'optical'->>'rx'`), `netcore_olt`/`netcore_oltpon`; cadeia `admcore_*` p/ cliente; `mapaftth_item/coordenada/itemcoordenada/splitter/ceo/cabo`. Reúso de queries: ver repo **netgo-bi** (pasta irmã `../netgo-bi`).

---

## 9. Próximos passos (ordem sugerida)

1. **Fusões / caminho óptico** (o grande diferencial): dentro de uma CEO, registrar emendas fibra-a-fibra (tubo/fibra de cabo de entrada ↔ saída, perda dB). Tabela `fusao` já existe. Depois: montar o **grafo óptico** e o **trace ponta a ponta** (POP→CTO), e **diagnóstico de rompimento**.
2. **POP no mapa** (posicionar; adicionar camada `pop` no MapaShell/overview).
3. **Importador do `mapaftth`** (semear CTOs/CEOs/cabos do SGP) + **enriquecimento SGP** (ocupação/sinal via `sgp_splitter_id`).
4. Refinos do rack (sombra de destino ao arrastar, portas da OLT vinculadas a CTOs).
5. Higiene: tornar repo privado; genericizar host/user do SGP no `.env.example`; rever/remover `/api/migrate`/`/api/explore` ou rotacionar `MIGRATE_TOKEN` quando estabilizar.

---

## 10. Mapa de arquivos (referência rápida)

```
db/schema.sql                         schema do banco próprio (idempotente; ALTERs no fim)
Dockerfile / .dockerignore            build de produção (standalone; copia db/)
src/proxy.ts                          proteção de rotas (ex-"middleware")
src/lib/db.ts                         pool SGP (read-only)
src/lib/appdb.ts                      pool banco próprio (PostGIS)
src/lib/auth.ts / session.ts / users.ts   sessão (HMAC), helper de sessão, usuários (scrypt)
src/lib/cto.ts poste.ts cabo.ts ceo.ts pop.ts   camadas de dados
src/lib/geo.ts                        parseLL (normaliza map_ll do SGP)
src/lib/stats.ts                      KPIs do dashboard
src/components/MapaShell.tsx          mapa compartilhado + contexto useMapa
src/components/PlantaMap.tsx          mapa Leaflet puro (pontos + linhas)
src/components/Sidebar.tsx            navegação
src/components/UsuariosManager.tsx    gestão de usuários (admin)
src/app/(app)/layout.tsx              shell com sidebar (exige sessão)
src/app/(app)/(mapa)/...              abas que compartilham o mapa (planta/ctos/postes/cabos/ceos)
src/app/(app)/dashboard|configuracoes|pops   páginas fora do mapa
src/app/api/...                       rotas REST (cto, poste, cabo, ceo, pop, rack, rack-item, usuarios, diag, migrate, explore, logout)
```

Repo de consulta (NÃO faz parte deste projeto): `../netgo-bi` (BI do provedor; só referência de queries/schema do SGP).
