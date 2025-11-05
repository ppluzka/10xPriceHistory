import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OfferGrid from "../OfferGrid";
import { createMockOfferDtos } from "../../../test/factories/dashboard.factory";

// Mock child components
vi.mock("../OfferCard", () => ({
  default: ({ offer, onDelete }: any) => (
    <div data-testid={`offer-card-${offer.id}`}>
      <h3>{offer.title}</h3>
      <button onClick={() => onDelete(offer.id)}>Delete {offer.title}</button>
    </div>
  ),
}));

vi.mock("../OfferGridSkeleton", () => ({
  default: () => <div data-testid="offer-grid-skeleton">Loading skeleton...</div>,
}));

vi.mock("../../shared/EmptyState", () => ({
  default: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

describe("OfferGrid", () => {
  const mockOnDeleteOffer = vi.fn();

  describe("Loading State", () => {
    it("should show skeleton when loading", () => {
      // Arrange & Act
      render(<OfferGrid offers={[]} isLoading={true} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.getByTestId("offer-grid-skeleton")).toBeInTheDocument();
      expect(screen.getByText("Loading skeleton...")).toBeInTheDocument();
    });

    it("should not show empty state or offers when loading", () => {
      // Arrange
      const offers = createMockOfferDtos(3);

      // Act
      render(<OfferGrid offers={offers} isLoading={true} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^offer-card-/)).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no offers and not loading", () => {
      // Arrange & Act
      render(<OfferGrid offers={[]} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText("Brak ofert")).toBeInTheDocument();
      expect(screen.getByText(/dodaj pierwszą ofertę z otomoto.pl/i)).toBeInTheDocument();
    });

    it("should not show skeleton or offers in empty state", () => {
      // Arrange & Act
      render(<OfferGrid offers={[]} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.queryByTestId("offer-grid-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^offer-card-/)).not.toBeInTheDocument();
    });
  });

  describe("Offers Display", () => {
    it("should render all offers when data is available", () => {
      // Arrange
      const offers = createMockOfferDtos(3);

      // Act
      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      offers.forEach((offer) => {
        expect(screen.getByTestId(`offer-card-${offer.id}`)).toBeInTheDocument();
        expect(screen.getByText(offer.title)).toBeInTheDocument();
      });
    });

    it("should display correct heading", () => {
      // Arrange
      const offers = createMockOfferDtos(2);

      // Act
      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.getByText("Twoje obserwowane oferty")).toBeInTheDocument();
    });

    it("should render grid with proper structure", () => {
      // Arrange
      const offers = createMockOfferDtos(5);

      // Act
      const { container } = render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid?.children.length).toBe(5);
    });

    it("should handle single offer", () => {
      // Arrange
      const offers = createMockOfferDtos(1);

      // Act
      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.getByTestId(`offer-card-${offers[0].id}`)).toBeInTheDocument();
      expect(screen.getByText(offers[0].title)).toBeInTheDocument();
    });

    it("should handle large number of offers", () => {
      // Arrange
      const offers = createMockOfferDtos(100);

      // Act
      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      const offerCards = screen.getAllByTestId(/^offer-card-/);
      expect(offerCards.length).toBe(100);
    });
  });

  describe("Delete Functionality", () => {
    it("should call onDeleteOffer when delete button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const offers = createMockOfferDtos(3);
      const offerToDelete = offers[0];

      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Act
      const deleteButton = screen.getByRole("button", {
        name: `Delete ${offerToDelete.title}`,
      });
      await user.click(deleteButton);

      // Assert
      expect(mockOnDeleteOffer).toHaveBeenCalledWith(offerToDelete.id);
      expect(mockOnDeleteOffer).toHaveBeenCalledTimes(1);
    });

    it("should call onDeleteOffer with correct offer ID", async () => {
      // Arrange
      const user = userEvent.setup();
      const offers = createMockOfferDtos(3);
      const secondOffer = offers[1];

      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Act
      const deleteButton = screen.getByRole("button", {
        name: `Delete ${secondOffer.title}`,
      });
      await user.click(deleteButton);

      // Assert
      expect(mockOnDeleteOffer).toHaveBeenCalledWith(secondOffer.id);
    });

    it("should handle multiple delete clicks", async () => {
      // Arrange
      const user = userEvent.setup();
      const offers = createMockOfferDtos(2);

      // Reset mock to ensure clean state
      mockOnDeleteOffer.mockClear();

      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);
      await user.click(deleteButtons[1]);

      // Assert
      expect(mockOnDeleteOffer).toHaveBeenCalledTimes(2);
      expect(mockOnDeleteOffer).toHaveBeenCalledWith(offers[0].id);
      expect(mockOnDeleteOffer).toHaveBeenCalledWith(offers[1].id);
    });
  });

  describe("Responsive Grid", () => {
    it("should apply responsive grid classes", () => {
      // Arrange
      const offers = createMockOfferDtos(4);

      // Act
      const { container } = render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      const grid = container.querySelector(".grid");
      expect(grid?.className).toContain("gap-4");
      expect(grid?.className).toContain("sm:grid-cols-2");
      expect(grid?.className).toContain("lg:grid-cols-3");
      expect(grid?.className).toContain("xl:grid-cols-4");
    });
  });

  describe("Accessibility", () => {
    it("should render heading with proper hierarchy", () => {
      // Arrange
      const offers = createMockOfferDtos(2);

      // Act
      render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      const heading = screen.getByRole("heading", { name: /twoje obserwowane oferty/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H2");
    });

    it("should maintain semantic structure", () => {
      // Arrange
      const offers = createMockOfferDtos(3);

      // Act
      const { container } = render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      const spaceDiv = container.querySelector(".space-y-4");
      expect(spaceDiv).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined offers gracefully", () => {
      // Arrange & Act
      // This test verifies behavior - component will crash with undefined
      // In real usage, this should never happen due to TypeScript and proper data flow
      expect(() => {
        render(<OfferGrid offers={undefined as any} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);
      }).toThrow();
    });

    it("should handle transition from loading to loaded", () => {
      // Arrange
      const offers = createMockOfferDtos(2);
      const { rerender } = render(<OfferGrid offers={[]} isLoading={true} onDeleteOffer={mockOnDeleteOffer} />);

      expect(screen.getByTestId("offer-grid-skeleton")).toBeInTheDocument();

      // Act
      rerender(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.queryByTestId("offer-grid-skeleton")).not.toBeInTheDocument();
      expect(screen.getByTestId(`offer-card-${offers[0].id}`)).toBeInTheDocument();
    });

    it("should handle transition from loaded to empty", () => {
      // Arrange
      const offers = createMockOfferDtos(1);
      const { rerender } = render(<OfferGrid offers={offers} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      expect(screen.getByTestId(`offer-card-${offers[0].id}`)).toBeInTheDocument();

      // Act
      rerender(<OfferGrid offers={[]} isLoading={false} onDeleteOffer={mockOnDeleteOffer} />);

      // Assert
      expect(screen.queryByTestId(/^offer-card-/)).not.toBeInTheDocument();
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });
});
