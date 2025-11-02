# API Endpoint Implementation Plan: POST /offers

## 1. Przegląd punktu końcowego
Dodaje nową subskrypcję oferty Otomoto.pl dla uwierzytelnionego użytkownika. Endpoint ekstrahuje dane oferty (tytuł, obraz, cena, miasto) ze strony Otomoto.pl i tworzy nowy wpis w bazie danych.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/api/offers`
- Nagłówki:
  - `Authorization: Bearer <token>` – wymagany JWT
  - `Content-Type: application/json`
- Body:
  ```json
  {
    "url": "https://otomoto.pl/..."
  }
  ```

## 3. Wykorzystywane typy
- `AddOfferCommand` (src/types.ts) – { url: string }
- `AddOfferResponseDto` (src/types.ts) – { id: number, message: string }

## 4. Szczegóły odpowiedzi
- Kod 201 Created
- Body:
  ```json
  {
    "id": 123,
    "message": "Offer added"
  }
  ```
- Potencjalne kody błędów:
  - 400 Bad Request – nieprawidłowy URL lub błąd ekstrakcji danych
  - 409 Conflict – URL już subskrybowany przez użytkownika
  - 429 Too Many Requests – przekroczono limit aktywnych subskrypcji (5) lub dzienny limit dodawania (10)
  - 500 Internal Server Error – nieoczekiwany błąd serwera

## 5. Przepływ danych
1. **Middleware** w `src/middleware/index.ts` weryfikuje JWT i ustawia `locals.supabase` i `locals.current_user_id`.

2. **Handler POST /api/offers**:
   - Odczyt body z `request.json()`.
   - Walidacja przy użyciu Zod: `url` musi być prawidłowym URL-em *.otomoto.pl.
   - Wywołanie `OfferService.add(currentUserId, url)`.

3. **OfferService.add** (w `src/lib/services/offer.service.ts`):
   a. **Walidacja URL**:
      - Sprawdzenie formatu URL (musi zawierać `otomoto.pl`).
      - Reject jeśli URL nieprawidłowy → 400 Bad Request.
   
   b. **Sprawdzenie limitów**:
      - Liczba aktywnych subskrypcji użytkownika (user_offer.deleted_at = null).
      - Jeśli >= 5 → 429 Too Many Requests.
      - Database trigger sprawdzi również limit 10/24h (enforce_offer_addition_limit).
   
   c. **Sprawdzenie duplikatu**:
      - Query do `offers` po `url`.
      - Jeśli istnieje offer_id:
        - Sprawdź czy user_offer(user_id, offer_id) istnieje i deleted_at = null → 409 Conflict.
        - Jeśli deleted_at != null → reaktywuj (UPDATE deleted_at = NULL) → zwróć 201.
        - Jeśli nie ma user_offer → utwórz wpis w user_offer → zwróć 201.
   
   d. **Ekstrakcja danych z Otomoto.pl** (jeśli offer nie istnieje):
      - Fetching HTML ze strony URL.
      - Ekstrakcja danych:
        - `title` – np. z `<h1>` lub meta tag
        - `image_url` – pierwszy obraz galerii
        - `price` – cena oferty
        - `currency` – domyślnie PLN
        - `city` – lokalizacja
        - `selector` – CSS selector do ceny (może być domyślny)
      - Jeśli ekstrakcja się nie powiedzie → 400 Bad Request z opisem błędu.
   
   e. **Zapis do bazy**:
      - INSERT do `offers` (url, title, image_url, selector, city, status='active', frequency='24h').
      - INSERT do `user_offer` (user_id, offer_id).
      - INSERT do `price_history` (offer_id, price, currency, checked_at=now()).
      - Wszystko w transakcji Supabase.
   
   f. **Zwrot odpowiedzi**:
      - `{ id: offer_id, message: "Offer added" }`.

4. Handler formatuje odpowiedź 201 Created i zwraca ją klientowi.

## 6. Względy bezpieczeństwa
- **Autoryzacja**: Middleware weryfikuje JWT.
- **RLS**: Row-Level Security w Supabase.
- **Walidacja URL**: Tylko domeny *.otomoto.pl.
- **Rate limiting**: 
  - 5 aktywnych subskrypcji (sprawdzane w serwisie).
  - 10 dodań/24h (trigger w bazie: `enforce_offer_addition_limit`).
- **SSRF Protection**: Fetching tylko z otomoto.pl (whitelist).
- **SQL Injection**: Parametryzowane zapytania Supabase.

## 7. Obsługa błędów
| Kod  | Scenariusz                                    | Działanie                                  |
|------|-----------------------------------------------|--------------------------------------------|
| 400  | Nieprawidłowy URL lub błąd ekstrakcji         | Zwraca szczegóły błędu                      |
| 409  | URL już subskrybowany przez użytkownika       | Zwraca `{ error: "Offer already subscribed" }` |
| 429  | Limit aktywnych subskrypcji (5) lub 10/24h    | Zwraca `{ error: "Rate limit exceeded" }`   |
| 500  | Błąd zapytania do Supabase lub nieoczekiwany  | Loguje błąd, zwraca `Internal Server Error` |

## 8. Rozważania dotyczące wydajności
- **Caching**: Można cache'ować wyniki ekstrakcji dla tego samego URL (np. 5 minut).
- **Timeout**: Ustawić timeout na fetch HTML (np. 10 sekund).
- **Asynchroniczność**: Ekstrakcja może być asynchroniczna (queue) jeśli trwa długo.
- **Fallback selectors**: Lista selektorów CSS na wypadek zmiany struktury strony.

## 9. Kroki implementacji

### ✅ Krok 1: Utworzyć Zod schema dla POST body
- ✅ Dodano `AddOfferCommandSchema` w `src/pages/api/offers.ts`.
- ✅ Walidacja:
  - `url`: string, required, must be valid URL and contain `otomoto.pl`.

### ✅ Krok 2: Dodać handler POST do `src/pages/api/offers.ts`
- ✅ Odczyt body z `request.json()` z error handling.
- ✅ Walidacja z Zod (400 przy błędzie).
- ✅ Wywołanie `OfferService.add(currentUserId, url)`.
- ✅ Zwrot `AddOfferResponseDto` z kodem 201.
- ✅ Obsługa błędów: 400, 409, 429, 500.

### ✅ Krok 3: Implementacja `OfferService.add` w `src/lib/services/offer.service.ts`
- ✅ Sprawdzenie limitów (5 aktywnych, trigger sprawdzi 10/24h).
- ✅ Sprawdzenie duplikatu URL.
- ✅ Jeśli offer istnieje:
  - ✅ Sprawdź user_offer → conflict, reaktywacja, lub nowa subskrypcja.
  - ✅ **WAŻNE**: Obsługa ofert przypisanych do innych użytkowników.
- ✅ Jeśli offer nie istnieje:
  - ✅ Ekstrakcja danych (scraping z cheerio).
  - ✅ INSERT offers, user_offer, price_history.
  - ✅ Transaction cleanup przy błędach.

### ✅ Krok 4: Dodać funkcję scraping/ekstrakcji
- ✅ Utworzono metodę `extractOfferData()` w `OfferService`.
- ✅ Fetch HTML z URL (10s timeout, User-Agent spoofing).
- ✅ Parse HTML z cheerio.
- ✅ Ekstrakcja z fallback selectors:
  - ✅ title (3 fallbacks)
  - ✅ image_url (3 fallbacks)
  - ✅ price (3 fallbacks + parsing + validation)
  - ✅ currency (detection: PLN/EUR/USD)
  - ✅ city (4 fallbacks + cleanup)
  - ✅ selector (automatic detection)

### ✅ Krok 5: Rate limiting
- ✅ Sprawdzanie 5 aktywnych subskrypcji w service.
- ✅ Database trigger `enforce_offer_addition_limit` sprawdza 10/24h.

### ✅ Krok 6: Dokumentacja i linter
- ✅ Aktualizacja README.md (dodano sekcję POST /api/offers).
- ✅ Aktualizacja api-plan.md (✅ IMPLEMENTED).
- ✅ Utworzono POST-offers-implementation-summary.md.
- ✅ Uruchomienie `eslint --fix` - 0 errors, 15 warnings (console.log).

## ✅ IMPLEMENTATION COMPLETE

Wszystkie kroki zrealizowane zgodnie z planem. Endpoint POST /api/offers jest w pełni funkcjonalny.

## 10. Uwagi implementacyjne
- **Ekstrakcja danych**: W pierwszej wersji można użyć prostych selektorów CSS lub mock data.
- **Selector**: Domyślny selector np. `.offer-price__number` lub podobny.
- **Error handling**: Szczegółowe komunikaty błędów dla łatwiejszego debugowania.
- **Transaction**: Użyć RPC lub wielu zapytań w transakcji (Supabase ma ograniczone wsparcie dla transakcji klient-side).

