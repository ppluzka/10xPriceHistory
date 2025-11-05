import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsView from "../SettingsView";
import type { PreferencesDto } from "@/types";

// Mock the settings components
vi.mock("@/components/settings", () => ({
  useSettings: vi.fn(),
  FrequencySettingsForm: ({ initialPreferences, onSubmit }: any) => (
    <div data-testid="frequency-form">
      <p>Frequency: {initialPreferences.defaultFrequency}</p>
      <button onClick={() => onSubmit({ defaultFrequency: "24h" })}>Update Frequency</button>
    </div>
  ),
  PasswordChangeForm: ({ onSubmit }: any) => (
    <div data-testid="password-form">
      <button
        onClick={() =>
          onSubmit({
            currentPassword: "old",
            newPassword: "new",
            confirmPassword: "new",
          })
        }
      >
        Change Password
      </button>
    </div>
  ),
  DeleteAccountSection: ({ onDelete }: any) => (
    <div data-testid="delete-section">
      <button onClick={onDelete}>Delete Account</button>
    </div>
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Get the mocked useSettings
const { useSettings } = await import("@/components/settings");

describe("SettingsView", () => {
  const mockUseSettings = useSettings as ReturnType<typeof vi.fn>;

  const defaultPreferences: PreferencesDto = {
    defaultFrequency: "12h",
  };

  const mockSettingsReturn = {
    preferences: defaultPreferences,
    isLoading: false,
    error: null,
    updateFrequency: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  };

  beforeEach(() => {
    mockUseSettings.mockReturnValue(mockSettingsReturn);
    vi.clearAllMocks();
  });

  describe("Initial rendering with preferences", () => {
    it("should render all settings sections when preferences are available", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      expect(screen.getByTestId("frequency-form")).toBeInTheDocument();
      expect(screen.getByTestId("password-form")).toBeInTheDocument();
      expect(screen.getByTestId("delete-section")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("should pass initial preferences to hook", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      expect(mockUseSettings).toHaveBeenCalledWith(defaultPreferences);
    });

    it("should display correct frequency from preferences", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      expect(screen.getByText(/frequency: 12h/i)).toBeInTheDocument();
    });

    it("should have proper container structure", () => {
      const { container } = render(<SettingsView initialPreferences={defaultPreferences} />);

      const mainContainer = container.querySelector(".container");
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass("mx-auto", "px-4", "py-8");
    });
  });

  describe("Loading state", () => {
    it("should show loading skeleton when loading without preferences", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        isLoading: true,
      });

      const { container } = render(<SettingsView initialPreferences={null} />);

      // Check for skeleton elements (using animate-pulse class)
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should not show forms during loading", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        isLoading: true,
      });

      render(<SettingsView initialPreferences={null} />);

      expect(screen.queryByTestId("frequency-form")).not.toBeInTheDocument();
      expect(screen.queryByTestId("password-form")).not.toBeInTheDocument();
      expect(screen.queryByTestId("delete-section")).not.toBeInTheDocument();
    });

    it("should show loading skeleton structure with proper styling", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        isLoading: true,
      });

      const { container } = render(<SettingsView initialPreferences={null} />);

      // Check for card structures
      const cards = container.querySelectorAll(".rounded-xl.border");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe("Error state", () => {
    it("should show error message when error exists and no preferences", () => {
      const errorMessage = "Failed to load preferences";
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: errorMessage,
        isLoading: false,
      });

      render(<SettingsView initialPreferences={null} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("should show reload button on error", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: "Error occurred",
        isLoading: false,
      });

      render(<SettingsView initialPreferences={null} />);

      const reloadButton = screen.getByRole("button", {
        name: /odśwież stronę/i,
      });
      expect(reloadButton).toBeInTheDocument();
    });

    it("should reload page when reload button is clicked", async () => {
      const user = userEvent.setup();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: "Error occurred",
        isLoading: false,
      });

      render(<SettingsView initialPreferences={null} />);

      const reloadButton = screen.getByRole("button", {
        name: /odśwież stronę/i,
      });
      await user.click(reloadButton);

      expect(reloadMock).toHaveBeenCalled();
    });

    it("should not show forms when error occurs", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: "Error occurred",
        isLoading: false,
      });

      render(<SettingsView initialPreferences={null} />);

      expect(screen.queryByTestId("frequency-form")).not.toBeInTheDocument();
      expect(screen.queryByTestId("password-form")).not.toBeInTheDocument();
      expect(screen.queryByTestId("delete-section")).not.toBeInTheDocument();
    });

    it("should show error with destructive styling", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: "Error occurred",
        isLoading: false,
      });

      const { container } = render(<SettingsView initialPreferences={null} />);

      const errorElement = container.querySelector(".text-destructive");
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe("Form interactions", () => {
    it("should call updateFrequency when frequency form is submitted", async () => {
      const user = userEvent.setup();
      const mockUpdateFrequency = vi.fn().mockResolvedValue(undefined);

      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        updateFrequency: mockUpdateFrequency,
      });

      render(<SettingsView initialPreferences={defaultPreferences} />);

      const updateButton = screen.getByRole("button", {
        name: /update frequency/i,
      });
      await user.click(updateButton);

      expect(mockUpdateFrequency).toHaveBeenCalledWith({
        defaultFrequency: "24h",
      });
    });

    it("should call changePassword when password form is submitted", async () => {
      const user = userEvent.setup();
      const mockChangePassword = vi.fn().mockResolvedValue(undefined);

      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        changePassword: mockChangePassword,
      });

      render(<SettingsView initialPreferences={defaultPreferences} />);

      const changeButton = screen.getByRole("button", {
        name: /change password/i,
      });
      await user.click(changeButton);

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "old",
        newPassword: "new",
        confirmPassword: "new",
      });
    });

    it("should call deleteAccount when delete button is clicked", async () => {
      const user = userEvent.setup();
      const mockDeleteAccount = vi.fn().mockResolvedValue(undefined);

      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        deleteAccount: mockDeleteAccount,
      });

      render(<SettingsView initialPreferences={defaultPreferences} />);

      const deleteButton = screen.getByRole("button", {
        name: /delete account/i,
      });
      await user.click(deleteButton);

      expect(mockDeleteAccount).toHaveBeenCalled();
    });
  });

  describe("State transitions", () => {
    it("should transition from loading to loaded state", async () => {
      // Initially loading
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        isLoading: true,
      });

      const { rerender, container } = render(<SettingsView initialPreferences={null} />);

      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

      // Then loaded
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: defaultPreferences,
        isLoading: false,
      });
      rerender(<SettingsView initialPreferences={null} />);

      await waitFor(() => {
        expect(screen.getByTestId("frequency-form")).toBeInTheDocument();
      });
    });

    it("should transition from error to loaded when preferences become available", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        error: "Error",
        isLoading: false,
      });

      const { rerender } = render(<SettingsView initialPreferences={null} />);

      expect(screen.getByText("Error")).toBeInTheDocument();

      // Update to show preferences
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: defaultPreferences,
        error: null,
        isLoading: false,
      });

      rerender(<SettingsView initialPreferences={null} />);

      expect(screen.queryByText("Error")).not.toBeInTheDocument();
      expect(screen.getByTestId("frequency-form")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle null initial preferences", () => {
      render(<SettingsView initialPreferences={null} />);

      expect(mockUseSettings).toHaveBeenCalledWith(null);
    });

    it("should render password form even without preferences", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: defaultPreferences,
      });

      render(<SettingsView initialPreferences={defaultPreferences} />);

      // Password form doesn't need preferences
      expect(screen.getByTestId("password-form")).toBeInTheDocument();
    });

    it("should not render frequency form when preferences are null", () => {
      mockUseSettings.mockReturnValue({
        ...mockSettingsReturn,
        preferences: null,
        isLoading: false,
        error: null,
      });

      render(<SettingsView initialPreferences={null} />);

      expect(screen.queryByTestId("frequency-form")).not.toBeInTheDocument();
      expect(screen.getByTestId("password-form")).toBeInTheDocument();
      expect(screen.getByTestId("delete-section")).toBeInTheDocument();
    });

    it("should handle different frequency values", () => {
      const frequencies = ["6h", "12h", "24h", "48h"] as const;

      frequencies.forEach((freq) => {
        const prefs: PreferencesDto = { defaultFrequency: freq };

        mockUseSettings.mockReturnValue({
          ...mockSettingsReturn,
          preferences: prefs,
        });

        const { unmount } = render(<SettingsView initialPreferences={prefs} />);

        expect(screen.getByText(new RegExp(`frequency: ${freq}`, "i"))).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      const { container } = render(<SettingsView initialPreferences={defaultPreferences} />);

      const mainContainer = container.querySelector(".container");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render toaster for notifications", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("should have proper spacing between sections", () => {
      const { container } = render(<SettingsView initialPreferences={defaultPreferences} />);

      const spaceContainer = container.querySelector(".space-y-6");
      expect(spaceContainer).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should integrate all three settings sections correctly", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      // All sections should be present
      const frequencyForm = screen.getByTestId("frequency-form");
      const passwordForm = screen.getByTestId("password-form");
      const deleteSection = screen.getByTestId("delete-section");

      expect(frequencyForm).toBeInTheDocument();
      expect(passwordForm).toBeInTheDocument();
      expect(deleteSection).toBeInTheDocument();

      // All should have action buttons
      expect(screen.getByRole("button", { name: /update frequency/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
    });

    it("should pass correct props to each component", () => {
      render(<SettingsView initialPreferences={defaultPreferences} />);

      // Frequency form should show preferences
      expect(screen.getByText(/frequency: 12h/i)).toBeInTheDocument();

      // All forms should have their action buttons
      expect(screen.getByRole("button", { name: /update frequency/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
    });
  });

  describe("Responsive design", () => {
    it("should have responsive padding classes", () => {
      const { container } = render(<SettingsView initialPreferences={defaultPreferences} />);

      const mainContainer = container.querySelector(".container");
      expect(mainContainer).toHaveClass("px-4", "sm:px-6", "lg:px-8");
    });

    it("should constrain content width", () => {
      const { container } = render(<SettingsView initialPreferences={defaultPreferences} />);

      const contentContainer = container.querySelector(".max-w-2xl");
      expect(contentContainer).toBeInTheDocument();
    });
  });
});
