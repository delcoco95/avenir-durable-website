# L'Avenir Durable — site vitrine

Site d'une page pour **L'Avenir Durable** — en ligne sur **https://avenirdurable.fr** (hébergement OVHcloud) (sensibilisation aux enjeux environnementaux et au développement durable), avec un **espace d'administration** pour tout modifier sans connaissances techniques : textes, photos, vidéos, sections, couleurs, mentions légales.

- **HTML, CSS et JavaScript sans framework.** Les pages publiées sont de simples fichiers HTML, rapides et sans base de données.
- **Un seul fichier PHP** (`www/admin/api.php`), utilisé uniquement par l'administration pour la connexion et la publication.
- Le contenu est rangé dans `www/content/site.json`. Le bouton **Publier** régénère `www/accueil.html` et `www/mentions-legales.html`.

## Tester l'administration sur son ordinateur (Windows)

L'administration a besoin de PHP, comme chez l'hébergeur où PHP est déjà fourni.

1. **Installer PHP** (une seule fois). Dans PowerShell :
   ```powershell
   winget install PHP.PHP.8.3
   ```
   Fermez puis rouvrez PowerShell, et vérifiez avec `php -v`. Sans winget, téléchargez le zip « VS16 x64 Non Thread Safe » sur windows.php.net, décompressez-le dans `C:\php`, puis ajoutez `C:\php` au PATH.
2. **Créer le fichier `.env`** : copiez `.env.example` en `.env`, puis choisissez un identifiant et un mot de passe de départ. Ce fichier reste sur votre ordinateur et n'est jamais envoyé sur GitHub.
3. **Double-cliquez sur `lancer-en-local.bat`.** Le site s'ouvre sur http://localhost:8000.
   - Administration : http://localhost:8000/admin/
   - À la première connexion, l'administration impose de choisir un mot de passe personnel. Le mot de passe de départ est alors effacé du `.env`, qui ne garde qu'une empreinte chiffrée.

Sur Mac ou Linux : `php -S localhost:8000 -t www outils/routeur-local.php`

## Identité visuelle

- **Typographies** : Bricolage Grotesque (titres) et Instrument Sans (texte), hébergées sur le site (licence SIL OFL 1.1).
- **Couleurs** : vert du logo, vert forêt profond, jaune pollen pour les boutons, fond papier clair.
- **Logo** : le logo d'origine a été détouré (fond transparent). Il existe en vert (`img/logo.webp`) et en clair pour les fonds sombres (`img/logo-clair.webp`).
- **Mise en page** : une grande photo d'accueil en plein écran avec l'en-tête transparent, un bandeau de mots défilant, et les actions en grandes lignes illustrées sur fond sombre. Viennent ensuite une mosaïque de photos, les questions fréquentes sur deux colonnes, un appel à l'action sur photo et un pied de page avec le nom en très grand.
- **Photos** : photos des ateliers de l'association, plus trois photos libres de droits (forêt, plage, panneaux solaires) créditées dans les mentions légales.

## Utiliser l'administration

- **Cliquer** sur un texte pour l'écrire, sur une photo pour la remplacer, sur un bouton pour changer son lien.
- **Survoler** une section ou une carte pour la déplacer, la masquer, la dupliquer ou la supprimer. « + Ajouter une section ici » propose 18 modèles (texte, cartes, galerie, vidéo, agenda, actualités, questions fréquentes…).
- **Apparence** : couleurs, polices, boutons, animations, titre et description pour Google, et la case « version de présentation » (le site demande aux moteurs de recherche de ne pas l'afficher tant qu'elle est cochée).
- **Sécurité** : changement du mot de passe, double authentification par code à 6 chiffres, journal des connexions.
- Rien n'est en ligne tant que vous n'avez pas cliqué sur **Publier**. Une sauvegarde de la version précédente est gardée à chaque publication (dossier `avenir-data/backups`, hors du site).

## Mettre en ligne (OVHcloud, hébergement gratuit 100 Mo `avenina`)

1. Lancer `envoyer-sur-ovh.bat` (SFTP, compte `avenina` sur `ssh.cluster129.hosting.ovh.net`, mot de passe choisi dans OVHcloud › Hébergements › onglet FTP - SSH).
2. Choix **1** la première fois (tout le site + `.env`), choix **2** ensuite (programme seulement, sans écraser ce qui a été modifié dans l'administration).
3. Sur l'hébergement : le site est dans `www/`, `.env` et `avenir-data/` sont à côté, hors de portée des visiteurs.
4. https://avenirdurable.fr/admin/ : à la première connexion, un nouveau mot de passe est demandé.

Place : 100 Mo en tout (le site en occupe environ 6). Photos et vidéos ajoutées depuis l'administration : 40 Mo en tout, 25 Mo par vidéo.

L'ancienne adresse GitHub Pages renvoie automatiquement vers avenirdurable.fr (`outils/preparer-github-pages.sh`, lancé par `.github/workflows/pages.yml`).

## Sécurité

- Les identifiants sont dans `.env`, hors du dossier public et jamais sur GitHub. Le mot de passe n'y est conservé que sous forme d'empreinte (Argon2id, ou bcrypt si Argon2id est absent).
- Protection contre les essais répétés : blocage après 5 échecs par adresse IP en 15 minutes, et après 40 échecs sur tout le site en 1 heure.
- Session protégée : cookie `HttpOnly`, `SameSite=Strict` et `Secure` en HTTPS. Les sessions expirent et un jeton anti-CSRF est exigé.
- Avant d'écrire une page, le serveur vérifie qu'elle ne contient aucun script, `iframe` ou formulaire ajouté. Seuls les fichiers WebP, MP4 et WebM sont acceptés, avec un contrôle de leur contenu réel.
- Côté visiteurs, il n'y a aucun cookie ni mesure d'audience. Les vidéos YouTube ne se chargent qu'après accord.
- Formulaire de contact : jeton signé par le serveur (au moins 3 secondes entre l'ouverture et l'envoi), champ piège invisible, 3 envois maximum par adresse IP en 10 minutes (10 par jour, 60 pour tout le site), contrôle de l'origine et des champs. Aucun message n'est conservé sur le serveur.

## Formulaire de contact

« Écrire un message » (et les boutons vers `#contact`) ouvre une fenêtre où l'on choisit le motif : Question, Participer à un atelier, Partenariat ou bénévolat. `#contact-atelier` et `#contact-partenariat` l'ouvrent avec le motif déjà coché.

Le message est envoyé par `www/contact.php` à l'adresse « E-mail qui reçoit les messages » de l'administration (Apparence › Coordonnées), ou à `CONTACT_TO` si elle figure dans `.env`. Sans réglage SMTP, la fonction `mail()` d'OVH est utilisée ; un serveur SMTP peut être indiqué dans `.env` (voir `.env.example`).

## Référencement (Google)

- Titre, description, lien canonique, données structurées (Organisation + Site web), `robots.txt` et `sitemap.xml` sont produits automatiquement à partir du contenu.
- Dans l'administration (Apparence › « Moteurs de recherche ») : **Adresse du site** (lien canonique et sitemap), **code de vérification Google Search Console**, case « Version de présentation » (à laisser décochée pour être visible sur Google), **ville ou zone d'intervention** (indispensable pour les recherches locales).
- À faire une fois : déclarer https://avenirdurable.fr dans Google Search Console et y envoyer `sitemap.xml` ; créer une fiche Google Business Profile.

## Tests automatiques

`bash tests/lancer-tests.sh` (Linux, macOS ou WSL ; PHP, Node.js, Python 3 et Playwright requis) lance une trentaine de vérifications sur une copie temporaire du site, avec un faux serveur d'e-mails : page publique et SEO, fenêtre de contact, envoi et protections de `contact.php`, fichiers privés, administration (connexion, mot de passe, publication), page de redirection GitHub Pages, affichage en 375, 768, 1366 et 1920 px, console du navigateur. Vos fichiers `.env` et vos données ne sont pas touchés.

## Contenus à valider avec l'association

- La ville ou la zone d'intervention (référencement local).
- Les mentions légales : forme juridique et adresse (marquées « [à compléter] »), confirmation de Berthe Essombi Dissake comme directrice de la publication.
- Les textes repris des documents du projet (présentation, six thèmes, « Au fil des saisons », FAQ).
- Les réseaux sociaux, à ajouter quand les comptes officiels sont connus.
- L'accord des parents pour les photos où des enfants apparaissent, et un logo en meilleure qualité (SVG).
- Les photos des ateliers viennent de l'association (sources dans `photo/`, non versionné). Les thèmes Eau, Énergie et Climat utilisent encore des photos Unsplash/Pixabay, remplaçables depuis l'administration.

## Arborescence

```
www/                    site publié (ce qui part sur l'hébergement)
  accueil.html          page d'accueil générée (ne pas modifier à la main)
  content/site.json     tout le contenu du site
  assets/render.js      fabrication des pages à partir du contenu
  assets/site.css|js    apparence et animations du site
  admin/                administration (index.html, api.php)
  contact.php           envoi du formulaire de contact (hébergement PHP)
  robots.txt, sitemap.xml  générés (build.js et publication)
tests/                  tests automatiques (lancer-tests.sh)
build.js                régénère les pages de départ et les listes d'envoi
lancer-en-local.bat     lance le site et l'administration sur l'ordinateur (PHP)
envoyer-sur-ovh.bat     envoie le site sur l'hébergement (SFTP)
```

L'ancienne version (Next.js et PostgreSQL) est conservée dans la branche `version-nextjs`.
