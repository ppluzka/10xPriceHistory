# Ulepszenia ekstrakcji lokalizacji w OfferService

## Problem
Podczas dodawania oferty LLM nie był w stanie wyekstrahować lokalizacji z HTML. Lokalizacja na Otomoto.pl znajduje się w niestandardowym miejscu - pomiędzy elementem SVG (ikona mapy) a `google-map-container`, co utrudniało jej wykrycie przy użyciu uproszczonej wersji HTML przekazywanej do LLM.

## Rozwiązanie

### 1. Zwiększony kontekst dla LLM

**Przed:**
- `mainContent`: 5000 znaków z body
- Tylko tytuł i meta tagi
- Brak specjalnego kontekstu dla lokalizacji

**Po:**
- `mainContent`: 8000 znaków z body (60% więcej)
- Dodatkowa sekcja "Location Context" z tekstem wokół ikon i elementów związanych z lokalizacją

### 2. Inteligentne wydobywanie kontekstu lokalizacji

Dodany kod w `extractWithLLM()`:

```typescript
const locationContext: string[] = [];

// Find all SVG elements that might be location icons
$("svg").each((_, el) => {
  const $svg = $(el);
  const $parent = $svg.parent();
  const $container = $parent.parent();

  // Get text content around SVG (siblings and parent text)
  const nearbyText = $container.text().trim();
  if (nearbyText && nearbyText.length < 200 && nearbyText.length > 2) {
    locationContext.push(`Context near icon: ${nearbyText}`);
  }
});

// Look for common location-related patterns
$('a[href*="lokalizacja"], [data-testid*="location"], [class*="location"]').each((_, el) => {
  const text = $(el).text().trim();
  if (text && text.length < 100) {
    locationContext.push(`Location element: ${text}`);
  }
});
```

**Strategia:**
- Przeszukuje wszystkie elementy SVG i zbiera tekst z ich kontenerów nadrzędnych
- Szuka elementów z atrybutami związanymi z lokalizacją (`href*="lokalizacja"`, `data-testid*="location"`, `class*="location"`)
- Ogranicza długość zbieranego tekstu (max 200 znaków dla SVG, 100 dla innych)
- Zbiera do 10 najlepszych kontekstów

### 3. Ulepszony prompt systemowy dla LLM

**Kluczowe dodatki:**

1. **Szczegółowe instrukcje dla lokalizacji:**
```
5. **city**: City/location name - THIS IS CRITICAL TO FIND
   - Location can appear in various places in the HTML structure
   - Often appears near location/map SVG icons (between svg and google-map-container elements)
   - Look for text in "Location Context" section I provide
   - May be in links with "lokalizacja" or location-related attributes
```

2. **Przykłady i wzorce:**
```
   - Common patterns: just city name, "City, Region", or with postal code
   - Extract ONLY the city name, remove region/voivodeship and extra text
   - Examples: "Warszawa", "Kraków", "Gdańsk", "Poznań"
```

3. **Zasady czyszczenia:**
```
IMPORTANT LOCATION EXTRACTION RULES:
- Check "Location Context" section first - text near icons is most reliable
- Look for Polish city names (capitalize first letter)
- Remove extra text like voivodeships (e.g., "(mazowieckie)", "(małopolskie)")
- Clean up the result to just the city name
```

## Format danych przekazywanych do LLM

Nowy format zawiera dodatkową sekcję:

```
URL: {url}
Title: {title}

Meta Tags:
{metaTags}

Location Context (text near icons and location elements):
Context near icon: Warszawa
Context near icon: Zobacz na mapie
Location element: Warszawa, mazowieckie

Main Content:
{mainContent}
```

## Zalety rozwiązania

1. **Elastyczność:** LLM może znaleźć lokalizację niezależnie od zmian w strukturze HTML Otomoto.pl
2. **Kontekst:** Dostarczenie specyficznego kontekstu dla lokalizacji zwiększa szanse na sukces
3. **Inteligencja:** LLM może rozpoznać wzorce i oczyścić dane (np. usunąć województwo)
4. **Fallback:** Jeśli lokalizacja nie jest w strukturze, LLM może ją znaleźć w głównej treści
5. **Niskie koszty:** Zwiększenie z 5000 do 8000 znaków to tylko +60% tokenów, a znacząco poprawia wyniki

## Możliwe dalsze ulepszenia

1. **A/B testing:** Monitorować skuteczność ekstrakcji lokalizacji
2. **Feedback loop:** Zbierać przypadki gdzie lokalizacja = "Nieznana" i analizować HTML
3. **Optymalizacja selektorów:** Jeśli znajdziemy stałe wzorce, dodać bardziej precyzyjne selektory
4. **Cache:** Cachować wzorce selektorów dla Otomoto.pl (jeśli struktura jest stabilna)

## Testing

Po wdrożeniu należy przetestować z różnymi ofertami:
- ✅ Standardowe oferty z lokalizacją
- ✅ Oferty z długimi nazwami miast
- ✅ Oferty z województwem w lokalizacji
- ✅ Oferty zagraniczne (jeśli dotyczy)

## Metryki sukcesu

- Procent ofert z prawidłowo wyekstrahowaną lokalizacją
- Liczba przypadków gdzie lokalizacja = "Nieznana"
- Czas ekstrakcji (powinien pozostać podobny)
- Koszt tokenów (niewielki wzrost ~60%)

