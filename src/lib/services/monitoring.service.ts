import type { SupabaseClient } from "../../db/supabase.client";
import type { SystemHealth } from "../../types";

/**
 * MonitoringService - Tracks system health and sends alerts
 *
 * Responsibilities:
 * - Track success rate for last 24h
 * - Calculate error rate
 * - Send alerts when error rate >15%
 * - Log metrics to system_logs
 * - Rate limiting for alerts (max 1 alert/6h)
 *
 * Reference: Implementation Plan Section 3.5
 */
export class MonitoringService {
  private supabase: SupabaseClient;
  private readonly ERROR_THRESHOLD = 0.15; // 15%
  private readonly ALERT_COOLDOWN_HOURS = 6;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Tracks a price check result (success or failure)
   * @param offerId - The offer ID that was checked
   * @param success - Whether the check was successful
   */
  async trackCheckResult(offerId: number, success: boolean): Promise<void> {
    await this.supabase.from("system_logs").insert({
      offer_id: offerId,
      event_type: success ? "price_check_success" : "price_check_failed",
      message: success ? "Price successfully checked" : "Price check failed",
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Calculates success rate for given period
   * @param periodHours - Number of hours to look back
   * @returns Promise resolving to success rate percentage (0-100)
   */
  async calculateSuccessRate(periodHours: number): Promise<number> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - periodHours);

    const { data: logs, error } = await this.supabase
      .from("system_logs")
      .select("event_type")
      .gte("created_at", startTime.toISOString())
      .in("event_type", ["price_check_success", "price_check_failed"]);

    if (error || !logs || logs.length === 0) {
      return 100; // No data = assume healthy
    }

    const successCount = logs.filter((log) => log.event_type === "price_check_success").length;

    const totalCount = logs.length;

    return (successCount / totalCount) * 100;
  }

  /**
   * Gets current system health metrics
   * @returns Promise resolving to SystemHealth
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const successRate = await this.calculateSuccessRate(24);

    const { data: logs } = await this.supabase
      .from("system_logs")
      .select("event_type")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const totalChecks = logs?.length || 0;
    const errorCount = logs?.filter((log) => log.event_type === "price_check_failed").length || 0;

    const { count: activeOffers } = await this.supabase
      .from("offers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { data: lastAlert } = await this.supabase
      .from("system_logs")
      .select("created_at")
      .eq("event_type", "alert_sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return {
      successRate,
      totalChecks,
      errorCount,
      activeOffers: activeOffers || 0,
      lastAlertSent: lastAlert ? new Date(lastAlert.created_at) : null,
    };
  }

  /**
   * Checks system health and sends alert if needed
   */
  async checkAndSendAlert(): Promise<void> {
    const health = await this.getSystemHealth();
    const errorRate = 100 - health.successRate;

    // Check if error rate exceeds threshold
    if (errorRate <= this.ERROR_THRESHOLD * 100) {
      return; // System healthy
    }

    // Check cooldown period
    if (health.lastAlertSent) {
      const hoursSinceLastAlert = (Date.now() - health.lastAlertSent.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAlert < this.ALERT_COOLDOWN_HOURS) {
        return; // Still in cooldown
      }
    }

    // Send alert
    await this.sendAlert(health);

    // Log alert sent
    await this.supabase.from("system_logs").insert({
      event_type: "alert_sent",
      message: `High error rate detected: ${errorRate.toFixed(2)}%`,
      metadata: {
        health,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Sends alert via configured channel (webhook)
   * @param health - Current system health metrics
   * @private
   */
  private async sendAlert(health: SystemHealth): Promise<void> {
    const alertMessage = {
      title: "🚨 High Error Rate Alert",
      timestamp: new Date().toISOString(),
      successRate: `${health.successRate.toFixed(2)}%`,
      errorRate: `${(100 - health.successRate).toFixed(2)}%`,
      totalChecks: health.totalChecks,
      errorCount: health.errorCount,
      activeOffers: health.activeOffers,
    };

    // Send webhook alert
    await this.sendWebhookAlert(alertMessage);
  }

  /**
   * Sends alert to webhook URL
   * @param message - Alert message payload
   * @private
   */
  private async sendWebhookAlert(message: Record<string, unknown>): Promise<void> {
    const webhookUrl = import.meta.env.ALERT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("No webhook URL configured for alerts");
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error("Failed to send webhook alert:", error);
    }
  }
}
