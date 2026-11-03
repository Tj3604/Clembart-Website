// GET /api/config -> the publishable key (safe to share; it can't move money).
import { json } from "./_stripe.js";
export async function onRequestGet({ env }) {
  if (!env.STRIPE_PUBLISHABLE_KEY) return json({ error: "STRIPE_PUBLISHABLE_KEY is not set" }, 500);
  return json({ publishableKey: env.STRIPE_PUBLISHABLE_KEY });
}
