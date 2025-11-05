import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OfferService } from "../offer.service";

/**
 * Simplified tests for OfferService focusing on core business logic
 * Full integration tests should be done with real Supabase test instance
 */

describe("OfferService - Core Logic", () => {
  let offerService: OfferService;
  let mockSupabase: any;
  let currentQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a more realistic mock that tracks query state
    currentQuery = {
      table: null,
      selections: null,
      filters: [],
      sorts: [],
      range: null,
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        currentQuery.table = table;
        return mockSupabase;
      }),
      select: vi.fn((cols: string) => {
        currentQuery.selections = cols;
        return mockSupabase;
      }),
      insert: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      delete: vi.fn(() => mockSupabase),
      eq: vi.fn((col: string, val: any) => {
        currentQuery.filters.push({ type: "eq", col, val });
        return mockSupabase;
      }),
      is: vi.fn((col: string, val: any) => {
        currentQuery.filters.push({ type: "is", col, val });
        return mockSupabase;
      }),
      order: vi.fn((col: string, opts: any) => {
        currentQuery.sorts.push({ col, ...opts });
        return mockSupabase;
      }),
      range: vi.fn((from: number, to: number) => {
        currentQuery.range = { from, to };
        return mockSupabase;
      }),
      limit: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(),
    };

    offerService = new OfferService(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("list() - Basic Behavior", () => {
    it("should return empty result when no offers found", async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      const result = await offerService.list("user-123", 1, 10, "created_at");

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
    });

    it("should calculate pagination range correctly", async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await offerService.list("user-123", 3, 20, "created_at");

      expect(mockSupabase.range).toHaveBeenCalledWith(40, 59);
    });

    it("should filter by user_id and deleted_at", async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await offerService.list("user-123", 1, 10, "created_at");

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_offer.user_id", "user-123");
      expect(mockSupabase.is).toHaveBeenCalledWith("user_offer.deleted_at", null);
    });

    it("should sort by created_at descending", async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await offerService.list("user-123", 1, 10, "created_at");

      expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should throw error on database failure", async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
        count: null,
      });

      await expect(offerService.list("user-123", 1, 10, "created_at")).rejects.toThrow(
        "Failed to fetch offers: Database error"
      );
    });
  });

  describe("getById() - Basic Behavior", () => {
    it("should return null for non-existent offer", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await offerService.getById("user-123", 999);

      expect(result).toBeNull();
    });

    it("should return null when user not authorized", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await offerService.getById("user-123", 1);

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      await expect(offerService.getById("user-123", 1)).rejects.toThrow("Failed to fetch offer: Database error");
    });

    it("should filter by user_id and deleted_at for authorization", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await offerService.getById("user-123", 1);

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_offer.user_id", "user-123");
      expect(mockSupabase.is).toHaveBeenCalledWith("user_offer.deleted_at", null);
    });
  });

  describe("unsubscribe() - Basic Behavior", () => {
    beforeEach(() => {
      // Default mock for auth.getUser() - successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
    });

    it("should return false when subscription doesn't exist", async () => {
      // RPC returns false when subscription not found
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await offerService.unsubscribe("user-123", 1);

      expect(result).toBe(false);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("soft_delete_user_offer", {
        p_offer_id: 1,
      });
    });

    it("should return false when subscription already deleted", async () => {
      // RPC returns false when subscription already deleted
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await offerService.unsubscribe("user-123", 1);

      expect(result).toBe(false);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("soft_delete_user_offer", {
        p_offer_id: 1,
      });
    });

    it("should throw error on select failure", async () => {
      // RPC returns error
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      await expect(offerService.unsubscribe("user-123", 1)).rejects.toThrow("Failed to unsubscribe: Database error");
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("soft_delete_user_offer", {
        p_offer_id: 1,
      });
    });
  });

  describe("getHistory() - Basic Behavior", () => {
    it("should return null when user not authorized", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await offerService.getHistory("user-123", 1, 1, 10);

      expect(result).toBeNull();
    });

    it("should return null when subscription is deleted", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { deleted_at: "2025-01-01T00:00:00Z" },
        error: null,
      });

      const result = await offerService.getHistory("user-123", 1, 1, 10);

      expect(result).toBeNull();
    });

    it("should throw error on auth check failure", async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Auth error" },
      });

      await expect(offerService.getHistory("user-123", 1, 1, 10)).rejects.toThrow(
        "Failed to check subscription: Auth error"
      );
    });
  });
});
