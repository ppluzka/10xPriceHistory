# Architektura UI dla PriceHistory

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji PriceHistory zostanie zrealizowana w modelu hybrydowym, wykorzystując Astro do routingu i renderowania stron po stronie serwera (SSR) oraz React jako bibliotekę do budowy interaktywnych komponentów po stronie klienta (tzw. "wysp"). Takie podejście zapewnia wysoką wydajność początkowego ładowania strony oraz bogatą interaktywność w częściach aplikacji, które tego wymagają.

Kluczowe filary architektury:
-   **Struktura oparta na widokach:** Aplikacja jest podzielona na logiczne widoki (strony), takie jak `Dashboard`, `Szczegóły Oferty` czy `Ustawienia`, z których każdy odpowiada za określony zestaw funkcjonalności.
-   **Zarządzanie stanem serwera:** Globalny stan aplikacji pochodzący z API będzie zarządzany przez `TanStack Query` (React Query). Zapewni to buforowanie danych, automatyczne odświeżanie, unieważnianie zapytań oraz obsługę stanów ładowania i błędów w spójny sposób.
-   **Komponenty UI:** Zostanie wykorzystana biblioteka `Shadcn/ui` jako zestaw gotowych, dostępnych i stylowalnych komponentów, co przyspieszy rozwój i zapewni spójność wizualną.
-   **Bezpieczeństwo:** Dostęp do chronionych widoków będzie kontrolowany przez `middleware` w Astro, które na poziomie serwera zweryfikuje sesję użytkownika (token JWT) i w razie potrzeby przekieruje na stronę logowania.
-   **Responsywność:** Wszystkie widoki i komponenty zostaną zaprojektowane w podejściu `mobile-first` z wykorzystaniem `utility classes` z Tailwind CSS, aby zapewnić optymalne działanie na różnych rozmiarach ekranów.

## 2. Lista widoków

### Widok: Logowanie
-   **Ścieżka:** `/login`
-   **Główny cel:** Uwierzytelnienie istniejącego użytkownika w systemie.
-   **Kluczowe informacje do wyświetlenia:** Formularz z polami na e-mail i hasło.
-   **Kluczowe komponenty:**
    -   `LoginForm.tsx`: Interaktywny komponent React zawierający logikę formularza, walidację (React Hook Form + Zod) i komunikację z API (`/auth/login`).
    -   `Toaster`: Globalny komponent do wyświetlania powiadomień o błędach (np. "Nieprawidłowe dane logowania").
-   **UX, dostępność i względy bezpieczeństwa:**
    -   **UX:** Komunikaty walidacji wyświetlane inline. Przycisk logowania wskazuje stan ładowania. Po pomyślnym zalogowaniu następuje przekierowanie do `/dashboard`.
    -   **Dostępność:** Poprawne etykiety (`<label>`) dla pól formularza, obsługa z klawiatury.
    -   **Bezpieczeństwo:** Komunikacja z API odbywa się przez HTTPS. Strona renderowana przez Astro, minimalizując logikę po stronie klienta przed uwierzytelnieniem.

### Widok: Rejestracja
-   **Ścieżka:** `/register`
-   **Główny cel:** Umożliwienie nowym użytkownikom założenia konta.
-   **Kluczowe informacje do wyświetlenia:** Formularz z polami na e-mail i hasło.
-   **Kluczowe komponenty:**
    -   `RegisterForm.tsx`: Komponent React z logiką formularza, walidacją i komunikacją z API (`/auth/register`).
-   **UX, dostępność i względy bezpieczeństwa:**
    -   **UX:** Podobne jak w widoku logowania. Po pomyślnej rejestracji wyświetlany jest komunikat o konieczności weryfikacji adresu e-mail.
    -   **Dostępność:** Standardowe praktyki dostępności dla formularzy.
    -   **Bezpieczeństwo:** Implementacja Captcha (zgodnie z PRD) do ochrony przed botami.

### Widok: Dashboard
-   **Ścieżka:** `/dashboard`
-   **Główny cel:** Główny panel użytkownika, prezentujący podsumowanie obserwowanych ofert, umożliwiający dodawanie nowych i nawigację do szczegółów.
-   **Kluczowe informacje do wyświetlenia:**
    -   Statystyki globalne (liczba aktywnych ofert, średnia zmiana cen).
    -   Lista obserwowanych ofert w formie siatki.
    -   Stan pusty, jeśli użytkownik nie obserwuje żadnych ofert.
-   **Kluczowe komponenty:**
    -   `DashboardStats.tsx`: Wyświetla kluczowe metryki z `GET /dashboard`.
    -   `OfferForm.tsx`: Formularz do dodawania nowej oferty przez wklejenie adresu URL. Komunikuje się z `POST /offers`.
    -   `OfferGrid.tsx`: Siatka wyświetlająca oferty. Zarządza stanem ładowania (wyświetlając `OfferGridSkeleton`) i stanem pustym.
    -   `OfferCard.tsx`: Pojedyncza karta oferty z kluczowymi danymi (tytuł, cena, % zmiana, status) i akcjami (przejdź do szczegółów, usuń).
    -   `OfferGridSkeleton.tsx`: Komponent "szkieletu" do wyświetlania podczas ładowania danych.
-   **UX, dostępność i względy bezpieczeństwa:**
    -   **UX:** Użycie "skeleton loaders" poprawia odczucie płynności. Usuwanie oferty jest realizowane jako "optimistic update" dla natychmiastowej reakcji UI. Toast informuje o wyniku operacji.
    -   **Dostępność:** Karty ofert są w pełni nawigowalne za pomocą klawiatury. Elementy interaktywne mają wyraźne stany `:focus`.
    -   **Bezpieczeństwo:** Widok chroniony przez `middleware` w Astro. Wszystkie zapytania do API są autoryzowane i dotyczą wyłącznie zalogowanego użytkownika.

### Widok: Szczegóły Oferty
-   **Ścieżka:** `/offer/[id]`
-   **Główny cel:** Prezentacja szczegółowej historii cenowej i statystyk dla pojedynczej oferty.
-   **Kluczowe informacje do wyświetlenia:**
    -   Dane oferty (zdjęcie, tytuł, link do oryginału).
    -   Wykres liniowy historii cen.
    -   Tabela z historią cen.
    -   Statystyki (cena min/max/średnia).
-   **Kluczowe komponenty:**
    -   `OfferHeader.tsx`: Wyświetla podstawowe informacje o ofercie pobrane z `GET /offers/{id}`.
    -   `PriceHistoryChart.tsx`: Interaktywny wykres cen (np. z Recharts), zasilany danymi z `GET /offers/{id}/history`.
    -   `PriceHistoryTable.tsx`: Tabela z danymi historycznymi, stanowiąca alternatywę dla wykresu.
    -   `OfferStats.tsx`: Panel ze statystykami cenowymi.
-   **UX, dostępność i względy bezpieczeństwa:**
    -   **UX:** Dane początkowe mogą być przekazane z SSR (Astro) jako `initialData` do `TanStack Query`, aby uniknąć ponownego zapytania po stronie klienta. Interaktywny wykres z tooltipami.
    -   **Dostępność:** Tabela z danymi stanowi dostępną alternatywę dla wykresu.
    -   **Bezpieczeństwo:** Widok chroniony przez `middleware`. Zapytania do API muszą być walidowane na backendzie, aby upewnić się, że użytkownik ma prawo do oglądania danej oferty.

### Widok: Ustawienia
-   **Ścieżka:** `/settings`
-   **Główny cel:** Zarządzanie ustawieniami konta i preferencjami użytkownika.
-   **Kluczowe informacje do wyświetlenia:**
    -   Formularz zmiany częstotliwości sprawdzania ofert.
    -   Formularz zmiany hasła.
    -   Sekcja usuwania konta.
-   **Kluczowe komponenty:**
    -   `FrequencySettingsForm.tsx`: Formularz do zmiany preferencji (komunikacja z `GET/PUT /preferences`).
    -   `PasswordChangeForm.tsx`: Formularz do zmiany hasła.
    -   `DeleteAccountSection.tsx`: Sekcja z przyciskiem inicjującym proces usunięcia konta, wymagająca potwierdzenia.
-   **UX, dostępność i względy bezpieczeństwa:**
    -   **UX:** Jasny podział na sekcje. Użycie modali do potwierdzenia niebezpiecznych akcji (usunięcie konta).
    -   **Dostępność:** Standardowe praktyki dostępności dla formularzy.
    -   **Bezpieczeństwo:** Widok chroniony. Zmiana hasła wymaga podania aktualnego hasła. Usunięcie konta wymaga dodatkowego potwierdzenia.

## 3. Mapa podróży użytkownika

Główny przepływ ("happy path") dla zaangażowanego użytkownika:
1.  **Logowanie:** Użytkownik wchodzi na `/login`, wprowadza dane i zostaje przekierowany do `/dashboard`.
2.  **Dodawanie oferty:** Na `/dashboard` wkleja URL oferty z Otomoto do formularza i klika "Dodaj". Oferta pojawia się na siatce.
3.  **Przeglądanie:** Użytkownik regularnie odwiedza `/dashboard`, aby obserwować zmiany procentowe na kartach swoich ofert. Zauważa, że cena jednej z nich spadła (zielony wskaźnik).
4.  **Analiza szczegółowa:** Klika na kartę interesującej go oferty, przechodząc do `/offer/[id]`.
5.  **Podejmowanie decyzji:** Na stronie szczegółów analizuje wykres i tabelę, aby zrozumieć trend cenowy. Na podstawie tych danych podejmuje decyzję o kontakcie ze sprzedającym.
6.  **Zarządzanie listą:** Po zakupie samochodu (lub rezygnacji) wraca na `/dashboard` i usuwa ofertę ze swojej listy obserwowanych.

## 4. Układ i struktura nawigacji

-   **Główny Layout (dla zalogowanych):** Strony `/dashboard`, `/offer/[id]`, `/settings` będą renderowane wewnątrz głównego layoutu Astro (`src/layouts/AppLayout.astro`).
    -   **Nagłówek (`Header.tsx`):**
        -   Logo aplikacji (link do `/dashboard`).
        -   Linki nawigacyjne: "Dashboard", "Ustawienia".
        -   Przycisk/menu użytkownika z opcją "Wyloguj".
    -   **Treść główna (`<slot />`):** Tutaj renderowana jest zawartość konkretnego widoku.
    -   **Stopka (`Footer.astro`):** Prosta stopka z podstawowymi informacjami.
-   **Layout uwierzytelniania (dla niezalogowanych):** Strony `/login` i `/register` będą używać prostszego layoutu, bez głównej nawigacji, aby skupić użytkownika na zadaniu.
-   **Providery React:** Główny layout będzie zawierał komponent `ReactProviders.tsx`, który otoczy całą aplikację kliencką w `QueryClientProvider` (dla TanStack Query) i `Toaster`.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów React, które będą stanowić budulec dla widoków.

-   **`OfferCard.tsx`:**
    -   **Opis:** Karta prezentująca skrócone informacje o ofercie. Odpowiada za wyświetlanie kluczowych danych i jest punktem wejścia do widoku szczegółów.
    -   **Użycie:** `Dashboard`.
-   **`PriceHistoryChart.tsx`:**
    -   **Opis:** Komponent wizualizujący historię cen w formie interaktywnego wykresu liniowego.
    -   **Użycie:** `Szczegóły Oferty`.
-   **`ui/Button.tsx`, `ui/Input.tsx`, `ui/Card.tsx`, etc.:**
    -   **Opis:** Podstawowe, generyczne komponenty z `Shadcn/ui`, które będą używane do budowy wszystkich bardziej złożonych elementów interfejsu, zapewniając spójność i dostępność.
    -   **Użycie:** W całej aplikacji.
-   **`ConfirmationDialog.tsx`:**
    -   **Opis:** Generyczny modal do potwierdzania akcji przez użytkownika (np. "Czy na pewno chcesz usunąć?").
    -   **Użycie:** `Dashboard` (usuwanie oferty), `Ustawienia` (usuwanie konta).
-   **`Skeleton.tsx`:**
    -   **Opis:** Komponent "szkieletu" z `Shadcn/ui` używany do tworzenia placeholderów (np. `OfferGridSkeleton`) podczas ładowania danych.
    -   **Użycie:** `Dashboard` i potencjalnie inne widoki z danymi dynamicznymi.
