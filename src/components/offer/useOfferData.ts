import { useMemo } from "react";
import type {
  OfferDetailDto,
  PaginatedDto,
  PriceHistoryDto,
  OfferHeaderViewModel,
  OfferStatsViewModel,
  PriceHistoryChartViewModel,
} from "@/types";

interface UseOfferDataProps {
  initialOffer: OfferDetailDto;
  initialHistory: PaginatedDto<PriceHistoryDto>;
}

interface UseOfferDataReturn {
  offer: OfferDetailDto;
  history: PriceHistoryDto[];
  headerData: OfferHeaderViewModel;
  statsData: OfferStatsViewModel;
  chartData: PriceHistoryChartViewModel[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Custom hook that manages offer data and transforms DTOs to ViewModels
 */
export function useOfferData({ initialOffer, initialHistory }: UseOfferDataProps): UseOfferDataReturn {
  // For MVP, we're using initial data without refetching
  // In the future, we can add useQuery here for automatic refetching
  const offer = initialOffer;
  const history = initialHistory.data;

  // Transform offer to header view model
  const headerData = useMemo<OfferHeaderViewModel>(
    () => ({
      title: offer.title,
      imageUrl: offer.imageUrl,
      url: offer.url,
      city: offer.city,
      percentChangeFromFirst: offer.percentChangeFromFirst,
      percentChangeFromPrevious: offer.percentChangeFromPrevious,
    }),
    [offer]
  );

  // Calculate stats and transform to view model
  const statsData = useMemo<OfferStatsViewModel>(() => {
    const currency = history.length > 0 ? history[0].currency : "PLN";

    // Calculate observation duration
    const observationDurationDays = calculateObservationDuration(offer.createdAt, offer.lastChecked);

    // Determine trend based on percentage change
    const trend = determineTrend(offer.percentChangeFromFirst);

    return {
      minPrice: offer.stats.min,
      maxPrice: offer.stats.max,
      avgPrice: Math.round(offer.stats.avg),
      checkCount: history.length,
      trend,
      observationDurationDays,
      currency,
    };
  }, [offer, history]);

  // Transform price history to chart view model
  const chartData = useMemo<PriceHistoryChartViewModel[]>(() => {
    return history.map((entry) => {
      const date = new Date(entry.checkedAt);
      return {
        date: formatDateShort(date),
        fullDate: formatDateFull(date),
        price: entry.price,
        currency: entry.currency,
      };
    });
  }, [history]);

  return {
    offer,
    history,
    headerData,
    statsData,
    chartData,
    isLoading: false,
    isError: false,
  };
}

/**
 * Calculate observation duration in days
 */
function calculateObservationDuration(createdAt: string, lastChecked: string | null): number {
  const start = new Date(createdAt);
  const end = lastChecked ? new Date(lastChecked) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Determine price trend based on percentage change
 */
function determineTrend(percentChange: number): "wzrostowy" | "spadkowy" | "stabilny" {
  if (percentChange < -2) {
    return "spadkowy";
  }
  if (percentChange > 2) {
    return "wzrostowy";
  }
  return "stabilny";
}

/**
 * Format date for chart axis (DD.MM)
 */
function formatDateShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/**
 * Format date for tooltip (DD.MM.YYYY HH:mm)
 */
function formatDateFull(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
