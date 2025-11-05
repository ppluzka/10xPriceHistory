# Przewodnik Testowania - Widok Szczegółów Oferty

## Przygotowanie do testowania

### Uruchomienie projektu

```bash
npm run dev
```

### Dostęp do widoku

- URL: `http://localhost:4321/offer/[id]`
- Przykład: `http://localhost:4321/offer/1`

## Test Cases

### 1. Happy Path - Poprawne Wyświetlanie Oferty

**Kroki:**

1. Zaloguj się do aplikacji
2. Przejdź do dashboard
3. Kliknij na kartę oferty lub wejdź bezpośrednio na `/offer/[id]`

**Oczekiwany rezultat:**

- ✅ Strona ładuje się bez błędów
- ✅ Nagłówek wyświetla:
  - Obraz oferty (jeśli dostępny)
  - Tytuł oferty
  - Miasto (jeśli dostępne)
  - Badge ze zmianą od początku
  - Badge z ostatnią zmianą
  - Link "Zobacz na Otomoto" (otwiera w nowej karcie)
- ✅ Wykres historii cen wyświetla się poprawnie
- ✅ Tabela historii cen zawiera wszystkie sprawdzenia
- ✅ Panel statystyk wyświetla:
  - Cenę min/max/średnią
  - Trend (wzrostowy/spadkowy/stabilny)
  - Liczbę sprawdzeń
  - Okres obserwacji
- ✅ Link "Powrót do Dashboard" działa

### 2. Interakcje Użytkownika

#### 2.1 Hover na wykresie

**Kroki:**

1. Najedź kursorem na dowolny punkt wykresu

**Oczekiwany rezultat:**

- ✅ Pojawia się tooltip z:
  - Pełną datą (DD.MM.YYYY HH:mm)
  - Ceną z formatowaniem
  - Walutą

#### 2.2 Kliknięcie linku Otomoto

**Kroki:**

1. Kliknij "Zobacz na Otomoto"

**Oczekiwany rezultat:**

- ✅ Otworzy się nowa karta przeglądarki
- ✅ URL prowadzi do oferty na Otomoto

#### 2.3 Przewijanie strony (desktop)

**Kroki:**

1. Na ekranie >= 1024px, przewiń stronę w dół

**Oczekiwany rezultat:**

- ✅ Panel statystyk pozostaje "przyklejony" (sticky) do góry ekranu

### 3. Przypadki Brzegowe

#### 3.1 Oferta nie istnieje (404)

**Kroki:**

1. Przejdź na `/offer/999999` (nieistniejący ID)

**Oczekiwany rezultat:**

- ✅ Wyświetla się strona błędu 404
- ✅ Komunikat: "Oferta nie znaleziona"
- ✅ Link do powrotu na dashboard działa

#### 3.2 Brak dostępu do oferty (403)

**Kroki:**

1. Spróbuj wejść na ofertę innego użytkownika

**Oczekiwany rezultat:**

- ✅ Wyświetla się strona błędu 403
- ✅ Komunikat o braku dostępu
- ✅ Link do powrotu na dashboard działa

#### 3.3 Oferta usunięta (status: removed)

**Kroki:**

1. Wejdź na ofertę ze statusem "removed"

**Oczekiwany rezultat:**

- ✅ Wyświetla się banner ostrzegawczy na górze
- ✅ Tekst: "Ta oferta została usunięta z Otomoto"
- ✅ Reszta danych (historia) jest nadal dostępna

#### 3.4 Oferta z błędem (status: error)

**Kroki:**

1. Wejdź na ofertę ze statusem "error"

**Oczekiwany rezultat:**

- ✅ Wyświetla się banner ostrzegawczy
- ✅ Tekst o błędzie podczas sprawdzania

#### 3.5 Historia z < 2 punktami danych

**Kroki:**

1. Wejdź na ofertę z tylko 1 sprawdzeniem

**Oczekiwany rezultat:**

- ✅ Wykres nie wyświetla się
- ✅ Komunikat: "Za mało danych do wygenerowania wykresu"
- ✅ Ikona wykresu jako placeholder
- ✅ Tabela nadal wyświetla dostępne dane

#### 3.6 Pusta historia cen

**Kroki:**

1. Wejdź na nowo dodaną ofertę bez historii

**Oczekiwany rezultat:**

- ✅ Wykres pokazuje komunikat o braku danych
- ✅ Tabela pokazuje komunikat: "Brak historii cen"

#### 3.7 Oferta bez obrazu

**Kroki:**

1. Wejdź na ofertę bez `imageUrl`

**Oczekiwany rezultat:**

- ✅ Nagłówek wyświetla się poprawnie bez obrazu
- ✅ Pozostałe dane są widoczne

#### 3.8 Oferta bez miasta

**Kroki:**

1. Wejdź na ofertę bez `city`

**Oczekiwany rezultat:**

- ✅ Sekcja z lokalizacją nie wyświetla się
- ✅ Pozostałe dane są poprawnie wyświetlone

### 4. Responsywność

#### 4.1 Mobile (< 768px)

**Kroki:**

1. Otwórz DevTools (F12)
2. Ustaw viewport na 375px x 667px (iPhone SE)

**Oczekiwany rezultat:**

- ✅ Nagłówek układa się w kolumnę (obraz nad danymi)
- ✅ Wykres jest responsywny (ResponsiveContainer)
- ✅ Tabela przewija się poziomo (jeśli potrzeba)
- ✅ Panel statystyk wyświetla się pod główną treścią
- ✅ Wszystkie elementy są czytelne
- ✅ Przyciski są łatwo klikalne (min 44x44px)

#### 4.2 Tablet (768px - 1024px)

**Kroki:**

1. Ustaw viewport na 768px x 1024px (iPad)

**Oczekiwany rezultat:**

- ✅ Layout przechodzi na md: breakpoint
- ✅ Nagłówek wyświetla obraz obok danych
- ✅ Panel statystyk nadal pod główną treścią

#### 4.3 Desktop (>= 1024px)

**Kroki:**

1. Ustaw viewport na 1440px x 900px

**Oczekiwany rezultat:**

- ✅ Layout przechodzi na lg: breakpoint
- ✅ Panel statystyk pojawia się jako sidebar (320px szerokości)
- ✅ Sidebar jest sticky przy przewijaniu
- ✅ Grid layout: `[1fr_320px]`

### 5. Dostępność (a11y)

#### 5.1 Nawigacja klawiaturą

**Kroki:**

1. Używając tylko klawiatury (Tab, Enter), poruszaj się po stronie

**Oczekiwany rezultat:**

- ✅ Wszystkie interaktywne elementy są osiągalne (Tab)
- ✅ Focus jest widoczny
- ✅ Link do Otomoto można aktywować (Enter)
- ✅ Link powrotu można aktywować (Enter)

#### 5.2 Screen Reader

**Kroki:**

1. Włącz NVDA/JAWS lub VoiceOver
2. Nawiguj po stronie

**Oczekiwany rezultat:**

- ✅ Nagłówki są prawidłowo ogłaszane (h1, h2)
- ✅ Obrazy mają alt text
- ✅ Linki mają opisowe teksty
- ✅ Tabela jest prawidłowo strukturą (th, td)
- ✅ Ikony nie są odczytywane (jeśli dekoracyjne)

#### 5.3 Kontrast kolorów

**Kroki:**

1. Użyj narzędzia do sprawdzania kontrastu (np. WAVE)

**Oczekiwany rezultat:**

- ✅ Wszystkie teksty spełniają WCAG AA (4.5:1)
- ✅ Duże teksty spełniają WCAG AAA (3:1)

### 6. Wydajność

#### 6.1 Czas ładowania

**Kroki:**

1. Otwórz DevTools → Network
2. Wejdź na stronę oferty

**Oczekiwany rezultat:**

- ✅ Strona renderuje się < 2s (SSR)
- ✅ Brak niepotrzebnych zapytań API
- ✅ Obrazy są optymalizowane

#### 6.2 Renderowanie wykresu

**Kroki:**

1. Wejdź na ofertę z dużą historią (>100 punktów)

**Oczekiwany rezultat:**

- ✅ Wykres renderuje się płynnie
- ✅ Hover działa bez opóźnień
- ✅ Brak lagów przy przewijaniu

### 7. Błędy w Console

**Kroki:**

1. Otwórz DevTools → Console
2. Przejdź przez wszystkie test cases

**Oczekiwany rezultat:**

- ✅ Brak błędów JavaScript
- ✅ Brak ostrzeżeń React
- ✅ Brak błędów 404 dla zasobów

## Checklist przed Deploymentem

- [ ] Wszystkie testy Happy Path przeszły
- [ ] Wszystkie przypadki brzegowe obsłużone
- [ ] Responsywność na mobile/tablet/desktop
- [ ] Nawigacja klawiaturą działa
- [ ] Kontrast kolorów spełnia WCAG AA
- [ ] Brak błędów w console
- [ ] Brak błędów lintera
- [ ] TypeScript kompiluje się bez błędów
- [ ] SSR działa poprawnie
- [ ] Obrazy mają alt text
- [ ] Linki otwierają się w odpowiednich kartach

## Znane Ograniczenia (MVP)

1. Brak automatycznego odświeżania danych (TanStack Query nie jest w pełni wykorzystany)
2. Brak paginacji w tabeli historii (wyświetla wszystkie rekordy)
3. Brak eksportu danych do CSV
4. Brak animacji wejścia komponentów
5. Brak loading skeletons (tylko spinner)

## Problemy do Zgłoszenia

Jeśli napotkasz problemy podczas testowania, zgłoś je z:

- Krokami do odtworzenia
- Oczekiwanym rezultatem
- Aktualnym rezultatem
- Screenshot/wideo (jeśli możliwe)
- Przeglądarka i wersja
- Rozmiar viewport (dla problemów z responsywnością)
