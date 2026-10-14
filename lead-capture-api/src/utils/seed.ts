import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "./logger.js";

async function seed() {
  logger.info("🌱 Starting database seeding for Lead-Capture Platform...");

  const demoEmail = "demo@flyrank.com";
  const demoPassword = "DemoPassword123!";
  let userId: string;

  // 1. Create or Find Demo User in Supabase Auth
  try {
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existing = usersData?.users?.find((u) => u.email === demoEmail);

    if (existing) {
      userId = existing.id;
      logger.info(`ℹ️ Demo user already exists: ${demoEmail} (${userId})`);
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: "Demo Admin" },
      });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create demo auth user: ${createError?.message}`);
      }

      userId = newUser.user.id;
      logger.info(`✅ Created demo user: ${demoEmail} (${userId})`);
    }
  } catch (err: any) {
    logger.warn(`⚠️ Supabase Auth admin user creation fallback: ${err.message}`);
    // If Supabase Auth is mocked or offline, generate deterministic fallback UUID
    userId = "00000000-0000-0000-0000-0000000000aa";
  }

  // 2. Seed Demo Widget
  const demoWidgetId = "00000000-0000-0000-0000-000000000001";
  const widgetPayload = {
    id: demoWidgetId,
    user_id: userId,
    name: "Enterprise Contact & Lead Form",
    type: "form",
    title: "Get in Touch with our Team",
    description: "Leave your contact details and we will reach out within 24 hours.",
    button_text: "Request Consultation",
    success_message: "Thank you! Our engineering team will contact you shortly.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "Alice Johnson" },
      { name: "email", label: "Work Email", type: "email", required: true, placeholder: "alice@company.com" },
      { name: "company", label: "Company", type: "text", required: false, placeholder: "Acme Corp" },
      { name: "message", label: "Project Brief", type: "textarea", required: false, placeholder: "Tell us about your needs..." },
    ],
    display_settings: {
      primaryColor: "#2563eb",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      borderRadius: "10px",
      position: "inline",
    },
    is_active: true,
  };

  const { error: widgetError } = await supabaseAdmin
    .from("widgets")
    .upsert(widgetPayload, { onConflict: "id" });

  if (widgetError) {
    logger.error("❌ Failed to upsert demo widget:", widgetError);
  } else {
    logger.info(`✅ Seeded demo widget: "${widgetPayload.name}" (${demoWidgetId})`);
  }

  // 3. Seed Sample Submissions (With realistic geo data for Dashboard visualization)
  const sampleSubmissions = [
    {
      widget_id: demoWidgetId,
      user_id: userId,
      data: {
        name: "Sarah Connor",
        email: "sarah@cyberdyne.io",
        company: "Resistance Labs",
        message: "Interested in the high-volume embed tier.",
      },
      ip_address: "8.8.8.8",
      geo_data: {
        ip: "8.8.8.8",
        country: "United States",
        country_code: "US",
        city: "Mountain View",
        region: "California",
        latitude: 37.4056,
        longitude: -122.0775,
        provider: "ip-api.com",
        enriched: true,
      },
      is_spam: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    },
    {
      widget_id: demoWidgetId,
      user_id: userId,
      data: {
        name: "David Smith",
        email: "david@fintech.co.uk",
        company: "FinTech London",
        message: "Can we customize CSS classes directly?",
      },
      ip_address: "81.2.69.142",
      geo_data: {
        ip: "81.2.69.142",
        country: "United Kingdom",
        country_code: "GB",
        city: "London",
        region: "England",
        latitude: 51.5074,
        longitude: -0.1278,
        provider: "ipapi.co",
        enriched: true,
      },
      is_spam: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    },
    {
      widget_id: demoWidgetId,
      user_id: userId,
      data: {
        name: "Hanna Weber",
        email: "hanna@berlintech.de",
        company: "AutoDrive GmbH",
        message: "Requesting pricing for 50 widgets.",
      },
      ip_address: "178.63.97.34",
      geo_data: {
        ip: "178.63.97.34",
        country: "Germany",
        country_code: "DE",
        city: "Berlin",
        region: "Berlin",
        latitude: 52.52,
        longitude: 13.405,
        provider: "ipstack",
        enriched: true,
      },
      is_spam: false,
      created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    },
  ];

  for (const sub of sampleSubmissions) {
    const { error: subErr } = await supabaseAdmin.from("submissions").insert(sub);
    if (subErr) {
      logger.warn(`⚠️ Sample submission insert warning: ${subErr.message}`);
    }
  }

  logger.info("🎉 Database seeding completed successfully!");
}

seed().catch((err) => {
  logger.error("Seeding execution failed:", err);
  process.exit(1);
});
