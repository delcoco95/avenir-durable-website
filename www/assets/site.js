/*
 * L'Avenir Durable : menu mobile, année, événements passés masqués,
 * consentement aux vidéos YouTube (rien n'est chargé avant l'accord), en-tête transparent sur la photo d'accueil,
 * apparition douce des blocs situés plus bas dans la page, formulaire de contact en fenêtre modale.
 */
(function () {
  'use strict';
  var CONSENT_KEY = 'avenir_consent';
  var CONSENT_DAYS = 182; // le choix est redemandé après 6 mois
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu mobile ---------- */
  var b = document.getElementById('burger'), m = document.getElementById('menu');
  if (b && m) {
    var set = function (open) { m.classList.toggle('open', open); b.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    b.addEventListener('click', function () { set(!m.classList.contains('open')); });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.classList.contains('open')) { set(false); document.documentElement.style.overflow = ''; b.focus(); } });
  }

  /* ---------- Année, agenda ---------- */
  var y = document.getElementById('annee');
  if (y) y.textContent = new Date().getFullYear();
  var now = new Date(), today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  document.querySelectorAll('.events').forEach(function (list) {
    var left = 0;
    list.querySelectorAll('.event').forEach(function (ev) {
      var d = ev.getAttribute('data-date') || '';
      if (d && d < today) ev.classList.add('past'); else left++;
    });
    list.classList.toggle('all-past', left === 0);
  });

  /* ---------- Vidéos en lecture automatique : pas d'animation si l'utilisateur l'a demandé ---------- */
  if (reduceMotion) document.querySelectorAll('video[autoplay]').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); v.setAttribute('controls', ''); });

  /* ---------- Consentement (YouTube) ---------- */
  function readConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if (c && c.t && Date.now() - c.t < CONSENT_DAYS * 86400000) return c;
    } catch (e) {}
    return null;
  }
  function saveConsent(youtube) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ youtube: !!youtube, t: Date.now() })); } catch (e) {}
  }
  var banner = document.getElementById('consent');
  var ytBlocks = document.querySelectorAll('.yt[data-yt]');
  function showBanner(show) { if (banner) banner.hidden = !show; }
  function loadYouTube(el, autoplay) {
    if (el.querySelector('iframe')) return;
    var id = el.getAttribute('data-yt');
    if (!/^[\w-]{11}$/.test(id)) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1' + (autoplay ? '&autoplay=1' : '');
    f.title = el.getAttribute('data-title') || 'Vidéo YouTube';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    var ask = el.querySelector('.yt-ask'); if (ask) ask.remove();
    if (!document.body.contains(el)) return;
    el.appendChild(f);
  }
  function loadAll() { ytBlocks.forEach(function (el) { loadYouTube(el, false); }); }
  /* Sans accord : un cadre noir explique pourquoi la vidéo n'est pas encore affichée */
  function askInline(el) {
    if (el.querySelector('.yt-ask, iframe')) return;
    var box = document.createElement('div');
    box.className = 'yt-ask';
    box.innerHTML = '<p>Cette vidéo est hébergée par YouTube (Google), qui utilise des cookies. Elle s\'affiche dès que vous l\'autorisez.</p>' +
      '<div class="row"><button type="button" class="btn btn-fill" data-yes>Afficher la vidéo</button></div>' +
      '<a href="https://www.youtube.com/watch?v=' + el.getAttribute('data-yt') + '" target="_blank" rel="noopener">Voir sur YouTube</a>';
    box.querySelector('[data-yes]').addEventListener('click', function () { saveConsent(true); showBanner(false); loadAll(); });
    el.appendChild(box);
  }
  var c0 = readConsent();
  if (c0 && c0.youtube) loadAll(); else ytBlocks.forEach(askInline);
  if (banner) {
    banner.addEventListener('click', function (e) {
      var a = e.target.closest('[data-consent]');
      if (!a) return;
      var yes = a.getAttribute('data-consent') === 'accept';
      saveConsent(yes);
      showBanner(false);
      if (yes) loadAll();
      else ytBlocks.forEach(function (el) { var f = el.querySelector('iframe'); if (f) f.remove(); askInline(el); });
    });
    // Le bandeau n'apparaît que si la page contient des vidéos YouTube et qu'aucun choix n'a été fait
    if (ytBlocks.length && !c0) showBanner(true);
  }
  document.querySelectorAll('[data-consent-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { showBanner(true); var f = banner && banner.querySelector('button'); if (f) f.focus(); });
  });

  /* ---------- En-tête : transparent sur la grande photo, plein dès qu'on descend ---------- */
  var top = document.querySelector('.top');
  var hero = document.querySelector('.hero');
  var heroImg = hero && hero.querySelector('.hero-media');
  var ticking = false;
  var onScroll = function () {
    ticking = false;
    var y = window.scrollY;
    if (top) top.classList.toggle('solid', y > 40);
    // léger effet de profondeur sur la photo d'accueil
    if (heroImg && !reduceMotion && y < window.innerHeight * 1.2) heroImg.style.transform = 'translateY(' + (y * 0.25).toFixed(1) + 'px)';
  };
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  var cue = document.querySelector('.scroll-cue');
  if (cue && hero) cue.addEventListener('click', function (e) {
    var next = hero.nextElementSibling;
    if (next) { e.preventDefault(); next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
  });
  // Menu mobile ouvert : on bloque le défilement de la page derrière
  if (b && m) b.addEventListener('click', function () { document.documentElement.style.overflow = m.classList.contains('open') ? 'hidden' : ''; });
  if (m) m.addEventListener('click', function (e) { if (e.target.closest('a')) document.documentElement.style.overflow = ''; });

  /* ---------- Formulaire de contact (fenêtre modale) ----------
   * Les boutons qui pointent vers #contact, #contact-atelier ou #contact-partenariat ouvrent la fenêtre avec le bon motif.
   * Envoi : contact.php sur un hébergement PHP (OVH, local) ; sur GitHub Pages (sans PHP), service FormSubmit. */
  var REASONS = [['question', 'Question'], ['atelier', 'Participer à un atelier'], ['partenariat', 'Partenariat ou bénévolat']];
  var HASH_REASON = { '#contact': 'question', '#contact-question': 'question', '#contact-atelier': 'atelier', '#contact-partenariat': 'partenariat' };
  var contactEmail = document.body.getAttribute('data-contact') || '';
  var dlg = null, mode = null, token = '', openedAt = 0, lastTrigger = null, prep = Promise.resolve();
  var MIN_DELAY = 3000, LIMIT = 3, LIMIT_WINDOW = 10 * 60 * 1000;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function buildDialog() {
    dlg = el('dialog', { 'class': 'cmodal', id: 'contact-modal', 'aria-labelledby': 'cm-title', 'aria-describedby': 'cm-intro' });
    var opts = REASONS.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('');
    dlg.innerHTML =
      '<div class="cm-box">' +
      '<button type="button" class="cm-close" data-cm-close aria-label="Fermer la fenêtre"><span aria-hidden="true"></span></button>' +
      '<p class="eyebrow">Contact</p><h2 id="cm-title">Écrivez-nous</h2>' +
      '<p class="cm-intro" id="cm-intro">Tous les champs sont obligatoires. Nous vous répondons par e-mail.</p>' +
      '<div class="cm-form" role="form" aria-label="Formulaire de contact">' +
      '<div class="cm-grid">' +
      '<div class="cm-field"><label for="cm-nom">Nom et prénom</label><input id="cm-nom" name="nom" type="text" autocomplete="name" maxlength="100" required aria-describedby="cm-nom-err"><p class="cm-err" id="cm-nom-err"></p></div>' +
      '<div class="cm-field"><label for="cm-email">Adresse e-mail</label><input id="cm-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="200" required aria-describedby="cm-email-err"><p class="cm-err" id="cm-email-err"></p></div>' +
      '</div>' +
      '<div class="cm-field"><label for="cm-motif">Motif</label><select id="cm-motif" name="motif" required aria-describedby="cm-motif-err">' + opts + '</select><p class="cm-err" id="cm-motif-err"></p></div>' +
      '<div class="cm-field"><label for="cm-objet">Objet</label><input id="cm-objet" name="objet" type="text" maxlength="150" required aria-describedby="cm-objet-err"><p class="cm-err" id="cm-objet-err"></p></div>' +
      '<div class="cm-field"><label for="cm-message">Message</label><textarea id="cm-message" name="message" rows="6" maxlength="5000" required aria-describedby="cm-message-hint cm-message-err"></textarea><p class="cm-hint" id="cm-message-hint">Pour un atelier : précisez votre ville, le public concerné et vos disponibilités.</p><p class="cm-err" id="cm-message-err"></p></div>' +
      '<div class="cm-hp" aria-hidden="true"><label for="cm-site">Laissez ce champ vide</label><input id="cm-site" name="site_web" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<div class="cm-field cm-check"><input id="cm-consent" name="consentement" type="checkbox" required aria-describedby="cm-consent-err"><label for="cm-consent">J\'accepte que mes informations servent uniquement à répondre à ma demande (voir les <a href="mentions-legales.html#donnees-personnelles" target="_blank" rel="noopener">mentions légales</a>).</label><p class="cm-err" id="cm-consent-err"></p></div>' +
      '<p class="cm-status" role="status" aria-live="polite"></p>' +
      '<div class="cm-actions"><button type="button" class="btn btn-fill" data-cm-send>Envoyer le message</button></div>' +
      '</div>' +
      '<div class="cm-done" hidden><h3>Merci, votre message est bien parti.</h3><p>Nous vous répondrons dès que possible à l\'adresse indiquée.</p><button type="button" class="btn btn-dark" data-cm-close>Fermer</button></div>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-cm-close]')) closeContact();
    });
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('cm-open'); if (lastTrigger && lastTrigger.focus) lastTrigger.focus(); });
    dlg.querySelector('[data-cm-send]').addEventListener('click', send);
    dlg.querySelectorAll('input, select, textarea').forEach(function (f) {
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') validate(f); });
      if (f.tagName !== 'TEXTAREA') f.addEventListener('keydown', function (e) { if (e.key === 'Enter' && f.type !== 'checkbox') { e.preventDefault(); send(); } });
    });
  }
  function field(n) { return dlg.querySelector('[name="' + n + '"]'); }
  function setErr(f, msg) {
    var err = dlg.querySelector('#' + f.id + '-err');
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
    return !msg;
  }
  function validate(f) {
    var v = f.type === 'checkbox' ? f.checked : f.value.trim(), n = f.name;
    if (n === 'nom') return setErr(f, v.length < 2 ? 'Indiquez votre nom.' : '');
    if (n === 'email') return setErr(f, !/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i.test(v) ? 'Indiquez une adresse e-mail valide, par exemple nom@exemple.fr.' : '');
    if (n === 'motif') return setErr(f, !HASH_REASON['#contact-' + v] && v !== 'question' ? 'Choisissez un motif.' : '');
    if (n === 'objet') return setErr(f, v.length < 3 ? 'Indiquez l\'objet de votre message.' : '');
    if (n === 'message') return setErr(f, v.length < 10 ? 'Écrivez votre message (10 caractères au moins).' : '');
    if (n === 'consentement') return setErr(f, !v ? 'Cochez cette case pour que nous puissions vous répondre.' : '');
    return true;
  }
  function status(msg, isErr) {
    var st = dlg.querySelector('.cm-status');
    st.innerHTML = msg;
    st.classList.toggle('is-err', !!isErr);
  }
  function fallbackText() {
    return contactEmail ? ' Vous pouvez aussi nous écrire directement : <b>' + escHtml(contactEmail) + '</b>.' : '';
  }
  /* Choix du mode d'envoi : contact.php s'il répond (hébergement PHP), sinon FormSubmit */
  function prepare() {
    token = '';
    if (/\.github\.io$/i.test(location.hostname) || location.protocol === 'file:') { mode = 'formsubmit'; return Promise.resolve(); }
    return fetch('contact.php', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok || ct.indexOf('json') < 0) throw new Error('no-php');
      return r.json();
    }).then(function (j) {
      if (j && j.ok && j.token) { mode = 'php'; token = j.token; } else throw new Error('no-php');
    }).catch(function () { mode = 'formsubmit'; });
  }
  function recentSends() {
    try { return (JSON.parse(localStorage.getItem('avenir_contact') || '[]') || []).filter(function (t) { return Date.now() - t < LIMIT_WINDOW; }); } catch (e) { return []; }
  }
  function remember() {
    try { var l = recentSends(); l.push(Date.now()); localStorage.setItem('avenir_contact', JSON.stringify(l)); } catch (e) {}
  }
  function openContact(reason, trigger) {
    if (!dlg) buildDialog();
    lastTrigger = trigger || document.activeElement;
    dlg.querySelector('.cm-form').hidden = false;
    dlg.querySelector('.cm-done').hidden = true;
    status('');
    field('motif').value = reason || 'question';
    dlg.querySelectorAll('[aria-invalid]').forEach(function (f) { setErr(f, ''); });
    openedAt = Date.now();
    prep = prepare();
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    document.documentElement.classList.add('cm-open');
    setTimeout(function () { var first = field('nom'); if (first) first.focus(); }, 30);
  }
  function closeContact() {
    if (!dlg) return;
    if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); }
  }
  var sending = false;
  function send() {
    if (sending) return;
    var names = ['nom', 'email', 'motif', 'objet', 'message', 'consentement'], ok = true, firstBad = null;
    names.forEach(function (n) { var f = field(n); if (!validate(f)) { ok = false; firstBad = firstBad || f; } });
    if (!ok) { status('Vérifiez les champs signalés.', true); firstBad.focus(); return; }
    if (field('site_web').value) { done(); return; } // robot : on fait comme si
    var wait = MIN_DELAY - (Date.now() - openedAt);
    if (wait > 0) { status('Un instant…'); setTimeout(send, wait); return; }
    if (recentSends().length >= LIMIT) { status('Vous avez déjà envoyé plusieurs messages. Réessayez dans quelques minutes.' + fallbackText(), true); return; }
    var v = function (n) { return field(n).value.trim(); };
    var reasonLabel = REASONS.filter(function (r) { return r[0] === v('motif'); })[0][1];
    var btn = dlg.querySelector('[data-cm-send]');
    sending = true; btn.disabled = true; status('Envoi en cours…');
    prep.then(function () { return request(v, reasonLabel); }).then(function () { remember(); done(); }).catch(function (e) {
      status(escHtml(e && e.message && e.message !== 'Failed to fetch' ? e.message : 'Connexion impossible. Vérifiez votre connexion internet puis réessayez.') + fallbackText(), true);
      if (mode === 'php') prep = prepare(); // nouveau jeton pour un nouvel essai
    }).then(function () { sending = false; btn.disabled = false; });
  }
  function request(v, reasonLabel) {
    var req;
    if (mode === 'php') {
      req = fetch('contact.php', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ nom: v('nom'), email: v('email'), motif: v('motif'), objet: v('objet'), message: v('message'), consentement: field('consentement').checked, site_web: field('site_web').value, token: token })
      }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (j) {
        if (j && j.ok) return;
        if (j && j.field && field(j.field)) { setErr(field(j.field), j.error); field(j.field).focus(); }
        throw new Error((j && j.error) || 'Le message n\'a pas pu être envoyé.');
      });
    } else {
      if (!contactEmail) req = Promise.reject(new Error('Adresse de réception absente.'));
      else req = fetch('https://formsubmit.co/ajax/' + encodeURIComponent(contactEmail), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: v('nom'), email: v('email'), Motif: reasonLabel, Objet: v('objet'), message: v('message'), _subject: '[Site] ' + reasonLabel + ' : ' + v('objet'), _replyto: v('email'), _template: 'table', _captcha: 'false', _honey: field('site_web').value })
      }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (j) {
        if (j && (j.success === true || j.success === 'true')) return;
        throw new Error('Le message n\'a pas pu être envoyé.');
      });
    }
    return req;
  }
  function done() {
    ['nom', 'email', 'objet', 'message'].forEach(function (n) { field(n).value = ''; });
    field('consentement').checked = false;
    dlg.querySelector('.cm-form').hidden = true;
    var box = dlg.querySelector('.cm-done');
    box.hidden = false;
    box.querySelector('button').focus();
  }
  function reasonFromHref(a) {
    var h = a.getAttribute('href') || '';
    var i = h.indexOf('#');
    if (i < 0) return null;
    var path = h.slice(0, i), hash = h.slice(i);
    if (!HASH_REASON[hash]) return null;
    if (path && !/(^|\/)(accueil\.html|index\.html)?$/.test(path)) return null;
    if (path && !document.getElementById('contact')) return null; // depuis une autre page : on suit le lien
    return HASH_REASON[hash];
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.btn, a.ct-link, a[data-contact-open]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var r = reasonFromHref(a);
    if (!r) return;
    e.preventDefault();
    if (m && m.classList.contains('open')) { m.classList.remove('open'); if (b) b.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; }
    openContact(r, a);
  });
  // Arrivée depuis une autre page avec un motif précis (ex. accueil.html#contact-atelier)
  if (location.hash && location.hash !== '#contact' && HASH_REASON[location.hash] && document.getElementById('contact')) {
    var r0 = HASH_REASON[location.hash];
    setTimeout(function () { document.getElementById('contact').scrollIntoView(); openContact(r0); }, 50);
  }

  /* ---------- Apparition douce des blocs situés plus bas (rien n'est masqué sans JavaScript) ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    var vh = window.innerHeight;
    document.querySelectorAll('main .head, main .row, main .tile, main .split-text, main .split-media, main .qa, main .ct, main .cta-box, main .tm, main .stage, main .gal, main .slot, main .news, main .event, main .quote, main .frow').forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) return; // déjà visible : pas d'effet
      el.classList.add('rv');
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 5) * 70 + 'ms';
      io.observe(el);
    });
  }
})();
