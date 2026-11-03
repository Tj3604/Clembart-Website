// Shared helpers for the Clembart Media checkout functions (Cloudflare Pages Functions).
// Secrets live in Cloudflare environment variables, never in the website files.

// Package catalog. Price IDs can be overridden with env vars (PRICE_TRIAL, PRICE_STARTER,
// PRICE_GROWTH, PRICE_PREMIUM) so switching to live mode is a settings change, not a code change.
// The defaults below are the TEST-mode (sandbox) prices.
export const PLANS = {
  trial:   { env: "PRICE_TRIAL",   price: "price_1UXmk52HYX1I1J0EfRRL0g4r", mode: "payment" },
  starter: { env: "PRICE_STARTER", price: "price_1UXmk82HYX1I1J0EWAU3tRDJ", mode: "subscription" },
  growth:  { env: "PRICE_GROWTH",  price: "price_1UXmkB2HYX1I1J0EsYn5kTDO", mode: "subscription" },
  premium: { env: "PRICE_PREMIUM", price: "price_1UXmkD2HYX1I1J0ElMN6QhX2", mode: "subscription" },
};

// Flatten a nested object into Stripe's form-encoded format: a[b][0][c]=x
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}

export async function stripe(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set in Cloudflare.");
  const url = `https://api.stripe.com/v1/${path}` + (method === "GET" && params ? `?${encode(params)}` : "");
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : encode(params || {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Stripe request failed");
    err.stripe = data?.error;
    throw err;
  }
  return data;
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
