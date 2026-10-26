#!/usr/bin/env bash
# Prépare une copie statique du site pour GitHub Pages (sans l'administration PHP).
# Usage : bash outils/preparer-github-pages.sh _site
set -euo pipefail
OUT="${1:-_site}"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r www/. "$OUT"/
rm -rf "$OUT/admin" "$OUT/assets/admin"
find "$OUT" -name '.htaccess' -delete
cp "$OUT/accueil.html" "$OUT/index.html"
[ -f "$OUT/mentions-legales.html" ] || cp "$OUT/mentions-legales-initial.html" "$OUT/mentions-legales.html"
# Pas d'administration sur cette version : on retire le lien du pied de page
for f in "$OUT/index.html" "$OUT/accueil.html" "$OUT/mentions-legales.html"; do
  sed -i 's#<a class="admin-link"[^>]*>[^<]*</a>##' "$f"
done
touch "$OUT/.nojekyll"
echo "Site statique prêt dans $OUT"
