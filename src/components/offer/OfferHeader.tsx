import type { OfferHeaderViewModel } from "@/types";
import { Badge } from "@/components/ui/badge";

interface OfferHeaderProps {
  data: OfferHeaderViewModel;
}

export default function OfferHeader({ data }: OfferHeaderProps) {
  const { title, imageUrl, url, city, percentChangeFromFirst, percentChangeFromPrevious } = data;

  return (
    <header className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image */}
        {imageUrl && (
          <div className="flex-shrink-0">
            <img src={imageUrl} alt={title} className="w-full md:w-64 h-48 object-cover rounded-lg" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 break-words">{title}</h1>

          {/* City */}
          {city && (
            <p className="text-muted-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {city}
            </p>
          )}

          {/* Price Change Badges */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Zmiana od początku</p>
              <PriceChangeBadge percentChange={percentChangeFromFirst} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ostatnia zmiana</p>
              <PriceChangeBadge percentChange={percentChangeFromPrevious} />
            </div>
          </div>

          {/* Link to Otomoto */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            Zobacz na Otomoto
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Component to display price change as a colored badge
 */
function PriceChangeBadge({ percentChange }: { percentChange: number }) {
  const isNegative = percentChange < 0;
  const isZero = percentChange === 0;

  const variant = isZero ? "secondary" : isNegative ? "default" : "destructive";
  const icon = isZero ? "=" : isNegative ? "↓" : "↑";
  const formattedPercent = Math.abs(percentChange).toFixed(2);

  return (
    <Badge variant={variant} className="text-sm">
      {icon} {formattedPercent}%
    </Badge>
  );
}
