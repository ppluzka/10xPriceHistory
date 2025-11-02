import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSettings } from "../useSettings";
import type { PreferencesDto } from "@/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useSettings", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with provided preferences", () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      const { result } = renderHook(() => useSettings(initialPreferences));

      expect(result.current.preferences).toEqual(initialPreferences);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should fetch preferences when initialPreferences is null", async () => {
      const fetchedPreferences: PreferencesDto = {
        defaultFrequency: "24h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fetchedPreferences,
      });

      const { result } = renderHook(() => useSettings(null));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences).toEqual(fetchedPreferences);
      expect(mockFetch).toHaveBeenCalledWith("/api/preferences");
    });

    it("should handle fetch error when initialPreferences is null", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Nie udało się pobrać preferencji");
      expect(result.current.preferences).toBeNull();
    });
  });

  describe("updateFrequency", () => {
    it("should successfully update frequency", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Success" }),
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      await result.current.updateFrequency({ defaultFrequency: "24h" });

      expect(mockFetch).toHaveBeenCalledWith("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultFrequency: "24h" }),
      });

      await waitFor(() => {
        expect(result.current.preferences?.defaultFrequency).toBe("24h");
      });
    });

    it("should handle update error and throw", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      await expect(
        result.current.updateFrequency({ defaultFrequency: "24h" })
      ).rejects.toThrow("Nie udało się zaktualizować preferencji");

      await waitFor(() => {
        expect(result.current.error).toBe(
          "Nie udało się zaktualizować preferencji"
        );
      });
    });

    it("should maintain preferences on update error", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      try {
        await result.current.updateFrequency({ defaultFrequency: "24h" });
      } catch {
        // Expected error
      }

      expect(result.current.preferences?.defaultFrequency).toBe("12h");
    });
  });

  describe("changePassword", () => {
    it("should successfully change password", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Password changed" }),
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      const passwordData = {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
        confirmPassword: "newpass456",
      };

      await result.current.changePassword(passwordData);

      expect(mockFetch).toHaveBeenCalledWith("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
    });

    it("should handle password change error and throw", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Invalid password" }),
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      const passwordData = {
        currentPassword: "oldpass123",
        newPassword: "newpass456",
        confirmPassword: "newpass456",
      };

      await expect(result.current.changePassword(passwordData)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });
  });

  describe("deleteAccount", () => {
    it("should successfully delete account and redirect", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: "" } as Location;

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      await result.current.deleteAccount();

      expect(mockFetch).toHaveBeenCalledWith("/api/account", {
        method: "DELETE",
      });

      expect(window.location.href).toBe("/");
    });

    it("should handle delete account error and throw", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      await expect(result.current.deleteAccount()).rejects.toThrow(
        "Nie udało się usunąć konta"
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Nie udało się usunąć konta");
      });
    });

    it("should not redirect on delete failure", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      // Mock window.location.href
      const originalLocation = window.location.href;
      delete (window as any).location;
      window.location = { href: originalLocation } as Location;

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(initialPreferences));

      try {
        await result.current.deleteAccount();
      } catch {
        // Expected error
      }

      expect(window.location.href).toBe(originalLocation);
    });
  });

  describe("Error handling", () => {
    it("should clear previous errors on successful operation", async () => {
      const initialPreferences: PreferencesDto = {
        defaultFrequency: "12h",
      };

      const { result } = renderHook(() => useSettings(initialPreferences));

      // First, cause an error
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      try {
        await result.current.updateFrequency({ defaultFrequency: "24h" });
      } catch {
        // Expected error
      }

      await waitFor(() => {
        expect(result.current.error).toBe(
          "Nie udało się zaktualizować preferencji"
        );
      });

      // Then, perform successful operation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Success" }),
      });

      await result.current.updateFrequency({ defaultFrequency: "48h" });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});

