/**
 * Test data factory for Dashboard entities
 * Use this to create consistent mock data for dashboard tests
 */

import type { DashboardDto, DashboardSummaryDto, OfferDto } from "@/types";

/**
 * Creates a mock OfferDto with default or custom values
 */
export function createMockOfferDto(overrides?: Partial<OfferDto>): OfferDto {
  const now = new Date().toISOString();
  const randomId = Math.random().toString(36).substring(2, 11);

  return {
    id: `offer-${randomId}`,
    title: "Test Car Offer",
    url: "https://otomoto.pl/offer/test-123",
    imageUrl: "https://example.com/image.jpg",
    city: "Warszawa",
    status: "active",
    lastChecked: now,
    currentPrice: 50000,
    currency: "PLN",
    percentChangeFromFirst: -5.5,
    percentChangeFromPrevious: -2.3,
    ...overrides,
  };
}

/**
 * Creates multiple mock OfferDto objects
 */
export function createMockOfferDtos(
  count: number,
  overrides?: Partial<OfferDto>
): OfferDto[] {
  return Array.from({ length: count }, (_, index) =>
    createMockOfferDto({
      title: `Test Car Offer ${index + 1}`,
      currentPrice: 40000 + index * 10000,
      percentChangeFromFirst: -5 - index,
      ...overrides,
    })
  );
}

/**
 * Creates a mock DashboardSummaryDto with default or custom values
 */
export function createMockDashboardSummary(
  overrides?: Partial<DashboardSummaryDto>
): DashboardSummaryDto {
  return {
    activeCount: 5,
    avgChange: -3.5,
    largestDrop: -15.2,
    largestRise: 8.7,
    ...overrides,
  };
}

/**
 * Creates a mock DashboardDto with default or custom values
 */
export function createMockDashboardDto(
  overrides?: Partial<DashboardDto>
): DashboardDto {
  const offers = overrides?.offers || createMockOfferDtos(5);
  const summary = overrides?.summary || createMockDashboardSummary();

  return {
    summary,
    offers,
    ...overrides,
  };
}

/**
 * Creates a DashboardDto with specific scenarios
 */
export const dashboardScenarios = {
  /**
   * Empty dashboard with no offers
   */
  empty: (): DashboardDto => ({
    summary: {
      activeCount: 0,
      avgChange: 0,
      largestDrop: 0,
      largestRise: 0,
    },
    offers: [],
  }),

  /**
   * Dashboard with all prices dropping
   */
  allDropping: (): DashboardDto => ({
    summary: {
      activeCount: 3,
      avgChange: -10.5,
      largestDrop: -20.0,
      largestRise: -5.0,
    },
    offers: createMockOfferDtos(3, {
      percentChangeFromFirst: -10,
      percentChangeFromPrevious: -3,
    }),
  }),

  /**
   * Dashboard with all prices rising
   */
  allRising: (): DashboardDto => ({
    summary: {
      activeCount: 3,
      avgChange: 8.5,
      largestDrop: 3.0,
      largestRise: 15.0,
    },
    offers: createMockOfferDtos(3, {
      percentChangeFromFirst: 10,
      percentChangeFromPrevious: 2,
    }),
  }),

  /**
   * Dashboard with mixed price changes
   */
  mixed: (): DashboardDto => ({
    summary: {
      activeCount: 4,
      avgChange: -2.5,
      largestDrop: -12.0,
      largestRise: 7.0,
    },
    offers: [
      createMockOfferDto({
        title: "Dropping Car",
        percentChangeFromFirst: -12.0,
        percentChangeFromPrevious: -3.0,
      }),
      createMockOfferDto({
        title: "Rising Car",
        percentChangeFromFirst: 7.0,
        percentChangeFromPrevious: 2.0,
      }),
      createMockOfferDto({
        title: "Stable Car",
        percentChangeFromFirst: 0,
        percentChangeFromPrevious: 0,
      }),
      createMockOfferDto({
        title: "Slight Drop",
        percentChangeFromFirst: -2.5,
        percentChangeFromPrevious: -1.0,
      }),
    ],
  }),

  /**
   * Dashboard with some inactive/error offers
   */
  withErrors: (): DashboardDto => ({
    summary: {
      activeCount: 2,
      avgChange: -5.0,
      largestDrop: -10.0,
      largestRise: 0.0,
    },
    offers: [
      createMockOfferDto({ status: "active" }),
      createMockOfferDto({ status: "active" }),
      createMockOfferDto({ status: "error" }),
      createMockOfferDto({ status: "inactive" }),
    ],
  }),

  /**
   * Dashboard at the 100 offer limit
   */
  atLimit: (): DashboardDto => ({
    summary: {
      activeCount: 100,
      avgChange: -3.2,
      largestDrop: -25.0,
      largestRise: 15.0,
    },
    offers: createMockOfferDtos(100),
  }),
};

