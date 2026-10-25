/*
 * L'Avenir Durable : menu mobile, année, événements passés masqués,
 * consentement aux vidéos YouTube (rien n'est chargé avant l'accord), pousse qui grandit au défilement,
 * apparition douce des blocs situés plus bas dans la page.
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
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

  /* ---------- Pousse qui grandit au défilement ---------- */
  var grow = document.getElementById('grow');
  if (grow && !reduceMotion) {
    var leaves = grow.querySelectorAll('.lf'), ticking = false;
    var onScroll = function () {
      ticking = false;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      grow.style.setProperty('--p', p.toFixed(3));
      leaves.forEach(function (lf, i) { lf.classList.toggle('on', p > (i + 1) / (leaves.length + 1) - 0.05); });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* ---------- Apparition douce des blocs situés plus bas (rien n'est masqué sans JavaScript) ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    var vh = window.innerHeight;
    document.querySelectorAll('main .head, main .at, main .stage, main .tm, main .about, main .qa, main .ct, main .gal, main .slot, main .news, main .event, main .cta-box, main .quote, main .frow').forEach(function (el, i) {
      if (el.getBoundingClientRect().top < vh) return; // déjà visible : pas d'effet
      el.classList.add('rv');
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  }
})();
