#!/bin/bash
# =====================================================
# MI APP — Script de deploy en VPS Linux
# Ejecutar como: sudo bash deploy.sh
# =====================================================

set -euo pipefail

echo "🚀 Iniciando deploy de MI APP..."

# 1. Actualizar código
git pull origin main

# 2. Backend
echo "📦 Instalando dependencias del backend..."
cd backend && npm ci --only=production && cd ..

# 3. Correr migraciones
echo "🗄️  Ejecutando migraciones..."
cd backend && node migrations/run.js && cd ..

# 4. Reiniciar con PM2
echo "♻️  Reiniciando servidor..."
pm2 reload ecosystem.config.js --env production

# 5. Recargar Nginx
echo "🌐 Recargando Nginx..."
nginx -t && sudo systemctl reload nginx

echo "✅ Deploy completado exitosamente"
pm2 status
