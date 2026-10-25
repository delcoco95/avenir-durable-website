#!/usr/bin/env bash
# Sauvegarde complète : base PostgreSQL (format custom) + images téléversées.
# Usage : npm run backup            → backups/AAAA-MM-JJ_HHMM/
#         BACKUP_DIR=/chemin npm run backup
# Les sauvegardes contiennent des données personnelles (demandes de contact) :
# stockez-les dans un emplacement protégé et chiffré, jamais dans le dépôt Git.
set -euo pipefail
cd "$(dirname "$0")/.."

# Charge .env sans écraser les variables déjà définies dans l'environnement
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    value="${value%\"}"; value="${value#\"}"
    [ -z "${!key+x}" ] && export "$key=$value"
  done < .env
fi
: "${DATABASE_URL:?DATABASE_URL doit être défini}"
UPLOADS="${UPLOAD_DIR:-./storage/uploads}"
DEST="${BACKUP_DIR:-./backups}/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DEST"
chmod 700 "$DEST"

echo "→ Base de données…"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$DEST/database.dump"

echo "→ Médias…"
if [ -d "$UPLOADS" ]; then
  tar -czf "$DEST/uploads.tar.gz" -C "$UPLOADS" .
else
  echo "  (aucun dossier de médias)"
fi

( cd "$DEST" && sha256sum * > SHA256SUMS )
echo "✔ Sauvegarde créée : $DEST"

# Rotation : conserve les 30 sauvegardes les plus récentes
KEEP="${BACKUP_KEEP:-30}"
ls -1dt "${BACKUP_DIR:-./backups}"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf
