#!/usr/bin/env bash
# Lance tous les tests automatiques du site, sans toucher à votre .env ni à vos données :
# une copie du site est préparée dans un dossier temporaire, avec un .env de test et un faux serveur d'e-mails.
# Prérequis : PHP 8.1+, Node.js, Python 3 et Playwright (npm install -g playwright && npx playwright install chromium).
# Usage : bash tests/lancer-tests.sh [dossier-des-captures]
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TMP="$(mktemp -d)"
SHOTS="${1:-$TMP/captures}"
mkdir -p "$SHOTS"
PHP_PORT=8765; PAGES_PORT=8766; SMTP_PORT=2526

cp -r www outils "$TMP/"
rm -f "$TMP/www/accueil.html.bak"
cat > "$TMP/.env" <<EOF
ADMIN_USER=test-admin
ADMIN_PASSWORD=mot-de-passe-de-depart
CONTACT_TO=test-reception@example.org
SMTP_HOST=127.0.0.1
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=none
SMTP_FROM=site@example.org
EOF
(cd "$ROOT" && bash outils/preparer-github-pages.sh "$TMP/pages" >/dev/null)

python3 tests/smtp-test.py $SMTP_PORT "$TMP/messages.txt" & SMTP_PID=$!
php -S 127.0.0.1:$PHP_PORT -t "$TMP/www" "$TMP/outils/routeur-local.php" >"$TMP/php.log" 2>&1 & PHP_PID=$!
python3 -m http.server $PAGES_PORT --bind 127.0.0.1 --directory "$TMP/pages" >/dev/null 2>&1 & PAGES_PID=$!
trap 'kill $SMTP_PID $PHP_PID $PAGES_PID 2>/dev/null; rm -rf "$TMP/www" "$TMP/pages"' EXIT
sleep 1

NODE_PATH="${NODE_PATH:-$(npm root -g)}" node tests/tests-site.js "http://127.0.0.1:$PHP_PORT" "$TMP/messages.txt" "http://127.0.0.1:$PAGES_PORT" "$SHOTS"
echo "Captures d'écran : $SHOTS"
