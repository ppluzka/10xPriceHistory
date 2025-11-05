/**
 * Test data factory for Offer entities
 * Use this to create consistent mock data for tests
 */

export interface MockOffer {
  id: string;
  user_id: string;
  title: string;
  url: string;
  current_price: number;
  lowest_price: number | null;
  highest_price: number | null;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
  status: "active" | "inactive" | "error";
  error_message: string | null;
}

export interface MockPriceHistory {
  id: string;
  offer_id: string;
  price: number;
  recorded_at: string;
  created_at: string;
}

/**
 * Creates a mock offer with default or custom values
 */
export function createMockOffer(overrides?: Partial<MockOffer>): MockOffer {
  const now = new Date().toISOString();

  return {
    id: `offer-${Math.random().toString(36).substr(2, 9)}`,
    user_id: `user-${Math.random().toString(36).substr(2, 9)}`,
    title: "Test Product",
    url: "https://example.com/product/123",
    current_price: 99.99,
    lowest_price: 89.99,
    highest_price: 119.99,
    last_checked_at: now,
    created_at: now,
    updated_at: now,
    status: "active",
    error_message: null,
    ...overrides,
  };
}

/**
 * Creates multiple mock offers
 */
export function createMockOffers(count: number, overrides?: Partial<MockOffer>): MockOffer[] {
  return Array.from({ length: count }, (_, index) =>
    createMockOffer({
      title: `Test Product ${index + 1}`,
      ...overrides,
    })
  );
}

/**
 * Creates a mock price history entry
 */
export function createMockPriceHistory(offerId: string, overrides?: Partial<MockPriceHistory>): MockPriceHistory {
  const now = new Date().toISOString();

  return {
    id: `price-${Math.random().toString(36).substr(2, 9)}`,
    offer_id: offerId,
    price: 99.99,
    recorded_at: now,
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a series of price history entries with different prices
 */
export function createMockPriceHistorySeries(
  offerId: string,
  count: number,
  startPrice = 100,
  priceVariation = 10
): MockPriceHistory[] {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - index - 1)); // Go back in time

    const priceChange = (Math.random() - 0.5) * priceVariation;
    const price = Math.round((startPrice + priceChange) * 100) / 100;

    return createMockPriceHistory(offerId, {
      price,
      recorded_at: date.toISOString(),
      created_at: date.toISOString(),
    });
  });
}

/**
 * Creates a mock user object
 */
export interface MockUser {
  id: string;
  email: string;
  created_at: string;
}

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  const now = new Date().toISOString();

  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: "test@example.com",
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock user preferences object
 */
export interface MockUserPreferences {
  id: string;
  user_id: string;
  check_frequency: "daily" | "weekly" | "monthly";
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function createMockUserPreferences(
  userId: string,
  overrides?: Partial<MockUserPreferences>
): MockUserPreferences {
  const now = new Date().toISOString();

  return {
    id: `pref-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    check_frequency: "daily",
    email_notifications: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
