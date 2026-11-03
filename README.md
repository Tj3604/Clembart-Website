# clembartmedia.com

One-page site for Clembart Media, hosted on a Cloudflare Worker (broken-wood-677d), with Stripe embedded checkout.

- `public/index.html`: the website. Package buttons open the on-site checkout.
- `public/return.html`: the page customers land on after paying.
- `src/worker.js`: the small server code Cloudflare runs. It creates Stripe checkout sessions using the secret key stored in Cloudflare.
- `wrangler.jsonc`: tells Cloudflare how to deploy the Worker.

## Cloudflare settings (Worker → Settings → Variables and Secrets)
| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Your Stripe secret or restricted key (store as **Secret**) |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key (`pk_...`) |
| `PRICE_TRIAL`, `PRICE_STARTER`, `PRICE_GROWTH`, `PRICE_PREMIUM` | Optional. Live price IDs once you switch to live mode |

Never put the secret key in any file in this repository.
