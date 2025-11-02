import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import FrequencySettingsForm from "../FrequencySettingsForm";
import type { PreferencesDto, UpdatePreferencesCommand } from "@/types";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

describe("FrequencySettingsForm", () => {
  const mockOnSubmit = vi.fn<[UpdatePreferencesCommand], Promise<void>>();

  const defaultPreferences: PreferencesDto = {
    defaultFrequency: "12h",
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all form elements", () => {
      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Check for key UI elements
      expect(
        screen.getByText(/ustaw domyślną częstotliwość sprawdzania cen/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/częstotliwość/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /zapisz zmiany/i })
      ).toBeInTheDocument();
    });

    it("should display current frequency as selected value", () => {
      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const selectTrigger = screen.getByRole("combobox");
      expect(selectTrigger).toHaveTextContent("Co 12 godzin");
    });

    it("should disable submit button when no changes made", () => {
      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Interaction", () => {
    it("should enable submit button when frequency changes", async () => {
      const user = userEvent.setup();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      expect(submitButton).toBeDisabled();

      // Open select and choose different frequency
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      expect(submitButton).toBeEnabled();
    });

    it("should display all frequency options", async () => {
      const user = userEvent.setup();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      expect(await screen.findByRole("option", { name: /co 6 godzin/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /co 12 godzin/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /co 24 godziny/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /co 48 godzin/i })).toBeInTheDocument();
    });

    it("should update selected value when option is clicked", async () => {
      const user = userEvent.setup();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      expect(selectTrigger).toHaveTextContent("Co 24 godziny");
    });
  });

  describe("Form submission", () => {
    it("should call onSubmit with new frequency on successful submit", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Change frequency
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      // Submit
      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({ defaultFrequency: "24h" });
    });

    it("should show success toast on successful submit", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Change and submit
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Preferencje zostały zaktualizowane"
        );
      });
    });

    it("should show error toast on submit failure", async () => {
      const user = userEvent.setup();
      const errorMessage = "Network error";
      mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Change and submit
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should show generic error message for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce("Something went wrong");

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Change and submit
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Nie udało się zaktualizować preferencji"
        );
      });
    });

    it("should disable form during submission", async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValueOnce(submitPromise);

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      // Change frequency
      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      // Start submission
      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      // Check if button shows loading state
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /zapisywanie\.\.\./i })
        ).toBeInTheDocument();
      });
      
      const loadingButton = screen.getByRole("button", { name: /zapisywanie\.\.\./i });
      expect(loadingButton).toBeDisabled();
      expect(screen.getByRole("combobox")).toBeDisabled();

      // Resolve submission
      resolveSubmit!();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /zapisz zmiany/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle all frequency values correctly", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue();

      const frequencies = [
        { value: "6h", label: "Co 6 godzin" },
        { value: "24h", label: "Co 24 godziny" },
        { value: "48h", label: "Co 48 godzin" },
      ] as const;

      for (const frequency of frequencies) {
        const { unmount } = render(
          <FrequencySettingsForm
            initialPreferences={{ defaultFrequency: "12h" }}
            onSubmit={mockOnSubmit}
          />
        );

        const selectTrigger = screen.getByRole("combobox");
        await user.click(selectTrigger);

        const option = await screen.findByRole("option", {
          name: new RegExp(frequency.label, "i"),
        });
        await user.click(option);

        const submitButton = screen.getByRole("button", {
          name: /zapisz zmiany/i,
        });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledWith({
            defaultFrequency: frequency.value,
          });
        });

        unmount();
        mockOnSubmit.mockClear();
      }
    });

    it("should not submit if frequency unchanged", async () => {
      const user = userEvent.setup();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      
      // Button should be disabled when unchanged
      expect(submitButton).toBeDisabled();
      
      // Try to click - should not call onSubmit
      await user.click(submitButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should disable button if reverting to initial value", async () => {
      const user = userEvent.setup();

      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const selectTrigger = screen.getByRole("combobox");
      
      // Change to 24h
      await user.click(selectTrigger);
      const option24h = await screen.findByRole("option", {
        name: /co 24 godziny/i,
      });
      await user.click(option24h);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      expect(submitButton).toBeEnabled();

      // Change back to 12h (initial)
      await user.click(selectTrigger);
      const option12h = await screen.findByRole("option", {
        name: /co 12 godzin/i,
      });
      await user.click(option12h);

      expect(submitButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      const selectElement = screen.getByLabelText(/częstotliwość/i);
      expect(selectElement).toBeInTheDocument();
    });

    it("should have descriptive helper text", () => {
      render(
        <FrequencySettingsForm
          initialPreferences={defaultPreferences}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByText(/zmiany dotyczą tylko nowo dodawanych ofert/i)
      ).toBeInTheDocument();
    });
  });
});

