import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import PasswordChangeForm from "../PasswordChangeForm";
import type { PasswordChangeViewModel } from "@/types";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

describe("PasswordChangeForm", () => {
  const mockOnSubmit = vi.fn<[PasswordChangeViewModel], Promise<void>>();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all form fields", () => {
      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      // Check for all password fields
      expect(screen.getByLabelText(/aktualne hasło/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^nowe hasło$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/potwierdź nowe hasło/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zmień hasło/i })).toBeInTheDocument();
    });

    it("should render password inputs with correct types", () => {
      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      expect(currentPassword).toHaveAttribute("type", "password");
      expect(newPassword).toHaveAttribute("type", "password");
      expect(confirmPassword).toHaveAttribute("type", "password");
    });

    it("should have proper autocomplete attributes", () => {
      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      expect(currentPassword).toHaveAttribute("autocomplete", "current-password");
      expect(newPassword).toHaveAttribute("autocomplete", "new-password");
      expect(confirmPassword).toHaveAttribute("autocomplete", "new-password");
    });
  });

  describe("Validation", () => {
    it("should show error when current password is empty", async () => {
      const user = userEvent.setup();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      expect(await screen.findByText(/aktualne hasło jest wymagane/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error when new password is too short", async () => {
      const user = userEvent.setup();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "short");
      await user.type(confirmPassword, "short");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      expect(await screen.findByText(/nowe hasło musi mieć co najmniej 8 znaków/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error when passwords do not match", async () => {
      const user = userEvent.setup();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "differentpass789");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      expect(await screen.findByText(/hasła muszą być identyczne/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error when confirm password is empty", async () => {
      const user = userEvent.setup();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      expect(await screen.findByText(/potwierdzenie hasła jest wymagane/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should not show errors for valid input", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      expect(screen.queryByText(/aktualne hasło jest wymagane/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/nowe hasło musi mieć co najmniej 8 znaków/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/hasła muszą być identyczne/i)).not.toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    it("should call onSubmit with valid data", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          currentPassword: "oldpass123",
          newPassword: "newpass456",
          confirmPassword: "newpass456",
        });
      });
    });

    it("should show success toast on successful submit", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Hasło zostało zmienione");
      });
    });

    it("should show error toast on submit failure", async () => {
      const user = userEvent.setup();
      const errorMessage = "Invalid current password";
      mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "wrongpass");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should show generic error message for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce("Something went wrong");

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Nie udało się zmienić hasła");
      });
    });

    it("should clear form after successful submit", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(currentPassword).toHaveValue("");
        expect(newPassword).toHaveValue("");
        expect(confirmPassword).toHaveValue("");
      });
    });

    it("should not clear form on submit failure", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error("Failed"));

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(currentPassword).toHaveValue("oldpass123");
      expect(newPassword).toHaveValue("newpass456");
      expect(confirmPassword).toHaveValue("newpass456");
    });

    it("should disable form during submission", async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValueOnce(submitPromise);

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByRole("button", { name: /zmiana hasła\.\.\./i })).toBeDisabled();
      expect(currentPassword).toBeDisabled();
      expect(newPassword).toBeDisabled();
      expect(confirmPassword).toBeDisabled();

      // Resolve submission
      resolveSubmit!();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /zmień hasło/i })).toBeEnabled();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes for errors", async () => {
      const user = userEvent.setup();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        const currentPassword = screen.getByLabelText(/aktualne hasło/i);
        expect(currentPassword).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("should not have aria-invalid when field is valid", () => {
      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      expect(currentPassword).toHaveAttribute("aria-invalid", "false");
    });

    it("should have proper form structure", () => {
      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("form", "password-change-form");
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid consecutive submissions", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, "oldpass123");
      await user.type(newPassword, "newpass456");
      await user.type(confirmPassword, "newpass456");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });

      // Try to submit multiple times quickly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        // Should only be called once due to disabled state
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle very long passwords", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const longPassword = "a".repeat(100);
      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(currentPassword, longPassword);
      await user.type(newPassword, longPassword + "new");
      await user.type(confirmPassword, longPassword + "new");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          currentPassword: longPassword,
          newPassword: longPassword + "new",
          confirmPassword: longPassword + "new",
        });
      });
    });

    it("should trim whitespace from password inputs", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce();

      render(<PasswordChangeForm onSubmit={mockOnSubmit} />);

      const currentPassword = screen.getByLabelText(/aktualne hasło/i);
      const newPassword = screen.getByLabelText(/^nowe hasło$/i);
      const confirmPassword = screen.getByLabelText(/potwierdź nowe hasło/i);

      // Type with spaces (spaces are part of password - should NOT be trimmed)
      await user.type(currentPassword, " oldpass123 ");
      await user.type(newPassword, " newpass456 ");
      await user.type(confirmPassword, " newpass456 ");

      const submitButton = screen.getByRole("button", { name: /zmień hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          currentPassword: " oldpass123 ",
          newPassword: " newpass456 ",
          confirmPassword: " newpass456 ",
        });
      });
    });
  });
});
