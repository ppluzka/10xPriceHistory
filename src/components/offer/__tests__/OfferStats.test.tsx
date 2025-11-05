import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfferStats from "../OfferStats";
import type { OfferStatsViewModel } from "@/types";

describe("OfferStats", () => {
  const mockStats: OfferStatsViewModel = {
    minPrice: 93000,
    maxPrice: 102000,
    avgPrice: 97500,
    checkCount: 15,
    trend: "spadkowy",
    observationDurationDays: 9,
    currency: "PLN",
  };

  describe("Content Rendering", () => {
    it("should render all stat items", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("Cena minimalna")).toBeInTheDocument();
      expect(screen.getByText("Cena maksymalna")).toBeInTheDocument();
      expect(screen.getByText("Trend")).toBeInTheDocument();
      expect(screen.getByText("Liczba sprawdzeń")).toBeInTheDocument();
      expect(screen.getByText("Okres obserwacji")).toBeInTheDocument();
    });

    it("should render card title", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("Statystyki cenowe")).toBeInTheDocument();
    });
  });

  describe("Price Formatting", () => {
    it("should format prices with Polish locale (spaces as thousand separators)", () => {
      render(<OfferStats stats={mockStats} />);

      // Polish locale uses space as thousand separator
      expect(screen.getByText(/93 000 PLN/)).toBeInTheDocument();
      expect(screen.getByText(/102 000 PLN/)).toBeInTheDocument();
    });

    it("should display currency after price", () => {
      render(<OfferStats stats={mockStats} />);

      // Multiple PLN texts should be present (one for each price stat)
      const currencies = screen.getAllByText(/PLN/);
      expect(currencies.length).toBeGreaterThan(0);
    });

    it("should handle different currencies", () => {
      const statsWithEur = { ...mockStats, currency: "EUR" };
      render(<OfferStats stats={statsWithEur} />);

      expect(screen.getAllByText(/EUR/).length).toBeGreaterThan(0);
    });

    it("should format prices without decimals", () => {
      render(<OfferStats stats={mockStats} />);

      // Should not contain decimal points
      expect(screen.queryByText(/\.\d{2}/)).not.toBeInTheDocument();
    });
  });

  describe("Trend Display", () => {
    it("should display falling trend with correct emoji and color", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("📉")).toBeInTheDocument();
      expect(screen.getByText("Spadkowy")).toBeInTheDocument();
    });

    it("should display rising trend with correct emoji and color", () => {
      const statsWithRisingTrend = { ...mockStats, trend: "wzrostowy" as const };
      render(<OfferStats stats={statsWithRisingTrend} />);

      expect(screen.getByText("📈")).toBeInTheDocument();
      expect(screen.getByText("Wzrostowy")).toBeInTheDocument();
    });

    it("should display stable trend with correct emoji and color", () => {
      const statsWithStableTrend = { ...mockStats, trend: "stabilny" as const };
      render(<OfferStats stats={statsWithStableTrend} />);

      expect(screen.getByText("➡️")).toBeInTheDocument();
      expect(screen.getByText("Stabilny")).toBeInTheDocument();
    });

    it("should capitalize trend text", () => {
      render(<OfferStats stats={mockStats} />);

      // First letter should be uppercase
      expect(screen.getByText("Spadkowy")).toBeInTheDocument();
      expect(screen.queryByText("spadkowy")).not.toBeInTheDocument();
    });

    it("should apply correct color class for falling trend", () => {
      render(<OfferStats stats={mockStats} />);

      const trendValue = screen.getByText("Spadkowy");
      expect(trendValue).toHaveClass("text-green-600");
    });

    it("should apply correct color class for rising trend", () => {
      const statsWithRisingTrend = { ...mockStats, trend: "wzrostowy" as const };
      render(<OfferStats stats={statsWithRisingTrend} />);

      const trendValue = screen.getByText("Wzrostowy");
      expect(trendValue).toHaveClass("text-destructive");
    });

    it("should apply correct color class for stable trend", () => {
      const statsWithStableTrend = { ...mockStats, trend: "stabilny" as const };
      render(<OfferStats stats={statsWithStableTrend} />);

      const trendValue = screen.getByText("Stabilny");
      expect(trendValue).toHaveClass("text-muted-foreground");
    });
  });

  describe("Check Count Display", () => {
    it("should display check count as string", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("should display check count with icon", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("🔍")).toBeInTheDocument();
    });
  });

  describe("Observation Duration", () => {
    it("should display duration in days with correct pluralization for 1 day", () => {
      const statsWithOneDay = { ...mockStats, observationDurationDays: 1 };
      render(<OfferStats stats={statsWithOneDay} />);

      expect(screen.getByText("1 dzień")).toBeInTheDocument();
    });

    it("should display duration in days with correct pluralization for 2-4 days", () => {
      const statsWithTwoDays = { ...mockStats, observationDurationDays: 2 };
      render(<OfferStats stats={statsWithTwoDays} />);

      expect(screen.getByText("2 dni")).toBeInTheDocument();
    });

    it("should display duration in days with correct pluralization for 5+ days", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("9 dni")).toBeInTheDocument();
    });

    it("should display duration in days with correct pluralization for 15+ days", () => {
      const statsWithManyDays = { ...mockStats, observationDurationDays: 15 };
      render(<OfferStats stats={statsWithManyDays} />);

      expect(screen.getByText("15 dni")).toBeInTheDocument();
    });

    it("should display duration in days with correct pluralization for 22-24 days", () => {
      const statsWithTwentyThreeDays = {
        ...mockStats,
        observationDurationDays: 23,
      };
      render(<OfferStats stats={statsWithTwentyThreeDays} />);

      expect(screen.getByText("23 dni")).toBeInTheDocument();
    });

    it("should display calendar icon with duration", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("📅")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should display all stat icons", () => {
      render(<OfferStats stats={mockStats} />);

      expect(screen.getByText("⬇️")).toBeInTheDocument(); // Min price
      expect(screen.getByText("⬆️")).toBeInTheDocument(); // Max price
      expect(screen.getByText("📉")).toBeInTheDocument(); // Trend
      expect(screen.getByText("🔍")).toBeInTheDocument(); // Check count
      expect(screen.getByText("📅")).toBeInTheDocument(); // Duration
    });
  });

  describe("Layout and Structure", () => {
    it("should render as a Card component", () => {
      const { container } = render(<OfferStats stats={mockStats} />);

      const card = container.querySelector('[class*="rounded"]');
      expect(card).toBeInTheDocument();
    });

    it("should have proper spacing between stat items", () => {
      const { container } = render(<OfferStats stats={mockStats} />);

      const statsContainer = container.querySelector(".space-y-4");
      expect(statsContainer).toBeInTheDocument();
    });

    it("should have border separator between price stats and other stats", () => {
      const { container } = render(<OfferStats stats={mockStats} />);

      const separator = container.querySelector(".pt-4.border-t");
      expect(separator).toBeInTheDocument();
    });

    it("should display labels with muted foreground color", () => {
      render(<OfferStats stats={mockStats} />);

      const label = screen.getByText("Cena minimalna");
      expect(label).toHaveClass("text-muted-foreground");
    });

    it("should display values with font-semibold", () => {
      render(<OfferStats stats={mockStats} />);

      const value = screen.getByText(/93 000 PLN/);
      expect(value).toHaveClass("font-semibold");
    });
  });

  describe("StatItem Component", () => {
    it("should render stat items with proper flex layout", () => {
      const { container } = render(<OfferStats stats={mockStats} />);

      const statItems = container.querySelectorAll(".flex.items-center.justify-between");
      expect(statItems.length).toBeGreaterThan(0);
    });

    it("should render icon and label together", () => {
      render(<OfferStats stats={mockStats} />);

      const labelWithIcon = screen.getByText("Cena minimalna").closest(".flex");
      const icon = labelWithIcon?.querySelector(".text-base");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero check count", () => {
      const statsWithZeroChecks = { ...mockStats, checkCount: 0 };
      render(<OfferStats stats={statsWithZeroChecks} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle zero observation days", () => {
      const statsWithZeroDays = { ...mockStats, observationDurationDays: 0 };
      render(<OfferStats stats={statsWithZeroDays} />);

      expect(screen.getByText("0 dni")).toBeInTheDocument();
    });

    it("should handle very large prices", () => {
      const statsWithLargePrices = {
        ...mockStats,
        minPrice: 1000000,
        maxPrice: 9999999,
        avgPrice: 5000000,
      };
      render(<OfferStats stats={statsWithLargePrices} />);

      expect(screen.getByText(/1 000 000/)).toBeInTheDocument();
      expect(screen.getByText(/9 999 999/)).toBeInTheDocument();
    });

    it("should handle same min and max price", () => {
      const statsWithSamePrice = {
        ...mockStats,
        minPrice: 100000,
        maxPrice: 100000,
        avgPrice: 100000,
      };
      render(<OfferStats stats={statsWithSamePrice} />);

      const prices = screen.getAllByText(/100 000 PLN/);
      expect(prices.length).toBe(2); // Min and max price only, avg is not displayed
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading for card title", () => {
      render(<OfferStats stats={mockStats} />);

      const title = screen.getByText("Statystyki cenowe");
      // Shadcn Card uses a div with data-slot="card-title"
      expect(title.closest("[data-slot='card-title']")).toBeTruthy();
    });

    it("should have readable text sizes", () => {
      const { container } = render(<OfferStats stats={mockStats} />);

      const labels = container.querySelectorAll(".text-sm");
      expect(labels.length).toBeGreaterThan(0);
    });
  });
});
