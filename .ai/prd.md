# Dokument wymagań produktu (PRD) - PriceHistory

## 1. Przegląd produktu

### 1.1 Nazwa produktu

PriceHistory - System monitorowania historii cen ofert z Otomoto.pl

### 1.2 Wizja produktu

PriceHistory to aplikacja webowa umożliwiająca użytkownikom śledzenie zmian cen ogłoszeń samochodowych na platformie Otomoto.pl. System automatycznie monitoruje wybrane oferty, zapisuje historię cen i wizualizuje zmiany, umożliwiając użytkownikom podejmowanie świadomych decyzji zakupowych.

### 1.3 Cel biznesowy

Stworzenie MVP aplikacji PriceHistory w modelu freemium, która w ciągu 3 tygodni dostarczy użytkownikom narzędzie do śledzenia historii cen ogłoszeń z Otomoto.pl, z 90% skutecznością pobierania i zapisywania danych cenowych.

### 1.4 Stack technologiczny

1.4.1 Frontend

- Astro 5 z trybem SSR (output: 'server') dla chronionych stron
- React 19 dla interaktywnych komponentów
- TypeScript 5
- Tailwind CSS 4
- Shadcn/ui dla komponentów UI
- Recharts lub Chart.js dla wizualizacji wykresów

  1.4.2 Backend

- Supabase (PostgreSQL + BaaS)
- Supabase Authentication
- Supabase SDK
- Row Level Security (RLS) dla izolacji danych

  1.4.3 AI i Scraping

- OpenRouter.ai (dostęp do modeli: GPT-4o-mini, Claude Haiku)
- Cheerio.js dla web scrapingu
- Rotacja User-Agents i opóźnienia 2-5s między requestami

  1.4.4 Infrastruktura

- Hosting: VPS
- CI/CD: Github Actions
- Scheduled jobs: pg_cron w Supabase

### 1.5 Model biznesowy

Model freemium z następującymi założeniami:

- Darmowy tier: limit 5 obserwowanych ofert, historia przez 30 dni
- Płatne plany (poza MVP): większa liczba ofert, dłuższa historia, zaawansowane alerty
- Brak powiadomień w MVP - informacje o zmianach cen widoczne tylko na stronie

### 1.6 Harmonogram realizacji

Maksymalnie 3 tygodnie, praca po godzinach przez 1 osobę:

- Tydzień 1: Autentykacja, dodawanie URL, podstawowy scraping, lista ofert
- Tydzień 2: Automatyczne sprawdzanie (cron), historia cen, podstawowy wykres
- Tydzień 3: Dashboard z analizą zmian, obsługa błędów, AI wsparcie, deployment

## 2. Problem użytkownika

### 2.1 Opis problemu

Użytkownicy przeglądający ogłoszenia samochodowe na platformie Otomoto.pl nie mają dostępu do historii cen obserwowanych ofert. Witryna prezentuje wyłącznie aktualną cenę, co uniemożliwia:

- Weryfikację czy cena została obniżona lub podwyższona
- Ocenę czy oferta jest rzeczywistą okazją
- Wykrycie manipulacji cenowych ze strony sprzedawców
- Śledzenie trendów cenowych w czasie
- Podejmowanie świadomych decyzji zakupowych opartych na danych

### 2.2 Grupa docelowa

Użytkownicy aktywnie poszukujący samochodów na Otomoto.pl, którzy:

- Obserwują wiele ofert przed podjęciem decyzji zakupowej
- Chcą negocjować cenę w oparciu o historyczne dane
- Potrzebują potwierdzenia autentyczności "promocyjnych" cen
- Oczekują transparentności w procesie zakupowym

### 2.3 Dotychczasowe rozwiązania i ich ograniczenia

- Ręczne zapisywanie cen w notesie/arkuszu - czasochłonne, podatne na błędy
- Codzienne sprawdzanie ofert ręcznie - wymaga dyscypliny, łatwo przegapić zmiany
- Zrzuty ekranu ofert - trudne w zarządzaniu, brak wizualizacji zmian
- Brak dedykowanych narzędzi dla Otomoto.pl wspierających monitoring cen

## 3. Wymagania funkcjonalne

### 3.1 Zarządzanie ofertami

3.1.1 Dodawanie oferty

- System przyjmuje URL oferty z Otomoto.pl wprowadzony przez użytkownika
- Walidacja formatu URL (domena otomoto.pl)
- Automatyczne pobieranie HTML strony z ofertą
- AI-powered ekstrakcja danych: cena, waluta, selektor CSS/XPath
- Ekstrakcja metadanych: tytuł ogłoszenia, pierwsze zdjęcie, lokalizacja ceny, cena, waluta, miasto
- Preview oferty przed zapisaniem (tytuł, cena, miniatura zdjęcia, waluta, miasto)
- Potwierdzenie i zapisanie oferty do bazy danych
- Maksymalnie 3 kliki do dodania oferty (UX requirement)

  3.1.2 Przeglądanie ofert

- Lista wszystkich obserwowanych ofert użytkownika
- Wyświetlanie dla każdej oferty: miniatura, tytuł, aktualna cena, % zmiana ceny względem pierwszej ceny, % zmiana ceny względem poprzedniej ceny, ostatnie sprawdzenie, status, miasto
- Sortowanie ofert (domyślnie: najnowsze)
- Wizualne oznaczenie zmian cen: czerwony (wzrost), zielony (spadek)
- Grid kart responsywnych na różne rozmiary ekranu

  3.1.3 Usuwanie ofert

- Możliwość usunięcia oferty z listy obserwowanych
- Soft delete (kolumna deleted_at) z możliwością przywrócenia
- Limit 5 ofert liczony tylko dla aktywnych (deleted_at IS NULL)
- Zachowanie historii cen po soft usunięciu oferty (dla analityki)

  3.1.4 Szczegóły oferty

- Dedykowana strona /offer/[id] dla każdej oferty
- Wyświetlanie: zdjęcie, tytuł, link do oryginalnej oferty, % zmiana ceny względem pierwszej ceny, % zmiana ceny względem poprzedniej ceny, miasto
- Wykres liniowy zmian cen w czasie (oś X: daty, oś Y: cena)
- Tooltip z datą i ceną przy najechaniu na punkt wykresu
- Tabela historii cen (10 ostatnich wpisów)
- Statystyki: minimalna/maksymalna/średnia cena, trend

### 3.2 Automatyczne monitorowanie cen

3.2.1 Mechanizm cyklicznego sprawdzania

- Scheduled job (cron) uruchamiany w konfigurowalnych odstępach
- Domyślna częstotliwość: 24h (konfigurowalna globalnie: 6h, 12h, 24h, 48h)
- Pobieranie HTML strony oferty
- Ekstrakcja ceny przy użyciu zapisanego selektora CSS/XPath
- Walidacja poprawności pobranej wartości (czy to rzeczywiście cena)
- Jeśli nie jest to cena to przekazanie HTML do wybranego modelu AI w celu wyszukania ceny i ponowana walidacja.
- Zapisanie nowej ceny w historii z timestamp

  3.2.2 Obsługa błędów scrapingu

- Mechanizm retry: 3 próby z rosnącym interwałem (1min, 5min, 15min)
- Logging wszystkich błędów do systemu monitorowania
- Zmiana statusu oferty na "error" po wyczerpaniu prób
- Zmiana statusu na "removed" dla kodów 404/410 (oferta usunięta)
- Zaprzestanie sprawdzania ofert ze statusem "removed"
- Alert dla deweloperów przy >15% błędów w systemie

  3.2.3 Zarządzanie statusami

- active: oferta jest aktywnie sprawdzana
- removed: oferta została usunięta z Otomoto (404/410), system przestaje sprawdzać
- error: problem z pobraniem ceny, wymaga interwencji

### 3.3 Ekstrakcja i analiza danych

3.3.1 AI-powered ekstrakcja przy pierwszym dodaniu

- Wysłanie pełnego HTML do API OpenRouter.ai
- Structured output JSON: {price, currency, selector, confidence, city, title}
- Fallback do hardcoded patterns dla Otomoto.pl ([data-testid="price"], .offer-price)
- Walidacja confidence score (minimum 0.9 do akceptacji)
- Zapisanie selektora w bazie dla przyszłych sprawdzeń

  3.3.2 Obsługa walut

- Rozpoznawanie różnych walut (PLN, EUR, USD)
- Wyświetlanie cen w oryginalnej walucie
- Warning dla użytkownika gdy waluta zmienia się w czasie
- Brak automatycznej konwersji w MVP

  3.3.3 Walidacja danych

- Sprawdzenie czy pobrana wartość jest liczbą
- Weryfikacja zakresu (cena > 0 i < 10,000,000)
- Porównanie z poprzednią ceną (alert przy zmianie >50%)

### 3.4 Wizualizacja i analiza

3.4.1 Dashboard

- Główny widok po zalogowaniu (/dashboard)
- Grid kart z obserwowanymi ofertami
- Każda karta zawiera: miniaturę, tytuł, aktualną cenę, % zmianę, ostatnie sprawdzenie, przycisk usuwania
- Kolorowe oznaczenia zmian: zielony badge dla spadków, czerwony dla wzrostów
- Statystyki globalne: liczba obserwowanych ofert, średnia zmiana cen
- Filtrowanie wg statusu

  3.4.2 Wykres historii cen

- Prosty wykres liniowy (Recharts lub Chart.js)
- Oś X: data/czas sprawdzenia
- Oś Y: cena w oryginalnej walucie
- Tooltip z pełnymi informacjami przy hover
- Responsywny (full width na stronie szczegółów)

  3.4.3 Analiza zmian

- Obliczanie procentowej zmiany ceny: ((aktualna - początkowa) / początkowa) \* 100
- Identyfikacja trendu: wzrostowy/spadkowy/stabilny
- Wyświetlanie min/max/avg ceny z historii

### 3.5 System użytkowników i autoryzacja

3.5.1 Rejestracja

- Formularz z polami: email, hasło (minimum 8 znaków)
- Walidacja formatu email
- Captcha (hCaptcha lub Cloudflare Turnstile)
- Rate limiting: maksymalnie 3 rejestracje z tego samego IP dziennie
- Wysłanie emaila weryfikacyjnego przez Supabase Auth
- Supabase blokuje pełny dostęp przed potwierdzeniem email

  3.5.2 Weryfikacja email

- Automatyczne wysłanie linku weryfikacyjnego po rejestracji
- Kliknięcie linku potwierdza konto
- Redirect do /dashboard po potwierdzeniu
- Informacja o konieczności weryfikacji przy próbie logowania bez potwierdzenia

  3.5.3 Logowanie

- Formularz z polami: email, hasło
- Sesja zarządzana przez Supabase Auth
- Redirect do /dashboard po pomyślnym logowaniu
- Przekierowanie do /login dla niezalogowanych użytkowników próbujących dostać się do chronionych stron

  3.5.4 Wylogowanie

- Przycisk wylogowania w interfejsie
- Zakończenie sesji Supabase
- Redirect do landing page (/)

  3.5.5 Zarządzanie kontem

- Strona /settings z opcjami:
  - Zmiana hasła
  - Zmiana globalnej częstotliwości sprawdzania (6h, 12h, 24h, 48h)
  - Usunięcie konta (anonimizacja email + usunięcie hasła)

### 3.6 Rate limiting i bezpieczeństwo

3.6.1 Limity operacyjne

- Darmowe konto: maksymalnie 5 obserwowanych ofert
- Maksymalnie 10 dodań ofert dziennie na użytkownika
- 3 próby rejestracji z tego samego IP dziennie
- Limit 1 manual check per offer per hour (jeśli funkcja zostanie dodana)

  3.6.2 Zabezpieczenia

- Row Level Security (RLS) w Supabase dla izolacji danych użytkowników
- Prepared statements dla wszystkich zapytań SQL
- Walidacja wszystkich inputów użytkownika
- Rotacja User-Agents przy scrapingu
- Opóźnienia 2-5s między requestami do Otomoto
- Randomizuj User-Agent z pool ~10 różnych
- Dodaj Referer header (udawaj że kliknąłeś z Google)
- Respect robots.txt (sprawdź czy Otomoto blokuje)
- IP rotation jeśli Otomoto zacznie banować (proxy pool)

  3.6.3 Prywatność danych

- Zgodność z RODO (Privacy Policy wymagana)
- Dane przechowywane do momentu usunięcia konta
- Anonimizacja danych przy usunięciu konta
- Historia cen przechowywana 30 dni dla darmowych użytkowników
- Usunięcie niepotwierdzonych kont po 90 dniach

### 3.7 Onboarding nowych użytkowników

3.7.1 Flow pierwszego użycia

- Po pierwszym zalogowaniu: redirect do pustego dashboardu
- Tooltip wyjaśniający: "Dodaj swoją pierwszą ofertę z Otomoto.pl"
- Po dodaniu pierwszej oferty: tooltip wyjaśniający jak działa tracking
- Zapisanie stanu onboardingu w localStorage lub tabeli user_preferences

  3.7.2 Landing page (/)

- Hero z value proposition
- Sekcja Problem/Solution
- 3 kroki użycia (wizualizacja procesu)
- Features z ikonami
- Pricing (free tier + premium "wkrótce")
- CTA: "Zacznij za darmo"

## 4. Granice produktu

### 4.1 Co jest w zakresie MVP

4.1.1 Funkcjonalności

- Obsługa wyłącznie witryny Otomoto.pl
- Aplikacja webowa (brak aplikacji mobilnych)
- Podstawowe zarządzanie ofertami (dodawanie, przeglądanie, usuwanie)
- Automatyczne monitorowanie cen z konfigurowalną częstotliwością globalną
- Wizualizacja historii cen w formie wykresu liniowego
- System kont użytkowników z autentykacją email/hasło
- AI-powered ekstrakcja cen przy pierwszym dodaniu oferty
- Limit 5 ofert dla darmowych użytkowników
- Historia cen przechowywana przez 30 dni

  4.1.2 Stack technologiczny

- Frontend: Astro 5 + React 19 + TypeScript 5 + Tailwind 4
- Backend: Supabase (PostgreSQL + BaaS)
- AI: OpenRouter.ai z modelami GPT-4o-mini lub Claude Haiku
- Hosting: VPS (szczegóły do ustalenia)
- CI/CD: Github Actions

### 4.2 Co NIE jest w zakresie MVP

4.2.1 Funkcjonalności wykluczonych

- Obsługa innych witryn (Allegro, OLX, inne)
- Współdzielenie ofert między użytkownikami
- Optymalizacja dla wielu użytkowników obserwujących tę samą ofertę (struktura DB to umożliwia, ale MVP nie wykorzystuje)
- Aplikacje mobilne (iOS, Android)
- Zaawansowane powiadomienia (email, push, SMS) o zmianach cen
- Zaawansowane alerty z progami cenowymi i warunkami
- Automatyczna konwersja walut i API kursów
- Eksport danych (CSV, PDF, Excel)
- Publiczne API i webhooks
- Integracje z zewnętrznymi serwisami
- Tryb ciemny (dark mode)
- Wielojęzyczność (tylko polski)
- Zaawansowana analityka (ML predictions, forecasting)

  4.2.2 Optymalizacje wykluczonych

- Cache dla często sprawdzanych ofert
- CDN dla statycznych assetów
- Deduplikacja scrapingu dla tej samej oferty obserwowanej przez wielu użytkowników
- Zaawansowane kolejki i job processing (Celery, Bull)

### 4.3 Przyszłe rozszerzenia (poza MVP)

4.3.1 Płatne plany premium

- Więcej niż 5 obserwowanych ofert
- Dłuższa historia (6 miesięcy, 12 miesięcy)
- Powiadomienia email/SMS o zmianach cen
- Alerty z progami cenowymi
- Eksport danych

  4.3.2 Dodatkowe funkcjonalności

- Wsparcie dla innych witryn aukcyjnych
- Aplikacje mobilne (iOS/Android)
- Współdzielenie ofert i list obserwowanych
- Porównywarka ofert
- Rekomendacje oparte na AI
- Publiczne API dla developerów

## 5. Historyjki użytkowników

### 5.1 Rejestracja i autentykacja

US-001: Rejestracja nowego konta
Jako nowy użytkownik chcę zarejestrować konto, aby móc śledzić historię cen ofert z Otomoto.pl.

Kryteria akceptacji:

- Formularz rejestracji zawiera pola: email, hasło, potwierdzenie hasła
- System waliduje format email (regex)
- Hasło musi mieć minimum 8 znaków
- System wyświetla captcha (hCaptcha lub Turnstile)
- Po poprawnym wypełnieniu system wysyła email weryfikacyjny
- System wyświetla komunikat: "Sprawdź email aby potwierdzić konto"
- Rate limiting: maksymalnie 3 rejestracje z jednego IP dziennie
- Po przekroczeniu limitu system wyświetla błąd: "Zbyt wiele prób rejestracji"

US-002: Weryfikacja konta email
Jako zarejestrowany użytkownik chcę potwierdzić mój adres email, aby uzyskać pełny dostęp do aplikacji.

Kryteria akceptacji:

- System wysyła email z unikalnym linkiem weryfikacyjnym
- Link jest ważny przez 24 godziny
- Po kliknięciu linku system potwierdza email w bazie danych
- System przekierowuje do /dashboard
- Przy próbie logowania bez weryfikacji system wyświetla: "Potwierdź email przed logowaniem"
- Możliwość wysłania ponownie linku weryfikacyjnego

US-003: Logowanie do systemu
Jako zarejestrowany użytkownik chcę zalogować się do systemu, aby uzyskać dostęp do moich obserwowanych ofert.

Kryteria akceptacji:

- Formularz logowania zawiera pola: email, hasło
- System weryfikuje dane w bazie Supabase Auth
- Przy poprawnych danych system tworzy sesję i przekierowuje do /dashboard
- Przy błędnych danych system wyświetla: "Nieprawidłowy email lub hasło"
- Przy niezweryfikowanym email system wyświetla: "Potwierdź email przed logowaniem"
- Session timeout wynosi 7 dni

US-004: Wylogowanie z systemu
Jako zalogowany użytkownik chcę się wylogować, aby zabezpieczyć moje konto na współdzielonym urządzeniu.

Kryteria akceptacji:

- Przycisk "Wyloguj" widoczny w nawigacji
- Po kliknięciu system kończy sesję Supabase
- System przekierowuje do landing page (/)
- Próba dostępu do /dashboard po wylogowaniu przekierowuje do /login

US-005: Zmiana hasła
Jako zalogowany użytkownik chcę zmienić hasło, aby zwiększyć bezpieczeństwo konta.

Kryteria akceptacji:

- Formularz na stronie /settings zawiera: aktualne hasło, nowe hasło, potwierdzenie nowego hasła
- System weryfikuje poprawność aktualnego hasła
- Nowe hasło musi mieć minimum 8 znaków
- Nowe i potwierdzone hasło muszą być identyczne
- Po pomyślnej zmianie system wyświetla: "Hasło zostało zmienione"
- System wysyła email informujący o zmianie hasła

US-006: Usunięcie konta
Jako użytkownik chcę usunąć moje konto, aby moje dane zostały trwale usunięte z systemu.

Kryteria akceptacji:

- Opcja "Usuń konto" dostępna w /settings w sekcji "Niebezpieczne akcje"
- System wyświetla modal potwierdzający z ostrzeżeniem
- Użytkownik musi wpisać "USUŃ" aby potwierdzić
- System anonimizuje email (zmiana na deleted\_[timestamp]@deleted.com)
- System usuwa hasło i wszystkie dane autoryzacyjne
- System wykonuje soft delete user_offer (deleted_at = NOW())
- Historia cen pozostaje dla analityki
- Po usunięciu system przekierowuje do landing page

### 5.2 Zarządzanie ofertami

US-007: Dodawanie oferty z Otomoto.pl
Jako zalogowany użytkownik chcę dodać URL oferty z Otomoto.pl, aby rozpocząć śledzenie jej ceny.

Kryteria akceptacji:

- Pole input na URL widoczne na /dashboard
- System waliduje czy URL zawiera domenę otomoto.pl
- Przy błędnym URL wyświetla: "Wprowadź poprawny URL z Otomoto.pl"
- Po submit system wyświetla spinner z tekstem "Pobieram dane..."
- System pobiera HTML strony oferty
- System wywołuje API OpenRouter.ai z pełnym HTML
- AI zwraca JSON: {price, currency, selector, confidence}
- Jeśli confidence < 0.8 system próbuje fallback patterns ([data-testid="price"], .offer-price)
- System ekstrahuje tytuł ogłoszenia i pierwsze zdjęcie
- System wyświetla preview: miniatura, tytuł, cena, waluta
- Użytkownik klika "Zapisz" aby potwierdzić
- System zapisuje ofertę w bazie: offers (url, title, image_url, selector, status=active, frequency=24h)
- System tworzy rekord user_offer (user_id, offer_id)
- System tworzy pierwszy wpis w price_history (offer_id, price, currency, checked_at=NOW())
- Maksymalnie 3 kliki do pełnego dodania oferty

US-008: Limit ofert dla darmowego konta
Jako użytkownik darmowego konta chcę widzieć ile ofert mogę jeszcze dodać, aby znać swoje limity.

Kryteria akceptacji:

- System liczy aktywne oferty WHERE deleted_at IS NULL
- Limit dla darmowego konta wynosi 5 ofert
- Badge "X/5 ofert" widoczny na dashboardzie
- Przy próbie dodania 6 oferty system wyświetla: "Osiągnięto limit 5 ofert dla darmowego konta"
- Komunikat zawiera link do informacji o planach premium (nawet jeśli "wkrótce")
- Po usunięciu oferty licznik się zmniejsza

US-009: Rate limiting dodawania ofert
Jako system chcę limitować dodawanie ofert, aby zapobiec nadużyciom.

Kryteria akceptacji:

- Maksymalnie 10 ofert można dodać w ciągu 24h na użytkownika
- System zapisuje timestamp każdego dodania w tabeli offer_additions_log
- Po przekroczeniu limitu system wyświetla: "Przekroczono dzienny limit dodawania ofert (10/24h)"
- Licznik resetuje się po 24h od pierwszego dodania danego dnia
- Error log zapisywany przy próbie przekroczenia limitu

US-010: Wyświetlanie listy obserwowanych ofert
Jako zalogowany użytkownik chcę widzieć listę wszystkich moich obserwowanych ofert, aby szybko sprawdzić zmiany cen.

Kryteria akceptacji:

- Dashboard (/dashboard) wyświetla grid kart z ofertami
- Każda karta zawiera: miniatura zdjęcia (150x100px), tytuł (max 2 linie), aktualną cenę, walutę
- Karta pokazuje zmianę ceny w % względem pierwszej ceny
- Zmiana wyświetlana jako badge: zielony dla spadków (np. "-5%"), czerwony dla wzrostów ("+3%")
- Ostatnie sprawdzenie wyświetlane jako relative time ("2 godziny temu", "wczoraj")
- Status oferty wizualizowany: active (brak oznaczenia), removed (szary + "Oferta usunięta"), error (czerwony + "Błąd")
- Sortowanie domyślnie: najnowsze najpierw
- Grid responsywny: 3 kolumny desktop, 2 tablet, 1 mobile

US-011: Usuwanie obserwowanej oferty
Jako użytkownik chcę usunąć ofertę z listy obserwowanych, aby pozbyć się nieaktualnych ogłoszeń.

Kryteria akceptacji:

- Każda karta oferty zawiera ikonę kosza w prawym górnym rogu
- Po kliknięciu system wyświetla modal: "Czy na pewno usunąć ofertę [tytuł]?"
- Przyciski: "Usuń" (czerwony), "Anuluj" (szary)
- Po potwierdzeniu system wykonuje soft delete: UPDATE user_offer SET deleted_at = NOW()
- Oferta znika z listy natychmiast
- Historia cen pozostaje w bazie (nie jest usuwana)
- Licznik aktywnych ofert zmniejsza się o 1
- System wyświetla toast: "Oferta została usunięta"

US-012: Przeglądanie szczegółów oferty
Jako użytkownik chcę zobaczyć pełne szczegóły i historię ceny oferty, aby przeanalizować zmiany.

Kryteria akceptacji:

- Kliknięcie w kartę oferty przekierowuje do /offer/[id]
- Strona wyświetla: duże zdjęcie oferty, tytuł, link "Zobacz na Otomoto" (external)
- Wykres liniowy zmian cen (full width, min 400px wysokości)
- Oś X: daty sprawdzeń, oś Y: cena w oryginalnej walucie
- Tooltip przy hover pokazuje: datę i cenę
- Poniżej wykresu tabela "Historia cen" z 10 ostatnimi wpisami
- Tabela zawiera kolumny: Data, Cena, Waluta
- Sidebar z statystykami: cena minimalna, maksymalna, średnia, liczba sprawdzeń, trend
- Przycisk "Usuń ofertę" na dole strony
- Dla ofert ze statusem "removed" banner: "Ta oferta została usunięta z Otomoto"

### 5.3 Automatyczne monitorowanie

US-013: Cykliczne sprawdzanie cen
Jako system chcę automatycznie sprawdzać ceny ofert w regularnych odstępach, aby utrzymać aktualną historię.

Kryteria akceptacji:

- Scheduled job uruchamia się co X godzin (zgodnie z globalną częstotliwością)
- Job pobiera wszystkie oferty WHERE status = 'active' AND deleted_at IS NULL
- Dla każdej oferty system pobiera HTML ze strony oferty
- System ekstrahuje cenę używając zapisanego selektora CSS/XPath
- System waliduje czy wartość to liczba > 0
- Jeśli ekstrakcja udana: INSERT INTO price_history (offer_id, price, currency, checked_at)
- System aktualizuje offers.last_checked = NOW()
- Jeśli ekstrakcja nieudana: mechanizm retry (następne US)
- Logging każdego sprawdzenia (sukces/błąd) do monitoring_log

US-014: Mechanizm retry przy błędach
Jako system chcę automatycznie ponowić próbę pobrania ceny przy błędzie, aby zwiększyć skuteczność.

Kryteria akceptacji:

- Przy błędzie ekstrakcji system czeka 1 minutę i ponawia próbę
- Przy drugiej porażce czeka 5 minut i ponawia
- Przy trzeciej porażce czeka 15 minut i ponawia
- Po 3 nieudanych próbach system zapisuje error w error_log
- System aktualizuje offers.status = 'error'
- Oferty ze statusem 'error' nie są sprawdzane w kolejnych cyklach
- W error_log zapisywane: offer_id, timestamp, error_message, attempt_number

US-015: Obsługa usuniętych ofert z Otomoto
Jako system chcę automatycznie wykrywać usunięte oferty, aby przestać je niepotrzebnie sprawdzać.

Kryteria akceptacji:

- Przy HTTP 404 lub 410 system rozpoznaje usuniętą ofertę
- System aktualizuje offers.status = 'removed'
- System NIE tworzy wpisu w price_history
- Oferty ze statusem 'removed' pomijane w kolejnych cyklach sprawdzania
- Na dashboardzie oferta ma szary badge "Oferta usunięta"
- Użytkownik może ręcznie usunąć taką ofertę z listy

US-016: Alert przy wysokim poziomie błędów
Jako deweloper chcę otrzymać alert gdy system ma problemy z pobieraniem cen, aby szybko zareagować.

Kryteria akceptacji:

- System oblicza success rate z ostatnich 24h
- Success rate = (successful_checks / total_checks) \* 100
- Przy success rate < 85% system wysyła alert
- Alert zawiera: timestamp, success rate %, liczba błędów, lista problemowych ofert
- Alert wysyłany przez email lub webhook (konfigurowalny)
- Alert wysyłany maksymalnie raz na 6h aby uniknąć spam

US-017: Konfigurowalna częstotliwość sprawdzania
Jako użytkownik chcę ustawić jak często system ma sprawdzać moje oferty, aby dostosować do moich potrzeb.

Kryteria akceptacji:

- Strona /settings zawiera dropdown "Częstotliwość sprawdzania"
- Opcje: co 6h, co 12h, co 24h (domyślne), co 48h
- Po zmianie system zapisuje user_preferences.default_frequency
- Nowe oferty dziedziczą tę częstotliwość
- Istniejące oferty zachowują swoją częstotliwość (w MVP globalna)
- System wyświetla info: "Zmiany dotyczą nowych ofert"

### 5.4 Analiza i wizualizacja

US-018: Wykres historii cen
Jako użytkownik chcę zobaczyć wykres zmian ceny oferty, aby wizualnie ocenić trend.

Kryteria akceptacji:

- Wykres liniowy (Recharts lub Chart.js) na stronie /offer/[id]
- Oś X: daty sprawdzeń w formacie DD.MM
- Oś Y: cena z walutą (np. "PLN")
- Punkty danych połączone linią
- Przy hover tooltip pokazuje: pełną datę (DD.MM.YYYY HH:mm), cenę, walutę
- Wykres responsywny (zajmuje full width kontenera)
- Minimum 400px wysokości
- Jeśli brak danych (nowa oferta) wyświetla: "Za mało danych do wykresu"

US-019: Obliczanie procentowej zmiany ceny
Jako użytkownik chcę widzieć procentową zmianę ceny, aby szybko ocenić czy oferta potaniała.

Kryteria akceptacji:

- System porównuje aktualną cenę z pierwszą ceną z historii
- Wzór: ((aktualna - początkowa) / początkowa) \* 100
- Wynik zaokrąglany do 1 miejsca po przecinku
- Spadek wyświetlany z minusem w zielonym badge (np. "-5.2%")
- Wzrost wyświetlany z plusem w czerwonym badge (np. "+3.1%")
- Brak zmiany (0%) wyświetlany w szarym badge
- Badge widoczny na karcie oferty i stronie szczegółów

US-020: Statystyki oferty
Jako użytkownik chcę zobaczyć podstawowe statystyki oferty, aby lepiej zrozumieć jej historię.

Kryteria akceptacji:

- Sidebar na stronie /offer/[id] zawiera sekcję "Statystyki"
- Wyświetlane dane: cena minimalna (z datą), cena maksymalna (z datą), cena średnia
- Liczba sprawdzeń (liczba wpisów w price_history)
- Trend: "Spadkowy" (ostatnia < pierwsza), "Wzrostowy" (ostatnia > pierwsza), "Stabilny" (różnica < 1%)
- Czas obserwacji: różnica między pierwszym a ostatnim sprawdzeniem (np. "10 dni")
- Wszystkie ceny w oryginalnej walucie

US-021: Dashboard ze statystykami globalnymi
Jako użytkownik chcę widzieć podsumowanie wszystkich ofert, aby mieć ogólny przegląd.

Kryteria akceptacji:

- Sekcja statystyk na górze /dashboard
- Wyświetlane karty: "Obserwowane oferty" (liczba aktywnych), "Średnia zmiana cen" (% across all)
- "Największy spadek" (oferta z największym spadkiem w %)
- "Największy wzrost" (oferta z największym wzrostem w %)
- Kliknięcie w "Największy spadek/wzrost" przekierowuje do tej oferty
- Statystyki aktualizowane przy każdym załadowaniu dashboardu

### 5.5 AI i ekstrakcja danych

US-022: AI-powered ekstrakcja ceny przy dodawaniu
Jako system chcę użyć AI do znalezienia ceny na stronie, aby elastycznie obsłużyć różne layouty Otomoto.

Kryteria akceptacji:

- Po pobraniu HTML system wysyła request do OpenRouter.ai
- Model: GPT-4o-mini lub Claude Haiku (tani model)
- Prompt zawiera: "Znajdź cenę na tej stronie i zwróć JSON: {price, currency, selector, confidence}"
- Timeout requestu: 30 sekund
- Jeśli response zawiera confidence >= 0.8: akceptuj wynik
- Jeśli confidence < 0.8: fallback do hardcoded patterns
- Zapisz selector w offers.selector dla przyszłych sprawdzeń
- Log kosztów API (tracking budżetu)

US-023: Fallback do hardcoded patterns
Jako system chcę mieć zapasowe metody ekstrakcji, aby działać nawet gdy AI zawiedzie.

Kryteria akceptacji:

- Lista hardcoded selektorów dla Otomoto: ['[data-testid="price"]', '.offer-price', '.price-value']
- System próbuje każdego selektora po kolei
- Pierwszy znaleziony wynik z wartością > 0 jest akceptowany
- Jeśli wszystkie zawiodą: błąd "Nie udało się znaleźć ceny"
- Zapis w error_log: offer_url, timestamp, "fallback_failed"

US-024: Walidacja ekstrakcji ceny
Jako system chcę zwalidować czy pobrana wartość to rzeczywiście cena, aby uniknąć błędnych danych.

Kryteria akceptacji:

- Wartość musi być liczbą (float lub int)
- Wartość > 0
- Wartość < 10,000,000 (sensowny zakres dla cen aut)
- Waluta musi być jedną z: PLN, EUR, USD, GBP
- Jeśli aktualna cena różni się o >50% od poprzedniej: log warning
- Warning nie blokuje zapisu, tylko informuje o anomalii

US-025: Obsługa zmian layoutu Otomoto
Jako system chcę wykryć gdy zapisany selektor przestaje działać, aby automatycznie użyć AI ponownie.

Kryteria akceptacji:

- Przy cyklicznym sprawdzaniu system używa offers.selector
- Jeśli selektor zwraca null/undefined: retry z AI
- System wysyła HTML do OpenRouter.ai ponownie
- Jeśli AI znajdzie nowy selektor: UPDATE offers.selector
- System zapisuje event w selector_changes_log
- Email do dewelopera: "Wykryto zmianę layoutu Otomoto dla offer_id X"

### 5.6 Obsługa błędów i edge cases

US-026: Obsługa różnych walut
Jako użytkownik chcę widzieć ceny w oryginalnej walucie, nawet jeśli oferta ma EUR zamiast PLN.

Kryteria akceptacji:

- System rozpoznaje waluty: PLN, EUR, USD, GBP
- Cena wyświetlana zawsze z symbolem waluty (np. "25,000 PLN", "5,000 EUR")
- Wykres pokazuje walutę na osi Y
- Jeśli waluta zmienia się między sprawdzeniami: warning banner "Uwaga: waluta uległa zmianie"
- W MVP brak automatycznej konwersji
- Statystyki (min/max/avg) pokazują walutę pierwszego wpisu

US-027: Obsługa timeout przy scrapingu
Jako system chcę obsłużyć przypadki gdy strona Otomoto nie odpowiada, aby nie blokować całego procesu.

Kryteria akceptacji:

- Request do Otomoto ma timeout 15 sekund
- Przy timeout: error logged, status pozostaje bez zmian, retry według mechanizmu US-014
- Po 3 timeout z rzędu: offers.status = 'error'
- User widzi na karcie: "Błąd pobierania danych"

US-028: Obsługa pustego stanu (brak ofert)
Jako nowy użytkownik chcę wiedzieć co zrobić gdy nie mam jeszcze ofert, aby szybko zacząć korzystać.

Kryteria akceptacji:

- Dashboard pusty wyświetla ilustrację + tekst: "Nie masz jeszcze obserwowanych ofert"
- CTA button: "Dodaj pierwszą ofertę"
- Po kliknięciu focus na polu URL input
- Tooltip pokazuje przykładowy URL: "Wklej link z Otomoto, np. https://www.otomoto.pl/..."

US-029: Obsługa błędu dodawania oferty
Jako użytkownik chcę zobaczyć jasny komunikat gdy dodawanie oferty się nie powiedzie, aby wiedzieć co dalej.

Kryteria akceptacji:

- Przy błędzie AI/scrapingu system wyświetla toast error: "Nie udało się pobrać danych z tej oferty"
- Komunikat zawiera przycisk "Spróbuj ponownie"
- Przy ponownej próbie pełny proces od początku
- Po 3 nieudanych próbach: "Sprawdź czy link jest poprawny lub spróbuj później"
- Error log zawiera: user_id, offer_url, timestamp, error_type

US-030: Landing page dla niezalogowanych
Jako niezalogowany odwiedzający chcę zrozumieć czym jest PriceHistory, aby zdecydować czy się zarejestrować.

Kryteria akceptacji:

- Landing page (/) zawiera sekcje: Hero, Problem, Solution, Jak to działa (3 kroki), Features, Pricing, FAQ
- Hero: nagłówek "Śledź historię cen ofert z Otomoto", podtytuł, CTA "Zacznij za darmo"
- Problem: opis bólu użytkownika (brak historii cen)
- Solution: krótkie wyjaśnienie jak PriceHistory pomaga
- Jak to działa: 1. Wklej URL, 2. Obserwuj zmiany, 3. Podejmij decyzję (z ikonami)
- Features: lista z ikonami (Automatyczne sprawdzanie, Wykresy zmian, Alerty cenowe\*)
- Pricing: Free tier (5 ofert) + Premium "Wkrótce" (placeholder)
- FAQ: 3-5 najczęstszych pytań

### 5.7 UX i onboarding

US-031: Onboarding tooltips dla nowego użytkownika
Jako nowy użytkownik chcę zobaczyć jak korzystać z aplikacji, aby szybko się odnaleźć.

Kryteria akceptacji:

- Po pierwszym zalogowaniu (user.is_onboarded = false) wyświetla się tooltip
- Tooltip wskazuje na pole URL input: "Zacznij od dodania linku do oferty z Otomoto"
- Przycisk "Rozumiem" zamyka tooltip
- Po dodaniu pierwszej oferty drugi tooltip: "Sprawdzimy cenę co 24h i pokażemy zmiany na wykresie"
- Po zamknięciu drugiego tooltipa: UPDATE users SET is_onboarded = true
- Możliwość pominięcia onboardingu (link "Pomiń")

US-032: Responsywność interfejsu
Jako użytkownik mobile chcę wygodnie korzystać z aplikacji na telefonie, aby sprawdzać oferty w drodze.

Kryteria akceptacji:

- Grid ofert: 3 kolumny desktop (>1024px), 2 kolumny tablet (768-1023px), 1 kolumna mobile (<767px)
- Wykres zachowuje czytelność na mobile (min 300px szerokości)
- Nawigacja mobile: hamburger menu
- Formularze responsywne (input 100% szerokości na mobile)
- Touch-friendly buttony (min 44x44px)
- Testowane na iOS Safari i Android Chrome

US-033: Loading states i feedback
Jako użytkownik chcę widzieć co się dzieje podczas operacji, aby wiedzieć że system działa.

Kryteria akceptacji:

- Przy dodawaniu oferty: spinner + tekst "Pobieram dane z Otomoto..."
- Przy ładowaniu dashboardu: skeleton cards (3 placeholders)
- Przy ładowaniu wykresu: spinner w miejscu wykresu
- Po udanym zapisie oferty: zielony toast "Oferta została dodana"
- Po usunięciu: zielony toast "Oferta została usunięta"
- Wszystkie toasty auto-dismiss po 5 sekundach

### 5.8 Administracja i monitoring

US-034: Logging operacji systemowych
Jako deweloper chcę mieć szczegółowe logi, aby debugować problemy i monitorować system.

Kryteria akceptacji:

- Tabela system_logs z kolumnami: id, timestamp, level (info/warning/error), message, context (JSON)
- Logging każdego cyklicznego sprawdzania (sukces/błąd)
- Logging błędów AI (timeout, low confidence, parse error)
- Logging rate limiting violations
- Logging zmian selektorów CSS
- Retencja logów: 30 dni, potem auto-delete

US-035: Monitoring success rate
Jako deweloper chcę monitorować skuteczność scrapingu, aby zapewnić 90% KPI.

Kryteria akceptacji:

- Dashboard admina (poza MVP, ale tabela w DB) z metrykami
- Tabela scraping_stats: date, total_checks, successful_checks, failed_checks, success_rate
- Obliczanie success_rate co godzinę: (successful / total) \* 100
- Alert email gdy success_rate < 85% w ciągu 24h
- Eksport statystyk do CSV (dla analiz)

US-036: Zarządzanie kosztami API
Jako deweloper chcę kontrolować koszty OpenRouter, aby nie przekroczyć budżetu.

Kryteria akceptacji:

- Tabela api_usage: id, timestamp, endpoint, tokens_used, cost_usd
- Zapis każdego wywołania OpenRouter z liczbą tokenów i kosztem
- Dashboard pokazuje: koszt dzienny, tygodniowy, miesięczny
- Alert gdy koszt miesięczny > $50
- Możliwość ustawienia hard limit w .env (MAX_MONTHLY_API_COST)
- Przy przekroczeniu limitu: disable AI, użyj tylko fallback patterns

## 6. Metryki sukcesu

### 6.1 Metryki techniczne (podstawowe KPI)

6.1.1 Skuteczność scrapingu

- Cel: 90% skuteczność pobierania cen i zapisywania w historii ofert
- Sposób mierzenia: (successful_checks / total_checks) \* 100 w okresie 7 dni
- Monitoring: dashboard z real-time success rate
- Alert: gdy success rate < 85% przez 24h

  6.1.2 Uptime systemu

- Cel: 99% uptime (dopuszczalne ~7h downtime miesięcznie)
- Sposób mierzenia: external monitoring (UptimeRobot, Pingdom)
- Alert: przy downtime > 5 minut

  6.1.3 Czas odpowiedzi

- Cel: 95% requestów < 2s (dashboard load), 95% requestów < 10s (dodawanie oferty z AI)
- Sposób mierzenia: server logs, Supabase analytics
- Monitoring: percentyle czasów odpowiedzi

### 6.2 Metryki użytkowania

6.2.1 Rejestracje użytkowników

- Cel MVP: 50+ aktywnych użytkowników testowych w pierwszych 2 tygodniach
- Sposób mierzenia: COUNT(users WHERE created_at > launch_date)
- Segmentacja: weryfikowani vs nieweryfikowani

  6.2.2 Aktywność użytkowników

- Średnia liczba obserwowanych ofert na użytkownika: cel 3-5 ofert
- Sposób mierzenia: AVG(COUNT(user_offer) GROUP BY user_id WHERE deleted_at IS NULL)
- Daily Active Users (DAU): użytkownicy logujący się dziennie
- Weekly Active Users (WAU): użytkownicy logujący się tygodniowo

  6.2.3 Retention rate

- Cel: 40% retention po 7 dniach, 25% retention po 30 dniach (typowe dla MVP)
- Sposób mierzenia: (users_active_day_N / users_registered_cohort) \* 100
- Cohort analysis: grupowanie użytkowników po dacie rejestracji

  6.2.4 Wykorzystanie limitów

- Odsetek użytkowników osiągających limit 5 ofert: cel >30% (oznacza zaangażowanie)
- Sposób mierzenia: COUNT(users WHERE active_offers = 5) / COUNT(users)
- Wskaźnik potential premium users

### 6.3 Metryki jakościowe

6.3.1 Skuteczność AI

- Confidence score średnia: cel >0.85
- Sposób mierzenia: AVG(ai_responses.confidence)
- Procent przypadków wymagających fallback: cel <15%

  6.3.2 Error rate

- Cel: <5% ofert ze statusem 'error' w danym momencie
- Sposób mierzenia: COUNT(offers WHERE status='error') / COUNT(offers WHERE status='active')
- Monitoring: trend errors w czasie

  6.3.3 User feedback

- Net Promoter Score (NPS): cel >30 dla MVP
- Sposób mierzenia: ankieta po 7 dniach użytkowania "Jak prawdopodobne że polecisz PriceHistory?"
- Jakościowy feedback: formularz "Zgłoś problem/sugestię"

### 6.4 Definicja sukcesu MVP

MVP uznajemy za sukces jeśli w ciągu 2 tygodni po wdrożeniu:

1. Success rate scrapingu utrzymuje się na poziomie ≥90%
2. System działa stabilnie z uptime ≥99%
3. Zarejestrowano ≥50 aktywnych użytkowników testowych
4. Średnia liczba ofert na użytkownika wynosi 3-5
5. Brak critical bugs w core flow (rejestracja, dodawanie ofert, wyświetlanie historii)
6. Retention rate po 7 dniach ≥35%
7. Pozytywny feedback od early adopters (NPS ≥30)

### 6.5 Narzędzia pomiarowe

6.5.1 Analytics

- Google Analytics 4 lub Plausible Analytics (privacy-friendly)
- Tracking eventów: signup, add_offer, view_offer, delete_offer, change_settings
- Conversion funnel: landing → signup → verify → add_first_offer

  6.5.2 Error tracking

- Sentry (free tier: 5K events/month) dla frontend i backend errors
- Source maps dla łatwiejszego debugowania
- Performance monitoring

  6.5.3 Database analytics

- Supabase built-in analytics
- Custom queries dla business metrics
- Export do Google Sheets dla raportowania

  6.5.4 Monitoring systemu

- UptimeRobot dla external uptime monitoring
- Custom dashboard dla success rate scrapingu
- Email alerts dla critical issues

### 6.6 Metryki kosztowe (kontrola budżetu)

6.6.1 Koszty operacyjne

- Cel: <$50/miesiąc w fazie MVP
- Breakdown: VPS (~$10), Supabase (free tier), OpenRouter AI (~$10-20), inne ($10)
- Monitoring: miesięczny dashboard kosztów

  6.6.2 Cost per user

- Cel: <$0.50 per active user miesięcznie w MVP
- Sposób mierzenia: total_monthly_costs / monthly_active_users
- Podstawa dla pricing modelu premium

### 6.7 Post-MVP metrics (przygotowanie na skalowanie)

6.7.1 Conversion to premium (przygotowanie)

- Tracking użytkowników próbujących dodać >5 ofert
- Kliknięcia w "Upgrade to Premium" (nawet jeśli funkcja niedostępna)
- Lista waitingowa na premium features

  6.7.2 Viral coefficient

- Odsetek użytkowników dołączających przez referencje
- Tracking UTM parameters w linku rejestracyjnym
- Przygotowanie pod program referral

  6.7.3 Feature usage

- Procent użytkowników zmieniających domyślną częstotliwość
- Najpopularniejsze przedziały czasowe (6h, 12h, 24h, 48h)
- Analiza do priorytetyzacji rozwoju
