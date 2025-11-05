# API Endpoint Implementation Plan: GET /offers

## 1. Przegląd punktu końcowego

Zwraca listę aktywnych subskrypcji ofert Otomoto.pl dla uwierzytelnionego użytkownika wraz z obsługą paginacji i sortowania.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/offers`
- Nagłówki:
  - `Authorization: Bearer <token>` – wymagany JWT
- Parametry zapytania:
  - page (opcjonalny, integer, domyślnie 1) – numer strony, >=1
  - size (opcjonalny, integer, domyślnie 10) – liczba elementów na stronie, >=1, <=100
  - sort (opcjonalny, string, domyślnie `created_at`) – nazwa kolumny sortowania: `created_at`, `last_checked`, `title`

## 3. Wykorzystywane typy

- OfferDto (src/types.ts) – reprezentacja pojedynczej oferty
- PaginatedDto<OfferDto> (src/types.ts) – wrapper paginacyjny
- Brak Command Model – zapytanie bez ciała

## 4. Szczegóły odpowiedzi

- Kod 200 OK
- Body:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "string",
        "url": "https://otomoto.pl/...",
        "imageUrl": "string",
        "city": "string",
        "status": "active",
        "lastChecked": "2025-10-11T12:00:00Z",
        "currentPrice": 12345.67,
        "currency": "PLN",
        "percentChangeFromFirst": -5.2,
        "percentChangeFromPrevious": 1.1
      }
    ],
    "page": 1,
    "size": 10,
    "total": 42
  }
  ```
- Potencjalne kody błędów:
  - 400 Bad Request – nieprawidłowe parametry query
  - 401 Unauthorized – brak lub nieprawidłowy token
  - 500 Internal Server Error – nieoczekiwany błąd serwera

## 5. Przepływ danych

1. **Middleware** w `src/middleware/index.ts` weryfikuje JWT i ustawia `locals.supabase` i `locals.current_user_id`.
2. **Handler GET /api/offers**:
   - Odczyt parametrów `page`, `size`, `sort` z `request.url.searchParams`.
   - Walidacja przy użyciu Zod: `page` i `size` >=1; `sort` ∈ [`created_at`, `last_checked`, `title`].
   - Wywołanie `OfferService.list(currentUserId, page, size, sort)`.
3. **OfferService.list** (w `src/lib/services/offer.service.ts`):
   - Zapytanie do Supabase:
     ```ts
     const query = supabase
       .from("offers")
       .select(`*, user_offer(user_id,deleted_at)`, { count: "exact" })
       .eq("user_offer.user_id", userId)
       .is("user_offer.deleted_at", null)
       .order(sort, { ascending: false })
       .range((page - 1) * size, page * size - 1);
     ```
   - Obliczenie dla każdego wiersza `currentPrice`, `percentChangeFromFirst`, `percentChangeFromPrevious` (można rozszerzyć zapytanie lub liczyć w JS).
   - Zwrócenie obiektu `{ data: OfferDto[], page, size, total }`.
4. Handler formatuje odpowiedź i zwraca ją klientowi.

## 6. Względy bezpieczeństwa

- **Autoryzacja** i **RLS**: Supabase Row-Level Security zapewnia dostęp tylko do `user_offer` użytkownika.
- Zapytania Supabase używają parametrów, co chroni przed SQL injection.
- Brak operacji SSRF ani wywołań zewnętrznych.

## 7. Obsługa błędów

| Kod | Scenariusz                                   | Działanie                                   |
| --- | -------------------------------------------- | ------------------------------------------- |
| 400 | Nieprawidłowe lub brakujące parametry query  | Zwraca szczegóły walidacji Zod              |
| 401 | Brak / nieprawidłowy JWT                     | Zwraca `Unauthorized`                       |
| 500 | Błąd zapytania do Supabase lub nieoczekiwany | Loguje błąd, zwraca `Internal Server Error` |

## 8. Rozważania dotyczące wydajności

- Korzystanie z indeksów: `idx_user_offer_user_deleted`, `idx_offers_status_checked`.
- Limit/offset na bazie danych; rozważ paginację kursorem dla dużych zestawów.
- Możliwość cachowania odpowiedzi na warstwie frontendowej lub CDN.

## 9. Kroki implementacji

### ✅ Completed Steps:

1. ✅ **Utworzyć plik `src/pages/api/offers.ts`**
   - Zaimportowano `supabase` z `context.locals`
   - Użyto `DEFAULT_USER_ID` zamiast JWT (auth zostanie dodany później)

2. ✅ **Zdefiniować Zod schema dla parametrów query**
   - `page`: coerce.number().int().min(1).default(1)
   - `size`: coerce.number().int().min(1).max(100).default(10)
   - `sort`: enum(['created_at', 'last_checked', 'title']).default('created_at')

3. ✅ **Implementować handler GET**
   - Wyciągnięto `current_user_id` z locals
   - Walidacja query z Zod (400 przy błędzie)
   - Wywołanie `OfferService.list()`
   - Zwrot `PaginatedDto<OfferDto>` z kodem 200

4. ✅ **Dodać `OfferService.list` w `src/lib/services/offer.service.ts`**
   - Zapytanie Supabase z join `user_offer`
   - **OPTYMALIZACJA**: Batch fetching price_history (1 query zamiast N+1)
   - Grupowanie historii cen po offer_id
   - Obliczanie: currentPrice, percentChangeFromFirst, percentChangeFromPrevious
   - Mapowanie do OfferDto

5. ✅ **Uaktualnić dokumentację**
   - README.md: Dodano sekcję "API Documentation" z przykładami
   - api-plan.md: Oznaczono GET /offers jako ✅ IMPLEMENTED
   - Utworzono offers-implementation-summary.md z pełną dokumentacją

6. ✅ **Uruchomić `eslint --fix`**
   - 0 błędów
   - 3 ostrzeżenia (console.log dla error logging - akceptowalne)

### 📊 Implementation Summary:

- **Files Created**: 3 (offers.ts, offer.service.ts, implementation-summary.md)
- **Files Modified**: 5 (middleware, env.d.ts, supabase.client.ts, README.md, api-plan.md)
- **Performance**: Optimized from N+1 to 2 queries
- **Status**: COMPLETED ✅
