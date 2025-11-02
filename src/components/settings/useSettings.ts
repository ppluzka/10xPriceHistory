import { useState, useEffect } from "react";
import type { 
  PreferencesDto, 
  UpdatePreferencesCommand, 
  UpdatePreferencesResponseDto,
  PasswordChangeViewModel 
} from "@/types";

interface UseSettingsReturn {
  preferences: PreferencesDto | null;
  isLoading: boolean;
  error: string | null;
  updateFrequency: (data: UpdatePreferencesCommand) => Promise<void>;
  changePassword: (data: PasswordChangeViewModel) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/**
 * Custom hook do zarządzania stanem i logiką strony ustawień.
 * Odpowiada za pobieranie preferencji oraz akcje: aktualizacja częstotliwości,
 * zmiana hasła i usunięcie konta.
 */
export function useSettings(initialPreferences: PreferencesDto | null): UseSettingsReturn {
  const [preferences, setPreferences] = useState<PreferencesDto | null>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jeśli nie ma początkowych danych, pobierz je
  useEffect(() => {
    if (!initialPreferences) {
      fetchPreferences();
    }
  }, [initialPreferences]);

  const fetchPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/preferences");

      if (!response.ok) {
        throw new Error("Nie udało się pobrać preferencji");
      }

      const data: PreferencesDto = await response.json();
      setPreferences(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd";
      setError(errorMessage);
      console.error("Error fetching preferences:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFrequency = async (data: UpdatePreferencesCommand) => {
    setError(null);

    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zaktualizować preferencji");
      }

      const result: UpdatePreferencesResponseDto = await response.json();
      
      // Aktualizuj lokalny stan
      setPreferences(data);
      
      return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd";
      setError(errorMessage);
      console.error("Error updating frequency:", err);
      throw err;
    }
  };

  const changePassword = async (data: PasswordChangeViewModel) => {
    setError(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Nie udało się zmienić hasła");
      }

      return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd";
      setError(errorMessage);
      console.error("Error changing password:", err);
      throw err;
    }
  };

  const deleteAccount = async () => {
    setError(null);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć konta");
      }

      // Przekieruj na stronę główną po usunięciu konta
      window.location.href = "/";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd";
      setError(errorMessage);
      console.error("Error deleting account:", err);
      throw err;
    }
  };

  return {
    preferences,
    isLoading,
    error,
    updateFrequency,
    changePassword,
    deleteAccount,
  };
}

