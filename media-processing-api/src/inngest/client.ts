import { Inngest } from "inngest";

// Export the client to be used anywhere in your app (like your Express routes)
export const inngestClient = new Inngest({
  id: "media-api",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});