import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type { PreferencesDto, UpdatePreferencesResponseDto } from "../../types";

/**
 * Service for managing user preferences
 */
export class PreferencesService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get user preferences (creates default if doesn't exist)
   * @param userId - Current authenticated user ID
   * @returns User preferences
   */
  async get(userId: string): Promise<PreferencesDto> {
    // Try to fetch existing preferences
    const { data: preferences, error } = await this.supabase
      .from("user_preferences")
      .select("default_frequency")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching preferences:", error);
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    // If preferences exist, return them
    if (preferences) {
      return {
        defaultFrequency: preferences.default_frequency,
      };
    }

    // If preferences don't exist, create default preferences
    const defaultFrequency = "24h";

    const { error: insertError } = await this.supabase.from("user_preferences").insert({
      user_id: userId,
      default_frequency: defaultFrequency,
    });

    if (insertError) {
      console.error("Error creating default preferences:", insertError);
      throw new Error(`Failed to create preferences: ${insertError.message}`);
    }

    // Return default preferences
    return {
      defaultFrequency,
    };
  }

  /**
   * Update user preferences
   * @param userId - Current authenticated user ID
   * @param defaultFrequency - New default frequency value
   * @returns Success message
   */
  async update(userId: string, defaultFrequency: "6h" | "12h" | "24h" | "48h"): Promise<UpdatePreferencesResponseDto> {
    // Check if preferences exist
    const { data: existing } = await this.supabase
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing preferences
      const { error } = await this.supabase
        .from("user_preferences")
        .update({ default_frequency: defaultFrequency })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating preferences:", error);
        throw new Error(`Failed to update preferences: ${error.message}`);
      }
    } else {
      // Create new preferences (user might not have any yet)
      const { error } = await this.supabase.from("user_preferences").insert({
        user_id: userId,
        default_frequency: defaultFrequency,
      });

      if (error) {
        console.error("Error creating preferences:", error);
        throw new Error(`Failed to create preferences: ${error.message}`);
      }
    }

    return {
      message: "Preferences updated",
    };
  }
}
