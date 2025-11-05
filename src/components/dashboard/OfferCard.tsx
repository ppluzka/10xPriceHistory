import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { OfferDto } from "@/types";

interface OfferCardProps {
  offer: OfferDto;
  onDelete: (offerId: string) => void;
  onRecheck?: (offerId: string) => Promise<void>;
}

export default function OfferCard({ offer, onDelete, onRecheck }: OfferCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(String(offer.id));
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleRecheckClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onRecheck || isRechecking) return;

    setIsRechecking(true);
    try {
      await onRecheck(String(offer.id));
    } finally {
      setIsRechecking(false);
    }
  };

  const formatPrice = (price: number, currency: string): string => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPercentage = (value: number): string => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPriceChangeVariant = (value: number): string => {
    if (value < 0) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (value > 0) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  };

  const getStatusBadge = (status: string): { label: string; color: string; icon: string } => {
    switch (status) {
      case "active":
        return {
          label: "Aktywna",
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          icon: "✓",
        };
      case "error":
        return {
          label: "Błąd sprawdzania",
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          icon: "⚠",
        };
      case "removed":
        return {
          label: "Oferta usunięta",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
          icon: "✕",
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
          icon: "",
        };
    }
  };

  return (
    <div className="group relative" data-testid="offer-card" data-offer-id={offer.id}>
      <a
        href={`/offer/${offer.id}`}
        className="block rounded-lg border bg-card shadow-xs transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-testid="offer-card-link"
      >
        {/* Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
          {offer.imageUrl ? (
            <img
              src={offer.imageUrl}
              alt={offer.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              data-testid="offer-card-image"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(offer.status).color}`}
              data-testid="offer-card-status"
              aria-label={`Status: ${getStatusBadge(offer.status).label}`}
            >
              <span aria-hidden="true">{getStatusBadge(offer.status).icon}</span>
              {getStatusBadge(offer.status).label}
            </span>
          </div>

          {/* Delete Button */}
          <div className="absolute top-2 right-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteClick}
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Usuń ofertę"
              data-testid="offer-card-delete-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold line-clamp-2 text-sm leading-tight" data-testid="offer-card-title">
            {offer.title}
          </h3>

          {/* City */}
          {offer.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="offer-card-city">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {offer.city}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold" data-testid="offer-card-price">
              {formatPrice(offer.currentPrice, offer.currency)}
            </p>

            {offer.percentChangeFromFirst !== 0 && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPriceChangeVariant(offer.percentChangeFromFirst)}`}
                data-testid="offer-card-price-change"
              >
                {formatPercentage(offer.percentChangeFromFirst)}
              </span>
            )}
          </div>

          {/* Last Checked */}
          {offer.lastChecked && (
            <p className="text-xs text-muted-foreground" data-testid="offer-card-last-checked">
              Ostatnie sprawdzenie: {new Date(offer.lastChecked).toLocaleDateString("pl-PL")}
            </p>
          )}

          {/* Recheck Button for Error Status */}
          {offer.status === "error" && onRecheck && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecheckClick}
              disabled={isRechecking}
              className="w-full mt-2"
              data-testid="offer-card-recheck-button"
            >
              {isRechecking ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sprawdzanie...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="-ml-1 mr-2"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                  Sprawdź ponownie
                </>
              )}
            </Button>
          )}

          {/* Warning for Removed Status */}
          {offer.status === "removed" && (
            <div className="mt-2 rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-xs text-muted-foreground">
              Ta oferta została usunięta z Otomoto i nie jest już sprawdzana.
            </div>
          )}
        </div>
      </a>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Potwierdź usunięcie oferty"
          data-testid="offer-delete-modal"
        >
          <button type="button" className="fixed inset-0 -z-10" onClick={handleCancelDelete} aria-label="Zamknij" />
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm mx-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Usuń ofertę</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Czy na pewno chcesz przestać śledzić tę ofertę? Ta akcja jest nieodwracalna.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelDelete} data-testid="offer-delete-cancel-button">
                Anuluj
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} data-testid="offer-delete-confirm-button">
                Usuń
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
