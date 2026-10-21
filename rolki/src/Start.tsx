import React from 'react';
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import slowa from '../scenariusze/start-slowa.json';

// Rolka „Nie zakładaj firmy, zanim nie zobaczysz tego”, lektor Piper bass, ujęcia z Pexels
const C = { navy: '#10192b', blue: '#2256ee', cream: '#faf7f2', muted: '#aab6cd', red: '#e5484d', green: '#2fbf71' };
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

type Slowo = { w: string; s: number; e: number };

// Sceny: start i koniec w sekundach, wyrównane do lektora
const SCENY = [
  { od: 0, do: 1.3, klip: '01.mp4', wejscie: 'cut' },
  { od: 1.3, do: 3.0, klip: '02.mp4', wejscie: 'slide' },
  { od: 3.0, do: 8.2, klip: '03.mp4', wejscie: 'zoom' },
  { od: 8.2, do: 11.8, klip: '04.mp4', wejscie: 'wipe' },
  { od: 11.8, do: 14.4, klip: '05.mp4', wejscie: 'slide' },
  { od: 14.4, do: 18.2, klip: '06.mp4', wejscie: 'glitch' },
  { od: 18.2, do: 20.4, klip: '07.mp4', wejscie: 'slide', pozycja: 'center top' },
  { od: 20.4, do: 24.3, klip: '08.mp4', wejscie: 'zoom' },
] as const;
export const START_DLUGOSC = s(25.8);

const fontCss = `
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist"; src: url(${staticFile('fonts/geist-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 100 900; unicode-range: U+0100-02AF; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Newsreader"; src: url(${staticFile('fonts/newsreader-latin-ext-wght-normal.woff2')}) format("woff2"); font-weight: 200 800; unicode-range: U+0100-02AF; }
`;

// Tło wideo: powolny zoom, granatowa warstwa w kolorach marki i wejście sceny
const Klip: React.FC<{ klip: string; dl: number; wejscie: string; pozycja?: string }> = ({ klip, dl, wejscie, pozycja }) => {
  const f = useCurrentFrame();
  const zoom = pozycja === 'center top' ? interpolate(f, [0, dl], [1.45, 1.55]) : interpolate(f, [0, dl], [1.04, 1.16]);
  const t = interpolate(f, [0, 9], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  let style: React.CSSProperties = {};
  if (wejscie === 'slide') style = { transform: `translateX(${(1 - t) * 1080}px)`, filter: `blur(${(1 - t) * 18}px)` };
  if (wejscie === 'zoom') style = { transform: `scale(${1.6 - 0.6 * t})`, opacity: t, filter: `blur(${(1 - t) * 14}px)` };
  if (wejscie === 'wipe') style = { clipPath: `inset(0 0 ${(1 - t) * 100}% 0)` };
  if (wejscie === 'glitch') {
    const g = f < 8 ? (f % 2 ? 22 : -22) : 0;
    style = { transform: `translateX(${g}px)`, filter: f < 8 ? 'hue-rotate(90deg) saturate(2)' : 'none' };
  }
  return (
    <AbsoluteFill style={style}>
      <OffthreadVideo src={staticFile(`broll/${klip}`)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pozycja ?? 'center', transformOrigin: pozycja === 'center top' ? 'center top' : 'center', transform: `scale(${zoom})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(16,25,43,0.55) 0%, rgba(16,25,43,0.35) 40%, rgba(16,25,43,0.82) 100%)' }} />
      <AbsoluteFill style={{ background: 'rgba(34,86,238,0.12)', mixBlendMode: 'color' }} />
    </AbsoluteFill>
  );
};

const pop = (f: number, start: number, fps: number) => spring({ frame: f - start, fps, config: { damping: 12, stiffness: 180 } });

// Hook: czerwona pieczątka STOP z lekkim wstrząsem kadru
const Stop: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, 22, fps);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 520 }}>
      <div style={{ opacity: f >= 22 ? 1 : 0, transform: `rotate(-12deg) scale(${3 - 2 * p})`, border: `14px solid ${C.red}`, color: C.red, borderRadius: 30, padding: '10px 60px', fontFamily: 'Geist', fontWeight: 900, fontSize: 200, letterSpacing: 10, background: 'rgba(16,25,43,0.35)' }}>STOP</div>
    </AbsoluteFill>
  );
};

const Etykieta: React.FC<{ tekst: string; start?: number }> = ({ tekst, start = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, start, fps);
  return <div style={{ alignSelf: 'center', background: C.blue, color: C.cream, borderRadius: 99, padding: '12px 32px', fontFamily: 'Geist', fontWeight: 700, fontSize: 42, letterSpacing: 1, transform: `scale(${p})`, marginBottom: 28 }}>{tekst}</div>;
};

// Licznik 0 → 150 000 zł zsynchronizowany ze słowem „150”
const Licznik: React.FC = () => {
  const f = useCurrentFrame();
  const v = interpolate(f, [s(2.4), s(3.6)], [0, 150000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const done = f >= s(3.6);
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 470, flexDirection: 'column' }}>
      <Etykieta tekst="PREMIA Z LGD" start={4} />
      <div style={{ fontFamily: 'Geist', fontWeight: 900, fontSize: 150, color: C.cream, letterSpacing: -4, textShadow: '0 10px 40px rgba(0,0,0,0.5)', transform: `scale(${done ? 1 + 0.08 * (1 - pop(f, s(3.6), fps)) : 1})` }}>
        {Math.round(v).toLocaleString('pl-PL').replace(/ /g, ' ')} zł
      </div>
      <div style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: 44, color: C.cream, marginTop: 14, background: 'rgba(16,25,43,0.78)', padding: '10px 28px', borderRadius: 20 }}>zwykle od 50 do 150 tys. zł</div>
    </AbsoluteFill>
  );
};

// Pierścień 12 miesięcy bez firmy
const Pierscien: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(f, [s(0.4), s(2.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mies = Math.max(0, Math.min(12, Math.round(p * 12)));
  const R = 170, L = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 430, flexDirection: 'column' }}>
      <div style={{ position: 'relative', width: 420, height: 420, transform: `scale(${pop(f, 0, fps)})` }}>
        <svg width={420} height={420} style={{ position: 'absolute' }}>
          <circle cx={210} cy={210} r={R} stroke="rgba(255,255,255,0.18)" strokeWidth={26} fill="rgba(16,25,43,0.88)" />
          <circle cx={210} cy={210} r={R} stroke={C.blue} strokeWidth={26} fill="none" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform="rotate(-90 210 210)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.cream, fontFamily: 'Geist' }}>
          <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1 }}>{mies}</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.cream }}>miesięcy bez firmy</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Karta: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, 4, fps);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 500 }}>
      <div style={{ transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * -6}deg)`, opacity: p, background: 'rgba(250,247,242,0.96)', borderRadius: 36, padding: '44px 56px', width: 820, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', fontFamily: 'Geist' }}>
        <div style={{ color: C.blue, fontWeight: 700, fontSize: 36, letterSpacing: 2 }}>URZĄD PRACY</div>
        <div style={{ color: C.navy, fontWeight: 800, fontSize: 70, lineHeight: 1.05, marginTop: 10 }}>Dotacja na start</div>
        <div style={{ color: '#465066', fontSize: 40, marginTop: 14 }}>do 6-krotności przeciętnego wynagrodzenia</div>
      </div>
    </AbsoluteFill>
  );
};

const Klodka: React.FC<{ etykieta: string; start: number }> = ({ etykieta, start }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wjazd = pop(f, start - 10, fps);
  const zamk = spring({ frame: f - start, fps, config: { damping: 9, stiffness: 220 } });
  const zamknieta = f >= start;
  const kolor = zamknieta ? C.red : C.cream;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${wjazd}) translateX(${zamknieta ? Math.sin((f - start) * 1.6) * Math.max(0, 8 - (f - start)) : 0}px)` }}>
      <svg width={220} height={260} viewBox="0 0 220 260">
        <path d="M60 120 V80 a50 50 0 0 1 100 0 V120" fill="none" stroke={kolor} strokeWidth={22} strokeLinecap="round" transform={`translate(0 ${-34 * (1 - zamk)})`} />
        <rect x={30} y={115} width={160} height={135} rx={28} fill={kolor} />
        <circle cx={110} cy={175} r={16} fill={C.navy} />
        <rect x={102} y={180} width={16} height={36} rx={8} fill={C.navy} />
      </svg>
      <div style={{ marginTop: 16, fontFamily: 'Geist', fontWeight: 700, fontSize: 44, color: C.cream, background: 'rgba(16,25,43,0.7)', padding: '8px 24px', borderRadius: 18 }}>{etykieta}</div>
    </div>
  );
};

const Klodki: React.FC = () => (
  <AbsoluteFill style={{ flexDirection: 'row', justifyContent: 'center', gap: 110, paddingTop: 470 }}>
    <Klodka etykieta="LGD" start={s(1.0)} />
    <Klodka etykieta="Urząd pracy" start={s(2.4)} />
  </AbsoluteFill>
);

const Lista: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punkty = ['Sprawdź nabory', 'Złóż wniosek', 'Dopiero potem firma'];
  return (
    <AbsoluteFill style={{ paddingTop: 440, paddingLeft: 150, flexDirection: 'column', gap: 34 }}>
      {punkty.map((t, i) => {
        const st = s(0.15 + i * 0.55);
        const p = pop(f, st, fps);
        const tick = pop(f, st + 6, fps);
        return (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: p, transform: `translateX(${(1 - p) * -80}px)` }}>
            <div style={{ width: 96, height: 96, borderRadius: 26, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tick})` }}>
              <svg width={56} height={56} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontFamily: 'Geist', fontWeight: 800, fontSize: 70, color: C.cream, textShadow: '0 6px 24px rgba(0,0,0,0.5)' }}>{t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, s(0.4), fps);
  const puls = 1 + 0.045 * Math.sin((f - s(1.2)) / 4) * (f > s(1.2) ? 1 : 0);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 420, flexDirection: 'column' }}>
      <div style={{ fontFamily: 'Newsreader', fontSize: 64, color: C.cream, opacity: pop(f, 0, fps) }}>Napisz w komentarzu</div>
      <div style={{ marginTop: 26, transform: `scale(${p * puls})`, background: C.blue, color: C.cream, fontFamily: 'Geist', fontWeight: 900, fontSize: 190, letterSpacing: 8, padding: '10px 70px 22px', borderRadius: 48, boxShadow: '0 30px 90px rgba(34,86,238,0.55)' }}>START</div>
      <svg width={120} height={120} viewBox="0 0 24 24" style={{ marginTop: 36, opacity: pop(f, s(1.0), fps), transform: `translateY(${Math.sin(f / 5) * 10}px)` }}>
        <path d="M12 4v14m0 0l-6-6m6 6l6-6" stroke={C.cream} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

// Napisy słowo po słowie, bieżące słowo na niebieskim tle
const Napisy: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const w = slowa as Slowo[];
  const strony: Slowo[][] = [];
  let cur: Slowo[] = [];
  w.forEach((x, i) => {
    cur.push(x);
    const koniecZdania = /[.,]$/.test(x.w);
    if (cur.length >= 3 || koniecZdania || i === w.length - 1) { strony.push(cur); cur = []; }
  });
  const strona = strony.find((p, i) => t >= p[0].s - 0.05 && t < (strony[i + 1]?.[0].s ?? p[p.length - 1].e + 0.5) - 0.05);
  if (!strona || t > 24.3) return null;
  const hook = t < 1.3;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: hook ? 980 : 1190 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 18px', padding: '0 80px', maxWidth: 1080 }}>
        {strona.map((x) => {
          const ostatnie = [...strona].reverse().find((y) => t >= y.s);
          const aktywne = ostatnie === x && t < x.e + 0.25;
          const widoczne = t >= x.s - 0.02;
          const wej = interpolate(t, [x.s - 0.02, x.s + 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <span key={x.s} style={{
              fontFamily: 'Geist', fontWeight: 900, fontSize: hook ? 128 : 88, lineHeight: 1.08, textTransform: hook ? 'uppercase' : 'none',
              color: C.cream, opacity: widoczne ? 1 : 0, transform: `scale(${0.7 + 0.3 * wej + (aktywne ? 0.06 : 0)})`,
              background: aktywne ? C.blue : 'transparent', borderRadius: 18, padding: '2px 16px',
              textShadow: aktywne ? 'none' : '0 6px 24px rgba(0,0,0,0.65)', whiteSpace: 'pre',
            }}>{x.w.replace(/[.,]$/, '')}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Koniec: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = (d: number) => spring({ frame: f - d * fps, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: C.navy, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Img src={staticFile('logo.png')} style={{ width: 300, height: 300, opacity: a(0), transform: `scale(${0.85 + 0.15 * a(0)})` }} />
      <div style={{ marginTop: 50, fontFamily: 'Geist', fontWeight: 800, fontSize: 60, letterSpacing: 3, color: C.cream, opacity: a(0.2) }}>KAPITAŁOWNIA</div>
      <div style={{ marginTop: 20, fontFamily: 'Geist', fontSize: 42, color: C.muted, opacity: a(0.4) }}>kapitalownia.pl</div>
    </AbsoluteFill>
  );
};

const NAKLADKI: Record<number, React.FC> = { 0: Stop, 2: Licznik, 3: Pierscien, 4: Karta, 5: Klodki, 6: Lista, 7: Cta };

export const Start: React.FC = () => {
  const f = useCurrentFrame();
  const shake = f >= 22 && f < 30 ? Math.sin(f * 3) * 14 : 0;
  return (
    <AbsoluteFill style={{ background: C.navy, transform: `translate(${shake}px, ${-shake / 2}px)` }}>
      <style>{fontCss}</style>
      {SCENY.map((sc, i) => {
        const Nakladka = NAKLADKI[i];
        const dl = s(sc.do - sc.od);
        return (
          <Sequence key={i} from={s(sc.od)} durationInFrames={dl}>
            <Klip klip={sc.klip} dl={dl} wejscie={sc.wejscie} pozycja={'pozycja' in sc ? sc.pozycja : undefined} />
            {Nakladka && <Nakladka />}
          </Sequence>
        );
      })}
      <Sequence from={s(24.3)}><Koniec /></Sequence>
      <Napisy />
      <div style={{ position: 'absolute', left: 80, top: 120, display: 'flex', alignItems: 'center', gap: 18, opacity: f < s(24.3) ? 1 : 0 }}>
        <Img src={staticFile('logo.png')} style={{ width: 76, height: 76 }} />
        <span style={{ color: C.cream, fontFamily: 'Geist', fontWeight: 700, fontSize: 30, letterSpacing: 2, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>KAPITAŁOWNIA</span>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 80, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.22)' }}>
        <div style={{ width: `${(f / START_DLUGOSC) * 100}%`, height: '100%', borderRadius: 4, background: C.blue }} />
      </div>
      <Audio src={staticFile('audio/start.wav')} />
    </AbsoluteFill>
  );
};
