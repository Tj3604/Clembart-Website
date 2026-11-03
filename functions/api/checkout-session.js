// POST /api/checkout-session  { "plan": "growth" }  ->  { "clientSecret": "..." }
import { PLANS, stripe, json } from "./_stripe.js";

export async function onRequestPost({ request, env }) {
  let plan;
  try { ({ plan } = await request.json()); } catch { return json({ error: "Bad request" }, 400); }
  const p = PLANS[plan];
  if (!p) return json({ error: "Unknown package" }, 400);

  const origin = new URL(request.url).origin;
  const params = {
    mode: p.mode,
    line_items: [{ price: env[p.env] || p.price, quantity: 1 }],
    return_url: `${origin}/return.html?session_id={CHECKOUT_SESSION_ID}`,
    custom_fields: [{ key: "businessname", label: { type: "custom", custom: "Business name" }, type: "text" }],
    metadata: { package: plan },
  };
  if (p.mode === "payment") params.customer_creation = "always";
  else params.subscription_data = { metadata: { package: plan } };

  try {
    // Current API name for the embedded page is "embedded_page"; older API versions call it "embedded".
    let session;
    try {
      session = await stripe(env, "POST", "checkout/sessions", { ...params, ui_mode: "embedded_page" });
    } catch (e) {
      if (e.stripe?.param === "ui_mode") session = await stripe(env, "POST", "checkout/sessions", { ...params, ui_mode: "embedded" });
      else throw e;
    }
    return json({ clientSecret: session.client_secret });
  } catch (e) {
    return json({ error: "Checkout is unavailable right now. Please email clembart.media@gmail.com." }, 502);
  }
}
