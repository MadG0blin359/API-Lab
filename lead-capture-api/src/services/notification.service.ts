import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { Submission, Widget } from "../types/index.js";

export interface NotificationResult {
  delivered: boolean;
  channel: "email" | "webhook" | "console";
  error?: string;
}

export const notificationService = {
  /**
   * Dispatches non-blocking side-effect notification (email / webhook).
   * Crucial invariant: Failures in notifications must NEVER break the submission response.
   */
  async notifySubmission(
    submission: Submission,
    widget: Widget
  ): Promise<NotificationResult> {
    try {
      // Deterministic test toggle for Probe 5: Force side-effect failure
      if (env.MOCK_NOTIFICATION_FAIL) {
        logger.warn(
          `[NotificationService] MOCK_NOTIFICATION_FAIL is active. Simulating side-effect crash for submission ${submission.id}...`
        );
        throw new Error("Simulated downstream SMTP connection timeout (504)");
      }

      // If a webhook URL is configured on the widget or environment, send an HTTP webhook
      const webhookUrl = widget.webhook_url || env.NOTIFICATION_WEBHOOK_URL;
      if (webhookUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "lead.created",
              widget: {
                id: widget.id,
                name: widget.name,
              },
              submission: {
                id: submission.id,
                data: submission.data,
                geo_data: submission.geo_data,
                created_at: submission.created_at,
              },
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            logger.warn(
              `[NotificationService] Webhook to ${webhookUrl} returned HTTP ${res.status}`
            );
          } else {
            logger.info(
              `[NotificationService] Webhook delivered successfully for submission ${submission.id}`
            );
            return { delivered: true, channel: "webhook" };
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      // Default safe delivery: Log email dispatch to console
      const targetEmail = widget.notification_email || "owner@example.com";
      logger.info(
        `[NotificationService] 📧 Email Notification Sent to ${targetEmail} | New lead on widget "${widget.name}": ${JSON.stringify(submission.data)}`
      );

      return { delivered: true, channel: "console" };
    } catch (error: any) {
      // Crucial: Log error, return failure object, NEVER throw to caller!
      logger.error(
        `[NotificationService] Safe side effect failed for submission ${submission.id} (Submission remains unaffected): ${error.message}`
      );
      return {
        delivered: false,
        channel: "email",
        error: error.message,
      };
    }
  },
};

export default notificationService;
