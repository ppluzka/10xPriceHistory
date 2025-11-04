# Plan tłumaczenia DashboardView na język polski

## 📋 Cel
Przetłumaczenie wszystkich tekstów angielskich w `DashboardView.tsx` i powiązanych komponentach na język polski, aby zachować spójność z resztą aplikacji.

## 🔍 Analiza obecnego stanu

### Komponenty wymagające tłumaczenia:

1. **DashboardView.tsx** - główny komponent widoku dashboard
2. **DashboardStats.tsx** - statystyki dashboard
3. **OfferForm.tsx** - formularz dodawania oferty
4. **OfferGrid.tsx** - siatka z ofertami
5. **OfferCard.tsx** - karta pojedynczej oferty

## 📝 Szczegółowy plan tłumaczeń

### 1. DashboardView.tsx

#### Teksty do przetłumaczenia:

| Linia | Tekst angielski | Tekst polski |
|-------|----------------|--------------|
| 27 | "Failed to fetch dashboard data" | "Nie udało się pobrać danych dashboardu" |
| 33 | "An error occurred" | "Wystąpił błąd" |
| 76 | "Failed to delete offer" | "Nie udało się usunąć oferty" |
| 81 | "Failed to delete offer" | "Nie udało się usunąć oferty" |
| 97 | "Failed to recheck offer" | "Nie udało się sprawdzić oferty ponownie" |
| 129 | "Failed to recheck offer" | "Nie udało się sprawdzić oferty ponownie" |
| 141 | "Failed to load dashboard data" | "Nie udało się załadować danych dashboardu" |
| 143 | "Retry" | "Spróbuj ponownie" |
| 171 | "Dismiss" | "Zamknij" |

**Uwaga:** Linia 126 już zawiera polski tekst: "Cena zaktualizowana pomyślnie" - pozostawić bez zmian.

---

### 2. DashboardStats.tsx

#### Teksty do przetłumaczenia:

| Linia | Tekst angielski | Tekst polski |
|-------|----------------|--------------|
| 54 | "Dashboard" | "Panel główny" |
| 56 | "Track your watched offers and price changes" | "Śledź obserwowane oferty i zmiany cen" |
| 62 | "Active Offers" | "Aktywne oferty" |
| 64 | "slots remaining" | "pozostało miejsc" |
| 68 | "Average Change" | "Średnia zmiana" |
| 71 | "From first price" | "Od pierwszej ceny" |
| 75 | "Largest Drop" | "Największy spadek" |
| 78 | "Best discount found" | "Najlepsza znaleziona zniżka" |
| 82 | "Largest Rise" | "Największy wzrost" |
| 85 | "Highest increase" | "Najwyższy wzrost" |

---

### 3. OfferForm.tsx

#### Teksty do przetłumaczenia:

| Linia | Tekst angielski | Tekst polski |
|-------|----------------|--------------|
| 71 | "Failed to add offer" | "Nie udało się dodać oferty" |
| 82 | "Failed to add offer" | "Nie udało się dodać oferty" |
| 109 | "Add New Offer" | "Dodaj nową ofertę" |
| 110 | "Paste an otomoto.pl URL to start tracking price changes" | "Wklej adres URL z otomoto.pl, aby rozpocząć śledzenie zmian cen" |
| 145 | "Adding..." | "Dodawanie..." |
| 145 | "Add Offer" | "Dodaj ofertę" |

**Uwaga:** Komponenty walidacji już są w języku polskim:
- "Wprowadź adres URL."
- "URL musi być z otomoto.pl"

---

### 4. OfferGrid.tsx

#### Teksty do przetłumaczenia:

| Linia | Tekst angielski | Tekst polski |
|-------|----------------|--------------|
| 23 | "No offers yet" | "Brak ofert" |
| 24 | "Add your first offer from otomoto.pl to start tracking price changes" | "Dodaj pierwszą ofertę z otomoto.pl, aby rozpocząć śledzenie zmian cen" |
| 33 | "Your Watched Offers" | "Twoje obserwowane oferty" |

---

### 5. OfferCard.tsx

#### Teksty do przetłumaczenia:

| Linia | Tekst angielski | Tekst polski |
|-------|----------------|--------------|
| 153 | "Delete offer" | "Usuń ofertę" |
| 219 | "Last checked: " | "Ostatnie sprawdzenie: " |
| 303 | "Delete Offer" | "Usuń ofertę" |
| 305 | "Are you sure you want to stop tracking this offer? This action cannot be undone." | "Czy na pewno chcesz przestać śledzić tę ofertę? Ta akcja jest nieodwracalna." |
| 315 | "Cancel" | "Anuluj" |
| 322 | "Delete" | "Usuń" |

**Uwaga:** Komponenty już zawierają polskie teksty:
- Statusy: "Aktywna", "Błąd sprawdzania", "Oferta usunięta"
- Przyciski: "Sprawdzanie...", "Sprawdź ponownie"
- Ostrzeżenie: "Ta oferta została usunięta z Otomoto i nie jest już sprawdzana."

---

## ✅ Checklist implementacji

### Faza 1: DashboardView.tsx
- [ ] Przetłumaczyć komunikaty błędów
- [ ] Przetłumaczyć przyciski akcji
- [ ] Zachować istniejący polski tekst (linia 126)

### Faza 2: DashboardStats.tsx
- [ ] Przetłumaczyć nagłówek i opis
- [ ] Przetłumaczyć etykiety statystyk
- [ ] Przetłumaczyć opisy statystyk

### Faza 3: OfferForm.tsx
- [ ] Przetłumaczyć nagłówek i opis formularza
- [ ] Przetłumaczyć komunikaty błędów
- [ ] Przetłumaczyć teksty przycisków

### Faza 4: OfferGrid.tsx
- [ ] Przetłumaczyć tytuł sekcji
- [ ] Przetłumaczyć teksty stanu pustego

### Faza 5: OfferCard.tsx
- [ ] Przetłumaczyć teksty modala usuwania
- [ ] Przetłumaczyć etykietę "Last checked"
- [ ] Przetłumaczyć aria-label

### Faza 6: Weryfikacja
- [ ] Sprawdzić wszystkie komponenty w przeglądarce
- [ ] Zweryfikować spójność z resztą aplikacji
- [ ] Sprawdzić czy wszystkie testy przechodzą (jeśli są)

---

## 🎯 Priorytety

1. **Wysoki priorytet:** DashboardView.tsx, DashboardStats.tsx (główne elementy widoczne)
2. **Średni priorytet:** OfferForm.tsx, OfferGrid.tsx (często używane)
3. **Niski priorytet:** OfferCard.tsx (modal usuwania - rzadziej używany)

---

## 📌 Uwagi techniczne

1. **Format daty:** Sprawdzić czy `toLocaleDateString("pl-PL")` jest już używany (OfferCard.tsx linia 219)
2. **Spójność:** Upewnić się, że tłumaczenia są spójne z innymi komponentami (np. SettingsView)
3. **Testy:** Zweryfikować czy testy E2E wymagają aktualizacji (mogą zawierać angielskie teksty)
4. **ARIA labels:** Przetłumaczyć również aria-label dla dostępności

---

## 🔄 Po implementacji

1. Przetestować wszystkie funkcjonalności dashboardu
2. Sprawdzić responsywność na różnych rozdzielczościach
3. Zweryfikować działanie w dark mode
4. Przejrzeć konsolę pod kątem błędów
5. Sprawdzić czy wszystkie interakcje działają poprawnie

---

## 📚 Referencje

- Wzorce tłumaczeń z innych komponentów:
  - `OfferStats.tsx` - używa polskich etykiet
  - `SettingsView.tsx` - kompletnie po polsku
  - `index.astro` - polskie teksty na stronie głównej

