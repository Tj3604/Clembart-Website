// Clembart Media: Cloudflare Worker.
// Serves the website from /public and handles the Stripe checkout API under /api/.
// Secrets (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY) are set in the Cloudflare dashboard, never in this repo.

// TEST-mode price IDs by default; override with PRICE_TRIAL / PRICE_STARTER / PRICE_GROWTH / PRICE_PREMIUM for live mode.
const PLANS = {
  trial:   { env: "PRICE_TRIAL",   price: "price_1UXmk52HYX1I1J0EfRRL0g4r", mode: "payment" },
  starter: { env: "PRICE_STARTER", price: "price_1UXmk82HYX1I1J0EWAU3tRDJ", mode: "subscription" },
  growth:  { env: "PRICE_GROWTH",  price: "price_1UXmkB2HYX1I1J0EsYn5kTDO", mode: "subscription" },
  premium: { env: "PRICE_PREMIUM", price: "price_1UXmkD2HYX1I1J0ElMN6QhX2", mode: "subscription" },
};

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}

async function stripe(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set in Cloudflare.");
  const url = `https://api.stripe.com/v1/${path}` + (method === "GET" && params ? `?${encode(params)}` : "");
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : encode(params || {}),
  });
  const data = await res.json();
  if (!res.ok) { const err = new Error(data?.error?.message || "Stripe request failed"); err.stripe = data?.error; throw err; }
  return data;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function createSession(request, env) {
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
    let session;
    try {
      session = await stripe(env, "POST", "checkout/sessions", { ...params, ui_mode: "embedded_page" });
    } catch (e) {
      if (e.stripe?.param === "ui_mode") session = await stripe(env, "POST", "checkout/sessions", { ...params, ui_mode: "embedded" });
      else throw e;
    }
    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.log("checkout error:", e.message);
    return json({ error: "Checkout is unavailable right now. Please email clembart.media@gmail.com." }, 502);
  }
}

async function sessionStatus(request, env) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Missing session" }, 400);
  try {
    const s = await stripe(env, "GET", `checkout/sessions/${id}`);
    return json({ status: s.status, email: s.customer_details?.email || null, package: s.metadata?.package || null });
  } catch (e) {
    console.log("status error:", e.message);
    return json({ error: "Could not look up this payment." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/config" && request.method === "GET") {
      if (!env.STRIPE_PUBLISHABLE_KEY) return json({ error: "STRIPE_PUBLISHABLE_KEY is not set" }, 500);
      return json({ publishableKey: env.STRIPE_PUBLISHABLE_KEY });
    }
    if (pathname === "/api/checkout-session" && request.method === "POST") return createSession(request, env);
    if (pathname === "/api/session-status" && request.method === "GET") return sessionStatus(request, env);
    if (pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
