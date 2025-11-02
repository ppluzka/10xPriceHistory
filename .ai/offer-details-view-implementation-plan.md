# Plan implementacji widoku Szczegóły Oferty

## 1. Przegląd
Widok "Szczegóły Oferty" jest dedykowaną stroną do prezentacji szczegółowych informacji o jednej, obserwowanej przez użytkownika ofercie. Głównym celem jest wizualizacja historii zmian cen oraz dostarczenie kluczowych statystyk, które pomogą użytkownikowi w podjęciu decyzji zakupowej. Widok będzie składał się z nagłówka z podstawowymi danymi, interaktywnego wykresu cen, tabelarycznej historii cen oraz panelu ze statystykami.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką:
-   `/offer/[id]`
Gdzie `[id]` jest unikalnym identyfikatorem oferty. Dostęp do tej ścieżki będzie chroniony przez middleware, zapewniając, że tylko zalogowani użytkownicy, którzy subskrybują daną ofertę, mogą ją wyświetlić.

## 3. Struktura komponentów
Struktura zostanie zaimplementowana w podejściu hybrydowym z wykorzystaniem Astro do renderowania po stronie serwera (SSR) i React do części interaktywnych po stronie klienta.

```
- /src/pages/offer/[id].astro         (Strona renderowana serwerowo)
  - /src/layouts/Layout.astro         (Główny layout aplikacji)
    - /src/components/offer/OfferDetailsPage.tsx (Główny komponent React, client:visible)
      - /src/components/offer/OfferHeader.tsx
      - /src/components/offer/PriceHistoryChart.tsx
      - /src/components/offer/PriceHistoryTable.tsx
      - /src/components/offer/OfferStats.tsx
```

## 4. Szczegóły komponentów

### `[id].astro`
-   **Opis komponentu:** Strona Astro odpowiedzialna za obsługę routingu, pobranie danych początkowych z API po stronie serwera (`GET /api/offers/[id]` i `GET /api/offers/[id]/history`) oraz renderowanie głównego komponentu React (`OfferDetailsPage`), przekazując mu pobrane dane jako `initialData`. Obsługuje również błędy na poziomie serwera (np. 404 Not Found).
-   **Główne elementy:** Sekcja `frontmatter` do pobierania danych, renderowanie komponentu `<OfferDetailsPage client:visible />` z propsami.
-   **Obsługiwane zdarzenia:** Brak (renderowanie serwerowe).
-   **Warunki walidacji:** Weryfikacja odpowiedzi z API. W przypadku błędu (np. status 404 lub 500), strona zwróci odpowiedni kod błędu HTTP.
-   **Typy:** `OfferDetailDto`, `PaginatedDto<PriceHistoryDto>`.
-   **Propsy:** Brak.

### `OfferDetailsPage.tsx`
-   **Opis komponentu:** Główny kontener dla widoku szczegółów oferty po stronie klienta. Inicjalizuje `TanStack Query` z danymi `initialData` otrzymanymi z Astro. Zarządza głównym układem strony (np. siatka CSS dla treści i paska bocznego) i dystrybuuje dane do komponentów podrzędnych. Odpowiada za renderowanie warunkowe w zależności od stanu oferty (np. `removed`, `error`) oraz stanu ładowania/błędu z `TanStack Query`.
-   **Główne elementy:** `div` jako kontener siatki, komponenty `OfferHeader`, `PriceHistoryChart`, `PriceHistoryTable`, `OfferStats`. Może renderować komponenty `LoadingSpinner` lub `ErrorMessage`.
-   **Obsługiwane zdarzenia:** Brak.
-   **Warunki walidacji:** Sprawdza `offer.status`, aby wyświetlić odpowiednie komunikaty (np. baner "Oferta została usunięta").
-   **Typy:** `OfferDetailDto`, `PaginatedDto<PriceHistoryDto>`.
-   **Propsy:** `initialOffer: OfferDetailDto`, `initialHistory: PaginatedDto<PriceHistoryDto>`.

### `OfferHeader.tsx`
-   **Opis komponentu:** Wyświetla kluczowe, nagłówkowe informacje o ofercie.
-   **Główne elementy:** Komponent `Image` (lub `<img>`) na zdjęcie, `h1` na tytuł, `p` na miasto, `a` jako link do oryginalnej oferty na Otomoto, oraz komponenty `Badge` (z Shadcn/ui) do wyświetlania procentowych zmian cen.
-   **Obsługiwane zdarzenia:** Kliknięcie w link do Otomoto (otwarcie w nowej karcie).
-   **Warunki walidacji:** Brak.
-   **Typy:** `OfferHeaderViewModel`.
-   **Propsy:** `data: OfferHeaderViewModel`.

### `OfferStats.tsx`
-   **Opis komponentu:** Panel boczny (sidebar) prezentujący zagregowane statystyki cenowe.
-   **Główne elementy:** `aside` lub `div` jako kontener. Lista (`ul`/`li`) lub seria `div` do wyświetlania każdej statystyki (np. "Cena minimalna", "Trend"). Użycie komponentów `Card` z Shadcn/ui do opakowania statystyk.
-   **Obsługiwane zdarzenia:** Brak.
-   **Warunki walidacji:** Brak.
-   **Typy:** `OfferStatsViewModel`.
-   **Propsy:** `stats: OfferStatsViewModel`.

### `PriceHistoryChart.tsx`
-   **Opis komponentu:** Interaktywny wykres liniowy historii cen, zaimplementowany przy użyciu biblioteki `Recharts`.
-   **Główne elementy:** Komponenty `LineChart`, `XAxis`, `YAxis`, `Tooltip`, `Line` z `Recharts`. Wyświetla komunikat, jeśli jest za mało danych do narysowania wykresu.
-   **Obsługiwane zdarzenia:** Hover na punktach danych w celu wyświetlenia `Tooltip`.
-   **Warunki walidacji:** Sprawdza, czy liczba punktów danych jest mniejsza niż 2. Jeśli tak, wyświetla komunikat "Za mało danych do wygenerowania wykresu".
-   **Typy:** `PriceHistoryChartViewModel[]`.
-   **Propsy:** `data: PriceHistoryChartViewModel[]`.

### `PriceHistoryTable.tsx`
-   **Opis komponentu:** Tabela prezentująca historię cen jako alternatywa dla wykresu, co jest istotne dla dostępności.
-   **Główne elementy:** Komponenty `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` z Shadcn/ui. Kolumny: Data sprawdzenia, Cena, Waluta.
-   **Obsługiwane zdarzenia:** Brak w MVP (w przyszłości: obsługa paginacji).
-   **Warunki walidacji:** Sprawdza, czy istnieją dane historyczne. Jeśli nie, wyświetla komunikat "Brak historii cen".
-   **Typy:** `PriceHistoryDto[]`.
-   **Propsy:** `history: PriceHistoryDto[]`.

## 5. Typy

Do implementacji widoku, oprócz istniejących DTO (`OfferDetailDto`, `PriceHistoryDto`), zostaną stworzone dedykowane ViewModels, aby oddzielić logikę przygotowania danych od komponentów.

```typescript
// DTO (istniejące)
import { OfferDetailDto, PriceHistoryDto } from '../types';

// ----- ViewModels (do stworzenia) -----

/**
 * Propsy dla komponentu OfferHeader.tsx
 */
export interface OfferHeaderViewModel {
  title: string;
  imageUrl: string | null;
  url: string;
  city: string | null;
  percentChangeFromFirst: number;
  percentChangeFromPrevious: number;
}

/**
 * Propsy dla komponentu OfferStats.tsx
 */
export interface OfferStatsViewModel {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  checkCount: number;
  trend: 'wzrostowy' | 'spadkowy' | 'stabilny';
  observationDurationDays: number;
}

/**
 * Model danych dla komponentu PriceHistoryChart.tsx
 */
export interface PriceHistoryChartViewModel {
  date: string;         // Format "DD.MM" dla osi X
  fullDate: string;     // Format "DD.MM.YYYY HH:mm" dla tooltipa
  price: number;
  currency: string;
}
```

## 6. Zarządzanie stanem
Zarządzanie stanem danych z serwera będzie realizowane przez **TanStack Query**.

-   **Inicjalizacja:** Dane pobrane serwerowo w `[id].astro` zostaną przekazane jako `initialData` do hooków `useQuery`. To zapobiegnie ponownemu zapytaniu po stronie klienta przy pierwszym renderowaniu.
-   **Custom Hook (`useOfferData`):** Zostanie stworzony customowy hook, który będzie enkapsulował logikę pobierania danych o ofercie i jej historii.
    -   Będzie zawierał dwa wywołania `useQuery` (dla szczegółów i historii).
    -   Będzie zawierał logikę transformacji DTO na ViewModels przy użyciu `useMemo`, aby zoptymalizować renderowanie.
    -   Zwróci prosty interfejs: `{ offer, history, stats, chartData, isLoading, isError }`.
    -   Dzięki temu komponent `OfferDetailsPage` pozostanie czysty i odpowiedzialny tylko za renderowanie.

## 7. Integracja API
Integracja opiera się na dwóch istniejących endpointach API:

1.  **Szczegóły oferty:**
    -   **Endpoint:** `GET /api/offers/{id}`
    -   **Żądanie:** Brak ciała. `id` przekazywane w ścieżce.
    -   **Odpowiedź (200 OK):** `OfferDetailDto`
2.  **Historia cen:**
    -   **Endpoint:** `GET /api/offers/{id}/history`
    -   **Żądanie:** Parametry query: `page`, `size`. Aby pobrać całą historię dla wykresu, zostanie wykonane zapytanie z dużym `size`, np. `?size=1000`.
    -   **Odpowiedź (200 OK):** `PaginatedDto<PriceHistoryDto>`

Pobieranie danych odbędzie się jednorazowo po stronie serwera w pliku `[id].astro`. `TanStack Query` będzie zarządzać odświeżaniem danych po stronie klienta (np. przy ponownym focusie na okno przeglądarki).

## 8. Interakcje użytkownika
-   **Najechanie na wykres:** Użytkownik najeżdżając kursorem na dowolny punkt na wykresie, zobaczy `tooltip` z dokładną datą sprawdzenia, ceną i walutą.
-   **Kliknięcie linku "Zobacz na Otomoto":** Użytkownik zostanie przeniesiony do oryginalnego ogłoszenia w nowej karcie przeglądarki.
-   **Przewijanie strony:** Pasek boczny ze statystykami (`OfferStats`) może być "przyklejony" (sticky) na większych ekranach, aby był zawsze widoczny podczas przewijania historii w tabeli.

## 9. Warunki i walidacja
-   **Status oferty:** Komponent `OfferDetailsPage` sprawdzi pole `status` z `OfferDetailDto`. Jeśli status to `removed` lub `error`, wyświetli odpowiedni baner informacyjny zamiast standardowego widoku.
-   **Dostępność danych dla wykresu:** Komponent `PriceHistoryChart` sprawdzi, czy tablica z danymi historycznymi zawiera co najmniej dwa punkty. Jeśli nie, wyświetli komunikat o braku wystarczającej ilości danych.
-   **Dostępność danych dla tabeli:** Komponent `PriceHistoryTable` sprawdzi, czy tablica z danymi jest pusta i w takim przypadku wyświetli stosowny komunikat.

## 10. Obsługa błędów
-   **Błąd po stronie serwera (np. oferta nie istnieje, 404):** Plik `[id].astro` przechwyci błąd podczas `fetch` i zwróci odpowiednią stronę błędu Astro (np. `404.astro`) z poprawnym kodem statusu HTTP. Użytkownik nie zobaczy w ogóle interfejsu React.
-   **Błąd po stronie klienta (np. błąd sieci podczas odświeżania danych):** Hook `useQuery` z `TanStack Query` przechwyci błąd. Główny komponent `OfferDetailsPage` użyje zwróconego stanu `isError` do wyświetlenia generycznego komponentu `ErrorMessage`, informującego o problemie z odświeżeniem danych.

## 11. Kroki implementacji
1.  **Stworzenie struktury plików:** Utworzenie plików `[id].astro` oraz komponentów React: `OfferDetailsPage.tsx`, `OfferHeader.tsx`, `OfferStats.tsx`, `PriceHistoryChart.tsx`, `PriceHistoryTable.tsx`.
2.  **Implementacja `[id].astro`:** Dodanie logiki pobierania danych w `frontmatter` dla szczegółów oferty i jej historii. Przekazanie pobranych danych jako propsy do `OfferDetailsPage`.
3.  **Definicja typów ViewModel:** Zdefiniowanie interfejsów `OfferHeaderViewModel`, `OfferStatsViewModel` i `PriceHistoryChartViewModel` w dedykowanym pliku lub w pliku komponentu `OfferDetailsPage`.
4.  **Stworzenie hooka `useOfferData`:** Zaimplementowanie hooka, który przyjmuje `initialData` i zawiera logikę `useQuery` oraz transformację DTO na ViewModels.
5.  **Implementacja `OfferDetailsPage.tsx`:** Stworzenie głównego layoutu, użycie hooka `useOfferData` i przekazanie danych do komponentów-dzieci. Dodanie obsługi stanów `isLoading`, `isError` oraz statusu oferty.
6.  **Implementacja komponentów `OfferHeader` i `OfferStats`:** Stworzenie statycznych komponentów, które przyjmują `ViewModel` jako propsy i renderują dane.
7.  **Implementacja `PriceHistoryChart.tsx`:** Instalacja i konfiguracja `Recharts`. Stworzenie wykresu liniowego zgodnie ze specyfikacją (osie, linia, tooltip). Dodanie obsługi braku wystarczającej ilości danych.
8.  **Implementacja `PriceHistoryTable.tsx`:** Użycie komponentów `Table` z Shadcn/ui do zbudowania tabeli z historią cen.
9.  **Stylowanie i responsywność:** Zastosowanie klas Tailwind CSS do ostylowania wszystkich komponentów i zapewnienia, że widok jest w pełni responsywny na różnych urządzeniach.
10. **Testowanie manualne:** Weryfikacja wszystkich historyjek użytkownika (US-012, US-018, US-019, US-020), obsługa błędów i przypadków brzegowych.
