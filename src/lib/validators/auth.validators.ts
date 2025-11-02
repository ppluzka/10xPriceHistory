import { z } from "zod";

/**
 * Validation schema for user login
 * Used in /api/auth/login endpoint
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Wprowadź prawidłowy adres email")
    .max(255, "Email jest za długi"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

/**
 * Validation schema for user registration
 * Used in /api/auth/register endpoint
 */
export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Wprowadź prawidłowy adres email")
    .max(255, "Email jest za długi"),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  captchaToken: z.string().min(1, "Captcha jest wymagana"),
});

/**
 * Validation schema for password change
 * Used in /api/auth/change-password endpoint
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktualne hasło jest wymagane"),
  newPassword: z.string().min(8, "Nowe hasło musi mieć minimum 8 znaków"),
});

/**
 * Validation schema for resending verification email
 * Used in /api/auth/resend-verification endpoint
 */
export const ResendVerificationSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Wprowadź prawidłowy adres email"),
});

/**
 * Validation schema for account deletion confirmation
 * Used in /api/auth/delete-account endpoint
 */
export const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ", {
    errorMap: () => ({ message: 'Wpisz "USUŃ" aby potwierdzić' }),
  }),
});

// Export TypeScript types inferred from schemas
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
