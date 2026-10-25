# Rapport de tests

*Exécution du 25 octobre 2026, environnement de développement : Node.js 22, PostgreSQL 16, build de production (`npm run build && npm start`), Chromium headless.*

Seuls les tests réellement exécutés figurent ici.

## Synthèse

| Campagne | Commande | Résultat |
|---|---|---|
| Vérification TypeScript (mode strict) | `npm run typecheck` | ✅ aucune erreur |
| Build de production | `npm run build` | ✅ 33 routes générées, sans erreur |
| Tests unitaires et d'intégration (PostgreSQL) | `npm test` | ✅ **31 / 31** |
| Scénario navigateur de bout en bout | `npm run test:e2e` | ✅ **27 / 27** |
| Contrôles HTTP manuels (en-têtes, fichiers, API) | `curl` | ✅ voir ci-dessous |
| Sauvegarde puis restauration dans une base vierge | `npm run backup` / `npm run restore` | ✅ 10 pages, 2 médias et 6 fichiers restaurés, empreintes SHA-256 vérifiées |
| Purge des demandes | `npm run messages:purge` | ✅ |

## Tests unitaires et d'intégration (`tests/unit`, `tests/integration`)

- **Mots de passe** : hachage Argon2id, vérification, empreinte corrompue sans plantage, politique (longueur, variété, suites courantes, identifiant), génération aléatoire.
- **Cryptographie** : empreintes HMAC des IP non réversibles, comparaison en temps constant.
- **XSS** : le Markdown saisi dans l'administration est nettoyé (`<script>`, `onerror`, `javascript:`, `data:`, `<img>` supprimés), liens externes sécurisés (`noopener`).
- **Sections de page** : valeurs initiales valides pour les 13 types, refus des liens `javascript:` et `//domaine`, des types inconnus, des textes trop longs, de plus de 40 sections.
- **Paramètres** : valeurs par défaut valides ; **les 3 palettes respectent le contraste AA** (et le vert brut du logo, insuffisant pour du texte, est bien détecté) ; refus des URL non https et des e-mails invalides ; validation des services soumis au consentement.
- **Médias** : conversion WebP en 3 tailles, suppression des métadonnées EXIF, refus d'un fichier PHP / exécutable déguisé, **refus du SVG**, refus des fichiers vides ou trop lourds, refus d'une clé de stockage forgée (`../../etc/passwd`).
- **Base de données (intégration)** : migrations complètes ; blocage d'un compte après 5 échecs (quelle que soit l'IP) sans bloquer les autres comptes ; blocage d'une IP après 20 échecs ; remise à zéro après connexion réussie ; aucune IP en clair ; limitation du formulaire à 5 envois/heure ; paramètres invalides en base remplacés par les valeurs par défaut.

## Scénario de bout en bout (`tests/e2e/run.ts`)

**Site public**
1. Les 9 pages publiques répondent 200, avec un titre de document et **un seul H1**.
2. Pages de détail domaine et projet accessibles depuis les listes.
3. Page 404 personnalisée avec statut 404 (y compris pour une adresse imbriquée).
4. Tous les liens internes du menu et du pied de page répondent 200.
5. Menu mobile (390 px) : ouverture, fermeture par Échap, navigation.
6. **Aucun cookie et aucune requête vers un domaine tiers** au chargement ; pas de bandeau sans service facultatif ; panneau d'information accessible.
7. Formulaire de contact : erreurs affichées sous chaque champ (nom, e-mail, consentement).
8. Formulaire de contact : envoi réussi et écran de confirmation.
9. Pot de miel : un envoi robotisé reçoit une fausse confirmation et **n'est pas enregistré**.

**Sécurité de l'administration**
10. Sans session (ou avec un faux cookie), `/admin`, `/admin/pages`, `/admin/messages`, `/admin/parametres`, `/admin/utilisateurs` et l'aperçu des brouillons redirigent vers la connexion.
11. Mauvais mot de passe : message générique.
12. Force brute : connexion **bloquée** après 5 échecs.

**Administration**
13. Première connexion : changement du mot de passe temporaire **imposé**, mot de passe faible refusé.
14. Le message envoyé à l'étape 8 est consultable, son statut passe à « traité ».
15. Accueil : **un brouillon n'est pas visible** sur le site, persiste après rechargement, et devient visible après **publication**.
16. Réorganisation des sections conservée après enregistrement.
17. Création d'une page, ajout de contenu contenant `<script>` et un lien `javascript:` (**filtrés**), publication (visible), **dépublication (404)**, suppression.
18. Projet : création publiée (visible dans la liste publique), modification, passage en brouillon (retiré du site), suppression.
19. FAQ : réponse modifiée visible sur le site, puis restaurée.
20. Paramètres : téléphone répercuté sur la page Contact ; e-mail invalide refusé ; retour à l'état initial.
21. Consentement : un service facultatif fait apparaître le bandeau ; « Tout refuser » est mémorisé, le bandeau ne revient pas ; nettoyage.
22. Médiathèque : faux fichier `.png` refusé, vraie image importée, texte alternatif enregistré, image servie en WebP, suppression.
23. Création d'un compte éditeur avec mot de passe temporaire affiché une seule fois.
24. Droits : l'éditeur doit changer son mot de passe avant tout accès ; **refus** d'accès aux comptes et au journal ; modification des informations légales refusée.
25. Désactivation d'un compte : **ses sessions ouvertes sont immédiatement invalidées**.
26. Journal : connexions, blocage, publication, création et désactivation de compte, paramètres tracés.
27. Déconnexion : cookie `HttpOnly` + `SameSite=Strict` ; **rejouer l'ancien cookie ne donne plus accès**.

Le scénario modifie des contenus puis les restaure : à exécuter sur une base de développement ou de recette uniquement.

```bash
E2E_EMAIL=… E2E_PASSWORD=… [E2E_NEW_PASSWORD=…] npm run test:e2e
# Chromium : npx playwright install chromium   (ou CHROME_PATH=/chemin/vers/chromium)
```

## Contrôles HTTP

| Contrôle | Résultat |
|---|---|
| En-têtes `Content-Security-Policy` (aucune origine tierce), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, pas de `X-Powered-By` | ✅ |
| `/admin/*` : `X-Robots-Tag: noindex`, `Cache-Control: no-store` | ✅ |
| `/media/..%2F..%2Fetc%2Fpasswd` et noms invalides | ✅ 404 |
| `/api/consent` : corps invalide → 400, origine étrangère → 403, service inconnu ignoré | ✅ |
| Action serveur forgée vers `/admin` sans session | ✅ redirection vers la connexion |
| `robots.txt` en mode présentation : `Disallow: /` ; balise `noindex, nofollow` sur toutes les pages | ✅ |
| `sitemap.xml` : pages, domaines et projets publiés uniquement | ✅ |

## Non couvert à ce stade

- Envoi réel d'e-mails (aucun serveur SMTP dans l'environnement de test : le cas « messagerie non configurée » est vérifié).
- Audit d'accessibilité outillé (axe, lecteurs d'écran) et mesures Lighthouse/Core Web Vitals sur l'hébergement définitif — recommandés avant la mise en ligne.
- Navigateurs autres que Chromium (Firefox, Safari).
- Intégration continue GitHub Actions (`.github/workflows/ci.yml`) : fournie, s'exécutera au premier envoi sur GitHub.
