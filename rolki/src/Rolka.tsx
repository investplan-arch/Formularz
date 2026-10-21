import React from 'react';
import {
  AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

// Kolory marki ze strony kapitalownia.pl
const C = { navy: '#10192b', navy2: '#182642', blue: '#2256ee', cream: '#faf7f2', muted: '#aab6cd' };

type Element =
  | { typ: 'etykieta'; tekst: string }
  | { typ: 'tytul'; tekst: string; rozmiar?: number; podkreslenie?: boolean }
  | { typ: 'numer'; tekst: string }
  | { typ: 'naglowek'; tekst: string; rozmiar?: number }
  | { typ: 'tekst'; tekst: string; rozmiar?: number; kolor?: 'cream' | 'muted' | 'blue'; serif?: boolean }
  | { typ: 'haslo'; tekst: string };

export type Scena =
  | { czas: number; tempo?: 'wolne' | 'szybkie'; elementy: Element[] }
  | { czas: number; koniec: true; zdanie: string; przycisk: string };

export type RolkaProps = { sceny: Scena[] };

export const czasTrwania = (p: RolkaProps, fps: number) =>
  Math.round(p.sceny.reduce((s, sc) => s + sc.czas, 0) * fps);

const fontCss = `
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; unicode-range: U+0100-02AF; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; unicode-range: U+0100-02AF; }
`;

const Tlo: React.FC = () => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 40;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navy2} 40%, ${C.navy} 100%)` }}>
      <div style={{ position: 'absolute', left: -300 + drift, top: 1250, width: 1000, height: 1000, borderRadius: '50%', background: C.blue, opacity: 0.28, filter: 'blur(170px)' }} />
      <div style={{ position: 'absolute', left: 600 - drift, top: -250, width: 800, height: 800, borderRadius: '50%', background: C.blue, opacity: 0.18, filter: 'blur(170px)' }} />
    </AbsoluteFill>
  );
};

// Wejście elementu: wysunięcie z dołu i pojawienie się, wyjście: zniknięcie pod koniec sceny
const useWejscie = (opoznienie: number, czasSceny: number, szybkie: boolean) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - opoznienie * fps, fps, config: { damping: 200 }, durationInFrames: szybkie ? 8 : 16 });
  const wyjscie = szybkie ? 5 : 10;
  const koniec = interpolate(f, [czasSceny * fps - wyjscie, czasSceny * fps], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { opacity: p * koniec, transform: `translateY(${(1 - p) * 60}px)` };
};

const Elem: React.FC<{ e: Element; i: number; czas: number; szybkie: boolean }> = ({ e, i, czas, szybkie }) => {
  const styl = useWejscie(i * (szybkie ? 0.05 : 0.15), czas, szybkie);
  const base: React.CSSProperties = { ...styl, color: C.cream, fontFamily: 'Geist', margin: 0 };
  switch (e.typ) {
    case 'etykieta':
      return <div style={{ ...base, alignSelf: 'flex-start', background: C.blue, borderRadius: 99, padding: '10px 26px', fontSize: 40, fontWeight: 600, letterSpacing: 1, marginBottom: 50 }}>{e.tekst}</div>;
    case 'tytul':
      return (
        <div style={{ ...base, fontSize: e.rozmiar ?? 106, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }}>
          {e.tekst}
          {e.podkreslenie !== false && <div style={{ width: 160, height: 9, background: C.blue, borderRadius: 5, marginTop: 30 }} />}
        </div>
      );
    case 'numer':
      return <div style={{ ...base, fontFamily: 'Newsreader', fontSize: 170, color: C.blue, lineHeight: 1, marginBottom: 20 }}>{e.tekst}</div>;
    case 'naglowek':
      return <div style={{ ...base, fontSize: e.rozmiar ?? 86, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 40 }}>{e.tekst}</div>;
    case 'tekst':
      return (
        <div style={{ ...base, fontFamily: e.serif ? 'Newsreader' : 'Geist', fontWeight: e.serif ? 500 : 500, fontSize: e.rozmiar ?? 52, lineHeight: 1.3, color: C[e.kolor ?? 'muted'], marginBottom: 26 }}>
          {e.tekst}
        </div>
      );
    case 'haslo':
      return <div style={{ ...base, fontSize: 170, fontWeight: 800, color: C.blue, letterSpacing: 4, lineHeight: 1, margin: '10px 0 30px' }}>{e.tekst}</div>;
  }
};

const Naglowek: React.FC = () => (
  <div style={{ position: 'absolute', left: 110, top: 190, display: 'flex', alignItems: 'center', gap: 22 }}>
    <Img src={staticFile('logo.png')} style={{ width: 92, height: 92 }} />
    <span style={{ color: C.cream, fontFamily: 'Geist', fontWeight: 600, fontSize: 34, letterSpacing: 2 }}>KAPITAŁOWNIA</span>
  </div>
);

const ScenaTekst: React.FC<{ s: Extract<Scena, { elementy: Element[] }> }> = ({ s }) => (
  <AbsoluteFill>
    <Naglowek />
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 110px', display: 'flex', flexDirection: 'column' }}>
      {s.elementy.map((e, i) => <Elem key={i} e={e} i={i} czas={s.czas} szybkie={s.tempo === 'szybkie'} />)}
    </AbsoluteFill>
  </AbsoluteFill>
);

const ScenaKoniec: React.FC<{ s: Extract<Scena, { koniec: true }> }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = (d: number) => spring({ frame: f - d * fps, fps, config: { damping: 200 } });
  const center: React.CSSProperties = { textAlign: 'center', color: C.cream, fontFamily: 'Geist' };
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 400 }}>
      <Img src={staticFile('logo.png')} style={{ width: 330, height: 330, opacity: a(0), transform: `scale(${0.9 + 0.1 * a(0)})` }} />
      <div style={{ ...center, marginTop: 70, fontSize: 58, fontWeight: 800, letterSpacing: 3, opacity: a(0.3) }}>KAPITAŁOWNIA</div>
      <div style={{ ...center, marginTop: 40, fontFamily: 'Newsreader', fontWeight: 500, fontSize: 64, lineHeight: 1.25, padding: '0 110px', opacity: a(0.55) }}>{s.zdanie}</div>
      <div style={{ ...center, marginTop: 70, background: C.blue, borderRadius: 99, padding: '30px 60px', fontSize: 46, fontWeight: 600, opacity: a(0.9), transform: `scale(${0.92 + 0.08 * a(0.9)})` }}>{s.przycisk}</div>
      <div style={{ ...center, marginTop: 50, fontSize: 40, color: C.muted, opacity: a(1.1) }}>kapitalownia.pl</div>
    </AbsoluteFill>
  );
};

const Pasek: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 110, right: 110, top: 140, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.18)' }}>
      <div style={{ width: `${(f / durationInFrames) * 100}%`, height: '100%', borderRadius: 4, background: C.blue }} />
    </div>
  );
};

export const Rolka: React.FC<RolkaProps> = ({ sceny }) => {
  const { fps } = useVideoConfig();
  let start = 0;
  return (
    <AbsoluteFill>
      <style>{fontCss}</style>
      <Tlo />
      {sceny.map((s, i) => {
        const from = Math.round(start * fps);
        start += s.czas;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.round(s.czas * fps)}>
            {'koniec' in s ? <ScenaKoniec s={s} /> : <ScenaTekst s={s} />}
          </Sequence>
        );
      })}
      <Pasek />
    </AbsoluteFill>
  );
};
