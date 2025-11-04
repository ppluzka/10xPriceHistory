import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOfferData } from "../useOfferData";
import {
  mockOfferDetail,
  mockStableOffer,
  mockRisingOffer,
  mockPaginatedHistory,
  mockPaginatedEmptyHistory,
  mockPaginatedSingleHistory,
} from "./mockData";

describe("useOfferData", () => {
  describe("Data Transformation", () => {
    it("should transform offer to header view model correctly", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.headerData).toEqual({
        title: mockOfferDetail.title,
        imageUrl: mockOfferDetail.imageUrl,
        url: mockOfferDetail.url,
        city: mockOfferDetail.city,
        percentChangeFromFirst: mockOfferDetail.percentChangeFromFirst,
        percentChangeFromPrevious: mockOfferDetail.percentChangeFromPrevious,
      });
    });

    it("should extract history data array from paginated response", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.history).toEqual(mockPaginatedHistory.data);
      expect(result.current.history).toHaveLength(4);
    });

    it("should transform price history to chart view model with correct date formats", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.chartData).toHaveLength(4);
      // History is reversed, so first element is oldest (first check)
      expect(result.current.chartData[0]).toMatchObject({
        date: expect.stringMatching(/^\d{2}\.\d{2}$/), // DD.MM format
        fullDate: expect.stringMatching(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/), // DD.MM.YYYY HH:mm
        price: 100000, // First (oldest) entry
        currency: "PLN",
      });
      // Last element is newest
      expect(result.current.chartData[3]).toMatchObject({
        date: expect.stringMatching(/^\d{2}\.\d{2}$/),
        fullDate: expect.stringMatching(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/),
        price: 95000, // Last (newest) entry
        currency: "PLN",
      });
    });
  });

  describe("Stats Calculation", () => {
    it("should calculate stats with correct min, max, avg prices", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.statsData).toMatchObject({
        minPrice: 93000,
        maxPrice: 102000,
        avgPrice: 97500, // Should be rounded
        checkCount: 4,
        currency: "PLN",
      });
    });

    it("should determine falling trend when change < -2%", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail, // -5% change
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.statsData.trend).toBe("spadkowy");
    });

    it("should determine stable trend when change between -2% and 2%", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockStableOffer, // 1.5% change
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.statsData.trend).toBe("stabilny");
    });

    it("should determine rising trend when change > 2%", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockRisingOffer, // 5.5% change
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.statsData.trend).toBe("wzrostowy");
    });

    it("should calculate observation duration in days", () => {
      // Mock offer created on 2024-01-01, last checked on 2024-01-10 = 9 days
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      expect(result.current.statsData.observationDurationDays).toBe(9);
    });

    it("should calculate observation duration from history data regardless of lastChecked", () => {
      const offerWithoutLastChecked = {
        ...mockOfferDetail,
        lastChecked: null,
      };

      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: offerWithoutLastChecked,
          initialHistory: mockPaginatedHistory,
        })
      );

      // Should calculate from history data (first to last check) = 9 days
      // This is independent of offer.lastChecked or current date
      expect(result.current.statsData.observationDurationDays).toBe(9);
    });

    it("should use PLN as default currency when history is empty", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedEmptyHistory,
        })
      );

      expect(result.current.statsData.currency).toBe("PLN");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty price history", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedEmptyHistory,
        })
      );

      expect(result.current.history).toEqual([]);
      expect(result.current.chartData).toEqual([]);
      expect(result.current.statsData.checkCount).toBe(0);
    });

    it("should handle single price history entry", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedSingleHistory,
        })
      );

      expect(result.current.history).toHaveLength(1);
      expect(result.current.chartData).toHaveLength(1);
      expect(result.current.statsData.checkCount).toBe(1);
    });

    it("should return correct loading and error states for MVP", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      // MVP always returns false (SSR approach)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("Memoization", () => {
    it("should memoize header data when offer doesn't change", () => {
      const { result, rerender } = renderHook(
        (props) => useOfferData(props),
        {
          initialProps: {
            initialOffer: mockOfferDetail,
            initialHistory: mockPaginatedHistory,
          },
        }
      );

      const firstHeaderData = result.current.headerData;

      // Rerender with same props
      rerender({
        initialOffer: mockOfferDetail,
        initialHistory: mockPaginatedHistory,
      });

      // Should be same reference (memoized)
      expect(result.current.headerData).toBe(firstHeaderData);
    });

    it("should memoize chart data when history doesn't change", () => {
      const { result, rerender } = renderHook(
        (props) => useOfferData(props),
        {
          initialProps: {
            initialOffer: mockOfferDetail,
            initialHistory: mockPaginatedHistory,
          },
        }
      );

      const firstChartData = result.current.chartData;

      // Rerender with same props
      rerender({
        initialOffer: mockOfferDetail,
        initialHistory: mockPaginatedHistory,
      });

      // Should be same reference (memoized)
      expect(result.current.chartData).toBe(firstChartData);
    });
  });

  describe("Date Formatting", () => {
    it("should format dates for chart axis correctly (DD.MM)", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      // All dates should be in DD.MM format
      result.current.chartData.forEach((point) => {
        expect(point.date).toMatch(/^\d{2}\.\d{2}$/);
      });
    });

    it("should format full dates for tooltip correctly (DD.MM.YYYY HH:mm)", () => {
      const { result } = renderHook(() =>
        useOfferData({
          initialOffer: mockOfferDetail,
          initialHistory: mockPaginatedHistory,
        })
      );

      // All full dates should be in DD.MM.YYYY HH:mm format
      result.current.chartData.forEach((point) => {
        expect(point.fullDate).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
      });
    });
  });
});

