FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

COPY prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist/

RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
