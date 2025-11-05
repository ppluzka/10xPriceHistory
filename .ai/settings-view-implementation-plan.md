# Plan implementacji widoku Ustawienia

## 1. Przegląd

Widok "Ustawienia" (`/settings`) jest dedykowanym interfejsem dla zalogowanych użytkowników, umożliwiającym zarządzanie kluczowymi aspektami ich konta. Celem widoku jest zapewnienie scentralizowanego miejsca do modyfikacji preferencji aplikacji, zmiany hasła oraz bezpiecznego usunięcia konta. Każda sekcja jest odizolowana wizualnie w celu zapewnienia przejrzystości i łatwości obsługi.

## 2. Routing widoku

Widok będzie dostępny pod chronioną ścieżką, wymagającą uwierzytelnienia użytkownika:

- **Ścieżka:** `/settings`
- **Plik Astro:** `src/pages/settings.astro`

Plik `settings.astro` będzie renderował główny komponent React odpowiedzialny za interfejs, np. `<SettingsView client:load />`.

## 3. Struktura komponentów

Hierarchia komponentów zostanie zorganizowana w celu zapewnienia reużywalności i separacji logiki.

```
/src/pages/settings.astro
└── SettingsView.tsx (Komponent główny, renderowany po stronie klienta)
    ├── FrequencySettingsForm.tsx (Formularz zmiany częstotliwości)
    │   ├── Card, CardHeader, CardContent, CardFooter (Shadcn)
    │   ├── Form, Select, Button (Shadcn)
    ├── PasswordChangeForm.tsx (Formularz zmiany hasła)
    │   ├── Card, CardHeader, CardContent, CardFooter (Shadcn)
    │   ├── Form, Input, Button (Shadcn)
    └── DeleteAccountSection.tsx (Sekcja usuwania konta)
        ├── Card, CardHeader, CardContent, CardFooter (Shadcn)
        ├── Button (Shadcn)
        └── AlertDialog, Input (Shadcn)
```

## 4. Szczegóły komponentów

### SettingsView.tsx

- **Opis komponentu:** Główny kontener strony ustawień. Odpowiada za pobranie początkowych danych (preferencji użytkownika), zarządzanie ogólnym stanem ładowania i błędów oraz renderowanie poszczególnych sekcji.
- **Główne elementy:**
  - Nagłówek `<h1>Ustawienia</h1>`.
  - Komponenty `FrequencySettingsForm`, `PasswordChangeForm`, `DeleteAccountSection`, każdy opakowany w `Card` z Shadcn/ui dla spójności wizualnej.
  - Komponent `Toaster` z Shadcn/ui do wyświetlania powiadomień.
- **Obsługiwane interakcje:** Brak bezpośrednich interakcji; komponent deleguje logikę do komponentów podrzędnych.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `SettingsViewModel`, `PreferencesDto`.
- **Propsy:** Brak.

### FrequencySettingsForm.tsx

- **Opis komponentu:** Formularz umożliwiający użytkownikowi zmianę domyślnej częstotliwości sprawdzania cen dla nowo dodawanych ofert.
- **Główne elementy:**
  - `CardHeader` z tytułem "Częstotliwość sprawdzania" i opisem.
  - `CardContent` zawierający formularz z komponentem `Select` (dropdown) z opcjami: '6h', '12h', '24h', '48h'.
  - Paragraf z informacją: "Zmiany dotyczą nowych ofert".
  - `CardFooter` z przyciskiem `Button` typu "submit" do zapisu zmian.
- **Obsługiwane interakcje:**
  - `onSubmit`: Wysłanie zaktualizowanych preferencji do API.
- **Obsługiwana walidacja:** Walidacja jest niejawna dzięki użyciu komponentu `Select`, który ogranicza wybór do predefiniowanych opcji. Przycisk zapisu powinien być nieaktywny, jeśli wartość nie została zmieniona.
- **Typy:** `PreferencesDto`, `UpdatePreferencesCommand`.
- **Propsy:**
  ```typescript
  interface FrequencySettingsFormProps {
    initialPreferences: PreferencesDto;
    onSubmit: (data: UpdatePreferencesCommand) => Promise<void>;
  }
  ```

### PasswordChangeForm.tsx

- **Opis komponentu:** Formularz do bezpiecznej zmiany hasła użytkownika.
- **Główne elementy:**
  - `CardHeader` z tytułem "Zmiana hasła".
  - `CardContent` zawierający formularz z trzema polami `Input` typu `password`: "Aktualne hasło", "Nowe hasło", "Potwierdź nowe hasło".
  - `CardFooter` z przyciskiem `Button` typu "submit".
- **Obsługiwane interakcje:**
  - `onSubmit`: Wysłanie danych do zmiany hasła do API.
- **Obsługiwana walidacja:**
  - Wszystkie pola są wymagane.
  - "Nowe hasło" musi mieć co najmniej 8 znaków.
  - Wartości w polach "Nowe hasło" i "Potwierdź nowe hasło" muszą być identyczne.
- **Typy:** `PasswordChangeViewModel`.
- **Propsy:**
  ```typescript
  interface PasswordChangeFormProps {
    onSubmit: (data: PasswordChangeViewModel) => Promise<void>;
  }
  ```

### DeleteAccountSection.tsx

- **Opis komponentu:** Sekcja "niebezpieczna", która inicjuje proces usuwania konta użytkownika.
- **Główne elementy:**
  - `Card` z czerwonym obramowaniem lub nagłówkiem dla wizualnego ostrzeżenia.
  - `CardHeader` z tytułem "Niebezpieczna strefa".
  - `CardContent` z opisem konsekwencji usunięcia konta.
  - `CardFooter` z przyciskiem `Button` (wariant `destructive`), który otwiera modal potwierdzający.
  - Komponent `AlertDialog` (modal) z polem `Input` do wpisania "USUŃ" oraz finalnym przyciskiem usunięcia.
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku "Usuń konto" otwiera modal.
  - Wpisywanie tekstu w polu potwierdzenia w modalu.
  - Kliknięcie finalnego przycisku usunięcia (aktywny tylko po poprawnym wpisaniu tekstu).
- **Obsługiwana walidacja:** Przycisk finalnego usunięcia jest aktywny (`disabled={false}`) tylko wtedy, gdy wartość w polu `Input` jest identyczna z "USUŃ".
- **Typy:** `DeleteAccountViewModel`.
- **Propsy:**
  ```typescript
  interface DeleteAccountSectionProps {
    onDelete: () => Promise<void>;
  }
  ```

## 5. Typy

Do implementacji widoku, oprócz istniejących DTO, potrzebne będą następujące typy ViewModel, które będą zarządzać stanem formularzy i interfejsu.

```typescript
// Istniejące typy z src/types.ts
import { PreferencesDto, UpdatePreferencesCommand } from "./types";

/**
 * Model widoku dla głównego komponentu SettingsView,
 * zarządzający ogólnym stanem ładowania i błędów.
 */
export interface SettingsViewModel {
  isLoading: boolean;
  preferences: PreferencesDto | null;
  error: string | null;
}

/**
 * Model widoku dla formularza zmiany hasła.
 */
export interface PasswordChangeViewModel {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Model widoku dla sekcji usuwania konta.
 */
export interface DeleteAccountViewModel {
  isModalOpen: boolean;
  confirmationInput: string;
  isDeleting: boolean;
}
```

## 6. Zarządzanie stanem

Zarządzanie stanem będzie realizowane za pomocą kombinacji lokalnego stanu komponentów (`useState`) oraz customowego hooka `useSettings`, który scentralizuje logikę pobierania danych i komunikacji z API.

### Custom Hook: `useSettings`

- **Cel:** Abstrakcja logiki biznesowej od komponentów widoku. Hook będzie odpowiedzialny za:
  - Pobieranie początkowych preferencji użytkownika.
  - Udostępnianie funkcji do aktualizacji preferencji, zmiany hasła i usuwania konta.
  - Zarządzanie ogólnym stanem ładowania i błędów dla całej strony.
- **Struktura:**

  ````typescript
  const useSettings = () => {
  const [state, setState] = useState<SettingsViewModel>({
  isLoading: true,
  preferences: null,
  error: null,
  });

        // useEffect do pobrania danych początkowych

        const updateFrequency = async (data: UpdatePreferencesCommand) => { /* ... */ };
        const changePassword = async (data: PasswordChangeViewModel) => { /* ... */ };
        const deleteAccount = async () => { /* ... */ };

        return { ...state, updateFrequency, changePassword, deleteAccount };
      };
      ```

  Dla formularzy (`FrequencySettingsForm`, `PasswordChangeForm`) zalecane jest użycie biblioteki `react-hook-form` z integracją `zod` do walidacji, co uprości zarządzanie stanem pól, walidacją i stanem przesyłania.
  ````

## 7. Integracja API

Komponenty będą komunikować się z API za pośrednictwem funkcji udostępnionych przez hook `useSettings`.

- **`GET /api/preferences`**
  - **Akcja:** Wywoływane przy pierwszym renderowaniu `SettingsView` wewnątrz `useSettings`.
  - **Typ odpowiedzi (sukces):** `PreferencesDto` (`{ defaultFrequency: "24h" }`)
  - **Obsługa:** Wynik zasila stan `preferences`, co powoduje przekazanie danych do `FrequencySettingsForm`.

- **`PUT /api/preferences`**
  - **Akcja:** Wywoływane z `FrequencySettingsForm` po zatwierdzeniu formularza.
  - **Typ żądania:** `UpdatePreferencesCommand` (`{ "defaultFrequency": "12h" }`)
  - **Typ odpowiedzi (sukces):** `UpdatePreferencesResponseDto` (`{ "message": "Preferences updated" }`)
  - **Obsługa:** Wyświetlenie powiadomienia "toast" o sukcesie lub błędzie.

- **`POST /api/auth/change-password` ✅ IMPLEMENTED**
  - **Akcja:** Wywoływane z `PasswordChangeForm`.
  - **Typ żądania:** `{ currentPassword: "...", newPassword: "..." }`
  - **Obsługa:** Wyświetlenie powiadomienia "toast", wyczyszczenie formularza po sukcesie.
  - **Implementacja:** `/src/pages/api/auth/change-password.ts`

- **`DELETE /api/account` (API do zaimplementowania)**
  - **Akcja:** Wywoływane z `DeleteAccountSection`.
  - **Obsługa:** Wylogowanie użytkownika i przekierowanie na stronę główną po sukcesie.

## 8. Interakcje użytkownika

- **Ładowanie strony:** Użytkownik widzi szkielet interfejsu (skeleton loader), podczas gdy `useSettings` pobiera dane.
- **Zmiana częstotliwości:** Użytkownik wybiera nową opcję w dropdownie i klika "Zapisz". Przycisk pokazuje wskaźnik ładowania, a po zakończeniu operacji pojawia się powiadomienie o sukcesie.
- **Zmiana hasła:** Użytkownik wypełnia formularz. Błędy walidacji wyświetlane są na bieżąco pod polami. Po kliknięciu "Zmień hasło" przycisk jest blokowany do czasu odpowiedzi API.
- **Usuwanie konta:** Użytkownik klika przycisk "Usuń konto", co otwiera modal. Musi wpisać "USUŃ" w polu tekstowym, aby odblokować finalny przycisk. Po kliknięciu przycisk pokazuje wskaźnik ładowania.

## 9. Warunki i walidacja

- **Formularz częstotliwości:** Przycisk "Zapisz" jest nieaktywny, jeśli wartość nie różni się od początkowej.
- **Formularz zmiany hasła:**
  - Wszystkie pola są wymagane.
  - Nowe hasło: minimum 8 znaków.
  - Potwierdzenie hasła: musi być identyczne z nowym hasłem.
  - Walidacja odbywa się po stronie klienta (z użyciem `zod` i `react-hook-form`) przed wysłaniem żądania do API.
- **Sekcja usuwania konta:** Przycisk w modalu jest nieaktywny, dopóki użytkownik nie wpisze dokładnie "USUŃ".

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli `GET /api/preferences` zwróci błąd, zamiast formularzy zostanie wyświetlony komunikat o błędzie z prośbą o odświeżenie strony.
- **Błąd zapisu danych:** W przypadku błędu w żądaniach `PUT` lub `DELETE`, użytkownik zobaczy powiadomienie "toast" z informacją o niepowodzeniu (np. "Nie udało się zaktualizować preferencji"). Formularz pozostanie w edycji, umożliwiając ponowną próbę.
- **Błąd zmiany hasła:** Specyficzne błędy (np. "Nieprawidłowe aktualne hasło") zwrócone przez API powinny być wyświetlone jako błąd formularza.

## 11. Kroki implementacji

1.  **Stworzenie pliku strony:** Utworzenie `src/pages/settings.astro` i osadzenie w nim pustego komponentu `<SettingsView client:load />`.
2.  **Struktura komponentów:** Stworzenie plików dla `SettingsView.tsx`, `FrequencySettingsForm.tsx`, `PasswordChangeForm.tsx` i `DeleteAccountSection.tsx` w `src/components/`.
3.  **Zdefiniowanie typów:** Dodanie `SettingsViewModel`, `PasswordChangeViewModel`, `DeleteAccountViewModel` do `src/types.ts`.
4.  **Implementacja `useSettings` Hook:** Stworzenie hooka z logiką pobierania danych (`GET /api/preferences`) oraz placeholderami dla pozostałych akcji.
5.  **Implementacja `SettingsView`:** Połączenie hooka `useSettings` z komponentem, implementacja stanu ładowania (skeleton) i obsługi błędów ogólnych.
6.  **Implementacja `FrequencySettingsForm`:** Zbudowanie formularza przy użyciu komponentów Shadcn/ui i `react-hook-form`. Integracja z funkcją `updateFrequency` z `useSettings`.
7.  **Implementacja `PasswordChangeForm`:** Zbudowanie formularza z walidacją `zod`. Integracja z placeholderem `changePassword`.
8.  **Implementacja `DeleteAccountSection`:** Zbudowanie sekcji z modalem `AlertDialog`. Implementacja logiki potwierdzenia i integracja z placeholderem `deleteAccount`.
9.  **Stylowanie i responsywność:** Zapewnienie, że widok jest w pełni responsywny zgodnie z `US-032`, stosując klasy Tailwind CSS.
10. **Integracja z API (hasło i usunięcie):** Po zaimplementowaniu odpowiednich endpointów, podłączenie ich w hooku `useSettings`.
