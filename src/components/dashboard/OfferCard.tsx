import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { OfferDto } from "@/types";

interface OfferCardProps {
  offer: OfferDto;
  onDelete: (offerId: string) => void;
}

export default function OfferCard({ offer, onDelete }: OfferCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(offer.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
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

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
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
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(offer.status)}`} data-testid="offer-card-status">
              {offer.status}
            </span>
          </div>

          {/* Delete Button */}
          <div className="absolute top-2 right-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteClick}
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete offer"
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
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPriceChangeVariant(offer.percentChangeFromFirst)}`} data-testid="offer-card-price-change">
                {formatPercentage(offer.percentChangeFromFirst)}
              </span>
            )}
          </div>

          {/* Last Checked */}
          {offer.lastChecked && (
            <p className="text-xs text-muted-foreground" data-testid="offer-card-last-checked">
              Last checked: {new Date(offer.lastChecked).toLocaleDateString("pl-PL")}
            </p>
          )}
        </div>
      </a>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCancelDelete}
          data-testid="offer-delete-modal"
        >
          <div
            className="bg-card rounded-lg shadow-lg p-6 max-w-sm mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold">Delete Offer</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Are you sure you want to stop tracking this offer? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                data-testid="offer-delete-cancel-button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                data-testid="offer-delete-confirm-button"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

