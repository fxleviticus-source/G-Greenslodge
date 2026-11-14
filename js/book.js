/* G.Greens Lodge — booking wizard (stay / table / event) */
(function () {
  'use strict';
  var GG = window.GG, $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = $('#wizard'); if (!root) return;

  var TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  var ST = {
    type: 'stay', step: 1, branch: '', inD: null, outD: null, adults: 2, children: 0, rooms: 1, room: 'any',
    extras: [], name: '', phone: '', email: '', arrive: '', notes: '', ref: ''
  };
  var STEPS = ['Branch', 'Dates & guests', 'Room', 'Your details', 'Review'];

  /* ---------- helpers ---------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sod(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmt(d) { return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function fmtS(d) { return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''; }
  function nights() { return ST.inD && ST.outD ? Math.round((ST.outD - ST.inD) / 864e5) : 0; }
  function branchOf(id) { return GG.branches.filter(function (b) { return b.id === id; })[0]; }
  function roomOf(id) { return GG.rooms.filter(function (r) { return r.id === id; })[0]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mkRef(p) {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
    var d = new Date(); return p + '-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + s;
  }
  function validPhone(v) { return v.replace(/[^\d]/g, '').length >= 9; }
  function validEmail(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function toTop() {
    var y = root.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  function waUrl(text) { return 'https://wa.me/' + GG.wa + '?text=' + encodeURIComponent(text); }

  var today = sod(new Date());
  var maxD = addDays(today, 365);

  /* ---------- type tabs ---------- */
  var typeBtns = $$('.bk-type', root);
  function setType(t) {
    ST.type = t;
    typeBtns.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t); });
    ['stay', 'table', 'event'].forEach(function (k) { $('#flow-' + k).hidden = k !== t; });
    $('#success').hidden = true;
    renderSummary();
  }
  typeBtns.forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-t')); }); });

  /* ---------- progress ---------- */
  var prog = $('#prog');
  function renderProg() {
    prog.innerHTML = STEPS.map(function (s, i) {
      var n = i + 1, cls = n < ST.step ? 'done' : n === ST.step ? 'cur' : '';
      return '<div class="prog-step ' + cls + '"><div class="prog-bar"></div><span class="prog-lbl">' + n + '. ' + s + '</span></div>';
    }).join('');
  }

  /* ---------- step 1: branches ---------- */
  var bWrap = $('#branchOpts');
  function renderBranches(wrap, name, selected, onPick) {
    wrap.innerHTML = GG.branches.map(function (b) {
      return '<label class="opt"><input type="radio" name="' + name + '" value="' + b.id + '"' + (selected === b.id ? ' checked' : '') + '>' +
        '<span class="opt-in"><span class="opt-pin">' + b.short + '</span><span><b>' + esc(b.name) + '</b><small>' + esc(b.address) + '</small></span>' +
        '<span class="tick">' + TICK + '</span></span></label>';
    }).join('');
    $$('input', wrap).forEach(function (i) { i.addEventListener('change', function () { onPick(i.value); }); });
  }
  renderBranches(bWrap, 'branch', ST.branch, function (v) { ST.branch = v; $('#e1').textContent = ''; renderSummary(); });

  /* ---------- step 2: calendar + guests ---------- */
  var calEl = $('#cal'), view = new Date(today.getFullYear(), today.getMonth(), 1);
  function monthHTML(first) {
    var y = first.getFullYear(), m = first.getMonth(), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    var h = '<div><p class="cal-title">' + first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</p><div class="cal-grid" role="grid">';
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(function (d) { h += '<div class="cal-dow">' + d + '</div>'; });
    for (var i = 0; i < lead; i++) h += '<span class="cal-day empty"></span>';
    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, m, d), dis = dt < today || dt > maxD, cls = 'cal-day';
      if (+dt === +today) cls += ' today';
      if (ST.inD && ST.outD && dt > ST.inD && dt < ST.outD) cls += ' in';
      if (ST.inD && +dt === +ST.inD) cls += ' s' + (ST.outD ? '' : ' e');
      if (ST.outD && +dt === +ST.outD) cls += ' e';
      if (ST.inD && ST.outD && +dt === +ST.inD) cls = cls.replace(' e', '');
      h += '<button type="button" class="' + cls + '" data-d="' + iso(dt) + '"' + (dis ? ' disabled' : '') + ' aria-label="' + fmt(dt) + '"><span>' + d + '</span></button>';
    }
    return h + '</div></div>';
  }
  function renderCal() {
    var second = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    calEl.innerHTML = '<div class="cal-nav"><button type="button" id="cPrev" aria-label="Previous month"' + (view <= new Date(today.getFullYear(), today.getMonth(), 1) ? ' disabled' : '') +
      '><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4l-6 6 6 6"/></svg></button>' +
      '<span class="sr" aria-live="polite">' + view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</span>' +
      '<button type="button" id="cNext" aria-label="Next month"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 4l6 6-6 6"/></svg></button></div>' +
      '<div class="cal-months">' + monthHTML(view) + '<div class="cal-2">' + monthHTML(second) + '</div></div>';
    $('#cPrev').onclick = function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); };
    $('#cNext').onclick = function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); };
    $$('.cal-day[data-d]', calEl).forEach(function (b) {
      b.onclick = function () { pickDate(parse(b.getAttribute('data-d'))); };
    });
    var s2 = $('.cal-2', calEl); s2.style.display = window.innerWidth >= 1000 ? '' : 'none';
    renderDateBoxes();
  }
  window.addEventListener('resize', function () { var s2 = $('.cal-2', calEl); if (s2) s2.style.display = window.innerWidth >= 1000 ? '' : 'none'; });
  function pickDate(d) {
    if (!ST.inD || (ST.inD && ST.outD) || d <= ST.inD) { ST.inD = d; ST.outD = null; }
    else { ST.outD = d; }
    $('#e2').textContent = ''; renderCal(); renderSummary();
  }
  function setRange(a, b) { ST.inD = a; ST.outD = b; view = new Date(a.getFullYear(), a.getMonth(), 1); renderCal(); renderSummary(); }
  function renderDateBoxes() {
    var n = nights();
    $('#dIn').innerHTML = '<span>Check-in</span><b>' + (ST.inD ? fmtS(ST.inD) : 'Select a date') + '</b>';
    $('#dOut').innerHTML = '<span>Check-out</span><b>' + (ST.outD ? fmtS(ST.outD) : ST.inD ? 'Select check-out' : '—') + '</b>';
    $('#dIn').classList.toggle('act', !ST.inD);
    $('#dOut').classList.toggle('act', !!ST.inD && !ST.outD);
    $('#dN').innerHTML = (n || '–') + '<small>' + (n === 1 ? 'night' : 'nights') + '</small>';
  }
  $$('[data-q]').forEach(function (b) {
    b.addEventListener('click', function () {
      var q = b.getAttribute('data-q'), a, o;
      if (q === 'tonight') { a = today; o = addDays(today, 1); }
      else if (q === 'weekend') {
        var dow = today.getDay(); // 0 Sun
        var toFri = dow === 5 ? 0 : dow === 6 ? -1 : dow === 0 ? -2 : 5 - dow;
        a = addDays(today, Math.max(0, toFri)); if (a < today) a = today;
        o = addDays(addDays(today, toFri), 2); if (o <= a) o = addDays(a, 1);
      } else { a = today; o = addDays(today, 7); }
      setRange(a, o);
    });
  });
  function stepper(id, key, min, max, after) {
    var el = $('#' + id), out = $('output', el), minus = $('[data-m]', el), plus = $('[data-p]', el);
    function upd() { out.textContent = ST[key]; minus.disabled = ST[key] <= min; plus.disabled = ST[key] >= max; }
    minus.onclick = function () { if (ST[key] > min) { ST[key]--; upd(); if (after) after(); renderSummary(); } };
    plus.onclick = function () { if (ST[key] < max) { ST[key]++; upd(); if (after) after(); renderSummary(); } };
    upd(); return upd;
  }
  var updAdults = stepper('stAdults', 'adults', 1, 12);
  var updKids = stepper('stKids', 'children', 0, 8);
  var updRooms = stepper('stRooms', 'rooms', 1, 6);

  /* ---------- step 3: rooms ---------- */
  var rWrap = $('#roomOpts');
  function renderRooms() {
    var list = [{ id: 'any', name: 'Let the lodge choose', desc: 'We\'ll offer the best available room for your dates and party size.', img: '', sleeps: '' }].concat(GG.rooms);
    rWrap.innerHTML = list.map(function (r) {
      return '<label class="opt room-opt"><input type="radio" name="room" value="' + r.id + '"' + (ST.room === r.id ? ' checked' : '') + '>' +
        '<span class="opt-in">' +
        (r.img ? '<span class="ph"><img src="' + r.img + '" alt="" loading="lazy" referrerpolicy="no-referrer"></span>' : '<span class="opt-pin" style="margin:16px 0 16px 16px">?</span>') +
        '<span class="ro-b"><b>' + esc(r.name) + '</b><small>' + esc(r.desc) + '</small>' +
        (r.sleeps ? '<small><strong>' + esc(r.sleeps) + '</strong> · Rate on request</small>' : '') + '</span><span class="tick">' + TICK + '</span></span></label>';
    }).join('');
    $$('input', rWrap).forEach(function (i) { i.addEventListener('change', function () { ST.room = i.value; renderSummary(); }); });
    $$('.ph img', rWrap).forEach(function (img) {
      img.addEventListener('load', function () { img.classList.add('loaded'); });
      img.addEventListener('error', function () { img.parentElement.classList.add('noimg'); });
    });
  }
  var xWrap = $('#extraOpts');
  xWrap.innerHTML = GG.extras.map(function (x) {
    return '<label class="opt"><input type="checkbox" value="' + x.id + '"><span class="opt-in"><span><b>' + esc(x.name) + '</b><small>' + esc(x.note) + '</small></span><span class="tick">' + TICK + '</span></span></label>';
  }).join('');
  $$('input', xWrap).forEach(function (i) {
    i.addEventListener('change', function () {
      ST.extras = $$('input:checked', xWrap).map(function (c) { return c.value; }); renderSummary();
    });
  });
  function extraNames() { return ST.extras.map(function (id) { return GG.extras.filter(function (x) { return x.id === id; })[0].name; }); }

  /* ---------- step 4: details ---------- */
  var f = { name: $('#fName'), phone: $('#fPhone'), email: $('#fEmail'), arrive: $('#fArrive'), notes: $('#fNotes') };
  Object.keys(f).forEach(function (k) {
    f[k].addEventListener('input', function () { ST[k] = f[k].value; f[k].classList.remove('err'); $('#e4').textContent = ''; });
  });
  var saved = load('gg_guest');
  if (saved) { ['name', 'phone', 'email'].forEach(function (k) { if (saved[k]) { f[k].value = saved[k]; ST[k] = saved[k]; } }); }

  /* ---------- validation + navigation ---------- */
  function validate(step) {
    if (step === 1 && !ST.branch) { $('#e1').textContent = 'Please choose the branch you want to stay at.'; return false; }
    if (step === 2) {
      if (!ST.inD || !ST.outD) { $('#e2').textContent = ST.inD ? 'Now tap your check-out date.' : 'Please select your check-in and check-out dates.'; return false; }
    }
    if (step === 4) {
      var ok = true, msg = [];
      if (!ST.name.trim()) { f.name.classList.add('err'); ok = false; msg.push('your name'); }
      if (!validPhone(ST.phone)) { f.phone.classList.add('err'); ok = false; msg.push('a valid phone number'); }
      if (!validEmail(ST.email)) { f.email.classList.add('err'); ok = false; msg.push('a valid email (or leave it empty)'); }
      if (!ok) { $('#e4').textContent = 'Please add ' + msg.join(', ') + '.'; return false; }
    }
    return true;
  }
  function go(n, quiet) {
    ST.step = n;
    $$('#flow-stay .step').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-step') === n); });
    renderProg();
    if (n === 5) renderReview();
    if (!quiet) toTop();
  }
  $$('[data-next]').forEach(function (b) { b.addEventListener('click', function () { if (validate(ST.step)) go(ST.step + 1); }); });
  $$('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { go(ST.step - 1); }); });
  $$('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-edit')); }); });

  /* ---------- summary (desktop + mobile) ---------- */
  function guestsTxt() {
    return ST.adults + ' adult' + (ST.adults > 1 ? 's' : '') + (ST.children ? ', ' + ST.children + ' child' + (ST.children > 1 ? 'ren' : '') : '') + ' · ' + ST.rooms + ' room' + (ST.rooms > 1 ? 's' : '');
  }
  var TS = { table: { branch: '', date: '', time: '', guests: 2, occ: '', seat: '' }, event: { branch: '', kind: '', date: '', guests: '' } };
  function rowsFor() {
    var b;
    if (ST.type === 'stay') {
      b = branchOf(ST.branch); var r = ST.room === 'any' ? null : roomOf(ST.room);
      return [
        ['Branch', b ? b.name : ''], ['Check-in', ST.inD ? fmtS(ST.inD) : ''], ['Check-out', ST.outD ? fmtS(ST.outD) : ''],
        ['Nights', nights() ? String(nights()) : ''], ['Guests', guestsTxt()], ['Room', ST.step >= 3 ? (r ? r.name : 'Lodge to choose') : ''],
        ['Extras', ST.extras.length ? extraNames().join(', ') : '']
      ];
    }
    if (ST.type === 'table') {
      b = branchOf(TS.table.branch);
      return [['Branch', b ? b.name : ''], ['Date', TS.table.date ? fmtS(parse(TS.table.date)) : ''], ['Time', TS.table.time], ['Party', TS.table.guests + ' guest' + (TS.table.guests > 1 ? 's' : '')], ['Occasion', TS.table.occ]];
    }
    b = branchOf(TS.event.branch);
    return [['Branch', b ? b.name : ''], ['Event', TS.event.kind], ['Date', TS.event.date ? fmtS(parse(TS.event.date)) : ''], ['Guests', TS.event.guests ? '~' + TS.event.guests : '']];
  }
  function renderSummary() {
    var rows = rowsFor();
    var h = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd' + (r[1] ? '' : ' class="empty"') + '>' + (r[1] ? esc(r[1]) : '—') + '</dd></div>'; }).join('');
    $('#sumList').innerHTML = h; $('#sumListM').innerHTML = h;
    var title = { stay: 'Your stay', table: 'Your table', event: 'Your event' }[ST.type];
    $('#sumTitle').textContent = title; $('#sumTitleM').textContent = title;
    var head = ST.type === 'stay' ? (nights() ? nights() + (nights() === 1 ? ' night' : ' nights') + ' · ' + (ST.adults + ST.children) + ((ST.adults + ST.children) === 1 ? ' guest' : ' guests') : 'Tap to view') : 'Tap to view';
    $('#sumHead').textContent = head;
  }

  /* ---------- review + send (stay) ---------- */
  function stayMessage() {
    var b = branchOf(ST.branch), r = ST.room === 'any' ? null : roomOf(ST.room);
    var L = ['Hello G.Greens Lodge 👋', 'I would like to request a room booking (via your website).', '',
      '📍 Branch: ' + b.name,
      '📅 Check-in: ' + fmt(ST.inD),
      '📅 Check-out: ' + fmt(ST.outD) + ' (' + nights() + ' night' + (nights() > 1 ? 's' : '') + ')',
      '👥 Guests: ' + guestsTxt(),
      '🛏️ Room: ' + (r ? r.name : 'Any available — lodge to choose')];
    if (ST.extras.length) L.push('➕ Extras: ' + extraNames().join(', '));
    if (ST.arrive) L.push('🕒 Expected arrival: ' + ST.arrive);
    if (ST.notes.trim()) L.push('📝 Notes: ' + ST.notes.trim());
    L.push('', '👤 Name: ' + ST.name.trim(), '📞 Phone: ' + ST.phone.trim());
    if (ST.email.trim()) L.push('✉️ Email: ' + ST.email.trim());
    L.push('🔖 Ref: ' + ST.ref, '', 'Please confirm availability and rates. Thank you!');
    return L.join('\n');
  }
  function renderReview() {
    ST.ref = ST.ref || mkRef('GG');
    var b = branchOf(ST.branch), r = ST.room === 'any' ? null : roomOf(ST.room);
    var rows = [
      ['Branch', b.name + ' — ' + b.address, 1], ['Dates', fmt(ST.inD) + ' → ' + fmt(ST.outD) + ' (' + nights() + ' night' + (nights() > 1 ? 's' : '') + ')', 2],
      ['Guests', guestsTxt(), 2], ['Room', r ? r.name : 'Any available — lodge to choose', 3], ['Extras', ST.extras.length ? extraNames().join(', ') : 'None', 3],
      ['Name', ST.name.trim(), 4], ['Phone', ST.phone.trim(), 4]
    ];
    if (ST.email.trim()) rows.push(['Email', ST.email.trim(), 4]);
    if (ST.arrive) rows.push(['Arrival', ST.arrive, 4]);
    if (ST.notes.trim()) rows.push(['Notes', ST.notes.trim(), 4]);
    $('#review').innerHTML = rows.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + ' <button type="button" class="link-edit" data-e="' + x[2] + '">Edit</button></dd></div>'; }).join('');
    $$('.link-edit', $('#review')).forEach(function (e) { e.onclick = function () { go(+e.getAttribute('data-e')); }; });
    var msg = stayMessage();
    $('#sendWA').href = waUrl(msg);
    $('#sendMail').href = 'mailto:' + GG.email + '?subject=' + encodeURIComponent('Booking request ' + ST.ref + ' — ' + b.name) + '&body=' + encodeURIComponent(msg);
    $('#copyBtn').onclick = function () {
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(function () { btn.textContent = 'Copied ✓'; }, function () { btn.textContent = 'Copy not available'; });
      setTimeout(function () { btn.textContent = 'Copy details'; }, 2200);
    };
  }
  function success(ref, kind, waLink) {
    $$('#flow-stay,#flow-table,#flow-event').forEach(function (x) { x.hidden = true; });
    $('#success').hidden = false;
    $('#sRef').textContent = ref;
    $('#sKind').textContent = kind;
    $('#sWA').href = waLink;
    var h = $('#successIcon'); h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop');
    toTop();
  }
  $('#sendWA').addEventListener('click', function () {
    store('gg_guest', { name: ST.name, phone: ST.phone, email: ST.email });
    var hist = load('gg_bookings') || []; hist.push({ ref: ST.ref, type: 'stay', branch: ST.branch, in: iso(ST.inD), out: iso(ST.outD), at: Date.now() }); store('gg_bookings', hist.slice(-10));
    var link = this.href;
    setTimeout(function () { success(ST.ref, 'room booking request', link); }, 500);
  });
  $('#again').addEventListener('click', function () {
    ST.ref = ''; ST.step = 1; ST.inD = ST.outD = null; ST.extras = []; $$('input:checked', xWrap).forEach(function (c) { c.checked = false; });
    renderCal(); go(1); setType('stay');
  });

  /* ---------- table + event forms ---------- */
  function fillBranchSelect(sel, withBlank) {
    sel.innerHTML = (withBlank ? '<option value="">Select a branch…</option>' : '') + GG.branches.map(function (b) { return '<option value="' + b.id + '">' + esc(b.name) + '</option>'; }).join('');
  }
  var tF = $('#tForm'), eF = $('#eForm');
  fillBranchSelect($('#tBranch'), true); fillBranchSelect($('#eBranch'), true);
  var times = []; for (var h = 7; h <= 22; h++) { [0, 30].forEach(function (m) { if (h === 22 && m) return; times.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')); }); }
  $('#tTime').innerHTML = '<option value="">Select a time…</option>' + times.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  $('#tDate').min = iso(today); $('#eDate').min = iso(today);
  stepperT();
  function stepperT() {
    var el = $('#tGuests'), out = $('output', el), mi = $('[data-m]', el), pl = $('[data-p]', el);
    function upd() { out.textContent = TS.table.guests; mi.disabled = TS.table.guests <= 1; pl.disabled = TS.table.guests >= 30; }
    mi.onclick = function () { TS.table.guests--; upd(); renderSummary(); }; pl.onclick = function () { TS.table.guests++; upd(); renderSummary(); }; upd();
  }
  var bind = [['tBranch', 'table', 'branch'], ['tDate', 'table', 'date'], ['tTime', 'table', 'time'], ['tOcc', 'table', 'occ'], ['eBranch', 'event', 'branch'], ['eKind', 'event', 'kind'], ['eDate', 'event', 'date'], ['eGuests', 'event', 'guests']];
  bind.forEach(function (x) { var el = $('#' + x[0]); ['input', 'change'].forEach(function (ev) { el.addEventListener(ev, function () { TS[x[1]][x[2]] = el.value; el.classList.remove('err'); renderSummary(); }); }); });

  function checkForm(form, ids) {
    var ok = true;
    ids.forEach(function (id) {
      var el = $('#' + id), v = el.value.trim(), bad = !v;
      if (/Phone$/.test(id)) bad = !validPhone(v);
      if (/Email$/.test(id)) bad = !validEmail(v);
      el.classList.toggle('err', bad); if (bad) ok = false;
    });
    return ok;
  }
  function submitOther(form, errEl, ids, build, kind, prefix) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!checkForm(form, ids)) { errEl.textContent = 'Please complete the highlighted fields.'; return; }
      errEl.textContent = '';
      var ref = mkRef(prefix), text = build(ref), url = waUrl(text);
      var name = $('#' + (prefix === 'GT' ? 'tName' : 'eName')).value, phone = $('#' + (prefix === 'GT' ? 'tPhone' : 'ePhone')).value;
      store('gg_guest', { name: name, phone: phone, email: ST.email });
      var hist = load('gg_bookings') || []; hist.push({ ref: ref, type: kind, at: Date.now() }); store('gg_bookings', hist.slice(-10));
      window.open(url, '_blank', 'noopener');
      success(ref, kind + ' request', url);
    });
  }
  submitOther(tF, $('#tErr'), ['tBranch', 'tDate', 'tTime', 'tName', 'tPhone'], function (ref) {
    var b = branchOf(TS.table.branch), L = ['Hello G.Greens Lodge 👋', 'I would like to reserve a table (via your website).', '', '📍 Branch: ' + b.name,
      '📅 Date: ' + fmt(parse(TS.table.date)), '🕒 Time: ' + TS.table.time, '👥 Guests: ' + TS.table.guests];
    if (TS.table.occ) L.push('🎉 Occasion: ' + TS.table.occ);
    if ($('#tSeat').value) L.push('🪑 Seating: ' + $('#tSeat').value);
    if ($('#tNotes').value.trim()) L.push('📝 Notes: ' + $('#tNotes').value.trim());
    L.push('', '👤 Name: ' + $('#tName').value.trim(), '📞 Phone: ' + $('#tPhone').value.trim(), '🔖 Ref: ' + ref, '', 'Please confirm. Thank you!');
    return L.join('\n');
  }, 'table reservation', 'GT');
  submitOther(eF, $('#eErr'), ['eBranch', 'eKind', 'eDate', 'eGuests', 'eName', 'ePhone', 'eEmail'], function (ref) {
    var b = branchOf(TS.event.branch), L = ['Hello G.Greens Lodge 👋', 'I would like to enquire about hosting an event (via your website).', '', '📍 Branch: ' + b.name,
      '🎉 Event: ' + TS.event.kind, '📅 Preferred date: ' + fmt(parse(TS.event.date)), '👥 Expected guests: ~' + TS.event.guests];
    if ($('#eNotes').value.trim()) L.push('📝 Details: ' + $('#eNotes').value.trim());
    L.push('', '👤 Name: ' + $('#eName').value.trim(), '📞 Phone: ' + $('#ePhone').value.trim());
    if ($('#eEmail').value.trim()) L.push('✉️ Email: ' + $('#eEmail').value.trim());
    L.push('🔖 Ref: ' + ref, '', 'Please share availability and a quote. Thank you!');
    return L.join('\n');
  }, 'event enquiry', 'GE');
  if (saved) { ['tName', 'eName'].forEach(function (id) { if (saved.name) $('#' + id).value = saved.name; }); ['tPhone', 'ePhone'].forEach(function (id) { if (saved.phone) $('#' + id).value = saved.phone; }); }

  /* ---------- prefill from URL ---------- */
  var q = new URLSearchParams(location.search);
  renderRooms(); renderCal(); renderProg(); renderSummary();
  var t = q.get('type'); if (t && ['stay', 'table', 'event'].indexOf(t) > -1) setType(t); else setType('stay');
  var br = q.get('branch');
  if (br && branchOf(br)) {
    ST.branch = br; TS.table.branch = br; TS.event.branch = br;
    var inp = $('input[value="' + br + '"]', bWrap); if (inp) inp.checked = true;
    $('#tBranch').value = br; $('#eBranch').value = br;
  }
  var qi = q.get('in'), qo = q.get('out');
  if (qi && /^\d{4}-\d{2}-\d{2}$/.test(qi)) {
    var a = parse(qi), o = qo && /^\d{4}-\d{2}-\d{2}$/.test(qo) ? parse(qo) : null;
    if (a >= today && a <= maxD) { ST.inD = a; if (o && o > a && o <= maxD) ST.outD = o; view = new Date(a.getFullYear(), a.getMonth(), 1); renderCal(); }
  }
  var g = parseInt(q.get('g'), 10); if (g >= 1 && g <= 12) { ST.adults = g; updAdults(); }
  var rm = q.get('room'); if (rm && roomOf(rm)) { ST.room = rm; renderRooms(); }
  renderSummary();
  var kd = q.get('kind');
  if (kd) { var ek = $('#eKind'); $$('option', ek).forEach(function (o) { if (o.textContent === kd) { ek.value = kd; TS.event.kind = kd; } }); setType('event'); }
  if (ST.type === 'stay' && ST.branch && ST.inD && ST.outD) go(3, true);
  else if (ST.type === 'stay' && ST.branch) go(2, true);
  else go(1, true);
  if (location.hash === '#wizard') setTimeout(toTop, 80);
})();
