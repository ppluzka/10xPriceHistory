import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate email format
  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationError("Email jest wymagany");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setValidationError("Wprowadź prawidłowy adres email");
      return false;
    }

    setValidationError(null);
    return true;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle specific error codes
        switch (response.status) {
          case 429:
            setError("Zbyt wiele prób. Spróbuj ponownie za chwilę");
            break;
          case 400:
            setError(data.error || "Nieprawidłowy adres email");
            break;
          default:
            setError(data.error || "Wystąpił błąd, spróbuj ponownie");
        }
        return;
      }

      // Show success message
      setSuccess(true);
      setEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Wystąpił błąd połączenia, spróbuj ponownie");
    } finally {
      setIsLoading(false);
    }
  }, [email, validateEmail]);

  // Handle email blur
  const handleEmailBlur = useCallback(() => {
    if (email) {
      validateEmail(email);
    }
  }, [email, validateEmail]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Zresetuj hasło</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-4">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✓ Link do zresetowania hasła został wysłany
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Sprawdź swoją skrzynkę email. Jeśli nie widzisz wiadomości, sprawdź folder spam.
            </p>
            <p className="text-sm text-muted-foreground">
              Link będzie ważny przez 60 minut.
            </p>
          </div>
        ) : (
          <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Podaj swój adres email, a wyślemy Ci link do zresetowania hasła.
            </p>

            {/* General error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationError) {
                    setValidationError(null);
                  }
                  if (error) setError(null);
                }}
                onBlur={handleEmailBlur}
                placeholder="twoj@email.com"
                disabled={isLoading}
                aria-invalid={!!validationError}
                autoComplete="email"
                autoFocus
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {!success && (
          <Button
            type="submit"
            form="forgot-password-form"
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
          </Button>
        )}

        <a 
          href="/login" 
          className="text-sm text-primary hover:underline text-center"
        >
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
}

