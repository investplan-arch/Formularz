#!/usr/bin/env python3
"""Umowa SPLOT 2.0 dla organizacji (wysyłana tylko na prośbę klienta, właściciel 3.11.2026).

    WYKONAWCA="Imię Nazwisko" python3 narzedzia/umowa.py --krs 0001259532 --out ~/umowa.docx
    WYKONAWCA="Imię Nazwisko" python3 narzedzia/umowa.py --zamawiajacy "Fundacją X z siedzibą w ..., KRS ..." --out ...

Dane organizacji pobiera z KRS (API Ministerstwa Sprawiedliwości) po numerze KRS.
Imię i nazwisko właściciela podaje się w zmiennej WYKONAWCA, nie zapisuje w repozytorium.
Wynik to mały plik .docx (pandoc), który mieści się jako załącznik w Gmailu.
"""
import argparse, io, json, os, subprocess, sys, tempfile, urllib.request, zipfile
from pathlib import Path

SZABLON = Path(__file__).resolve().parent / "szablony" / "umowa_splot.md"


def z_krs(krs):
    url = f"https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/{krs.zfill(10)}?rejestr=S&format=json"
    try:
        d = json.load(urllib.request.urlopen(url, timeout=30))
    except Exception:
        url = url.replace("rejestr=S", "rejestr=P")
        d = json.load(urllib.request.urlopen(url, timeout=30))
    dz1 = d["odpis"]["dane"]["dzial1"]
    slowa = dz1["danePodmiotu"]["nazwa"].replace('"', "").replace("„", "").replace("”", "").title().split()
    male = {"I", "W", "Na", "Dla", "Oraz", "Z", "Ze", "Do", "Od", "Im.", "Imienia"}
    nazwa = " ".join(w.lower() if k and w in male else w for k, w in enumerate(slowa))
    nazwa = nazwa.replace("Fundacja", "Fundacją", 1).replace("Stowarzyszenie", "Stowarzyszeniem", 1)
    ident = dz1["danePodmiotu"].get("identyfikatory", {})
    adr = dz1["siedzibaIAdres"]["adres"]
    adres = f"ul. {adr.get('ulica', '').title().replace('Ul. ', '')} {adr.get('nrDomu', '')}{'/' + adr['nrLokalu'] if adr.get('nrLokalu') else ''}, {adr.get('kodPocztowy', '')} {adr.get('miejscowosc', '').title()}"
    czesci = [f"{nazwa} z siedzibą pod adresem {adres}",
              f"wpisaną do Krajowego Rejestru Sądowego pod numerem KRS {krs.zfill(10)}"]
    if ident.get("nip"): czesci.append(f"NIP {ident['nip']}")
    if ident.get("regon"): czesci.append(f"REGON {ident['regon'][:9]}")
    return ", ".join(czesci)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--krs"); ap.add_argument("--zamawiajacy"); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    wyk = os.environ.get("WYKONAWCA")
    if not wyk:
        print("Ustaw WYKONAWCA (imię i nazwisko właściciela w narzędniku).", file=sys.stderr); return 1
    zam = a.zamawiajacy or (z_krs(a.krs) if a.krs else None)
    if not zam:
        print("Podaj --krs albo --zamawiajacy.", file=sys.stderr); return 1
    md = SZABLON.read_text().replace("{WYKONAWCA}", wyk).replace("{ZAMAWIAJACY}", zam)
    with tempfile.TemporaryDirectory() as t:
        src, dst = Path(t) / "u.md", Path(t) / "u.docx"
        src.write_text(md)
        subprocess.run(["pandoc", str(src), "-o", str(dst)], check=True)
        z = zipfile.ZipFile(dst); out = io.BytesIO(); w = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9)
        for i in z.infolist():
            if not i.filename.startswith("docProps/thumbnail"): w.writestr(i.filename, z.read(i.filename))
        w.close()
        Path(a.out).expanduser().write_bytes(out.getvalue())
    print("Zapisano", a.out, "| Zamawiający:", zam)
    return 0


if __name__ == "__main__":
    sys.exit(main())
