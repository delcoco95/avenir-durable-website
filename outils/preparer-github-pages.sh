#!/usr/bin/env bash
# Le site est hébergé chez OVHcloud (https://avenirdurable.fr). L'ancienne adresse GitHub Pages
# renvoie désormais chaque visiteur (et Google) vers la même page sur avenirdurable.fr.
# Usage : bash outils/preparer-github-pages.sh _site
set -euo pipefail
OUT="${1:-_site}"
SITE="https://avenirdurable.fr"
rm -rf "$OUT" && mkdir -p "$OUT"
page() {
cat <<HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>L'Avenir Durable a déménagé</title>
<link rel="canonical" href="$SITE/">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=$SITE/">
<script>location.replace('$SITE' + location.pathname.replace(/^\/avenir-durable-website/, '').replace(/^\/index\.html$/, '/') + location.search + location.hash);</script>
</head>
<body><p>Le site L'Avenir Durable est maintenant à l'adresse <a href="$SITE/">avenirdurable.fr</a>.</p></body>
</html>
HTML
}
page > "$OUT/index.html"
page > "$OUT/404.html"
touch "$OUT/.nojekyll"
echo "Page de redirection prête dans $OUT"
