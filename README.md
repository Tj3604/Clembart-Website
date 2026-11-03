# clembartmedia.com

One-page site for Clembart Media, hosted on Cloudflare Pages, with Stripe embedded checkout.

- `index.html`: the website. Package buttons open the on-site checkout.
- `return.html`: the page customers land on after paying.
- `functions/api/`: small server functions Cloudflare runs. They create Stripe checkout sessions using the secret key stored in Cloudflare.

## Cloudflare settings (Settings → Variables and Secrets)
| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Your Stripe secret or restricted key (store as **Secret**) |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key (`pk_...`) |
| `PRICE_TRIAL`, `PRICE_STARTER`, `PRICE_GROWTH`, `PRICE_PREMIUM` | Optional. Live price IDs once you switch to live mode |

Never put the secret key in any file in this repository.
