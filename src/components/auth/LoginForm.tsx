import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { apiFetch } from "@/lib/utils";

interface LoginFormProps {
  redirectTo?: string;
  showRegisterLink?: boolean;
}

export default function LoginForm({ redirectTo = "/dashboard", showRegisterLink = true }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Validate email format
  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationErrors((prev) => ({ ...prev, email: "Email jest wymagany" }));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setValidationErrors((prev) => ({ ...prev, email: "Wprowadź prawidłowy adres email" }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  }, []);

  // Validate password
  const validatePassword = useCallback((value: string): boolean => {
    if (!value) {
      setValidationErrors((prev) => ({ ...prev, password: "Hasło jest wymagane" }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      // Validate all fields
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);

      if (!isEmailValid || !isPasswordValid) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Handle specific error codes
          switch (response.status) {
            case 401:
              setError("Nieprawidłowy email lub hasło");
              break;
            case 403:
              if (data.code === "EMAIL_NOT_VERIFIED") {
                setError("Potwierdź email przed logowaniem");
              } else {
                setError("Brak dostępu");
              }
              break;
            case 429:
              setError("Zbyt wiele prób logowania, spróbuj za chwilę");
              break;
            default:
              setError(data.error || "Wystąpił błąd, spróbuj ponownie");
          }
          return;
        }

        // Redirect on success
        window.location.href = redirectTo;
      } catch (err) {
        console.error("Login error:", err);
        setError("Wystąpił błąd połączenia, spróbuj ponownie");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, redirectTo, validateEmail, validatePassword]
  );

  // Handle email blur
  const handleEmailBlur = useCallback(() => {
    if (email) {
      validateEmail(email);
    }
  }, [email, validateEmail]);

  // Handle password blur
  const handlePasswordBlur = useCallback(() => {
    if (password) {
      validatePassword(password);
    }
  }, [password, validatePassword]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Zaloguj się</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          {/* General error message */}
          {error && (
            <div
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3"
              role="alert"
              data-testid="login-error-message"
            >
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
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: undefined }));
                }
                if (error) setError(null);
              }}
              onBlur={handleEmailBlur}
              placeholder="twoj@email.com"
              disabled={isLoading}
              aria-invalid={!!validationErrors.email}
              autoComplete="email"
              data-testid="login-email-input"
            />
            {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Hasło</Label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">
                Zapomniałeś hasła?
              </a>
            </div>
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
              autoComplete="current-password"
              data-testid="login-password-input"
            />
            {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          form="login-form"
          disabled={isLoading || !email.trim() || !password}
          className="w-full"
          data-testid="login-submit-button"
        >
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </Button>

        {showRegisterLink && (
          <p className="text-sm text-center text-muted-foreground">
            Nie masz konta?{" "}
            <a href="/register" className="text-primary hover:underline font-medium">
              Zarejestruj się
            </a>
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
