# Team round registration and PayPal setup

## Implemented behaviour
- Team managers register their own team against a specific round/series year.
- Entry fee is set server-side to GBP 100.00.
- Round entry limit defaults to 10 and is configurable by an admin.
- Registration is normally closed seven days before the event; admins can close it manually or set a closing-date override.
- A pending PayPal checkout reserves a place for 30 minutes.
- The registration is marked paid only after the server confirms a completed PayPal capture (and a verified webhook can reconcile it).
- Teams that find a full round are placed on the waiting list. When an admin cancels a registration, the next waiting team is offered the place for 24 hours. No automatic charging occurs.
- Admins can cancel a registration and record a manual refund. The website does not issue refunds through PayPal.
- Driver lineups remain editable independently of registration.

## Required Vercel environment variables
Set these under Project Settings → Environment Variables. The Firebase and PayPal secrets below are server-only and must never use the `NEXT_PUBLIC_` prefix.

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete JSON contents of a Firebase service-account key for the same Firebase project. Keep this secret in Vercel only; do not commit it to GitHub or put it in `.env.local` if that file could be shared.
- `PAYPAL_CLIENT_ID`: PayPal REST app client ID (Sandbox initially).
- `PAYPAL_CLIENT_SECRET`: PayPal REST app secret (Sandbox initially).
- `PAYPAL_ENV`: `sandbox` for testing; change to `live` only for production payments.
- `PAYPAL_WEBHOOK_ID`: the ID of the PayPal webhook configured for `POST https://YOUR-DOMAIN/api/paypal/webhook`.

After changing Vercel environment variables, redeploy the app.

## PayPal Sandbox setup
1. Create/sign in to a PayPal Developer account and create a Sandbox REST app.
2. Copy its Sandbox client ID and secret into the Vercel variables above.
3. Configure a Sandbox webhook pointing at `/api/paypal/webhook`, subscribed at minimum to `PAYMENT.CAPTURE.COMPLETED`.
4. Copy the webhook ID into `PAYPAL_WEBHOOK_ID` and redeploy.
5. Use PayPal Sandbox buyer accounts to test checkout. Do not use real payment credentials while `PAYPAL_ENV=sandbox`.

## Firestore rules
Deploy the included `firestore.rules` after reviewing it against the currently deployed rules. It keeps round-registration documents inaccessible to browser clients; server routes use the Firebase Admin SDK. The `isAdmin()` helper also recognises both `admin` and `superuser` roles.

## Important operational note
The 30-minute reservation expiry is enforced when registration/payment is revisited and when capacity is recalculated; this first implementation does not depend on a scheduled background job. Payment webhooks reconcile successful captures if the browser return flow is interrupted.
