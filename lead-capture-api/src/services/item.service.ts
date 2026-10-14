import { supabase, createScopedClient } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import {
  CreateItemInput,
  UpdateItemInput,
  ItemQueryInput,
} from "../validators/item.validator.js";

export const itemService = {
  /**
   * Fetch all items with optional search, filter, and pagination.
   */
  async getAll(query: ItemQueryInput, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabase;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = client
      .from("items")
      .select("*", { count: "exact" });

    if (query.search) {
      queryBuilder = queryBuilder.ilike("title", `%${query.search}%`);
    }

    if (query.completed !== undefined) {
      queryBuilder = queryBuilder.eq("completed", query.completed);
    }

    const { data, error, count } = await queryBuilder
      .order(query.sortBy || "created_at", {
        ascending: query.sortOrder === "asc",
      })
      .range(from, to);

    if (error) {
      throw new AppError(500, `Failed to fetch items: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: data || [],
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
   * Fetch a single item by ID.
   */
  async getById(id: string, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabase;

    const { data, error } = await client
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new AppError(404, `Item with ID ${id} not found.`);
    }

    return data;
  },

  /**
   * Create a new item.
   */
  async create(input: CreateItemInput, userId?: string, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabase;

    const payload = {
      ...input,
      ...(userId ? { user_id: userId } : {}),
    };

    const { data, error } = await client
      .from("items")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(500, `Failed to create item: ${error?.message || "Unknown error"}`);
    }

    return data;
  },

  /**
   * Update an item by ID.
   */
  async update(id: string, input: UpdateItemInput, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabase;

    const { data, error } = await client
      .from("items")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(404, `Item with ID ${id} not found or could not be updated.`);
    }

    return data;
  },

  /**
   * Delete an item by ID.
   */
  async delete(id: string, userToken?: string) {
    const client = userToken ? createScopedClient(userToken) : supabase;

    const { error } = await client
      .from("items")
      .delete()
      .eq("id", id);

    if (error) {
      throw new AppError(500, `Failed to delete item: ${error.message}`);
    }

    return true;
  },
};

export default itemService;
