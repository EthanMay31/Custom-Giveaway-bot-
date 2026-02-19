# -- Builder stage --
FROM node:latest AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# -- Runtime stage --
FROM node:latest

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist/

USER node

CMD ["node", "dist/index.js"]
