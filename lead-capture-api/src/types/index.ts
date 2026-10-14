export type Environment = "development" | "production" | "test";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetType = "form" | "contact" | "newsletter" | "cta" | "popover";

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "tel" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

export interface DisplaySettings {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  position?: "inline" | "bottom-right" | "bottom-left" | "center-modal";
}

export interface Widget {
  id: string;
  user_id: string;
  name: string;
  type: WidgetType;
  title: string;
  description?: string;
  button_text: string;
  success_message: string;
  fields: FormFieldDefinition[];
  display_settings: DisplaySettings;
  is_active: boolean;
  notification_email?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicWidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  button_text: string;
  success_message: string;
  fields: FormFieldDefinition[];
  display_settings: DisplaySettings;
  submission_url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoLocationData {
  ip: string;
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  provider?: string;
  enriched: boolean;
}

export interface Submission {
  id: string;
  widget_id: string;
  user_id: string;
  data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  origin?: string;
  geo_data: GeoLocationData | null;
  is_spam: boolean;
  spam_reason?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Analytics Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  totalSubmissions: number;
  totalWidgets: number;
  submissionsLast24Hours: number;
  submissionsLast7Days: number;
  submissionsLast30Days: number;
  timeSeries: TimeSeriesPoint[];
  topCountries: BreakdownItem[];
  widgetBreakdown: BreakdownItem[];
  recentSubmissions: Submission[];
}
