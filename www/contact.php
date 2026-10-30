<?php
/*
 * L'Avenir Durable : envoi du formulaire de contact (hébergement PHP, par exemple OVHcloud, ou en local).
 * Sur GitHub Pages (pas de PHP), le site envoie le formulaire au service FormSubmit à la place.
 *
 * Réglages dans le fichier .env (à la racine, à côté du dossier www) :
 *   CONTACT_TO=avenirdurable@ecomail.fr      destinataire (sinon : adresse « org.email » de content/site.json)
 *   SMTP_HOST=ssl0.ovh.net                   serveur d'envoi ; sans SMTP_HOST, la fonction mail() de l'hébergeur est utilisée
 *   SMTP_PORT=465                            465 (SSL) ou 587 (STARTTLS)
 *   SMTP_SECURE=ssl                          ssl, tls (STARTTLS) ou none (uniquement en local)
 *   SMTP_USER=…  SMTP_PASSWORD=…             identifiants de la boîte d'envoi
 *   SMTP_FROM=…                              adresse d'expédition (par défaut SMTP_USER)
 *
 * Protection contre les robots et les abus : jeton signé obligatoire (délai minimum de 3 secondes entre
 * l'ouverture du formulaire et l'envoi), champ piège invisible, limitation du nombre d'envois par adresse IP
 * et pour tout le site, contrôle de l'origine, longueur des champs, aucun saut de ligne dans les en-têtes.
 * Aucun message n'est conservé sur le serveur.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

define('WWW', __DIR__);
define('MIN_DELAY', 3);            // secondes minimum entre l'ouverture du formulaire et l'envoi
define('TOKEN_LIFE', 2 * 3600);    // validité du jeton
define('IP_MAX', 3);               // envois par adresse IP…
define('IP_WINDOW', 10 * 60);      // …sur 10 minutes
define('IP_DAY_MAX', 10);          // envois par adresse IP sur 24 h
define('GLOBAL_DAY_MAX', 60);      // envois pour tout le site sur 24 h

$REASONS = array(
    'question' => 'Question',
    'atelier' => 'Participer à un atelier',
    'partenariat' => 'Partenariat ou bénévolat',
);

function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail($code, $msg, $field = null) { out($code, array('ok' => false, 'error' => $msg, 'field' => $field)); }

/* ---------- .env et dossier de données (mêmes emplacements que l'administration) ---------- */
function env() {
    static $env = null;
    if ($env !== null) return $env;
    $env = array();
    foreach (array(dirname(WWW) . '/.env', WWW . '/.env') as $f) {
        if (!is_file($f) || !is_readable($f)) continue;
        foreach (preg_split('/\r\n|\r|\n/', (string) file_get_contents($f)) as $line) {
            $t = trim($line);
            if ($t === '' || $t[0] === '#' || strpos($t, '=') === false) continue;
            $k = trim(substr($t, 0, strpos($t, '=')));
            $v = trim(substr($t, strpos($t, '=') + 1));
            if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) $v = substr($v, 1, -1);
            $env[$k] = $v;
        }
        break;
    }
    return $env;
}
function env_get($k, $default = '') { $e = env(); return isset($e[$k]) && $e[$k] !== '' ? $e[$k] : $default; }
function data_dir() {
    foreach (array(dirname(WWW) . '/avenir-data', WWW . '/admin/data') as $d) {
        if (!is_dir($d)) @mkdir($d, 0700, true);
        if (is_dir($d) && is_writable($d)) {
            if (strpos($d, WWW) === 0 && !is_file($d . '/.htaccess')) {
                @file_put_contents($d . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
            }
            if (!is_dir("$d/contact")) @mkdir("$d/contact", 0700);
            return "$d/contact";
        }
    }
    fail(500, "Le serveur ne peut pas traiter le message pour le moment. Écrivez-nous directement par e-mail.");
}
function secret() {
    $s = env_get('CONTACT_SECRET');
    if (strlen($s) >= 16) return $s;
    $f = data_dir() . '/secret';
    if (is_file($f)) { $s = trim((string) file_get_contents($f)); if (strlen($s) >= 32) return $s; }
    $s = bin2hex(random_bytes(32));
    @file_put_contents($f, $s, LOCK_EX);
    @chmod($f, 0600);
    return $s;
}
function client_ip() { return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'inconnue'; }

/* ---------- Limitation des envois ---------- */
function hits($key, $window) {
    $f = data_dir() . '/' . hash('sha256', $key) . '.json';
    $list = is_file($f) ? json_decode((string) file_get_contents($f), true) : array();
    $now = time();
    return array_values(array_filter(is_array($list) ? $list : array(), function ($t) use ($now, $window) { return is_int($t) && $t > $now - $window; }));
}
function add_hit($key) {
    $f = data_dir() . '/' . hash('sha256', $key) . '.json';
    $list = hits($key, 86400);
    $list[] = time();
    @file_put_contents($f, json_encode($list), LOCK_EX);
}

/* ---------- Envoi SMTP minimal (SSL ou STARTTLS, AUTH LOGIN) ---------- */
function smtp_send($to, $from, $replyTo, $subject, $body) {
    $host = env_get('SMTP_HOST');
    $secure = strtolower(env_get('SMTP_SECURE', 'ssl'));
    $port = (int) env_get('SMTP_PORT', $secure === 'ssl' ? '465' : '587');
    $user = env_get('SMTP_USER');
    $pass = env_get('SMTP_PASSWORD');
    $ctx = stream_context_create(array('ssl' => array('verify_peer' => true, 'verify_peer_name' => true)));
    $fp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new Exception('Connexion SMTP impossible');
    stream_set_timeout($fp, 15);
    $read = function () use ($fp) {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) { $data .= $line; if (strlen($line) < 4 || $line[3] === ' ') break; }
        return $data;
    };
    $cmd = function ($c, $expect) use ($fp, $read) {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $read();
        if ((int) substr($r, 0, 3) !== $expect) throw new Exception('Réponse SMTP inattendue');
        return $r;
    };
    $me = preg_replace('/[^a-z0-9.-]/i', '', isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost') ?: 'localhost';
    $cmd(null, 220);
    $cmd('EHLO ' . $me, 250);
    if ($secure === 'tls') {
        $cmd('STARTTLS', 220);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new Exception('STARTTLS impossible');
        $cmd('EHLO ' . $me, 250);
    }
    if ($user !== '') {
        $cmd('AUTH LOGIN', 334);
        $cmd(base64_encode($user), 334);
        $cmd(base64_encode($pass), 235);
    }
    $cmd('MAIL FROM:<' . $from . '>', 250);
    $cmd('RCPT TO:<' . $to . '>', 250);
    $cmd('DATA', 354);
    $headers = build_headers($to, $from, $replyTo, $subject, true);
    $msg = $headers . "\r\n" . chunk_split(base64_encode($body), 76, "\r\n");
    fwrite($fp, str_replace("\n.", "\n..", $msg) . "\r\n.\r\n");
    $cmd(null, 250);
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
}
function enc($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function build_headers($to, $from, $replyTo, $subject, $full) {
    $h = array();
    if ($full) {
        $h[] = 'Date: ' . date('r');
        $h[] = 'To: <' . $to . '>';
        $h[] = 'Subject: ' . enc($subject);
        $h[] = 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@'), 1) . '>';
    }
    $h[] = 'From: ' . enc("Site L'Avenir Durable") . ' <' . $from . '>';
    $h[] = 'Reply-To: <' . $replyTo . '>';
    $h[] = 'MIME-Version: 1.0';
    $h[] = 'Content-Type: text/plain; charset=UTF-8';
    $h[] = 'Content-Transfer-Encoding: base64';
    $h[] = 'X-Mailer: avenir-contact';
    return implode("\r\n", $h) . "\r\n";
}

/* ---------- Requête ---------- */
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

// Jeton signé, demandé à l'ouverture du formulaire
if ($method === 'GET') {
    $t = (string) time();
    out(200, array('ok' => true, 'token' => $t . '.' . hash_hmac('sha256', $t, secret())));
}
if ($method !== 'POST') { header('Allow: GET, POST'); fail(405, 'Méthode non autorisée.'); }

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== $host) fail(403, 'Origine refusée.');

$ct = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
if (stripos($ct, 'application/json') === 0) {
    $raw = (string) file_get_contents('php://input', false, null, 0, 64 * 1024);
    $b = json_decode($raw, true);
} else {
    $b = $_POST;
}
if (!is_array($b)) fail(400, 'Requête illisible.');
$f = function ($k, $max) use ($b) {
    $v = isset($b[$k]) && is_string($b[$k]) ? $b[$k] : '';
    $v = str_replace("\0", '', trim($v));
    return $max ? mb_substr($v, 0, $max + 1, 'UTF-8') : $v;
};

// Champ piège : rempli uniquement par les robots. On répond « envoyé » sans rien envoyer.
if ($f('site_web', 200) !== '') out(200, array('ok' => true));

// Jeton : signé par le serveur, au moins 3 secondes et au plus 2 heures
$token = $f('token', 200);
if (!preg_match('/^(\d{9,11})\.([a-f0-9]{64})$/', $token, $m) || !hash_equals(hash_hmac('sha256', $m[1], secret()), $m[2])) {
    fail(400, 'Le formulaire a expiré. Fermez-le et ouvrez-le à nouveau.');
}
$age = time() - (int) $m[1];
if ($age < MIN_DELAY) fail(429, 'Envoi trop rapide. Patientez quelques secondes puis réessayez.');
if ($age > TOKEN_LIFE) fail(400, 'Le formulaire a expiré. Fermez-le et ouvrez-le à nouveau.');

$name = preg_replace('/[\r\n\t]+/', ' ', $f('nom', 100));
$email = $f('email', 200);
$reason = $f('motif', 30);
$subject = preg_replace('/[\r\n\t]+/', ' ', $f('objet', 150));
$message = $f('message', 5000);
$consent = isset($b['consentement']) && ($b['consentement'] === true || $b['consentement'] === 'oui' || $b['consentement'] === 'on');

if (mb_strlen($name, 'UTF-8') < 2 || mb_strlen($name, 'UTF-8') > 100) fail(422, 'Indiquez votre nom (2 à 100 caractères).', 'nom');
if (strlen($email) > 200 || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n<>,;"]/', $email)) fail(422, 'Indiquez une adresse e-mail valide.', 'email');
if (!isset($REASONS[$reason])) fail(422, 'Choisissez le motif de votre message.', 'motif');
if (mb_strlen($subject, 'UTF-8') < 3 || mb_strlen($subject, 'UTF-8') > 150) fail(422, "Indiquez l'objet de votre message (3 à 150 caractères).", 'objet');
if (mb_strlen($message, 'UTF-8') < 10 || mb_strlen($message, 'UTF-8') > 5000) fail(422, 'Écrivez votre message (10 à 5000 caractères).', 'message');
if (!$consent) fail(422, "Cochez la case d'accord pour que nous puissions vous répondre.", 'consentement');

// Limitation des envois
$ip = client_ip();
if (count(hits('ip:' . $ip, IP_WINDOW)) >= IP_MAX || count(hits('ip:' . $ip, 86400)) >= IP_DAY_MAX) {
    fail(429, 'Vous avez envoyé plusieurs messages en peu de temps. Réessayez un peu plus tard.');
}
if (count(hits('global', 86400)) >= GLOBAL_DAY_MAX) fail(429, "Trop de messages aujourd'hui. Réessayez demain ou appelez-nous.");

// Destinataire
$to = env_get('CONTACT_TO');
if ($to === '') {
    $site = json_decode((string) @file_get_contents(WWW . '/content/site.json'), true);
    $to = isset($site['org']['email']) ? (string) $site['org']['email'] : '';
}
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail(500, "L'adresse de réception n'est pas configurée.");

$from = env_get('SMTP_FROM', env_get('SMTP_USER', env_get('CONTACT_FROM')));
if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
    $h = preg_replace('/^www\./', '', preg_replace('/:\d+$/', '', strtolower($host)));
    $from = 'ne-pas-repondre@' . (preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $h) ? $h : 'localhost.localdomain');
}

$mailSubject = '[Site] ' . $REASONS[$reason] . ' : ' . $subject;
$body = "Nouveau message envoyé depuis le formulaire de contact du site.\n\n" .
    "Nom : $name\nE-mail : $email\nMotif : {$REASONS[$reason]}\nObjet : $subject\n\n" .
    "Message :\n$message\n\n" .
    "---\nPour répondre, utilisez simplement « Répondre » : le message ira à $email.\n" .
    'Envoyé le ' . date('d/m/Y à H:i') . " ; l'expéditeur a accepté que ses données servent à lui répondre.\n";

try {
    if (env_get('SMTP_HOST') !== '') {
        smtp_send($to, $from, $email, $mailSubject, $body);
    } else {
        $ok = function_exists('mail') && @mail($to, enc($mailSubject), chunk_split(base64_encode($body)), build_headers($to, $from, $email, $mailSubject, false), '-f' . $from);
        if (!$ok) throw new Exception('mail() a échoué');
    }
} catch (Exception $e) {
    error_log('contact.php : ' . $e->getMessage());
    fail(502, "Le message n'a pas pu être envoyé. Réessayez plus tard ou écrivez-nous directement par e-mail.");
}
add_hit('ip:' . $ip);
add_hit('global');
out(200, array('ok' => true));
