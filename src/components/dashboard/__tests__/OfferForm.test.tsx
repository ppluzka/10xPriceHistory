import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfferForm from "../OfferForm";

describe("OfferForm", () => {
  let mockOnOfferAdded: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOfferAdded = vi.fn();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== RENDERING ====================

  describe("Rendering", () => {
    it("should render the form with all elements", () => {
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      expect(screen.getByText("Dodaj nową ofertę")).toBeInTheDocument();
      expect(screen.getByText(/Wklej adres URL z otomoto.pl, aby rozpocząć śledzenie/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("https://www.otomoto.pl/...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dodaj ofertę/i })).toBeInTheDocument();
    });

    it("should render input with correct attributes", () => {
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      expect(input).toHaveAttribute("type", "url");
      expect(input).not.toBeDisabled();
    });

    it("should have submit button disabled when URL is empty", () => {
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ==================== URL VALIDATION ====================

  describe("URL Validation", () => {
    it("should prevent submission when URL is empty (button disabled)", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });

      // Type and clear - button should become disabled
      await user.type(input, "a");
      await user.clear(input);

      // Button should be disabled, preventing submission
      expect(submitButton).toBeDisabled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show error for invalid URL format", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.clear(input);
      await user.type(input, "ftp://otomoto.pl/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText("Wprowadź adres URL.");
        expect(errorMessage).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show error when URL is not from otomoto.pl", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.google.com/search");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      expect(screen.getByText("URL musi być z otomoto.pl")).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show error when URL is from similar but wrong domain", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.com/offer/123");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      expect(screen.getByText("URL musi być z otomoto.pl")).toBeInTheDocument();
    });

    it("should accept valid otomoto.pl URL with www", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Offer added successfully" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test-car-123");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/offers",
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });

    it("should accept valid otomoto.pl URL without www", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://otomoto.pl/oferta/bmw-x5-2024");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should accept otomoto.pl URL with query parameters", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test?utm_source=facebook&ref=share");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should trim whitespace from URL before validation", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "  https://www.otomoto.pl/oferta/test  ");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/offers",
          expect.objectContaining({
            body: JSON.stringify({
              url: "https://www.otomoto.pl/oferta/test",
            }),
          })
        );
      });
    });
  });

  // ==================== FORM SUBMISSION ====================

  describe("Form Submission", () => {
    it("should successfully submit valid offer", async () => {
      const user = userEvent.setup();
      const mockResponse = { id: 123, message: "Offer added successfully" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/bmw-x5");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/offers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: "https://www.otomoto.pl/oferta/bmw-x5" }),
        });
      });
    });

    it("should clear form after successful submission", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...") as HTMLInputElement;
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe("");
      });
    });

    it("should call onOfferAdded callback after successful submission", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOfferAdded).toHaveBeenCalledTimes(1);
      });
    });

    it("should show error message when API returns error", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Offer already exists" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/duplicate");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Offer already exists")).toBeInTheDocument();
      });
    });

    it("should show generic error when API returns non-JSON error", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nie udało się dodać oferty")).toBeInTheDocument();
      });
    });

    it("should handle network errors gracefully", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should not call onOfferAdded on error", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });

      expect(mockOnOfferAdded).not.toHaveBeenCalled();
    });
  });

  // ==================== LOADING STATE ====================

  describe("Loading State", () => {
    it("should show loading state during submission", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 1, message: "Success" }),
                }),
              100
            )
          )
      );

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByRole("button", { name: /dodawanie/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dodawanie/i })).toBeDisabled();
    });

    it("should disable input during submission", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 1, message: "Success" }),
                }),
              100
            )
          )
      );

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      expect(input).toBeDisabled();
    });

    it("should re-enable form after submission completes", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    it("should re-enable form after submission fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Error" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /dodaj ofertę/i })).not.toBeDisabled();
      });
    });
  });

  // ==================== ERROR STATE MANAGEMENT ====================

  describe("Error State Management", () => {
    it("should clear validation error when user starts typing", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });

      // Trigger validation error
      await user.clear(input);
      await user.type(input, "ftp://otomoto.pl/test");
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText("Wprowadź adres URL.");
        expect(errorMessage).toBeInTheDocument();
      });

      // Start typing - error should clear (via handleInputChange)
      await user.type(input, "a");

      await waitFor(() => {
        expect(screen.queryByText("Wprowadź adres URL.")).not.toBeInTheDocument();
      });
    });

    it("should clear API error when user starts typing", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });

      // Start typing - error should clear
      await user.type(input, "a");
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    });

    it("should not show both validation and API errors simultaneously", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "API error" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("API error")).toBeInTheDocument();
      });

      // Typing clears API error (via handleInputChange)
      await user.type(input, "a");

      await waitFor(() => {
        expect(screen.queryByText("API error")).not.toBeInTheDocument();
      });

      // Now trigger validation error with invalid URL
      await user.clear(input);
      await user.type(input, "javascript:alert(1)");
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText("Wprowadź adres URL.");
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  // ==================== ACCESSIBILITY ====================

  describe("Accessibility", () => {
    it("should set aria-invalid on input when validation error exists", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });

      await user.clear(input);
      await user.type(input, "ftp://example.com/test");
      await user.click(submitButton);

      // Wait for validation error message to appear first
      await waitFor(() => {
        const errorMessage = screen.queryByText("Wprowadź adres URL.");
        expect(errorMessage).toBeInTheDocument();
      });

      // Then check aria-invalid
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should set aria-invalid on input when API error exists", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Error" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("should not set aria-invalid when no errors", () => {
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("should have proper heading hierarchy", () => {
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const heading = screen.getByText("Dodaj nową ofertę");
      expect(heading.tagName).toBe("H2");
    });
  });

  // ==================== EDGE CASES ====================

  describe("Edge Cases", () => {
    it("should handle very long URLs", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      const longUrl = "https://www.otomoto.pl/oferta/" + "a".repeat(500) + "?param=value";

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, longUrl);

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should handle URLs with special characters", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/bmw-x5-2024-śląskie-górny");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should handle rapid successive submissions", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test1");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });

      // Try to submit multiple times
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only submit once because button gets disabled
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle form submission via Enter key", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test{Enter}");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should handle empty response from server", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOfferAdded).toHaveBeenCalled();
      });
    });
  });

  // ==================== BUTTON STATE ====================

  describe("Button State", () => {
    it("should keep button disabled when URL is only whitespace", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "   ");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable button when valid URL is entered", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should disable button again when URL is cleared", async () => {
      const user = userEvent.setup();
      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      let submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).not.toBeDisabled();

      await user.clear(input);

      submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ==================== INTEGRATION ====================

  describe("Integration", () => {
    it("should complete full add offer flow successfully", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 456, message: "Offer added successfully" }),
                }),
              50
            )
          )
      );

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      // Step 1: User types URL
      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/mercedes-s-class");

      // Step 2: User submits
      const submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      // Step 3: Loading state
      await waitFor(() => {
        expect(screen.getByText(/dodawanie/i)).toBeInTheDocument();
      });

      // Step 4: Success
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/offers",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              url: "https://www.otomoto.pl/oferta/mercedes-s-class",
            }),
          })
        );
      });

      // Step 5: Form cleared and callback called
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe("");
        expect(mockOnOfferAdded).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle error and allow retry", async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server temporarily unavailable" }),
      });

      render(<OfferForm onOfferAdded={mockOnOfferAdded} activeCount={0} offerLimit={100} />);

      const input = screen.getByPlaceholderText("https://www.otomoto.pl/...");
      await user.type(input, "https://www.otomoto.pl/oferta/test");

      let submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Server temporarily unavailable")).toBeInTheDocument();
      });

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: "Success" }),
      });

      submitButton = screen.getByRole("button", { name: /dodaj ofertę/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOfferAdded).toHaveBeenCalledTimes(1);
      });
    });
  });
});
