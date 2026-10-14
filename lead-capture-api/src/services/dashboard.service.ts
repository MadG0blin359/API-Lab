import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { DashboardStats, TimeSeriesPoint, BreakdownItem, Submission } from "../types/index.js";

export const dashboardService = {
  /**
   * Compute aggregated analytics and telemetry for the authenticated owner.
   */
  async getStats(userId: string, userToken?: string): Promise<DashboardStats> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;

    // 1. Total Widgets Count
    const { count: widgetCount, error: widgetError } = await client
      .from("widgets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (widgetError) {
      throw new AppError(500, `Failed to load widget statistics: ${widgetError.message}`);
    }

    // 2. Fetch all submissions for the tenant to compute aggregations
    const { data: rawSubmissions, error: subError } = await client
      .from("submissions")
      .select("id, widget_id, created_at, geo_data, data, is_spam")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (subError) {
      throw new AppError(500, `Failed to compute dashboard metrics: ${subError.message}`);
    }

    const submissions = rawSubmissions || [];
    const totalSubmissions = submissions.length;

    // 3. Time Windows
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let last24Hours = 0;
    let last7Days = 0;
    let last30Days = 0;

    const dailyMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const widgetMap: Record<string, number> = {};

    for (const sub of submissions) {
      const createdAt = new Date(sub.created_at);

      if (createdAt >= twentyFourHoursAgo) last24Hours++;
      if (createdAt >= sevenDaysAgo) last7Days++;
      if (createdAt >= thirtyDaysAgo) last30Days++;

      // Daily Time-Series (last 14 days)
      const dayKey = createdAt.toISOString().split("T")[0];
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1;

      // Geo Breakdown
      const country = sub.geo_data?.country || "Unknown / Local";
      countryMap[country] = (countryMap[country] || 0) + 1;

      // Widget Breakdown
      const widgetId = sub.widget_id;
      widgetMap[widgetId] = (widgetMap[widgetId] || 0) + 1;
    }

    // Format Time Series (sorted chronologically)
    const timeSeries: TimeSeriesPoint[] = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format Top Countries
    const topCountries: BreakdownItem[] = Object.entries(countryMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Format Widget Breakdown
    const widgetBreakdown: BreakdownItem[] = Object.entries(widgetMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSubmissions,
      totalWidgets: widgetCount || 0,
      submissionsLast24Hours: last24Hours,
      submissionsLast7Days: last7Days,
      submissionsLast30Days: last30Days,
      timeSeries,
      topCountries,
      widgetBreakdown,
      recentSubmissions: (submissions.slice(0, 10) as unknown) as Submission[],
    };
  },
};

export default dashboardService;
