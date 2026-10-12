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

  var form = document.getElementById('formularz');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var groups = form.querySelectorAll('.form-group--type');
  var errorBox = document.getElementById('form-errors');
  var statusBox = document.getElementById('form-status');
  var success = document.getElementById('form-success');
  var submitBtn = form.querySelector('[type="submit"]');
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
    });
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'rodzaj') { syncGroups(); clearError(e.target); }
  });
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
      setStatus('<p><strong>Wersja robocza.</strong> Formularz przeszedł walidację, ale w podglądzie nie wysyła danych. Po wdrożeniu zgłoszenie trafi na kapitalownia@gmail.com.</p>', 'info');
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
      setStatus('<p><strong>Nie udało się wysłać zgłoszenia.</strong> Twoje odpowiedzi zostały w formularzu. Spróbuj ponownie za chwilę albo napisz bezpośrednio na <a href="mailto:kapitalownia@gmail.com">kapitalownia@gmail.com</a>.</p>', 'error');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Wyślij zgłoszenie';
    });
  });
})();
