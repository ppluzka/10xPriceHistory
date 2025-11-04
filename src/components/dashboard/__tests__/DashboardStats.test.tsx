import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardStats from "../DashboardStats";
import { createMockDashboardSummary } from "../../../test/factories/dashboard.factory";

describe("DashboardStats", () => {
  describe("Basic Rendering", () => {
    it("should render dashboard heading", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(
        screen.getByRole("heading", { name: /panel główny/i })
      ).toBeInTheDocument();
    });

    it("should render description text", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(
        screen.getByText(/śledź obserwowane oferty i zmiany cen/i)
      ).toBeInTheDocument();
    });

    it("should render all four stat cards", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      const { container } = render(
        <DashboardStats summary={summary} offerLimit={100} />
      );

      // Assert
      const statCards = container.querySelectorAll(".rounded-lg.border.bg-card");
      expect(statCards.length).toBe(4);
    });
  });

  describe("Active Offers Card", () => {
    it("should display active count", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 7 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Aktywne oferty")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("should calculate and display remaining slots", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 25 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("75 pozostało miejsc")).toBeInTheDocument();
    });

    it("should show 0 slots remaining when at limit", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 100 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("0 pozostało miejsc")).toBeInTheDocument();
    });

    it("should handle zero active offers", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("100 pozostało miejsc")).toBeInTheDocument();
    });
  });

  describe("Average Change Card", () => {
    it("should display average change with percentage", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: -5.75 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Średnia zmiana")).toBeInTheDocument();
      expect(screen.getByText("-5.75%")).toBeInTheDocument();
    });

    it("should display positive change with plus sign", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: 3.5 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("+3.50%")).toBeInTheDocument();
    });

    it("should display zero change without sign", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: 0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("0.00%")).toBeInTheDocument();
    });

    it("should display description", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Od pierwszej ceny")).toBeInTheDocument();
    });

    it("should apply positive variant styling for positive change", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: 5.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("+5.00%");
      expect(valueElement.className).toContain("text-green-600");
    });

    it("should apply negative variant styling for negative change", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: -8.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("-8.00%");
      expect(valueElement.className).toContain("text-red-600");
    });

    it("should apply default variant styling for zero change", () => {
      // Arrange
      const summary = createMockDashboardSummary({ avgChange: 0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("0.00%");
      expect(valueElement.className).toContain("text-foreground");
    });
  });

  describe("Largest Drop Card", () => {
    it("should display largest drop with percentage", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestDrop: -15.2 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Największy spadek")).toBeInTheDocument();
      expect(screen.getByText("-15.20%")).toBeInTheDocument();
    });

    it("should display best discount description", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Najlepsza znaleziona zniżka")).toBeInTheDocument();
    });

    it("should apply negative variant when drop is negative", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestDrop: -10.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("-10.00%");
      expect(valueElement.className).toContain("text-red-600");
    });

    it("should apply default variant when drop is zero or positive", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestDrop: 0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("0.00%");
      expect(valueElement.className).toContain("text-foreground");
    });

    it("should handle positive value (edge case)", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestDrop: 5.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("+5.00%")).toBeInTheDocument();
    });
  });

  describe("Largest Rise Card", () => {
    it("should display largest rise with percentage", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestRise: 12.5 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Największy wzrost")).toBeInTheDocument();
      expect(screen.getByText("+12.50%")).toBeInTheDocument();
    });

    it("should display highest increase description", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Najwyższy wzrost")).toBeInTheDocument();
    });

    it("should apply positive variant when rise is positive", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestRise: 8.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("+8.00%");
      expect(valueElement.className).toContain("text-green-600");
    });

    it("should apply default variant when rise is zero or negative", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestRise: 0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText("0.00%");
      expect(valueElement.className).toContain("text-foreground");
    });

    it("should handle negative value (edge case)", () => {
      // Arrange
      const summary = createMockDashboardSummary({ largestRise: -3.0 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-3.00%")).toBeInTheDocument();
    });
  });

  describe("Percentage Formatting", () => {
    it("should format to 2 decimal places", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        avgChange: -5.123456,
        largestDrop: -10.987654,
        largestRise: 7.654321,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-5.12%")).toBeInTheDocument();
      expect(screen.getByText("-10.99%")).toBeInTheDocument();
      expect(screen.getByText("+7.65%")).toBeInTheDocument();
    });

    it("should handle whole numbers", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        avgChange: -5.0,
        largestDrop: -10.0,
        largestRise: 8.0,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-5.00%")).toBeInTheDocument();
      expect(screen.getByText("-10.00%")).toBeInTheDocument();
      expect(screen.getByText("+8.00%")).toBeInTheDocument();
    });

    it("should handle very small percentages", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        avgChange: -0.01,
        largestDrop: -0.05,
        largestRise: 0.03,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-0.01%")).toBeInTheDocument();
      expect(screen.getByText("-0.05%")).toBeInTheDocument();
      expect(screen.getByText("+0.03%")).toBeInTheDocument();
    });

    it("should handle very large percentages", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        avgChange: -99.99,
        largestDrop: -99.99,
        largestRise: 999.99,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert - Use getAllByText for duplicate values
      const negativePercentages = screen.getAllByText("-99.99%");
      expect(negativePercentages.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("+999.99%")).toBeInTheDocument();
    });
  });

  describe("Responsive Grid", () => {
    it("should apply responsive grid classes", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      const { container } = render(
        <DashboardStats summary={summary} offerLimit={100} />
      );

      // Assert
      const grid = container.querySelector(".grid");
      expect(grid?.className).toContain("gap-4");
      expect(grid?.className).toContain("sm:grid-cols-2");
      expect(grid?.className).toContain("lg:grid-cols-4");
    });
  });

  describe("Different Offer Limits", () => {
    it("should handle custom offer limit of 50", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 30 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={50} />);

      // Assert
      expect(screen.getByText("20 pozostało miejsc")).toBeInTheDocument();
    });

    it("should handle offer limit of 200", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 150 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={200} />);

      // Assert
      expect(screen.getByText("50 pozostało miejsc")).toBeInTheDocument();
    });

    it("should handle when active count exceeds limit (edge case)", () => {
      // Arrange
      const summary = createMockDashboardSummary({ activeCount: 120 });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-20 pozostało miejsc")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const heading = screen.getByRole("heading", { name: /panel główny/i });
      expect(heading.tagName).toBe("H1");
    });

    it("should have descriptive labels for each stat", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("Aktywne oferty")).toBeInTheDocument();
      expect(screen.getByText("Średnia zmiana")).toBeInTheDocument();
      expect(screen.getByText("Największy spadek")).toBeInTheDocument();
      expect(screen.getByText("Największy wzrost")).toBeInTheDocument();
    });

    it("should have descriptions for additional context", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText(/pozostało miejsc/)).toBeInTheDocument();
      expect(screen.getByText("Od pierwszej ceny")).toBeInTheDocument();
      expect(screen.getByText("Najlepsza znaleziona zniżka")).toBeInTheDocument();
      expect(screen.getByText("Najwyższy wzrost")).toBeInTheDocument();
    });
  });

  describe("Visual Styling", () => {
    it("should apply card styling to stat cards", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      const { container } = render(
        <DashboardStats summary={summary} offerLimit={100} />
      );

      // Assert
      const cards = container.querySelectorAll(".rounded-lg.border.bg-card");
      cards.forEach((card) => {
        expect(card.className).toContain("p-6");
        expect(card.className).toContain("shadow-xs");
      });
    });

    it("should apply correct text sizing for values", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const valueElement = screen.getByText(summary.activeCount.toString());
      expect(valueElement.className).toContain("text-3xl");
      expect(valueElement.className).toContain("font-bold");
    });

    it("should apply muted styling to labels", () => {
      // Arrange
      const summary = createMockDashboardSummary();

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      const label = screen.getByText("Aktywne oferty");
      expect(label.className).toContain("text-muted-foreground");
    });
  });

  describe("Edge Cases", () => {
    it("should handle all statistics being zero", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        activeCount: 0,
        avgChange: 0,
        largestDrop: 0,
        largestRise: 0,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getAllByText("0.00%").length).toBe(3);
    });

    it("should handle all negative statistics", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        activeCount: 5,
        avgChange: -10.0,
        largestDrop: -25.0,
        largestRise: -2.0, // Edge case: even "rise" is negative
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("-10.00%")).toBeInTheDocument();
      expect(screen.getByText("-25.00%")).toBeInTheDocument();
      expect(screen.getByText("-2.00%")).toBeInTheDocument();
    });

    it("should handle all positive statistics", () => {
      // Arrange
      const summary = createMockDashboardSummary({
        activeCount: 50,
        avgChange: 15.0,
        largestDrop: 5.0, // Edge case: even "drop" is positive
        largestRise: 30.0,
      });

      // Act
      render(<DashboardStats summary={summary} offerLimit={100} />);

      // Assert
      expect(screen.getByText("+15.00%")).toBeInTheDocument();
      expect(screen.getByText("+5.00%")).toBeInTheDocument();
      expect(screen.getByText("+30.00%")).toBeInTheDocument();
    });
  });
});

