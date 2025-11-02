import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { AddOfferCommand, AddOfferResponseDto } from "@/types";

interface OfferFormProps {
  onOfferAdded: () => void;
}

export default function OfferForm({ onOfferAdded }: OfferFormProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate URL
  const validateUrl = useCallback((value: string): boolean => {
    setValidationError(null);

    if (!value.trim()) {
      setValidationError("URL is required");
      return false;
    }

    try {
      const urlObj = new URL(value);
      
      if (!urlObj.hostname.includes("otomoto.pl")) {
        setValidationError("URL must be from otomoto.pl");
        return false;
      }
      
      return true;
    } catch {
      setValidationError("Please enter a valid URL");
      return false;
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateUrl(url)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const command: AddOfferCommand = { url: url.trim() };
      
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add offer");
      }

      const result: AddOfferResponseDto = await response.json();
      
      // Clear form on success
      setUrl("");
      
      // Trigger parent component to refresh data
      onOfferAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add offer");
      console.error("Error adding offer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [url, validateUrl, onOfferAdded]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setUrl(value);
    if (validationError) {
      setValidationError(null);
    }
    if (error) {
      setError(null);
    }
  }, [validationError, error]);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-xs">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Add New Offer</h2>
          <p className="text-sm text-muted-foreground">
            Paste an otomoto.pl URL to start tracking price changes
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
            />
            
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Adding..." : "Add Offer"}
          </Button>
        </form>
      </div>
    </div>
  );
}

