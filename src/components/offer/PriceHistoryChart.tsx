import type { PriceHistoryChartViewModel } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isFeatureEnabled } from "@/features/flags";

interface PriceHistoryChartProps {
  data: PriceHistoryChartViewModel[];
}

export default function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  // Hide component if offerdetails feature is disabled
  if (!isFeatureEnabled("offerdetails")) {
    return null;
  }

  // Check if we have enough data to display a chart
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wykres historii cen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="font-medium">Za mało danych do wygenerowania wykresu</p>
              <p className="text-sm mt-1">Wykres zostanie wyświetlony po zebraniu co najmniej 2 punktów danych</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate price range for Y axis
  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Handle case when all prices are the same
  const padding = priceRange === 0 ? minPrice * 0.05 : priceRange * 0.1;
  const yAxisMin = Math.max(0, Math.floor(minPrice - padding));
  const yAxisMax = Math.ceil(maxPrice + padding);

  // Get currency from first data point
  const currency = data.length > 0 ? data[0].currency : "PLN";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wykres historii cen</CardTitle>
        <CardDescription>Zmiana ceny w czasie (najedź na punkt, aby zobaczyć szczegóły)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />

              <YAxis
                domain={[yAxisMin, yAxisMax]}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pl-PL", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(value)
                }
              />

              <Tooltip
                content={<CustomTooltip currency={currency} />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              />

              <Line
                type="linear"
                dataKey="price"
                stroke="var(--color-primary)"
                strokeWidth={1}
                dot={{ fill: "var(--color-primary)", r: 5 }}
                activeDot={{ r: 7, fill: "var(--color-primary)" }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip component for the chart
 */
function CustomTooltip({ active, payload, currency }: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as PriceHistoryChartViewModel;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium mb-1">{data.fullDate}</p>
      <p className="text-lg font-bold text-primary">
        {new Intl.NumberFormat("pl-PL").format(data.price)} {currency}
      </p>
    </div>
  );
}
