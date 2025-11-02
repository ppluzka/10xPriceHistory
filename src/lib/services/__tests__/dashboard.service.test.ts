import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DashboardService } from "../dashboard.service";
import { OfferService } from "../offer.service";

// Mock OfferService
vi.mock("../offer.service");

describe("DashboardService", () => {
  let dashboardService: DashboardService;
  let mockSupabase: any;
  let mockOfferService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {};

    // Create dashboard service
    dashboardService = new DashboardService(mockSupabase);

    // Get the mocked OfferService instance
    mockOfferService = vi.mocked(OfferService).mock.results[0].value;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get()", () => {
    it("should return dashboard data with summary and offers", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "BMW X5",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 95000,
          currency: "PLN" as const,
          percentChangeFromFirst: -5.0,
          percentChangeFromPrevious: -2.0,
        },
        {
          id: 2,
          title: "Audi A6",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 80000,
          currency: "PLN" as const,
          percentChangeFromFirst: 10.0,
          percentChangeFromPrevious: 3.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 2,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.offers).toHaveLength(2);
      expect(result.summary.activeCount).toBe(2);
      expect(result.summary.avgChange).toBe(2.5); // (-5 + 10) / 2 = 2.5
      expect(result.summary.largestDrop).toBe(-5.0);
      expect(result.summary.largestRise).toBe(10.0);
    });

    it("should call OfferService.list with correct parameters", async () => {
      // Arrange
      mockOfferService.list.mockResolvedValue({
        data: [],
        page: 1,
        size: 100,
        total: 0,
      });

      // Act
      await dashboardService.get("user-123");

      // Assert
      expect(mockOfferService.list).toHaveBeenCalledWith("user-123", 1, 100, "created_at");
    });

    it("should return zero summary when no offers", async () => {
      // Arrange
      mockOfferService.list.mockResolvedValue({
        data: [],
        page: 1,
        size: 100,
        total: 0,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.offers).toEqual([]);
      expect(result.summary.activeCount).toBe(0);
      expect(result.summary.avgChange).toBe(0);
      expect(result.summary.largestDrop).toBe(0);
      expect(result.summary.largestRise).toBe(0);
    });

    it("should count only active offers", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "BMW X5",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 95000,
          currency: "PLN" as const,
          percentChangeFromFirst: -5.0,
          percentChangeFromPrevious: -2.0,
        },
        {
          id: 2,
          title: "Audi A6",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "removed" as const,
          lastChecked: "2025-01-01",
          currentPrice: 80000,
          currency: "PLN" as const,
          percentChangeFromFirst: 10.0,
          percentChangeFromPrevious: 3.0,
        },
        {
          id: 3,
          title: "Mercedes C-Class",
          url: "url3",
          imageUrl: "image3",
          city: "Gdansk",
          status: "error" as const,
          lastChecked: "2025-01-01",
          currentPrice: 60000,
          currency: "PLN" as const,
          percentChangeFromFirst: -10.0,
          percentChangeFromPrevious: -5.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 3,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.activeCount).toBe(1); // Only first offer is active
    });

    it("should calculate average change correctly", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: -10.0,
          percentChangeFromPrevious: -2.0,
        },
        {
          id: 2,
          title: "Car 2",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 5.0,
          percentChangeFromPrevious: 3.0,
        },
        {
          id: 3,
          title: "Car 3",
          url: "url3",
          imageUrl: "image3",
          city: "Gdansk",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 20.0,
          percentChangeFromPrevious: 10.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 3,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.avgChange).toBe(5.0); // (-10 + 5 + 20) / 3 = 5.0
    });

    it("should find largest drop correctly", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: -5.5,
          percentChangeFromPrevious: -2.0,
        },
        {
          id: 2,
          title: "Car 2",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: -25.3,
          percentChangeFromPrevious: -10.0,
        },
        {
          id: 3,
          title: "Car 3",
          url: "url3",
          imageUrl: "image3",
          city: "Gdansk",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 10.0,
          percentChangeFromPrevious: 5.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 3,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.largestDrop).toBe(-25.3);
    });

    it("should find largest rise correctly", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: -5.0,
          percentChangeFromPrevious: -2.0,
        },
        {
          id: 2,
          title: "Car 2",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 15.7,
          percentChangeFromPrevious: 5.0,
        },
        {
          id: 3,
          title: "Car 3",
          url: "url3",
          imageUrl: "image3",
          city: "Gdansk",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 50.2,
          percentChangeFromPrevious: 10.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 3,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.largestRise).toBe(50.2);
    });

    it("should round statistics to 2 decimal places", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 1.123456,
          percentChangeFromPrevious: 0.5,
        },
        {
          id: 2,
          title: "Car 2",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 2.876543,
          percentChangeFromPrevious: 1.2,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 2,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.avgChange).toBe(2.0); // (1.123456 + 2.876543) / 2 = 2.0
      expect(result.summary.largestDrop).toBe(1.12); // Min rounded to 2 decimal places
      expect(result.summary.largestRise).toBe(2.88); // Max rounded to 2 decimal places
    });

    it("should handle NaN values in price changes", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: NaN,
          percentChangeFromPrevious: NaN,
        },
        {
          id: 2,
          title: "Car 2",
          url: "url2",
          imageUrl: "image2",
          city: "Krakow",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 100000,
          currency: "PLN" as const,
          percentChangeFromFirst: 10.0,
          percentChangeFromPrevious: 5.0,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 2,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.avgChange).toBe(10.0); // Should ignore NaN and calculate from valid values
      expect(result.summary.largestDrop).toBe(10.0);
      expect(result.summary.largestRise).toBe(10.0);
    });

    it("should handle all NaN values gracefully", async () => {
      // Arrange
      const mockOffers = [
        {
          id: 1,
          title: "Car 1",
          url: "url",
          imageUrl: "image",
          city: "Warsaw",
          status: "active" as const,
          lastChecked: "2025-01-01",
          currentPrice: 0,
          currency: "PLN" as const,
          percentChangeFromFirst: NaN,
          percentChangeFromPrevious: NaN,
        },
      ];

      mockOfferService.list.mockResolvedValue({
        data: mockOffers,
        page: 1,
        size: 100,
        total: 1,
      });

      // Act
      const result = await dashboardService.get("user-123");

      // Assert
      expect(result.summary.avgChange).toBe(0);
      expect(result.summary.largestDrop).toBe(0);
      expect(result.summary.largestRise).toBe(0);
    });
  });
});
