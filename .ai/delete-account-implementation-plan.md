# API Endpoint Implementation Plan: POST /auth/delete-account

## 1. Przegląd punktu końcowego

Endpoint `/api/auth/delete-account` umożliwia użytkownikowi trwałe usunięcie swojego konta. Operacja jest nieodwracalna i wymaga potwierdzenia przez wpisanie tekstu "USUŃ". Po usunięciu konta:

- Wszystkie subskrypcje ofert użytkownika są soft-delete'owane (ustawiane `deleted_at` w tabeli `user_offer`)
- Email w `auth.users` jest anonimizowany do formatu `deleted_{timestamp}@deleted.com`
- Hasło jest usuwane z `auth.users`
- Wszystkie dane osobowe są czyszczone
- Historia cen jest zachowana dla celów analitycznych
- Operacja jest logowana do `system_logs` dla audytu
- Użytkownik jest automatycznie wylogowywany po zakończeniu operacji

**Bezpieczeństwo**: Funkcja bazy danych `delete_user_account()` używa `auth.uid()` do zapewnienia, że użytkownik może usunąć tylko swoje własne konto.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/auth/delete-account`
- **Wymagane nagłówki**:
  - `Content-Type: application/json`
  - Cookies: Sesja Supabase Auth (automatycznie obsługiwana przez middleware)
- **Parametry**: Brak parametrów URL
- **Request Body**:
  ```json
  {
    "confirmation": "USUŃ"
  }
  ```
  - `confirmation` (string, wymagane): Musi być dokładnie równy "USUŃ" (case-sensitive)

## 3. Wykorzystywane typy

### Command Models

**DeleteAccountCommand** (już zdefiniowany w `src/lib/validators/auth.validators.ts`):
```typescript
{
  confirmation: "USUŃ"
}
```

### DTOs

**DeleteAccountResponseDto** (do utworzenia w `src/types.ts`):
```typescript
interface DeleteAccountResponseDto {
  message: string;
}
```

### Schematy walidacji

**DeleteAccountSchema** (już istnieje w `src/lib/validators/auth.validators.ts`):
- Używa `z.literal("USUŃ")` do wymuszenia dokładnego dopasowania
- Zwraca komunikat błędu: `'Wpisz "USUŃ" aby potwierdzić'`

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "message": "Account deleted successfully"
}
```

**Headery**:
- `Content-Type: application/json`
- Cookies: Sesja jest automatycznie usuwana przez `supabase.auth.signOut()`

### Błędy

#### 400 Bad Request - Nieprawidłowe potwierdzenie
```json
{
  "error": "Nieprawidłowe dane wejściowe",
  "message": "Wpisz \"USUŃ\" aby potwierdzić",
  "details": [/* Zod validation errors */]
}
```

**Przyczyny**:
- Brak pola `confirmation` w body
- Wartość `confirmation` nie jest dokładnie równa "USUŃ"
- Nieprawidłowy format JSON

#### 401 Unauthorized - Brak sesji
```json
{
  "error": "Unauthorized",
  "message": "Brak autoryzacji"
}
```

**Przyczyny**:
- Brak aktywnej sesji użytkownika
- Sesja wygasła
- Nieprawidłowy token JWT

#### 500 Internal Server Error - Błąd serwera
```json
{
  "error": "Wystąpił błąd serwera, spróbuj ponownie później",
  "message": "Wystąpił błąd serwera, spróbuj ponownie później"
}
```

**Przyczyny**:
- Błąd podczas wywołania funkcji bazy danych `delete_user_account()`
- Błąd podczas wylogowywania użytkownika
- Nieoczekiwany błąd w procesie

## 5. Przepływ danych

### Krok 1: Walidacja autoryzacji
1. Utworzenie instancji Supabase client z kontekstem żądania (`createSupabaseServerInstance`)
2. Sprawdzenie sesji użytkownika (`supabase.auth.getSession()`)
3. Jeśli brak sesji → zwróć 401 Unauthorized

### Krok 2: Walidacja danych wejściowych
1. Parsowanie body żądania jako JSON
2. Walidacja z użyciem `DeleteAccountSchema.safeParse()`
3. Jeśli walidacja nie powiodła się → zwróć 400 Bad Request z szczegółami błędów

### Krok 3: Wywołanie funkcji bazy danych
1. Wywołanie `supabase.rpc("delete_user_account")` (bez parametrów)
2. Funkcja bazy danych:
   - Pobiera `user_id` z `auth.uid()` (automatycznie z JWT)
   - Soft-delete'uje wszystkie subskrypcje w `user_offer` (ustawia `deleted_at`)
   - Anonimizuje email w `auth.users` do `deleted_{timestamp}@deleted.com`
   - Usuwa hasło (`encrypted_password = NULL`)
   - Czyści dane osobowe (`raw_user_meta_data`, `raw_app_meta_data`)
   - Loguje operację do `system_logs`
3. Jeśli wystąpi błąd → zwróć 500 Internal Server Error

### Krok 4: Wylogowanie użytkownika
1. Wywołanie `supabase.auth.signOut()` aby:
   - Unieważnić sesję JWT
   - Wyczyścić cookies sesji
2. Jeśli wystąpi błąd → zwróć 500 Internal Server Error (ale konto jest już usunięte)

### Krok 5: Zwrócenie odpowiedzi
1. Zwróć 200 OK z komunikatem sukcesu
2. Cookies są automatycznie usuwane przez Supabase SDK

## 6. Względy bezpieczeństwa

### Autoryzacja
- **Wymagana sesja**: Endpoint wymaga aktywnej sesji użytkownika
- **Middleware**: Middleware automatycznie weryfikuje JWT token
- **Funkcja bazy danych**: `delete_user_account()` używa `auth.uid()` do zapewnienia, że użytkownik może usunąć tylko swoje konto (SECURITY DEFINER z kontrolą `auth.uid()`)

### Walidacja danych
- **Potwierdzenie**: Wymaga dokładnego tekstu "USUŃ" (case-sensitive) aby uniknąć przypadkowego usunięcia
- **Schema validation**: Używa Zod do walidacji struktury i typu danych

### Ochrona danych
- **Soft delete**: Subskrypcje są soft-delete'owane, nie fizycznie usuwane
- **Anonimizacja**: Email jest anonimizowany, nie usuwany
- **Zachowanie danych**: Historia cen jest zachowana dla celów analitycznych
- **Audyt**: Wszystkie operacje są logowane do `system_logs`

### Bezpieczeństwo sesji
- **Automatyczne wylogowanie**: Użytkownik jest automatycznie wylogowywany po usunięciu konta
- **Czyszczenie cookies**: Supabase SDK automatycznie czyści cookies sesji

### Ochrona przed atakami
- **Rate limiting**: Middleware może implementować rate limiting (obecnie nie jest wymagane dla tego endpointu)
- **CSRF protection**: Użycie sesji cookie-based z `sameSite: 'lax'` zapewnia podstawową ochronę CSRF
- **SQL Injection**: Funkcja bazy danych używa przygotowanych parametrów i `auth.uid()` zamiast bezpośrednich wartości

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu

| Scenariusz | Kod statusu | Komunikat | Logowanie |
|------------|-------------|-----------|-----------|
| Brak sesji | 401 | "Brak autoryzacji" | Nie |
| Nieprawidłowe JSON | 400 | "Invalid JSON in request body" | Nie |
| Brak pola `confirmation` | 400 | "Nieprawidłowe dane wejściowe" + szczegóły Zod | Nie |
| Nieprawidłowa wartość `confirmation` | 400 | "Wpisz \"USUŃ\" aby potwierdzić" | Nie |
| Błąd funkcji bazy danych | 500 | "Wystąpił błąd serwera..." | Tak (console.error + system_logs) |
| Błąd wylogowania | 500 | "Wystąpił błąd serwera..." | Tak (console.error) |
| Nieoczekiwany błąd | 500 | "Wystąpił błąd serwera..." | Tak (console.error) |

### Obsługa błędów w kodzie

```typescript
try {
  // ... walidacja i operacje ...
} catch (error) {
  // Logowanie błędów
  console.error("Delete account endpoint error:", error);
  
  // Zwrócenie ogólnego komunikatu błędu (bez ujawniania szczegółów)
  return new Response(
    JSON.stringify({
      error: "Wystąpił błąd serwera, spróbuj ponownie później",
      message: "Wystąpił błąd serwera, spróbuj ponownie później",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

### Logowanie błędów

- **Console.error**: Wszystkie błędy są logowane do konsoli z kontekstem
- **system_logs**: Funkcja bazy danych automatycznie loguje błędy do `system_logs` w bloku `EXCEPTION`
- **Sentry/Monitoring**: W przyszłości można dodać integrację z systemem monitoringu

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Funkcja bazy danych**: Użycie funkcji bazy danych zamiast wielu osobnych zapytań:
   - Jedna transakcja zamiast wielu operacji
   - Mniejsze obciążenie sieci
   - Atomicity gwarantowana przez bazę danych

2. **Indeksy**: Operacje na `user_offer` używają indeksu `idx_user_offer_user_deleted` dla szybkiego lookup'u

3. **Brak N+1 queries**: Wszystkie operacje są wykonywane w jednej funkcji bazy danych

### Potencjalne wąskie gardła

1. **Duża liczba subskrypcji**: Jeśli użytkownik ma wiele subskrypcji, UPDATE na `user_offer` może być wolniejszy
   - **Rozwiązanie**: Indeks `idx_user_offer_user_deleted` zapewnia szybki dostęp
   - **Monitoring**: Warto monitorować czas wykonania dla użytkowników z >100 subskrypcjami

2. **Blokowanie tabeli**: Operacja UPDATE na `auth.users` może blokować tabelę
   - **Rozwiązanie**: Operacja jest szybka (pojedynczy UPDATE), blokada jest krótkotrwała
   - **Monitoring**: Warto monitorować czas blokady w produkcji

### Metryki do monitorowania

- Czas odpowiedzi endpointu (cel: <500ms dla 95 percentyla)
- Czas wykonania funkcji `delete_user_account()` (cel: <200ms dla 95 percentyla)
- Liczba błędów 500 (cel: <0.1% wszystkich requestów)
- Liczba operacji usunięcia konta dziennie (dla analityki)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie typu DTO w `src/types.ts`
- Dodaj `DeleteAccountResponseDto` do sekcji DTOs
- Typ jest już zdefiniowany w walidatorach jako `DeleteAccountInput`

**Implementacja**:
```typescript
/**
 * Response after deleting account
 */
export interface DeleteAccountResponseDto {
  message: string;
}
```

### Krok 2: Utworzenie endpointu API `src/pages/api/auth/delete-account.ts`
- Utwórz nowy plik z implementacją endpointu
- Użyj wzorca z `change-password.ts` jako referencji

**Struktura pliku**:
```typescript
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { DeleteAccountSchema } from "@/lib/validators/auth.validators";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Implementacja zgodna z planem
};
```

### Krok 3: Implementacja logiki endpointu

#### 3.1. Walidacja autoryzacji
```typescript
const supabase = createSupabaseServerInstance({
  headers: request.headers,
  cookies,
});

const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Brak autoryzacji",
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 3.2. Walidacja danych wejściowych
```typescript
let body;
try {
  body = await request.json();
} catch {
  return new Response(
    JSON.stringify({
      error: "Bad Request",
      details: "Invalid JSON in request body",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

const validated = DeleteAccountSchema.safeParse(body);

if (!validated.success) {
  return new Response(
    JSON.stringify({
      error: "Nieprawidłowe dane wejściowe",
      message: "Wpisz \"USUŃ\" aby potwierdzić",
      details: validated.error.errors,
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 3.3. Wywołanie funkcji bazy danych
```typescript
const { error: deleteError } = await supabase.rpc("delete_user_account");

if (deleteError) {
  console.error("Delete account error:", deleteError);
  return new Response(
    JSON.stringify({
      error: "Wystąpił błąd serwera, spróbuj ponownie później",
      message: "Wystąpił błąd serwera, spróbuj ponownie później",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 3.4. Wylogowanie użytkownika
```typescript
const { error: signOutError } = await supabase.auth.signOut();

if (signOutError) {
  console.error("Sign out error after account deletion:", signOutError);
  // Konto jest już usunięte, ale wylogowanie się nie powiodło
  // Zwróć sukces, ale zaloguj błąd
  return new Response(
    JSON.stringify({
      message: "Account deleted successfully",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### 3.5. Zwrócenie odpowiedzi sukcesu
```typescript
return new Response(
  JSON.stringify({
    message: "Account deleted successfully",
  }),
  {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }
);
```

### Krok 4: Obsługa błędów
- Dodaj try-catch wokół całej logiki endpointu
- Loguj wszystkie błędy do console.error
- Zwróć odpowiednie kody statusu zgodnie z planem

### Krok 5: Testowanie
- Utwórz testy jednostkowe dla endpointu (opcjonalnie, jeśli istnieje infrastruktura testowa)
- Przetestuj ręcznie następujące scenariusze:
  1. ✅ Sukces: Poprawne potwierdzenie "USUŃ" → 200 OK
  2. ✅ Błąd walidacji: Nieprawidłowe potwierdzenie → 400 Bad Request
  3. ✅ Błąd autoryzacji: Brak sesji → 401 Unauthorized
  4. ✅ Weryfikacja: Konto jest anonimizowane w bazie danych
  5. ✅ Weryfikacja: Subskrypcje są soft-delete'owane
  6. ✅ Weryfikacja: Użytkownik jest wylogowany (cookies są usunięte)
  7. ✅ Weryfikacja: Operacja jest zalogowana w `system_logs`

### Krok 6: Dokumentacja
- Endpoint jest już udokumentowany w `.ai/api-plan.md`
- Zaktualizuj status w `.ai/api-plan.md` z `❌ NOT IMPLEMENTED` na `✅ IMPLEMENTED`

### Krok 7: Code Review Checklist
- [ ] Kod jest zgodny z wzorcami z innych endpointów auth
- [ ] Wszystkie błędy są obsługiwane i logowane
- [ ] Komunikaty błędów są przyjazne dla użytkownika
- [ ] Security best practices są przestrzegane
- [ ] Typy TypeScript są poprawne
- [ ] Zod validation jest używana konsekwentnie
- [ ] `export const prerender = false` jest ustawione

## 10. Dodatkowe uwagi

### Integracja z frontendem
- Frontend powinien wyświetlać modal potwierdzenia przed wywołaniem endpointu
- Modal powinien wymagać wpisania "USUŃ" w polu tekstowym
- Po udanym usunięciu konta, użytkownik powinien być przekierowany do strony głównej
- Frontend powinien obsługiwać błędy i wyświetlać odpowiednie komunikaty

### Monitoring i alerty
- Warto monitorować liczbę usunięć konta dziennie (może wskazywać na problemy)
- Alerty dla nietypowo wysokiej liczby błędów 500
- Monitoring czasu wykonania funkcji bazy danych

### Przyszłe ulepszenia
- Możliwość przywrócenia konta w ciągu X dni (grace period)
- Email potwierdzenia przed usunięciem konta
- Eksport danych użytkownika przed usunięciem (GDPR compliance)

