import { supabase, supabaseAdmin, createScopedClient } from "../config/supabase.js";
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
   * Fetch all widgets owned by the authenticated tenant.
   */
  async getAll(userId: string, query: WidgetQueryInput, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = client
      .from("widgets")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (query.search) {
      queryBuilder = queryBuilder.ilike("name", `%${query.search}%`);
    }

    if (query.type) {
      queryBuilder = queryBuilder.eq("type", query.type);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq("is_active", query.is_active);
    }

    const { data, error, count } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new AppError(500, `Failed to fetch widgets: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      widgets: (data as Widget[]) || [],
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
   * Fetch a single widget by ID, enforcing tenant isolation.
   */
  async getById(id: string, userId: string, userToken?: string): Promise<Widget> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    const { data, error } = await client
      .from("widgets")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new AppError(404, `Widget with ID ${id} not found or access denied.`);
    }

    return data as Widget;
  },

  /**
   * Public config retrieval used by embeddable widget script.
   * Strips administrative secrets and returns public presentation config.
   */
  async getPublicConfig(id: string, baseUrl?: string): Promise<PublicWidgetConfig> {
    const { data, error } = await supabaseAdmin
      .from("widgets")
      .select("id, name, type, title, description, button_text, success_message, fields, display_settings, is_active")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new AppError(404, `Widget with ID ${id} not found.`);
    }

    if (!data.is_active) {
      throw new AppError(403, `Widget with ID ${id} is currently inactive.`);
    }

    const resolvedBaseUrl = baseUrl || env.API_BASE_URL;

    return {
      id: data.id,
      type: data.type,
      title: data.title,
      description: data.description,
      button_text: data.button_text,
      success_message: data.success_message,
      fields: data.fields,
      display_settings: data.display_settings,
      submission_url: `${resolvedBaseUrl}/api/submissions`,
    };
  },

  /**
   * Create a new widget owned by the current tenant.
   */
  async create(userId: string, input: CreateWidgetInput, userToken?: string): Promise<Widget> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    const payload = {
      ...input,
      user_id: userId,
    };

    const { data, error } = await client
      .from("widgets")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(500, `Failed to create widget: ${error?.message || "Unknown error"}`);
    }

    return data as Widget;
  },

  /**
   * Update an existing widget, strictly isolated to the tenant.
   */
  async update(id: string, userId: string, input: UpdateWidgetInput, userToken?: string): Promise<Widget> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    // Verify ownership first
    await this.getById(id, userId, userToken);

    const { data, error } = await client
      .from("widgets")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(500, `Failed to update widget: ${error?.message || "Unknown error"}`);
    }

    return data as Widget;
  },

  /**
   * Delete an existing widget, strictly isolated to the tenant.
   */
  async delete(id: string, userId: string, userToken?: string): Promise<boolean> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    // Verify ownership
    await this.getById(id, userId, userToken);

    const { error } = await client
      .from("widgets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(500, `Failed to delete widget: ${error.message}`);
    }

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
