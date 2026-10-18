"""Testy bramki audyt_po_przepisaniu (stdlib unittest).

Uruchom z katalogu skilla:  python -m unittest discover -s tests -v
Przypadki syntetyczne, pisane pod zjawisko (zgubiona data, zmieniona sila normy), nie pod regex.
"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKRYPT = Path(__file__).resolve().parents[1] / "scripts" / "audyt_po_przepisaniu.py"
sys.path.insert(0, str(SKRYPT.parent))

import audyt_po_przepisaniu as A  # noqa: E402

TEKST = (
    "Termin na wniesienie zarzutow uplywa 15 marca 2026 r. Klient zaplaci 12 500 zł "
    "wynagrodzenia, a Najemca może wypowiedzieć umowę z zachowaniem 30 dni. "
    "Podstawa: art. 6 ust. 1 lit. f RODO oraz uchwala III CZP 33/26."
)


def kontrola(wynik, nazwa):
    return next(k for k in wynik["kontrole"] if k["nazwa"] == nazwa)


class Wejscie(unittest.TestCase):
    def test_identyczny_tekst_to_ok_i_brak_zmian_jest_wynikiem(self):
        w = A.audyt(TEKST, TEKST)
        self.assertEqual(w["status"], "OK")
        self.assertTrue(w["bez_zmian"])

    def test_pusty_wynik_blokuje(self):
        self.assertEqual(A.audyt(TEKST, "  \n")["status"], "BLOKADA")

    def test_pusty_oryginal_blokuje(self):
        self.assertEqual(A.audyt("", TEKST)["status"], "BLOKADA")

    def test_pelny_mianownik_takze_przy_ok(self):
        w = A.audyt(TEKST, TEKST)
        nazwy = {k["nazwa"] for k in w["kontrole"]}
        self.assertEqual(nazwy, set(A.KONTROLE))
        self.assertTrue(all(k["status"] == "OK" for k in w["kontrole"]))


class WartosciWrazliwe(unittest.TestCase):
    def test_zgubiona_data_blokuje(self):
        po = TEKST.replace("15 marca 2026 r.", "w marcu")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_przeformatowana_data_przechodzi(self):
        po = TEKST.replace("15 marca 2026 r.", "15.03.2026 r.")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "OK")

    def test_zmieniona_kwota_blokuje(self):
        po = TEKST.replace("12 500 zł", "12 000 zł")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_twarda_spacja_w_kwocie_przechodzi(self):
        po = TEKST.replace("12 500 zł", "12 500 zł")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "OK")

    def test_zmyslona_liczba_blokuje(self):
        po = TEKST + " To skraca proces o 30%."
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_zgubiony_przepis_blokuje(self):
        po = TEKST.replace("art. 6 ust. 1 lit. f RODO", "RODO")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_zmieniona_sygnatura_blokuje(self):
        po = TEKST.replace("III CZP 33/26", "III CZP 33/25")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_cytat_zmieniony_blokuje(self):
        przed = "Sad wskazal, ze „umowa wygasla z mocy prawa” i oddalil powodztwo."
        po = "Sad wskazal, ze „umowa wygasla” i oddalil powodztwo."
        self.assertEqual(kontrola(A.audyt(przed, po), "wartosci_wrazliwe")["status"], "BLOKADA")

    def test_zmiana_samego_cudzyslowu_przechodzi(self):
        przed = 'Sad wskazal, ze "umowa wygasla z mocy prawa" i oddalil powodztwo.'
        po = "Sad wskazal, ze „umowa wygasla z mocy prawa” i oddalil powodztwo."
        self.assertEqual(kontrola(A.audyt(przed, po), "wartosci_wrazliwe")["status"], "OK")

    def test_placeholder_zastapiony_zmyslona_wartoscia_blokuje(self):
        przed = "Zaliczka wynosi [kwota] i jest platna do konca miesiaca."
        po = "Zaliczka wynosi 2000 zł i jest platna do konca miesiaca."
        self.assertEqual(kontrola(A.audyt(przed, po), "wartosci_wrazliwe")["status"], "BLOKADA")


class ProfilDeontyczny(unittest.TestCase):
    def test_moze_na_musi_blokuje(self):
        po = TEKST.replace("może wypowiedzieć", "musi wypowiedzieć")
        self.assertEqual(kontrola(A.audyt(TEKST, po), "profil_deontyczny")["status"], "BLOKADA")

    def test_zakaz_na_pozwolenie_blokuje(self):
        przed = "Wykonawca nie może powierzyć prac podwykonawcy bez zgody."
        po = "Wykonawca może powierzyć prace podwykonawcy bez zgody."
        self.assertEqual(kontrola(A.audyt(przed, po), "profil_deontyczny")["status"], "BLOKADA")

    def test_nie_musi_liczy_sie_jako_pozwolenie(self):
        p = A.profil_deontyczny("Klient nie musi podpisywać aneksu.")
        self.assertEqual(p["pozwolenie"], 1)
        self.assertEqual(p["obowiazek"], 0)

    def test_rama_dyskursu_nie_jest_norma(self):
        p = A.profil_deontyczny("Należy zauważyć, że termin minął. Warto podkreślić jedno.")
        self.assertEqual(sum(p.values()), 0)

    def test_rama_z_wtraceniem_nie_jest_norma(self):
        p = A.profil_deontyczny("Należy jednak pamiętać, że kaucja podlega zwrotowi po odbiorze.")
        self.assertEqual(sum(p.values()), 0)

    def test_usuniecie_ramy_dyskursu_przechodzi(self):
        przed = "Należy podkreślić, że Klient musi złożyć wniosek w terminie."
        po = "Klient musi złożyć wniosek w terminie."
        self.assertEqual(kontrola(A.audyt(przed, po), "profil_deontyczny")["status"], "OK")

    def test_usuniecie_otoczki_czatu_z_mozesz_przechodzi(self):
        przed = ("Oto wzór pisma. Najemca nie może podnająć lokalu. "
                 "Możesz dostosować ton do adresata. Mogę też przygotować wersję skróconą.")
        po = "Najemca nie może podnająć lokalu."
        self.assertEqual(kontrola(A.audyt(przed, po), "profil_deontyczny")["status"], "OK")

    def test_otoczka_nie_maskuje_zmiany_normy_w_tresci(self):
        przed = "Najemca może podnająć lokal. Możesz dostosować ton do adresata."
        po = "Najemca musi podnająć lokal."
        self.assertEqual(kontrola(A.audyt(przed, po), "profil_deontyczny")["status"], "BLOKADA")

    def test_rownowazne_sformulowanie_obowiazku_przechodzi(self):
        przed = "Najemca musi zwrócić klucze w dniu wydania lokalu."
        po = "Najemca jest obowiązany zwrócić klucze w dniu wydania lokalu."
        self.assertEqual(kontrola(A.audyt(przed, po), "profil_deontyczny")["status"], "OK")


class Pewnosc(unittest.TestCase):
    def test_usunieta_niepewnosc_blokuje(self):
        przed = "Prawdopodobnie sąd wyda wyrok w marcu."
        po = "Sąd wyda wyrok w marcu."
        self.assertEqual(kontrola(A.audyt(przed, po), "pewnosc")["status"], "BLOKADA")

    def test_przerzedzenie_pietrowego_asekuranctwa_przechodzi(self):
        przed = "Można by potencjalnie argumentować, że polityka być może ma pewien wpływ na wyniki."
        po = "Polityka może wpływać na wyniki."
        self.assertEqual(kontrola(A.audyt(przed, po), "pewnosc")["status"], "OK")

    def test_dopisana_niepewnosc_to_uwagi(self):
        przed = "Sąd wyda wyrok w marcu."
        po = "Sąd prawdopodobnie wyda wyrok w marcu."
        self.assertEqual(kontrola(A.audyt(przed, po), "pewnosc")["status"], "UWAGI")


class SladyNarzedzia(unittest.TestCase):
    def test_niewypelnione_pole_blokuje_gotowosc(self):
        przed = "Zaliczka wynosi [kwota] i jest platna do konca miesiaca."
        w = A.audyt(przed, przed)
        self.assertEqual(kontrola(w, "slady_narzedzia")["status"], "BLOKADA")
        self.assertEqual(kontrola(w, "wartosci_wrazliwe")["status"], "OK")

    def test_znacznik_do_uzupelnienia_blokuje_gotowosc_ale_nie_jest_zmyslona_wartoscia(self):
        przed = "Adopcja wzrosla w calej branzy."
        po = "Adopcja wzrosla [do uzupelnienia: zrodlo twierdzenia, ze adopcja wzrosla w calej branzy]."
        w = A.audyt(przed, po)
        self.assertEqual(kontrola(w, "slady_narzedzia")["status"], "BLOKADA")
        self.assertEqual(kontrola(w, "wartosci_wrazliwe")["status"], "OK")

    def test_krotki_znacznik_tez_nie_jest_zmyslona_wartoscia(self):
        przed = "Adopcja wzrosla w calej branzy."
        po = "Adopcja wzrosla [do uzupelnienia: zrodlo]."
        self.assertEqual(kontrola(A.audyt(przed, po), "wartosci_wrazliwe")["status"], "OK")

    def test_formulka_czatbota_blokuje(self):
        po = TEKST + " Mam nadzieję, że to pomoże!"
        self.assertEqual(kontrola(A.audyt(TEKST, po), "slady_narzedzia")["status"], "BLOKADA")

    def test_oferta_asystenta_w_wyniku_blokuje(self):
        po = TEKST + " Możesz dostosować ton do adresata."
        self.assertEqual(kontrola(A.audyt(TEKST, po), "slady_narzedzia")["status"], "BLOKADA")

    def test_usuniecie_otoczki_nie_zmienia_liczby_terminow(self):
        przed = "Oto wzór apelacji. Apelacja dotyczy całego wyroku. Mogę też przygotować wzór apelacji skróconej."
        po = "Apelacja dotyczy całego wyroku."
        self.assertEqual(kontrola(A.audyt(przed, po), "terminy_chronione")["status"], "OK")

    def test_zamkniecie_maila_to_nie_slad_czatu(self):
        tekst = "Przesyłam projekt uchwały do akceptacji. W razie pytań jestem do dyspozycji."
        self.assertEqual(kontrola(A.audyt(tekst, tekst), "slady_narzedzia")["status"], "OK")

    def test_oto_na_poczatku_blokuje(self):
        po = "Oto poprawiona wersja: " + TEKST
        self.assertEqual(kontrola(A.audyt(TEKST, po), "slady_narzedzia")["status"], "BLOKADA")


class TerminyChronione(unittest.TestCase):
    def test_zadatek_na_zaliczke_blokuje(self):
        przed = "Kupujacy wplacil zadatek w wysokosci ustalonej w umowie przedwstepnej."
        po = "Kupujacy wplacil zaliczke w wysokosci ustalonej w umowie przedwstepnej."
        self.assertEqual(kontrola(A.audyt(przed, po), "terminy_chronione")["status"], "BLOKADA")

    def test_termin_zdefiniowany_zastapiony_blokuje(self):
        przed = ('Alfa sp. z o.o. (dalej: „Zamawiający”) zleca prace. '
                 "Zamawiający odbiera Dzielo w terminie 7 dni.")
        po = "Alfa sp. z o.o. zleca prace. Klient odbiera Dzielo w terminie 7 dni."
        self.assertEqual(kontrola(A.audyt(przed, po), "terminy_chronione")["status"], "BLOKADA")

    def test_rzadsze_uzycie_terminu_zdefiniowanego_to_uwagi(self):
        przed = ('Alfa sp. z o.o. (dalej: „Zamawiający”) zleca prace. '
                 "Zamawiający odbiera Dzielo. Zamawiający placi w 7 dni.")
        po = ('Alfa sp. z o.o. (dalej: „Zamawiający”) zleca prace. '
              "Zamawiający odbiera Dzielo i placi w 7 dni.")
        w = A.audyt(przed, po)
        self.assertEqual(kontrola(w, "terminy_chronione")["status"], "UWAGI")
        self.assertEqual(w["status"], "UWAGI")

    def test_termin_z_parametru_chroniony_doslownie(self):
        przed = "Stosujemy procedure Szybkiej Sciezki dla pilnych spraw."
        po = "Stosujemy szybka procedure dla pilnych spraw."
        w = A.audyt(przed, po, chronione=["Szybkiej Sciezki"])
        self.assertEqual(kontrola(w, "terminy_chronione")["status"], "BLOKADA")


class LimitSkrocenia(unittest.TestCase):
    PRZED = " ".join(f"slowo{i}" for i in range(100))

    def test_skrocenie_ponad_limit_blokuje(self):
        po = " ".join(f"slowo{i}" for i in range(50))
        self.assertEqual(kontrola(A.audyt(self.PRZED, po), "limit_skrocenia")["status"], "BLOKADA")

    def test_skrocenie_w_limicie_przechodzi(self):
        po = " ".join(f"slowo{i}" for i in range(80))
        self.assertEqual(kontrola(A.audyt(self.PRZED, po), "limit_skrocenia")["status"], "OK")

    def test_krotki_tekst_ponad_limit_to_uwagi_nie_blokada(self):
        przed = "Warto podkreślić, że w dzisiejszych czasach kancelaria powinna wdrożyć kompleksowe rozwiązanie."
        po = "Kancelaria powinna wdrożyć to rozwiązanie."
        self.assertEqual(kontrola(A.audyt(przed, po), "limit_skrocenia")["status"], "UWAGI")

    def test_limit_jest_parametrem(self):
        po = " ".join(f"slowo{i}" for i in range(50))
        w = A.audyt(self.PRZED, po, limit_skrocenia=0.6)
        self.assertEqual(kontrola(w, "limit_skrocenia")["status"], "OK")


class ZnalezioneWPomiarze(unittest.TestCase):
    """Falszywe alarmy znalezione na zestawach zaslepionych (2026-10-13), odtworzone syntetycznie."""

    def test_skrot_wewnatrz_slowa_to_nie_przepis(self):
        przed = "Udany start. 5 zespolow ruszylo od razu."
        po = "Udany start: 5 zespolow ruszylo od razu."
        self.assertEqual(kontrola(A.audyt(przed, po), "wartosci_wrazliwe")["status"], "OK")

    def test_przypis_numerowany_to_nie_pole_do_wypelnienia(self):
        t = "Zgodnie z przypisem [1] termin zostal zawieszony."
        self.assertEqual(kontrola(A.audyt(t, t), "slady_narzedzia")["status"], "OK")

    def test_usuniecie_otoczki_czatu_nie_liczy_sie_do_limitu_skrocenia(self):
        tresc = ("Wykonawca musi dostarczyc towar do magazynu Zamawiajacego w terminie 14 dni od zamowienia. "
                 "Opoznienie uprawnia Zamawiajacego do kary umownej 0,5% ceny za kazdy tydzien. "
                 "Zamawiajacy moze odrzucic towar niezgodny ze specyfikacja w terminie 7 dni od dostawy.")
        otwarcie = "Oto poprawiona, przejrzysta i profesjonalna wersja klauzuli, o którą prosiłeś do umowy."
        zamkniecie = ("Mam nadzieję, że to pomoże w negocjacjach! Daj znać, jeśli chcesz zmienić ton. "
                      "Mogę też przygotować krótszą wersję do podsumowania.")
        w = A.audyt(f"{otwarcie} {tresc} {zamkniecie}", tresc)
        self.assertEqual(kontrola(w, "limit_skrocenia")["status"], "OK")


class Cli(unittest.TestCase):
    def uruchom(self, przed, po, *arg):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d, "przed.txt"), Path(d, "po.txt")
            a.write_text(przed, encoding="utf-8")
            b.write_text(po, encoding="utf-8")
            return subprocess.run([sys.executable, str(SKRYPT), str(a), str(b), *arg],
                                  capture_output=True, text=True, encoding="utf-8")

    def test_kod_0_przy_ok(self):
        r = self.uruchom(TEKST, TEKST)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("OK", r.stdout)

    def test_kod_20_przy_blokadzie(self):
        r = self.uruchom(TEKST, TEKST.replace("12 500 zł", "12 000 zł"))
        self.assertEqual(r.returncode, 20, r.stdout + r.stderr)
        self.assertIn("BLOKADA", r.stdout)

    def test_kod_2_przy_zlym_wywolaniu(self):
        r = subprocess.run([sys.executable, str(SKRYPT)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
