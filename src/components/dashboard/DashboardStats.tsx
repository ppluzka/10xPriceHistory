import type { DashboardSummaryDto } from "@/types";

interface DashboardStatsProps {
  summary: DashboardSummaryDto;
  offerLimit: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  variant?: "default" | "positive" | "negative";
}

function StatCard({ label, value, description, variant = "default" }: StatCardProps) {
  const variantClasses = {
    default: "text-foreground",
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
  };

  const testId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="rounded-lg border bg-card p-6 shadow-xs" data-testid={`stat-card-${testId}`}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold ${variantClasses[variant]}`} data-testid={`stat-value-${testId}`}>
          {value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardStats({ summary, offerLimit }: DashboardStatsProps) {
  const formatPercentage = (value: number): string => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getVariant = (value: number): "positive" | "negative" | "default" => {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "default";
  };

  return (
    <div className="space-y-4" data-testid="dashboard-stats">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your watched offers and price changes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Offers"
          value={summary.activeCount}
          description={`${offerLimit - summary.activeCount} slots remaining`}
        />
        
        <StatCard
          label="Average Change"
          value={formatPercentage(summary.avgChange)}
          variant={getVariant(summary.avgChange)}
          description="From first price"
        />
        
        <StatCard
          label="Largest Drop"
          value={formatPercentage(summary.largestDrop)}
          variant={summary.largestDrop < 0 ? "negative" : "default"}
          description="Best discount found"
        />
        
        <StatCard
          label="Largest Rise"
          value={formatPercentage(summary.largestRise)}
          variant={summary.largestRise > 0 ? "positive" : "default"}
          description="Highest increase"
        />
      </div>
    </div>
  );
}

