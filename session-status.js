// GET /api/session-status?session_id=cs_...  ->  { status, email, package }
import { stripe, json } from "./_stripe.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Missing session" }, 400);
  try {
    const s = await stripe(env, "GET", `checkout/sessions/${id}`);
    return json({ status: s.status, email: s.customer_details?.email || null, package: s.metadata?.package || null });
  } catch {
    return json({ error: "Could not look up this payment." }, 502);
  }
}
