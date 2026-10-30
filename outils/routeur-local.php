<?php
/*
 * Routeur pour le serveur PHP intégré : sert le site sur votre ordinateur, comme l'hébergement le ferait.
 * Utilisé uniquement par « lancer-en-local.bat » (php -S localhost:8000 -t www outils/routeur-local.php).
 * Il n'est jamais envoyé sur l'hébergement.
 */
$www = realpath(__DIR__ . '/../www');
$uri = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Fichiers cachés (.env, .htaccess…) et dossiers de données : jamais servis (comme sur l'hébergement)
if (preg_match('#/\.|/admin/data(/|$)#', $uri)) { http_response_code(404); echo 'Introuvable'; return true; }
// Dossier content : seul site.json est lisible
if (strpos($uri, '/content/') === 0 && $uri !== '/content/site.json') { http_response_code(404); echo 'Introuvable'; return true; }
// Seuls admin/api.php et contact.php peuvent être exécutés
if (preg_match('#\.php$#i', $uri) && $uri !== '/admin/api.php' && $uri !== '/contact.php') { http_response_code(404); echo 'Introuvable'; return true; }

function send_page($file) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    readfile($file);
    return true;
}
if ($uri === '/' || $uri === '/index.html') {
    return send_page(is_file("$www/accueil.html") ? "$www/accueil.html" : "$www/accueil-initial.html");
}
if ($uri === '/mentions-legales.html' && !is_file("$www/mentions-legales.html")) {
    return send_page("$www/mentions-legales-initial.html");
}
if ($uri === '/admin') { header('Location: /admin/'); return true; }
if ($uri === '/admin/') return send_page("$www/admin/index.html");
if (!is_file($www . $uri)) { http_response_code(404); echo 'Introuvable'; return true; }
return false; // fichier ordinaire : servi tel quel par PHP
