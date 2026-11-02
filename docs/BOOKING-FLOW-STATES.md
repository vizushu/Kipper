# Direct booking flow presentation

The implemented flow is date selection and server quote → atomic temporary inventory hold → provider payment → server-verified payment and final inventory check → confirmation. It is not a mandatory owner-approval request flow. Airbnb integration is deferred; that is not proof of exclusive inventory or a decision to delist other channels. Existing live launch gates remain unchanged.

The UI distinguishes a quote from a hold and a hold from a confirmed stay. Quote expiry requires a fresh availability/price check. Hold expiry removes payment UI and directs any uncertain payment attempt to verification, without automatically replaying. Card transport failures and wallet outcomes that cannot be verified stop payment controls and direct the guest to recovery/support rather than assert that no payment occurred. Known card/validation rejection can be corrected in place. Confirmed synthetic test bookings are explicitly not real reservations; live confirmation requires the server's paid/confirmed state.

Pricing and policy presentation uses the accepted quote/snapshot. Test-only labels do not appear on live quotes, while public preview continues to block quote, checkout, reservations, payment and messaging actions. No synthetic public booking demo was added. No rates, payment methods, credentials, provider configuration, fees or activation flags changed. Final guest terms and inventory strategy remain launch prerequisites.

Verification uses synthetic tests and source/render regressions; actual provider/device checkout remains paused pending account setup and explicit launch approval.

Wallet callbacks check the mounted payment step and hold deadline before submitting to the provider. Closing UI cannot cancel a payment already submitted: its result must still be reconciled server-side and may enter late-payment review. Synthetic callback tests cover both sides of that boundary; actual wallet-sheet/device interruption remains provider QA, not a claim of provider-intent cancellation.
