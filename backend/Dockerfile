FROM node:20-alpine

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar dependencias primero (cache layer)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3001

# dumb-init evita problemas de PID 1 con Node.js
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "pm2-runtime", "ecosystem.config.js"]
