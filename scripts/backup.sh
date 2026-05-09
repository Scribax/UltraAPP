#!/bin/bash
# =====================================================
# MI APP — Script de Backup PostgreSQL
# Instalar en cron: crontab -e
# 0 3 * * * /opt/miapp/scripts/backup.sh >> /var/log/miapp-backup.log 2>&1
# =====================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────
DB_NAME="${DB_NAME:-miapp_db}"
DB_USER="${DB_USER:-miapp_user}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="/var/backups/miapp"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="${BACKUP_DIR}/db_${DATE}.sql.gz"

# ── Crear directorio si no existe ─────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup de $DB_NAME..."

# ── Dump + comprimir ──────────────────────────────────
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$FILENAME"

SIZE=$(du -sh "$FILENAME" | cut -f1)
echo "[$(date)] Backup completado: $FILENAME ($SIZE)"

# ── Eliminar backups viejos ───────────────────────────
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls "$BACKUP_DIR" | wc -l)
echo "[$(date)] Backups actuales: $REMAINING (retención: $RETENTION_DAYS días)"

# ── Opcional: subir a S3/R2 ───────────────────────────
# Descomentar si tienes AWS CLI configurado:
# aws s3 cp "$FILENAME" "s3://miapp-backups/$(basename $FILENAME)"
# echo "[$(date)] Backup subido a S3"

echo "[$(date)] ✅ Proceso completado"
