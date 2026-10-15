import crypto from "node:crypto";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateWidgetInput,
  UpdateWidgetInput,
  WidgetQueryInput,
} from "../validators/widget.validator.js";
import { Widget, PublicWidgetConfig } from "../types/index.js";

export const widgetService = {
  /**
   * Fetch all widgets owned by the authenticated tenant from Firestore.
   */
  async getAll(userId: string, query: WidgetQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;

    let queryRef: Query = db
      .collection("widgets")
      .where("user_id", "==", userId);

    if (query.type) {
      queryRef = queryRef.where("type", "==", query.type);
    }

    if (query.is_active !== undefined) {
      queryRef = queryRef.where("is_active", "==", query.is_active);
    }

    const snapshot = await queryRef.get();
    let widgets: Widget[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      } as Widget;
    });

    // In-memory search filter if provided
    if (query.search) {
      const term = query.search.toLowerCase();
      widgets = widgets.filter(
        (w) =>
          w.name.toLowerCase().includes(term) ||
          w.title.toLowerCase().includes(term)
      );
    }

    // Sort by created_at descending
    widgets.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    const totalCount = widgets.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedWidgets = widgets.slice(startIndex, startIndex + limit);

    return {
      widgets: paginatedWidgets,
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
   * Fetch a single widget by ID from Firestore, enforcing tenant isolation.
   */
  async getById(id: string, userId: string): Promise<Widget> {
    const doc = await db.collection("widgets").doc(id).get();

    if (!doc.exists) {
      throw new AppError(404, `Widget with ID ${id} not found.`);
    }

    const data = doc.data() as Widget;

    if (data.user_id !== userId) {
      throw new AppError(403, `Access denied to widget ${id}.`);
    }

    return {
      ...data,
      id: doc.id,
    };
  },

  /**
   * Public config retrieval used by embeddable widget script.
   * Strips administrative secrets and returns public presentation config.
   */
  async getPublicConfig(id: string, baseUrl?: string): Promise<PublicWidgetConfig> {
    const doc = await db.collection("widgets").doc(id).get();

    if (!doc.exists) {
      throw new AppError(404, `Widget with ID ${id} not found.`);
    }

    const data = doc.data() as any;

    if (!data.is_active) {
      throw new AppError(403, `Widget with ID ${id} is currently inactive.`);
    }

    const resolvedBaseUrl = baseUrl || env.API_BASE_URL;

    return {
      id: doc.id,
      type: data.type || "form",
      title: data.title,
      description: data.description,
      button_text: data.button_text || "Submit",
      success_message: data.success_message || "Thank you! Your submission has been received.",
      fields: data.fields || [],
      display_settings: data.display_settings || {},
      submission_url: `${resolvedBaseUrl}/api/submissions`,
    };
  },

  /**
   * Create a new widget owned by the current tenant in Firestore.
   */
  async create(userId: string, input: CreateWidgetInput): Promise<Widget> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const widgetData: Widget = {
      id,
      user_id: userId,
      name: input.name,
      type: input.type || "form",
      title: input.title,
      description: input.description,
      button_text: input.button_text || "Submit",
      success_message: input.success_message || "Thank you! Your submission has been received.",
      fields: input.fields || [],
      display_settings: input.display_settings || {
        primaryColor: "#2563eb",
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        borderRadius: "8px",
        position: "inline",
      },
      is_active: true,
      notification_email: input.notification_email,
      webhook_url: input.webhook_url,
      created_at: now,
      updated_at: now,
    };

    await db.collection("widgets").doc(id).set(widgetData);

    return widgetData;
  },

  /**
   * Update an existing widget, strictly isolated to the tenant.
   */
  async update(id: string, userId: string, input: UpdateWidgetInput): Promise<Widget> {
    // Verify ownership first
    const existing = await this.getById(id, userId);

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      ...input,
      updated_at: now,
    };

    // Remove undefined values for Firestore
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await db.collection("widgets").doc(id).update(updatePayload);

    return {
      ...existing,
      ...updatePayload,
      updated_at: now,
    } as Widget;
  },

  /**
   * Delete an existing widget, strictly isolated to the tenant.
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // Verify ownership
    await this.getById(id, userId);

    await db.collection("widgets").doc(id).delete();
    return true;
  },

  /**
   * Generate the single-line embed snippet for a customer.
   */
  generateSnippet(id: string, baseUrl?: string): { snippet: string; scriptUrl: string } {
    const domain = baseUrl || env.API_BASE_URL;
    const scriptUrl = `${domain}/widget.v1.js?id=${id}`;
    const snippet = `<script src="${scriptUrl}" data-widget-id="${id}" async defer></script>`;

    return {
      snippet,
      scriptUrl,
    };
  },
};

export default widgetService;
