#!/usr/bin/env bash
# Prépare une copie statique du site pour GitHub Pages (sans l'administration PHP).
# Usage : bash outils/preparer-github-pages.sh _site
set -euo pipefail
OUT="${1:-_site}"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r www/. "$OUT"/
# L'administration a besoin de PHP : la page est publiée (elle explique comment l'ouvrir en local), jamais le programme api.php
rm -f "$OUT/admin/api.php"
rm -rf "$OUT/admin/data"
# Pas de PHP sur GitHub Pages : le formulaire de contact passe par FormSubmit (voir assets/site.js)
rm -f "$OUT/contact.php"
find "$OUT" -name '.htaccess' -delete
cp "$OUT/accueil.html" "$OUT/index.html"
[ -f "$OUT/mentions-legales.html" ] || cp "$OUT/mentions-legales-initial.html" "$OUT/mentions-legales.html"
touch "$OUT/.nojekyll"
echo "Site statique prêt dans $OUT"
