import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OfferDetailsPage from "../OfferDetailsPage";
import {
  mockOfferDetail,
  mockRemovedOffer,
  mockErrorOffer,
  mockPaginatedHistory,
  mockPaginatedEmptyHistory,
} from "./mockData";

// Mock child components to isolate OfferDetailsPage testing
vi.mock("../OfferHeader", () => ({
  default: ({ data }: any) => <div data-testid="offer-header">Header: {data.title}</div>,
}));

vi.mock("../OfferStats", () => ({
  default: ({ stats }: any) => (
    <div data-testid="offer-stats">
      Stats: {stats.minPrice}-{stats.maxPrice}
    </div>
  ),
}));

vi.mock("../PriceHistoryChart", () => ({
  default: ({ data }: any) => <div data-testid="price-chart">Chart: {data.length} points</div>,
}));

vi.mock("../PriceHistoryTable", () => ({
  default: ({ history }: any) => <div data-testid="price-table">Table: {history.length} entries</div>,
}));

// Mock the useOfferData hook
vi.mock("../useOfferData", () => ({
  useOfferData: ({ initialOffer, initialHistory }: any) => ({
    offer: initialOffer,
    history: initialHistory.data,
    headerData: {
      title: initialOffer.title,
      imageUrl: initialOffer.imageUrl,
      url: initialOffer.url,
      city: initialOffer.city,
      percentChangeFromFirst: initialOffer.percentChangeFromFirst,
      percentChangeFromPrevious: initialOffer.percentChangeFromPrevious,
    },
    statsData: {
      minPrice: initialOffer.stats.min,
      maxPrice: initialOffer.stats.max,
      avgPrice: Math.round(initialOffer.stats.avg),
      checkCount: initialHistory.data.length,
      trend: "spadkowy",
      observationDurationDays: 9,
      currency: "PLN",
    },
    chartData: initialHistory.data.map((entry: any) => ({
      date: "10.01",
      fullDate: "10.01.2024 12:00",
      price: entry.price,
      currency: entry.currency,
    })),
    isLoading: false,
    isError: false,
  }),
}));

describe("OfferDetailsPage", () => {
  describe("Normal State", () => {
    it("should render all main sections when data is available", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      // Check all main components are rendered
      expect(screen.getByTestId("offer-header")).toBeInTheDocument();
      expect(screen.getByTestId("offer-stats")).toBeInTheDocument();
      expect(screen.getByTestId("price-chart")).toBeInTheDocument();
      expect(screen.getByTestId("price-table")).toBeInTheDocument();
    });

    it("should render section headings", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      expect(screen.getByText("Historia cen")).toBeInTheDocument();
      expect(screen.getByText("Historia sprawdzeń")).toBeInTheDocument();
    });

    it("should not show status banner for active offers", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      expect(screen.queryByText(/Ta oferta została usunięta z Otomoto/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Wystąpił błąd podczas ostatniego sprawdzania/)).not.toBeInTheDocument();
    });

    it("should use responsive grid layout", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass("grid-cols-1");
      expect(gridContainer).toHaveClass("lg:grid-cols-[1fr_320px]");
    });
  });

  describe("Status Banners", () => {
    it("should display removed status banner for removed offers", () => {
      render(<OfferDetailsPage initialOffer={mockRemovedOffer} initialHistory={mockPaginatedHistory} />);

      expect(screen.getByText("⚠️ Ta oferta została usunięta z Otomoto")).toBeInTheDocument();
      expect(
        screen.getByText(/Historia cen jest nadal dostępna, ale oferta nie będzie już aktualizowana/)
      ).toBeInTheDocument();
    });

    it("should display error status banner for offers with errors", () => {
      render(<OfferDetailsPage initialOffer={mockErrorOffer} initialHistory={mockPaginatedHistory} />);

      expect(screen.getByText("⚠️ Wystąpił błąd podczas ostatniego sprawdzania tej oferty")).toBeInTheDocument();
      expect(
        screen.getByText(/Historia cen jest nadal dostępna, ale oferta nie będzie już aktualizowana/)
      ).toBeInTheDocument();
    });

    it("should style status banner with destructive colors", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockRemovedOffer} initialHistory={mockPaginatedHistory} />
      );

      const banner = container.querySelector(".bg-destructive\\/10");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass("border-destructive/20");
    });
  });

  describe("Empty State Handling", () => {
    it("should render components even with empty history", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedEmptyHistory} />);

      // All components should still render
      expect(screen.getByTestId("offer-header")).toBeInTheDocument();
      expect(screen.getByTestId("offer-stats")).toBeInTheDocument();
      expect(screen.getByTestId("price-chart")).toBeInTheDocument();
      expect(screen.getByTestId("price-table")).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("should render main content in left column", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />
      );

      const mainColumn = container.querySelector(".space-y-8");
      expect(mainColumn).toBeInTheDocument();

      // Main column should contain header, chart section, and table section
      const sections = mainColumn?.querySelectorAll("section");
      expect(sections).toHaveLength(2); // Chart and Table sections
    });

    it("should render stats in sticky sidebar", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />
      );

      const sidebar = container.querySelector("aside");
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass("lg:sticky");
      expect(sidebar).toHaveClass("lg:top-4");
    });
  });

  describe("Container and Spacing", () => {
    it("should use container with proper padding", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />
      );

      const mainContainer = container.querySelector(".container");
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass("mx-auto", "px-4", "py-8");
    });

    it("should add margin to status banner when present", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockRemovedOffer} initialHistory={mockPaginatedHistory} />
      );

      const banner = container.querySelector(".mb-6");
      expect(banner).toBeInTheDocument();
    });
  });

  describe("Component Data Flow", () => {
    it("should pass correct data to OfferHeader", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      const header = screen.getByTestId("offer-header");
      expect(header).toHaveTextContent(`Header: ${mockOfferDetail.title}`);
    });

    it("should pass correct data to OfferStats", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      const stats = screen.getByTestId("offer-stats");
      expect(stats).toHaveTextContent(`Stats: ${mockOfferDetail.stats.min}-${mockOfferDetail.stats.max}`);
    });

    it("should pass history length to chart and table", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      expect(screen.getByTestId("price-chart")).toHaveTextContent(`Chart: ${mockPaginatedHistory.data.length} points`);
      expect(screen.getByTestId("price-table")).toHaveTextContent(`Table: ${mockPaginatedHistory.data.length} entries`);
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML structure", () => {
      const { container } = render(
        <OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />
      );

      expect(container.querySelector("section")).toBeInTheDocument();
      expect(container.querySelector("aside")).toBeInTheDocument();
    });

    it("should use proper heading hierarchy", () => {
      render(<OfferDetailsPage initialOffer={mockOfferDetail} initialHistory={mockPaginatedHistory} />);

      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(2);
      expect(headings[0]).toHaveTextContent("Historia cen");
      expect(headings[1]).toHaveTextContent("Historia sprawdzeń");
    });
  });
});
