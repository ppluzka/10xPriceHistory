import type { OfferDetailDto, PaginatedDto, PriceHistoryDto } from "@/types";
import { useOfferData } from "./useOfferData";
import OfferHeader from "./OfferHeader";
import OfferStats from "./OfferStats";
import PriceHistoryChart from "./PriceHistoryChart";
import PriceHistoryTable from "./PriceHistoryTable";
import { isFeatureEnabled } from "@/features/flags";

interface OfferDetailsPageProps {
  initialOffer: OfferDetailDto;
  initialHistory: PaginatedDto<PriceHistoryDto>;
}

export default function OfferDetailsPage({ initialOffer, initialHistory }: OfferDetailsPageProps) {
  // Hide component if offerdetails feature is disabled
  if (!isFeatureEnabled("offerdetails")) {
    return null;
  }

  const { offer, history, headerData, statsData, chartData, isLoading, isError } = useOfferData({
    initialOffer,
    initialHistory,
  });

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Błąd</h1>
          <p className="text-muted-foreground mb-6">Wystąpił błąd podczas ładowania danych oferty</p>
        </div>
      </div>
    );
  }

  // Loading state (will rarely be shown due to SSR)
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Offer removed/error status banner
  const showStatusBanner = offer.status === "removed" || offer.status === "error";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Status Banner */}
      {showStatusBanner && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">
            {offer.status === "removed"
              ? "⚠️ Ta oferta została usunięta z Otomoto"
              : "⚠️ Wystąpił błąd podczas ostatniego sprawdzania tej oferty"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Historia cen jest nadal dostępna, ale oferta nie będzie już aktualizowana.
          </p>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main Content Column */}
        <div className="space-y-8">
          {/* Offer Header */}
          <OfferHeader data={headerData} />

          {/* Price History Chart */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Historia cen</h2>
            <PriceHistoryChart data={chartData} />
          </section>

          {/* Price History Table */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Historia sprawdzeń</h2>
            <PriceHistoryTable history={history} />
          </section>
        </div>

        {/* Sidebar - Stats */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <OfferStats stats={statsData} />
        </aside>
      </div>
    </div>
  );
}
