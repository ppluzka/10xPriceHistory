import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Universal fetch wrapper that ensures credentials are included
 * for both HTTP and HTTPS environments (works with nginx redirects)
 *
 * This is essential when nginx redirects HTTP to HTTPS, as cookies
 * need to be included in the redirected request to avoid 401 errors.
 *
 * @param url - Request URL (relative or absolute)
 * @param options - Fetch options (credentials will be merged in)
 * @returns Promise resolving to Response
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include", // Always include cookies for auth
  });
}
