import type { OfferDto } from "@/types";
import OfferCard from "./OfferCard";
import OfferGridSkeleton from "./OfferGridSkeleton";
import EmptyState from "../shared/EmptyState";

interface OfferGridProps {
  offers: OfferDto[];
  isLoading: boolean;
  onDeleteOffer: (offerId: string) => void;
  onRecheckOffer?: (offerId: string) => Promise<void>;
}

export default function OfferGrid({ offers, isLoading, onDeleteOffer, onRecheckOffer }: OfferGridProps) {
  // Show skeleton during initial load
  if (isLoading) {
    return <OfferGridSkeleton />;
  }

  // Show empty state when no offers
  if (offers.length === 0) {
    return (
      <EmptyState
        title="Brak ofert"
        description="Dodaj pierwszą ofertę z otomoto.pl, aby rozpocząć śledzenie zmian cen"
        icon="package"
      />
    );
  }

  // Show offers grid
  return (
    <div className="space-y-4" data-testid="offers-section">
      <h2 className="text-xl font-semibold">Twoje obserwowane oferty</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="offers-grid">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} onDelete={onDeleteOffer} onRecheck={onRecheckOffer} />
        ))}
      </div>
    </div>
  );
}
