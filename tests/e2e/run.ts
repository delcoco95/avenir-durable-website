/**
 * Tests de bout en bout (navigateur réel) : site public, formulaire, cookies,
 * administration complète, droits d'accès et sessions.
 *
 * Prérequis :
 *   - l'application lancée (npm run build && npm start, ou npm run dev) ;
 *   - un compte administrateur créé avec `npm run admin:create` ;
 *   - Chromium : `npx playwright install chromium`, ou CHROME_PATH vers un binaire existant.
 *
 * Variables :
 *   E2E_BASE_URL       (défaut http://localhost:3000)
 *   E2E_EMAIL          e-mail du compte administrateur de test
 *   E2E_PASSWORD       mot de passe actuel de ce compte
 *   E2E_NEW_PASSWORD   (facultatif) nouveau mot de passe si le compte a encore son mot de passe temporaire
 *   CHROME_PATH / CHROME_ARGS (facultatifs)
 *   E2E_SCREENSHOTS    dossier où enregistrer des captures (facultatif)
 *
 * ⚠ Ce scénario modifie des contenus puis les restaure : à lancer sur une base de
 *   développement ou de recette, jamais en production.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.E2E_EMAIL ?? "";
let PASSWORD = process.env.E2E_PASSWORD ?? "";
const NEW_PASSWORD = process.env.E2E_NEW_PASSWORD ?? "";
const SHOTS = process.env.E2E_SCREENSHOTS ?? "";
const STAMP = Date.now().toString(36);

type Result = { name: string; ok: boolean; detail?: string; ms: number };
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message.split("\n")[0] : String(err);
    results.push({ name, ok: false, detail, ms: Date.now() - t });
    console.log(`  ✖ ${name}\n      ${detail}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function shot(page: Page, name: string, fullPage = false) {
  if (!SHOTS) return;
  await fs.mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

async function text(page: Page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

async function login(ctx: BrowserContext, email: string, password: string) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/admin/connexion"), { timeout: 15000 }).catch(() => {}), page.click("button[type=submit]")]);
  return page;
}

/** Enregistre ou publie depuis l'éditeur et attend la notification. */
async function clickAndToast(page: Page, buttonName: string | RegExp) {
  await page.getByRole("button", { name: buttonName }).first().click();
  const toast = page.locator(".toast");
  await toast.first().waitFor({ timeout: 15000 });
  return toast.first().innerText();
}

async function main() {
  assert(EMAIL && PASSWORD, "Définissez E2E_EMAIL et E2E_PASSWORD (compte de test).");
  const args = process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(" ").filter(Boolean) : [];
  const browser: Browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args, headless: true });
  const pub = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: "fr-FR" });

  console.log("\nSite public");
  const publicPages = ["/", "/a-propos", "/nos-actions", "/projets", "/faq", "/contact", "/mentions-legales", "/politique-de-confidentialite", "/gestion-des-cookies"];
  await test("Toutes les pages publiques répondent 200 avec un titre H1 unique", async () => {
    const page = await pub.newPage();
    for (const p of publicPages) {
      const res = await page.goto(BASE + p);
      assert(res?.status() === 200, `${p} → ${res?.status()}`);
      const h1 = await page.locator("h1").count();
      assert(h1 === 1, `${p} : ${h1} titre(s) H1`);
      assert((await page.title()).length > 5, `${p} : titre de document vide`);
    }
    await page.goto(BASE + "/");
    await page.waitForTimeout(2500);
    await shot(page, "01-accueil");
    await page.close();
  });

  await test("Les pages de détail (domaine, projet) sont accessibles depuis les listes", async () => {
    const page = await pub.newPage();
    await page.goto(BASE + "/nos-actions");
    const href = await page.locator("a[href^='/nos-actions/']").first().getAttribute("href");
    assert(href, "aucun lien vers un domaine");
    assert((await page.goto(BASE + href))?.status() === 200, "page domaine en erreur");
    await page.goto(BASE + "/projets");
    const p = await page.locator("a[href^='/projets/']").first().getAttribute("href");
    assert(p, "aucun lien vers un projet");
    assert((await page.goto(BASE + p))?.status() === 200, "page projet en erreur");
    await page.close();
  });

  await test("Page 404 personnalisée (statut 404)", async () => {
    const page = await pub.newPage();
    const res = await page.goto(BASE + "/cette-page-n-existe-pas");
    assert(res?.status() === 404, `statut ${res?.status()}`);
    assert((await text(page)).includes("Revenir à l'accueil"), "contenu 404 absent");
    const res2 = await page.goto(BASE + "/a/b/c");
    assert(res2?.status() === 404, `statut imbriqué ${res2?.status()}`);
    await page.close();
  });

  await test("Liens internes du menu et du pied de page sans erreur", async () => {
    const page = await pub.newPage();
    await page.goto(BASE + "/");
    const hrefs = await page.$$eval("header a[href^='/'], footer a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    for (const h of hrefs) {
      const r = await page.request.get(BASE + h);
      assert(r.status() === 200, `${h} → ${r.status()}`);
    }
    await page.close();
  });

  await test("Navigation mobile : ouverture, liens, fermeture au clavier", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + "/");
    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    assert((await toggle.getAttribute("aria-expanded")) === "true", "menu non ouvert");
    await page.waitForTimeout(500);
    await shot(page, "02-menu-mobile");
    await page.keyboard.press("Escape");
    assert((await toggle.getAttribute("aria-expanded")) === "false", "Échap ne ferme pas le menu");
    await toggle.click();
    await page.locator("#mobile-menu a[href='/faq']").click();
    await page.waitForURL("**/faq");
    await shot(page, "03-faq-mobile", true);
    await ctx.close();
  });

  await test("Aucun cookie ni traceur déposé par défaut ; panneau d'information accessible", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith(BASE) && !r.url().startsWith("data:")) external.push(r.url());
    });
    await page.goto(BASE + "/");
    await page.waitForTimeout(1000);
    assert((await ctx.cookies()).length === 0, "cookie déposé sans action");
    assert(external.length === 0, `requête tierce : ${external[0]}`);
    assert((await page.locator(".consent").count()) === 0, "bandeau affiché alors qu'aucun service n'est actif");
    await page.getByRole("button", { name: "Préférences cookies" }).click();
    assert((await page.locator(".consent").innerText()).includes("strictement nécessaires"), "panneau d'information absent");
    await ctx.close();
  });

  await test("Formulaire de contact : erreurs de validation affichées", async () => {
    const page = await pub.newPage();
    await page.goto(BASE + "/contact");
    await page.waitForTimeout(2700); // délai anti-robot
    await page.fill("#email", "pas-une-adresse");
    await page.getByRole("button", { name: "Envoyer le message" }).click();
    await page.locator(".alert--error").waitFor();
    const t = await text(page);
    assert(t.includes("Indiquez votre nom"), "erreur nom absente");
    assert(t.includes("adresse e-mail valide"), "erreur e-mail absente");
    assert(t.includes("cocher cette case"), "erreur consentement absente");
    await shot(page, "04-contact-erreurs");
    await page.close();
  });

  const contactName = `Testeur E2E ${STAMP}`;
  await test("Formulaire de contact : envoi réussi et état de succès", async () => {
    const page = await pub.newPage();
    await page.goto(BASE + "/contact");
    await page.waitForTimeout(2700);
    await page.fill("#name", contactName);
    await page.fill("#email", "testeur@exemple.test");
    await page.fill("#organisation", "Recette");
    await page.selectOption("#topic", { index: 1 });
    await page.fill("#message", "Bonjour, ceci est un message envoyé par les tests automatisés.");
    await page.check("#consent");
    await page.getByRole("button", { name: "Envoyer le message" }).click();
    await page.getByRole("heading", { name: "Message envoyé" }).waitFor({ timeout: 15000 });
    await shot(page, "05-contact-succes");
    await page.close();
  });

  await test("Pot de miel anti-spam : soumission robotisée ignorée silencieusement", async () => {
    const page = await pub.newPage();
    await page.goto(BASE + "/contact");
    await page.evaluate(() => ((document.querySelector("#website") as HTMLInputElement).value = "http://spam.example"));
    await page.fill("#name", `Robot ${STAMP}`);
    await page.fill("#email", "robot@exemple.test");
    await page.fill("#message", "Message publicitaire automatique très long.");
    await page.check("#consent");
    await page.getByRole("button", { name: "Envoyer le message" }).click();
    await page.getByRole("heading", { name: "Message envoyé" }).waitFor({ timeout: 15000 });
    await page.close();
  });

  console.log("\nSécurité de l'administration");
  await test("Accès non authentifié : redirection vers la connexion (admin, aperçu)", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    for (const p of ["/admin", "/admin/pages", "/admin/messages", "/admin/parametres", "/admin/utilisateurs"]) {
      await page.goto(BASE + p);
      assert(new URL(page.url()).pathname === "/admin/connexion", `${p} accessible sans session`);
    }
    // Un faux cookie de session ne donne aucun accès (vérification en base)
    await ctx.addCookies([{ name: "ad_session", value: "faux-jeton-" + STAMP, url: BASE }]);
    await page.goto(BASE + "/admin/messages");
    assert(new URL(page.url()).pathname === "/admin/connexion", "faux cookie accepté");
    await page.goto(BASE + "/apercu/page/1");
    assert(new URL(page.url()).pathname === "/admin/connexion", "aperçu accessible sans session");
    await ctx.close();
  });

  await test("Connexion refusée avec un mauvais mot de passe (message générique)", async () => {
    const ctx = await browser.newContext();
    const page = await login(ctx, EMAIL, "mauvais-mot-de-passe");
    const msg = await page.locator(".alert--error").innerText();
    assert(msg.includes("incorrect"), "message d'erreur absent");
    await shot(page, "06-connexion-erreur");
    await ctx.close();
  });

  await test("Protection contre la force brute : blocage après 5 échecs", async () => {
    const ctx = await browser.newContext();
    const victim = `inconnu-${STAMP}@exemple.test`;
    let last = "";
    for (let i = 0; i < 6; i++) {
      const page = await login(ctx, victim, `essai-${i}`);
      last = await page.locator(".alert--error").innerText();
      await page.close();
    }
    assert(last.includes("bloquée"), `pas de blocage : « ${last} »`);
    await ctx.close();
  });

  console.log("\nAdministration");
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  let page = await login(admin, EMAIL, PASSWORD);

  await test("Connexion et changement obligatoire du mot de passe temporaire", async () => {
    if (new URL(page.url()).pathname === "/admin/mot-de-passe") {
      assert(NEW_PASSWORD, "Compte avec mot de passe temporaire : définissez E2E_NEW_PASSWORD");
      // Mot de passe trop faible refusé
      await page.fill("#current", PASSWORD);
      await page.fill("#next", "court");
      await page.fill("#confirm", "court");
      await page.getByRole("button", { name: "Changer le mot de passe" }).click();
      await page.locator(".alert--error").waitFor();
      await shot(page, "07-mot-de-passe-obligatoire");
      await page.fill("#current", PASSWORD);
      await page.fill("#next", NEW_PASSWORD);
      await page.fill("#confirm", NEW_PASSWORD);
      await Promise.all([page.waitForURL("**/admin?bienvenue=1"), page.getByRole("button", { name: "Changer le mot de passe" }).click()]);
      PASSWORD = NEW_PASSWORD;
    }
    assert(new URL(page.url()).pathname === "/admin", `arrivée sur ${page.url()}`);
    await page.getByRole("heading", { name: /Bonjour/ }).waitFor();
    await shot(page, "08-tableau-de-bord", true);
  });

  await test("Le message de contact envoyé est consultable et son statut modifiable", async () => {
    await page.goto(BASE + "/admin/messages");
    await page.getByRole("link", { name: contactName }).click();
    await page.getByText("ceci est un message envoyé par les tests").waitFor();
    assert((await page.getByText(`Robot ${STAMP}`).count()) === 0, "le message du robot a été enregistré");
    await page.getByRole("button", { name: "Marquer comme traité" }).click();
    await page.getByText("Statut mis à jour").waitFor();
    await shot(page, "09-demande-contact");
  });

  let homeEditor = "";
  const originalTitle = "Semer aujourd'hui\nles gestes de demain";
  const newTitle = `Semer aujourd'hui\nles gestes de demain ${STAMP}`;
  await test("Page d'accueil : brouillon non visible, publication visible, persistance après rechargement", async () => {
    await page.goto(BASE + "/admin/pages");
    await Promise.all([page.waitForURL(/\/admin\/pages\/\d+/), page.getByRole("link", { name: "Accueil", exact: true }).first().click()]);
    homeEditor = page.url();
    const titleField = page.locator("textarea[name$='-title']").first();
    await titleField.fill(newTitle);
    let toast = await clickAndToast(page, "Enregistrer le brouillon");
    assert(toast.includes("Brouillon enregistré"), toast);
    const pub1 = await pub.newPage();
    await pub1.goto(BASE + "/");
    assert(!(await text(pub1)).includes(STAMP), "le brouillon est visible publiquement");
    await page.goto(homeEditor);
    assert((await page.locator("textarea[name$='-title']").first().inputValue()) === newTitle, "brouillon non persisté");
    await shot(page, "10-editeur-page", true);
    toast = await clickAndToast(page, /^Publier$/);
    assert(toast.includes("Page publiée"), toast);
    await pub1.goto(BASE + "/");
    assert((await text(pub1)).includes(STAMP), "publication non visible sur le site");
    await pub1.close();
  });

  await test("Réorganisation des sections (ordre persistant)", async () => {
    await page.goto(homeEditor);
    const before = await page.locator(".section-card__type").allInnerTexts();
    await page.getByRole("button", { name: "Descendre la section 2" }).click();
    await clickAndToast(page, "Enregistrer le brouillon");
    await page.goto(homeEditor);
    const after = await page.locator(".section-card__type").allInnerTexts();
    assert(after[1] === before[2] && after[2] === before[1], "ordre non conservé");
    // Remise en ordre + titre d'origine, puis publication
    await page.getByRole("button", { name: "Descendre la section 2" }).click();
    await page.locator("textarea[name$='-title']").first().fill(originalTitle);
    await clickAndToast(page, /^Publier$/);
  });

  await test("Création, publication, dépublication et suppression d'une page", async () => {
    await page.goto(BASE + "/admin/pages");
    await page.fill("#f-title", `Page de test ${STAMP}`);
    await page.fill("#f-slug", `test-${STAMP}`);
    await Promise.all([page.waitForURL(/\/admin\/pages\/\d+/), page.getByRole("button", { name: "Créer la page" }).click()]);
    // Contenu de la section texte
    await page.getByRole("button", { name: /Texte libre/ }).click();
    await page.locator("textarea[name$='-body']").fill("Un **paragraphe** de test <script>alert(1)</script> avec [un lien](javascript:alert(1)).");
    await clickAndToast(page, /^Publier$/);
    const p = await pub.newPage();
    const res = await p.goto(`${BASE}/test-${STAMP}`);
    assert(res?.status() === 200, `page publiée introuvable (${res?.status()})`);
    const html = await p.content();
    assert(!html.includes("<script>alert(1)"), "script injecté non filtré");
    assert(!html.includes('href="javascript:'), "lien javascript: non filtré");
    await page.getByRole("button", { name: "Dépublier" }).click();
    await page.locator(".toast").first().waitFor();
    await page.waitForTimeout(800);
    assert((await p.goto(`${BASE}/test-${STAMP}`))?.status() === 404, "page dépubliée encore visible");
    page.once("dialog", (d) => d.accept());
    await Promise.all([page.waitForURL("**/admin/pages?supprime=1"), page.getByRole("button", { name: "Supprimer", exact: true }).click()]);
    await p.close();
  });

  await test("Projets : création, modification, publication, dépublication, suppression", async () => {
    await page.goto(BASE + "/admin/projets/nouveau");
    await page.fill("#f-title", `Projet de test ${STAMP}`);
    await page.fill("#f-summary", "Résumé du projet de test.");
    await page.selectOption("#f-status", "published");
    await Promise.all([page.waitForURL(/\/admin\/projets\/\d+\?cree=1/), page.getByRole("button", { name: "Créer le projet" }).click()]);
    const p = await pub.newPage();
    await p.goto(BASE + "/projets");
    assert((await text(p)).includes(`Projet de test ${STAMP}`), "projet absent de la liste publique");
    await page.fill("#f-title", `Projet modifié ${STAMP}`);
    await page.selectOption("#f-status", "draft");
    const toast = await clickAndToast(page, "Enregistrer");
    assert(toast.includes("brouillon"), toast);
    await p.goto(BASE + "/projets");
    assert(!(await text(p)).includes(STAMP), "projet en brouillon encore visible");
    page.once("dialog", (d) => d.accept());
    await Promise.all([page.waitForURL("**/admin/projets?supprime=1"), page.getByRole("button", { name: "Supprimer", exact: true }).click()]);
    await p.close();
  });

  await test("FAQ : modification d'une réponse visible sur le site", async () => {
    await page.goto(BASE + "/admin/faq");
    await page.getByRole("link", { name: "Comment vous contacter ?" }).click();
    const answer = page.locator("#f-answer");
    const original = await answer.inputValue();
    await answer.fill(original + ` (test ${STAMP})`);
    await clickAndToast(page, "Enregistrer");
    const p = await pub.newPage();
    await p.goto(BASE + "/faq");
    assert((await p.content()).includes(`test ${STAMP}`), "réponse non mise à jour");
    await page.reload();
    await page.locator("#f-answer").fill(original);
    await clickAndToast(page, "Enregistrer");
    await p.close();
  });

  await test("Paramètres : coordonnées répercutées sur le site, validation des erreurs", async () => {
    await page.goto(BASE + "/admin/parametres?onglet=contact");
    await page.fill("#f-contact-phone", "01 23 45 67 89");
    await clickAndToast(page, "Enregistrer");
    const p = await pub.newPage();
    await p.goto(BASE + "/contact");
    assert((await text(p)).includes("01 23 45 67 89"), "téléphone absent de la page contact");
    await page.reload();
    await page.fill("#f-contact-phone", "");
    await page.fill("#f-contact-email", "adresse-invalide");
    const toast = await clickAndToast(page, "Enregistrer");
    assert(toast.includes("corriger"), "adresse invalide acceptée");
    await page.reload();
    await page.fill("#f-contact-phone", "");
    await clickAndToast(page, "Enregistrer");
    await p.goto(BASE + "/contact");
    assert(!(await text(p)).includes("01 23 45 67 89"), "téléphone non retiré");
    await page.goto(BASE + "/admin/parametres?onglet=theme");
    await shot(page, "11-parametres-couleurs", true);
    await p.close();
  });

  await test("Consentement : un service facultatif active le bandeau ; refuser = aucun chargement", async () => {
    await page.goto(BASE + "/admin/parametres?onglet=cookies");
    await page.getByRole("button", { name: "Ajouter un service facultatif" }).click();
    await page.fill("#f-svc-0-name", "Mesure d'audience (test)");
    await page.fill("#f-svc-0-purpose", "Statistiques de fréquentation anonymes.");
    await page.check("input[name='svc-0-enabled']");
    await clickAndToast(page, "Enregistrer");
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    await p.locator(".consent").waitFor();
    await shot(p, "12-bandeau-cookies");
    await p.getByRole("button", { name: "Tout refuser" }).click();
    await p.waitForTimeout(500);
    const consent = (await ctx.cookies()).find((c) => c.name === "ad_consent");
    assert(consent, "choix non mémorisé");
    assert(decodeURIComponent(consent.value).includes('"service-1":false'), "refus non enregistré");
    await p.reload();
    assert((await p.locator(".consent").count()) === 0, "bandeau réaffiché après refus");
    await ctx.close();
    // Nettoyage
    await page.reload();
    await page.getByRole("button", { name: "Retirer ce service" }).click();
    await clickAndToast(page, "Enregistrer");
  });

  await test("Médiathèque : import d'une image, refus d'un faux fichier, texte alternatif", async () => {
    await fs.mkdir("test-results", { recursive: true });
    const good = path.resolve("test-results/test-image.png");
    await sharp({ create: { width: 800, height: 500, channels: 3, background: "#2f7a34" } }).png().toFile(good);
    const bad = path.resolve("test-results/faux.png");
    await fs.writeFile(bad, "<?php echo 'pas une image'; ?>");
    await page.goto(BASE + "/admin/medias");
    await page.setInputFiles("#media-files", bad);
    await page.locator(".notice--error").waitFor();
    await page.setInputFiles("#media-files", good);
    await page.locator(".notice--ok").waitFor();
    await page.waitForTimeout(800);
    await page.locator(".media-tile").first().click();
    await page.fill("#f-alt", `Aplat vert de test ${STAMP}`);
    await clickAndToast(page, "Enregistrer");
    const src = await page.locator(".media-preview-large").getAttribute("src");
    const r = await page.request.get(BASE + src!);
    assert(r.status() === 200 && r.headers()["content-type"] === "image/webp", "image non servie en WebP");
    await shot(page, "13-media");
    page.once("dialog", (d) => d.accept());
    await Promise.all([page.waitForURL("**/admin/medias?supprime=1"), page.getByRole("button", { name: "Supprimer l'image" }).click()]);
  });

  const editorEmail = `editeur-${STAMP}@exemple.test`;
  let editorTemp = "";
  await test("Comptes : création d'un éditeur avec mot de passe temporaire", async () => {
    await page.goto(BASE + "/admin/utilisateurs");
    await page.fill("#f-name", "Éditeur Test");
    await page.fill("#f-email", editorEmail);
    await page.getByRole("button", { name: "Créer le compte" }).click();
    editorTemp = (await page.locator(".secret").first().innerText()).trim();
    assert(editorTemp.length >= 16, "mot de passe temporaire absent");
  });

  await test("Droits : un éditeur n'accède ni aux comptes ni au journal ni aux mentions légales", async () => {
    const ctx = await browser.newContext();
    const p = await login(ctx, editorEmail, editorTemp);
    assert(new URL(p.url()).pathname === "/admin/mot-de-passe", "changement de mot de passe non imposé");
    // Toute autre page d'administration est inaccessible tant que le mot de passe n'est pas changé
    await p.goto(BASE + "/admin/pages");
    assert(new URL(p.url()).pathname === "/admin/mot-de-passe", "accès avant changement du mot de passe");
    const pw = `Phrase de passe éditeur ${STAMP}!`;
    await p.fill("#current", editorTemp);
    await p.fill("#next", pw);
    await p.fill("#confirm", pw);
    await Promise.all([p.waitForURL("**/admin?bienvenue=1"), p.getByRole("button", { name: "Changer le mot de passe" }).click()]);
    await p.goto(BASE + "/admin/utilisateurs");
    assert(new URL(p.url()).search.includes("refus"), "l'éditeur accède aux comptes");
    await p.goto(BASE + "/admin/journal");
    assert(new URL(p.url()).search.includes("refus"), "l'éditeur accède au journal");
    await p.goto(BASE + "/admin/parametres?onglet=legal");
    const toast = await clickAndToast(p, "Enregistrer");
    assert(toast.includes("réservée aux administrateurs"), `modification légale acceptée : ${toast}`);
    await ctx.close();
  });

  await test("Désactivation d'un compte : ses sessions sont fermées", async () => {
    const ctx = await browser.newContext();
    const p = await login(ctx, editorEmail, `Phrase de passe éditeur ${STAMP}!`);
    assert(new URL(p.url()).pathname === "/admin", "connexion éditeur impossible");
    await page.goto(BASE + "/admin/utilisateurs");
    const row = page.locator("tr", { hasText: editorEmail });
    await row.getByRole("button", { name: "Désactiver" }).click();
    await page.waitForURL("**/admin/utilisateurs?maj=1");
    await p.goto(BASE + "/admin/pages");
    assert(new URL(p.url()).pathname === "/admin/connexion", "session d'un compte désactivé encore valide");
    await ctx.close();
  });

  await test("Journal : les opérations sensibles sont tracées", async () => {
    await page.goto(BASE + "/admin/journal");
    const t = await text(page);
    for (const a of ["login.success", "page.publish", "user.create", "user.deactivate", "settings.save", "login.blocked"]) assert(t.includes(a), `action ${a} absente du journal`);
    await shot(page, "14-journal");
  });

  await test("Déconnexion : la session est détruite côté serveur", async () => {
    const cookie = (await admin.cookies()).find((c) => c.name.endsWith("ad_session"));
    assert(cookie, "cookie de session absent");
    assert(cookie.httpOnly && cookie.sameSite === "Strict", "cookie de session mal configuré (HttpOnly/SameSite)");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await page.waitForURL("**/admin/connexion?deconnecte=1");
    // Rejouer l'ancien cookie ne donne plus accès
    const ctx = await browser.newContext();
    await ctx.addCookies([{ ...cookie }]);
    const p = await ctx.newPage();
    await p.goto(BASE + "/admin");
    assert(new URL(p.url()).pathname === "/admin/connexion", "ancien cookie encore valide après déconnexion");
    await ctx.close();
  });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} scénarios réussis.`);
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile("test-results/e2e.json", JSON.stringify({ date: new Date().toISOString(), base: BASE, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
