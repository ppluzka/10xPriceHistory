import type { APIContext } from "astro";
import { OfferProcessorService } from "../../../../lib/services/offer-processor.service";
import { OfferStatus } from "../../../../types";

/**
 * POST /api/offers/:id/recheck
 *
 * Purpose: Manually trigger a price check for a single offer
 * Used by: UI "Sprawdź ponownie" button for offers with error status
 *
 * Process:
 * 1. Verify user authorization
 * 2. Fetch offer from database
 * 3. Process offer using OfferProcessorService
 * 4. Return updated offer data
 *
 * Reference: Implementation Plan Section 8.2
 */

export const prerender = false;

export const POST = async ({ params, locals }: APIContext) => {
  try {
    const offerId = params.id;

    if (!offerId) {
      return new Response(JSON.stringify({ error: "Offer ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current user ID from middleware
    const currentUserId = locals.current_user_id as string;

    if (!currentUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch offer and verify ownership
    const { data: userOffer, error: userOfferError } = await locals.supabase
      .from("user_offer")
      .select("offer_id")
      .eq("user_id", currentUserId)
      .eq("offer_id", offerId)
      .is("deleted_at", null)
      .single();

    if (userOfferError || !userOffer) {
      return new Response(JSON.stringify({ error: "Offer not found or unauthorized" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch full offer data
    const { data: offer, error: offerError } = await locals.supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process offer
    const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY;
    const offerProcessor = new OfferProcessorService(locals.supabase, openRouterApiKey);

    // Process the offer (this will update status, price history, etc.)
    await offerProcessor.processOffer(offer);

    // Cleanup
    await offerProcessor.close();

    // Fetch updated offer data
    const { data: updatedOffer, error: fetchError } = await locals.supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (fetchError || !updatedOffer) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch updated offer data",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get latest price
    const { data: latestPrice } = await locals.supabase
      .from("price_history")
      .select("price, currency")
      .eq("offer_id", offerId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message:
          updatedOffer.status === OfferStatus.ACTIVE
            ? "Cena zaktualizowana pomyślnie"
            : updatedOffer.status === OfferStatus.ERROR
              ? "Nie udało się pobrać ceny. Spróbuj ponownie później."
              : "Oferta została usunięta z Otomoto",
        offer: {
          id: updatedOffer.id,
          status: updatedOffer.status,
          lastChecked: updatedOffer.last_checked,
          currentPrice: latestPrice?.price || 0,
          currency: latestPrice?.currency || "PLN",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in POST /api/offers/:id/recheck:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to recheck offer",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
