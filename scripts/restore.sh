#!/usr/bin/env bash
# Restauration d'une sauvegarde créée par backup.sh.
# Usage : npm run restore -- backups/AAAA-MM-JJ_HHMM
# ⚠ Remplace intégralement le contenu actuel de la base et des médias.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:?Indiquez le dossier de sauvegarde, ex. backups/2026-11-01_0300}"
[ -f "$SRC/database.dump" ] || { echo "✖ $SRC/database.dump introuvable"; exit 1; }
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

( cd "$SRC" && sha256sum -c SHA256SUMS ) || { echo "✖ Fichiers de sauvegarde altérés"; exit 1; }

read -r -p "Cette opération remplace la base et les médias actuels. Continuer ? (oui/non) " answer
[ "$answer" = "oui" ] || { echo "Annulé."; exit 0; }

echo "→ Base de données…"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$SRC/database.dump"

if [ -f "$SRC/uploads.tar.gz" ]; then
  echo "→ Médias…"
  mkdir -p "$UPLOADS"
  find "$UPLOADS" -mindepth 1 -delete
  tar -xzf "$SRC/uploads.tar.gz" -C "$UPLOADS"
fi
echo "✔ Restauration terminée. Redémarrez l'application."
