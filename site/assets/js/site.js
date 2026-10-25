(function () {
  'use strict';

  // Menu na telefonie
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  if (toggle && menu) {
    document.documentElement.classList.add('js');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        toggle.focus();
      }
    });
  }

  // Liczniki: wartość końcowa jest w HTML, animacja tylko ją odtwarza
  var counters = document.querySelectorAll('[data-count]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    var run = function (el) {
      var end = Number(el.getAttribute('data-count'));
      var start = null, dur = 1200;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.unobserve(en.target); run(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io.observe(el); });
  }

  // Kalkulator kwot: zaznacza programy, których limit pokrywa wpisaną kwotę
  var calc = document.getElementById('kalkulator');
  if (calc) {
    var calcInput = document.getElementById('calc-kwota');
    var calcOut = document.getElementById('calc-wynik');
    var calcRows = document.querySelectorAll('.calc__table tbody tr');
    var update = function () {
      var raw = calcInput.value.replace(/[^\d,.]/g, '').replace(',', '.');
      var v = parseFloat(raw);
      var ok = 0;
      calcRows.forEach(function (tr) {
        var cell = tr.querySelector('.calc__fit');
        tr.classList.remove('is-fit', 'is-short');
        cell.textContent = '';
        if (!v) return;
        var fit = Number(tr.getAttribute('data-limit')) >= v;
        if (fit) ok++;
        tr.classList.add(fit ? 'is-fit' : 'is-short');
        cell.textContent = fit ? 'Mieści się w limicie' : 'Powyżej limitu';
      });
      calcOut.textContent = !v ? '' : ok
        ? 'Twoja kwota mieści się w limicie ' + ok + (ok === 1 ? ' programu.' : ' programów.') + ' Pamiętaj, że urząd może mieć niższy limit niż ustawowy.'
        : 'Ta kwota przekracza limity programów na start. Można łączyć różne źródła, na przykład dotację i pożyczkę, jeśli pozwalają na to ich zasady.';
    };
    calcInput.addEventListener('input', update);
    calc.addEventListener('submit', function (e) { e.preventDefault(); update(); });
  }

  // Ocena szans: proste reguły na podstawie ogólnych warunków programów
  var quiz = document.getElementById('ocena');
  if (quiz) {
    var kwoty = JSON.parse(quiz.getAttribute('data-kwoty'));
    var quizErr = document.getElementById('ocena-error');
    var wynik = document.getElementById('ocena-wynik');
    var lista = document.getElementById('ocena-lista');
    var suma = document.getElementById('ocena-suma');
    var cta = document.getElementById('ocena-cta');
    var cena = document.getElementById('ocena-cena');
    var val = function (n) { var r = quiz.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    quiz.addEventListener('submit', function (e) {
      e.preventDefault();
      var names = ['status', 'firma', 'orzeczenie', 'opiekun', 'srodki', 'miejsce'];
      var missing = names.filter(function (n) { return !val(n); });
      if (missing.length) {
        var n = missing.length;
        quizErr.textContent = 'Odpowiedz jeszcze na ' + n + (n === 1 ? ' pytanie' : n < 5 ? ' pytania' : ' pytań') + ', żeby zobaczyć wynik.';
        quizErr.hidden = false;
        var first = quiz.querySelector('#q-' + missing[0] + ' input');
        if (first) first.focus();
        return;
      }
      quizErr.hidden = true;
      var s = val('status'), firma = val('firma') === 'tak', orz = val('orzeczenie') === 'tak', opiekun = val('opiekun') === 'tak', srodki = val('srodki'), miejsce = val('miejsce');
      var bezrob = s === 'bezrobotny', poszuk = s === 'poszukujacy', niepracuje = s === 'niepracuje', nisko = s === 'pracuje-nisko', pracuje = s === 'pracuje' || nisko;
      var out = [];
      // Dotacja z urzędu pracy (art. 147 i 148 ustawy o rynku pracy)
      if (firma) out.push({ o: 'nie', p: 'Dotacja z urzędu pracy', t: 'Warunkiem jest brak firmy, także zawieszonej, w ostatnich 12 miesiącach.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      else if (srodki === 'tak') out.push({ o: 'nie', p: 'Dotacja z urzędu pracy', t: 'Dotacji nie dostanie osoba, która wcześniej otrzymała bezzwrotne środki publiczne na założenie firmy.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      else if (bezrob) out.push({ o: 'tak', p: 'Dotacja z urzędu pracy', t: 'Status osoby bezrobotnej to podstawowy warunek. Limit ustawowy to do ' + kwoty.pup + ', a urząd ustala własny, w 2026 roku zwykle od 30 do 40 tys. zł.', l: '/dotacja-z-urzedu-pracy/', u: 'pup', n: kwoty.n_pup, g: kwoty.n_pup });
      else if (opiekun && !pracuje) out.push({ o: 'moze', p: 'Dotacja z urzędu pracy', t: 'Opiekun osoby z niepełnosprawnością, który nie pracuje i jest zarejestrowany jako poszukujący pracy, też może dostać dotację.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      else if (poszuk || niepracuje) out.push({ o: 'moze', p: 'Dotacja z urzędu pracy', t: 'Wystarczy zarejestrować się w urzędzie pracy jako osoba bezrobotna. Wtedy ta ścieżka się otwiera.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      else if (pracuje) out.push({ o: 'nie', p: 'Dotacja z urzędu pracy', t: 'Każda umowa o pracę i każde zlecenie, nawet na część etatu, wyklucza status osoby bezrobotnej. Jest za to pożyczka Wsparcie w starcie.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      else out.push({ o: 'moze', p: 'Dotacja z urzędu pracy', t: 'Najczęściej trzeba mieć status osoby bezrobotnej w urzędzie pracy. Sprawdzimy Twoją sytuację.', l: '/dotacja-z-urzedu-pracy/', u: 'pup' });
      // PFRON (art. 12a ustawy o rehabilitacji)
      if (orz) {
        if (srodki === 'tak') out.push({ o: 'nie', p: 'Środki PFRON na działalność', t: 'Środków PFRON nie można dostać, jeśli wcześniej otrzymano bezzwrotne środki publiczne na ten cel.', l: '/finansowanie-na-start/#program-pfron', u: 'pfron' });
        else if (pracuje) out.push({ o: 'nie', p: 'Środki PFRON na działalność', t: 'Środki PFRON na start wymagają, żeby nie pozostawać w zatrudnieniu. Po odejściu z pracy i rejestracji w urzędzie ta ścieżka się otwiera.', l: '/finansowanie-na-start/#program-pfron', u: 'pfron' });
        else if ((bezrob || poszuk) && !firma) out.push({ o: srodki === 'niewiem' ? 'moze' : 'tak', p: 'Środki PFRON na działalność', t: 'Dla osób z orzeczeniem, zarejestrowanych w urzędzie pracy. Do ' + kwoty.pfron + ' albo do ' + kwoty.pfron24 + ' przy zobowiązaniu na 24 miesiące.' + (srodki === 'niewiem' ? ' Sprawdzimy, czy nie przyznano Ci wcześniej podobnych środków.' : ''), l: '/finansowanie-na-start/#program-pfron', u: 'pfron', n: srodki === 'niewiem' ? 0 : kwoty.n_pfron24, g: srodki === 'niewiem' ? 0 : kwoty.n_pfron24 });
        else out.push({ o: 'moze', p: 'Środki PFRON na działalność', t: 'Potrzebna jest rejestracja w urzędzie pracy jako osoba bezrobotna albo poszukująca pracy, która nie pracuje.', l: '/finansowanie-na-start/#program-pfron', u: 'pfron' });
      }
      // Wsparcie w starcie (art. 172 i 187 ustawy o rynku pracy)
      var umorzenie = ' Po roku prowadzenia firmy można umorzyć do ' + kwoty.umorzenie + ', ale nie więcej niż połowę pożyczki.';
      if (firma) out.push({ o: 'nie', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Pożyczkę dostaje osoba, która przez ostatnie 12 miesięcy nie prowadziła firmy, także zawieszonej.', l: '/wsparcie-w-starcie/', u: 'wws' });
      else if (bezrob) out.push({ o: 'tak', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Do ' + kwoty.wws + ', oprocentowanie 0,25% rocznie, spłata do 7 lat i rok przerwy w spłacie kapitału.' + (srodki === 'tak' ? '' : umorzenie + ' Umorzenie wyklucza późniejszą dotację z urzędu pracy, więc trzeba wybrać jedną z tych dróg.'), l: '/wsparcie-w-starcie/', u: 'wws', n: kwoty.n_wws, g: srodki === 'tak' ? 0 : Math.floor(kwoty.n_pup) });
      else if (poszuk || niepracuje || s === 'student' || opiekun && !pracuje) out.push({ o: 'tak', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Pożyczka dla osób, które nie pracują. Do ' + kwoty.wws + ', oprocentowanie 0,25% rocznie, spłata do 7 lat i rok przerwy w spłacie kapitału.' + (srodki === 'tak' ? '' : ' Umorzenie części pożyczki jest możliwe po rejestracji w urzędzie pracy jako osoba bezrobotna przed złożeniem wniosku.'), l: '/wsparcie-w-starcie/', u: 'wws', n: kwoty.n_wws });
      else if (nisko) out.push({ o: 'tak', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Pożyczka jest też dla osób pracujących, których średni miesięczny przychód z ostatnich 3 miesięcy nie przekracza przeciętnego wynagrodzenia. Do ' + kwoty.wws + ', 0,25% rocznie, spłata do 7 lat, bez rezygnacji z pracy. W tym wariancie nie ma umorzenia.', l: '/wsparcie-w-starcie/', u: 'wws', n: kwoty.n_wws });
      else if (s === 'pracuje') out.push({ o: 'nie', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Przy przychodzie wyższym od przeciętnego wynagrodzenia pracujący nie dostaną tej pożyczki. Zostają pożyczki dla firm i premia z LGD.', l: '/wsparcie-w-starcie/', u: 'wws' });
      else out.push({ o: 'moze', p: 'Pożyczka BGK Wsparcie w starcie', t: 'Program obejmuje kilka grup osób. Sprawdzimy, czy należysz do jednej z nich.', l: '/wsparcie-w-starcie/', u: 'wws' });
      // LGD
      if (miejsce === 'miasto') out.push({ o: 'nie', p: 'Premia z Lokalnej Grupy Działania', t: 'LGD działają głównie na obszarach wiejskich i w mniejszych miejscowościach.', l: '/finansowanie-na-start/#program-lgd', u: 'lgd' });
      else if (firma) out.push({ o: 'nie', p: 'Premia z Lokalnej Grupy Działania', t: 'Premię na start dostaje osoba, która w ostatnim roku nie prowadziła firmy.', l: '/finansowanie-na-start/#program-lgd', u: 'lgd' });
      else out.push({ o: 'moze', p: 'Premia z Lokalnej Grupy Działania', t: 'Bezzwrotna premia, dostępna również dla osób pracujących. Sprawdzimy, czy Twoja gmina należy do LGD i kiedy jest najbliższy nabór. Kwotę określa ogłoszenie.', l: '/finansowanie-na-start/#program-lgd', u: 'lgd' });
      var maks = out.reduce(function (m, r) { return r.o === 'tak' && r.n > m ? r.n : m; }, 0);
      var bezzwrotnie = out.reduce(function (m, r) { return r.o === 'tak' && r.g > m ? r.g : m; }, 0);
      var zl = function (n) { return n.toLocaleString('pl-PL') + ' zł'; };
      suma.textContent = !maks ? 'Na dziś żaden program nie pasuje wprost, ale poniżej piszemy, co zmienić, żeby się zakwalifikować.'
        : bezzwrotnie && bezzwrotnie < maks ? 'Możesz ubiegać się nawet o ' + zl(maks) + ', z czego do ' + zl(bezzwrotnie) + ' bez zwrotu. Szczegóły poniżej.'
        : 'Możesz ubiegać się nawet o ' + zl(maks) + (bezzwrotnie ? ' bez zwrotu' : '') + '. Szczegóły poniżej.';
      var label = { tak: 'Pasuje wstępnie', moze: 'Do sprawdzenia', nie: 'Raczej nie teraz' };
      var order = { tak: 0, moze: 1, nie: 2 };
      out.sort(function (a, b) { return order[a.o] - order[b.o]; });
      lista.innerHTML = out.map(function (r) {
        return '<li class="quiz__item quiz__item--' + r.o + '"><span class="tag">' + label[r.o] + '</span><h3><a href="' + r.l + '">' + esc(r.p) + '</a></h3><p>' + esc(r.t) + '</p></li>';
      }).join('');
      var best = out[0];
      // Pewny wynik przy usłudze na start prowadzi od razu do zamówienia
      var start = best.o === 'tak' && /^(pup|pfron|wws|lgd)$/.test(best.u);
      cta.href = start ? '/platnosc/' : best.o === 'nie' ? '/kontakt/' : '/kontakt/?usluga=' + best.u;
      cta.textContent = start ? 'Zamawiam wniosek, 850 zł na start' : 'Poproś o bezpłatną ocenę';
      if (cena) cena.hidden = !start;
      wynik.hidden = false;
      wynik.focus();
      wynik.scrollIntoView({ block: 'start' });
    });
  }

  var form = document.getElementById('formularz');
  if (!form) return;

  // Usługa wybrana na stronie programu lub cennika
  try {
    var wanted = new URLSearchParams(window.location.search).get('usluga');
    var sel = form.elements.usluga;
    if (wanted && sel && sel.querySelector('option[value="' + wanted.replace(/[^\w-]/g, '') + '"]')) sel.value = wanted;
  } catch (e) { /* stare przeglądarki */ }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var groups = form.querySelectorAll('.form-group--type');
  var errorBox = document.getElementById('form-errors');
  var statusBox = document.getElementById('form-status');
  var success = document.getElementById('form-success');
  var submitBtn = form.querySelector('[type="submit"]');
  var submitLabel = submitBtn.textContent;

  // Szkic formularza zostaje tylko w tej przeglądarce i znika po wysłaniu
  var DRAFT_KEY = 'kapitalownia-szkic-' + window.location.pathname;
  var SKIP = { www: 1, t: 1, zgoda: 1, zamowienie: 1 };
  function saveDraft() {
    try {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || SKIP[el.name] || el.type === 'submit') return;
        if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) (data[el.name] = data[el.name] || []).push(el.value); }
        else if (el.value) data[el.name] = el.value;
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) { /* brak dostępu do pamięci przeglądarki */ }
  }
  function restoreDraft() {
    try {
      var data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!data) return;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !(el.name in data)) return;
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = data[el.name].indexOf(el.value) >= 0;
        else if (!el.value) el.value = data[el.name];
      });
    } catch (e) { /* uszkodzony lub niedostępny szkic */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* bez znaczenia */ } }
  form.elements.t.value = String(Date.now());

  function currentType() {
    var r = form.querySelector('input[name="rodzaj"]:checked');
    return r ? r.value : '';
  }

  // Pokazuje tylko sekcję dla wybranego rodzaju klienta. Ukryte pola są
  // wyłączane, więc nie są walidowane ani wysyłane.
  function syncGroups() {
    var type = currentType();
    groups.forEach(function (g) {
      var active = g.getAttribute('data-type') === type;
      g.hidden = !active;
      g.disabled = !active;
      g.classList.toggle('is-active', active);
    });
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'rodzaj') { syncGroups(); clearError(e.target); }
    saveDraft();
  });
  form.addEventListener('input', saveDraft);
  restoreDraft();
  syncGroups();

  function errorEl(input) {
    var id = input.name === 'rodzaj' ? 'f-rodzaj' : input.id;
    return document.getElementById(id + '-error');
  }
  function setError(input, msg) {
    var el = errorEl(input);
    if (input.type !== 'radio') {
      input.setAttribute('aria-invalid', 'true');
      var described = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (described.indexOf(el.id) < 0) described.push(el.id);
      input.setAttribute('aria-describedby', described.join(' '));
    }
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError(input) {
    var el = errorEl(input);
    if (!el) return;
    input.removeAttribute('aria-invalid');
    el.hidden = true;
    el.textContent = '';
  }

  function labelOf(input) {
    if (input.name === 'rodzaj') return 'Kim jesteś';
    if (input.name === 'zgoda') return 'Zgoda';
    if (input.name === 'usluga') return 'Usługa';
    var l = form.querySelector('label[for="' + input.id + '"]');
    return l ? l.firstChild.textContent.trim() : input.name;
  }

  function validateField(input) {
    if (input.disabled) return '';
    var v = (input.value || '').trim();
    var required = input.required || input.hasAttribute('data-required');
    if (input.type === 'radio') {
      return currentType() ? '' : 'Wybierz, kim jesteś, żeby dopasować pytania.';
    }
    if (input.type === 'checkbox') {
      return required && !input.checked ? 'Zaznacz to pole, żebyśmy mogli odpowiedzieć na zgłoszenie.' : '';
    }
    if (required && !v) return input.tagName === 'SELECT' ? 'Wybierz jedną z opcji.' : 'To pole jest wymagane.';
    if (input.type === 'email' && v && !EMAIL_RE.test(v)) return 'Sprawdź adres, np. nazwa@domena.pl.';
    var min = input.getAttribute('minlength');
    if (min && v && v.length < Number(min)) return 'Napisz trochę więcej, co najmniej ' + min + ' znaków.';
    return '';
  }

  function fieldsToCheck() {
    var list = [form.querySelector('input[name="rodzaj"]')];
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.name === 'rodzaj' || el.type === 'hidden' || el.name === 'www') return;
      if (el.closest('fieldset[disabled]')) return;
      list.push(el);
    });
    return list;
  }

  function validateAll() {
    var problems = [];
    fieldsToCheck().forEach(function (input) {
      var msg = validateField(input);
      if (msg) { setError(input, msg); problems.push({ input: input, msg: msg }); }
      else clearError(input);
    });
    return problems;
  }

  form.addEventListener('blur', function (e) {
    var t = e.target;
    if (!t.name || t.type === 'radio' || t.type === 'hidden') return;
    if (t.getAttribute('aria-invalid') === 'true') {
      var msg = validateField(t);
      if (msg) setError(t, msg); else clearError(t);
    }
  }, true);
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' && !validateField(e.target)) clearError(e.target);
  });

  function showErrors(problems) {
    errorBox.innerHTML = '<p><strong>Popraw ' + (problems.length === 1 ? 'jedno pole' : 'zaznaczone pola') + ', żeby wysłać zgłoszenie.</strong></p><ul>' +
      problems.map(function (p) {
        var target = p.input.type === 'radio' ? p.input.id || '' : p.input.id;
        return '<li><a href="#' + (target || 'formularz') + '" data-focus="' + p.input.name + '">' + labelOf(p.input) + '</a></li>';
      }).join('') + '</ul>';
    errorBox.hidden = false;
    errorBox.focus();
  }
  errorBox.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-focus]');
    if (!a) return;
    e.preventDefault();
    var el = form.querySelector('[name="' + a.getAttribute('data-focus') + '"]');
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  });

  function setStatus(html, kind) {
    statusBox.className = 'form-status form-status--' + kind;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusBox.hidden = true;
    var problems = validateAll();
    if (problems.length) { showErrors(problems); return; }
    errorBox.hidden = true;

    if (form.getAttribute('data-mode') === 'preview') {
      setStatus('<p><strong>Wersja robocza.</strong> Formularz przeszedł walidację, ale w podglądzie nie wysyła danych. Po wdrożeniu zgłoszenie trafi do Kapitałowni.</p>', 'info');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wysyłanie…';
    var body = new URLSearchParams(new FormData(form));
    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false }; }).then(function (data) { return { res: res, data: data }; });
    }).then(function (r) {
      if (r.res.ok && r.data && r.data.ok) {
        success.querySelector('[data-email]').textContent = form.elements.email.value.trim();
        clearDraft();
        form.hidden = true;
        success.hidden = false;
        success.focus();
        success.scrollIntoView({ block: 'start' });
        return;
      }
      if (r.data && r.data.errors) {
        var list = [];
        Object.keys(r.data.errors).forEach(function (name) {
          var el = form.querySelector('[name="' + name + '"]');
          if (el) { setError(el, r.data.errors[name]); list.push({ input: el, msg: r.data.errors[name] }); }
        });
        if (list.length) { showErrors(list); return; }
      }
      throw new Error((r.data && r.data.message) || 'Błąd serwera');
    }).catch(function () {
      setStatus('<p><strong>Nie udało się wysłać zgłoszenia.</strong> Twoje odpowiedzi zostały w formularzu. Spróbuj ponownie za chwilę albo napisz bezpośrednio na <a href="mailto:kontakt@kapitalownia.pl">kontakt@kapitalownia.pl</a>.</p>', 'error');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    });
  });
})();
