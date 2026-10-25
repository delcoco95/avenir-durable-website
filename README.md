# Avenir Durable — site vitrine et espace d'administration

Site vitrine de **L'Avenir Durable**, projet de sensibilisation et de mobilisation du public aux enjeux environnementaux et de développement durable (ateliers, activités, actions concrètes), avec un **espace d'administration** permettant à l'association de gérer tous ses contenus sans toucher au code.

> **Première version de présentation.** Les contenus non confirmés sont signalés « à valider » dans l'administration et le site n'est pas indexé par les moteurs de recherche. Voir [Points à valider par l'association](#points-à-valider-par-lassociation).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Compte administrateur](#compte-administrateur)
- [Commandes](#commandes)
- [Administration](#administration)
- [Déploiement, sauvegardes, restauration](#déploiement-sauvegardes-restauration)
- [Sécurité et conformité](#sécurité-et-conformité)
- [Arborescence](#arborescence)
- [Points à valider par l'association](#points-à-valider-par-lassociation)

## Fonctionnalités

**Site public**
- Accueil, À propos, Nos actions (+ une page par domaine), Projets (+ une page par projet, filtres par domaine), FAQ, Contact, Partenaires (prête, non publiée), Mentions légales, Politique de confidentialité, Gestion des cookies, page 404.
- Identité visuelle fondée sur le logo et le site existants ; motif signature des **cernes de croissance** (coupe d'un chêne) animé en CSS/SVG : apparition du titre ligne à ligne, photo cadrée d'anneaux qui respirent, graines en orbite, démarche en cycle dessinée au défilement, micro-interactions. `prefers-reduced-motion` respecté, contenu lisible sans JavaScript.
- Formulaire de contact : validation serveur, messages d'erreur accessibles, état de succès, pot de miel + délai minimal anti-robots, limitation à 5 envois/heure/IP, enregistrement en base, notification e-mail si SMTP configuré.
- SEO : titres et descriptions par page, Open Graph, `sitemap.xml`, `robots.txt`, URL lisibles, une seule balise H1 par page. Indexation bloquée tant que le mode présentation est actif.
- Aucune ressource tierce (polices auto-hébergées) ; aucun cookie pour les visiteurs ; gestionnaire de consentement extensible qui n'apparaît que si un service facultatif est activé.

**Administration (`/admin`)**
- Tableau de bord : pages, projets, demandes, contenus à valider, modifications récentes, raccourcis.
- **Pages** composées de 13 types de sections (en-tête, message fort, texte, image + texte, valeurs, démarche, domaines, projets, partenaires, FAQ, appel à l'action, contact, contenu légal) : modifier, ajouter, dupliquer, supprimer, réordonner ; **brouillon / aperçu / publication / dépublication / annulation des modifications** ; réglages menu, pied de page, SEO, image de partage. Création et suppression (avec confirmation) des pages non essentielles.
- **Projets**, **domaines d'intervention**, **FAQ**, **partenaires** : création, modification, statut, ordre, suppression.
- **Médiathèque** : import (glisser-déposer, multi-fichiers), validation du contenu réel des fichiers, conversion WebP en 3 tailles, suppression des métadonnées, texte alternatif, titre, crédit, remplacement, suppression refusée tant que l'image est utilisée.
- **Demandes de contact** : liste filtrable, détail, statut nouveau / traité / archivé, réponse par e-mail, suppression (administrateurs), purge selon la durée de conservation.
- **Paramètres** : identité et logo, palette de couleurs (contraste contrôlé), coordonnées, réseaux sociaux, pied de page, SEO et mode présentation, formulaire, informations légales, données personnelles, cookies et services facultatifs.
- **Comptes nominatifs** (administrateur / éditeur), mot de passe temporaire à changer à la première connexion, désactivation, réinitialisation ; **journal d'activité**.

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Application | **Next.js 15** (App Router, Server Components, Server Actions), **React 19**, **TypeScript** strict | Rendu serveur rapide, une seule application pour le site et l'administration |
| Base de données | **PostgreSQL 16** via **Drizzle ORM** (requêtes paramétrées, migrations SQL versionnées) | Fiable, standard chez les hébergeurs, sauvegardes `pg_dump` |
| Authentification | Sessions serveur en base (jeton aléatoire, seule son empreinte SHA-256 est stockée), mots de passe **Argon2id** | Simple, sans dépendance tierce, révocable |
| Validation | **Zod** côté serveur sur toutes les entrées | Aucune donnée non validée n'atteint la base |
| Images | **sharp** (WebP, 480/1200/2000 px) | Optimisation automatique et neutralisation des fichiers |
| Styles | CSS natif (variables, `color-mix`, animations `transform`/`opacity`) | Aucune bibliothèque d'animation, chargement léger |
| Polices | Fraunces (titres) + Work Sans (texte, police du site existant), auto-hébergées | Pas d'appel à Google Fonts (RGPD) |
| Tests | **Vitest** (unitaires + intégration PostgreSQL), scénario navigateur **Playwright** | Voir [docs/TESTS.md](docs/TESTS.md) |

## Installation

Prérequis : **Node.js 20.9+** (22 recommandé), **PostgreSQL 14+**, `pg_dump`/`pg_restore` pour les sauvegardes.

```bash
git clone <url-du-depot> avenir-durable-website
cd avenir-durable-website
npm ci
cp .env.example .env          # puis renseignez les valeurs (voir ci-dessous)
```

Création de la base (exemple local) :

```bash
sudo -u postgres psql -c "create role avenir login password 'un-mot-de-passe-fort';"
sudo -u postgres psql -c "create database avenir_durable owner avenir;"
sudo -u postgres psql -c "create database avenir_durable_test owner avenir;"   # pour les tests
```

## Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example). Les principales :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (obligatoire) |
| `SITE_URL` | URL publique sans `/` final. **Doit commencer par `https://` en production** : cela active les cookies `Secure` / `__Host-` |
| `SESSION_SECRET` | 32 octets aléatoires (`openssl rand -hex 32`) ; obligatoire en production |
| `UPLOAD_DIR` | Dossier des images téléversées (hors du dossier public) |
| `ALLOW_INDEXING` | `true` uniquement pour le site officiel validé |
| `SMTP_*` | Messagerie pour les notifications de contact (facultatif) |
| `CSP_EXTRA_SOURCES` | Domaines autorisés pour un service facultatif (statistiques…), à définir avant `npm run build` |
| `TEST_DATABASE_URL` | Base dédiée aux tests d'intégration (vidée à chaque exécution) |

Aucun secret n'est versionné : `.env` est exclu par `.gitignore`.

## Base de données

```bash
npm run db:migrate     # applique les migrations (database/migrations)
npm run db:seed        # contenus initiaux (ne fait rien si des pages existent)
```

`npm run db:seed -- --force` **réinitialise tous les contenus** (pages, projets, FAQ, médias, paramètres) — à réserver au développement.

Après une modification de `src/db/schema.ts` : `npm run db:generate` crée une nouvelle migration SQL à relire puis versionner.

## Compte administrateur

Aucun identifiant n'existe dans le dépôt. Le premier compte se crée en ligne de commande :

```bash
npm run admin:create -- --email prenom.nom@exemple.fr --name "Prénom Nom"
```

Un **mot de passe temporaire aléatoire** est affiché une seule fois dans le terminal ; il doit être remplacé à la première connexion sur `/admin/connexion` (12 caractères minimum, 3 types de caractères, ou phrase de passe de 16 caractères et plus). Les comptes suivants se créent depuis **Administration › Comptes**. En cas d'oubli : `npm run admin:create -- --email … --reset`.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` puis `npm start` | Build de production puis démarrage (`PORT`, 3000 par défaut) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires et d'intégration (nécessite `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Scénario navigateur complet (voir [docs/TESTS.md](docs/TESTS.md)) |
| `npm run backup` / `npm run restore -- <dossier>` | Sauvegarde / restauration base + médias |
| `npm run messages:purge` | Supprime les demandes plus anciennes que la durée de conservation |

## Administration

Guide pour l'association : **[docs/ADMIN.md](docs/ADMIN.md)**. En résumé : `/admin` → se connecter → modifier une page → **Enregistrer le brouillon** (invisible) → **Enregistrer et prévisualiser** → **Publier**.

## Déploiement, sauvegardes, restauration

Procédure complète (serveur, proxy HTTPS, service systemd, tâches planifiées, mise en ligne officielle) : **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

```bash
npm run backup                              # → backups/AAAA-MM-JJ_HHMM/ (base + médias + empreintes SHA-256)
npm run restore -- backups/AAAA-MM-JJ_HHMM  # vérifie les empreintes, demande confirmation
```

## Sécurité et conformité

- Authentification serveur ; chaque page et **chaque action d'administration** revérifie la session et le rôle en base (le filtre `/admin` n'est qu'un confort).
- Mots de passe Argon2id ; sessions de 8 h, expirées après 2 h d'inactivité, fermées au changement de mot de passe ou à la désactivation du compte ; cookie `HttpOnly`, `SameSite=Strict`, `Secure` + préfixe `__Host-` en HTTPS.
- Force brute : blocage 15 min après 5 échecs sur un compte ou 20 depuis une IP ; temps de réponse identique que le compte existe ou non ; adresses IP stockées uniquement sous forme d'empreinte HMAC.
- Injections SQL : requêtes paramétrées (Drizzle). XSS : échappement React, Markdown nettoyé (liste blanche, `javascript:`/`data:` refusés), liens des boutons validés. CSRF : actions serveur Next.js (contrôle d'origine) + cookie `SameSite=Strict`.
- En-têtes : CSP stricte (aucune origine tierce), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production ; `/admin` en `no-store` et `noindex`.
- Fichiers : type déterminé par le contenu réel, SVG et exécutables refusés, ré-encodage WebP, noms aléatoires, stockage hors du dossier public.
- Erreurs : messages génériques côté utilisateur, détails uniquement dans les journaux serveur. Journal d'activité des opérations sensibles.
- RGPD : minimisation (pas d'IP stockée avec les messages), durée de conservation paramétrable et purge, pages légales générées depuis les paramètres avec mentions « À compléter » visibles, aucun traceur, consentement « tout accepter / tout refuser / personnaliser » prêt pour d'éventuels services, preuve de consentement anonyme. *Les textes légaux doivent être relus et validés par l'association : le développement ne vaut pas validation juridique.*

## Arborescence

```
src/
  app/(site)/          pages publiques (accueil, [slug], projets/[slug], nos-actions/[slug], aperçu)
  app/admin/           administration : (auth) connexion & mot de passe, (panel) écrans, actions/ serveur
  app/api/consent/     preuve de consentement · app/media/ diffusion des images · sitemap.ts · robots.ts
  components/site/     composants publics (sections, en-tête, pied de page, consentement, motifs SVG)
  components/admin/    composants d'administration (éditeur de pages, formulaires, médiathèque)
  db/                  schéma Drizzle et connexion
  lib/                 sessions, mots de passe, limitation de débit, médias, paramètres, sections, Markdown
  styles/              jetons de design, site, administration
database/migrations/   migrations SQL · database/seed-assets/ logo et photo d'origine
scripts/               migration, contenus initiaux, création de compte, sauvegarde, restauration, purge
tests/                 unit/, integration/, e2e/
docs/                  RESEARCH.md, ADMIN.md, DEPLOYMENT.md, TESTS.md, PRESENTATION.md
```

## Points à valider par l'association

Détail et sources : [docs/RESEARCH.md](docs/RESEARCH.md). En bref :

1. Identité juridique (statut, RNA/SIREN, adresse), directeur·rice de la publication, hébergeur → *Paramètres › Informations légales*.
2. Lien éventuel avec **Avenir Durable International** (`avenirdurable.org`, structure distincte à ce stade).
3. Thématiques, publics et territoire ; textes des domaines et des valeurs (marqués « À valider »).
4. Projets réels pour remplacer les **3 exemples** (badge « Exemple à valider » sur le site).
5. Partenaires confirmés (page Partenaires prête, non publiée).
6. Réseaux sociaux officiels, logo vectoriel, photos et autorisations de droit à l'image.
7. Relecture des textes légaux ; puis désactivation du mode présentation et `ALLOW_INDEXING=true` à la mise en ligne.
