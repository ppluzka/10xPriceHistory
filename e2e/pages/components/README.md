# Page Object Model Components

This directory contains reusable component-level Page Object Models following the Component Object Pattern.

## Architecture

The POM structure follows a hierarchical composition pattern:

```
BasePage (base functionality)
    └── DashboardPage (page-level POM)
        ├── DashboardStatsComponent
        ├── OfferFormComponent
        └── OfferGridComponent
            └── OfferCardComponent
```

## Components

### DashboardStatsComponent

Handles interactions with the dashboard statistics section.

**Key Methods:**
- `getActiveOffersCount()` - Returns the count of active offers
- `getAverageChange()` - Returns average price change percentage
- `getLargestDrop()` - Returns largest price drop
- `getLargestRise()` - Returns largest price rise
- `waitForActiveOffersCount(expectedCount)` - Waits for specific count

**Usage Example:**
```typescript
const stats = dashboardPage.stats;
const activeCount = await stats.getActiveOffersCount();
await stats.waitForActiveOffersCount(5);
```

### OfferFormComponent

Handles interactions with the offer addition form.

**Key Methods:**
- `fillUrl(url)` - Fills the URL input
- `clickSubmit()` - Clicks submit button
- `submitOffer(url)` - Complete submission flow
- `hasValidationError()` - Checks for validation errors
- `getValidationError()` - Gets validation error message
- `waitForSuccess()` - Waits for successful submission

**Usage Example:**
```typescript
const form = dashboardPage.offerForm;
await form.submitOffer('https://www.otomoto.pl/...');
await form.waitForSuccess();
```

### OfferGridComponent

Handles interactions with the offers list/grid.

**Key Methods:**
- `isLoading()` - Checks if skeleton is visible
- `waitForLoaded()` - Waits for loading to complete
- `isEmpty()` - Checks if empty state is shown
- `hasOffers()` - Checks if grid has offers
- `getOffersCount()` - Returns number of offers
- `getOfferCard(index)` - Gets offer card by index
- `getOfferCardById(id)` - Gets offer card by ID
- `waitForNewOffer(previousCount)` - Waits for new offer
- `getAllOfferTitles()` - Gets all offer titles

**Usage Example:**
```typescript
const grid = dashboardPage.offerGrid;
await grid.waitForLoaded();
const count = await grid.getOffersCount();
const firstCard = grid.getOfferCard(0);
```

### OfferCardComponent

Represents a single offer card in the grid.

**Key Methods:**
- `getOfferId()` - Returns offer ID
- `click()` - Clicks card to navigate to details
- `getTitle()` - Returns offer title
- `getStatus()` - Returns offer status
- `getCity()` - Returns offer city
- `getPrice()` - Returns current price
- `getPriceChange()` - Returns price change percentage
- `hasPriceChange()` - Checks if price changed
- `hover()` - Hovers over card
- `clickDelete()` - Clicks delete button

**Usage Example:**
```typescript
const card = dashboardPage.offerGrid.getOfferCard(0);
const title = await card.getTitle();
const price = await card.getPrice();
await card.click(); // Navigate to details
```

## Usage Patterns

### Basic Usage

```typescript
import { DashboardPage } from './pages/DashboardPage';

const dashboardPage = new DashboardPage(page);
await dashboardPage.navigate();

// Use components directly
await dashboardPage.offerForm.submitOffer('https://www.otomoto.pl/...');
await dashboardPage.offerGrid.waitForLoaded();
const count = await dashboardPage.stats.getActiveOffersCount();
```

### High-Level Workflows

The `DashboardPage` provides high-level workflow methods:

```typescript
// Complete add offer workflow
await dashboardPage.addOfferAndWait('https://www.otomoto.pl/...');

// Verify offer was added correctly
const isValid = await dashboardPage.verifyOfferAdded('Expected Title');
expect(isValid).toBe(true);
```

### Component Composition

Components can be used independently or composed:

```typescript
// Independent usage
const form = new OfferFormComponent(page);
await form.submitOffer('https://www.otomoto.pl/...');

// Composed usage
const grid = dashboardPage.offerGrid;
const cards = await grid.getAllOfferCards();

for (const card of cards) {
  const title = await card.getTitle();
  console.log(title);
}
```

## Testing Patterns

### Test Structure

```typescript
test.describe('Feature', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
  });

  test('should perform action', async () => {
    // Arrange
    const initialCount = await dashboardPage.offerGrid.getOffersCount();

    // Act
    await dashboardPage.offerForm.submitOffer('https://...');

    // Assert
    await dashboardPage.offerGrid.waitForNewOffer(initialCount);
    expect(await dashboardPage.offerGrid.getOffersCount()).toBe(initialCount + 1);
  });
});
```

### Waiting Strategies

The components provide multiple waiting strategies:

```typescript
// Wait for loading to complete
await grid.waitForLoaded();

// Wait for specific count
await grid.waitForOffersCount(5);

// Wait for new offer based on previous count
await grid.waitForNewOffer(previousCount);

// Wait for stats to update
await stats.waitForActiveOffersCount(expectedCount);

// Wait for form success
await form.waitForSuccess();
```

## Best Practices

1. **Use Component Methods**: Prefer component methods over raw locators
2. **High-Level Workflows**: Use workflow methods for common scenarios
3. **Wait Strategies**: Always wait for state changes before assertions
4. **Composition**: Compose components for complex interactions
5. **Type Safety**: Leverage TypeScript for compile-time checks
6. **Reusability**: Keep components focused and reusable

## Data Test IDs Reference

All components use `data-testid` attributes for reliable element selection:

### Form
- `offer-form` - Form container
- `offer-url-input` - URL input field
- `offer-submit-button` - Submit button
- `offer-validation-error` - Validation error message
- `offer-submit-error` - Submission error message

### Grid
- `offers-loading` - Loading skeleton
- `offers-empty-state` - Empty state
- `offers-section` - Grid section container
- `offers-grid` - Grid container

### Card
- `offer-card` - Card container (+ `data-offer-id` attribute)
- `offer-card-link` - Card link
- `offer-card-image` - Offer image
- `offer-card-status` - Status badge
- `offer-card-title` - Offer title
- `offer-card-city` - City
- `offer-card-price` - Current price
- `offer-card-price-change` - Price change badge
- `offer-card-last-checked` - Last checked date
- `offer-card-delete-button` - Delete button

### Stats
- `dashboard-stats` - Stats container
- `stat-card-aktywne-oferty` - Active offers card (generated from Polish label "Aktywne oferty")
- `stat-value-aktywne-oferty` - Active offers value
- `stat-card-średnia-zmiana` - Average change card (generated from Polish label "Średnia zmiana")
- `stat-value-średnia-zmiana` - Average change value
- `stat-card-największy-spadek` - Largest drop card (generated from Polish label "Największy spadek")
- `stat-value-największy-spadek` - Largest drop value
- `stat-card-największy-wzrost` - Largest rise card (generated from Polish label "Największy wzrost")
- `stat-value-największy-wzrost` - Largest rise value

