import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OfferCard from "../OfferCard";
import { createMockOfferDto } from "../../../test/factories/dashboard.factory";

// Mock Button component from shadcn/ui
vi.mock("../../ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

describe("OfferCard", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render offer title", () => {
      // Arrange
      const offer = createMockOfferDto({ title: "BMW X5 2020" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("BMW X5 2020")).toBeInTheDocument();
    });

    it("should render offer image when imageUrl is provided", () => {
      // Arrange
      const offer = createMockOfferDto({
        imageUrl: "https://example.com/car.jpg",
        title: "Test Car",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const image = screen.getByAltText("Test Car");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/car.jpg");
    });

    it("should render placeholder when no image is provided", () => {
      // Arrange
      const offer = createMockOfferDto({ imageUrl: null });

      // Act
      const { container } = render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      // Should show SVG placeholder
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render city when provided", () => {
      // Arrange
      const offer = createMockOfferDto({ city: "Warszawa" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("Warszawa")).toBeInTheDocument();
    });

    it("should not render city section when city is null", () => {
      // Arrange
      const offer = createMockOfferDto({ city: null });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      // City text should not exist in document
      const cityElement = screen.queryByText(/warszawa|kraków|poznań/i);
      expect(cityElement).not.toBeInTheDocument();
    });

    it("should render as clickable link to offer details", () => {
      // Arrange
      const offer = createMockOfferDto({ id: "offer-123" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/offer/offer-123");
    });
  });

  describe("Price Display", () => {
    it("should format price correctly in PLN", () => {
      // Arrange
      const offer = createMockOfferDto({
        currentPrice: 50000,
        currency: "PLN",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText(/50\s*000/)).toBeInTheDocument();
      expect(screen.getByText(/zł/i)).toBeInTheDocument();
    });

    it("should format price correctly in EUR", () => {
      // Arrange
      const offer = createMockOfferDto({
        currentPrice: 15000,
        currency: "EUR",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText(/15\s*000/)).toBeInTheDocument();
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });

    it("should display price change badge when price changed", () => {
      // Arrange
      const offer = createMockOfferDto({
        percentChangeFromFirst: -5.5,
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("-5.50%")).toBeInTheDocument();
    });

    it("should not display price change badge when no change", () => {
      // Arrange
      const offer = createMockOfferDto({
        percentChangeFromFirst: 0,
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.queryByText(/0\.00%/)).not.toBeInTheDocument();
    });

    it("should format positive percentage with plus sign", () => {
      // Arrange
      const offer = createMockOfferDto({
        percentChangeFromFirst: 7.25,
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("+7.25%")).toBeInTheDocument();
    });

    it("should format negative percentage without extra minus", () => {
      // Arrange
      const offer = createMockOfferDto({
        percentChangeFromFirst: -12.5,
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("-12.50%")).toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("should display active status badge", () => {
      // Arrange
      const offer = createMockOfferDto({ status: "active" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("should display inactive status badge", () => {
      // Arrange
      const offer = createMockOfferDto({ status: "inactive" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("inactive")).toBeInTheDocument();
    });

    it("should display error status badge", () => {
      // Arrange
      const offer = createMockOfferDto({ status: "error" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    it("should apply correct styling for active status", () => {
      // Arrange
      const offer = createMockOfferDto({ status: "active" });

      // Act
      const { container } = render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const badge = screen.getByText("active");
      expect(badge.className).toContain("bg-green-100");
      expect(badge.className).toContain("text-green-800");
    });

    it("should apply correct styling for error status", () => {
      // Arrange
      const offer = createMockOfferDto({ status: "error" });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const badge = screen.getByText("error");
      expect(badge.className).toContain("bg-red-100");
      expect(badge.className).toContain("text-red-800");
    });
  });

  describe("Price Change Styling", () => {
    it("should apply green styling for price drop", () => {
      // Arrange
      const offer = createMockOfferDto({ percentChangeFromFirst: -10.0 });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const badge = screen.getByText("-10.00%");
      expect(badge.className).toContain("bg-green-100");
      expect(badge.className).toContain("text-green-800");
    });

    it("should apply red styling for price rise", () => {
      // Arrange
      const offer = createMockOfferDto({ percentChangeFromFirst: 15.0 });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const badge = screen.getByText("+15.00%");
      expect(badge.className).toContain("bg-red-100");
      expect(badge.className).toContain("text-red-800");
    });
  });

  describe("Last Checked Date", () => {
    it("should display last checked date", () => {
      // Arrange
      const lastChecked = new Date("2024-01-15T10:30:00Z").toISOString();
      const offer = createMockOfferDto({ lastChecked });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText(/last checked/i)).toBeInTheDocument();
    });

    it("should not display last checked when null", () => {
      // Arrange
      const offer = createMockOfferDto({ lastChecked: null });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.queryByText(/last checked/i)).not.toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    it("should show delete button on hover (via group-hover)", () => {
      // Arrange
      const offer = createMockOfferDto();

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const deleteButton = screen.getByLabelText("Delete offer");
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton.className).toContain("opacity-0");
      expect(deleteButton.className).toContain("group-hover:opacity-100");
    });

    it("should show confirmation modal when delete button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Act
      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Assert
      expect(screen.getByText("Delete Offer")).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to stop tracking/i)
      ).toBeInTheDocument();
    });

    it("should prevent link navigation when clicking delete button", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Act
      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Assert - Modal should appear, not navigate
      expect(screen.getByText("Delete Offer")).toBeInTheDocument();
    });

    it("should call onDelete when confirming deletion", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto({ id: "test-offer-123" });

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Act
      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /^delete$/i });
      await user.click(confirmButton);

      // Assert
      expect(mockOnDelete).toHaveBeenCalledWith("test-offer-123");
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should close modal when cancel is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Act
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Assert
      expect(screen.queryByText("Delete Offer")).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should close modal when clicking backdrop", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Act
      const backdrop = screen.getByText("Delete Offer").closest(".fixed");
      if (backdrop) {
        await user.click(backdrop);
      }

      // Assert
      expect(screen.queryByText("Delete Offer")).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should not close modal when clicking inside modal content", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Act
      const modalContent = screen.getByText(/are you sure/i);
      await user.click(modalContent);

      // Assert
      expect(screen.getByText("Delete Offer")).toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should hide modal after confirming deletion", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Act
      const confirmButton = screen.getByRole("button", { name: /^delete$/i });
      await user.click(confirmButton);

      // Assert
      expect(screen.queryByText("Delete Offer")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label on delete button", () => {
      // Arrange
      const offer = createMockOfferDto();

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const deleteButton = screen.getByLabelText("Delete offer");
      expect(deleteButton).toBeInTheDocument();
    });

    it("should have proper heading hierarchy in modal", async () => {
      // Arrange
      const user = userEvent.setup();
      const offer = createMockOfferDto();

      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Delete offer");
      await user.click(deleteButton);

      // Act & Assert
      const heading = screen.getByText("Delete Offer");
      expect(heading.tagName).toBe("H3");
    });

    it("should have alt text on image", () => {
      // Arrange
      const offer = createMockOfferDto({
        title: "Audi A4",
        imageUrl: "https://example.com/audi.jpg",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const image = screen.getByAltText("Audi A4");
      expect(image).toBeInTheDocument();
    });

    it("should have loading=lazy on image for performance", () => {
      // Arrange
      const offer = createMockOfferDto({
        imageUrl: "https://example.com/car.jpg",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("loading", "lazy");
    });
  });

  describe("Hover Effects", () => {
    it("should have hover transition classes", () => {
      // Arrange
      const offer = createMockOfferDto();

      // Act
      const { container } = render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const link = screen.getByRole("link");
      expect(link.className).toContain("hover:shadow-md");
      expect(link.className).toContain("transition-all");
    });

    it("should have image scale effect on hover", () => {
      // Arrange
      const offer = createMockOfferDto({
        imageUrl: "https://example.com/car.jpg",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const image = screen.getByRole("img");
      expect(image.className).toContain("group-hover:scale-105");
    });
  });

  describe("Title Truncation", () => {
    it("should apply line-clamp-2 for long titles", () => {
      // Arrange
      const offer = createMockOfferDto({
        title: "Very Long Car Title That Should Be Truncated After Two Lines",
      });

      // Act
      const { container } = render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      const title = screen.getByText(offer.title);
      expect(title.className).toContain("line-clamp-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large price numbers", () => {
      // Arrange
      const offer = createMockOfferDto({
        currentPrice: 9999999,
        currency: "PLN",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText(/9\s*999\s*999/)).toBeInTheDocument();
    });

    it("should handle decimal prices", () => {
      // Arrange
      const offer = createMockOfferDto({
        currentPrice: 50000.99,
        currency: "PLN",
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert - Should format without decimals based on Intl.NumberFormat config
      expect(screen.getByText(/50\s*001/)).toBeInTheDocument();
    });

    it("should handle very small percentage changes", () => {
      // Arrange
      const offer = createMockOfferDto({
        percentChangeFromFirst: -0.01,
      });

      // Act
      render(<OfferCard offer={offer} onDelete={mockOnDelete} />);

      // Assert
      expect(screen.getByText("-0.01%")).toBeInTheDocument();
    });
  });
});

