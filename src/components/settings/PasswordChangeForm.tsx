import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PasswordChangeViewModel } from "@/types";

interface PasswordChangeFormProps {
  onSubmit: (data: PasswordChangeViewModel) => Promise<void>;
}

// Schema walidacji
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktualne hasło jest wymagane"),
    newPassword: z
      .string()
      .min(8, "Nowe hasło musi mieć co najmniej 8 znaków"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function PasswordChangeForm({
  onSubmit,
}: PasswordChangeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleFormSubmit = async (data: PasswordChangeFormData) => {
    setIsSubmitting(true);

    try {
      await onSubmit({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      toast.success("Hasło zostało zmienione");
      reset(); // Wyczyść formularz po sukcesie
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nie udało się zmienić hasła"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zmiana hasła</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="password-change-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
        >
          {/* Aktualne hasło */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Aktualne hasło</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              disabled={isSubmitting}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* Nowe hasło */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              disabled={isSubmitting}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Potwierdzenie nowego hasła */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="password-change-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Zmiana hasła..." : "Zmień hasło"}
        </Button>
      </CardFooter>
    </Card>
  );
}

