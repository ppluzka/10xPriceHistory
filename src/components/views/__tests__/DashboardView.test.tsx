import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DashboardView from "../DashboardView";
import { createMockDashboardDto, dashboardScenarios } from "../../../test/factories/dashboard.factory";

// Mock child components to focus on DashboardView logic
vi.mock("../../dashboard/DashboardStats", () => ({
  default: ({ summary, offerLimit }: any) => (
    <div data-testid="dashboard-stats">
      Stats: {summary.activeCount} active, limit: {offerLimit}
    </div>
  ),
}));

vi.mock("../../dashboard/OfferForm", () => ({
  default: ({ onOfferAdded }: any) => (
    <button data-testid="offer-form" onClick={onOfferAdded}>
      Add Offer
    </button>
  ),
}));

vi.mock("../../dashboard/OfferGrid", () => ({
  default: ({ offers, isLoading, onDeleteOffer }: any) => (
    <div data-testid="offer-grid">
      {isLoading && <div>Loading...</div>}
      {offers.map((offer: any) => (
        <div key={offer.id} data-testid={`offer-${offer.id}`}>
          {offer.title}
          <button onClick={() => onDeleteOffer(offer.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

describe("DashboardView", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Rendering", () => {
    it("should render with initial data from SSR", () => {
      // Arrange
      const initialData = createMockDashboardDto();

      // Act
      render(<DashboardView initialData={initialData} />);

      // Assert
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
      expect(screen.getByTestId("offer-form")).toBeInTheDocument();
      expect(screen.getByTestId("offer-grid")).toBeInTheDocument();
    });

    it("should display all offers from initial data", () => {
      // Arrange
      const initialData = createMockDashboardDto();

      // Act
      render(<DashboardView initialData={initialData} />);

      // Assert
      initialData.offers.forEach((offer) => {
        expect(screen.getByTestId(`offer-${offer.id}`)).toBeInTheDocument();
        expect(screen.getByText(offer.title)).toBeInTheDocument();
      });
    });

    it("should show error state when initial data is null", () => {
      // Arrange & Act
      render(<DashboardView initialData={null} />);

      // Assert
      expect(screen.getByText(/nie udało się załadować danych dashboardu/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("should render with empty dashboard", () => {
      // Arrange
      const emptyData = dashboardScenarios.empty();

      // Act
      render(<DashboardView initialData={emptyData} />);

      // Assert
      expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("0 active");
    });
  });

  describe("Fetching Dashboard Data", () => {
    it("should fetch dashboard data when retry button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const mockData = createMockDashboardDto();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<DashboardView initialData={null} />);

      // Act
      await user.click(screen.getByRole("button", { name: /spróbuj ponownie/i }));

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/dashboard");
      });
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
    });

    it("should handle fetch error gracefully", async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<DashboardView initialData={null} />);

      // Act
      await user.click(screen.getByRole("button", { name: /spróbuj ponownie/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("should handle non-ok response from API", async () => {
      // Arrange
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<DashboardView initialData={null} />);

      // Act
      await user.click(screen.getByRole("button", { name: /spróbuj ponownie/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/nie udało się pobrać danych dashboardu/i)).toBeInTheDocument();
      });
    });
  });

  describe("Adding Offers", () => {
    it("should refresh dashboard data after adding offer", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      const updatedData = createMockDashboardDto({
        summary: { ...initialData.summary, activeCount: 6 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData,
      });

      render(<DashboardView initialData={initialData} />);

      // Act
      await user.click(screen.getByTestId("offer-form"));

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/dashboard");
        expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("6 active");
      });
    });

    it("should not break UI if refresh after add fails", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      mockFetch.mockRejectedValueOnce(new Error("Fetch failed"));

      render(<DashboardView initialData={initialData} />);

      // Act
      await user.click(screen.getByTestId("offer-form"));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
      });
      // Original data should still be displayed
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
    });
  });

  describe("Deleting Offers - Optimistic Updates", () => {
    it("should optimistically remove offer from UI immediately", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      const offerToDelete = initialData.offers[0];

      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<DashboardView initialData={initialData} />);

      // Verify offer exists
      expect(screen.getByTestId(`offer-${offerToDelete.id}`)).toBeInTheDocument();

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Assert - Should be removed immediately (optimistic update)
      expect(screen.queryByTestId(`offer-${offerToDelete.id}`)).not.toBeInTheDocument();
    });

    it("should update activeCount optimistically when deleting offer", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto({
        summary: { activeCount: 5, avgChange: 0, largestDrop: 0, largestRise: 0 },
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<DashboardView initialData={initialData} />);

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("4 active");
      });
    });

    it("should not allow activeCount to go below zero", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto({
        summary: { activeCount: 0, avgChange: 0, largestDrop: 0, largestRise: 0 },
        offers: [createMockDashboardDto().offers[0]],
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<DashboardView initialData={initialData} />);

      // Act
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("0 active");
      });
    });

    it("should rollback optimistic update if delete fails", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      const offerToDelete = initialData.offers[0];

      mockFetch.mockRejectedValueOnce(new Error("Delete failed"));

      render(<DashboardView initialData={initialData} />);

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Assert - Offer should be restored after failed delete
      await waitFor(() => {
        expect(screen.getByTestId(`offer-${offerToDelete.id}`)).toBeInTheDocument();
      });
      expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
    });

    it("should call correct DELETE endpoint with offer ID", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      const offerToDelete = initialData.offers[0];

      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<DashboardView initialData={initialData} />);

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/offers/${offerToDelete.id}`,
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });

    it("should handle delete when no dashboard data exists", async () => {
      // Arrange
      render(<DashboardView initialData={null} />);

      // Act & Assert - Should not crash
      expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should display error toast when error occurs", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      mockFetch.mockRejectedValueOnce(new Error("Something went wrong"));

      render(<DashboardView initialData={initialData} />);

      // Act
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it("should dismiss error toast when dismiss button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const initialData = createMockDashboardDto();
      mockFetch.mockRejectedValueOnce(new Error("Error"));

      render(<DashboardView initialData={initialData} />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Act
      const dismissButton = screen.getByRole("button", { name: /zamknij/i });
      await user.click(dismissButton);

      // Assert
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("Different Dashboard Scenarios", () => {
    it("should handle dashboard with all dropping prices", () => {
      // Arrange
      const data = dashboardScenarios.allDropping();

      // Act
      render(<DashboardView initialData={data} />);

      // Assert
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
      expect(screen.getByTestId("offer-grid")).toBeInTheDocument();
    });

    it("should handle dashboard at 100 offer limit", () => {
      // Arrange
      const data = dashboardScenarios.atLimit();

      // Act
      render(<DashboardView initialData={data} />);

      // Assert
      expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("100 active");
      expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("limit: 5");
    });

    it("should handle dashboard with errors", () => {
      // Arrange
      const data = dashboardScenarios.withErrors();

      // Act
      render(<DashboardView initialData={data} />);

      // Assert
      expect(screen.getByTestId("dashboard-stats")).toHaveTextContent("2 active");
      // The mock creates offer cards for each offer, plus dashboard-stats and offer-form testids
      const offerCards = screen.getAllByTestId(/^offer-/);
      expect(offerCards.length).toBeGreaterThanOrEqual(4);
    });
  });
});
