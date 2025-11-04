import { useState, useCallback } from "react";
import type { DashboardDto } from "@/types";
import DashboardStats from "../dashboard/DashboardStats";
import OfferForm from "../dashboard/OfferForm";
import OfferGrid from "../dashboard/OfferGrid";

interface DashboardViewProps {
  initialData: DashboardDto | null;
}

const OFFER_LIMIT = 5; // Default offer limit per user

export default function DashboardView({ initialData }: DashboardViewProps) {
  const [dashboardData, setDashboardData] = useState<DashboardDto | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Nie udało się pobrać danych dashboardu");
      }

      const data: DashboardDto = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle adding a new offer
  const handleAddOffer = useCallback(async () => {
    // Refresh dashboard data after adding new offer
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle deleting an offer
  const handleDeleteOffer = useCallback(
    async (offerId: string) => {
      if (!dashboardData) return;

      // Store the current state for rollback
      const previousData = dashboardData;

      // Optimistically update the UI
      setDashboardData((prev) => {
        if (!prev) return prev;

        const updatedOffers = prev.offers.filter((offer) => String(offer.id) !== offerId);

        return {
          ...prev,
          summary: {
            ...prev.summary,
            activeCount: Math.max(0, prev.summary.activeCount - 1),
          },
          offers: updatedOffers,
        };
      });

      try {
        const response = await fetch(`/api/offers/${offerId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Nie udało się usunąć oferty");
        }
      } catch (err) {
        // Rollback on error
        setDashboardData(previousData);
        setError(err instanceof Error ? err.message : "Nie udało się usunąć oferty");
        console.error("Error deleting offer:", err);
      }
    },
    [dashboardData]
  );

  // Handle rechecking an offer
  const handleRecheckOffer = useCallback(async (offerId: string) => {
    try {
      const response = await fetch(`/api/offers/${offerId}/recheck`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Nie udało się sprawdzić oferty ponownie");
      }

      const result = await response.json();

      // Update the offer in the state
      setDashboardData((prev) => {
        if (!prev) return prev;

        const updatedOffers = prev.offers.map((offer) => {
          if (String(offer.id) === offerId && result.offer) {
            return {
              ...offer,
              status: result.offer.status,
              lastChecked: result.offer.lastChecked,
              currentPrice: result.offer.currentPrice,
              currency: result.offer.currency,
            };
          }
          return offer;
        });

        return {
          ...prev,
          offers: updatedOffers,
        };
      });

      // Show success message briefly
      setError(result.message || "Cena zaktualizowana pomyślnie");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się sprawdzić oferty ponownie");
      console.error("Error rechecking offer:", err);
    }
  }, []);

  // If initial data failed to load, show error state
  if (!dashboardData && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          <p>{error || "Nie udało się załadować danych dashboardu"}</p>
          <button onClick={fetchDashboardData} className="mt-4 text-primary underline">
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Dashboard Statistics */}
      {dashboardData && <DashboardStats summary={dashboardData.summary} offerLimit={OFFER_LIMIT} />}

      {/* Add Offer Form */}
      <OfferForm
        onOfferAdded={handleAddOffer}
        activeCount={dashboardData?.summary.activeCount || 0}
        offerLimit={OFFER_LIMIT}
      />

      {/* Offers Grid */}
      <OfferGrid
        offers={dashboardData?.offers || []}
        isLoading={isLoading && !dashboardData}
        onDeleteOffer={handleDeleteOffer}
        onRecheckOffer={handleRecheckOffer}
      />

      {/* Error Toast (simple implementation for now) */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white px-4 py-3 rounded-md shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Zamknij
          </button>
        </div>
      )}
    </div>
  );
}
