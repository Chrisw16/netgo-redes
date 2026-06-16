# ── Dockerfile de produção do NetGo Redes (Next.js 16, output standalone) ─────
# Multi-stage: instala deps → builda → roda só o necessário (imagem enxuta).

# 1) Dependências
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat ajuda alguns pacotes nativos no Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Pools de banco são preguiçosos: o build NÃO precisa de senhas/URLs.
RUN npm run build

# 3) Runner (produção)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário não-root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída standalone: server.js + node_modules mínimo, assets e estáticos.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
