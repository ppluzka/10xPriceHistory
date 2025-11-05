import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import DeleteAccountSection from "../DeleteAccountSection";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

describe("DeleteAccountSection", () => {
  const mockOnDelete = vi.fn<[], Promise<void>>();

  beforeEach(() => {
    mockOnDelete.mockClear();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render warning card with proper styling", () => {
      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Check for warning text content
      expect(screen.getByText(/usunięcie konta spowoduje trwałe usunięcie/i)).toBeInTheDocument();
    });

    it("should render delete button", () => {
      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      expect(screen.queryByText(/czy na pewno chcesz usunąć konto/i)).not.toBeInTheDocument();
    });
  });

  describe("Dialog interaction", () => {
    it("should open dialog when delete button is clicked", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const dialogText = await screen.findByText(/czy na pewno chcesz usunąć konto/i);
      expect(dialogText).toBeInTheDocument();

      // Check that dialog description appears (there are two similar texts, one in card and one in dialog)
      const actionTexts = screen.getAllByText(/ta akcja jest nieodwracalna/i);
      expect(actionTexts.length).toBeGreaterThan(0);
    });

    it("should render confirmation input in dialog", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      expect(confirmationInput).toBeInTheDocument();
      expect(confirmationInput).toHaveAttribute("placeholder", "USUŃ");
    });

    it("should render cancel and confirm buttons in dialog", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      expect(await screen.findByRole("button", { name: /anuluj/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /usuń konto/i })).toBeInTheDocument();
    });

    it("should close dialog when cancel is clicked", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      expect(await screen.findByText(/czy na pewno chcesz usunąć konto/i)).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/czy na pewno chcesz usunąć konto/i)).not.toBeInTheDocument();
      });
    });

    it("should reset confirmation input when dialog is closed", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      // Type confirmation text
      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");
      expect(confirmationInput).toHaveValue("USUŃ");

      // Cancel dialog
      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      // Reopen dialog
      await user.click(deleteButton);
      const newConfirmationInput = await screen.findByLabelText(/wpisz/i);
      expect(newConfirmationInput).toHaveValue("");
    });
  });

  describe("Confirmation validation", () => {
    it("should disable confirm button when confirmation text is empty", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeDisabled();
    });

    it("should disable confirm button when confirmation text is incorrect", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "wrong text");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeDisabled();
    });

    it("should enable confirm button when correct confirmation text is entered", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeEnabled();
    });

    it("should be case-sensitive for confirmation text", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "usuń"); // lowercase

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeDisabled();
    });
  });

  describe("Delete operation", () => {
    it("should call onDelete when confirmation is valid and button is clicked", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValueOnce();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      // Type confirmation
      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      // Click confirm
      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      });
    });

    it("should not call onDelete when confirmation text is invalid", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      // Type wrong confirmation
      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "wrong");

      // Try to click confirm (button should be disabled)
      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      // Button is disabled, so clicking won't work
      expect(confirmButton).toBeDisabled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should show error toast on delete failure", async () => {
      const user = userEvent.setup();
      const errorMessage = "Failed to delete account";
      mockOnDelete.mockRejectedValueOnce(new Error(errorMessage));

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog and confirm
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should show generic error message for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockRejectedValueOnce("Something went wrong");

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog and confirm
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Nie udało się usunąć konta");
      });
    });

    it("should disable all dialog controls during deletion", async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockOnDelete.mockReturnValueOnce(deletePromise);

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      // Open dialog and start deletion
      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );
      await user.click(confirmButton!);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /usuwanie\.\.\./i })).toBeDisabled();
      });

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
      expect(confirmationInput).toBeDisabled();

      // Resolve deletion
      resolveDelete!();

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA structure for alert dialog", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should have proper form labels", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      expect(confirmationInput).toHaveAttribute("id", "delete-confirmation");
    });

    it("should have autocomplete disabled on confirmation input", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      expect(confirmationInput).toHaveAttribute("autocomplete", "off");
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid dialog open/close cycles", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });

      // Open and close multiple times
      for (let i = 0; i < 3; i++) {
        await user.click(deleteButton);
        expect(await screen.findByText(/czy na pewno chcesz usunąć konto/i)).toBeInTheDocument();

        const cancelButton = screen.getByRole("button", { name: /anuluj/i });
        await user.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByText(/czy na pewno chcesz usunąć konto/i)).not.toBeInTheDocument();
        });
      }

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should handle partial confirmation text", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);

      // Type partial text
      await user.type(confirmationInput, "USU");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeDisabled();

      // Complete the text
      await user.type(confirmationInput, "Ń");
      expect(confirmButton).toBeEnabled();
    });

    it("should handle confirmation text with extra characters", async () => {
      const user = userEvent.setup();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ extra");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      expect(confirmButton).toBeDisabled();
    });

    it("should keep dialog open on delete failure", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockRejectedValueOnce(new Error("Failed"));

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Dialog should still be visible after error
      expect(screen.getByText(/czy na pewno chcesz usunąć konto/i)).toBeInTheDocument();
    });

    it("should prevent double deletion on rapid clicks", async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue();

      render(<DeleteAccountSection onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /usuń konto/i });
      await user.click(deleteButton);

      const confirmationInput = await screen.findByLabelText(/wpisz/i);
      await user.type(confirmationInput, "USUŃ");

      const confirmButton = (await screen.findAllByRole("button", { name: /usuń konto/i })).find((btn) =>
        btn.closest('[role="alertdialog"]')
      );

      // Try to click multiple times
      await user.click(confirmButton!);
      await user.click(confirmButton!);
      await user.click(confirmButton!);

      await waitFor(() => {
        // Should only be called once due to disabled state
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
