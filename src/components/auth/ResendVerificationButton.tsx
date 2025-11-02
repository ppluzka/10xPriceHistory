import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ResendVerificationButtonProps {
  email: string;
}

export default function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle resend
  const handleResend = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle errors
        if (response.status === 429) {
          setMessage({
            type: "error",
            text: "Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie",
          });
          // Set cooldown for 60 seconds
          setCooldownSeconds(60);
        } else {
          setMessage({
            type: "error",
            text: data.error || "Wystąpił błąd. Spróbuj ponownie",
          });
        }
        return;
      }

      // Success
      setMessage({
        type: "success",
        text: "✓ Email weryfikacyjny został wysłany ponownie",
      });

      // Set cooldown for 60 seconds
      setCooldownSeconds(60);
    } catch (err) {
      console.error("Resend error:", err);
      setMessage({
        type: "error",
        text: "Wystąpił błąd połączenia",
      });
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  // Countdown effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  return (
    <div className="space-y-3">
      {/* Message */}
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-900"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Button */}
      <Button onClick={handleResend} disabled={isLoading || cooldownSeconds > 0} variant="outline" className="w-full">
        {isLoading
          ? "Wysyłanie..."
          : cooldownSeconds > 0
            ? `Wyślij ponownie (${cooldownSeconds}s)`
            : "Wyślij link ponownie"}
      </Button>
    </div>
  );
}
