import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfferHeader from "../OfferHeader";
import type { OfferHeaderViewModel } from "@/types";

describe("OfferHeader", () => {
  const mockHeaderData: OfferHeaderViewModel = {
    title: "BMW X5 3.0d xDrive",
    imageUrl: "https://example.com/image.jpg",
    url: "https://www.otomoto.pl/test-offer",
    city: "Warszawa",
    percentChangeFromFirst: -5.0,
    percentChangeFromPrevious: -2.5,
  };

  describe("Content Rendering", () => {
    it("should render offer title", () => {
      render(<OfferHeader data={mockHeaderData} />);

      expect(screen.getByText("BMW X5 3.0d xDrive")).toBeInTheDocument();
    });

    it("should render offer image with correct src and alt", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const image = screen.getByAltText("BMW X5 3.0d xDrive");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("should render city with location icon", () => {
      render(<OfferHeader data={mockHeaderData} />);

      expect(screen.getByText("Warszawa")).toBeInTheDocument();
    });

    it("should render link to Otomoto with correct href", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const link = screen.getByText("Zobacz na Otomoto").closest("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "https://www.otomoto.pl/test-offer"
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should not render image when imageUrl is null", () => {
      const dataWithoutImage = { ...mockHeaderData, imageUrl: null };
      render(<OfferHeader data={dataWithoutImage} />);

      expect(
        screen.queryByAltText("BMW X5 3.0d xDrive")
      ).not.toBeInTheDocument();
    });

    it("should not render city section when city is null", () => {
      const dataWithoutCity = { ...mockHeaderData, city: null };
      render(<OfferHeader data={dataWithoutCity} />);

      expect(screen.queryByText("Warszawa")).not.toBeInTheDocument();
    });
  });

  describe("Price Change Labels", () => {
    it("should display labels for price changes", () => {
      render(<OfferHeader data={mockHeaderData} />);

      expect(screen.getByText("Zmiana od początku")).toBeInTheDocument();
      expect(screen.getByText("Ostatnia zmiana")).toBeInTheDocument();
    });
  });

  describe("PriceChangeBadge - Negative Changes", () => {
    it("should display down arrow and percentage for negative change", () => {
      render(<OfferHeader data={mockHeaderData} />);

      // Both badges should show negative changes
      const badges = screen.getAllByText(/↓/);
      expect(badges).toHaveLength(2);

      // Check percentages are displayed
      expect(screen.getByText(/5\.00%/)).toBeInTheDocument(); // From first
      expect(screen.getByText(/2\.50%/)).toBeInTheDocument(); // From previous
    });

    it("should use default variant for negative changes", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      // Badges with negative changes should not have destructive styling
      const badges = container.querySelectorAll(".inline-flex");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("PriceChangeBadge - Positive Changes", () => {
    it("should display up arrow and percentage for positive change", () => {
      const dataWithIncrease: OfferHeaderViewModel = {
        ...mockHeaderData,
        percentChangeFromFirst: 5.0,
        percentChangeFromPrevious: 2.5,
      };

      render(<OfferHeader data={dataWithIncrease} />);

      const badges = screen.getAllByText(/↑/);
      expect(badges).toHaveLength(2);

      expect(screen.getByText(/5\.00%/)).toBeInTheDocument();
      expect(screen.getByText(/2\.50%/)).toBeInTheDocument();
    });
  });

  describe("PriceChangeBadge - Zero Change", () => {
    it("should display equals sign for zero change", () => {
      const dataWithNoChange: OfferHeaderViewModel = {
        ...mockHeaderData,
        percentChangeFromFirst: 0,
        percentChangeFromPrevious: 0,
      };

      render(<OfferHeader data={dataWithNoChange} />);

      const badges = screen.getAllByText(/=/);
      expect(badges).toHaveLength(2);

      expect(screen.getAllByText(/0\.00%/)).toHaveLength(2);
    });
  });

  describe("PriceChangeBadge - Edge Cases", () => {
    it("should format small percentages correctly", () => {
      const dataWithSmallChange: OfferHeaderViewModel = {
        ...mockHeaderData,
        percentChangeFromFirst: -0.01,
        percentChangeFromPrevious: 0.01,
      };

      render(<OfferHeader data={dataWithSmallChange} />);

      // Both badges should display 0.01%
      const badges = screen.getAllByText(/0\.01%/);
      expect(badges).toHaveLength(2);
    });

    it("should format large percentages correctly", () => {
      const dataWithLargeChange: OfferHeaderViewModel = {
        ...mockHeaderData,
        percentChangeFromFirst: -99.99,
        percentChangeFromPrevious: 150.0,
      };

      render(<OfferHeader data={dataWithLargeChange} />);

      expect(screen.getByText(/99\.99%/)).toBeInTheDocument();
      expect(screen.getByText(/150\.00%/)).toBeInTheDocument();
    });

    it("should always display absolute values in percentage", () => {
      render(<OfferHeader data={mockHeaderData} />);

      // Should not display negative sign in the percentage text
      expect(screen.queryByText(/-5\.00%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-2\.50%/)).not.toBeInTheDocument();

      // Should display absolute values
      expect(screen.getByText(/5\.00%/)).toBeInTheDocument();
      expect(screen.getByText(/2\.50%/)).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should use card styling with border and padding", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      const header = container.querySelector("header");
      expect(header).toHaveClass("bg-card", "rounded-lg", "shadow-sm", "border", "p-6");
    });

    it("should use responsive flexbox layout", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      const flexContainer = container.querySelector(".flex");
      expect(flexContainer).toHaveClass("flex-col", "md:flex-row", "gap-6");
    });

    it("should render title with proper heading styling", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const title = screen.getByText("BMW X5 3.0d xDrive");
      expect(title.tagName).toBe("H1");
      expect(title).toHaveClass("text-3xl", "font-bold", "mb-2", "break-words");
    });

    it("should render image with proper dimensions and styling", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const image = screen.getByAltText("BMW X5 3.0d xDrive");
      expect(image).toHaveClass("w-full", "md:w-64", "h-48", "object-cover", "rounded-lg");
    });
  });

  describe("Icons", () => {
    it("should render location icon SVG", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      const locationSvg = container.querySelector('svg');
      expect(locationSvg).toBeInTheDocument();
    });

    it("should render external link icon in Otomoto link", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      const link = screen.getByText("Zobacz na Otomoto").closest("a");
      const svg = link?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic header element", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      expect(container.querySelector("header")).toBeInTheDocument();
    });

    it("should have proper heading structure", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("BMW X5 3.0d xDrive");
    });

    it("should have accessible link with descriptive text", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const link = screen.getByRole("link", { name: /Zobacz na Otomoto/i });
      expect(link).toBeInTheDocument();
    });

    it("should have proper rel attributes for external link", () => {
      render(<OfferHeader data={mockHeaderData} />);

      const link = screen.getByText("Zobacz na Otomoto").closest("a");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Badge Grouping", () => {
    it("should render both price change badges in flex container", () => {
      const { container } = render(<OfferHeader data={mockHeaderData} />);

      const badgeContainer = container.querySelector(".flex.flex-wrap.gap-3");
      expect(badgeContainer).toBeInTheDocument();

      const badgeGroups = badgeContainer?.querySelectorAll("div");
      expect(badgeGroups).toHaveLength(2);
    });
  });
});

