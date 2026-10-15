import crypto from "node:crypto";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { AppError } from "../utils/app-error.js";
import { geoService } from "./geo.service.js";
import { notificationService } from "./notification.service.js";
import {
  PublicSubmissionInput,
  SubmissionQueryInput,
} from "../validators/submission.validator.js";
import { Submission, Widget } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const submissionService = {
  /**
   * Hardened Public Submission Processing Pipeline:
   * 1. Validate Widget existence & status in Firestore
   * 2. Honeypot check (Abuse detection)
   * 3. IP Geolocation Enrichment (Fallback chain)
   * 4. Persistence in Firestore
   * 5. Safe decoupled side effect (email/webhook)
   */
  async processSubmission(
    input: PublicSubmissionInput,
    ip: string,
    meta: { userAgent?: string; origin?: string; referer?: string }
  ): Promise<{ submission: Submission; enriched: boolean }> {
    // 1. Retrieve the target widget
    const widgetDoc = await db.collection("widgets").doc(input.widget_id).get();

    if (!widgetDoc.exists) {
      throw new AppError(
        404,
        `Widget with ID ${input.widget_id} does not exist or has been deleted.`
      );
    }

    const widget = { ...widgetDoc.data(), id: widgetDoc.id } as Widget;

    if (!widget.is_active) {
      throw new AppError(
        403,
        `Widget "${widget.name}" is currently disabled and not accepting submissions.`
      );
    }

    // 2. Honeypot abuse prevention (Probe 6)
    const isBot = Boolean(input._hp?.trim() || input.website_url_hp?.trim());
    if (isBot) {
      logger.warn(`[AbuseGuard] Honeypot triggered from IP ${ip} on widget ${widget.id}`);
      throw new AppError(400, "Spam submission rejected: Automated bot activity detected.");
    }

    // 3. Geolocation Enrichment via Provider Fallback Chain (Probe 4)
    const geoData = await geoService.enrichIp(ip);

    // 4. Persist valid submission in Firestore
    const submissionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      widget_id: widget.id,
      user_id: widget.user_id, // Link to widget owner tenant
      data: input.data,
      ip_address: ip,
      user_agent: meta.userAgent || undefined,
      origin: meta.origin || undefined,
      referer: meta.referer || undefined,
      geo_data: geoData,
      is_spam: false,
      created_at: now,
    };

    // Clean undefined fields for Firestore
    const firestorePayload: Record<string, any> = { ...submission };
    Object.keys(firestorePayload).forEach((key) => {
      if (firestorePayload[key] === undefined) {
        delete firestorePayload[key];
      }
    });

    await db.collection("submissions").doc(submissionId).set(firestorePayload);

    // 5. Safe decoupled side effect (Probe 5: Must never block or fail submission)
    notificationService.notifySubmission(submission, widget).catch((err) => {
      logger.error(
        `[SubmissionService] Unexpected error in safe side-effect handler: ${err.message}`
      );
    });

    return {
      submission,
      enriched: Boolean(geoData?.enriched),
    };
  },

  /**
   * Fetch submissions for an authenticated tenant with filtering and pagination from Firestore.
   */
  async getAll(userId: string, query: SubmissionQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    let queryRef: Query = db
      .collection("submissions")
      .where("user_id", "==", userId);

    if (query.widget_id) {
      queryRef = queryRef.where("widget_id", "==", query.widget_id);
    }

    if (query.is_spam !== undefined) {
      queryRef = queryRef.where("is_spam", "==", query.is_spam);
    }

    const snapshot = await queryRef.get();
    let submissions: Submission[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      } as Submission;
    });

    // Date range filters in-memory
    if (query.from_date) {
      submissions = submissions.filter((s) => s.created_at >= query.from_date!);
    }
    if (query.to_date) {
      submissions = submissions.filter((s) => s.created_at <= query.to_date!);
    }

    // Sort by created_at descending
    submissions.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    const totalCount = submissions.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSubmissions = submissions.slice(startIndex, startIndex + limit);

    return {
      submissions: paginatedSubmissions,
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
  async getById(id: string, userId: string): Promise<Submission> {
    const doc = await db.collection("submissions").doc(id).get();

    if (!doc.exists) {
      throw new AppError(404, `Submission with ID ${id} not found.`);
    }

    const data = doc.data() as Submission;

    if (data.user_id !== userId) {
      throw new AppError(403, `Access denied to submission ${id}.`);
    }

    return {
      ...data,
      id: doc.id,
    };
  },

  /**
   * Delete a submission (tenant-isolated).
   */
  async delete(id: string, userId: string): Promise<boolean> {
    await this.getById(id, userId);
    await db.collection("submissions").doc(id).delete();
    return true;
  },
};

export default submissionService;
