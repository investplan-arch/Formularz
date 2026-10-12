// Otwiera stronę płatności Stripe (bez płacenia) i raportuje, co widzi klient.
const { chromium } = require('playwright-core');
const url = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ locale: 'pl-PL' });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(3000);
  const text = await p.evaluate(() => document.body.innerText);
  const links = await p.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href).filter(h => /kapitalownia\.pl/.test(h)));
  const checks = {
    kwota850: /850[,.]00\s*zł/.test(text),
    nazwaKapitalownia: /Kapitałownia/i.test(text),
    imieINazwiskoWidoczne: /Sobolewski/i.test(text),
    zgodaNaRegulamin: /(zgadzam|akceptuj|warunk|terms)/i.test(text) && links.some(l => /regulamin/.test(l)),
    linkiDoStrony: links,
  };
  console.log(JSON.stringify(checks, null, 2));
  console.log('--- tekst strony (początek) ---');
  console.log(text.replace(/[^\S\n]+/g, ' ').slice(0, 1500));
  await b.close();
})();
