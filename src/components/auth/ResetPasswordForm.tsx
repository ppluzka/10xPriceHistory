import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { apiFetch } from "@/lib/utils";

interface ResetPasswordFormProps {
  /**
   * Whether the reset token is valid
   * If false, shows error state
   */
  isTokenValid?: boolean;
}

export default function ResetPasswordForm({ isTokenValid = true }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  // Validate password
  const validatePassword = useCallback((value: string): boolean => {
    if (!value) {
      setValidationErrors((prev) => ({ ...prev, password: "Hasło jest wymagane" }));
      return false;
    }

    if (value.length < 8) {
      setValidationErrors((prev) => ({
        ...prev,
        password: "Hasło musi mieć minimum 8 znaków",
      }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  }, []);

  // Validate password confirmation
  const validateConfirmPassword = useCallback(
    (value: string): boolean => {
      if (!value) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: "Potwierdzenie hasła jest wymagane",
        }));
        return false;
      }

      if (value !== password) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: "Hasła nie są identyczne",
        }));
        return false;
      }

      setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      return true;
    },
    [password]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      // Validate all fields
      const isPasswordValid = validatePassword(password);
      const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

      if (!isPasswordValid || !isConfirmPasswordValid) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiFetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Handle specific error codes
          switch (response.status) {
            case 401:
              setError("Link wygasł lub jest nieprawidłowy. Wygeneruj nowy link resetujący");
              break;
            case 400:
              setError(data.error || "Nieprawidłowe hasło");
              break;
            case 422:
              setError("Hasło jest zbyt słabe. Użyj silniejszego hasła");
              break;
            default:
              setError(data.error || "Wystąpił błąd, spróbuj ponownie");
          }
          return;
        }

        // Show success and redirect after delay
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login?password_reset=true";
        }, 2000);
      } catch (err) {
        console.error("Reset password error:", err);
        setError("Wystąpił błąd połączenia, spróbuj ponownie");
      } finally {
        setIsLoading(false);
      }
    },
    [password, confirmPassword, validatePassword, validateConfirmPassword]
  );

  // Handle password blur
  const handlePasswordBlur = useCallback(() => {
    if (password) {
      validatePassword(password);
    }
  }, [password, validatePassword]);

  // Handle confirm password blur
  const handleConfirmPasswordBlur = useCallback(() => {
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
  }, [confirmPassword, validateConfirmPassword]);

  // Show error state if token is invalid
  if (!isTokenValid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nieprawidłowy link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive font-medium">
                Link do resetowania hasła wygasł lub jest nieprawidłowy
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Linki resetujące hasło są ważne przez 60 minut. Wygeneruj nowy link, aby zresetować hasło.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <a href="/forgot-password">Wyślij nowy link</a>
          </Button>
          <a href="/login" className="text-sm text-primary hover:underline text-center">
            Wróć do logowania
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-4">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✓ Hasło zostało zmienione pomyślnie
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Za chwilę zostaniesz przekierowany do strony logowania...</p>
          </div>
        ) : (
          <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Wprowadź nowe hasło do swojego konta.</p>

            {/* General error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Nowe hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }
                  if (error) setError(null);
                }}
                onBlur={handlePasswordBlur}
                placeholder="••••••••"
                disabled={isLoading}
                aria-invalid={!!validationErrors.password}
                autoComplete="new-password"
              />
              {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}
              <p className="text-xs text-muted-foreground">Hasło musi mieć minimum 8 znaków</p>
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                  if (error) setError(null);
                }}
                onBlur={handleConfirmPasswordBlur}
                placeholder="••••••••"
                disabled={isLoading}
                aria-invalid={!!validationErrors.confirmPassword}
                autoComplete="new-password"
              />
              {validationErrors.confirmPassword && (
                <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </form>
        )}
      </CardContent>
      {!success && (
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            form="reset-password-form"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full"
          >
            {isLoading ? "Resetowanie..." : "Zresetuj hasło"}
          </Button>

          <a href="/login" className="text-sm text-primary hover:underline text-center">
            Wróć do logowania
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
