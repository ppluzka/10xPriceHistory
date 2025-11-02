import { useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: {
    email: string;
    id: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Redirect to home page after successful logout
        window.location.href = "/";
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <a href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-gray-50">
              PriceHistory
            </a>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="/dashboard"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/settings"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 transition-colors"
              >
                Ustawienia
              </a>
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            {/* User email (hidden on mobile) */}
            <span className="hidden sm:inline-block text-sm text-gray-600 dark:text-gray-400">{user.email}</span>

            {/* Logout button */}
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
