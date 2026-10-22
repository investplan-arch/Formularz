import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

// Slajdy karuzel na Instagram (1080×1350) w kolorach strony kapitalownia.pl
const C = { navy: '#10192b', navy2: '#182642', blue: '#2256ee', cream: '#faf7f2', ink2: '#2f3437', muted: '#aab6cd', muted2: '#63625e', line: '#e4e1da' };

const fontCss = `
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; unicode-range: U+0100-02AF; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; unicode-range: U+0100-02AF; }
`;

export type Slajd =
  | { typ: 'okladka'; etykieta: string; tytul: string; akcent?: string; podtytul?: string }
  | { typ: 'punkt'; numer?: string; tytul: string; tekst: string; uwaga?: string }
  | { typ: 'lista'; tytul: string; pozycje: string[]; tekst?: string }
  | { typ: 'kafle'; tytul: string; kafle: { etykieta: string; wartosc: string; opis?: string }[]; stopka?: string }
  | { typ: 'koniec'; tytul: string; tekst: string; przycisk: string };

export type SlajdProps = { slajd: Slajd; nr: number; razem: number; zrodlo?: string };

const Logo: React.FC<{ jasne: boolean }> = ({ jasne }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Img src={staticFile('logo.png')} style={{ width: 60, height: 60 }} />
    <span style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: 26, letterSpacing: 2, color: jasne ? C.cream : C.navy }}>KAPITAŁOWNIA</span>
  </div>
);

// Tytuł z wyróżnionym fragmentem (akcent) w kolorze marki
const Tytul: React.FC<{ tekst: string; akcent?: string; kolor: string; rozmiar: number }> = ({ tekst, akcent, kolor, rozmiar }) => {
  const i = akcent ? tekst.indexOf(akcent) : -1;
  const s: React.CSSProperties = { fontFamily: 'Geist', fontWeight: 800, fontSize: rozmiar, lineHeight: 1.04, letterSpacing: -2.5, color: kolor, margin: 0, textWrap: 'balance' as never };
  if (i < 0) return <h1 style={s}>{tekst}</h1>;
  return (
    <h1 style={s}>
      {tekst.slice(0, i)}<span style={{ color: C.blue }}>{akcent}</span>{tekst.slice(i + akcent!.length)}
    </h1>
  );
};

const Stopka: React.FC<{ nr: number; razem: number; jasne: boolean; zrodlo?: string }> = ({ nr, razem, jasne, zrodlo }) => (
  <div style={{ position: 'absolute', left: 90, right: 90, bottom: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: 'Geist', fontSize: 24, color: jasne ? C.muted : C.muted2 }}>
    <span>{zrodlo ?? 'kapitalownia.pl'}</span>
    <span style={{ fontWeight: 600 }}>{nr} / {razem}</span>
  </div>
);

export const SlajdKaruzeli: React.FC<SlajdProps> = ({ slajd, nr, razem, zrodlo }) => {
  const ciemne = slajd.typ === 'okladka' || slajd.typ === 'koniec';
  const tlo = ciemne ? C.navy : C.cream;
  const tekst = ciemne ? C.cream : C.navy;
  const p: React.CSSProperties = { fontFamily: 'Geist', fontSize: 40, lineHeight: 1.38, color: ciemne ? C.muted : C.ink2, margin: 0 };

  return (
    <AbsoluteFill style={{ background: tlo }}>
      <style>{fontCss}</style>
      <div style={{ position: 'absolute', left: 90, top: 80 }}><Logo jasne={ciemne} /></div>
      <AbsoluteFill style={{ padding: '200px 90px 170px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {slajd.typ === 'okladka' && (
          <>
            <div style={{ alignSelf: 'flex-start', background: C.blue, color: C.cream, borderRadius: 99, padding: '12px 30px', fontFamily: 'Geist', fontWeight: 600, fontSize: 32, letterSpacing: 1, marginBottom: 50 }}>{slajd.etykieta}</div>
            <Tytul tekst={slajd.tytul} akcent={slajd.akcent} kolor={tekst} rozmiar={104} />
            {slajd.podtytul && <p style={{ ...p, fontFamily: 'Newsreader', fontSize: 48, color: C.muted, marginTop: 44, lineHeight: 1.3 }}>{slajd.podtytul}</p>}
            <div style={{ position: 'absolute', right: 90, bottom: 150, fontFamily: 'Geist', fontWeight: 600, fontSize: 30, color: C.cream, display: 'flex', alignItems: 'center', gap: 14 }}>
              Przesuń <span style={{ fontSize: 44, color: C.blue }}>→</span>
            </div>
          </>
        )}
        {slajd.typ === 'punkt' && (
          <>
            {slajd.numer && <div style={{ fontFamily: 'Newsreader', fontWeight: 500, fontSize: 150, color: C.blue, lineHeight: 0.9, marginBottom: 30 }}>{slajd.numer}</div>}
            <Tytul tekst={slajd.tytul} kolor={tekst} rozmiar={70} />
            <p style={{ ...p, marginTop: 40 }}>{slajd.tekst}</p>
            {slajd.uwaga && (
              <div style={{ marginTop: 44, borderLeft: `8px solid ${C.blue}`, padding: '8px 0 8px 30px', fontFamily: 'Geist', fontWeight: 600, fontSize: 36, lineHeight: 1.35, color: C.navy }}>{slajd.uwaga}</div>
            )}
          </>
        )}
        {slajd.typ === 'lista' && (
          <>
            <Tytul tekst={slajd.tytul} kolor={tekst} rozmiar={66} />
            <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {slajd.pozycje.map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 26, alignItems: 'baseline' }}>
                  <span style={{ flex: '0 0 56px', fontFamily: 'Geist', fontWeight: 700, fontSize: 34, color: C.blue }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ ...p, fontSize: 38, color: C.navy, fontWeight: 500 }}>{x}</span>
                </div>
              ))}
            </div>
            {slajd.tekst && <p style={{ ...p, fontSize: 32, marginTop: 40 }}>{slajd.tekst}</p>}
          </>
        )}
        {slajd.typ === 'kafle' && (
          <>
            <Tytul tekst={slajd.tytul} kolor={tekst} rozmiar={66} />
            <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {slajd.kafle.map((k, i) => (
                <div key={i} style={{ background: '#fff', border: `2px solid ${C.line}`, borderRadius: 24, padding: '24px 32px' }}>
                  <div style={{ fontFamily: 'Geist', fontSize: 26, fontWeight: 600, letterSpacing: 1, color: C.muted2, textTransform: 'uppercase' }}>{k.etykieta}</div>
                  <div style={{ fontFamily: 'Geist', fontSize: 46, fontWeight: 800, letterSpacing: -1, color: C.navy, marginTop: 4 }}>{k.wartosc}</div>
                  {k.opis && <div style={{ ...p, fontSize: 30, marginTop: 6 }}>{k.opis}</div>}
                </div>
              ))}
            </div>
            {slajd.stopka && <p style={{ ...p, fontSize: 28, marginTop: 26 }}>{slajd.stopka}</p>}
          </>
        )}
        {slajd.typ === 'koniec' && (
          <>
            <Tytul tekst={slajd.tytul} kolor={tekst} rozmiar={84} />
            <p style={{ ...p, fontFamily: 'Newsreader', fontSize: 46, marginTop: 40, lineHeight: 1.3 }}>{slajd.tekst}</p>
            <div style={{ alignSelf: 'flex-start', marginTop: 60, background: C.blue, color: C.cream, borderRadius: 99, padding: '26px 50px', fontFamily: 'Geist', fontWeight: 600, fontSize: 40 }}>{slajd.przycisk}</div>
          </>
        )}
      </AbsoluteFill>
      <Stopka nr={nr} razem={razem} jasne={ciemne} zrodlo={zrodlo} />
    </AbsoluteFill>
  );
};

// Zdjęcie profilowe i okładki wyróżnionych relacji (1080×1080, kadr w kole)
export type OkladkaProps = { tekst?: string };
export const OkladkaProfilu: React.FC<OkladkaProps> = ({ tekst }) => (
  <AbsoluteFill style={{ background: C.navy, alignItems: 'center', justifyContent: 'center' }}>
    <style>{fontCss}</style>
    {tekst ? (
      <div style={{ fontFamily: 'Geist', fontWeight: 800, fontSize: tekst.length > 6 ? 150 : 230, letterSpacing: -4, color: C.cream, textAlign: 'center', lineHeight: 1 }}>
        {tekst}
        <div style={{ width: 160, height: 14, background: C.blue, borderRadius: 7, margin: '40px auto 0' }} />
      </div>
    ) : (
      <Img src={staticFile('logo.png')} style={{ width: 760, height: 760 }} />
    )}
  </AbsoluteFill>
);
