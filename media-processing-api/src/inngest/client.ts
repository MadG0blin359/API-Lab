import { Inngest } from "inngest";

// Export the client to be used anywhere in your app (like your Express routes)
export const inngestClient = new Inngest({ id: "media-api" });