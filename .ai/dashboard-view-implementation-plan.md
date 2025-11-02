# Plan implementacji widoku Dashboard

## 1. Przegląd
Widok Dashboard jest głównym panelem użytkownika dostępnym po zalogowaniu. Jego celem jest prezentacja kluczowych statystyk dotyczących obserwowanych ofert, wyświetlenie listy tych ofert oraz umożliwienie dodawania nowych. Widok musi być w pełni responsywny i zapewniać płynne doświadczenie użytkownika poprzez obsługę stanów ładowania i stanów pustych.

## 2. Routing widoku
Widok będzie dostępny pod ścieżką `/dashboard`. Strona `src/pages/dashboard.astro` będzie odpowiedzialna za routing, renderowanie po stronie serwera i przekazanie początkowych danych do komponentów klienckich. Dostęp do tej ścieżki będzie chroniony przez middleware aplikacji.

## 3. Struktura komponentów
Hierarchia komponentów została zaprojektowana w celu separacji odpowiedzialności i reużywalności.

```
/src/pages/dashboard.astro
└── /src/components/views/DashboardView.tsx
    ├── /src/components/dashboard/DashboardStats.tsx
    ├── /src/components/dashboard/OfferForm.tsx
    └── /src/components/dashboard/OfferGrid.tsx
        ├── (loading) => /src/components/dashboard/OfferGridSkeleton.tsx
        ├── (empty)   => /src/components/shared/EmptyState.tsx
        └── (data)    => /src/components/dashboard/OfferCard.tsx[]
```

## 4. Szczegóły komponentów

### `DashboardView.tsx`
- **Opis komponentu**: Główny komponent React po stronie klienta, który zarządza stanem całego dashboardu. Odpowiada za pobieranie danych, obsługę akcji użytkownika (dodawanie, usuwanie oferty) i przekazywanie danych do komponentów podrzędnych.
- **Główne elementy**: Kontener `div` grupujący komponenty `DashboardStats`, `OfferForm` i `OfferGrid`.
- **Obsługiwane interakcje**:
  - Inicjalne pobranie danych z API.
  - Dodawanie nowej oferty do listy po pomyślnym przesłaniu formularza.
  - Usuwanie oferty z listy (z aktualizacją optymistyczną).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `DashboardDto`, `OfferDto`.
- **Propsy**: `initialData: DashboardDto`.

### `DashboardStats.tsx`
- **Opis komponentu**: Komponent prezentacyjny, wyświetlający globalne statystyki dotyczące obserwowanych ofert, takie jak liczba aktywnych ofert, średnia zmiana ceny oraz informacja o limicie ofert.
- **Główne elementy**: Zestaw kart lub statystyk (`StatCard`) wyświetlających dane liczbowe i etykiety.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `DashboardSummaryDto`.
- **Propsy**: `summary: DashboardSummaryDto`, `offerLimit: number`.

### `OfferForm.tsx`
- **Opis komponentu**: Formularz umożliwiający użytkownikowi dodanie nowej oferty poprzez wklejenie jej adresu URL z serwisu `otomoto.pl`.
- **Główne elementy**: Element `<form>` zawierający `<input type="url">` i `<button type="submit">`.
- **Obsługiwane interakcje**:
  - Wprowadzanie tekstu w polu `input`.
  - Przesłanie formularza.
- **Obsługiwana walidacja**:
  - Pole nie może być puste.
  - Wartość musi być poprawnym adresem URL.
  - Domena adresu URL musi być `otomoto.pl`.
- **Typy**: `AddOfferCommand`, `OfferDto`.
- **Propsy**: `onOfferAdded: (newOffer: OfferDto) => void`.

### `OfferGrid.tsx`
- **Opis komponentu**: Komponent odpowiedzialny za renderowanie siatki z ofertami. Zarządza wyświetlaniem stanu ładowania (`OfferGridSkeleton`) oraz stanu pustego (`EmptyState`), gdy użytkownik nie ma żadnych obserwowanych ofert.
- **Główne elementy**: Responsywny kontener `grid` (CSS Grid), który dynamicznie renderuje komponent `OfferGridSkeleton`, `EmptyState` lub listę komponentów `OfferCard`.
- **Obsługiwane interakcje**: Brak (delegowane do `OfferCard`).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `OfferDto`.
- **Propsy**: `offers: OfferDto[]`, `isLoading: boolean`, `onDeleteOffer: (offerId: string) => void`.

### `OfferCard.tsx`
- **Opis komponentu**: Karta wyświetlająca kluczowe informacje o pojedynczej ofercie. Umożliwia nawigację do szczegółów oferty oraz jej usunięcie.
- **Główne elementy**: `<a>` lub `<Link>` owijający całą kartę dla nawigacji, `<img>` dla miniatury, elementy tekstowe dla tytułu i ceny, `Badge` dla procentowej zmiany ceny oraz `Button` z ikoną do usuwania.
- **Obsługiwane interakcje**:
  - Kliknięcie na kartę (nawigacja do `/offer/[id]`).
  - Kliknięcie na przycisk usuwania (wywołuje `onDelete`).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `OfferDto`.
- **Propsy**: `offer: OfferDto`, `onDelete: (offerId: string) => void`.

## 5. Typy
Implementacja będzie bazować na istniejących typach DTO zdefiniowanych w `src/types.ts`, które precyzyjnie odpowiadają strukturze danych z API.

- **`DashboardDto`**: Główny typ danych dla widoku.
  - `summary: DashboardSummaryDto`: Obiekt ze statystykami globalnymi.
  - `offers: OfferDto[]`: Tablica obserwowanych ofert.

- **`DashboardSummaryDto`**: Typ dla komponentu `DashboardStats`.
  - `activeCount: number`: Liczba aktywnych ofert.
  - `avgChange: number`: Średnia procentowa zmiana ceny.
  - `largestDrop: number`: Największy procentowy spadek.
  - `largestRise: number`: Największy procentowy wzrost.

- **`OfferDto`**: Typ dla pojedynczej oferty w komponencie `OfferCard`.
  - `id, title, url, imageUrl, city, status, lastChecked, currentPrice, currency, percentChangeFromFirst, percentChangeFromPrevious`.

## 6. Zarządzanie stanem
Stan będzie zarządzany lokalnie w komponencie `DashboardView.tsx` przy użyciu standardowych hooków React (`useState`, `useCallback`).

- **Zmienne stanu**:
  - `dashboardData (useState<DashboardDto | null>)`: Przechowuje dane pobrane z API (statystyki i listę ofert).
  - `isLoading (useState<boolean>)`: Flaga określająca, czy dane są w trakcie ładowania.
  - `error (useState<string | null>)`: Przechowuje komunikaty o błędach.

- **Logika**:
  - Komponent `DashboardView` będzie zawierał funkcje `handleAddOffer` i `handleDeleteOffer`.
  - `handleDeleteOffer` zaimplementuje aktualizację optymistyczną, natychmiast usuwając ofertę z lokalnego stanu i wysyłając żądanie do API w tle. W przypadku błędu, stan zostanie przywrócony, a użytkownik poinformowany.

## 7. Integracja API
Komponenty będą komunikować się z backendem poprzez następujące punkty końcowe:

- **`GET /api/dashboard`**:
  - **Cel**: Pobranie początkowych danych dla dashboardu.
  - **Wywołanie**: W `DashboardView.tsx` przy użyciu `fetch` lub biblioteki klienckiej (np. `tanstack-query`).
  - **Typ odpowiedzi**: `DashboardDto`.

- **`POST /api/offers`**:
  - **Cel**: Dodanie nowej oferty.
  - **Wywołanie**: W `OfferForm.tsx` po przesłaniu formularza.
  - **Typ żądania**: `AddOfferCommand` (`{ url: string }`).
  - **Typ odpowiedzi**: `AddOfferResponseDto`.

- **`DELETE /api/offers/[id]`**:
  - **Cel**: Usunięcie obserwowanej oferty.
  - **Wywołanie**: W `DashboardView.tsx` po wywołaniu `handleDeleteOffer`.
  - **Typ odpowiedzi**: `204 No Content`.

## 8. Interakcje użytkownika
- **Dodawanie oferty**: Użytkownik wkleja URL w formularzu i klika "Dodaj". Przycisk jest blokowany na czas przetwarzania, a po sukcesie nowa oferta pojawia się na liście.
- **Usuwanie oferty**: Użytkownik klika ikonę kosza na karcie oferty. Wyświetla się modal z prośbą o potwierdzenie. Po potwierdzeniu, oferta natychmiast znika z UI (aktualizacja optymistyczna), a w tle wysyłane jest żądanie usunięcia.
- **Przeglądanie szczegółów**: Kliknięcie dowolnego miejsca na karcie oferty (poza przyciskiem usuwania) przenosi użytkownika na stronę `/offer/[id]`.
- **Odświeżanie danych**: Odświeżenie strony powoduje ponowne pobranie aktualnych danych z serwera.

## 9. Warunki i walidacja
- **Formularz dodawania oferty (`OfferForm.tsx`)**:
  - Wartość w polu `input` musi być niepusta.
  - Wartość musi być poprawnym formalnie adresem URL.
  - Adres URL musi pochodzić z domeny `otomoto.pl`.
  - W przypadku niespełnienia warunków, przycisk "Dodaj" jest nieaktywny lub wyświetlany jest komunikat błędu pod polem `input`.

## 10. Obsługa błędów
- **Błąd pobierania danych (`GET /api/dashboard`)**: Jeśli wystąpi błąd serwera (np. status 500), `OfferGrid` wyświetli komunikat o błędzie zamiast szkieletu lub ofert.
- **Błąd dodawania oferty (`POST /api/offers`)**: W przypadku błędu (np. przekroczenie limitu, błąd scrapingu), użytkownik zobaczy powiadomienie "toast" z informacją o przyczynie niepowodzenia.
- **Błąd usuwania oferty (`DELETE /api/offers/[id]`)**: Jeśli aktualizacja optymistyczna się nie powiedzie, usunięta oferta zostanie przywrócona na liście, a użytkownik zobaczy powiadomienie "toast" z informacją o błędzie.

## 11. Kroki implementacji
1.  **Utworzenie struktury plików**: Stworzenie wszystkich wymaganych plików komponentów (`DashboardView.tsx`, `DashboardStats.tsx`, etc.) oraz strony `dashboard.astro`.
2.  **Implementacja strony Astro (`dashboard.astro`)**: Dodanie logiki pobierania danych po stronie serwera i przekazanie ich jako `initialData` do `DashboardView`.
3.  **Implementacja `DashboardView.tsx`**: Stworzenie głównego komponentu, implementacja zarządzania stanem (`useState`) i logiki pobierania danych.
4.  **Stworzenie komponentów prezentacyjnych**: Implementacja `DashboardStats.tsx`, `OfferGridSkeleton.tsx` i `EmptyState.tsx`.
5.  **Implementacja `OfferGrid.tsx` i `OfferCard.tsx`**: Stworzenie siatki i karty oferty, w tym responsywności i warunkowego renderowania na podstawie stanu (`isLoading`, `offers.length`).
6.  **Implementacja `OfferForm.tsx`**: Zbudowanie formularza wraz z walidacją po stronie klienta i logiką wysyłania żądania `POST`.
7.  **Połączenie logiki**: Implementacja funkcji `handleAddOffer` i `handleDeleteOffer` w `DashboardView` i przekazanie ich jako propsy do komponentów podrzędnych.
8.  **Obsługa usuwania**: Dodanie modala potwierdzającego usunięcie oraz implementacja logiki aktualizacji optymistycznej.
9.  **Styling i UX**: Dopracowanie stylów za pomocą Tailwind CSS, dodanie animacji, stanów `:focus` dla dostępności oraz implementacja powiadomień "toast".
10. **Testowanie**: Przetestowanie wszystkich interakcji, stanów (ładowania, pusty, błędu) oraz responsywności na różnych urządzeniach.
