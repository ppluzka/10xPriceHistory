import type { OfferStatsViewModel } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OfferStatsProps {
  stats: OfferStatsViewModel;
}

export default function OfferStats({ stats }: OfferStatsProps) {
  const { minPrice, maxPrice, avgPrice, checkCount, trend, observationDurationDays, currency } = stats;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pl-PL").format(price);
  };

  const trendEmoji = {
    wzrostowy: "📈",
    spadkowy: "📉",
    stabilny: "➡️",
  };

  const trendColor = {
    wzrostowy: "text-destructive",
    spadkowy: "text-green-600",
    stabilny: "text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Statystyki cenowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Min Price */}
        <StatItem label="Cena minimalna" value={`${formatPrice(minPrice)} ${currency}`} icon="⬇️" />

        {/* Max Price */}
        <StatItem label="Cena maksymalna" value={`${formatPrice(maxPrice)} ${currency}`} icon="⬆️" />

        <div className="pt-4 border-t">
          {/* Trend */}
          <StatItem
            label="Trend"
            value={trend.charAt(0).toUpperCase() + trend.slice(1)}
            icon={trendEmoji[trend]}
            valueClassName={trendColor[trend]}
          />

          {/* Check Count */}
          <StatItem label="Liczba sprawdzeń" value={checkCount.toString()} icon="🔍" />

          {/* Observation Duration */}
          <StatItem
            label="Okres obserwacji"
            value={`${observationDurationDays} ${getDaysLabel(observationDurationDays)}`}
            icon="📅"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual stat item component
 */
function StatItem({
  label,
  value,
  icon,
  valueClassName = "",
}: {
  label: string;
  value: string;
  icon: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="text-base">{icon}</span>
        {label}
      </span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

/**
 * Get Polish label for days count
 */
function getDaysLabel(days: number): string {
  if (days === 1) return "dzień";
  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) {
    return "dni";
  }
  return "dni";
}
