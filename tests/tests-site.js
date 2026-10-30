/*
 * Tests automatiques du site (Playwright). Lancés par tests/lancer-tests.sh, qui prépare :
 *  - une copie du site servie par PHP (BASE), avec un .env de test et un faux serveur SMTP (MAILS = fichier des messages reçus) ;
 *  - la copie statique GitHub Pages (PAGES), servie sans PHP.
 * Usage : node tests/tests-site.js BASE MAILS PAGES DOSSIER_CAPTURES
 */
const { chromium } = require('playwright');
const fs = require('fs');
const [BASE, MAILS, PAGES, SHOTS] = process.argv.slice(2);
const ADMIN_USER = 'test-admin', ADMIN_PASS = 'mot-de-passe-de-depart', NEW_PASS = 'Nouveau-Mot-De-Passe-2026!';

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + String(e && e.message || e).split('\n')[0]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'condition fausse'); }
const mails = () => (fs.existsSync(MAILS) ? fs.readFileSync(MAILS, 'utf8').split('=====FIN=====').filter(s => s.trim()) : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const motif = p => p.evaluate(() => { const r = document.querySelector('#contact-modal input[name="motif-choix"]:checked'); return r ? r.value : ''; });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  console.log('\nPage publique');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  await t('titre, description, canonique et indexation', async () => {
    ok(/sensibilisation à l.environnement/i.test(await page.title()), 'titre');
    ok((await page.getAttribute('meta[name=description]', 'content')).length > 120, 'description');
    ok(await page.getAttribute('link[rel=canonical]', 'href'), 'canonique');
    ok(await page.getAttribute('meta[property="og:url"]', 'content'), 'og:url');
    ok(!(await page.$('meta[name=robots]')), 'la page ne doit pas être en noindex');
  });
  await t('H1 = slogan, accroche descriptive visible', async () => {
    const h1 = (await page.textContent('h1')).replace(/\s+/g, ' ').trim();
    ok(h1 === 'Chaque action peut faire une différence.', h1);
    ok(await page.isVisible('.hero .lede'), 'accroche');
    ok((await page.$$('h1')).length === 1, 'un seul H1');
  });
  await t('données structurées JSON-LD (Organization + WebSite)', async () => {
    const j = JSON.parse(await page.textContent('script[type="application/ld+json"]'));
    const types = j['@graph'].map(x => x['@type']);
    ok(types.includes('Organization') && types.includes('WebSite'), types.join());
    const org = j['@graph'][0];
    ok(org.telephone === '+33643215535' && org.email && org.founder && org.founder.name, 'coordonnées');
  });
  await t('sections attendues présentes', async () => {
    for (const id of ['accueil', 'formats', 'projet', 'themes', 'au-fil-des-saisons', 'terrain', 'faq', 'participer', 'contact']) ok(await page.$('#' + id), id);
    ok((await page.$$('#themes .row')).length === 6, '6 thèmes');
    ok((await page.$$('#terrain .tile')).length === 6, '6 photos');
    ok(/Berthe Essombi Dissake/.test(await page.textContent('#projet')), 'porteuse du projet');
  });
  await t('photos : toutes chargées, avec texte alternatif', async () => {
    await page.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; } window.scrollTo(0, document.body.scrollHeight); });
    await page.waitForTimeout(800);
    const bad = await page.evaluate(() => Array.from(document.images).filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
    ok(!bad.length, 'non chargées : ' + bad.join(', '));
    const noAlt = await page.evaluate(() => Array.from(document.querySelectorAll('main img')).filter(i => !i.hasAttribute('alt') || (!i.alt && !i.closest('.cta-media'))).map(i => i.src));
    ok(!noAlt.length, 'sans alt : ' + noAlt.join(', '));
  });
  await t('plus aucun lien mailto, boutons limités', async () => {
    ok(!(await page.$('a[href^="mailto:"]')), 'lien mailto trouvé');
    ok((await page.$$('.hero .btn')).length === 1, 'un seul bouton dans l’accueil');
    ok((await page.$$('#participer .btn')).length === 1, 'un bouton dans l’appel à l’action');
  });

  console.log('\nFenêtre de contact');
  await t('le bouton du menu ouvre la fenêtre (motif à choisir)', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('.menu-cta a');
    await page.waitForSelector('#contact-modal[open]');
    ok(await motif(page) === '', 'aucun motif coché');
    ok(await page.evaluate(() => document.activeElement.name) === 'motif-choix', 'focus sur le motif');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#contact-modal:not([open])', { state: 'attached' });
  });
  await t('« Participer à un atelier » ouvre le motif Atelier', async () => {
    await page.click('#participer .btn');
    await page.waitForSelector('#contact-modal[open]');
    ok(await motif(page) === 'atelier');
    ok(await page.evaluate(() => document.activeElement.id) === 'cm-nom', 'focus sur le nom');
    await page.click('#contact-modal .cm-close');
  });
  await t('section Contact : 2 boutons, motif choisi dans la fenêtre, fermeture en cliquant à côté', async () => {
    ok((await page.$$('#contact .ct-link')).length === 2, 'deux boutons');
    ok(await page.getAttribute('#contact .ct-link >> nth=1', 'href') === 'tel:+33643215535', 'téléphone');
    await page.click('#contact .ct-link >> nth=0');
    await page.waitForSelector('#contact-modal[open]');
    await page.click('#contact-modal .cm-reason:has(input[value=partenariat])');
    ok(await motif(page) === 'partenariat', 'motif partenariat');
    ok(/structure/.test(await page.textContent('#cm-message-hint')), 'aide adaptée au motif');
    await page.mouse.click(5, 5);
    await page.waitForSelector('#contact-modal:not([open])', { state: 'attached' });
  });
  await t('validation : champs vides et e-mail invalide signalés', async () => {
    await page.click('.menu-cta a');
    await page.waitForSelector('#contact-modal[open]');
    await page.click('[data-cm-send]');
    const invalid = await page.$$eval('#contact-modal [aria-invalid=true]', l => l.map(x => x.name));
    ok(['motif', 'nom', 'email', 'objet', 'message', 'consentement'].every(n => invalid.includes(n)), invalid.join());
    await page.fill('#cm-email', 'pas-une-adresse');
    await page.click('[data-cm-send]');
    ok(/adresse e-mail valide/.test(await page.textContent('#cm-email-err')), 'message e-mail');
  });
  await t('envoi réussi via contact.php (SMTP de test)', async () => {
    const before = mails().length;
    await page.fill('#cm-nom', 'Camille Test');
    await page.fill('#cm-email', 'camille@example.org');
    await page.click('#contact-modal .cm-reason:has(input[value=atelier])');
    await page.fill('#cm-objet', 'Atelier pour une classe de CM1');
    await page.fill('#cm-message', 'Bonjour, nous aimerions un atelier zéro déchet en mars.\n.\nLigne après un point seul.');
    await page.check('#cm-consent');
    await page.click('[data-cm-send]');
    await page.waitForSelector('.cm-done:not([hidden])', { timeout: 15000 });
    await sleep(300);
    const m = mails();
    ok(m.length === before + 1, 'message non reçu');
    const last = m[m.length - 1];
    ok(/Reply-To: <camille@example.org>/.test(last), 'Reply-To');
    ok(/RCPT TO:<test-reception@example.org>/.test(last), 'destinataire');
    const body = Buffer.from(last.split(/\r?\n\r?\n/).slice(1).join('').replace(/\s/g, ''), 'base64').toString('utf8');
    ok(/Motif : Participer à un atelier/.test(body) && /Ligne après un point seul/.test(body), 'contenu');
    await page.click('.cm-done [data-cm-close]');
  });
  await t('lien direct accueil.html#contact-atelier ouvre la fenêtre', async () => {
    const p2 = await ctx.newPage();
    await p2.goto(BASE + '/accueil.html#contact-atelier');
    await p2.waitForSelector('#contact-modal[open]');
    ok(await motif(p2) === 'atelier');
    await p2.close();
  });

  console.log('\ncontact.php : protections');
  const api = (body, headers) => page.evaluate(async ([b, h]) => {
    const r = await fetch('contact.php', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: JSON.stringify(b) });
    return { status: r.status, j: await r.json() };
  }, [body, headers]);
  const token = () => page.evaluate(async () => (await (await fetch('contact.php')).json()).token);
  const good = { nom: 'Robot Test', email: 'r@example.org', motif: 'question', objet: 'Objet test', message: 'Message de test assez long.', consentement: true };
  await t('envoi trop rapide refusé (délai minimum)', async () => {
    const r = await api(Object.assign({ token: await token() }, good));
    ok(r.status === 429, r.status);
  });
  await t('jeton absent ou falsifié refusé', async () => {
    ok((await api(good)).status === 400);
    ok((await api(Object.assign({ token: '1790000000.' + 'a'.repeat(64) }, good))).status === 400);
  });
  await t('champ piège rempli : réponse « envoyé » mais aucun message', async () => {
    const before = mails().length;
    const r = await api(Object.assign({ token: 'x', site_web: 'http://spam' }, good));
    ok(r.status === 200 && r.j.ok, r.status);
    await sleep(200);
    ok(mails().length === before, 'un message a été envoyé');
  });
  await t('champs invalides refusés côté serveur', async () => {
    const tk = await token(); await sleep(3100);
    let r = await api(Object.assign({}, good, { token: tk, email: 'a@b' }));
    ok(r.status === 422 && r.j.field === 'email', 'email ' + r.status);
    r = await api(Object.assign({}, good, { token: tk, motif: 'autre' }));
    ok(r.status === 422 && r.j.field === 'motif', 'motif');
    r = await api(Object.assign({}, good, { token: tk, consentement: false }));
    ok(r.status === 422 && r.j.field === 'consentement', 'consentement');
    r = await api(Object.assign({}, good, { token: tk, objet: 'A\r\nBcc: x@y.z' }));
    ok(r.status !== 500, 'injection en-tête');
  });
  await t('limitation : 3 envois par IP en 10 minutes', async () => {
    const tk = await token(); await sleep(3100);
    // 1 envoi déjà fait par le navigateur ; 1 de plus ci-dessus éventuellement
    let last;
    for (let i = 0; i < 4; i++) last = await api(Object.assign({}, good, { token: tk }));
    ok(last.status === 429, 'dernier envoi : ' + last.status);
  });
  await t('origine étrangère refusée', async () => {
    const r = await page.evaluate(async () => (await fetch('contact.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status);
    ok(r !== 403, 'même origine acceptée');
    const res = await ctx.request.post(BASE + '/contact.php', { headers: { Origin: 'https://pirate.example', 'Content-Type': 'application/json' }, data: good });
    ok(res.status() === 403, res.status());
  });

  console.log('\nSécurité et fichiers du référencement');
  await t('fichiers privés jamais servis', async () => {
    for (const u of ['/.env', '/../.env', '/admin/data/', '/content/x.json', '/outils/routeur-local.php', '/admin/x.php', '/.htaccess']) {
      const r = await ctx.request.get(BASE + u);
      ok(r.status() === 404, u + ' → ' + r.status());
    }
  });
  await t('API d’administration fermée sans connexion', async () => {
    const r = await ctx.request.post(BASE + '/admin/api.php?action=publish', { headers: { 'Content-Type': 'application/json' }, data: {} });
    ok([401, 403].includes(r.status()), r.status());
  });
  await t('robots.txt et sitemap.xml', async () => {
    const r = await ctx.request.get(BASE + '/robots.txt');
    ok(r.ok() && /Sitemap: https?:\/\//.test(await r.text()), 'robots');
    const s = await ctx.request.get(BASE + '/sitemap.xml');
    ok(s.ok() && /<loc>https?:\/\//.test(await s.text()), 'sitemap');
  });
  await t('mentions légales : SIRET, téléphone, noindex', async () => {
    const p3 = await ctx.newPage();
    await p3.goto(BASE + '/mentions-legales.html');
    const txt = await p3.textContent('main');
    ok(/931 031 371 00012/.test(txt) && /06 43 21 55 35/.test(txt) && /Berthe Essombi Dissake/.test(txt), 'contenu');
    ok(/noindex/.test(await p3.getAttribute('meta[name=robots]', 'content')), 'noindex');
    ok(!/\[à compléter, par exemple/.test(txt), 'ancien texte');
    await p3.close();
  });

  console.log('\nAffichage (responsive)');
  for (const [w, h] of [[375, 812], [768, 1024], [1366, 768], [1920, 1080]]) {
    await t('largeur ' + w + ' px : pas de défilement horizontal, fenêtre lisible', async () => {
      const p = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); // captures complètes : sans animation d'apparition
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(BASE + '/', { waitUntil: 'networkidle' });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, 'débordement de ' + over + ' px');
      await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
      await p.waitForFunction(() => Array.from(document.images).every(i => i.complete), null, { timeout: 15000 });
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/accueil-${w}.png`, fullPage: true });
      if (w < 960) { await p.click('#burger'); await p.waitForTimeout(400); }
      await p.click('.menu-cta a');
      await p.waitForSelector('#contact-modal[open]');
      await p.waitForTimeout(350);
      const box = await p.$eval('#contact-modal', d => { const r = d.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, w: innerWidth }; });
      ok(box.l >= 0 && box.r <= box.w && box.t >= 0, 'fenêtre hors écran');
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/contact-${w}.png` });
      await p.close();
    });
  }

  for (const [w, h] of [[1366, 768], [375, 812]]) {
    await t('largeur ' + w + ' px : les liens et boutons descendent au début de la bonne section', async () => {
      const p = await browser.newPage({ viewport: { width: w, height: h } });
      await p.goto(BASE + '/', { waitUntil: 'load' });
      const links = await p.$$eval('#menu a[href^="#"]:not(.btn), .hero .btn', l => l.map(a => a.getAttribute('href')));
      ok(links.length >= 5, 'liens');
      const bad = [];
      for (const href of links) {
        await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await p.waitForTimeout(150);
        const inMenu = await p.$eval(`a[href="${href}"]`, a => !!a.closest('#menu'));
        if (inMenu && w < 960) { await p.click('#burger'); await p.waitForTimeout(350); }
        await p.click(inMenu ? `#menu a[href="${href}"]` : `.hero a[href="${href}"]`);
        await p.waitForTimeout(1600);
        const r = await p.evaluate(sel => {
          const sec = document.querySelector(sel), hd = document.querySelector('.top').getBoundingClientRect().bottom;
          const title = sec.querySelector('h2:not(.sr)');
          return { sec: sec.getBoundingClientRect().top, title: title.getBoundingClientRect().top, hd };
        }, href);
        // le titre doit être visible juste sous l'en-tête, sans grand vide au-dessus de la section
        if (r.title < r.hd || r.title > r.hd + 220) bad.push(href + ' ' + JSON.stringify(r));
      }
      ok(!bad.length, bad.join(' ; '));
      await p.close();
    });
  }

  console.log('\nAdministration');
  await t('connexion, mot de passe imposé, réglages SEO et publication', async () => {
    const a = await ctx.newPage();
    a.on('pageerror', e => errors.push('admin: ' + e.message));
    await a.goto(BASE + '/admin/');
    await a.fill('#pw-user', ADMIN_USER);
    await a.fill('#pw-pass', ADMIN_PASS);
    await a.click('#pw-btn');
    await a.waitForSelector('#s-new');
    await a.fill('#s-cur', ADMIN_PASS);
    await a.fill('#s-new', NEW_PASS);
    await a.fill('#s-new2', NEW_PASS);
    await a.click('#pop-ok');
    await a.waitForSelector('#pop', { state: 'hidden' }).catch(() => {});
    await a.waitForTimeout(800);
    await a.click('#theme-btn');
    await a.waitForSelector('#f-msite');
    ok((await a.inputValue('#f-msite')).startsWith('https://'), 'adresse du site');
    ok(!(await a.isChecked('#f-noindex')), 'noindex décoché');
    await a.fill('#f-oarea', 'Ville de test');
    await a.fill('#f-mgsc', '<meta name="google-site-verification" content="AbCdEf0123456789_test" />');
    await a.click('#pop-ok');
    await a.waitForTimeout(400);
    await a.click('#publish-btn');
    await a.waitForFunction(() => /Publié/.test(document.getElementById('toast').textContent), null, { timeout: 15000 });
    const html = await (await ctx.request.get(BASE + '/accueil.html')).text();
    ok(/"areaServed":"Ville de test"/.test(html), 'zone dans le JSON-LD');
    ok(/google-site-verification" content="AbCdEf0123456789_test"/.test(html), 'vérification Search Console');
    ok(/sitemap\.xml/.test(await (await ctx.request.get(BASE + '/robots.txt')).text()), 'robots après publication');
    await a.close();
  });

  console.log('\nVersion GitHub Pages (sans PHP)');
  await t('pas de contact.php ni d’api.php ; page d’administration explicative', async () => {
    ok((await ctx.request.get(PAGES + '/contact.php')).status() === 404, 'contact.php');
    ok((await ctx.request.get(PAGES + '/admin/api.php')).status() === 404, 'api.php publié !');
    const p = await browser.newPage();
    await p.goto(PAGES + '/', { waitUntil: 'load' });
    await p.click('footer .admin-link');
    await p.waitForSelector('#pw-error:not([hidden])');
    ok(/lancer-en-local\.bat/.test(await p.textContent('#login-intro')), 'explication');
    ok(await p.isDisabled('#pw-btn'), 'connexion désactivée');
    await p.close();
  });
  await t('formulaire envoyé à FormSubmit quand PHP est absent', async () => {
    const p = await browser.newPage();
    let sent = null;
    await p.route('https://formsubmit.co/**', async route => {
      sent = { url: route.request().url(), body: JSON.parse(route.request().postData()) };
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"success":"true","message":"ok"}' });
    });
    await p.goto(PAGES + '/', { waitUntil: 'networkidle' });
    await p.click('#participer .btn');
    await p.waitForSelector('#contact-modal[open]');
    await p.fill('#cm-nom', 'Dominique Pages');
    await p.fill('#cm-email', 'dom@example.org');
    await p.fill('#cm-objet', 'Question depuis GitHub Pages');
    await p.fill('#cm-message', 'Bonjour, ceci est un message de test.');
    await p.check('#cm-consent');
    await p.click('[data-cm-send]');
    await p.waitForSelector('.cm-done:not([hidden])', { timeout: 15000 });
    ok(sent && /formsubmit\.co\/ajax\/avenirdurable%40ecomail\.fr$/.test(sent.url), 'adresse FormSubmit : ' + (sent && sent.url));
    ok(sent.body.Motif === 'Participer à un atelier' && sent.body._honey === '' && sent.body.email === 'dom@example.org', 'contenu');
    await p.close();
  });

  await t('aucune erreur dans la console du navigateur', async () => {
    const real = errors.filter(e => !/status of (400|403|422|429)/.test(e));
    ok(!real.length, real.join(' | '));
  });

  await browser.close();
  console.log(`\n${passed} test(s) réussi(s), ${failed} échec(s)\n`);
  process.exit(failed ? 1 : 0);
})();
