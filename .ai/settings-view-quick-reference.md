# Widok Ustawienia - Krótki przewodnik

## Routing

```
URL: /settings
Plik: src/pages/settings.astro
Komponent: src/components/views/SettingsView.tsx
```

## Struktura komponentów

```
SettingsView
├── FrequencySettingsForm     # Zmiana domyślnej częstotliwości
├── PasswordChangeForm         # Zmiana hasła
└── DeleteAccountSection       # Usunięcie konta
```

## API Endpoints

| Metoda | Endpoint                | Status    | Opis                     |
| ------ | ----------------------- | --------- | ------------------------ |
| GET    | `/api/preferences`      | ✅ Działa | Pobierz preferencje      |
| PUT    | `/api/preferences`      | ✅ Działa | Aktualizuj częstotliwość |
| POST   | `/api/auth/change-password` | ✅ Działa | Zmień hasło              |
| POST   | `/api/auth/delete-account` | ✅ Działa | Usuń konto               |

## Użycie

### Import

```typescript
import SettingsView from "@/components/views/SettingsView";
```

### Props

```typescript
interface SettingsViewProps {
  initialPreferences: PreferencesDto | null;
}
```

### Przykład w Astro

```astro
---
import SettingsView from "../components/views/SettingsView";
const initialPreferences = await fetchPreferences();
---

<SettingsView client:load initialPreferences={initialPreferences} />
```

## Custom Hook

```typescript
import { useSettings } from "@/components/settings";

const { preferences, isLoading, error, updateFrequency, changePassword, deleteAccount } =
  useSettings(initialPreferences);
```

## Typy

```typescript
// W src/types.ts
export interface SettingsViewModel {
  isLoading: boolean;
  preferences: PreferencesDto | null;
  error: string | null;
}

export interface PasswordChangeViewModel {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeleteAccountViewModel {
  isModalOpen: boolean;
  confirmationInput: string;
  isDeleting: boolean;
}
```

## Walidacja

### Częstotliwość

- Enum: "6h" | "12h" | "24h" | "48h"
- Przycisk aktywny tylko gdy zmieniono wartość

### Hasło

- Aktualne hasło: wymagane
- Nowe hasło: min. 8 znaków
- Potwierdzenie: musi być identyczne

### Usunięcie konta

- Wpisz dokładnie: "USUŃ"

## Komponenty UI (Shadcn)

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Input`
- `Button`
- `Label`
- `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, etc.
- `Toaster` (sonner)

## Toast Notifications

```typescript
import { toast } from "sonner";

toast.success("Operacja zakończona sukcesem");
toast.error("Wystąpił błąd");
```

## Stany ładowania

1. **Initial loading**: Skeleton loaders
2. **Submitting**: Disabled buttons z tekstem "Zapisywanie..."
3. **Error**: Toast notification + opcjonalnie inline errors

## Responsywność

- Container: `px-4 sm:px-6 lg:px-8`
- Heading: `text-2xl sm:text-3xl`
- Max width: `max-w-2xl`

## Backend Implementation ✅ UKOŃCZONE

### 1. POST /api/auth/change-password ✅ IMPLEMENTED

```typescript
// Request
{
  currentPassword: string;
  newPassword: string;
}

// Response (success)
{
  message: "Password changed successfully";
}

// Response (error)
{
  error: "Current password is incorrect" | "Nieprawidłowe dane wejściowe" | ...;
  message: string;
  code?: "INVALID_CURRENT_PASSWORD" | "WEAK_PASSWORD" | ...;
}

// Implementacja: src/pages/api/auth/change-password.ts
// Wymaga: aktywnej sesji użytkownika (middleware)
// Supabase automatycznie wysyła email o zmianie hasła
// Re-authentication: weryfikuje aktualne hasło przed zmianą
```

### 2. POST /api/auth/delete-account ✅ IMPLEMENTED

```typescript
// Request
{
  confirmation: "USUŃ"
}

// Response (success)
{
  message: "Account deleted successfully";
}

// Implementacja: src/pages/api/auth/delete-account.ts
// Akcja po usunięciu:
// - Wywołuje database function `delete_user_account()` która:
//   - Soft-delete user_offer subscriptions
//   - Anonimizuje email w auth.users
//   - Usuwa password i personal data
//   - Zachowuje price_history dla analytics
// - Automatycznie wylogowuje użytkownika (signOut)
// - Frontend przekieruje na "/"
```

## Testowanie

```bash
# Uruchom dev server
npm run dev

# Otwórz w przeglądarce
http://localhost:4321/settings

# Wymagana autoryzacja (middleware)
```

## Debugowanie

```typescript
// W useSettings.ts dodaj console.log
console.log("Preferences:", preferences);
console.log("Loading:", isLoading);
console.log("Error:", error);

// W komponentach sprawdź props
console.log("Props:", { initialPreferences, onSubmit });
```

## Najczęstsze problemy

1. **"Cannot read property of null"**
   - Sprawdź czy preferences zostały załadowane przed renderowaniem
2. **Toast nie działa**
   - Upewnij się że `<Toaster />` jest w komponencie
3. **Form nie submittuje**
   - Sprawdź walidację zod
   - Sprawdź czy przycisk nie jest disabled

4. **API errors**
   - Sprawdź czy endpoints są zaimplementowane
   - Sprawdź middleware (wymagana autoryzacja)

## Dostępność

- Nawigacja klawiaturą: Tab, Enter, Escape
- Screen readers: Label + aria-invalid
- Focus indicators: automatyczne z Shadcn

## Nawigacja

### Dashboard → Settings

```tsx
// W DashboardView.tsx
<Button variant="outline" size="sm" asChild>
  <a href="/settings" className="flex items-center gap-2">
    <Settings className="size-4" />
    <span className="hidden sm:inline">Ustawienia</span>
  </a>
</Button>
```

### Settings → Dashboard

```tsx
// W SettingsView.tsx
<Button variant="ghost" size="sm" asChild>
  <a href="/dashboard" className="flex items-center gap-2">
    <ArrowLeft className="size-4" />
    <span className="hidden sm:inline">Powrót</span>
  </a>
</Button>
```

**Ikony z lucide-react:**

- `Settings` - ikona ustawień
- `ArrowLeft` - ikona powrotu

**Responsywność:**

- Tekst ukryty na mobile: `hidden sm:inline`
- Ikony zawsze widoczne

## Przydatne komendy

```bash
# Dodaj nowy komponent Shadcn
npx shadcn@latest add [component-name] --yes

# Sprawdź lintera
npm run lint

# Fix lint errors
npm run lint:fix
```
