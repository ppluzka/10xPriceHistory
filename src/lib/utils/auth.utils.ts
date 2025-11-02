import type { AstroGlobal } from 'astro';

/**
 * Sprawdza czy użytkownik jest zalogowany, jeśli nie - przekierowuje do /login
 * Do użycia w .astro pages
 * 
 * @example
 * ```astro
 * ---
 * import { requireAuth } from '@/lib/utils/auth.utils';
 * const redirect = requireAuth(Astro);
 * if (redirect) return redirect;
 * const user = Astro.locals.user!;
 * ---
 * ```
 */
export function requireAuth(Astro: AstroGlobal) {
  // Note: This will work after middleware implementation
  // For now, it's a placeholder
  if (!Astro.locals.user) {
    const returnUrl = encodeURIComponent(
      Astro.url.pathname + Astro.url.search
    );
    return Astro.redirect(`/login?returnUrl=${returnUrl}`);
  }
  return null; // Continue rendering
}

/**
 * Sprawdza czy użytkownik jest już zalogowany, jeśli tak - przekierowuje do /dashboard
 * Do użycia na stronach /login, /register
 * 
 * @example
 * ```astro
 * ---
 * import { requireGuest } from '@/lib/utils/auth.utils';
 * const redirect = requireGuest(Astro);
 * if (redirect) return redirect;
 * ---
 * ```
 */
export function requireGuest(Astro: AstroGlobal) {
  // Note: This will work after middleware implementation
  if (Astro.locals.user) {
    return Astro.redirect('/dashboard');
  }
  return null;
}

/**
 * Pobiera return URL z query params lub default
 * 
 * @param Astro - Astro global object
 * @param defaultUrl - Default URL to return if none specified
 * @returns Decoded return URL or default
 * 
 * @example
 * ```astro
 * ---
 * const returnUrl = getReturnUrl(Astro, '/dashboard');
 * ---
 * ```
 */
export function getReturnUrl(Astro: AstroGlobal, defaultUrl = '/dashboard'): string {
  const returnUrl = Astro.url.searchParams.get('returnUrl');
  return returnUrl ? decodeURIComponent(returnUrl) : defaultUrl;
}

/**
 * Validate email format
 * 
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * 
 * @param password - Password to validate
 * @returns Object with isValid flag and optional error message
 */
export function validatePassword(password: string): { 
  isValid: boolean; 
  error?: string;
} {
  if (password.length < 8) {
    return {
      isValid: false,
      error: "Hasło musi mieć minimum 8 znaków"
    };
  }

  return { isValid: true };
}

/**
 * Get client IP address from request
 * Handles proxy headers like X-Forwarded-For and X-Real-IP
 * 
 * @param request - Astro request object
 * @returns Client IP address
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback - this might be the proxy IP in production
  return 'unknown';
}

