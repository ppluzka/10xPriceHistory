import type { OfferDetailDto, PaginatedDto, PriceHistoryDto } from "@/types";

/**
 * Mock offer data for testing
 */
export const mockOfferDetail: OfferDetailDto = {
  id: "test-offer-id",
  title: "BMW X5 3.0d xDrive",
  url: "https://www.otomoto.pl/test-offer",
  imageUrl: "https://example.com/image.jpg",
  city: "Warszawa",
  status: "active",
  frequency: "daily",
  createdAt: "2024-01-01T00:00:00Z",
  lastChecked: "2024-01-10T12:00:00Z",
  firstPrice: 100000,
  lastPrice: 95000,
  percentChangeFromFirst: -5.0,
  percentChangeFromPrevious: -2.5,
  stats: {
    min: 93000,
    max: 102000,
    avg: 97500,
  },
};

/**
 * Mock offer with removed status
 */
export const mockRemovedOffer: OfferDetailDto = {
  ...mockOfferDetail,
  status: "removed",
};

/**
 * Mock offer with error status
 */
export const mockErrorOffer: OfferDetailDto = {
  ...mockOfferDetail,
  status: "error",
};

/**
 * Mock offer with stable trend (< 2% change)
 */
export const mockStableOffer: OfferDetailDto = {
  ...mockOfferDetail,
  percentChangeFromFirst: 1.5,
  percentChangeFromPrevious: 0.5,
};

/**
 * Mock offer with rising trend (> 2% change)
 */
export const mockRisingOffer: OfferDetailDto = {
  ...mockOfferDetail,
  percentChangeFromFirst: 5.5,
  percentChangeFromPrevious: 3.0,
};

/**
 * Mock price history with multiple entries
 */
export const mockPriceHistory: PriceHistoryDto[] = [
  {
    price: 95000,
    currency: "PLN",
    checkedAt: "2024-01-10T12:00:00Z",
  },
  {
    price: 97500,
    currency: "PLN",
    checkedAt: "2024-01-08T12:00:00Z",
  },
  {
    price: 98000,
    currency: "PLN",
    checkedAt: "2024-01-06T12:00:00Z",
  },
  {
    price: 100000,
    currency: "PLN",
    checkedAt: "2024-01-01T12:00:00Z",
  },
];

/**
 * Mock price history with price changes
 */
export const mockPriceHistoryWithChanges: PriceHistoryDto[] = [
  {
    price: 90000,
    currency: "PLN",
    checkedAt: "2024-01-10T12:00:00Z",
  },
  {
    price: 95000,
    currency: "PLN",
    checkedAt: "2024-01-08T12:00:00Z",
  },
  {
    price: 95000,
    currency: "PLN",
    checkedAt: "2024-01-06T12:00:00Z",
  },
  {
    price: 100000,
    currency: "PLN",
    checkedAt: "2024-01-01T12:00:00Z",
  },
];

/**
 * Mock empty price history
 */
export const mockEmptyPriceHistory: PriceHistoryDto[] = [];

/**
 * Mock price history with single entry
 */
export const mockSinglePriceHistory: PriceHistoryDto[] = [
  {
    price: 100000,
    currency: "PLN",
    checkedAt: "2024-01-01T12:00:00Z",
  },
];

/**
 * Mock paginated price history
 */
export const mockPaginatedHistory: PaginatedDto<PriceHistoryDto> = {
  data: mockPriceHistory,
  page: 1,
  size: 10,
  total: mockPriceHistory.length,
};

/**
 * Mock paginated empty history
 */
export const mockPaginatedEmptyHistory: PaginatedDto<PriceHistoryDto> = {
  data: [],
  page: 1,
  size: 10,
  total: 0,
};

/**
 * Mock paginated single entry history
 */
export const mockPaginatedSingleHistory: PaginatedDto<PriceHistoryDto> = {
  data: mockSinglePriceHistory,
  page: 1,
  size: 10,
  total: 1,
};
