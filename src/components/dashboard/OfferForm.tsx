import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { AddOfferCommand } from "@/types";
import { apiFetch } from "@/lib/utils";

interface OfferFormProps {
  onOfferAdded: () => void;
  activeCount: number;
  offerLimit: number;
}

export default function OfferForm({ onOfferAdded, activeCount, offerLimit }: OfferFormProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isLimitReached = activeCount >= offerLimit;

  // Validate URL
  const validateUrl = useCallback((value: string): boolean => {
    setValidationError(null);

    if (!value.trim()) {
      setValidationError("Wprowadź adres URL.");
      return false;
    }

    try {
      const urlObj = new URL(value);

      // Validate protocol (must be http or https)
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        setValidationError("Wprowadź adres URL.");
        return false;
      }

      // Validate domain (must be from otomoto.pl)
      if (!urlObj.hostname.includes("otomoto.pl")) {
        setValidationError("URL musi być z otomoto.pl");
        return false;
      }

      return true;
    } catch {
      setValidationError("Wprowadź adres URL.");
      return false;
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateUrl(url)) {
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const command: AddOfferCommand = { url: url.trim() };

        const response = await apiFetch("/api/offers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Show detailed error message if available, otherwise show generic error
          const errorMessage = errorData.details || errorData.error || "Nie udało się dodać oferty";
          throw new Error(errorMessage);
        }

        await response.json();

        // Clear form on success
        setUrl("");

        // Trigger parent component to refresh data
        onOfferAdded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się dodać oferty");
        console.error("Error adding offer:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [url, validateUrl, onOfferAdded]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (value: string) => {
      setUrl(value);
      if (validationError) {
        setValidationError(null);
      }
      if (error) {
        setError(null);
      }
    },
    [validationError, error]
  );

  // Show limit reached message instead of form
  if (isLimitReached) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-xs" data-testid="offer-form">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Limit ofert został wykorzystany</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Osiągnąłeś maksymalny limit {offerLimit} aktywnych ofert. Aby dodać nową ofertę, najpierw usuń jedną z
              istniejących.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-xs" data-testid="offer-form">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Dodaj nową ofertę</h2>
          <p className="text-sm text-muted-foreground">
            Wklej adres URL z otomoto.pl, aby rozpocząć śledzenie zmian cen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="url"
              value={url}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="https://www.otomoto.pl/..."
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive md:text-sm"
              aria-invalid={!!(validationError || error)}
              data-testid="offer-url-input"
            />

            {validationError && (
              <p className="text-sm text-destructive" data-testid="offer-validation-error">
                {validationError}
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive" data-testid="offer-submit-error">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="w-full sm:w-auto"
            data-testid="offer-submit-button"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj ofertę"}
          </Button>
        </form>
      </div>
    </div>
  );
}
