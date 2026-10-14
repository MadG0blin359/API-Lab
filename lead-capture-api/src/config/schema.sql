-- ==============================================================================
-- Supabase Database Schema & Setup for Lead-Capture & Embeddable Widget Platform
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Widgets Table (Tenant-Isolated)
CREATE TABLE IF NOT EXISTS public.widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'form', -- 'form', 'contact', 'newsletter', 'cta', 'popover'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    button_text VARCHAR(100) NOT NULL DEFAULT 'Submit',
    success_message VARCHAR(255) NOT NULL DEFAULT 'Thank you! Your submission has been received.',
    fields JSONB NOT NULL DEFAULT '[
        {"name": "name", "label": "Full Name", "type": "text", "required": true, "placeholder": "Jane Doe"},
        {"name": "email", "label": "Email Address", "type": "email", "required": true, "placeholder": "jane@example.com"},
        {"name": "message", "label": "Message", "type": "textarea", "required": false, "placeholder": "How can we help?"}
    ]'::jsonb,
    display_settings JSONB NOT NULL DEFAULT '{
        "primaryColor": "#2563eb",
        "backgroundColor": "#ffffff",
        "textColor": "#1f2937",
        "borderRadius": "8px",
        "position": "inline"
    }'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notification_email VARCHAR(255),
    webhook_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Submissions Table (Public Ingestion & Tenant Owned)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    ip_address VARCHAR(64),
    user_agent TEXT,
    referer TEXT,
    origin TEXT,
    geo_data JSONB DEFAULT '{}'::jsonb,
    is_spam BOOLEAN NOT NULL DEFAULT false,
    spam_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_widgets_updated_at ON public.widgets;
CREATE TRIGGER set_widgets_updated_at
BEFORE UPDATE ON public.widgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Widgets
-- Tenants can only see their own widgets
DROP POLICY IF EXISTS "Users can view own widgets" ON public.widgets;
CREATE POLICY "Users can view own widgets"
ON public.widgets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Tenants can create widgets for themselves
DROP POLICY IF EXISTS "Users can create own widgets" ON public.widgets;
CREATE POLICY "Users can create own widgets"
ON public.widgets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Tenants can update their own widgets
DROP POLICY IF EXISTS "Users can update own widgets" ON public.widgets;
CREATE POLICY "Users can update own widgets"
ON public.widgets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Tenants can delete their own widgets
DROP POLICY IF EXISTS "Users can delete own widgets" ON public.widgets;
CREATE POLICY "Users can delete own widgets"
ON public.widgets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow public read of active widgets for widget config delivery
DROP POLICY IF EXISTS "Public can view active widgets config" ON public.widgets;
CREATE POLICY "Public can view active widgets config"
ON public.widgets FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 7. RLS Policies: Submissions
-- Authenticated users can view submissions belonging to their widgets
DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;
CREATE POLICY "Users can view own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to delete submissions belonging to their widgets
DROP POLICY IF EXISTS "Users can delete own submissions" ON public.submissions;
CREATE POLICY "Users can delete own submissions"
ON public.submissions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow public/anon to insert submissions (also supported via backend service role client)
DROP POLICY IF EXISTS "Public can insert submissions" ON public.submissions;
CREATE POLICY "Public can insert submissions"
ON public.submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON public.widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_is_active ON public.widgets(is_active);
CREATE INDEX IF NOT EXISTS idx_submissions_widget_id ON public.submissions(widget_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_is_spam ON public.submissions(is_spam);
