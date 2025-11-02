import { useState, useCallback, useEffect } from "react";
import type { DashboardDto, OfferDto, AddOfferResponseDto } from "@/types";
import DashboardStats from "../dashboard/DashboardStats";
import OfferForm from "../dashboard/OfferForm";
import OfferGrid from "../dashboard/OfferGrid";

interface DashboardViewProps {
  initialData: DashboardDto | null;
}

const OFFER_LIMIT = 100; // Default offer limit per user

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
        throw new Error("Failed to fetch dashboard data");
      }

      const data: DashboardDto = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

        const updatedOffers = prev.offers.filter((offer) => offer.id !== offerId);

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
          throw new Error("Failed to delete offer");
        }
      } catch (err) {
        // Rollback on error
        setDashboardData(previousData);
        setError(err instanceof Error ? err.message : "Failed to delete offer");
        console.error("Error deleting offer:", err);
      }
    },
    [dashboardData]
  );

  // If initial data failed to load, show error state
  if (!dashboardData && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          <p>{error || "Failed to load dashboard data"}</p>
          <button onClick={fetchDashboardData} className="mt-4 text-primary underline">
            Retry
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
      <OfferForm onOfferAdded={handleAddOffer} />

      {/* Offers Grid */}
      <OfferGrid
        offers={dashboardData?.offers || []}
        isLoading={isLoading && !dashboardData}
        onDeleteOffer={handleDeleteOffer}
      />

      {/* Error Toast (simple implementation for now) */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white px-4 py-3 rounded-md shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
