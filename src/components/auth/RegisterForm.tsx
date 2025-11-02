import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

interface RegisterFormProps {
  showLoginLink?: boolean;
}

export default function RegisterForm({ showLoginLink = true }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  // Validate email format
  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationErrors((prev) => ({ ...prev, email: "Email jest wymagany" }));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        email: "Wprowadź prawidłowy adres email",
      }));
      return false;
    }

    if (value.length > 255) {
      setValidationErrors((prev) => ({ ...prev, email: "Email jest za długi" }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  }, []);

  // Calculate password strength
  const calculatePasswordStrength = useCallback((value: string): void => {
    if (!value) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    if (value.length >= 8) strength++;
    if (value.length >= 12) strength++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[^a-zA-Z0-9]/.test(value)) strength++;

    if (strength <= 2) setPasswordStrength("weak");
    else if (strength <= 3) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  }, []);

  // Validate password
  const validatePassword = useCallback((value: string): boolean => {
    if (!value) {
      setValidationErrors((prev) => ({
        ...prev,
        password: "Hasło jest wymagane",
      }));
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

  // Validate confirm password
  const validateConfirmPassword = useCallback((value: string, passwordValue: string): boolean => {
    if (!value) {
      setValidationErrors((prev) => ({
        ...prev,
        confirmPassword: "Potwierdź hasło",
      }));
      return false;
    }

    if (value !== passwordValue) {
      setValidationErrors((prev) => ({
        ...prev,
        confirmPassword: "Hasła nie są identyczne",
      }));
      return false;
    }

    setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
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
      const isConfirmValid = validateConfirmPassword(confirmPassword, password);

      if (!isEmailValid || !isPasswordValid || !isConfirmValid) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            // captchaToken will be added when we implement captcha
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Handle specific error codes
          switch (response.status) {
            case 409:
              setError("Email jest już zarejestrowany");
              break;
            case 429:
              setError("Zbyt wiele prób rejestracji, spróbuj za chwilę");
              break;
            case 400:
              setError(data.error || "Nieprawidłowe dane");
              break;
            default:
              setError(data.error || "Wystąpił błąd, spróbuj ponownie");
          }
          return;
        }

        // Redirect to verify-email page on success
        window.location.href = `/verify-email?email=${encodeURIComponent(email.trim())}`;
      } catch (err) {
        console.error("Registration error:", err);
        setError("Wystąpił błąd połączenia, spróbuj ponownie");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, confirmPassword, validateEmail, validatePassword, validateConfirmPassword]
  );

  // Handle email blur
  const handleEmailBlur = useCallback(() => {
    if (email) {
      validateEmail(email);
    }
  }, [email, validateEmail]);

  // Handle password change
  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      calculatePasswordStrength(value);
      if (validationErrors.password) {
        setValidationErrors((prev) => ({ ...prev, password: undefined }));
      }
      // Re-validate confirm password if it's filled
      if (confirmPassword) {
        validateConfirmPassword(confirmPassword, value);
      }
      if (error) setError(null);
    },
    [confirmPassword, error, validationErrors.password, calculatePasswordStrength, validateConfirmPassword]
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
      validateConfirmPassword(confirmPassword, password);
    }
  }, [confirmPassword, password, validateConfirmPassword]);

  // Get password strength color
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-200";
    }
  };

  // Get password strength text
  const getStrengthText = () => {
    switch (passwordStrength) {
      case "weak":
        return "Słabe";
      case "medium":
        return "Średnie";
      case "strong":
        return "Silne";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Zarejestruj się</CardTitle>
        <CardDescription>Utwórz konto aby śledzić historię cen ofert z Otomoto.pl</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
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
            />
            {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={handlePasswordBlur}
              placeholder="••••••••"
              disabled={isLoading}
              aria-invalid={!!validationErrors.password}
              autoComplete="new-password"
            />
            {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}

            {/* Password strength indicator */}
            {password && passwordStrength && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{
                        width: passwordStrength === "weak" ? "33%" : passwordStrength === "medium" ? "66%" : "100%",
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{getStrengthText()}</span>
                </div>
                {passwordStrength === "weak" && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    💡 Podpowiedź: Użyj cyfr i wielkich liter dla lepszego bezpieczeństwa
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationErrors.confirmPassword) {
                  setValidationErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
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

          {/* Terms and conditions info */}
          <p className="text-xs text-muted-foreground">
            Rejestrując się akceptujesz naszą{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Politykę Prywatności
            </a>{" "}
            i{" "}
            <a href="/terms" className="text-primary hover:underline">
              Regulamin
            </a>
          </p>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          form="register-form"
          disabled={isLoading || !email.trim() || !password || !confirmPassword}
          className="w-full"
        >
          {isLoading ? "Rejestracja..." : "Zarejestruj się"}
        </Button>

        {showLoginLink && (
          <p className="text-sm text-center text-muted-foreground">
            Masz już konto?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Zaloguj się
            </a>
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
