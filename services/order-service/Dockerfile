FROM node:20-alpine AS builder
WORKDIR /app
COPY services/order-service/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
COPY --from=builder /app/node_modules ./node_modules
COPY services/order-service/ ./
COPY shared/ /app/shared/
RUN chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
CMD ["node", "src/app.js"]
