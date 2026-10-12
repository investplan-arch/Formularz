// Formularz wstępnej oceny. Pola wspólne mają atrybut required.
// Pola zależne od rodzaju klienta mają data-required, bo bez JavaScriptu
// widoczne są wszystkie sekcje, a serwer sprawdza tylko wybraną.

const WOJ = ['dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie', 'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie'];

export const TYPES = [
  ['start', 'Planuję założyć firmę', 'Szukam środków na rozpoczęcie działalności'],
  ['firma', 'Prowadzę firmę lub spółkę', 'Chcę sfinansować inwestycję lub rozwój'],
  ['rolnik', 'Prowadzę gospodarstwo rolne', 'Rozwój gospodarstwa lub działalność pozarolnicza'],
  ['ngo', 'Działam w fundacji lub stowarzyszeniu', 'Także organizacje w trakcie zakładania'],
  ['inne', 'Inna sytuacja', 'Opiszę ją w kilku zdaniach']
];

const opts = (list, placeholder = 'Wybierz') =>
  `<option value="">${placeholder}</option>` + list.map(v => `<option>${v}</option>`).join('');

function field({ name, label, type = 'text', required = false, conditional = false, hint = '', options, attrs = '' }) {
  const id = `f-${name}`;
  const req = required ? (conditional ? ' data-required' : ' required') : '';
  const mark = required ? '' : ' <span class="optional">(opcjonalnie)</span>';
  const hintId = hint ? ` aria-describedby="${id}-hint"` : '';
  let control;
  if (options) control = `<select id="${id}" name="${name}"${req}${hintId}${attrs}>${opts(options)}</select>`;
  else if (type === 'textarea') control = `<textarea id="${id}" name="${name}" rows="5"${req}${hintId}${attrs}></textarea>`;
  else control = `<input id="${id}" name="${name}" type="${type}"${req}${hintId}${attrs}>`;
  return `<div class="field">
    <label for="${id}">${label}${mark}</label>
    ${hint ? `<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    ${control}
    <p class="field__error" id="${id}-error" hidden></p>
  </div>`;
}

function group(type, legend, inner) {
  return `<fieldset class="form-group form-group--type" data-type="${type}">
    <legend>${legend}</legend>
    ${inner}
  </fieldset>`;
}

export function formHtml({ mode, uslugi = [], order = false }) {
  const c = { required: true, conditional: true };
  const types = TYPES.map(([v, label, desc], i) => `<label class="choice">
      <input type="radio" name="rodzaj" value="${v}"${i === 0 ? ' id="f-rodzaj"' : ''} required>
      <span class="choice__body"><span class="choice__label">${label}</span><span class="choice__desc">${desc}</span></span>
    </label>`).join('');

  return `<form class="lead-form" id="formularz" action="/api/formularz.php" method="post" accept-charset="UTF-8" data-mode="${mode}" novalidate>
  <div class="form-errors" id="form-errors" tabindex="-1" hidden></div>

  <fieldset class="form-group">
    <legend><span class="step-no" aria-hidden="true"></span> Kim jesteś?</legend>
    <div class="choices">${types}</div>
    <p class="field__error" id="f-rodzaj-error" hidden></p>
  </fieldset>

  ${group('start', '<span class="step-no" aria-hidden="true"></span> Planowana działalność', `
    ${field({ name: 'start_branza', label: 'Czym chcesz się zajmować?', ...c, hint: 'Na przykład usługi remontowe, sklep internetowy, gabinet kosmetyczny.', attrs: ' maxlength="200" autocomplete="off"' })}
    ${field({ name: 'start_status', label: 'Twoja obecna sytuacja zawodowa', ...c, hint: 'Od tego zależy, z których programów możesz skorzystać.', options: ['Jestem zarejestrowany(-a) w urzędzie pracy jako osoba bezrobotna', 'Jestem zarejestrowany(-a) w urzędzie pracy jako poszukujący(-a) pracy', 'Pracuję na etacie lub umowie', 'Uczę się lub studiuję', 'Inna sytuacja'] })}
    <fieldset class="field field--checks">
      <legend>Które źródła Cię interesują? <span class="optional">(opcjonalnie)</span></legend>
      ${['Urząd pracy', 'Lokalna Grupa Działania', 'PFRON', 'Pożyczka na start', 'Nie wiem, proszę o propozycję'].map(v => `<label class="check"><input type="checkbox" name="start_zrodla[]" value="${v}"> ${v}</label>`).join('')}
    </fieldset>`)}

  ${group('firma', '<span class="step-no" aria-hidden="true"></span> Twoja firma', `
    <div class="field-row">
      ${field({ name: 'firma_forma', label: 'Forma prawna', ...c, options: ['Jednoosobowa działalność gospodarcza', 'Spółka cywilna', 'Spółka z o.o.', 'Inna spółka', 'Inna forma'] })}
      ${field({ name: 'firma_staz', label: 'Jak długo działa firma?', ...c, options: ['Krócej niż 12 miesięcy', 'Od 1 do 3 lat', 'Ponad 3 lata'] })}
    </div>
    ${field({ name: 'firma_branza', label: 'Branża i główna działalność', ...c, attrs: ' maxlength="200" autocomplete="off"' })}
    ${field({ name: 'firma_cel', label: 'Na co szukasz finansowania?', ...c, options: ['Maszyny, urządzenia, wyposażenie', 'Lokal, budynek, nieruchomość', 'Nowe produkty lub usługi', 'Cyfryzacja i oprogramowanie', 'Energia i ochrona środowiska', 'Zatrudnienie i szkolenia', 'Kapitał obrotowy', 'Inny cel'] })}`)}

  ${group('rolnik', '<span class="step-no" aria-hidden="true"></span> Gospodarstwo', `
    ${field({ name: 'rolnik_cel', label: 'Czego dotyczy plan?', ...c, options: ['Rozwój lub modernizacja gospodarstwa', 'Uruchomienie działalności pozarolniczej', 'Przetwórstwo lub sprzedaż własnych produktów', 'Inny cel'] })}
    ${field({ name: 'rolnik_profil', label: 'Profil gospodarstwa', hint: 'Na przykład uprawy, sadownictwo, hodowla.', attrs: ' maxlength="200" autocomplete="off"' })}`)}

  ${group('ngo', '<span class="step-no" aria-hidden="true"></span> Organizacja', `
    <div class="field-row">
      ${field({ name: 'ngo_forma', label: 'Forma organizacji', ...c, options: ['Fundacja', 'Stowarzyszenie', 'Stowarzyszenie zwykłe', 'Koło gospodyń wiejskich', 'Organizacja w trakcie zakładania', 'Inna'] })}
      ${field({ name: 'ngo_staz', label: 'Od kiedy działa?', ...c, options: ['Jeszcze nie jest zarejestrowana', 'Krócej niż 2 lata', 'Ponad 2 lata'] })}
    </div>
    ${field({ name: 'ngo_obszar', label: 'Obszar działań', ...c, hint: 'Na przykład edukacja, kultura, sport, pomoc społeczna, ekologia.', attrs: ' maxlength="200" autocomplete="off"' })}
    ${field({ name: 'ngo_zasieg', label: 'Zasięg projektu', options: ['Lokalny', 'Regionalny', 'Ogólnopolski'] })}`)}

  ${group('inne', '<span class="step-no" aria-hidden="true"></span> Twoja sytuacja', `
    ${field({ name: 'inne_kto', label: 'Kogo dotyczy zgłoszenie?', ...c, hint: 'Na przykład spółdzielnia, wspólnota, osoba prowadząca działalność nierejestrowaną.', attrs: ' maxlength="200" autocomplete="off"' })}`)}

  <fieldset class="form-group">
    <legend><span class="step-no" aria-hidden="true"></span> Cel i budżet</legend>
    <div class="field">
      <label for="f-usluga">${order ? 'Zamówiona usługa' : 'Która usługa Cię interesuje?'}${order ? '' : ' <span class="optional">(opcjonalnie)</span>'}</label>
      <select id="f-usluga" name="usluga"${order ? ' required' : ''}><option value="">${order ? 'Wybierz' : 'Jeszcze nie wiem'}</option>${uslugi.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select>
      <p class="field__error" id="f-usluga-error" hidden></p>
    </div>
    <div class="field-row">
      ${field({ name: 'wojewodztwo', label: 'Województwo', required: true, options: WOJ })}
      ${field({ name: 'miejscowosc', label: 'Miejscowość lub powiat', hint: 'Pomaga sprawdzić nabory urzędu pracy i LGD.', attrs: ' maxlength="100" autocomplete="address-level2"' })}
    </div>
    <div class="field-row">
      ${field({ name: 'budzet', label: 'Orientacyjny budżet', required: true, options: ['Do 50 tys. zł', '50–150 tys. zł', '150–500 tys. zł', 'Powyżej 500 tys. zł', 'Nie wiem jeszcze'] })}
      ${field({ name: 'termin', label: 'Kiedy chcesz zacząć?', options: ['Jak najszybciej', 'W ciągu 3 miesięcy', 'W ciągu 6 miesięcy', 'Później lub nie wiem'] })}
    </div>
    ${field({ name: 'opis', label: 'Opisz krótko cel finansowania', type: 'textarea', required: true, hint: 'Co chcesz zrobić i na co przeznaczyć środki. Wystarczy kilka zdań, co najmniej 20 znaków. Nie podawaj danych o zdrowiu.', attrs: ' minlength="20" maxlength="3000"' })}
  </fieldset>

  <fieldset class="form-group">
    <legend><span class="step-no" aria-hidden="true"></span> Kontakt</legend>
    <div class="field-row">
      ${field({ name: 'imie', label: 'Jak mamy się do Ciebie zwracać?', attrs: ' maxlength="80" autocomplete="given-name"' })}
      ${field({ name: 'email', label: 'Adres e-mail', type: 'email', required: true, hint: 'Na ten adres wyślemy odpowiedź.', attrs: ' maxlength="160" autocomplete="email" inputmode="email" spellcheck="false" autocapitalize="off"' })}
    </div>
    <div class="field field--consent">
      <label class="check"><input type="checkbox" name="zgoda" value="tak" id="f-zgoda" required> Zapoznałem(-am) się z <a href="/polityka-prywatnosci/">polityką prywatności</a> i chcę otrzymać odpowiedź na zgłoszenie.</label>
      <p class="field__error" id="f-zgoda-error" hidden></p>
    </div>
    ${order ? `<div class="field field--consent">
      <label class="check"><input type="checkbox" name="start_teraz" value="tak" id="f-start_teraz"> Proszę o rozpoczęcie usługi przed upływem 14 dni na odstąpienie od umowy. Wiem, że po pełnym wykonaniu usługi utracę prawo odstąpienia. <span class="optional">(opcjonalnie)</span></label>
    </div>` : ''}
    <div class="hp" aria-hidden="true"><label for="f-www">Nie wypełniaj tego pola</label><input id="f-www" name="www" type="text" tabindex="-1" autocomplete="off"></div>
    <input type="hidden" name="t" value="">
    ${order ? '<input type="hidden" name="zamowienie" value="tak">' : ''}
  </fieldset>

  <div class="form-submit">
    <button class="btn btn--primary btn--large" type="submit">${order ? 'Wyślij ankietę' : 'Wyślij zgłoszenie'}</button>
    <p class="small">Odpowiadamy e-mailem. Telefon nie jest wymagany.</p>
  </div>
  <div class="form-status" id="form-status" role="status" aria-live="polite" hidden></div>
</form>
<div class="form-success" id="form-success" tabindex="-1" hidden>
  <h2>Dziękujemy, zgłoszenie zostało wysłane</h2>
  <p>Odpowiemy na adres <strong data-email></strong>. Jeśli w ciągu kilku dni robocznych nie zobaczysz naszej wiadomości, sprawdź folder ze spamem albo napisz na kapitalownia@gmail.com.</p>
</div>`;
}
