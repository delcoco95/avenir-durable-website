# Déploiement

Le site est une application Node.js (Next.js) adossée à PostgreSQL. Il s'héberge sur un **serveur privé virtuel** (VPS) ou toute plateforme acceptant Node.js 20+ avec un **disque persistant** (pour les images téléversées) et une base PostgreSQL.

> Les plateformes « serverless » sans disque persistant (Vercel, Netlify…) ne conviennent pas en l'état : la médiathèque écrit sur disque. Un stockage objet (S3) pourrait être ajouté dans `src/lib/media.ts` si besoin.

## 1. Prérequis serveur

- Linux (Debian/Ubuntu), Node.js 22 LTS, PostgreSQL 14+ (`postgresql-client` pour `pg_dump`/`pg_restore`).
- Un proxy HTTPS : Caddy (certificats automatiques) ou Nginx + Certbot.
- Un utilisateur système dédié, par exemple `avenir`.

## 2. Installation

```bash
sudo -u avenir git clone <url-du-depot> /srv/avenir-durable
cd /srv/avenir-durable
sudo -u avenir npm ci
sudo -u avenir cp .env.example .env && sudo -u avenir chmod 600 .env
```

Renseignez `.env` :

```ini
DATABASE_URL=postgres://avenir:MOT_DE_PASSE@127.0.0.1:5432/avenir_durable
SITE_URL=https://avenirdurable.fr
SESSION_SECRET=<openssl rand -hex 32>
UPLOAD_DIR=/srv/avenir-durable/storage/uploads
ALLOW_INDEXING=false          # true seulement à la mise en ligne officielle
SMTP_HOST=…                   # facultatif (voir § 6)
```

`SITE_URL` en `https://` est indispensable en production : il active les cookies de session `Secure` avec le préfixe `__Host-`.

```bash
sudo -u avenir npm run db:migrate
sudo -u avenir npm run db:seed          # uniquement à la première installation
sudo -u avenir npm run build
sudo -u avenir npm run admin:create -- --email prenom.nom@exemple.fr --name "Prénom Nom"
```

## 3. Service systemd (exemple)

`/etc/systemd/system/avenir-durable.service` :

```ini
[Unit]
Description=Site Avenir Durable
After=network.target postgresql.service

[Service]
User=avenir
WorkingDirectory=/srv/avenir-durable
Environment=NODE_ENV=production PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/srv/avenir-durable/storage /srv/avenir-durable/backups

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now avenir-durable
```

## 4. Proxy HTTPS

**Caddy** (`/etc/caddy/Caddyfile`) :

```
avenirdurable.fr, www.avenirdurable.fr {
  encode zstd gzip
  request_body { max_size 12MB }
  reverse_proxy 127.0.0.1:3000 {
    header_up X-Real-IP {remote_host}
  }
}
```

Avec Nginx, transmettez `X-Forwarded-For` / `X-Real-IP` (utilisés pour la limitation des tentatives) et fixez `client_max_body_size 12m;`.

## 5. Tâches planifiées

`crontab -u avenir -e` :

```cron
# Sauvegarde quotidienne à 3 h (30 dernières conservées)
0 3 * * *  cd /srv/avenir-durable && npm run backup >> /var/log/avenir-backup.log 2>&1
# Purge des demandes de contact au-delà de la durée de conservation
30 3 * * * cd /srv/avenir-durable && npm run messages:purge >> /var/log/avenir-purge.log 2>&1
```

Copiez régulièrement le dossier `backups/` **hors du serveur** (stockage chiffré) : il contient des données personnelles.

## 6. Messagerie (facultatif)

Sans SMTP, les demandes de contact restent consultables dans l'administration. Pour recevoir une notification par e-mail, renseignez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (compte d'envoi du fournisseur de messagerie de l'association, par exemple celui associé à l'adresse ecomail.fr), puis redémarrez le service. L'adresse destinataire se règle dans *Paramètres › Coordonnées*.

## 7. Mise à jour

```bash
cd /srv/avenir-durable
sudo -u avenir npm run backup
sudo -u avenir git pull
sudo -u avenir npm ci
sudo -u avenir npm run db:migrate
sudo -u avenir npm run build
sudo systemctl restart avenir-durable
```

## 8. Restauration

```bash
sudo systemctl stop avenir-durable
sudo -u avenir npm run restore -- backups/AAAA-MM-JJ_HHMM   # vérifie les empreintes, demande confirmation
sudo systemctl start avenir-durable
```

## 9. Services facultatifs et politique de sécurité (CSP)

La CSP n'autorise aucune origine tierce. Si l'association active un service facultatif (*Paramètres › Cookies*, ex. une mesure d'audience respectueuse de la vie privée), ajoutez son domaine dans `CSP_EXTRA_SOURCES="https://stats.exemple.fr"` puis **relancez `npm run build`** (les en-têtes sont figés au build). Augmentez aussi la version de la politique cookies pour redemander le consentement.

## 10. Mise en ligne officielle (checklist)

- [ ] Informations légales complétées et pages légales relues
- [ ] Projets d'exemple remplacés ou dépubliés ; contenus « à valider » relus
- [ ] Mode présentation désactivé (*Paramètres › Référencement*)
- [ ] `ALLOW_INDEXING=true` puis redémarrage
- [ ] Sauvegarde quotidienne et copie externe vérifiées (essai de restauration)
- [ ] Compte de démonstration éventuel supprimé ou désactivé ; comptes nominatifs créés
