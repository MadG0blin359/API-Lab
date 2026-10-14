import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { geoService } from "./geo.service.js";
import { notificationService } from "./notification.service.js";
import { PublicSubmissionInput, SubmissionQueryInput } from "../validators/submission.validator.js";
import { Submission, Widget } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const submissionService = {
  /**
   * Hardened Public Submission Processing Pipeline:
   * 1. Validate Widget existence & status
   * 2. Honeypot check (Abuse detection)
   * 3. IP Geolocation Enrichment (Fallback chain)
   * 4. Persistence in Database
   * 5. Safe decoupled side effect (email/webhook)
   */
  async processSubmission(
    input: PublicSubmissionInput,
    ip: string,
    meta: { userAgent?: string; origin?: string; referer?: string }
  ): Promise<{ submission: Submission; enriched: boolean }> {
    // 1. Retrieve the target widget
    const { data: widgetData, error: widgetError } = await supabaseAdmin
      .from("widgets")
      .select("*")
      .eq("id", input.widget_id)
      .single();

    if (widgetError || !widgetData) {
      throw new AppError(404, `Widget with ID ${input.widget_id} does not exist or has been deleted.`);
    }

    const widget = widgetData as Widget;

    if (!widget.is_active) {
      throw new AppError(403, `Widget "${widget.name}" is currently disabled and not accepting submissions.`);
    }

    // 2. Honeypot abuse prevention (Probe 6)
    // Hidden fields populated by scrapers/bots
    const isBot = Boolean(input._hp?.trim() || input.website_url_hp?.trim());
    if (isBot) {
      logger.warn(`[AbuseGuard] Honeypot triggered from IP ${ip} on widget ${widget.id}`);
      throw new AppError(400, "Spam submission rejected: Automated bot activity detected.");
    }

    // 3. Geolocation Enrichment via Provider Fallback Chain (Probe 4)
    const geoData = await geoService.enrichIp(ip);

    // 4. Persist valid submission
    const insertPayload = {
      widget_id: widget.id,
      user_id: widget.user_id, // Link to widget owner tenant
      data: input.data,
      ip_address: ip,
      user_agent: meta.userAgent || null,
      origin: meta.origin || null,
      referer: meta.referer || null,
      geo_data: geoData,
      is_spam: false,
    };

    const { data: savedSubmission, error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !savedSubmission) {
      logger.error("[SubmissionService] Failed to persist submission:", insertError);
      throw new AppError(500, `Failed to store submission: ${insertError?.message || "Unknown error"}`);
    }

    const submission = savedSubmission as Submission;

    // 5. Safe decoupled side effect (Probe 5: Must never block or fail submission)
    notificationService.notifySubmission(submission, widget).catch((err) => {
      logger.error(`[SubmissionService] Unexpected error in safe side-effect handler: ${err.message}`);
    });

    return {
      submission,
      enriched: Boolean(geoData?.enriched),
    };
  },

  /**
   * Fetch submissions for an authenticated tenant with filtering and pagination.
   */
  async getAll(userId: string, query: SubmissionQueryInput, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = client
      .from("submissions")
      .select("*, widgets(name, title)", { count: "exact" })
      .eq("user_id", userId);

    if (query.widget_id) {
      queryBuilder = queryBuilder.eq("widget_id", query.widget_id);
    }

    if (query.is_spam !== undefined) {
      queryBuilder = queryBuilder.eq("is_spam", query.is_spam);
    }

    if (query.from_date) {
      queryBuilder = queryBuilder.gte("created_at", query.from_date);
    }

    if (query.to_date) {
      queryBuilder = queryBuilder.lte("created_at", query.to_date);
    }

    const { data, error, count } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new AppError(500, `Failed to retrieve submissions: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      submissions: data || [],
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Fetch a single submission by ID (tenant-isolated).
   */
  async getById(id: string, userId: string, userToken?: string): Promise<Submission> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    const { data, error } = await client
      .from("submissions")
      .select("*, widgets(name, title)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new AppError(404, `Submission with ID ${id} not found or access denied.`);
    }

    return data as Submission;
  },

  /**
   * Delete a submission (tenant-isolated).
   */
  async delete(id: string, userId: string, userToken?: string): Promise<boolean> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    const { error } = await client
      .from("submissions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(500, `Failed to delete submission: ${error.message}`);
    }

    return true;
  },
};

export default submissionService;
