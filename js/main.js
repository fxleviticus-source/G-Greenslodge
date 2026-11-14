/* G.Greens Lodge — shared behaviour */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GG = window.GG || {};

  /* ---------- Images: fade in / graceful fallback ---------- */
  $$('.ph img').forEach(function (img) {
    var ok = function () { img.classList.add('loaded'); };
    var bad = function () { img.parentElement.classList.add('noimg'); };
    if (img.complete) { img.naturalWidth ? ok() : bad(); }
    else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', bad, { once: true }); }
  });

  /* ---------- Theme (day / night) ---------- */
  var tbtn = $('#themeBtn');
  function setTheme(t, anim) {
    if (anim) { document.body.classList.add('theme-anim'); setTimeout(function () { document.body.classList.remove('theme-anim'); }, 800); }
    html.setAttribute('data-theme', t);
    try { localStorage.setItem('gg_theme', t); } catch (e) {}
    if (tbtn) {
      tbtn.setAttribute('aria-pressed', t === 'night');
      tbtn.setAttribute('aria-label', t === 'night' ? 'Switch to day mode' : 'Switch to night mode');
    }
  }
  if (tbtn) {
    setTheme(html.getAttribute('data-theme') || 'day', false);
    tbtn.addEventListener('click', function () { setTheme(html.getAttribute('data-theme') === 'night' ? 'day' : 'night', true); });
  }

  /* ---------- Mobile nav ---------- */
  var burger = $('#burger'), nav = $('#nav'), hdrEl = $('.hdr');
  var keepY = 0;
  function setNav(open) {
    if (open) keepY = window.pageYOffset;
    var sb = html.style.scrollBehavior; html.style.scrollBehavior = 'auto';
    nav.classList.toggle('open', open); html.classList.toggle('nav-lock', open); html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false'); burger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    window.scrollTo(0, keepY); html.style.scrollBehavior = sb;
  }
  function closeNav() { if (nav) setNav(false); }
  if (burger && nav) {
    $$('a', nav).forEach(function (a, i) { a.style.setProperty('--i', i); });
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeNav(); });
  }

  /* ---------- Reveal on scroll ---------- */
  var rv = $$('.reveal');
  if ('IntersectionObserver' in window && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- Scroll-linked word reveal ---------- */
  var wrs = $$('.wr').map(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    return { el: el, ws: $$('.w', el) };
  });
  function wrUpdate() {
    var vh = window.innerHeight;
    wrs.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.45)));
      var n = Math.round(p * o.ws.length);
      o.ws.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
  }

  /* ---------- Hero parallax ---------- */
  var heroSun = $('.hero-bg') || $('.phero-bg'), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      if (wrs.length && !RM) wrUpdate();
      if (heroSun && !RM) heroSun.style.transform = 'translate3d(0,' + (Math.min(window.scrollY, 900) * 0.14) + 'px,0)';
      ticking = false;
    });
  }
  if (RM) { wrs.forEach(function (o) { o.ws.forEach(function (w) { w.classList.add('on'); }); }); }
  else { wrUpdate(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', wrUpdate); }

  /* ---------- Generic tabs ---------- */
  function initTabs(list) {
    var tabs = $$('[role="tab"]', list);
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) { p.classList.toggle('on', on); p.hidden = !on; }
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      });
    });
    var hash = location.hash.replace('#', '');
    var pre = tabs.filter(function (t) { return t.getAttribute('aria-controls') === hash; })[0];
    select(pre || tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
  }
  $$('[role="tablist"]').filter(function (l) { return $('[aria-controls]', l); }).forEach(initTabs);

  /* ---------- Day / night compare slider ---------- */
  $$('.compare').forEach(function (c) {
    var r = $('input', c);
    r.addEventListener('input', function () { c.style.setProperty('--pos', r.value + '%'); });
  });

  /* ---------- Gallery filters + lightbox ---------- */
  var items = $$('.mitem');
  if (items.length) {
    $$('.fchip').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.fchip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        var f = b.getAttribute('data-f');
        items.forEach(function (it) { it.classList.toggle('hide', f !== 'all' && it.getAttribute('data-cat') !== f); });
      });
    });
    var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), idx = 0, vis = [];
    var show = function (i) {
      idx = (i + vis.length) % vis.length;
      var it = vis[idx], im = $('img', it);
      lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; lbCap.textContent = it.getAttribute('data-cap') || im.alt;
    };
    var open = function (it) {
      vis = items.filter(function (x) { return !x.classList.contains('hide'); });
      show(vis.indexOf(it)); lb.classList.add('on'); document.body.style.overflow = 'hidden'; $('.x', lb).focus();
    };
    var close = function () { lb.classList.remove('on'); document.body.style.overflow = ''; };
    items.forEach(function (it) { it.addEventListener('click', function () { open(it); }); });
    $('.x', lb).addEventListener('click', close);
    $('.pv', lb).addEventListener('click', function () { show(idx - 1); });
    $('.nx', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---------- Quick booking bar (home) ---------- */
  var qb = $('#qb');
  if (qb) {
    var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var today = new Date(), tomorrow = new Date(today.getTime() + 864e5);
    var qi = $('#qIn'), qo = $('#qOut');
    qi.min = iso(today); qo.min = iso(tomorrow);
    qi.addEventListener('change', function () {
      var d = new Date(qi.value + 'T00:00'); var n = new Date(d.getTime() + 864e5);
      qo.min = iso(n); if (!qo.value || qo.value <= qi.value) qo.value = iso(n);
    });
    qb.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      if ($('#qBranch').value) p.set('branch', $('#qBranch').value);
      if (qi.value) p.set('in', qi.value);
      if (qo.value) p.set('out', qo.value);
      p.set('g', $('#qGuests').value);
      location.href = 'book.html?' + p.toString() + '#wizard';
    });
  }

  /* ---------- Contact form -> WhatsApp ---------- */
  var cf = $('#cform');
  if (cf) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(cf), ok = true;
      ['name', 'phone', 'msg'].forEach(function (k) {
        var el = cf.elements[k], bad = !String(f.get(k) || '').trim();
        el.classList.toggle('err', bad); if (bad) ok = false;
      });
      if (!ok) { $('#cErr').textContent = 'Please fill in your name, phone and message.'; return; }
      $('#cErr').textContent = '';
      var t = 'Hello G.Greens Lodge 👋\n\n' + f.get('msg') + '\n\nBranch: ' + (f.get('branch') || 'Not sure yet') + '\nName: ' + f.get('name') + '\nPhone: ' + f.get('phone');
      window.open('https://wa.me/' + GG.wa + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
    });
  }

  /* ---------- Footer year ---------- */
  var y = $('#yr'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Hero slideshow (starts once the welcome intro is done) ---------- */
  var hb = $('.hero-bg'), heroStart = function () {};
  if (hb) {
    var slides = $$('.slide', hb), dots = $$('.hero-dots button'), cap = $('#heroCap'), cur = 0, timer = null, running = false;
    var showSlide = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (sl, k) { sl.classList.toggle('on', k === cur); });
      dots.forEach(function (d, k) { d.classList.remove('on'); if (k === cur) { void d.offsetWidth; d.classList.add('on'); } });
      if (cap) cap.textContent = slides[cur].getAttribute('data-cap') || '';
      var hh = $('#heroH'), hl2 = $('#heroL'), sl = slides[cur];
      if (hh && hl2 && sl.getAttribute('data-h') && (hh.getAttribute('data-cur') || '0') !== String(cur)) {
        hh.setAttribute('data-cur', cur);
        {
          hh.classList.add('swap'); hl2.classList.add('swap');
          setTimeout(function () { hh.innerHTML = sl.getAttribute('data-h'); hl2.textContent = sl.getAttribute('data-l'); hh.classList.remove('swap'); hl2.classList.remove('swap'); }, 380);
        }
      }
    };
    var stopHero = function () { clearInterval(timer); timer = null; };
    var playHero = function () { stopHero(); if (RM || !running) return; timer = setInterval(function () { showSlide(cur + 1); }, 5500); };
    dots.forEach(function (d, k) { d.addEventListener('click', function () { showSlide(k); playHero(); }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopHero(); else playHero(); });
    heroStart = function () { if (running) return; running = true; playHero(); };
  }

  /* ---------- Welcome preloader: "Open the window to sunrise" ---------- */
  var pre = $('#pre');
  function markReady() { html.classList.add('ready'); heroStart(); }
  if (pre && html.classList.contains('has-pre')) {
    var T = [], raf = 0, done = false, t0 = Date.now(), tDawn = 0;
    var at = function (ms, fn) { T.push(setTimeout(fn, ms)); };
    var nm = $('#preName'), panes = $$('.pre-pane', pre), br = $$('.pre-branches span', pre);
    var num = $('#preNum'), bar = $('#preBar'), panel = $('#prePanel'), ring = $('#preRing'), sun = $('#preSun'), win = $('#preWindow');
    nm.innerHTML = '';
    'G.GREENS'.split('').forEach(function (c, i) {
      var sp = document.createElement('span'); sp.textContent = c; sp.style.setProperty('--d', (0.45 + i * 0.07) + 's'); nm.appendChild(sp);
    });
    var setOrigin = function () {
      if (!win) return;
      var r = win.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      pre.style.setProperty('--wx', x + 'px'); pre.style.setProperty('--wy', y + 'px');
      $('#preNight').style.transformOrigin = x + 'px ' + y + 'px';
    };
    setOrigin(); window.addEventListener('resize', setOrigin);
    panes.forEach(function (p, i) { at(400 + i * 220, function () { p.classList.add('on'); if (i === 1) pre.classList.add('lit'); }); });
    at(1450, function () { setOrigin(); pre.classList.add('zoom'); });
    at(2100, function () { pre.classList.add('flash'); });
    at(2350, function () { tDawn = Date.now(); pre.classList.add('dawn'); });
    br.forEach(function (b, i) { at(4150 + i * 200, function () { b.classList.add('on'); }); });
    at(5100, function () { exit(); });

    /* canvas: stars + fireflies, then golden dust after sunrise */
    var cv = $('#preCanvas'), cx = cv.getContext && cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), P = [];
    var size = function () { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
    size(); window.addEventListener('resize', size);
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    for (var i = 0; i < 70; i++) P.push({ t: 's', x: Math.random(), y: rnd(0, .6), r: rnd(.4, 1.5), ph: rnd(0, 6.28) });
    for (i = 0; i < 26; i++) P.push({ t: 'f', x: Math.random(), y: rnd(.45, 1), r: rnd(1.5, 3), ph: rnd(0, 6.28), vx: rnd(-.00006, .00006), vy: rnd(-.00012, -.00002) });
    for (i = 0; i < 34; i++) P.push({ t: 'd', x: Math.random(), y: rnd(.3, 1), r: rnd(.8, 2.4), ph: rnd(0, 6.28), vx: rnd(-.00003, .00003), vy: rnd(-.00014, -.00004) });
    var draw = function () {
      if (done) return; raf = requestAnimationFrame(draw);
      var n = Date.now(), el = n - t0, dawned = tDawn && n - tDawn > 0, zoomed = el > 1600;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        var a, col;
        if (p.t === 's') { if (zoomed) return; a = (.35 + .35 * Math.sin(el / 500 + p.ph)) * (1 - Math.min(1, Math.max(0, (el - 1300) / 300))); col = '244,236,213'; }
        else if (p.t === 'f') { p.x += p.vx * 16; p.y += p.vy * 16; if (p.y < 0) p.y = 1; a = (.4 + .6 * Math.sin(el / 380 + p.ph)) * (dawned ? .0 : 1) * (zoomed ? .5 : 1); col = '170,240,100'; if (a < .01) return; }
        else { if (!dawned) return; p.x += p.vx * 16; p.y += p.vy * 16; if (p.y < 0) p.y = 1; a = .25 + .5 * Math.abs(Math.sin(el / 700 + p.ph)); col = '255,214,90'; }
        var x = p.x * W, y = p.y * H;
        if (p.t !== 's') { var g = cx.createRadialGradient(x, y, 0, x, y, p.r * 5); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, p.r * 5, 0, 6.283); cx.fill(); }
        else { cx.fillStyle = 'rgba(' + col + ',' + a + ')'; cx.beginPath(); cx.arc(x, y, p.r, 0, 6.283); cx.fill(); }
      });
      var pr = Math.min(1, el / 5100);
      num.textContent = ('0' + Math.round(pr * 100)).slice(-2);
      bar.style.setProperty('--p', pr);
    };
    if (cx) draw();

    pre.addEventListener('pointermove', function (e) {
      pre.style.setProperty('--mx', ((e.clientX / window.innerWidth) - .5) * 2);
      pre.style.setProperty('--my', ((e.clientY / window.innerHeight) - .5) * 2);
    });

    function exit() {
      if (done) return; done = true;
      T.forEach(clearTimeout); cancelAnimationFrame(raf);
      try { sessionStorage.setItem('gg_seen', '1'); } catch (e) {}
      var W2 = window.innerWidth, H2 = window.innerHeight, x = W2 / 2, y = H2 * .62;
      if (pre.classList.contains('dawn') && sun) { var r = sun.getBoundingClientRect(); if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; } }
      pre.style.setProperty('--cx', x + 'px'); pre.style.setProperty('--cy', y + 'px');
      ring.style.left = x + 'px'; ring.style.top = y + 'px';
      pre.classList.add('out'); num.textContent = '100'; bar.style.setProperty('--p', 1);
      var R = Math.hypot(Math.max(x, W2 - x), Math.max(y, H2 - y)) + 40, D = 1150, st = Date.now();
      var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
      (function step() {
        var t = Math.min(1, (Date.now() - st) / D), rr = ease(t) * R;
        panel.style.setProperty('--r', rr + 'px'); ring.style.width = ring.style.height = (rr * 2) + 'px';
        if (t < 1) requestAnimationFrame(step);
        else { pre.remove(); html.classList.remove('has-pre'); markReady(); }
      })();
      setTimeout(markReady, 450);
    }
    $('.pre-skip', pre).addEventListener('click', exit);
  } else { markReady(); }
})();
