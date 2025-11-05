# 🎯 Implementacja Header z przyciskiem Wylogowania

## ✅ Co zostało dodane

### 1. Nowy komponent: `Header.tsx`

**Lokalizacja:** `src/components/navigation/Header.tsx`

**Funkcjonalność:**

- ✅ Logo PriceHistory (link do /dashboard)
- ✅ Nawigacja: Dashboard, Ustawienia
- ✅ Email użytkownika (ukryty na mobile)
- ✅ Przycisk "Wyloguj" z loading state
- ✅ Responsywny design (mobile-friendly)

**Props:**

```typescript
interface HeaderProps {
  user: {
    email: string;
    id: string;
  };
}
```

**Funkcje:**

- `handleLogout()` - wywołuje `/api/auth/logout` i przekierowuje na `/`
- Loading state podczas wylogowywania
- Error handling w konsoli

---

### 2. Aktualizacje stron

#### `/dashboard.astro`

**Zmiany:**

- ✅ Import `Header` komponentu
- ✅ Użycie `Astro.locals.user` zamiast `current_user_id`
- ✅ Safety check: redirect do `/login` jeśli brak user
- ✅ Header renderowany na górze strony
- ✅ Przekazanie user data do Header

#### `/settings.astro`

**Zmiany:**

- ✅ Identyczne jak dashboard
- ✅ Header z nawigacją
- ✅ Spójny UX na obu stronach

---

## 🎨 Wygląd Header

```
┌──────────────────────────────────────────────────────────┐
│  PriceHistory   Dashboard   Ustawienia      user@email   │
│                                            [Wyloguj]      │
└──────────────────────────────────────────────────────────┘
```

**Mobile view:**

```
┌──────────────────────────────────┐
│  PriceHistory       [Wyloguj]    │
└──────────────────────────────────┘
```

---

## 🚀 Jak przetestować

### Test 1: Wylogowanie z dashboard

1. Zaloguj się: `http://localhost:4321/login`
2. Jesteś na `/dashboard`
3. Kliknij "Wyloguj" w prawym górnym rogu

**Oczekiwany wynik:**

- ✅ Przycisk pokazuje "Wylogowywanie..."
- ✅ Redirect na `/`
- ✅ Cookies usunięte
- ✅ Nie możesz wejść na `/dashboard` bez ponownego logowania

### Test 2: Nawigacja między stronami

1. Zaloguj się
2. Jesteś na `/dashboard`
3. Kliknij "Ustawienia" w header
4. Jesteś na `/settings`
5. Kliknij "Dashboard" w header
6. Z powrotem na `/dashboard`

**Oczekiwany wynik:**

- ✅ Nawigacja działa płynnie
- ✅ Header widoczny na obu stronach
- ✅ Aktualny email wyświetlany

### Test 3: Logo redirect

1. Zaloguj się
2. Wejdź na `/settings`
3. Kliknij "PriceHistory" (logo)

**Oczekiwany wynik:**

- ✅ Redirect do `/dashboard`

### Test 4: Responsywność

1. Zaloguj się
2. Zmniejsz okno przeglądarki (mobile view)
3. Sprawdź header

**Oczekiwany wynik:**

- ✅ Nawigacja ukryta na mobile (można dodać hamburger menu później)
- ✅ Email ukryty na mobile
- ✅ Logo i przycisk Wyloguj widoczne

---

## 📋 Struktura plików

```
src/
├── components/
│   └── navigation/
│       └── Header.tsx                    # ✨ NOWY
├── pages/
│   ├── dashboard.astro                   # ✏️ ZMODYFIKOWANY
│   └── settings.astro                    # ✏️ ZMODYFIKOWANY
```

---

## 🎨 Styling

Header używa Tailwind CSS classes:

- Border bottom dla separacji
- Container mx-auto dla wyśrodkowania
- Flex layout dla responsive design
- Dark mode support (dark:)
- Hover effects na linkach
- Shadcn/ui Button component

**Kolory:**

- Background: `bg-white dark:bg-gray-950`
- Border: `border-gray-200 dark:border-gray-800`
- Text: `text-gray-900 dark:text-gray-50`
- Links hover: transition-colors

---

## 🔄 Flow wylogowania

```
User clicks "Wyloguj"
  ↓
handleLogout() triggered
  ↓
setIsLoggingOut(true)
  ↓
POST /api/auth/logout
  ↓
Supabase: signOut()
  ↓
Cookies cleared
  ↓
window.location.href = "/"
  ↓
User on landing page (logged out)
```

---

## 💡 Możliwe rozszerzenia (później)

### 1. Hamburger menu na mobile

```tsx
const [menuOpen, setMenuOpen] = useState(false);

// Toggle menu
<button onClick={() => setMenuOpen(!menuOpen)}>{/* Hamburger icon */}</button>;

{
  menuOpen && <div className="mobile-menu">{/* Navigation links */}</div>;
}
```

### 2. User avatar

```tsx
<div className="flex items-center gap-2">
  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
    {user.email[0].toUpperCase()}
  </div>
  <span>{user.email}</span>
</div>
```

### 3. Dropdown menu

```tsx
import { DropdownMenu } from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger>{user.email}</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profil</DropdownMenuItem>
    <DropdownMenuItem>Ustawienia</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>Wyloguj</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

### 4. Active link highlighting

```tsx
const isActive = (path: string) => {
  if (typeof window !== "undefined") {
    return window.location.pathname === path;
  }
  return false;
};

<a href="/dashboard" className={`${isActive("/dashboard") ? "text-primary font-semibold" : "text-gray-700"}`}>
  Dashboard
</a>;
```

---

## ✅ Checklist

- [x] Header komponent utworzony
- [x] Integracja z dashboard.astro
- [x] Integracja z settings.astro
- [x] Przycisk wylogowania działa
- [x] Nawigacja działa
- [x] Responsywny design
- [x] Dark mode support
- [x] Loading state
- [x] Error handling
- [x] No linter errors

---

## 🎉 Gotowe do użycia!

Header jest już zintegrowany i działający. Użytkownicy mogą:

- ✅ Widzieć swój email
- ✅ Nawigować między Dashboard i Ustawienia
- ✅ Wylogować się jednym kliknięciem
- ✅ Wrócić do Dashboard klikając logo

**Data implementacji:** 2025-01-03  
**Status:** Complete ✅
