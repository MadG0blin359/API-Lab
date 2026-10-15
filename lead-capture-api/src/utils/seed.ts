import { auth, db } from "../config/firebase.js";
import { logger } from "./logger.js";

async function seed() {
  logger.info("🌱 Starting Firestore database seeding for Lead-Capture Platform...");

  const demoEmail = "demo@flyrank.com";
  const demoPassword = "DemoPassword123!";
  let userId: string;

  // 1. Create or Find Demo User in Firebase Auth
  try {
    try {
      const existingUser = await auth.getUserByEmail(demoEmail);
      userId = existingUser.uid;
      logger.info(`ℹ️ Demo user already exists in Firebase Auth: ${demoEmail} (${userId})`);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        const newUser = await auth.createUser({
          email: demoEmail,
          password: demoPassword,
          displayName: "Demo Admin",
          emailVerified: true,
        });
        userId = newUser.uid;
        logger.info(`✅ Created demo user in Firebase Auth: ${demoEmail} (${userId})`);
      } else {
        throw err;
      }
    }
  } catch (err: any) {
    logger.warn(`⚠️ Firebase Auth user creation fallback: ${err.message}`);
    // Fallback static UID for local testing without network credentials
    userId = "00000000-0000-0000-0000-0000000000aa";
  }

  // 2. Seed Demo Widget in Firestore
  const demoWidgetId = "00000000-0000-0000-0000-000000000001";
  const now = new Date().toISOString();

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
    created_at: now,
    updated_at: now,
  };

  try {
    await db.collection("widgets").doc(demoWidgetId).set(widgetPayload, { merge: true });
    logger.info(`✅ Seeded demo widget in Firestore: "${widgetPayload.name}" (${demoWidgetId})`);
  } catch (err: any) {
    logger.error("❌ Failed to upsert demo widget in Firestore:", err.message);
  }

  // 3. Seed Sample Submissions in Firestore (With realistic geo data for Dashboard visualization)
  const sampleSubmissions = [
    {
      id: "sub-seed-001",
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
      id: "sub-seed-002",
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
      id: "sub-seed-003",
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
    try {
      await db.collection("submissions").doc(sub.id).set(sub, { merge: true });
    } catch (err: any) {
      logger.warn(`⚠️ Sample submission insert warning: ${err.message}`);
    }
  }

  logger.info("🎉 Firestore seeding completed successfully!");
}

seed().catch((err) => {
  logger.error("Seeding execution failed:", err);
  process.exit(1);
});
