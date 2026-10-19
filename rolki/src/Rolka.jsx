import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, delayRender, continueRender } from 'remotion';
// Fonty są w paczkach npm, więc render nie potrzebuje dostępu do Google Fonts
import '@fontsource-variable/oswald/wght.css';
import '@fontsource-variable/geist/wght.css';

export const FPS = 30;

const OSWALD = '"Oswald Variable", Oswald, sans-serif';
const GEIST = '"Geist Variable", Geist, sans-serif';

// Klatki są robione dopiero po wczytaniu fontów, inaczej pierwsze wyszłyby systemowym krojem
const useFonty = () => {
  const [uchwyt] = useState(() => delayRender('Wczytywanie fontów'));
  useEffect(() => {
    Promise.all(['700 100px "Oswald Variable"', '500 100px "Oswald Variable"', '400 100px "Geist Variable"', '700 100px "Geist Variable"'].map((f) => document.fonts.load(f, 'ąęłśćżźńó')))
      .then(() => continueRender(uchwyt))
      .catch(() => continueRender(uchwyt));
  }, [uchwyt]);
};

const C = { granat: '#10192b', niebieski: '#2256ee', krem: '#faf7f2', szary: '#5b6476' };

// Bezpieczne marginesy pod nakładki Instagrama i TikToka (nazwa konta, opis, przyciski)
const SAFE = { top: 260, bottom: 340, side: 90 };
const PRZEJSCIE = 8;

export const klatki = (s) => Math.round(s.sekundy * FPS);
export const czasRolki = (r) => r.sceny.reduce((sum, s) => sum + klatki(s), 0);

// Polska typografia, jednoliterowe spójniki i przyimki nie zostają na końcu linii,
// a jednostka nie odrywa się od liczby
const twardeSpacje = (t) =>
  t.replace(/(^|[\s ])([aiouwzAIOUWZ])\s+/g, '$1$2 ').replace(/(^|[\s ])([aiouwzAIOUWZ])\s+/g, '$1$2 ')
    .replace(/(\d)\s+(zł|tys\.|mln|lat|%)/g, '$1 $2').replace(/tys\.\s+zł/g, 'tys. zł');
const przygotuj = (v) => (typeof v === 'string' ? twardeSpacje(v) : Array.isArray(v) ? v.map(przygotuj) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, przygotuj(x)])) : v);

const kwotaPl =(n) => n.toLocaleString('pl-PL').replace(/\s/g, ' ') + ' zł';

// Wjazd od dołu z lekkim opóźnieniem, używany przez wszystkie teksty
const Wjazd = ({ opoznienie = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - opoznienie, fps, config: { damping: 200 } });
  return (
    <div style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px)`, ...style }}>{children}</div>
  );
};

// Krótkie wyciemnienie na początku i końcu każdej sceny
const Scena = ({ tlo, kolor, dlugosc, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, PRZEJSCIE, dlugosc - PRZEJSCIE, dlugosc], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: tlo, color: kolor }}>
      <AbsoluteFill style={{ opacity, padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Znak = ({ rozmiar = 72, tlo = C.niebieski, kolor = C.krem }) => (
  <div style={{ width: rozmiar, height: rozmiar, borderRadius: rozmiar * 0.24, background: tlo, color: kolor, fontFamily: OSWALD, fontWeight: 700, fontSize: rozmiar * 0.62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>K</div>
);

const Hak = ({ s, dlugosc }) => {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [6, 50], [0, s.kwota], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const kwota = Math.round(n / 1000) * 1000;
  return (
    <Scena tlo={C.granat} kolor={C.krem} dlugosc={dlugosc}>
      <Wjazd style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 72 }}>{s.nad}</Wjazd>
      <Wjazd opoznienie={4}>
        <div style={{ fontFamily: GEIST, fontSize: 56, opacity: 0.8 }}>{s.przedrostek}</div>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 190, lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>{kwotaPl(kwota)}</div>
        <div style={{ height: 14, width: interpolate(frame, [10, 50], [0, 520], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), background: C.niebieski, borderRadius: 7, marginTop: 18 }} />
      </Wjazd>
      <Wjazd opoznienie={12} style={{ fontFamily: GEIST, fontWeight: 700, fontSize: 76 }}>{s.pod}</Wjazd>
      <Wjazd opoznienie={20}>
        <span style={{ display: 'inline-block', background: C.niebieski, borderRadius: 999, padding: '14px 34px', fontFamily: GEIST, fontWeight: 600, fontSize: 46 }}>{s.dopisek}</span>
      </Wjazd>
    </Scena>
  );
};

const Lista = ({ s, dlugosc }) => (
  <Scena tlo={C.krem} kolor={C.granat} dlugosc={dlugosc}>
    <Wjazd style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 104, lineHeight: 1.05 }}>{s.tytul}</Wjazd>
    {s.punkty.map((p, i) => (
      <Wjazd key={p} opoznienie={10 + i * 12} style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ flex: '0 0 auto', width: 76, height: 76, borderRadius: 38, background: C.niebieski, color: C.krem, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: GEIST, fontWeight: 700, fontSize: 44 }}>✓</div>
        <div style={{ fontFamily: GEIST, fontWeight: 700, fontSize: 76, lineHeight: 1.1 }}>{p}</div>
      </Wjazd>
    ))}
  </Scena>
);

const Fakt = ({ s, dlugosc }) => (
  <Scena tlo={C.krem} kolor={C.granat} dlugosc={dlugosc}>
    <Wjazd style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 58, color: C.niebieski, textTransform: 'uppercase', letterSpacing: 2 }}>{s.tytul}</Wjazd>
    <Wjazd opoznienie={6} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 150, lineHeight: 1.02 }}>{s.duze}</Wjazd>
    <Wjazd opoznienie={14} style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 64, lineHeight: 1.2 }}>{s.pod}</Wjazd>
    {s.dopisek && <Wjazd opoznienie={24} style={{ fontFamily: GEIST, fontSize: 52, lineHeight: 1.25, color: C.szary }}>{s.dopisek}</Wjazd>}
  </Scena>
);

const Uwaga = ({ s, dlugosc }) => (
  <Scena tlo={C.granat} kolor={C.krem} dlugosc={dlugosc}>
    <Wjazd>
      <span style={{ display: 'inline-block', background: C.niebieski, borderRadius: 999, padding: '14px 38px', fontFamily: OSWALD, fontWeight: 700, fontSize: 56, textTransform: 'uppercase', letterSpacing: 3 }}>{s.etykieta}</span>
    </Wjazd>
    <Wjazd opoznienie={6} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 132, lineHeight: 1.04 }}>{s.tytul}</Wjazd>
    <Wjazd opoznienie={16} style={{ fontFamily: GEIST, fontSize: 58, lineHeight: 1.3, opacity: 0.88 }}>{s.tekst}</Wjazd>
  </Scena>
);

const Cta = ({ s, dlugosc }) => {
  const frame = useCurrentFrame();
  const puls = 1 + 0.03 * Math.sin(Math.max(0, frame - 20) / 6);
  return (
    <Scena tlo={C.niebieski} kolor={C.krem} dlugosc={dlugosc}>
      <Wjazd style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 116, lineHeight: 1.05 }}>{s.tytul}</Wjazd>
      <Wjazd opoznienie={10}>
        <div style={{ display: 'inline-block', transform: `scale(${puls})`, transformOrigin: 'left center', background: C.krem, color: C.granat, borderRadius: 28, padding: '34px 44px', fontFamily: GEIST, fontWeight: 700, fontSize: 60, lineHeight: 1.15 }}>{s.przycisk}</div>
      </Wjazd>
      <Wjazd opoznienie={18} style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 40 }}>
        <Znak rozmiar={96} tlo={C.granat} />
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 84 }}>{s.marka}</div>
      </Wjazd>
    </Scena>
  );
};

const SCENY = { hak: Hak, lista: Lista, fakt: Fakt, uwaga: Uwaga, cta: Cta };

// Cienki pasek postępu i znak marki, widoczne przez całą rolkę
const Nakladka = ({ calosc, ostatniaOd }) => {
  const frame = useCurrentFrame();
  if (frame >= ostatniaOd) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: SAFE.top - 110, left: SAFE.side, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Znak rozmiar={58} />
        <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 42, color: C.niebieski, letterSpacing: 1 }}>Kapitałownia</div>
      </div>
      <div style={{ position: 'absolute', left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom - 90, height: 10, borderRadius: 5, background: 'rgba(34,86,238,0.25)' }}>
        <div style={{ height: '100%', width: `${(frame / calosc) * 100}%`, borderRadius: 5, background: C.niebieski }} />
      </div>
    </AbsoluteFill>
  );
};

export const Rolka = ({ rolka: dane }) => {
  useFonty();
  const rolka = przygotuj(dane);
  let start = 0;
  const calosc = czasRolki(rolka);
  const sekwencje = rolka.sceny.map((s, i) => {
    const dlugosc = klatki(s);
    const Komponent = SCENY[s.typ];
    const el = (
      <Sequence key={i} from={start} durationInFrames={dlugosc}>
        <Komponent s={s} dlugosc={dlugosc} />
      </Sequence>
    );
    start += dlugosc;
    return el;
  });
  return (
    <AbsoluteFill style={{ background: C.granat }}>
      {sekwencje}
      <Nakladka calosc={calosc} ostatniaOd={calosc - klatki(rolka.sceny[rolka.sceny.length - 1])} />
    </AbsoluteFill>
  );
};
