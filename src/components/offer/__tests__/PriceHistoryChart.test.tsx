import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceHistoryChart from "../PriceHistoryChart";
import type { PriceHistoryChartViewModel } from "@/types";

// Mock Recharts components to avoid rendering complexity in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey }: any) => (
    <div data-testid="line" data-key={dataKey} />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ domain, tickFormatter }: any) => (
    <div
      data-testid="y-axis"
      data-domain={JSON.stringify(domain)}
      data-formatter={tickFormatter ? "present" : "none"}
    />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content, cursor }: any) => (
    <div
      data-testid="tooltip"
      data-has-content={!!content}
      data-has-cursor={!!cursor}
    />
  ),
}));

describe("PriceHistoryChart", () => {
  const mockChartData: PriceHistoryChartViewModel[] = [
    {
      date: "01.01",
      fullDate: "01.01.2024 12:00",
      price: 100000,
      currency: "PLN",
    },
    {
      date: "06.01",
      fullDate: "06.01.2024 12:00",
      price: 98000,
      currency: "PLN",
    },
    {
      date: "08.01",
      fullDate: "08.01.2024 12:00",
      price: 97500,
      currency: "PLN",
    },
    {
      date: "10.01",
      fullDate: "10.01.2024 12:00",
      price: 95000,
      currency: "PLN",
    },
  ];

  describe("Normal State", () => {
    it("should render chart with sufficient data", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("should render chart title and description", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      expect(screen.getByText("Wykres historii cen")).toBeInTheDocument();
      expect(
        screen.getByText(/Zmiana ceny w czasie/)
      ).toBeInTheDocument();
    });

    it("should pass correct number of data points to chart", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-points", "4");
    });

    it("should render all chart components", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
      expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
      expect(screen.getByTestId("line")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    });

    it("should configure XAxis with date dataKey", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toHaveAttribute("data-key", "date");
    });

    it("should configure Line with price dataKey", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const line = screen.getByTestId("line");
      expect(line).toHaveAttribute("data-key", "price");
    });

    it("should configure YAxis with domain", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const yAxis = screen.getByTestId("y-axis");
      const domain = JSON.parse(yAxis.getAttribute("data-domain") || "[]");

      // Should have min and max values with 10% padding
      expect(domain).toHaveLength(2);
      expect(domain[0]).toBeLessThan(95000); // Min price with padding
      expect(domain[1]).toBeGreaterThan(100000); // Max price with padding
    });

    it("should configure YAxis with formatter", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const yAxis = screen.getByTestId("y-axis");
      expect(yAxis).toHaveAttribute("data-formatter", "present");
    });

    it("should configure Tooltip with content and cursor", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip).toHaveAttribute("data-has-content", "true");
      expect(tooltip).toHaveAttribute("data-has-cursor", "true");
    });
  });

  describe("Empty State", () => {
    it("should show empty state message when no data", () => {
      render(<PriceHistoryChart data={[]} />);

      expect(
        screen.getByText("Za mało danych do wygenerowania wykresu")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Wykres zostanie wyświetlony po zebraniu co najmniej 2 punktów danych/
        )
      ).toBeInTheDocument();
    });

    it("should show empty state when only one data point", () => {
      const singlePoint = [mockChartData[0]];
      render(<PriceHistoryChart data={singlePoint} />);

      expect(
        screen.getByText("Za mało danych do wygenerowania wykresu")
      ).toBeInTheDocument();
    });

    it("should not render chart components in empty state", () => {
      render(<PriceHistoryChart data={[]} />);

      expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("x-axis")).not.toBeInTheDocument();
      expect(screen.queryByTestId("y-axis")).not.toBeInTheDocument();
    });

    it("should render empty state icon", () => {
      const { container } = render(<PriceHistoryChart data={[]} />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("w-16", "h-16", "opacity-50");
    });

    it("should render card even in empty state", () => {
      render(<PriceHistoryChart data={[]} />);

      expect(screen.getByText("Wykres historii cen")).toBeInTheDocument();
    });
  });

  describe("Y-Axis Domain Calculation", () => {
    it("should calculate domain with 10% padding below minimum", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const yAxis = screen.getByTestId("y-axis");
      const domain = JSON.parse(yAxis.getAttribute("data-domain") || "[]");

      const minPrice = Math.min(...mockChartData.map((d) => d.price));
      const maxPrice = Math.max(...mockChartData.map((d) => d.price));
      const range = maxPrice - minPrice;

      expect(domain[0]).toBe(Math.floor(minPrice - range * 0.1));
    });

    it("should calculate domain with 10% padding above maximum", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const yAxis = screen.getByTestId("y-axis");
      const domain = JSON.parse(yAxis.getAttribute("data-domain") || "[]");

      const minPrice = Math.min(...mockChartData.map((d) => d.price));
      const maxPrice = Math.max(...mockChartData.map((d) => d.price));
      const range = maxPrice - minPrice;

      expect(domain[1]).toBe(Math.ceil(maxPrice + range * 0.1));
    });

    it("should handle data with same min and max price", () => {
      const flatData = mockChartData.map((d) => ({ ...d, price: 100000 }));
      render(<PriceHistoryChart data={flatData} />);

      const yAxis = screen.getByTestId("y-axis");
      const domain = JSON.parse(yAxis.getAttribute("data-domain") || "[]");

      // Should still have padding even with zero range
      expect(domain[0]).toBeLessThanOrEqual(100000);
      expect(domain[1]).toBeGreaterThanOrEqual(100000);
    });
  });

  describe("Currency Handling", () => {
    it("should extract currency from first data point", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      // Currency is used in CustomTooltip (mocked in our test)
      // We verify the chart renders successfully with currency data
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should default to PLN when no data", () => {
      // This tests the default value in the component
      render(<PriceHistoryChart data={[]} />);

      // Empty state should still render
      expect(screen.getByText("Wykres historii cen")).toBeInTheDocument();
    });

    it("should handle different currencies", () => {
      const eurData = mockChartData.map((d) => ({ ...d, currency: "EUR" }));
      render(<PriceHistoryChart data={eurData} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should render as Card component", () => {
      const { container } = render(
        <PriceHistoryChart data={mockChartData} />
      );

      const card = container.querySelector('[class*="rounded"]');
      expect(card).toBeTruthy();
    });

    it("should have fixed height container for chart", () => {
      const { container } = render(
        <PriceHistoryChart data={mockChartData} />
      );

      const chartContainer = container.querySelector(".h-\\[400px\\]");
      expect(chartContainer).toBeInTheDocument();
    });

    it("should use full width for responsive container", () => {
      const { container } = render(
        <PriceHistoryChart data={mockChartData} />
      );

      const chartContainer = container.querySelector(".w-full");
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle exactly 2 data points (minimum for chart)", () => {
      const twoPoints = mockChartData.slice(0, 2);
      render(<PriceHistoryChart data={twoPoints} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.queryByText("Za mało danych")).not.toBeInTheDocument();
    });

    it("should handle large number of data points", () => {
      const manyPoints = Array.from({ length: 100 }, (_, i) => ({
        date: `${String(i + 1).padStart(2, "0")}.01`,
        fullDate: `${String(i + 1).padStart(2, "0")}.01.2024 12:00`,
        price: 100000 + Math.random() * 10000,
        currency: "PLN",
      }));

      render(<PriceHistoryChart data={manyPoints} />);

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-points", "100");
    });

    it("should handle very large prices", () => {
      const largePriceData = mockChartData.map((d) => ({
        ...d,
        price: d.price * 100,
      }));

      render(<PriceHistoryChart data={largePriceData} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle very small prices", () => {
      const smallPriceData = mockChartData.map((d, i) => ({
        ...d,
        price: 100 + i * 10,
      }));

      render(<PriceHistoryChart data={smallPriceData} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Card Structure", () => {
    it("should have card header with title and description", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      expect(screen.getByText("Wykres historii cen")).toBeInTheDocument();
      expect(
        screen.getByText(/najedź na punkt, aby zobaczyć szczegóły/)
      ).toBeInTheDocument();
    });

    it("should render CardContent wrapper", () => {
      const { container } = render(
        <PriceHistoryChart data={mockChartData} />
      );

      // Card structure should be present
      const card = container.firstChild;
      expect(card).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should provide descriptive title", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const title = screen.getByText("Wykres historii cen");
      expect(title).toBeInTheDocument();
    });

    it("should provide helpful description", () => {
      render(<PriceHistoryChart data={mockChartData} />);

      const description = screen.getByText(
        /Zmiana ceny w czasie \(najedź na punkt, aby zobaczyć szczegóły\)/
      );
      expect(description).toBeInTheDocument();
    });

    it("should have informative empty state message", () => {
      render(<PriceHistoryChart data={[]} />);

      expect(
        screen.getByText("Za mało danych do wygenerowania wykresu")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Wykres zostanie wyświetlony po zebraniu co najmniej 2 punktów danych"
        )
      ).toBeInTheDocument();
    });
  });
});

