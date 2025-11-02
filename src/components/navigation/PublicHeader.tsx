import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  currentPath?: string;
}

export default function PublicHeader({ currentPath = "/" }: PublicHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <header class="border-b bg-background">
      <nav class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          {/* Logo */}
          <a href="/" class="text-xl font-bold text-foreground hover:text-foreground/80 transition-colors">
            PriceHistory
          </a>

          {/* Desktop Navigation */}
          <div class="hidden md:flex items-center gap-4">
            <a 
              href="/login" 
              class={`text-sm font-medium transition-colors ${
                isActive('/login') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Zaloguj się
            </a>
            <Button asChild size="sm">
              <a href="/register">
                Zarejestruj się
              </a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            class="md:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div class="md:hidden pt-4 pb-2 border-t mt-3 space-y-3">
            <a 
              href="/login" 
              class={`block py-2 text-sm font-medium ${
                isActive('/login') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              Zaloguj się
            </a>
            <Button asChild size="sm" className="w-full">
              <a href="/register">
                Zarejestruj się
              </a>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}

