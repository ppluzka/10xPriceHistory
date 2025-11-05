import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PreferencesDto, UpdatePreferencesCommand } from "@/types";

interface FrequencySettingsFormProps {
  initialPreferences: PreferencesDto;
  onSubmit: (data: UpdatePreferencesCommand) => Promise<void>;
}

// Schema walidacji
const frequencySchema = z.object({
  defaultFrequency: z.enum(["6h", "12h", "24h", "48h"]),
});

type FrequencyFormData = z.infer<typeof frequencySchema>;

const FREQUENCY_OPTIONS = [
  { value: "6h", label: "Co 6 godzin" },
  { value: "12h", label: "Co 12 godzin" },
  { value: "24h", label: "Co 24 godziny" },
  { value: "48h", label: "Co 48 godzin" },
] as const;

export default function FrequencySettingsForm({ initialPreferences, onSubmit }: FrequencySettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(initialPreferences.defaultFrequency);

  const { handleSubmit } = useForm<FrequencyFormData>({
    resolver: zodResolver(frequencySchema),
    defaultValues: {
      defaultFrequency: initialPreferences.defaultFrequency,
    },
  });

  const handleFormSubmit = async () => {
    setIsSubmitting(true);

    try {
      await onSubmit({ defaultFrequency: selectedFrequency });
      toast.success("Preferencje zostały zaktualizowane");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zaktualizować preferencji");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanged = selectedFrequency !== initialPreferences.defaultFrequency;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Częstotliwość sprawdzania</CardTitle>
        <CardDescription>Ustaw domyślną częstotliwość sprawdzania cen dla nowych ofert</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="frequency-form" onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frequency-select">Częstotliwość</Label>
              <Select
                value={selectedFrequency}
                onValueChange={(value) => setSelectedFrequency(value as "6h" | "12h" | "24h" | "48h")}
                disabled={isSubmitting}
              >
                <SelectTrigger id="frequency-select" className="w-full">
                  <SelectValue placeholder="Wybierz częstotliwość" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Zmiany dotyczą tylko nowo dodawanych ofert</p>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="frequency-form" disabled={!hasChanged || isSubmitting}>
          {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </CardFooter>
    </Card>
  );
}
