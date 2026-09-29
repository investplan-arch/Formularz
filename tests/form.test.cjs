const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {readFileSync}=require('node:fs');
function setup(response={success:'true',message:'The form was submitted successfully.'}){
  const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'dangerously'});
  const w=dom.window,d=w.document,requests=[];
  w.scrollTo=()=>{};
  w.fetch=async(url,options)=>{requests.push({url,data:Object.fromEntries(options.body)});return {ok:true,json:async()=>response}};
  const value=(name,text)=>d.querySelector(`[name="${name}"]`).value=text;
  function fill(route){
    [...d.querySelectorAll('.route')].find(b=>b.dataset.value===route).click();w.next();
    for(const [name,text] of Object.entries({imie:'TEST',nazwisko:'Techniczny',telefon:'000000000',email:'kapitalownia@gmail.com',wojewodztwo:'warmińsko-mazurskie',powiat_miejscowosc:'TEST Olsztyn'}))value(name,text);
    w.next();
    if(route==='Fundacja / stowarzyszenie')value('ngo_etap','Pomysł / organizacja jeszcze niepowołana');
    for(const name of route==='Fundacja / stowarzyszenie'?['ngo_misja','ngo_projekt','ngo_odbiorcy','ngo_dzialania','ngo_budzet']:['status_sytuacja','opis_dzialalnosci','planowane_wydatki'])value(name,'TEST techniczny. Nie jest zgłoszeniem klienta.');
    w.next();d.querySelector('[name="zgoda_kontakt"]').checked=true;
  }
  const submit=async()=>{d.querySelector('.submit').click();await new Promise(r=>setImmediate(r));};
  return {w,d,requests,value,fill,submit,close:()=>w.close()};
}
for(const route of ['Nowa działalność','Istniejąca firma','Fundacja / stowarzyszenie','Inne'])test(`sends ${route} with unused branch empty`,async()=>{
  const t=setup();try{t.fill(route);await t.submit();assert.equal(t.requests.length,1,'valid form must reach sending service');assert.equal(t.requests[0].data.rodzaj_klienta,route);assert.equal(t.requests[0].data[route==='Fundacja / stowarzyszenie'?'status_sytuacja':'ngo_misja'],undefined);assert.ok(t.d.querySelector('[data-step="success"]').classList.contains('active'));}finally{t.close()}
});
test('provider rejection preserves data and never displays success',async()=>{
  const t=setup({success:'false',message:'Form not activated'});try{t.fill('Nowa działalność');await t.submit();assert.equal(t.requests.length,1);assert.equal(t.d.querySelector('[data-step="success"]').classList.contains('active'),false);assert.equal(t.d.querySelector('#submitErr').style.display,'block');assert.equal(t.d.querySelector('[name="imie"]').value,'TEST');}finally{t.close()}
});
test('invalid email stays on contact step',()=>{
  const t=setup();try{t.fill('Nowa działalność');t.w.back();t.w.back();t.value('email','bad-email');t.w.next();assert.equal(t.d.querySelector('.step.active').dataset.step,'1');}finally{t.close()}
});
test('switching NGO to business excludes old branch answers',async()=>{
  const t=setup();try{t.fill('Fundacja / stowarzyszenie');t.w.back();t.w.back();t.w.back();t.fill('Nowa działalność');await t.submit();assert.equal(t.requests.length,1);assert.equal(t.requests[0].data.ngo_misja,undefined);assert.ok(t.requests[0].data.status_sytuacja);}finally{t.close()}
});
