import { Toaster } from "@/components/ui/sonner";
import { useSettings, FrequencySettingsForm, PasswordChangeForm, DeleteAccountSection } from "../settings";
import type { PreferencesDto } from "@/types";

interface SettingsViewProps {
  initialPreferences: PreferencesDto | null;
}

export default function SettingsView({ initialPreferences }: SettingsViewProps) {
  const { preferences, isLoading, error, updateFrequency, changePassword, deleteAccount } =
    useSettings(initialPreferences);

  // Jeśli wystąpił błąd pobierania danych, pokaż komunikat
  if (error && !preferences) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center text-destructive">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-primary underline">
            Odśwież stronę
          </button>
        </div>
      </div>
    );
  }

  // Szkielet ładowania
  if (isLoading && !preferences) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-6">
          {/* Skeleton dla formularza częstotliwości */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="h-6 bg-muted rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-10 bg-muted rounded w-full mb-4 animate-pulse" />
            <div className="h-9 bg-muted rounded w-24 animate-pulse" />
          </div>

          {/* Skeleton dla formularza hasła */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="h-6 bg-muted rounded w-1/3 mb-4 animate-pulse" />
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded w-full animate-pulse" />
              <div className="h-10 bg-muted rounded w-full animate-pulse" />
              <div className="h-10 bg-muted rounded w-full animate-pulse" />
            </div>
            <div className="h-9 bg-muted rounded w-32 mt-4 animate-pulse" />
          </div>

          {/* Skeleton dla sekcji usuwania */}
          <div className="bg-card rounded-xl border border-destructive p-6 shadow-sm">
            <div className="h-6 bg-muted rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-2/3 mb-4 animate-pulse" />
            <div className="h-9 bg-destructive/20 rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-6">
        {/* Formularz częstotliwości */}
        {preferences && <FrequencySettingsForm initialPreferences={preferences} onSubmit={updateFrequency} />}

        {/* Formularz zmiany hasła */}
        <PasswordChangeForm onSubmit={changePassword} />

        {/* Sekcja usuwania konta */}
        <DeleteAccountSection onDelete={deleteAccount} />
      </div>

      {/* Toaster dla powiadomień */}
      <Toaster />
    </div>
  );
}
